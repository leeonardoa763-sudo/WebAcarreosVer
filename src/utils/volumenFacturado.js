/**
 * src/utils/volumenFacturado.js
 *
 * m³ que se facturó de un detalle de material (Tipo 1 y 2). En un viaje de
 * ajuste se cobró la capacidad del camión, no el volumen real entregado; para
 * que Total m³ y Precio/m³ de una conciliación sigan cuadrando con la tarifa,
 * ese es el volumen que se suma. volumen_real_m3 / volumen_m3 nunca se tocan —
 * son la cantidad que se reporta a obra.
 *
 * El flag vive en dos niveles: el detalle (Tipo 2, 1 vale = 1 carga) y cada
 * viaje (Tipo 1, varios viajes por vale).
 *
 * La capacidad sale de detalle.capacidad_m3; algunos detalles la traen en null,
 * así que se cae a la del vehículo del vale (vale.vehiculos.capacidad_m3).
 *
 * Dependencias: ninguna
 * Usado en: useConciliacionesMaterialHelpers.js, ModalVistaPreviewConciliacion.jsx,
 *           TablaConciliacionMaterial.jsx, PDFConciliacionMaterialPetreo.jsx,
 *           calcularTotalesPorBanco.js
 */

/** Capacidad cobrable: la del detalle, o la del vehículo si el detalle no la trae. */
export const capacidadCobrable = (detalle, capacidadVehiculo) => {
  const delDetalle = Number(detalle?.capacidad_m3);
  if (delDetalle > 0) return delDetalle;
  const delVehiculo = Number(capacidadVehiculo);
  return delVehiculo > 0 ? delVehiculo : null;
};

/** m³ facturados de un viaje: capacidad si es viaje de ajuste y se conoce. */
export const volumenFacturadoViaje = (viaje, detalle, capacidadVehiculo) => {
  const capacidad = viaje.es_viaje_ajuste
    ? capacidadCobrable(detalle, capacidadVehiculo)
    : null;
  return capacidad ?? Number(viaje.volumen_m3 || 0);
};

export const volumenFacturado = (detalle, capacidadVehiculo) => {
  if (detalle.es_viaje_ajuste) {
    return (
      capacidadCobrable(detalle, capacidadVehiculo) ??
      Number(detalle.volumen_real_m3 || 0)
    );
  }
  const viajes = detalle.vale_material_viajes || [];
  if (viajes.some((v) => v.es_viaje_ajuste)) {
    return viajes.reduce(
      (acc, v) => acc + volumenFacturadoViaje(v, detalle, capacidadVehiculo),
      0,
    );
  }
  return Number(detalle.volumen_real_m3 || 0);
};
