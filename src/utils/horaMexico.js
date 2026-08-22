/**
 * src/utils/horaMexico.js
 *
 * Convierte entre un <input type="time"> (hora de México, "HH:mm") y el
 * timestamptz que guarda la BD.
 *
 * `hora_registro` es timestamptz: la app móvil lo escribe con
 * `new Date().toISOString()`, o sea un instante con zona explícita. Una cadena
 * sin offset —"2026-08-22T08:00:00"— no es un instante: Postgres la interpreta
 * en la zona de la sesión (UTC), así que capturar las 08:00 guardaba las 08:00Z
 * y la tabla la volvía a mostrar en hora de México como las 02:00. Por eso el
 * offset va siempre explícito.
 *
 * Dependencias: ninguna
 * Usado en: TablaEditarViajes.jsx, TablaEditarViajesRenta.jsx
 */

const TZ = "America/Mexico_City";

const partesMx = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const desglosar = (instante) => {
  const partes = {};
  for (const { type, value } of partesMx.formatToParts(instante)) {
    if (type !== "literal") partes[type] = Number(value);
  }
  return partes;
};

const dosDigitos = (n) => String(n).padStart(2, "0");

/**
 * Offset de México en ese instante, como "-06:00".
 *
 * Se mide comparando la hora de México contra la UTC en vez de fijar -06:00,
 * para que la conversión siga siendo correcta si cambian las reglas de la zona.
 */
const offsetMx = (instante) => {
  const p = desglosar(instante);
  const comoUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Redondeado al minuto: el desfase se pierde en los milisegundos del instante.
  const minutos = Math.round((comoUTC - instante.getTime()) / 60000);
  const signo = minutos < 0 ? "-" : "+";
  const abs = Math.abs(minutos);
  return `${signo}${dosDigitos(Math.floor(abs / 60))}:${dosDigitos(abs % 60)}`;
};

/**
 * timestamptz → "HH:mm" en hora de México, para el value de un input time.
 *
 * @param {string|null} horaISO - timestamptz de la BD
 * @returns {string} "HH:mm", o "" si no hay dato o es inválido
 */
export const horaInputDesdeISO = (horaISO) => {
  if (!horaISO) return "";
  const instante = new Date(horaISO);
  if (Number.isNaN(instante.getTime())) return "";
  const p = desglosar(instante);
  return `${dosDigitos(p.hour)}:${dosDigitos(p.minute)}`;
};

/**
 * "HH:mm" de un input time → timestamptz con offset explícito.
 *
 * El día se conserva del viaje que se está editando; solo cambia la hora. Para
 * un viaje nuevo se usa el día de hoy en México.
 *
 * @param {string} timeValue - "HH:mm" del input
 * @param {string|null} isoExistente - timestamptz actual del viaje, si tiene
 * @returns {string|null} "YYYY-MM-DDTHH:mm:00-06:00", o null si no hay hora
 */
export const isoDesdeHoraInput = (timeValue, isoExistente) => {
  if (!timeValue) return null;

  const base = isoExistente ? new Date(isoExistente) : new Date();
  const instante = Number.isNaN(base.getTime()) ? new Date() : base;

  const p = desglosar(instante);
  const fecha = `${p.year}-${dosDigitos(p.month)}-${dosDigitos(p.day)}`;

  return `${fecha}T${timeValue}:00${offsetMx(instante)}`;
};
