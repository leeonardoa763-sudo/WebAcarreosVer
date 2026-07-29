/**
 * src/utils/rentaMaterial.js
 *
 * Resuelve el material real de cada viaje de renta.
 * En renta el operador puede cambiar de material entre viajes: el material por
 * viaje vive en `tickets_descarga` (numero_ticket = numero_viaje), no en el
 * material único de `vale_renta_detalle`.
 * Dependencias: ninguna
 * Usado en: DetallesRenta.jsx, ModalValeDetalle.jsx, VisualizarConciliacion.jsx
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

// Material de un viaje: ticket por numero_viaje, con fallback al material del detalle.
export const materialDeViaje = (ticketsMap, viaje, materialDetalle) =>
  ticketsMap?.get(Number(viaje?.numero_viaje)) || materialDetalle || "—";

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

// Banco de descarga de un viaje: ticket por numero_viaje (sin fallback, ya que
// el banco de descarga solo existe cuando se registró el ticket).
export const bancoDeViaje = (ticketsBancoMap, viaje) =>
  ticketsBancoMap?.get(Number(viaje?.numero_viaje)) || "—";
