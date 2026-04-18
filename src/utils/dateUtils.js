/**
 * src/utils/dateUtils.js
 *
 * Utilidades para manejo de fechas y semanas ISO
 *
 * Usado en:
 * - useConciliacionesQueries.js
 * - useConciliacionesMaterialQueries.js
 */

/**
 * Calcular semana ISO 8601 a partir de una fecha
 * Las semanas van de LUNES a DOMINGO
 */
export const calcularSemanaISO = (fecha) => {
  const date = new Date(fecha);

  const dia = date.getDay();

  // Si es domingo (0), retroceder 6 días para llegar al lunes de esa semana
  // Si es lunes (1), retroceder 0 días
  // Si es martes (2), retroceder 1 día, etc.
  const diff = dia === 0 ? -6 : 1 - dia;

  const lunes = new Date(date);
  lunes.setDate(date.getDate() + diff);
  lunes.setHours(0, 0, 0, 0);

  // Obtener el domingo de esta semana (lunes + 6 días)
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  domingo.setHours(23, 59, 59, 999);

  // Calcular número de semana ISO
  const primerDiaAno = new Date(lunes.getFullYear(), 0, 1);
  const diasTranscurridos = Math.floor(
    (lunes - primerDiaAno) / (24 * 60 * 60 * 1000),
  );
  const numeroSemana = Math.ceil(
    (diasTranscurridos + primerDiaAno.getDay() + 1) / 7,
  );

  const formatFecha = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    numero: numeroSemana,
    año: lunes.getFullYear(),
    fechaInicio: formatFecha(lunes),
    fechaFin: formatFecha(domingo),
  };
};

/**
 * Obtener nombre del día de la semana
 */
const getDiaTexto = (dia) => {
  const dias = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  return dias[dia];
};

/**
 * Verificar si una fecha está dentro del rango de una semana
 */
export const estaEnRangoSemana = (fecha, semana) => {
  const date = new Date(fecha);
  const inicio = new Date(semana.fechaInicio);
  const fin = new Date(semana.fechaFin);

  date.setHours(0, 0, 0, 0);
  inicio.setHours(0, 0, 0, 0);
  fin.setHours(23, 59, 59, 999);

  return date >= inicio && date <= fin;
};

/**
 * Verificar si una semana es la semana actual
 */
export const esSemanaCorriente = (semana) => {
  const hoy = new Date();
  return estaEnRangoSemana(hoy, semana);
};
