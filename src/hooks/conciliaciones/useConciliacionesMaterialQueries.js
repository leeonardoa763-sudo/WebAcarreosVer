/**
 * src/hooks/conciliaciones/useConciliacionesMaterialQueries.js
 *
 * Queries a Supabase específicas para conciliaciones de material
 *
 * Funcionalidades:
 * - Obtener vales verificados de material
 * - Obtener obras con vales de material verificados
 * - Obtener semanas con vales de material verificados
 *
 * Usado en: useConciliacionesMaterial.js
 */

// 1. React y hooks
import { useCallback } from "react";

// 2. Config
import { supabase } from "../../config/supabase";

/**
 * Hook para queries de conciliaciones de material
 */
export const useConciliacionesMaterialQueries = () => {
  /**
   * Obtener vales verificados de material para generar conciliación
   */
  const fetchValesVerificadosMaterial = useCallback(
    async (filtros, idSindicatoUsuario) => {
      try {
        console.log(
          "[useConciliacionesMaterialQueries] fetchValesVerificadosMaterial - Inicio"
        );
        console.log(
          "[useConciliacionesMaterialQueries] Filtros recibidos:",
          filtros
        );
        console.log(
          "[useConciliacionesMaterialQueries] Sindicato usuario:",
          idSindicatoUsuario
        );

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
          .neq("estado", "conciliado");

        // Filtrar por obra
        if (filtros.obraSeleccionada) {
          query = query.eq("id_obra", filtros.obraSeleccionada);
        }

        // Filtrar por rango de fechas de la semana
        if (filtros.semanaSeleccionada) {
          query = query
            .gte("fecha_creacion", filtros.semanaSeleccionada.fechaInicio)
            .lte("fecha_creacion", filtros.semanaSeleccionada.fechaFin);
        }

        // Ordenar por placas y fecha
        query = query.order("fecha_creacion", { ascending: true });

        const { data, error } = await query;

        if (error) throw error;

        console.log(
          "[useConciliacionesMaterialQueries] Vales encontrados:",
          data?.length || 0
        );

        // Filtrar por sindicato en el cliente
        let valesFiltrados = data || [];

        if (idSindicatoUsuario) {
          valesFiltrados = valesFiltrados.filter((vale) => {
            const sindicatoOperador = vale.operadores?.sindicatos?.id_sindicato;
            return sindicatoOperador === idSindicatoUsuario;
          });

          console.log(
            "[useConciliacionesMaterialQueries] Vales después de filtrar por sindicato:",
            valesFiltrados.length
          );
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
  const fetchObrasConValesMaterial = useCallback(
    async (semana, idSindicatoUsuario) => {
      try {
        console.log(
          "[useConciliacionesMaterialQueries] fetchObrasConValesMaterial - Inicio"
        );

        let query = supabase
          .from("vales")
          .select(
            `
          id_obra,
          obras:id_obra (
            id_obra,
            obra,
            cc,
            empresas:id_empresa (
              empresa,
              sufijo
            )
          ),
          operadores:id_operador (
            sindicatos:id_sindicato (
              id_sindicato
            )
          )
        `
          )
          .eq("tipo_vale", "material")
          .eq("verificado_por_sindicato", true)
          .neq("estado", "conciliado")
          .gte("fecha_creacion", semana.fechaInicio)
          .lte("fecha_creacion", semana.fechaFin);

        const { data, error } = await query;

        if (error) throw error;

        // Filtrar por sindicato en el cliente
        let valesFiltrados = data || [];

        if (idSindicatoUsuario) {
          valesFiltrados = valesFiltrados.filter((vale) => {
            const sindicatoOperador = vale.operadores?.id_sindicato;
            return sindicatoOperador === idSindicatoUsuario;
          });
        }

        // Agrupar por obra (eliminar duplicados)
        const obrasUnicas = valesFiltrados.reduce((acc, vale) => {
          if (
            vale.obras &&
            !acc.find((o) => o.id_obra === vale.obras.id_obra)
          ) {
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

        console.log(
          "[useConciliacionesMaterialQueries] Obras únicas encontradas:",
          obrasUnicas.length
        );

        return { success: true, data: obrasUnicas };
      } catch (error) {
        console.error(
          "[useConciliacionesMaterialQueries] Error en fetchObrasConValesMaterial:",
          error
        );
        return { success: false, error: error.message, data: [] };
      }
    },
    []
  );

  /**
   * Obtener semanas con vales verificados de material
   */
  const fetchSemanasConValesMaterial = useCallback(
    async (idSindicatoUsuario) => {
      try {
        console.log(
          "[useConciliacionesMaterialQueries] fetchSemanasConValesMaterial - Inicio"
        );

        let query = supabase
          .from("vales")
          .select(
            `
          fecha_creacion,
          operadores:id_operador (
            id_sindicato,
            sindicatos:id_sindicato (
              id_sindicato
            )
          )
        `
          )
          .eq("tipo_vale", "material")
          .eq("verificado_por_sindicato", true)
          .neq("estado", "conciliado")
          .order("fecha_creacion", { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        // Filtrar por sindicato en el cliente
        let valesFiltrados = data || [];

        if (idSindicatoUsuario) {
          valesFiltrados = valesFiltrados.filter((vale) => {
            const sindicatoOperador = vale.operadores?.id_sindicato;
            return sindicatoOperador === idSindicatoUsuario;
          });
        }

        // Agrupar por semana
        const semanas = {};

        valesFiltrados.forEach((vale) => {
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

        // Convertir a array y ordenar
        const semanasArray = Object.values(semanas).sort((a, b) => {
          if (a.año !== b.año) return b.año - a.año;
          return b.numero - a.numero;
        });

        console.log(
          "[useConciliacionesMaterialQueries] Semanas encontradas:",
          semanasArray.length
        );

        return { success: true, data: semanasArray };
      } catch (error) {
        console.error(
          "[useConciliacionesMaterialQueries] Error en fetchSemanasConValesMaterial:",
          error
        );
        return { success: false, error: error.message, data: [] };
      }
    },
    []
  );

  return {
    fetchValesVerificadosMaterial,
    fetchObrasConValesMaterial,
    fetchSemanasConValesMaterial,
  };
};

/**
 * Calcular semana ISO 8601 a partir de una fecha
 * Lunes a Sábado (ajustado para México)
 */
const calcularSemanaISO = (fecha) => {
  const date = new Date(fecha);

  // Ajustar al lunes de la semana
  const dia = date.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(date);
  lunes.setDate(date.getDate() + diff);

  // Sábado de la semana
  const sabado = new Date(lunes);
  sabado.setDate(lunes.getDate() + 5);

  // Calcular número de semana
  const primerDiaAno = new Date(lunes.getFullYear(), 0, 1);
  const diasTranscurridos = Math.floor(
    (lunes - primerDiaAno) / (24 * 60 * 60 * 1000)
  );
  const numeroSemana = Math.ceil(
    (diasTranscurridos + primerDiaAno.getDay() + 1) / 7
  );

  return {
    numero: numeroSemana,
    año: lunes.getFullYear(),
    fechaInicio: lunes.toISOString().split("T")[0],
    fechaFin: sabado.toISOString().split("T")[0],
  };
};
