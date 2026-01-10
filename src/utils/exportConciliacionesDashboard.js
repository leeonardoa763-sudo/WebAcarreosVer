/**
 * src/utils/exportConciliacionesDashboard.js
 *
 * Utilidad para exportar conciliaciones del dashboard a Excel
 *
 * Funcionalidades:
 * - Prepara datos de conciliaciones con todas las columnas requeridas
 * - Formatea fechas, números y montos
 * - Maneja tanto conciliaciones de renta como de material
 * - Carga vales bajo demanda para optimizar rendimiento
 *
 * Dependencias: formatters.js, exportToExcel.js, supabase
 * Usado en: Dashboard (SeccionConciliaciones)
 */

// Importar utilidad de exportación base
import { exportToExcel } from "./exportToExcel";

// Importar queries
import { supabase } from "../config/supabase";

// Importar formateadores
import { formatearFechaCorta } from "./formatters";

/**
 * Preparar datos de conciliaciones para exportación
 * Transforma el array de conciliaciones al formato requerido para Excel
 *
 * @param {Array} conciliaciones - Array de conciliaciones filtradas
 * @returns {Array} - Array de objetos formateados para Excel
 */
const prepararDatosParaExcel = (conciliaciones) => {
  return conciliaciones.map((conc) => {
    // Calcular valores desde la BD
    const subtotal = parseFloat(conc.subtotal) || 0;
    const iva = parseFloat(conc.iva_16_porciento) || 0;
    const retencion = parseFloat(conc.retencion_4_porciento) || 0;
    const totalFinal = parseFloat(conc.total_final) || 0;

    // Formatear obra con CC
    const obraFormateada = conc.obras?.cc
      ? `${conc.obras.cc} "${conc.obras.obra}"`
      : conc.obras?.obra || "N/A";

    return {
      Folio: conc.folio || "N/A",
      Tipo:
        (conc.tipo || conc.tipo_conciliacion) === "renta"
          ? "RENTA"
          : "MATERIAL",
      "Fecha Inicio": formatearFechaCorta(conc.fecha_inicio) || "N/A",
      "Fecha Fin": formatearFechaCorta(conc.fecha_fin) || "N/A",
      Año: conc.año || "N/A",
      "Número Semana": conc.numero_semana || "N/A",
      Obra: obraFormateada,
      Empresa: conc.obras?.empresas?.empresa || "N/A",
      Sindicato: conc.sindicatos?.nombre_completo || "N/A",
      "Material Movido": obtenerMaterialMovido(conc),
      "Total M³": obtenerTotalM3Numero(conc),
      "Total Horas": obtenerTotalHorasNumero(conc),
      "Total Días": obtenerTotalDiasNumero(conc),
      "Número Viajes": obtenerNumeroViajes(conc),
      "Distancia (km)": obtenerDistancia(conc),
      "Precio por M³": obtenerPrecioM3(conc),
      Subtotal: subtotal.toFixed(2),
      "IVA 16%": iva.toFixed(2),
      "Retención 4%": retencion.toFixed(2),
      "Total Final": totalFinal.toFixed(2),
      Estado: conc.estado || "N/A",
      "Fecha Generación": formatearFechaCorta(conc.fecha_generacion) || "N/A",
    };
  });
};

/**
 * Obtener material movido de la conciliación
 * Para renta: lista de materiales únicos de los vales
 * Para material: tipo de material del primer vale
 *
 * @param {Object} conc - Objeto de conciliación
 * @returns {string} - Material(es) movido(s)
 */
const obtenerMaterialMovido = (conc) => {
  try {
    if (!conc.vales || conc.vales.length === 0) return "";

    const tipoConc = conc.tipo || conc.tipo_conciliacion;

    if (tipoConc === "renta") {
      // Para renta: obtener materiales únicos
      const materiales = new Set();
      conc.vales.forEach((vale) => {
        vale.vale_renta_detalle?.forEach((detalle) => {
          if (detalle.material?.material) {
            materiales.add(detalle.material.material);
          }
        });
      });
      return materiales.size > 0 ? Array.from(materiales).join(", ") : "";
    } else {
      // Para material: obtener material del primer detalle
      const primerVale = conc.vales[0];
      const primerDetalle = primerVale?.vale_material_detalles?.[0];
      return primerDetalle?.material?.material || "";
    }
  } catch (error) {
    console.error("Error al obtener material movido:", error);
    return "";
  }
};

