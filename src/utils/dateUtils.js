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
 * Las semanas van de LUNES a SÁBADO
 *
 * @param {Date|string} fecha - Fecha a calcular
 * @returns {object} - { numero, año, fechaInicio, fechaFin }
 */
export const calcularSemanaISO = (fecha) => {
  const date = new Date(fecha);

  // Obtener el día de la semana (0 = domingo, 1 = lunes, ..., 6 = sábado)
  const dia = date.getDay();

  // Calcular diferencia para llegar al lunes
  // Si es domingo (0), retroceder 6 días
  // Si es lunes (1), retroceder 0 días
  // Si es martes (2), retroceder 1 día, etc.
  const diff = dia === 0 ? -6 : 1 - dia;

  // Obtener el lunes de esta semana
  const lunes = new Date(date);
  lunes.setDate(date.getDate() + diff);
  lunes.setHours(0, 0, 0, 0);

  // Obtener el sábado de esta semana (lunes + 5 días)
  const sabado = new Date(lunes);
  sabado.setDate(lunes.getDate() + 5);
  sabado.setHours(23, 59, 59, 999);

  // Calcular número de semana ISO
  const primerDiaAno = new Date(lunes.getFullYear(), 0, 1);
  const diasTranscurridos = Math.floor(
    (lunes - primerDiaAno) / (24 * 60 * 60 * 1000)
  );
  const numeroSemana = Math.ceil(
    (diasTranscurridos + primerDiaAno.getDay() + 1) / 7
  );

  // Formatear fechas
  const formatFecha = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const resultado = {
    numero: numeroSemana,
    año: lunes.getFullYear(),
    fechaInicio: formatFecha(lunes),
    fechaFin: formatFecha(sabado),
  };

  return resultado;
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

  // Asegurarse de comparar solo fechas, sin hora
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
