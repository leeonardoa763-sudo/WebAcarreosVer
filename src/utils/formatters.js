/**
 * src/utils/formatters.js
 *
 * Utilidades de formateo para la aplicación
 *
 * Funcionalidades:
 * - Formateo de fechas en español
 * - Formateo de números y decimales
 * - Formateo de moneda (MXN)
 * - Formateo de folios
 * - Helpers para estados y tipos
 *
 * Usado en: Todos los componentes que muestran datos
 */

/**
 * Formatear fecha a formato legible en español
 * @param {string|Date} fecha - Fecha en formato ISO o Date object
 * @param {boolean} incluirHora - Si incluir hora en formato
 * @returns {string} Fecha formateada
 */
export const formatearFecha = (fecha, incluirHora = false) => {
  if (!fecha) return "N/A";

  try {
    const date = new Date(fecha);

    // Validar fecha válida
    if (isNaN(date.getTime())) return "Fecha inválida";

    const opciones = {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Mexico_City",
    };

    if (incluirHora) {
      opciones.hour = "2-digit";
      opciones.minute = "2-digit";
      opciones.hour12 = true;
    }

    return date.toLocaleDateString("es-MX", opciones);
  } catch (error) {
    console.error("Error en formatearFecha:", error);
    return "Error en fecha";
  }
};

/**
 * Formatear fecha a formato corto (DD/MM/YYYY)
 * @param {string|Date} fecha - Fecha en formato ISO o Date object
 * @returns {string} Fecha formateada
 */
export const formatearFechaCorta = (fecha) => {
  if (!fecha) return "N/A";

  try {
    const date = new Date(fecha);

    if (isNaN(date.getTime())) return "Fecha inválida";

    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const anio = date.getFullYear();

    return `${dia}/${mes}/${anio}`;
  } catch (error) {
    console.error("Error en formatearFechaCorta:", error);
    return "Error";
  }
};

/**
 * Formatear fecha y hora de forma separada
 * @param {string|Date} fecha - Fecha en formato ISO o Date object
 * @returns {object} Objeto con fecha y hora separadas
 */
export const formatearFechaHora = (fecha) => {
  if (!fecha) return { fecha: "N/A", hora: "N/A" };

  try {
    const date = new Date(fecha);

    if (isNaN(date.getTime())) {
      return { fecha: "Fecha inválida", hora: "" };
    }

    const fechaFormateada = formatearFechaCorta(fecha);
    const hora = date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Mexico_City",
    });

    return { fecha: fechaFormateada, hora };
  } catch (error) {
    console.error("Error en formatearFechaHora:", error);
    return { fecha: "Error", hora: "" };
  }
};

/**
 * Formatear número con decimales
 * @param {number} numero - Número a formatear
 * @param {number} decimales - Cantidad de decimales (default: 2)
 * @returns {string} Número formateado
 */