/**
 * Obtener total de M³ como número
 * Solo aplica para conciliaciones de material
 *
 * @param {Object} conc - Objeto de conciliación
 * @returns {string|number} - Total de M³ o vacío
 */
const obtenerTotalM3Numero = (conc) => {
  try {
    const tipoConc = conc.tipo || conc.tipo_conciliacion;
    if (tipoConc !== "material") return "";
    if (!conc.vales || conc.vales.length === 0) return "";

    let totalM3 = 0;
    conc.vales.forEach((vale) => {
      vale.vale_material_detalles?.forEach((detalle) => {
        totalM3 += parseFloat(detalle.volumen_real_m3 || 0);
      });
    });

    return totalM3 > 0 ? totalM3.toFixed(2) : "";
  } catch (error) {
    console.error("Error al calcular total M³:", error);
    return "";
  }
};

/**
 * Obtener total de horas como número
 * Solo aplica para conciliaciones de renta con tarifa por hora
 *
 * @param {Object} conc - Objeto de conciliación
 * @returns {string|number} - Total de horas o vacío
 */
const obtenerTotalHorasNumero = (conc) => {
  try {
    const tipoConc = conc.tipo || conc.tipo_conciliacion;
    if (tipoConc !== "renta") return "";
    if (!conc.vales || conc.vales.length === 0) return "";

    let totalHoras = 0;
    conc.vales.forEach((vale) => {
      vale.vale_renta_detalle?.forEach((detalle) => {
        totalHoras += parseFloat(detalle.total_horas || 0);
      });
    });

    return totalHoras > 0 ? totalHoras.toFixed(2) : "";
  } catch (error) {
    console.error("Error al calcular total horas:", error);
    return "";
  }
};

/**
 * Obtener total de días como número
 * Solo aplica para conciliaciones de renta con tarifa por día
 *
 * @param {Object} conc - Objeto de conciliación
 * @returns {string|number} - Total de días o vacío
 */
const obtenerTotalDiasNumero = (conc) => {
  try {
    const tipoConc = conc.tipo || conc.tipo_conciliacion;
    if (tipoConc !== "renta") return "";
    if (!conc.vales || conc.vales.length === 0) return "";

    let totalDias = 0;
    conc.vales.forEach((vale) => {
      vale.vale_renta_detalle?.forEach((detalle) => {
        totalDias += parseFloat(detalle.total_dias || 0);
      });
    });

    return totalDias > 0 ? totalDias.toFixed(2) : "";
  } catch (error) {
    console.error("Error al calcular total días:", error);
    return "";
  }
};

/**
 * Obtener número total de viajes
 * Para renta: suma de numero_viajes de los detalles
 * Para material: cuenta cada detalle como 1 viaje
 *
 * @param {Object} conc - Objeto de conciliación
 * @returns {string|number} - Total de viajes o vacío
 */
const obtenerNumeroViajes = (conc) => {
  try {
    if (!conc.vales || conc.vales.length === 0) return "";

    const tipoConc = conc.tipo || conc.tipo_conciliacion;

    if (tipoConc === "renta") {
      // Para renta: sumar campo numero_viajes
      let totalViajes = 0;
      conc.vales.forEach((vale) => {
        vale.vale_renta_detalle?.forEach((detalle) => {
          totalViajes += parseInt(detalle.numero_viajes || 0);
        });
      });
      return totalViajes > 0 ? totalViajes : "";
    } else {
      // Para material: contar cada detalle como 1 viaje
      let totalViajes = 0;
      conc.vales.forEach((vale) => {
        vale.vale_material_detalles?.forEach(() => {
          totalViajes += 1;
        });
      });
      return totalViajes > 0 ? totalViajes : "";
    }
  } catch (error) {
    console.error("Error al calcular total viajes:", error);
    return "";
  }
};

/**
 * Obtener distancia en km
 * Aplica para conciliaciones de material
 *
 * @param {Object} conc - Objeto de conciliación
 * @returns {string|number} - Distancia o vacío
 */
const obtenerDistancia = (conc) => {
  try {
    const tipoConc = conc.tipo || conc.tipo_conciliacion;
    if (tipoConc !== "material") return "";
    if (!conc.vales || conc.vales.length === 0) return "";

    // Obtener distancia del primer vale (generalmente es la misma para toda la conciliación)
    const primerVale = conc.vales[0];
    const primerDetalle = primerVale?.vale_material_detalles?.[0];

    if (primerDetalle?.distancia_km) {
      return parseFloat(primerDetalle.distancia_km).toFixed(2);
    }

    return "";
  } catch (error) {
    console.error("Error al obtener distancia:", error);
    return "";
  }
};

