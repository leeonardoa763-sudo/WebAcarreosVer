/**
 * src/hooks/conciliaciones/useConciliacionesMaterialQueries.js
 *
 * Queries a Supabase específicas para conciliaciones de material
 *
 * CORRECCIONES APLICADAS:
 * 1. Eliminado filtro por sindicato de operador (Material no depende de sindicato)
 * 2. Corregido filtro de fecha para incluir TODO el día final (23:59:59.999)
 * 3. Uso de fecha_programada cuando existe, con fallback a fecha_creacion
 *
 * Funcionalidades:
 * - Obtener vales verificados de material
 * - Obtener obras con vales de material verificados
 * - Obtener semanas con vales de material verificados
 * - Obtener materiales con vales verificados
 */

// 1. React y hooks
import { useCallback } from "react";

// 2. Config
import { supabase } from "../../config/supabase";

// 3. Utils
import { calcularSemanaISO } from "../../utils/dateUtils";

/**
 * Obtener la fecha efectiva de un vale para conciliación.
 * Usa fecha_programada si existe, si no usa fecha_creacion.
 *
 * @param {Object} vale - Objeto vale de la BD
 * @returns {Date} - Fecha efectiva del vale
 */
const obtenerFechaEfectiva = (vale) => {
  if (vale.fecha_programada) {
    return new Date(vale.fecha_programada);
  }
  return new Date(vale.fecha_creacion);
};

