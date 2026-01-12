/**
 * src/hooks/conciliaciones/useConciliacionesMaterialQueries.js
 *
 * Queries a Supabase específicas para conciliaciones de material
 *const { data, error } = await query;
 * CORRECCIONES APLICADAS:
 * 1. Eliminado filtro por sindicato de operador (Material no depende de sindicato)
 * 2. Corregido filtro de fecha para incluir TODO el día final (23:59:59.999)
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

export const useConciliacionesMaterialQueries = () => {
  /**
   * Obtener vales verificados de material para generar conciliación
   * Filtra por: semana (fecha_creacion), obra, material
   */
  const fetchValesVerificadosMaterial = useCallback(
    async (filtros, idSindicatoUsuario) => {
      try {
        // Query base
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
          )
        )
      `
          )
          .eq("tipo_vale", "material")
          .eq("verificado_por_sindicato", true)
          .neq("estado", "conciliado"); // ← Comentar para ver vales conciliados en PRUEBAS

        // Filtrar por obra
        if (filtros.obraSeleccionada) {
          query = query.eq("id_obra", filtros.obraSeleccionada);
        }

        //  CORRECCIÓN: Incluir TODO el día final (hasta 23:59:59.999)
        if (filtros.semanaSeleccionada) {
          const fechaFinCompleta = `${filtros.semanaSeleccionada.fechaFin}T23:59:59.999Z`;

          query = query
            .gte("fecha_creacion", filtros.semanaSeleccionada.fechaInicio)
            .lte("fecha_creacion", fechaFinCompleta);
        }

        // Ordenar por fecha
        query = query.order("fecha_creacion", { ascending: true });

        const { data, error } = await query;

        if (error) throw error;

        let valesFiltrados = data || [];

        // Filtrar por material específico si está seleccionado
        if (filtros.materialSeleccionado) {
          valesFiltrados = valesFiltrados.filter((vale) => {
            return vale.vale_material_detalles?.some(
              (detalle) =>
                detalle.material?.id_material === filtros.materialSeleccionado
            );
          });

          // Filtrar los detalles del vale para solo incluir el material seleccionado
          valesFiltrados = valesFiltrados.map((vale) => ({
            ...vale,
            vale_material_detalles: vale.vale_material_detalles.filter(
              (detalle) =>
                detalle.material?.id_material === filtros.materialSeleccionado
            ),
          }));
        }

        return { success: true, data: valesFiltrados };
      } catch (error) {
        console.error(
          "[useConciliacionesMaterialQueries] Error en fetchValesVerificadosMaterial:",
          error
        );
        return { success: false, error: error.message, data: [] };
      }
    },
    []
  );

  /**
   * Obtener obras que tienen vales verificados de material en una semana específica
   */
  const fetchObrasConValesMaterial = useCallback(async (semana) => {
    try {
      //  Incluir TODO el día final
      const fechaFinCompleta = `${semana.fechaFin}T23:59:59.999Z`;

      let query = supabase
        .from("vales")
        .select(
          `
          id_vale,
          folio,
          id_obra,
          obras:id_obra (
            id_obra,
            obra,
            cc,
            empresas:id_empresa (
              empresa,
              sufijo
            )
          )
        `
        )
        .eq("tipo_vale", "material")
        .eq("verificado_por_sindicato", true)
        .neq("estado", "conciliado")
        .gte("fecha_creacion", semana.fechaInicio)
        .lte("fecha_creacion", fechaFinCompleta);

      const { data, error } = await query;

      if (error) throw error;

      (data || []).forEach((vale, index) => {
        if (vale.obras) {
        } else {
          console.log("    ❌ NO TIENE DATOS DE OBRA");
        }
      });

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
        error
      );
      return { success: false, error: error.message, data: [] };
    }
  }, []);

  /**
   * Obtener semanas con vales verificados de material
   */
  const fetchSemanasConValesMaterial = useCallback(async () => {
    try {
      let query = supabase
        .from("vales")
        .select("fecha_creacion")
        .eq("tipo_vale", "material")
        .eq("verificado_por_sindicato", true)
        .neq("estado", "conciliado")
        .order("fecha_creacion", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Ver las fechas de los vales
      data?.forEach((vale, idx) => {
        const fecha = new Date(vale.fecha_creacion);
      });

      // Agrupar por semana
      const semanas = {};

      data.forEach((vale) => {
        const fecha = new Date(vale.fecha_creacion);
        const semanaInfo = calcularSemanaISO(fecha);

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

      const semanasArray = Object.values(semanas).sort((a, b) => {
        if (a.año !== b.año) return b.año - a.año;
        return b.numero - a.numero;
      });

      semanasArray.forEach((sem, idx) => {});

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
      //  Incluir TODO el día final
      const fechaFinCompleta = `${semana.fechaFin}T23:59:59.999Z`;

      let query = supabase
        .from("vales")
        .select(
          `
        id_vale,
        folio,
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
      `
        )
        .eq("tipo_vale", "material")
        .eq("verificado_por_sindicato", true)
        .neq("estado", "conciliado")
        .eq("id_obra", idObra)
        .gte("fecha_creacion", semana.fechaInicio)
        .lte("fecha_creacion", fechaFinCompleta);

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
        a.material.localeCompare(b.material)
      );

      return { success: true, data: materialesUnicos };
    } catch (error) {
      console.error(
        "[useConciliacionesMaterialQueries] Error en fetchMaterialesConVales:",
        error
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
