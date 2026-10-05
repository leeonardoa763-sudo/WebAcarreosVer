/**
 * src/utils/volumenFacturado.js
 *
 * m³ que se facturó de un detalle de material (Tipo 1 y 2). En un viaje de
 * ajuste se cobró capacidad_m3, no el volumen real entregado; para que
 * Total m³ y Precio/m³ de una conciliación sigan cuadrando con la tarifa, ese
 * es el volumen que se suma. volumen_real_m3 / volumen_m3 nunca se tocan — son
 * la cantidad que se reporta a obra.
 *
 * El flag vive en dos niveles: el detalle (Tipo 2, 1 vale = 1 carga) y cada
 * viaje (Tipo 1, varios viajes por vale).
 *
 * Dependencias: ninguna
 * Usado en: useConciliacionesMaterialHelpers.js, ModalVistaPreviewConciliacion.jsx
 */

/** m³ facturados de un viaje: capacidad del detalle si es viaje de ajuste. */
export const volumenFacturadoViaje = (viaje, detalle) =>
  viaje.es_viaje_ajuste
    ? Number(detalle.capacidad_m3 ?? viaje.volumen_m3 ?? 0)
    : Number(viaje.volumen_m3 || 0);

export const volumenFacturado = (detalle) => {
  if (detalle.es_viaje_ajuste) {
    return Number(detalle.capacidad_m3 ?? detalle.volumen_real_m3 ?? 0);
  }
  const viajes = detalle.vale_material_viajes || [];
  if (viajes.some((v) => v.es_viaje_ajuste)) {
    return viajes.reduce((acc, v) => acc + volumenFacturadoViaje(v, detalle), 0);
  }
  return Number(detalle.volumen_real_m3 || 0);
};
