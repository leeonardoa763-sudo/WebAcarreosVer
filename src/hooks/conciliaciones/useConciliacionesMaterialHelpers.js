/**
 * src/hooks/conciliaciones/useConciliacionesMaterialHelpers.js
 *
 * Funciones auxiliares para conciliaciones de material
 *
 * Funcionalidades:
 * - Agrupar vales por placas
 * - Calcular totales generales (incluye retención 4%)
 * - Formatear datos para exportación
 * - Validaciones específicas de material
 *
 * Usado en: useConciliacionesMaterial.js
 */

/**
 * Hook para funciones auxiliares de conciliaciones de material
 */
export const useConciliacionesMaterialHelpers = () => {
  /**
   * Agrupar vales de material por placas
   * Agrupa por tipo de material para facilitar renderizado
   */
  const agruparValesPorPlacas = (vales) => {
    console.log(
      "[useConciliacionesMaterialHelpers] Total vales a agrupar:",
      vales.length
    );

    const grupos = {};

    vales.forEach((vale) => {
      const placas = vale.vehiculos?.placas || "SIN PLACAS";

      if (!grupos[placas]) {
        grupos[placas] = {
          placas,
          vales: [],
          subtotal: 0,
          // Totales por tipo de material
          totalesTipo1: {
            totalM3: 0,
            totalToneladas: 0,
            totalViajes: 0,
          },
          totalesTipo2: {
            totalM3: 0,
            totalToneladas: 0,
            totalViajes: 0,
          },
          totalesTipo3: {
            totalM3: 0,
            totalViajes: 0,
          },
        };
      }

      // Procesar cada detalle de material
      vale.vale_material_detalles.forEach((detalle) => {
        const idTipo = detalle.material?.tipo_de_material?.id_tipo_de_material;
        const costo = Number(detalle.costo_total || 0);

        grupos[placas].subtotal += costo;

        // Sumar totales según tipo de material
        if (idTipo === 1) {
          grupos[placas].totalesTipo1.totalM3 += Number(
            detalle.volumen_real_m3 || 0
          );
          grupos[placas].totalesTipo1.totalToneladas += Number(
            detalle.peso_ton || 0
          );
          grupos[placas].totalesTipo1.totalViajes += 1; // 1 viaje por vale
        } else if (idTipo === 2) {
          grupos[placas].totalesTipo2.totalM3 += Number(
            detalle.volumen_real_m3 || 0
          );
          grupos[placas].totalesTipo2.totalToneladas += Number(
            detalle.peso_ton || 0
          );
          grupos[placas].totalesTipo2.totalViajes += 1;
        } else if (idTipo === 3) {
          grupos[placas].totalesTipo3.totalM3 += Number(
            detalle.cantidad_pedida_m3 || 0
          );
          grupos[placas].totalesTipo3.totalViajes += 1;
        }
      });

      grupos[placas].vales.push(vale);
    });

    console.log(
      "[useConciliacionesMaterialHelpers] Grupos de placas creados:",
      Object.keys(grupos).length
    );

    return grupos;
  };

  /**
   * Calcular totales generales de la conciliación
   * IMPORTANTE: Incluye retención 4%
   * Fórmula: Total = (Subtotal + IVA) - Retención
   */
  const calcularTotalesGenerales = (gruposPorPlacas) => {
    let subtotal = 0;
    let totalViajesTipo1 = 0;
    let totalViajesTipo2 = 0;
    let totalViajesTipo3 = 0;
    let totalM3Tipo1 = 0;
    let totalM3Tipo2 = 0;
    let totalM3Tipo3 = 0;
    let totalToneladasTipo1 = 0;
    let totalToneladasTipo2 = 0;

    Object.values(gruposPorPlacas).forEach((grupo) => {
      subtotal += grupo.subtotal;

      // Sumar totales por tipo
      totalViajesTipo1 += grupo.totalesTipo1.totalViajes;
      totalViajesTipo2 += grupo.totalesTipo2.totalViajes;
      totalViajesTipo3 += grupo.totalesTipo3.totalViajes;

      totalM3Tipo1 += grupo.totalesTipo1.totalM3;
      totalM3Tipo2 += grupo.totalesTipo2.totalM3;
      totalM3Tipo3 += grupo.totalesTipo3.totalM3;

      totalToneladasTipo1 += grupo.totalesTipo1.totalToneladas;
      totalToneladasTipo2 += grupo.totalesTipo2.totalToneladas;
    });

    const subtotalFinal = Number(subtotal.toFixed(2));
    const iva = Number((subtotalFinal * 0.16).toFixed(2));
    const retencion = Number((subtotalFinal * 0.04).toFixed(2));
    const total = subtotalFinal + iva - retencion;

    const totales = {
      subtotal: subtotalFinal,
      iva,
      retencion,
      total: Number(total.toFixed(2)),
      // Totales por tipo
      totalViajesTipo1,
      totalViajesTipo2,
      totalViajesTipo3,
      totalM3Tipo1: Number(totalM3Tipo1.toFixed(2)),
      totalM3Tipo2: Number(totalM3Tipo2.toFixed(2)),
      totalM3Tipo3: Number(totalM3Tipo3.toFixed(2)),
      totalToneladasTipo1: Number(totalToneladasTipo1.toFixed(2)),
      totalToneladasTipo2: Number(totalToneladasTipo2.toFixed(2)),
    };

    return totales;
  };

  /**
   * Validar que hay vales disponibles para conciliación
   */
  const validarValesDisponibles = (vales) => {
    if (!vales || vales.length === 0) {
      return {
        valid: false,
        error: "No hay vales verificados disponibles para esta selección",
      };
    }

    // Validar que todos los vales tengan detalles de material
    const sinDetalles = vales.filter(
      (v) => !v.vale_material_detalles || v.vale_material_detalles.length === 0
    );

    if (sinDetalles.length > 0) {
      return {
        valid: false,
        error: `${sinDetalles.length} vale(s) sin detalles de material`,
      };
    }

    // Validar que todos los vales tengan costo calculado
    const sinCosto = vales.filter((v) =>
      v.vale_material_detalles.some(
        (d) => !d.costo_total || d.costo_total === 0
      )
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
   * Preparar datos para guardar conciliación de material
   */
  /**
   * Preparar datos para guardar conciliación de material
   */
  const prepararDatosConciliacion = (
    vales,
    totales,
    filtros,
    idSindicato,
    idPersona
  ) => {
    console.log(
      "[useConciliacionesMaterialHelpers] prepararDatosConciliacion - Inicio"
    );

    const obra = vales[0]?.obras;

    // Obtener información del material
    const primerDetalle = vales[0]?.vale_material_detalles?.[0];
    const material = primerDetalle?.material;

    return {
      tipo_conciliacion: "material",
      id_obra: filtros.obraSeleccionada,
      id_sindicato: idSindicato,
      id_empresa: obra?.empresas?.id_empresa,
      numero_semana: filtros.semanaSeleccionada.numero,
      año: filtros.semanaSeleccionada.año,
      fecha_inicio: filtros.semanaSeleccionada.fechaInicio,
      fecha_fin: filtros.semanaSeleccionada.fechaFin,
      subtotal: totales.subtotal,
      iva_16_porciento: totales.iva,
      retencion_4_porciento: totales.retencion,
      total_final: totales.total,
      generado_por: idPersona,
      estado: "generada",
    };
  };

  /**
   * Formatear datos para tabla de vista previa
   * Organiza por tipo de material para renderizado correcto
   */
  const formatearParaTabla = (gruposPorPlacas) => {
    return Object.values(gruposPorPlacas).map((grupo) => ({
      ...grupo,
      vales: grupo.vales.map((vale) => ({
        ...vale,
        detallesFormateados: vale.vale_material_detalles.map((detalle) => {
          const idTipo =
            detalle.material?.tipo_de_material?.id_tipo_de_material;

          return {
            idTipo,
            material: detalle.material?.material || "N/A",
            banco: detalle.bancos?.banco || "N/A",
            folioBanco: detalle.folio_banco || "N/A",
            capacidad: detalle.capacidad_m3,
            distancia: detalle.distancia_km,
            viajes: 1, // Siempre 1 viaje por vale
            volumenReal: detalle.volumen_real_m3,
            toneladas: detalle.peso_ton,
            cantidadPedida: detalle.cantidad_pedida_m3,
            costo: detalle.costo_total,
          };
        }),
      })),
    }));
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
    formatearRangoSemana,
  };
};
