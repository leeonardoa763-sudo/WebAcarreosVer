/**
 * src/utils/conciliaciones/calcularTotalesPorBanco.js
 *
 * Desglosa los totales de una conciliación de Material Pétreo (Tipo 1 y 2)
 * por banco, ya que una misma conciliación puede combinar viajes de bancos
 * distintos (cada uno con su propio precio/m³ y peso específico).
 *
 * Usado en: PDFConciliacionMaterialPetreo.jsx, VisualizarConciliacion.jsx
 */

const nombreBancoViaje = (viaje, detalle) => {
  if (viaje.id_banco_override != null) {
    return (
      viaje.banco_override?.banco ||
      viaje.bancos_override?.banco ||
      "N/A"
    );
  }
  return detalle.bancos?.banco || "N/A";
};

/**
 * @param {Array} vales - Vales de material (con vale_material_detalles anidados;
 *   cada detalle/viaje debe traer embebido `precios_material:id_precios_material (...)`)
 * @returns {Array<{banco, viajes, m3, toneladas, importe, pu, pesoEspecifico, distanciaKmProm, tarifas}>}
 *
 * Nota: `tarifas` son las filas de la tabla precios_material realmente usadas
 * en los viajes de ese banco (primer_km, km_sub_int1, límites, etc.) — se leen
 * tal cual de esa tabla, no se recalculan ni se promedian.
 */
export const calcularTotalesPorBanco = (vales) => {
  const bancos = {};

  (vales || []).forEach((vale) => {
    (vale.vale_material_detalles || []).forEach((detalle) => {
      const idTipo = detalle.material?.tipo_de_material?.id_tipo_de_material;
      if (idTipo !== 1 && idTipo !== 2) return;

      const viajes = detalle.vale_material_viajes || [];

      const registros =
        viajes.length > 0
          ? viajes.map((viaje) => {
              const precioEfectivo =
                viaje.precio_m3_override != null
                  ? Number(viaje.precio_m3_override)
                  : Number(detalle.precio_m3 || 0);
              const m3 = Number(viaje.volumen_m3 ?? detalle.volumen_real_m3 ?? 0);
              const distanciaKm = Number(
                viaje.distancia_km_override ?? detalle.distancia_km ?? 0
              );

              return {
                banco: nombreBancoViaje(viaje, detalle),
                m3,
                toneladas: Number(viaje.peso_ton ?? detalle.peso_ton ?? 0),
                importe:
                  viaje.costo_viaje_override != null
                    ? Number(viaje.costo_viaje_override)
                    : m3 * precioEfectivo,
                distanciaKm,
                tarifa: viaje.precios_material ?? detalle.precios_material ?? null,
              };
            })
          : [
              {
                banco: detalle.bancos?.banco || "N/A",
                m3: Number(detalle.volumen_real_m3 || 0),
                toneladas: Number(detalle.peso_ton || 0),
                importe: Number(detalle.costo_total || 0),
                distanciaKm: Number(detalle.distancia_km || 0),
                tarifa: detalle.precios_material ?? null,
              },
            ];

      registros.forEach(
        ({ banco, m3, toneladas, importe, distanciaKm, tarifa }) => {
          if (!bancos[banco]) {
            bancos[banco] = {
              banco,
              viajes: 0,
              m3: 0,
              toneladas: 0,
              importe: 0,
              sumaDistancias: 0,
              tarifasMap: new Map(),
            };
          }
          bancos[banco].viajes += 1;
          bancos[banco].m3 += m3;
          bancos[banco].toneladas += toneladas;
          bancos[banco].importe += importe;
          bancos[banco].sumaDistancias += distanciaKm;
          if (tarifa?.id_precios_material != null) {
            bancos[banco].tarifasMap.set(tarifa.id_precios_material, tarifa);
          }
        }
      );
    });
  });

  return Object.values(bancos)
    .map((b) => ({
      ...b,
      pu: b.m3 > 0 ? b.importe / b.m3 : 0,
      // peso_especifico = ton / m3 (misma fórmula usada al registrar el viaje)
      pesoEspecifico: b.m3 > 0 ? b.toneladas / b.m3 : 0,
      // distancia real promedio recorrida para ese banco (dato del viaje, no de la tarifa)
      distanciaKmProm: b.viajes > 0 ? b.sumaDistancias / b.viajes : 0,
      tarifas: Array.from(b.tarifasMap.values()),
    }))
    .sort((a, b) => a.banco.localeCompare(b.banco));
};