/**
 * Obtener precio por M³
 * Aplica para conciliaciones de material
 *
 * @param {Object} conc - Objeto de conciliación
 * @returns {string|number} - Precio por M³ o vacío
 */
const obtenerPrecioM3 = (conc) => {
  try {
    const tipoConc = conc.tipo || conc.tipo_conciliacion;
    if (tipoConc !== "material") return "";
    if (!conc.vales || conc.vales.length === 0) return "";

    // Obtener precio del primer vale
    const primerVale = conc.vales[0];
    const primerDetalle = primerVale?.vale_material_detalles?.[0];

    if (primerDetalle?.precio_m3) {
      return parseFloat(primerDetalle.precio_m3).toFixed(2);
    }

    return "";
  } catch (error) {
    console.error("Error al obtener precio M³:", error);
    return "";
  }
};

/**
 * Exportar conciliaciones a Excel
 * Función principal que prepara y exporta los datos
 *
 * @param {Array} conciliaciones - Array de conciliaciones a exportar
 * @param {string} tipoActivo - Tipo de conciliación activo ("renta" o "material")
 */
export const exportarConciliacionesDashboard = (conciliaciones, tipoActivo) => {
  try {
    // Validar que hay datos
    if (!conciliaciones || conciliaciones.length === 0) {
      throw new Error("No hay conciliaciones para exportar");
    }

    // Preparar datos
    const datosFormateados = prepararDatosParaExcel(conciliaciones);

    // Generar nombre de archivo
    const fecha = new Date().toISOString().split("T")[0];
    const tipo = tipoActivo === "renta" ? "Renta" : "Material";
    const fileName = `Conciliaciones_${tipo}_${fecha}`;

    // Exportar a Excel
    exportToExcel(datosFormateados, fileName, "Conciliaciones");

    console.log(`✅ ${conciliaciones.length} conciliaciones exportadas`);
  } catch (error) {
    console.error("Error al exportar conciliaciones:", error);
    throw error;
  }
};

/**
 * Exportar conciliaciones cargando vales bajo demanda
 * Optimizado para no cargar vales innecesariamente
 *
 * @param {Array} conciliaciones - Array de conciliaciones sin vales
 * @param {string} tipoActivo - Tipo de conciliación activo ("renta" o "material")
 */
export const exportarConVales = async (conciliaciones, tipoActivo) => {
  try {
    // Validar que hay datos
    if (!conciliaciones || conciliaciones.length === 0) {
      throw new Error("No hay conciliaciones para exportar");
    }

    // Cargar vales para estas conciliaciones
    const conciliacionesConVales = await Promise.all(
      conciliaciones.map(async (conc) => {
        try {
          // Obtener IDs de vales
          const { data: valesIds } = await supabase
            .from("conciliacion_vales")
            .select("id_vale")
            .eq("id_conciliacion", conc.id_conciliacion);

          if (!valesIds || valesIds.length === 0) {
            return { ...conc, vales: [] };
          }

          const idsVales = valesIds.map((v) => v.id_vale);

          // Cargar vales según tipo
          if (conc.tipo_conciliacion === "renta") {
            const { data: vales } = await supabase
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
              `
              )
              .in("id_vale", idsVales);

            return { ...conc, vales: vales || [] };
          } else {
            const { data: vales } = await supabase
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
              `
              )
              .in("id_vale", idsVales);

            return { ...conc, vales: vales || [] };
          }
        } catch (error) {
          console.error(`Error cargando vales para ${conc.folio}:`, error);
          return { ...conc, vales: [] };
        }
      })
    );

    // Preparar datos
    const datosFormateados = prepararDatosParaExcel(conciliacionesConVales);

    // Generar nombre de archivo
    const fecha = new Date().toISOString().split("T")[0];
    const tipo = tipoActivo === "renta" ? "Renta" : "Material";
    const fileName = `Conciliaciones_${tipo}_${fecha}`;

    // Exportar a Excel
    exportToExcel(datosFormateados, fileName, "Conciliaciones");

    console.log(`✅ ${conciliaciones.length} conciliaciones exportadas`);
  } catch (error) {
    console.error("Error al exportar conciliaciones:", error);
    throw error;
  }
};
