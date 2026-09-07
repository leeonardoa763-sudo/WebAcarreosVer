/**
 * src/utils/rentaMaterial.js
 *
 * Resuelve el material, banco y carga real de cada viaje de renta.
 * Pipas de agua: el operador puede cambiar de material entre viajes; ese dato
 * vive en `tickets_descarga` (numero_ticket = numero_viaje), no en el material
 * único de `vale_renta_detalle`.
 * Renta normal (4 rubros): cada fila de `vale_renta_viajes` trae su propio
 * `id_material`/`banco_descarga`/`carga_porcentaje` — `tickets_descarga` no se
 * usa para estos vales, así que el ticketsMap siempre viene vacío y el
 * fallback a `viaje.material`/`viaje.banco_descarga` es el que resuelve.
 * Dependencias: ninguna
 * Usado en: DetallesRenta.jsx, ModalValeDetalle.jsx, VisualizarConciliacion.jsx,
 * useOperadoresHelpers.js, exportarValesExcel.js, useDashboardUnificado.js
 */

// Construye Map(numero_ticket -> nombre de material) desde los tickets_descarga de un vale.
export const buildTicketsMaterialMap = (ticketsDescarga = []) => {
  const map = new Map();
  (ticketsDescarga || []).forEach((ticket) => {
    const nombre = ticket?.material_ticket?.material;
    if (ticket?.numero_ticket != null && nombre) {
      map.set(Number(ticket.numero_ticket), nombre);
    }
  });
  return map;
};

// Material de un viaje: ticket por numero_viaje (pipas), con fallback al
// material propio del viaje (renta normal) y luego al material del detalle.
export const materialDeViaje = (ticketsMap, viaje, materialDetalle) =>
  ticketsMap?.get(Number(viaje?.numero_viaje)) ??
  viaje?.material?.material ??
  materialDetalle ??
  "—";

// Construye Map(numero_ticket -> banco_descarga) desde los tickets_descarga de un vale.
export const buildTicketsBancoMap = (ticketsDescarga = []) => {
  const map = new Map();
  (ticketsDescarga || []).forEach((ticket) => {
    const banco = ticket?.banco_descarga;
    if (ticket?.numero_ticket != null && banco) {
      map.set(Number(ticket.numero_ticket), banco);
    }
  });
  return map;
};

// Banco de descarga de un viaje: ticket por numero_viaje (pipas), con
// fallback al banco propio del viaje (renta normal).
export const bancoDeViaje = (ticketsBancoMap, viaje) =>
  ticketsBancoMap?.get(Number(viaje?.numero_viaje)) ??
  viaje?.banco_descarga ??
  "—";

// Carga aproximada declarada por el checador en el viaje (renta normal only).
export const cargaDeViaje = (viaje) =>
  viaje?.carga_porcentaje ? `${viaje.carga_porcentaje}%` : "—";

// Label de material a nivel vale/detalle (headers, PDF, exports): pipas
// siguen con material fijo; renta normal ya no tiene uno, se muestra su
// categoría planeada (orientativa, declarada al crear el vale).
export const materialLabelDetalle = (detalle) =>
  detalle?.material?.material || detalle?.categoria_planeada?.categoria || "—";
