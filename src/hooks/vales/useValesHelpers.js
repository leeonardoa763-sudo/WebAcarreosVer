/**
 * src/hooks/vales/useValesHelpers.js
 *
 * Funciones auxiliares para vales
 *
 * Funcionalidades:
 * - Calcular precio total de un vale
 * - Calcular totales por tipo
 * - Formatear datos de vale
 * - Extraer información específica
 *
 * Usado en: useVales.js
 */

/**
 * Hook para funciones auxiliares de vales
 */
export const useValesHelpers = () => {
  /**
   * Calcular precio total de un vale
   * @param {object} vale - Vale completo con detalles
   * @returns {number} Precio total
   */
  const calcularPrecioTotal = (vale) => {
    if (!vale) return 0;

    if (vale.tipo_vale === "material") {
      return (
        vale.vale_material_detalles?.reduce((total, detalle) => {
          return total + Number(detalle.costo_total || 0);
        }, 0) || 0
      );
    }

    if (vale.tipo_vale === "renta") {
      return (
        vale.vale_renta_detalle?.reduce((total, detalle) => {
          return total + Number(detalle.costo_total || 0);
        }, 0) || 0
      );
    }

    return 0;
  };

  /**
   * Calcular totales de material por tipo
   * @param {object} vale - Vale de tipo material
   * @returns {object} Totales separados por tipo 3 y otros
   */
  const calcularTotalesMaterial = (vale) => {
    if (!vale.vale_material_detalles) {
      return { totalM3Tipo3: 0, totalM3Otros: 0, costoTotal: 0 };
    }

    // Separar por tipo de material y convertir a número
    const totalM3Tipo3 = vale.vale_material_detalles
      .filter((d) => d.material?.tipo_de_material?.id_tipo_de_material === 3)
      .reduce((sum, d) => sum + Number(d.cantidad_pedida_m3 || 0), 0);

    const totalM3Otros = vale.vale_material_detalles
      .filter((d) => d.material?.tipo_de_material?.id_tipo_de_material !== 3)
      .reduce((sum, d) => sum + Number(d.volumen_real_m3 || 0), 0);

    // Usar el costo_total que viene de la BD, convertir a número
    const costoTotal = vale.vale_material_detalles.reduce(
      (sum, d) => sum + Number(d.costo_total || 0),
      0
    );

    return { totalM3Tipo3, totalM3Otros, costoTotal };
  };

  /**
   * Calcular totales de renta basado en es_renta_por_dia
   * @param {object} vale - Vale de tipo renta
   * @returns {object} Totales de horas, días y costo
   */
  const calcularTotalesRenta = (vale) => {
    if (!vale.vale_renta_detalle) {
      return {
        totalHorasPorHora: 0,
        totalDiasPorDia: 0,
        costoTotal: 0,
        tieneRentaPorDia: false,
        tieneRentaPorHora: false,
      };
    }

    let totalHorasPorHora = 0;
    let totalDiasPorDia = 0;
    let costoTotal = 0;
    let tieneRentaPorDia = false;
    let tieneRentaPorHora = false;

    vale.vale_renta_detalle.forEach((detalle) => {
      const esRentaPorDia = detalle.es_renta_por_dia === true;

      if (esRentaPorDia) {
        totalDiasPorDia += Number(detalle.total_dias || 0);
        tieneRentaPorDia = true;
      } else {
        totalHorasPorHora += Number(detalle.total_horas || 0);
        tieneRentaPorHora = true;
      }

      costoTotal += Number(detalle.costo_total || 0);
    });

    return {
      totalHorasPorHora,
      totalDiasPorDia,
      costoTotal,
      tieneRentaPorDia,
      tieneRentaPorHora,
    };
  };

  /**
   * Obtener resumen de un vale
   * @param {object} vale - Vale completo
   * @returns {object} Resumen con información clave
   */
  const obtenerResumenVale = (vale) => {
    const resumen = {
      folio: vale.folio,
      tipo: vale.tipo_vale,
      estado: vale.estado,
      obra: vale.obras?.obra,
      empresa: vale.obras?.empresas?.empresa,
      operador: vale.operadores?.nombre_completo,
      fecha: vale.fecha_creacion,
      total: calcularPrecioTotal(vale),
    };

    if (vale.tipo_vale === "material") {
      const { totalM3Tipo3, totalM3Otros } = calcularTotalesMaterial(vale);
      resumen.totalM3Tipo3 = totalM3Tipo3;
      resumen.totalM3Otros = totalM3Otros;
    }

    if (vale.tipo_vale === "renta") {
      const { totalHorasPorHora, totalDiasPorDia, tieneRentaPorDia } =
        calcularTotalesRenta(vale);
      resumen.totalHoras = totalHorasPorHora;
      resumen.totalDias = totalDiasPorDia;
      resumen.tieneRentaPorDia = tieneRentaPorDia;
    }

    return resumen;
  };

  /**
   * Agrupar vales por criterio
   * @param {array} vales - Array de vales
   * @param {string} criterio - 'obra', 'tipo', 'estado', 'fecha'
   * @returns {object} Vales agrupados
   */
  const agruparVales = (vales, criterio) => {
    return vales.reduce((grupos, vale) => {
      let key;

      switch (criterio) {
        case "obra":
          key = vale.obras?.obra || "Sin obra";
          break;
        case "tipo":
          key = vale.tipo_vale;
          break;
        case "estado":
          key = vale.estado;
          break;
        case "fecha":
          key = new Date(vale.fecha_creacion).toLocaleDateString("es-MX");
          break;
        default:
          key = "otros";
      }

      if (!grupos[key]) {
        grupos[key] = [];
      }
      grupos[key].push(vale);

      return grupos;
    }, {});
  };

  /**
   * Calcular estadísticas de vales
   * @param {array} vales - Array de vales
   * @returns {object} Estadísticas
   */
  const calcularEstadisticas = (vales) => {
    const stats = {
      total: vales.length,
      porTipo: {},
      porEstado: {},
      costoTotal: 0,
    };

    vales.forEach((vale) => {
      // Contar por tipo
      stats.porTipo[vale.tipo_vale] = (stats.porTipo[vale.tipo_vale] || 0) + 1;

      // Contar por estado
      stats.porEstado[vale.estado] = (stats.porEstado[vale.estado] || 0) + 1;

      // Sumar costo total
      stats.costoTotal += calcularPrecioTotal(vale);
    });

    return stats;
  };

  return {
    calcularPrecioTotal,
    calcularTotalesMaterial,
    calcularTotalesRenta,
    obtenerResumenVale,
    agruparVales,
    calcularEstadisticas,
  };
};
