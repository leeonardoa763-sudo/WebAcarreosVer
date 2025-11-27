/**
 * src/hooks/conciliaciones/useConciliacionesHelpers.js
 *
 * Funciones auxiliares para conciliaciones
 *
 * Funcionalidades:
 * - Agrupar vales por placas
 * - Calcular totales generales
 * - Formatear datos para exportación
 * - Validaciones
 *
 * Usado en: useConciliaciones.js
 */

/**
 * Hook para funciones auxiliares de conciliaciones
 */
export const useConciliacionesHelpers = () => {
  /**
   * Agrupar vales de renta por placas
   */
  const agruparValesPorPlacas = (vales) => {
    const grupos = {};

    vales.forEach((vale) => {
      const placas = vale.vehiculos?.placas || "SIN PLACAS";

      if (!grupos[placas]) {
        grupos[placas] = {
          placas,
          vales: [],
          totalDias: 0,
          totalHoras: 0,
          subtotal: 0,
        };
      }

      // Procesar cada detalle de renta
      vale.vale_renta_detalle.forEach((detalle) => {
        const dias = Number(detalle.total_dias || 0);
        const horas = Number(detalle.total_horas || 0);
        const costo = Number(detalle.costo_total || 0);

        grupos[placas].totalDias += dias;
        grupos[placas].totalHoras += horas;
        grupos[placas].subtotal += costo;
      });

      grupos[placas].vales.push(vale);
    });

    return grupos;
  };

  /**
   * Calcular totales generales de la conciliación
   */
  const calcularTotalesGenerales = (gruposPorPlacas) => {
    let subtotal = 0;
    let totalDias = 0;
    let totalHoras = 0;

    Object.values(gruposPorPlacas).forEach((grupo) => {
      subtotal += grupo.subtotal;
      totalDias += grupo.totalDias;
      totalHoras += grupo.totalHoras;
    });

    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      iva: Number(iva.toFixed(2)),
      total: Number(total.toFixed(2)),
      totalDias,
      totalHoras: Number(totalHoras.toFixed(2)),
    };
  };

  /**
   * Validar que hay vales disponibles para conciliación
   */
  const validarValesDisponibles = (vales) => {
    console.log("DEBUG validarValesDisponibles - Input:", vales);
    console.log("DEBUG - Cantidad de vales:", vales?.length);

    if (!vales || vales.length === 0) {
      return {
        valid: false,
        error: "No hay vales verificados disponibles para esta selección",
      };
    }

    // Validar que todos los vales tengan detalles de renta
    const sinDetalles = vales.filter(
      (v) => !v.vale_renta_detalle || v.vale_renta_detalle.length === 0
    );

    if (sinDetalles.length > 0) {
      return {
        valid: false,
        error: `${sinDetalles.length} vale(s) sin detalles de renta`,
      };
    }

    // Validar que todos los vales tengan costo calculado
    const sinCosto = vales.filter((v) =>
      v.vale_renta_detalle.some((d) => !d.costo_total || d.costo_total === 0)
    );

    if (sinCosto.length > 0) {
      return {
        valid: false,
        error: `${sinCosto.length} vale(s) sin costo calculado`,
      };
    }

    return { valid: true };
  };

  /**
   * Preparar datos para guardar conciliación
   */
  const prepararDatosConciliacion = (
    vales,
    totales,
    filtros,
    idSindicato,
    idPersona
  ) => {
    const obra = vales[0]?.obras;

    return {
      tipo_conciliacion: "renta",
      id_obra: filtros.obraSeleccionada,
      id_sindicato: idSindicato,
      id_empresa: obra?.empresas?.id_empresa,
      numero_semana: filtros.semanaSeleccionada.numero,
      año: filtros.semanaSeleccionada.año,
      fecha_inicio: filtros.semanaSeleccionada.fechaInicio,
      fecha_fin: filtros.semanaSeleccionada.fechaFin,
      subtotal: totales.subtotal,
      iva_16_porciento: totales.iva,
      total_final: totales.total,
      total_dias: totales.totalDias,
      total_horas: totales.totalHoras,
      generado_por: idPersona,
      estado: "generada",
    };
  };

  /**
   * Formatear datos para tabla de vista previa
   */
  const formatearParaTabla = (gruposPorPlacas) => {
    return Object.values(gruposPorPlacas).map((grupo) => ({
      ...grupo,
      vales: grupo.vales.map((vale) => ({
        ...vale,
        detallesFormateados: vale.vale_renta_detalle.map((detalle) => ({
          material: detalle.material?.material || "N/A",
          capacidad: detalle.capacidad_m3,
          viajes: detalle.numero_viajes,
          dias: detalle.total_dias || 0,
          horas: detalle.total_horas || 0,
          costo: detalle.costo_total,
          esRentaPorDia: detalle.es_renta_por_dia,
        })),
      })),
    }));
  };

  /**
   * Calcular precio unitario para turnos y horas
   */
  const calcularPreciosUnitarios = (totales, totalDias, totalHoras) => {
    let precioTurno = 0;
    let precioHora = 0;

    if (totalDias > 0) {
      precioTurno = totales.subtotal / totalDias;
    }

    if (totalHoras > 0) {
      precioHora = totales.subtotal / totalHoras;
    }

    return {
      precioTurno: Number(precioTurno.toFixed(2)),
      precioHora: Number(precioHora.toFixed(2)),
    };
  };

  /**
   * Obtener rango de fechas formateado para mostrar
   */
  const formatearRangoSemana = (semana) => {
    const inicio = new Date(semana.fechaInicio);
    const fin = new Date(semana.fechaFin);

    const meses = [
      "ene",
      "feb",
      "mar",
      "abr",
      "may",
      "jun",
      "jul",
      "ago",
      "sep",
      "oct",
      "nov",
      "dic",
    ];

    const diaInicio = inicio.getDate();
    const diaFin = fin.getDate();
    const mesInicio = meses[inicio.getMonth()];
    const mesFin = meses[fin.getMonth()];

    if (mesInicio === mesFin) {
      return `${diaInicio}-${diaFin} ${mesInicio}`;
    }

    return `${diaInicio} ${mesInicio} - ${diaFin} ${mesFin}`;
  };

  return {
    agruparValesPorPlacas,
    calcularTotalesGenerales,
    validarValesDisponibles,
    prepararDatosConciliacion,
    formatearParaTabla,
    calcularPreciosUnitarios,
    formatearRangoSemana,
  };
};