export const formatearNumero = (numero, decimales = 2) => {
  if (numero === null || numero === undefined) return "0";

  try {
    return Number(numero).toLocaleString("es-MX", {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
  } catch (error) {
    console.error("Error en formatearNumero:", error);
    return "0";
  }
};

/**
 * Formatear moneda en pesos mexicanos
 * @param {number} cantidad - Cantidad a formatear
 * @returns {string} Cantidad formateada con símbolo $
 */
export const formatearMoneda = (cantidad) => {
  if (cantidad === null || cantidad === undefined) return "$0.00";

  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(cantidad);
  } catch (error) {
    console.error("Error en formatearMoneda:", error);
    return "$0.00";
  }
};

/**
 * Formatear volumen en metros cúbicos
 * @param {number} volumen - Volumen en m³
 * @returns {string} Volumen formateado
 */
export const formatearVolumen = (volumen) => {
  if (volumen === null || volumen === undefined) return "0 m³";

  try {
    return `${formatearNumero(volumen, 2)} m³`;
  } catch (error) {
    console.error("Error en formatearVolumen:", error);
    return "0 m³";
  }
};

/**
 * Formatear peso en toneladas
 * @param {number} peso - Peso en toneladas
 * @returns {string} Peso formateado
 */
export const formatearPeso = (peso) => {
  if (peso === null || peso === undefined) return "0 ton";

  try {
    return `${formatearNumero(peso, 2)} ton`;
  } catch (error) {
    console.error("Error en formatearPeso:", error);
    return "0 ton";
  }
};

/**
 * Formatear distancia en kilómetros
 * @param {number} distancia - Distancia en km
 * @returns {string} Distancia formateada
 */
export const formatearDistancia = (distancia) => {
  if (distancia === null || distancia === undefined) return "0 km";

  try {
    return `${formatearNumero(distancia, 1)} km`;
  } catch (error) {
    console.error("Error en formatearDistancia:", error);
    return "0 km";
  }
};

/**
 * Formatear duración en horas
 * @param {number} horas - Cantidad de horas
 * @returns {string} Duración formateada
 */
export const formatearDuracion = (horas) => {
  if (horas === null || horas === undefined) return "0 hrs";

  try {
    return `${formatearNumero(horas, 2)} hrs`;
  } catch (error) {
    console.error("Error en formatearDuracion:", error);
    return "0 hrs";
  }
};

/**
 * Obtener badge de estado de vale con color
 * @param {string} estado - Estado del vale
 * @returns {object} Objeto con label y color
 */
export const getBadgeEstado = (estado) => {
  const estados = {
    borrador: {
      label: "Borrador",
      color: "#7F8C8D",
      background: "#ECF0F1",
    },
    en_proceso: {
      label: "En Proceso",
      color: "#F59E0B",
      background: "#FEF3C7",
    },
    emitido: {
      label: "Emitido",
      color: "#1A936F",
      background: "#D1FAE5",
    },
    verificado: {
      label: "Verificado",
      color: "#004E89",
      background: "#DBEAFE",
    },
    pagado: {
      label: "Pagado",
      color: "#10B981",
      background: "#D1FAE5",
    },
  };

  return (
    estados[estado] || {
      label: estado,
      color: "#7F8C8D",
      background: "#ECF0F1",
    }
  );
};

/**
 * Obtener badge de tipo de vale con color
 * @param {string} tipo - Tipo del vale
 * @returns {object} Objeto con label y color
 */
export const getBadgeTipo = (tipo) => {
  const tipos = {
    material: {
      label: "Material",
      color: "#FF6B35",
      background: "#FEF3EF",
    },
    renta: {
      label: "Renta",
      color: "#004E89",
      background: "#EFF6FF",
    },
  };

  return (
    tipos[tipo] || {
      label: tipo,
      color: "#7F8C8D",
      background: "#ECF0F1",
    }
  );
};

/**
 * Formatear folio con estilo
 * @param {string} folio - Folio del vale
 * @returns {string} Folio formateado
 */
export const formatearFolio = (folio) => {
  if (!folio) return "N/A";
  return folio.toUpperCase();
};

/**
 * Obtener nombre completo de persona
 * @param {object} persona - Objeto persona con nombre y apellidos
 * @returns {string} Nombre completo
 */
export const getNombreCompleto = (persona) => {
  if (!persona) return "N/A";

  const { nombre, primer_apellido, segundo_apellido } = persona;

  return `${nombre || ""} ${primer_apellido || ""} ${segundo_apellido || ""}`
    .trim()
    .replace(/\s+/g, " ");
};

/**
 * Formatear rango de fechas
 * @param {string|Date} inicio - Fecha de inicio
 * @param {string|Date} fin - Fecha de fin
 * @returns {string} Rango formateado
 */
export const formatearRangoFechas = (inicio, fin) => {
  if (!inicio && !fin) return "Sin filtro de fechas";
  if (!inicio) return `Hasta ${formatearFechaCorta(fin)}`;
  if (!fin) return `Desde ${formatearFechaCorta(inicio)}`;

  return `${formatearFechaCorta(inicio)} - ${formatearFechaCorta(fin)}`;
};

/**
 * Calcular diferencia de horas entre dos fechas
 * @param {string|Date} inicio - Fecha/hora inicial
 * @param {string|Date} fin - Fecha/hora final
 * @returns {number} Diferencia en horas
 */
export const calcularDiferenciaHoras = (inicio, fin) => {
  if (!inicio || !fin) return 0;

  try {
    const dateInicio = new Date(inicio);
    const dateFin = new Date(fin);

    if (isNaN(dateInicio.getTime()) || isNaN(dateFin.getTime())) {
      return 0;
    }

    const diferenciaMilisegundos = dateFin - dateInicio;
    const diferenciaHoras = diferenciaMilisegundos / (1000 * 60 * 60);

    return Math.max(0, diferenciaHoras);
  } catch (error) {
    console.error("Error en calcularDiferenciaHoras:", error);
    return 0;
  }
};

/**
 * Obtener iniciales de un nombre
 * @param {string} nombre - Nombre completo
 * @returns {string} Iniciales (máximo 2 letras)
 */
export const getIniciales = (nombre) => {
  if (!nombre) return "NA";

  try {
    const palabras = nombre.trim().split(" ");
    if (palabras.length === 1) {
      return palabras[0].substring(0, 2).toUpperCase();
    }
    return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
  } catch (error) {
    console.error("Error en getIniciales:", error);
    return "NA";
  }
};

/**
 * Truncar texto con elipsis
 * @param {string} texto - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Texto truncado
 */
export const truncarTexto = (texto, maxLength = 50) => {
  if (!texto) return "";
  if (texto.length <= maxLength) return texto;

  return `${texto.substring(0, maxLength)}...`;
};

/**
 * Formatear fecha para input type="date"
 * @param {string|Date} fecha - Fecha a formatear
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const formatearFechaInput = (fecha) => {
  if (!fecha) return "";

  try {
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error en formatearFechaInput:", error);
    return "";
  }
};

/**
 * Validar si una fecha es válida
 * @param {string|Date} fecha - Fecha a validar
 * @returns {boolean} True si es válida
 */
export const esFechaValida = (fecha) => {
  if (!fecha) return false;

  try {
    const date = new Date(fecha);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

/**
 * Formatear hora desde timestamp
 * @param {string|Date} timestamp - Fecha en formato ISO o Date object
 * @returns {string} Hora formateada (HH:MM AM/PM)
 */
export const formatearHora = (timestamp) => {
  if (!timestamp) return "N/A";

  try {
    const date = new Date(timestamp);

    if (isNaN(date.getTime())) return "Hora inválida";

    return date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Mexico_City",
    });
  } catch (error) {
    console.error("Error en formatearHora:", error);
    return "Error";
  }
};
