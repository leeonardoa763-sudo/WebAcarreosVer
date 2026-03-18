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
 * Nota: Se usa fecha_programada cuando existe (vales planeados con anticipación),
 * con fallback a fecha_creacion para vales sin fecha programada.
 *
 * Usado en: useConciliaciones.js
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
          `,
          )
          .eq("tipo_vale", "renta")
          .eq("verificado_por_sindicato", true)
          .neq("estado", "conciliado");

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
            sindicatoFiltro,
          );
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

        return { success: true, data: data || [] };
      } catch (error) {
        console.error("Error en fetchValesVerificadosRenta:", error);
        return { success: false, error: error.message, data: [] };
      }
    },
    [],
  );

  /**
   * Obtener obras que tienen vales verificados de renta en una semana específica
   */
  const fetchObrasConValesVerificados = useCallback(
    async (semana, idSindicatoUsuario) => {
      try {
        const fechaInicio = semana.fechaInicio;
        const fechaFin = `${semana.fechaFin}T23:59:59.999Z`;

        let query = supabase
          .from("vales")
          .select(
            `
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
            ),
            operadores:id_operador (
              sindicatos:id_sindicato (
                id_sindicato
              )
            )
          `,
          )
          .eq("tipo_vale", "renta")
          .eq("verificado_por_sindicato", true)
          .neq("estado", "conciliado")
          // Usar fecha_programada si existe, si no fecha_creacion
          .or(
            `and(fecha_programada.gte.${fechaInicio},fecha_programada.lte.${fechaFin}),` +
              `and(fecha_programada.is.null,fecha_creacion.gte.${fechaInicio},fecha_creacion.lte.${fechaFin})`,
          );

        // Filtrar por sindicato
        if (idSindicatoUsuario) {
          query = query.eq(
            "operadores.sindicatos.id_sindicato",
            idSindicatoUsuario,
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
    [],
  );

  /**
   * Obtener semanas con vales verificados de renta
   * Devuelve array de objetos: { numero, año, fechaInicio, fechaFin, cantidadVales }
   * Usa fecha_programada cuando existe para clasificar el vale en la semana correcta
   */
  const fetchSemanasConValesVerificados = useCallback(
    async (idSindicatoUsuario) => {
      try {
        let query = supabase
          .from("vales")
          .select(
            `
            fecha_creacion,
            fecha_programada,
            operadores:id_operador (
              id_sindicato,
              sindicatos:id_sindicato (
                id_sindicato
              )
            )
          `,
          )
          .eq("tipo_vale", "renta")
          .eq("verificado_por_sindicato", true)
          .neq("estado", "conciliado")
          .order("fecha_creacion", { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        // Filtrar en el cliente por sindicato
        let valesFiltrados = data;

        if (idSindicatoUsuario) {
          valesFiltrados = data.filter((vale) => {
            const sindicatoOperador = vale.operadores?.id_sindicato;
            return sindicatoOperador === idSindicatoUsuario;
          });
        }

        // Agrupar por semana usando fecha efectiva (programada o creacion)
        const semanas = {};

        valesFiltrados.forEach((vale) => {
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
        console.error("Error en fetchSemanasConValesVerificados:", error);
        return { success: false, error: error.message, data: [] };
      }
    },
    [],
  );

  /**
   * Obtener historial de conciliaciones generadas CON VALES
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
              cc,
              empresas:id_empresa (
                empresa,
                sufijo
              )
            ),
            sindicatos:id_sindicato (
              id_sindicato,
              sindicato,
              nombre_completo
            ),
            persona:generado_por (
              nombre,
              primer_apellido,
              segundo_apellido
            )
          `,
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

        // Para cada conciliación, obtener los vales relacionados
        const conciliacionesConVales = await Promise.all(
          (data || []).map(async (conc) => {
            try {
              const { data: valesIds, error: errorValesIds } = await supabase
                .from("conciliacion_vales")
                .select("id_vale")
                .eq("id_conciliacion", conc.id_conciliacion);

              if (errorValesIds) {
                console.error("Error obteniendo IDs de vales:", errorValesIds);
                return { ...conc, vales: [] };
              }

              if (!valesIds || valesIds.length === 0) {
                return { ...conc, vales: [] };
              }

              const idsVales = valesIds.map((v) => v.id_vale);

              if (conc.tipo_conciliacion === "renta") {
                const { data: vales, error: errorVales } = await supabase
                  .from("vales")
                  .select(
                    `
                    *,
                    vale_renta_detalle (
                      capacidad_m3,
                      numero_viajes,
                      total_horas,
                      total_dias,
                      costo_total,
                      material:id_material (
                        material
                      )
                    )
                  `,
                  )
                  .in("id_vale", idsVales);

                if (errorVales) {
                  console.error("Error obteniendo vales de renta:", errorVales);
                  return { ...conc, vales: [] };
                }

                return { ...conc, vales: vales || [] };
              } else {
                const { data: vales, error: errorVales } = await supabase
                  .from("vales")
                  .select(
                    `
                    *,
                    vale_material_detalles (
                      cantidad_pedida_m3,
                      volumen_real_m3,
                      distancia_km,
                      precio_m3,
                      costo_total,
                      material:id_material (
                        material
                      )
                    )
                  `,
                  )
                  .in("id_vale", idsVales);

                if (errorVales) {
                  console.error(
                    "Error obteniendo vales de material:",
                    errorVales,
                  );
                  return { ...conc, vales: [] };
                }

                return { ...conc, vales: vales || [] };
              }
            } catch (innerError) {
              console.error(
                `Error procesando conciliación ${conc.id_conciliacion}:`,
                innerError,
              );
              return { ...conc, vales: [] };
            }
          }),
        );

        return { success: true, data: conciliacionesConVales };
      } catch (error) {
        console.error("Error en fetchConciliacionesGeneradas:", error);
        return { success: false, error: error.message, data: [] };
      }
    },
    [],
  );

  /**
   * Obtener conciliaciones SIN vales (más rápido para listados)
   */
  const fetchConciliacionesSinVales = useCallback(
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
              cc,
              empresas:id_empresa (
                empresa,
                sufijo
              )
            ),
            sindicatos:id_sindicato (
              id_sindicato,
              sindicato,
              nombre_completo
            ),
            persona:generado_por (
              nombre,
              primer_apellido,
              segundo_apellido
            )
          `,
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
        console.error("Error en fetchConciliacionesSinVales:", error);
        return { success: false, error: error.message, data: [] };
      }
    },
    [],
  );

  /**
   * Cargar vales para múltiples conciliaciones (para exportar)
   */
  const fetchValesParaConciliaciones = useCallback(async (conciliaciones) => {
    try {
      const conciliacionesConVales = await Promise.all(
        conciliaciones.map(async (conc) => {
          try {
            const { data: valesIds, error: errorValesIds } = await supabase
              .from("conciliacion_vales")
              .select("id_vale")
              .eq("id_conciliacion", conc.id_conciliacion);

            if (errorValesIds || !valesIds || valesIds.length === 0) {
              return { ...conc, vales: [] };
            }

            const idsVales = valesIds.map((v) => v.id_vale);

            if (conc.tipo_conciliacion === "renta") {
              const { data: vales, error: errorVales } = await supabase
                .from("vales")
                .select(
                  `
                  *,
                  vale_renta_detalle (
                    capacidad_m3,
                    numero_viajes,
                    total_horas,
                    total_dias,
                    costo_total,
                    material:id_material (
                      material
                    )
                  )
                `,
                )
                .in("id_vale", idsVales);

              if (errorVales) {
                console.error("Error obteniendo vales de renta:", errorVales);
                return { ...conc, vales: [] };
              }

              return { ...conc, vales: vales || [] };
            } else {
              const { data: vales, error: errorVales } = await supabase
                .from("vales")
                .select(
                  `
                  *,
                  vale_material_detalles (
                    cantidad_pedida_m3,
                    volumen_real_m3,
                    distancia_km,
                    precio_m3,
                    costo_total,
                    material:id_material (
                      material
                    )
                  )
                `,
                )
                .in("id_vale", idsVales);

              if (errorVales) {
                console.error(
                  "Error obteniendo vales de material:",
                  errorVales,
                );
                return { ...conc, vales: [] };
              }

              return { ...conc, vales: vales || [] };
            }
          } catch (innerError) {
            console.error(
              `Error procesando conciliación ${conc.id_conciliacion}:`,
              innerError,
            );
            return { ...conc, vales: [] };
          }
        }),
      );

      return { success: true, data: conciliacionesConVales };
    } catch (error) {
      console.error("Error en fetchValesParaConciliaciones:", error);
      return { success: false, error: error.message, data: [] };
    }
  }, []);

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
        `,
        )
        .eq("id_conciliacion", idConciliacion)
        .single();

      if (errorConc) throw errorConc;

      // 2. Obtener IDs de vales de la conciliación
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
        `,
        )
        .in("id_vale", idsVales)
        // Ordenar por fecha efectiva (programada o creacion)
        .order("fecha_programada", { ascending: true, nullsFirst: false })
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

        // 3. Actualizar estado de vales a 'conciliado'
        const { error: errorUpdate } = await supabase
          .from("vales")
          .update({ estado: "conciliado" })
          .in("id_vale", idsVales);

        if (errorUpdate) throw errorUpdate;

        return { success: true, data: conciliacion };
      } catch (error) {
        console.error("Error en guardarConciliacion:", error);
        return { success: false, error: error.message };
      }
    },
    [],
  );

  return {
    fetchValesVerificadosRenta,
    fetchObrasConValesVerificados,
    fetchSemanasConValesVerificados,
    fetchConciliacionesGeneradas,
    fetchConciliacionesSinVales,
    fetchValesParaConciliaciones,
    fetchConciliacionConVales,
    guardarConciliacion,
  };
};