export const useConciliacionesMaterialQueries = () => {
  /**
   * Obtener vales verificados de material para generar conciliación
   * Filtra por: semana (fecha efectiva), obra, material
   */
  const fetchValesVerificadosMaterial = useCallback(
    async (filtros, idSindicatoUsuario) => {
      try {
        // Query base — el * incluye fecha_programada automáticamente
        let query = supabase
          .from("vales")
          .select(
            `
            *,
            obras:id_obra (
              id_obra,
              obra,
              cc,
              empresas:id_empresa (
                id_empresa,
                empresa,
                sufijo
              )
            ),
            operadores:id_operador (
              id_operador,
              nombre_completo,
              sindicatos:id_sindicato (
                id_sindicato,
                sindicato
              )
            ),
            vehiculos:id_vehiculo (
              id_vehiculo,
              placas
            ),
            persona:id_persona_creador (
              nombre,
              primer_apellido,
              segundo_apellido
            ),
            vale_material_detalles (
              id_detalle_material,
              capacidad_m3,
              distancia_km,
              cantidad_pedida_m3,
              peso_ton,
              volumen_real_m3,
              folio_banco,
              precio_m3,
              costo_total,
              material:id_material (
                id_material,
                material,
                tipo_de_material:id_tipo_de_material (
                  id_tipo_de_material,
                  tipo_de_material
                )
              ),
            bancos:id_banco (
                id_banco,
                banco
              ),
              vale_material_viajes (
                id_viaje,
                numero_viaje,
                hora_registro,
                peso_ton,
                volumen_m3,
                costo_viaje,
                folio_vale_fisico
              )
            )
          `,
          )
          .eq("tipo_vale", "material")
          .eq("verificado_por_sindicato", true)
          .neq("estado", "conciliado");

        // Filtrar por obra
        if (filtros.obraSeleccionada) {
          query = query.eq("id_obra", filtros.obraSeleccionada);
        }

        // Filtrar por rango de fechas de la semana
        // Usa fecha_programada si existe, si no fecha_creacion
        if (filtros.semanaSeleccionada) {
          const fechaInicio = filtros.semanaSeleccionada.fechaInicio;
          const fechaFin = `${filtros.semanaSeleccionada.fechaFin}T23:59:59.999Z`;

          query = query.or(
            `and(fecha_programada.gte.${fechaInicio},fecha_programada.lte.${fechaFin}),` +
              `and(fecha_programada.is.null,fecha_creacion.gte.${fechaInicio},fecha_creacion.lte.${fechaFin})`,
          );
        }

        // Ordenar por fecha efectiva ascendente
        query = query.order("fecha_creacion", { ascending: true });

        const { data, error } = await query;

        if (error) throw error;

        let valesFiltrados = data || [];

        // Filtrar por material específico si está seleccionado
        if (filtros.materialSeleccionado) {
          valesFiltrados = valesFiltrados.filter((vale) => {
            return vale.vale_material_detalles?.some(
              (detalle) =>
                detalle.material?.id_material === filtros.materialSeleccionado,
            );
          });

          // Filtrar los detalles para solo incluir el material seleccionado
          valesFiltrados = valesFiltrados.map((vale) => ({
            ...vale,
            vale_material_detalles: vale.vale_material_detalles.filter(
              (detalle) =>
                detalle.material?.id_material === filtros.materialSeleccionado,
            ),
          }));
        }

        return { success: true, data: valesFiltrados };
      } catch (error) {
        console.error(
          "[useConciliacionesMaterialQueries] Error en fetchValesVerificadosMaterial:",
          error,
        );
        return { success: false, error: error.message, data: [] };
      }
    },
    [],
  );

  /**
   * Obtener obras que tienen vales verificados de material en una semana específica
   */
  const fetchObrasConValesMaterial = useCallback(async (semana) => {
    try {
      const fechaInicio = semana.fechaInicio;
      const fechaFin = `${semana.fechaFin}T23:59:59.999Z`;

      let query = supabase
        .from("vales")
        .select(
          `
          id_vale,
          folio,
          id_obra,
          fecha_creacion,
          fecha_programada,
          obras:id_obra (
            id_obra,
            obra,
            cc,
            empresas:id_empresa (
              empresa,
              sufijo
            )
          )
        `,
        )
        .eq("tipo_vale", "material")
        .eq("verificado_por_sindicato", true)
        .neq("estado", "conciliado")
        // Usar fecha_programada si existe, si no fecha_creacion
        .or(
          `and(fecha_programada.gte.${fechaInicio},fecha_programada.lte.${fechaFin}),` +
            `and(fecha_programada.is.null,fecha_creacion.gte.${fechaInicio},fecha_creacion.lte.${fechaFin})`,
        );

      const { data, error } = await query;

      if (error) throw error;

      // Agrupar por obra (eliminar duplicados)
      const obrasUnicas = (data || []).reduce((acc, vale) => {
        if (vale.obras && !acc.find((o) => o.id_obra === vale.obras.id_obra)) {
          acc.push({
            id_obra: vale.obras.id_obra,
            obra: vale.obras.obra,
            cc: vale.obras.cc,
            empresa: vale.obras.empresas?.empresa,
            sufijo: vale.obras.empresas?.sufijo,
          });
        }
        return acc;
      }, []);

      return { success: true, data: obrasUnicas };
    } catch (error) {
      console.error(
        "[useConciliacionesMaterialQueries] Error en fetchObrasConValesMaterial:",
        error,
      );
      return { success: false, error: error.message, data: [] };
    }
  }, []);

  /**
   * Obtener semanas con vales verificados de material
   * Usa fecha_programada cuando existe para clasificar el vale en la semana correcta
   */
  const fetchSemanasConValesMaterial = useCallback(async () => {
    try {
      let query = supabase
        .from("vales")
        .select("fecha_creacion, fecha_programada")
        .eq("tipo_vale", "material")
        .eq("verificado_por_sindicato", true)
        .neq("estado", "conciliado")
        .order("fecha_creacion", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Agrupar por semana usando fecha efectiva (programada o creacion)
      const semanas = {};

      data.forEach((vale) => {
        // Usar fecha_programada si existe, si no fecha_creacion
        const fechaEfectiva = obtenerFechaEfectiva(vale);
        const semanaInfo = calcularSemanaISO(fechaEfectiva);
        const key = `${semanaInfo.año}-${semanaInfo.numero}`;

        if (!semanas[key]) {
          semanas[key] = {
            numero: semanaInfo.numero,
            año: semanaInfo.año,
            fechaInicio: semanaInfo.fechaInicio,
            fechaFin: semanaInfo.fechaFin,
            cantidadVales: 0,
          };
        }

        semanas[key].cantidadVales++;
      });

      // Convertir a array y ordenar descendente
      const semanasArray = Object.values(semanas).sort((a, b) => {
        if (a.año !== b.año) return b.año - a.año;
        return b.numero - a.numero;
      });

      return { success: true, data: semanasArray };
    } catch (error) {
      console.error("Error en fetchSemanasConValesMaterial:", error);
      return { success: false, error: error.message, data: [] };
    }
  }, []);

  /**
   * Obtener materiales que tienen vales verificados en una semana y obra específica
   */
  const fetchMaterialesConVales = useCallback(async (semana, idObra) => {
    try {
      const fechaInicio = semana.fechaInicio;
      const fechaFin = `${semana.fechaFin}T23:59:59.999Z`;

      let query = supabase
        .from("vales")
        .select(
          `
          id_vale,
          folio,
          fecha_creacion,
          fecha_programada,
          vale_material_detalles (
            id_detalle_material,
            id_material,
            material:id_material (
              id_material,
              material,
              tipo_de_material:id_tipo_de_material (
                id_tipo_de_material,
                tipo_de_material
              )
            )
          )
        `,
        )
        .eq("tipo_vale", "material")
        .eq("verificado_por_sindicato", true)
        .neq("estado", "conciliado")
        .eq("id_obra", idObra)
        // Usar fecha_programada si existe, si no fecha_creacion
        .or(
          `and(fecha_programada.gte.${fechaInicio},fecha_programada.lte.${fechaFin}),` +
            `and(fecha_programada.is.null,fecha_creacion.gte.${fechaInicio},fecha_creacion.lte.${fechaFin})`,
        );

      const { data, error } = await query;

      if (error) throw error;

      // Extraer materiales únicos
      const materialesMap = new Map();

      (data || []).forEach((vale) => {
        vale.vale_material_detalles?.forEach((detalle) => {
          const material = detalle.material;
          if (material && !materialesMap.has(material.id_material)) {
            materialesMap.set(material.id_material, {
              id_material: material.id_material,
              material: material.material,
              tipo_de_material: material.tipo_de_material?.tipo_de_material,
              id_tipo_de_material:
                material.tipo_de_material?.id_tipo_de_material,
            });
          }
        });
      });

      // Convertir a array y ordenar alfabéticamente
      const materialesUnicos = Array.from(materialesMap.values()).sort((a, b) =>
        a.material.localeCompare(b.material),
      );

      return { success: true, data: materialesUnicos };
    } catch (error) {
      console.error(
        "[useConciliacionesMaterialQueries] Error en fetchMaterialesConVales:",
        error,
      );
      return { success: false, error: error.message, data: [] };
    }
  }, []);

  return {
    fetchValesVerificadosMaterial,
    fetchObrasConValesMaterial,
    fetchSemanasConValesMaterial,
    fetchMaterialesConVales,
  };
};
