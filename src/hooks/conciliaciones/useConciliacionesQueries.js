/**
 * src/hooks/conciliaciones/useConciliacionesQueries.js
 *
 * Queries a Supabase para conciliaciones
 *
 * Funcionalidades:
 * - Obtener vales verificados para conciliación
 * - Obtener obras con vales verificados
 * - Obtener semanas con vales verificados
 * - Obtener conciliaciones generadas
 * - Guardar nueva conciliación
 *
 * Usado en: useConciliaciones.js
 */

// 1. React y hooks
import { useCallback } from "react";

// 2. Config
import { supabase } from "../../config/supabase";

/**
 * Hook para queries de conciliaciones
 */
export const useConciliacionesQueries = () => {
  /**
   * Obtener vales verificados de renta para generar conciliación
   */
  const fetchValesVerificadosRenta = useCallback(
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
          vale_renta_detalle (
            id_vale_renta_detalle,
            capacidad_m3,
            hora_inicio,
            hora_fin,
            total_horas,
            total_dias,
            costo_total,
            numero_viajes,
            notas_adicionales,
            es_renta_por_dia,
            material:id_material (
              id_material,
              material
            ),
            precios_renta:id_precios_renta (
              costo_hr,
              costo_dia
            )
          )
        `
          )
          .eq("tipo_vale", "renta")
          .eq("verificado_por_sindicato", true)
          .neq("estado", "conciliado"); // No incluir vales ya conciliados

        // Filtrar por obra
        if (filtros.obraSeleccionada) {
          query = query.eq("id_obra", filtros.obraSeleccionada);
        }

        // Filtrar por sindicato (Admin puede elegir, Sindicato solo ve el suyo)
        const sindicatoFiltro =
          filtros.sindicatoSeleccionado || idSindicatoUsuario;
        if (sindicatoFiltro) {
          query = query.eq(
            "operadores.sindicatos.id_sindicato",
            sindicatoFiltro
          );
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
        console.log("DEBUG fetchValesVerificadosRenta - Filtros:", filtros);
        console.log("DEBUG - Data cruda:", data);
        console.log("DEBUG - Cantidad:", data?.length);
        console.log("DEBUG - Error:", error);

        if (error) throw error;

        return { success: true, data: data || [] };
      } catch (error) {
        console.error("Error en fetchValesVerificadosRenta:", error);
        return { success: false, error: error.message, data: [] };
      }
    },
    []
  );

  /**
   * Obtener obras que tienen vales verificados de renta en una semana específica
   */
  const fetchObrasConValesVerificados = useCallback(
    async (semana, idSindicatoUsuario) => {
      try {
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
          .eq("tipo_vale", "renta")
          .eq("verificado_por_sindicato", true)
          .neq("estado", "conciliado")
          .gte("fecha_creacion", semana.fechaInicio)
          .lte("fecha_creacion", semana.fechaFin);

        // Filtrar por sindicato
        if (idSindicatoUsuario) {
          query = query.eq(
            "operadores.sindicatos.id_sindicato",
            idSindicatoUsuario
          );
        }

        const { data, error } = await query;

        if (error) throw error;

        // Agrupar por obra (eliminar duplicados)
        const obrasUnicas = data.reduce((acc, vale) => {
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

        return { success: true, data: obrasUnicas };
      } catch (error) {
        console.error("Error en fetchObrasConValesVerificados:", error);
        return { success: false, error: error.message, data: [] };
      }
    },
    []
  );

  /**
   * Obtener semanas con vales verificados
   * Devuelve array de objetos: { numero, año, fechaInicio, fechaFin, cantidadVales }
   */
  const fetchSemanasConValesVerificados = useCallback(
    async (idSindicatoUsuario) => {
      try {
        let query = supabase
          .from("vales")
          .select(
            `
          fecha_creacion,
          operadores:id_operador (
            sindicatos:id_sindicato (
              id_sindicato
            )
          )
        `
          )
          .eq("tipo_vale", "renta")
          .eq("verificado_por_sindicato", true)
          .neq("estado", "conciliado")
          .order("fecha_creacion", { ascending: false });

        // Filtrar por sindicato
        if (idSindicatoUsuario) {
          query = query.eq(
            "operadores.sindicatos.id_sindicato",
            idSindicatoUsuario
          );
        }

        const { data, error } = await query;

        if (error) throw error;

        // Agrupar por semana (calcular en cliente)
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

        // Convertir a array y ordenar
        const semanasArray = Object.values(semanas).sort((a, b) => {
          if (a.año !== b.año) return b.año - a.año;
          return b.numero - a.numero;
        });

        return { success: true, data: semanasArray };
      } catch (error) {
        console.error("Error en fetchSemanasConValesVerificados:", error);
        return { success: false, error: error.message, data: [] };
      }
    },
    []
  );

  /**
   * Obtener historial de conciliaciones generadas
   */
  const fetchConciliacionesGeneradas = useCallback(
    async (filtros = {}, idSindicatoUsuario) => {
      try {
        let query = supabase
          .from("conciliaciones")
          .select(
            `
          *,
          obras:id_obra (
            id_obra,
            obra,
            cc
          ),
          sindicatos:id_sindicato (
            id_sindicato,
            sindicato
          ),
          empresas:id_empresa (
            empresa,
            sufijo
          ),
          persona:generado_por (
            nombre,
            primer_apellido,
            segundo_apellido
          )
        `
          )
          .order("fecha_generacion", { ascending: false });

        // Filtrar por sindicato (si no es admin)
        if (idSindicatoUsuario && !filtros.ignorarSindicato) {
          query = query.eq("id_sindicato", idSindicatoUsuario);
        }

        // Filtros opcionales
        if (filtros.tipo_conciliacion) {
          query = query.eq("tipo_conciliacion", filtros.tipo_conciliacion);
        }

        if (filtros.id_obra) {
          query = query.eq("id_obra", filtros.id_obra);
        }

        if (filtros.estado) {
          query = query.eq("estado", filtros.estado);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { success: true, data: data || [] };
      } catch (error) {
        console.error("Error en fetchConciliacionesGeneradas:", error);
        return { success: false, error: error.message, data: [] };
      }
    },
    []
  );

  /**
   * Obtener detalle de una conciliación con sus vales
   */
  const fetchConciliacionConVales = useCallback(async (idConciliacion) => {
    try {
      // 1. Obtener conciliación
      const { data: conciliacion, error: errorConc } = await supabase
        .from("conciliaciones")
        .select(
          `
          *,
          obras:id_obra (
            id_obra,
            obra,
            cc
          ),
          sindicatos:id_sindicato (
            id_sindicato,
            sindicato,
            nombre_completo,
            nombre_firma_conciliacion
          ),
          empresas:id_empresa (
            empresa,
            sufijo
          )
        `
        )
        .eq("id_conciliacion", idConciliacion)
        .single();

      if (errorConc) throw errorConc;

      // 2. Obtener vales de la conciliación
      const { data: valesIds, error: errorVales } = await supabase
        .from("conciliacion_vales")
        .select("id_vale")
        .eq("id_conciliacion", idConciliacion);

      if (errorVales) throw errorVales;

      // 3. Obtener detalles completos de los vales
      const idsVales = valesIds.map((v) => v.id_vale);

      const { data: vales, error: errorDetalles } = await supabase
        .from("vales")
        .select(
          `
          *,
          obras:id_obra (
            id_obra,
            obra,
            cc
          ),
          operadores:id_operador (
            id_operador,
            nombre_completo
          ),
          vehiculos:id_vehiculo (
            id_vehiculo,
            placas
          ),
          vale_renta_detalle (
            id_vale_renta_detalle,
            capacidad_m3,
            hora_inicio,
            hora_fin,
            total_horas,
            total_dias,
            costo_total,
            numero_viajes,
            es_renta_por_dia,
            material:id_material (
              material
            )
          )
        `
        )
        .in("id_vale", idsVales)
        .order("fecha_creacion", { ascending: true });

      if (errorDetalles) throw errorDetalles;

      return {
        success: true,
        data: {
          ...conciliacion,
          vales: vales || [],
        },
      };
    } catch (error) {
      console.error("Error en fetchConciliacionConVales:", error);
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Guardar nueva conciliación en BD
   */
  const guardarConciliacion = useCallback(
    async (dataConciliacion, idsVales) => {
      try {
        // 1. Insertar conciliación
        const { data: conciliacion, error: errorConc } = await supabase
          .from("conciliaciones")
          .insert(dataConciliacion)
          .select()
          .single();

        if (errorConc) throw errorConc;

        // 2. Insertar relación con vales
        const valesRelacion = idsVales.map((id_vale) => ({
          id_conciliacion: conciliacion.id_conciliacion,
          id_vale,
        }));

        const { error: errorRel } = await supabase
          .from("conciliacion_vales")
          .insert(valesRelacion);

        if (errorRel) throw errorRel;

        // 3. ⚠️ COMENTAR TEMPORALMENTE - Actualizar estado de vales a 'conciliado'
        // const { error: errorUpdate } = await supabase
        //   .from("vales")
        //   .update({ estado: "conciliado" })
        //   .in("id_vale", idsVales);

        // if (errorUpdate) throw errorUpdate;

        // ✅ TEMPORAL: Log para ver que se saltó la actualización
        console.log(
          "⚠️ MODO PRUEBAS: [useConciliacionesQueries] No se cambió el estado de los vales a 'conciliado'"
        );

        return { success: true, data: conciliacion };
      } catch (error) {
        console.error("Error en guardarConciliacion:", error);
        return { success: false, error: error.message };
      }
    },
    []
  );

  return {
    fetchValesVerificadosRenta,
    fetchObrasConValesVerificados,
    fetchSemanasConValesVerificados,
    fetchConciliacionesGeneradas,
    fetchConciliacionConVales,
    guardarConciliacion,
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
  const diff = dia === 0 ? -6 : 1 - dia; // Si es domingo, restar 6, sino al lunes
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
