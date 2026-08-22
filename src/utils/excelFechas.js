/**
 * src/utils/excelFechas.js
 *
 * Convierte fechas y horas al número de serie que Excel entiende como fecha
 * u hora real (no como texto), más los formatos de celda que las muestran en
 * dd/mm/yyyy y hh:mm. Una cadena "2026-08-20" llega a Excel como texto y no
 * se puede ordenar, filtrar ni restar; el número de serie sí.
 *
 * Dependencias: ninguna
 * Usado en: exportToExcel.js (mapa `formatos`), exportarValesExcel.js
 */

// Formatos de celda (numFmt) que se pasan a exportToExcel en `formatos`.
export const FMT_FECHA = "dd/mm/yyyy";
export const FMT_FECHA_HORA = "dd/mm/yyyy hh:mm";
export const FMT_HORA = "hh:mm";

const TZ = "America/Mexico_City";

// Serie de Excel = días desde 1899-12-30. 25569 = 1970-01-01 (época de JS).
const serieDeFecha = (anio, mes, dia) =>
  Date.UTC(anio, mes - 1, dia) / 86400000 + 25569;

// Excel guarda la hora como fracción del día: 12:00 = 0.5.
const fraccionDelDia = (horas, minutos, segundos) =>
  (horas * 3600 + minutos * 60 + segundos) / 86400;

// timestamptz → componentes de calendario en hora de México. Sin esto, un
// viaje registrado a las 19:00 del día 20 (UTC-6) se leería como 01:00 del
// día 21. Mismo criterio que getFechaLocalMx en los hooks.
const formatterMx = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const desglosarMx = (timestamp) => {
  if (!timestamp) return null;
  const fecha = new Date(timestamp);
  if (Number.isNaN(fecha.getTime())) return null;
  const partes = {};
  for (const { type, value } of formatterMx.formatToParts(fecha)) {
    if (type !== "literal") partes[type] = Number(value);
  }
  return partes;
};

/**
 * Fecha (sin hora) como serie de Excel. Acepta una columna DATE ya en formato
 * "YYYY-MM-DD" —que se toma literal, sin conversión de zona— o un timestamptz,
 * del que se toma el día calendario de México.
 *
 * @returns {number|string} serie de Excel, o "" si no hay dato
 */
export const fechaExcel = (valor) => {
  if (!valor) return "";
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor));
  if (soloFecha) {
    return serieDeFecha(+soloFecha[1], +soloFecha[2], +soloFecha[3]);
  }
  const p = desglosarMx(valor);
  return p ? serieDeFecha(p.year, p.month, p.day) : "";
};

/**
 * timestamptz → serie de Excel con fecha y hora (hora de México).
 *
 * @returns {number|string} serie de Excel, o "" si no hay dato
 */
export const fechaHoraExcel = (timestamp) => {
  const p = desglosarMx(timestamp);
  if (!p) return "";
  return (
    serieDeFecha(p.year, p.month, p.day) +
    fraccionDelDia(p.hour, p.minute, p.second)
  );
};

/**
 * timestamptz → solo la hora del día como fracción (hora de México), para
 * mostrarse con FMT_HORA. Se separa de la fecha porque la hora de registro se
 * lee y se filtra por sí sola (turnos, horas pico).
 *
 * @returns {number|string} fracción del día, o "" si no hay dato
 */
export const horaExcel = (timestamp) => {
  const p = desglosarMx(timestamp);
  if (!p) return "";
  return fraccionDelDia(p.hour, p.minute, p.second);
};
