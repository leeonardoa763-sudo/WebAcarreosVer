/**
 * src/utils/conciliaciones/generarPDFValesRentaBulk.js
 *
 * Genera un PDF tamaño carta con 4 vales de renta por página (grid 2×2).
 * Replica el formato físico del vale impreso incluyendo QR, secciones
 * SERVICIO, TIEMPOS, OPERADOR y etiqueta COPIA BLANCO / ORIGINAL.
 *
 * Dependencias: jspdf, qrcode
 * Usado en: ModalVistaPreviewConciliacion.jsx
 */

// 1. Imports
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

// ─────────────────────────────────────────────
// CONSTANTES DE LAYOUT
// ─────────────────────────────────────────────

// Página carta en mm
const PAGINA_ANCHO = 215.9;
const PAGINA_ALTO = 279.4;

// Márgenes de página
const MARGEN_X = 8;
const MARGEN_Y = 8;

// Cada celda del grid 2×2
const CELDA_ANCHO = (PAGINA_ANCHO - MARGEN_X * 2 - 4) / 2; // 4mm de gap entre columnas
const CELDA_ALTO = (PAGINA_ALTO - MARGEN_Y * 2 - 4) / 2; // 4mm de gap entre filas

// Posiciones de las 4 celdas (col, fila) → (x, y)
const POSICIONES = [
  { x: MARGEN_X, y: MARGEN_Y }, // vale 1 (arriba izq)
  { x: MARGEN_X + CELDA_ANCHO + 4, y: MARGEN_Y }, // vale 2 (arriba der)
  { x: MARGEN_X, y: MARGEN_Y + CELDA_ALTO + 4 }, // vale 3 (abajo izq)
  { x: MARGEN_X + CELDA_ANCHO + 4, y: MARGEN_Y + CELDA_ALTO + 4 }, // vale 4 (abajo der)
];

// URL base para QR — fallback si qr_verification_url no está en la BD
const BASE_URL = "https://web-acarreos.vercel.app/vale/";

// ─────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────

/**
 * Formatear fecha ISO a dd/mm/aa HH:MM
 */
const formatearFechaHora = (isoString) => {
  if (!isoString) return "—";
  const fecha = new Date(isoString.substring(0, 10) + "T12:00:00");
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = String(fecha.getFullYear()).slice(-2);

  // Extraer hora de la cadena original sin conversión de zona
  const parteHora = isoString.includes("T") ? isoString.split("T")[1] : "";
  const hora = parteHora ? parteHora.substring(0, 5) : "";

  return hora ? `${dia}/${mes}/${anio} ${hora}` : `${dia}/${mes}/${anio}`;
};

/**
 * Formatear hora desde string.
 * Acepta tanto "HH:MM:SS" como timestamp ISO completo "2026-03-19T14:36:00+00:00".
 * Convierte a hora México (America/Mexico_City).
 */
const formatearHora = (valor) => {
  if (!valor) return "—";

  // Si es solo hora "HH:MM:SS" o "HH:MM" — recortar directo
  if (typeof valor === "string" && valor.length <= 8 && valor.includes(":")) {
    return valor.substring(0, 5);
  }

  // Si es timestamp ISO completo — convertir a hora México
  try {
    const date = new Date(valor);
    if (isNaN(date.getTime())) return valor;
    return date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Mexico_City",
    });
  } catch {
    return valor;
  }
};

/**
 * Formatear total días: 0.5 → "0.5 días", 1 → "1 día", etc.
 */
const formatearDias = (valor) => {
  if (valor === null || valor === undefined) return "—";
  const num = Number(valor);
  if (num === 0) return "—";
  return `${num} ${num === 1 ? "día" : "días"}`;
};

/**
 * Formatear total horas: null/0 → "N/A"
 */
const formatearHoras = (valor) => {
  if (!valor || Number(valor) === 0) return "N/A";
  return `${Number(valor).toFixed(1)} hrs`;
};

/**
 * Truncar texto a maxChars + "..."
 */
const truncar = (texto, maxChars) => {
  if (!texto) return "—";
  if (texto.length <= maxChars) return texto;
  return texto.substring(0, maxChars - 1) + "…";
};

/**
 * Generar imagen QR como dataURL PNG.
 * Usa el qr_verification_url guardado en la BD si existe,
 * de lo contrario construye la URL a partir del folio.
 */
const generarQRDataURL = async (vale) => {
  try {
    // Usar la URL exacta que está en la BD — es la misma que se usó en el PDF original
    const url = vale.qr_verification_url || `${BASE_URL}${vale.folio}`;
    const dataURL = await QRCode.toDataURL(url, {
      width: 80,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
    return dataURL;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: DIBUJAR UN VALE EN UNA CELDA
// ─────────────────────────────────────────────

/**
 * Dibuja un vale de renta dentro de la celda (ox, oy).
 * Retorna la cantidad de mm usados verticalmente (por si se necesita ajustar).
 *
 * @param {jsPDF} doc       - Instancia de jsPDF
 * @param {Object} vale     - Objeto vale con relaciones cargadas
 * @param {number} ox       - Origen X de la celda
 * @param {number} oy       - Origen Y de la celda
 * @param {string} qrDataURL - Imagen QR como dataURL (puede ser null)
 */
const dibujarVale = (doc, vale, ox, oy, qrDataURL) => {
  // ── Extraer datos del vale ──────────────────
  const detalle = vale.vale_renta_detalle?.[0] || {};
  const empresa = vale.obras?.empresas?.empresa || "—";
  const obra = vale.obras
    ? `${vale.obras.cc || ""} - ${vale.obras.obra || ""}`.trim()
    : "—";
  const sindicato = vale.operadores?.sindicatos?.sindicato || "—";
  const material = detalle.material?.material || "—";
  const capacidad =
    detalle.capacidad_m3 != null ? `${detalle.capacidad_m3} m³` : "—";
  const viajes =
    detalle.numero_viajes != null ? String(detalle.numero_viajes) : "—";
  const horaInicio = formatearHora(detalle.hora_inicio);
  const horaFin = detalle.es_renta_por_dia
    ? Number(detalle.total_dias) === 0.5
      ? "Medio día"
      : "Día completo"
    : formatearHora(detalle.hora_fin);
  const totalHoras = formatearHoras(detalle.total_horas);
  const totalDias = formatearDias(detalle.total_dias);
  const operador = vale.operadores?.nombre_completo || "—";
  const placas = vale.vehiculos?.placas || "—";

  // persona es id_persona_creador → tiene nombre/primer_apellido/segundo_apellido
  const p = vale.persona;
  const creadoPor = p
    ? `${p.nombre || ""} ${p.primer_apellido || ""} ${p.segundo_apellido || ""}`.trim()
    : "—";

  // persona_completador es id_persona_completador → misma estructura
  const pv = vale.persona_completador;
  const completadoPor = pv
    ? `${pv.nombre || ""} ${pv.primer_apellido || ""} ${pv.segundo_apellido || ""}`.trim()
    : "";

  const fechaHora = formatearFechaHora(vale.fecha_creacion);

  // ── Constantes de tipografía y layout interno ─
  const W = CELDA_ANCHO; // ancho útil de la celda
  const PAD = 2.5; // padding interno
  const CX = ox + W / 2; // centro X de la celda
  const LH_SMALL = 3.2; // interlineado pequeño
  const LH_MED = 3.8; // interlineado medio
  const colLabel = ox + PAD;
  const colValue = ox + W - PAD;

  let y = oy + PAD;

  // ── Borde exterior de la celda ──────────────
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(ox, oy, W, CELDA_ALTO);

  // ── Línea separadora helper ─────────────────
  const linea = (yPos) => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(ox + PAD, yPos, ox + W - PAD, yPos);
  };

  // ── ENCABEZADO: Empresa ─────────────────────
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text(empresa.toUpperCase(), CX, y, { align: "center" });
  y += LH_MED;

  doc.setFontSize(6.5);
  doc.text("VALE DE RENTA", CX, y, { align: "center" });
  y += LH_MED;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(`No. ${vale.folio}`, CX, y, { align: "center" });
  y += LH_SMALL;

  doc.setFontSize(5.5);
  doc.text(fechaHora, CX, y, { align: "center" });
  y += LH_SMALL + 0.5;

  linea(y);
  y += 1.5;

  // ── OBRA ────────────────────────────────────
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.text("OBRA:", colLabel, y);
  y += LH_SMALL;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  // Obra puede ser larga, truncar
  const obraTexto = truncar(obra, 38);
  doc.text(obraTexto, colLabel, y);
  y += LH_SMALL;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.text(`Sindicato:`, colLabel, y);
  doc.text(truncar(sindicato, 22), colValue, y, { align: "right" });
  y += LH_SMALL + 0.5;

  linea(y);
  y += 1.5;

  // ── SECCIÓN SERVICIO ────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.text("SERVICIO", CX, y, { align: "center" });
  y += LH_MED;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);

  doc.text("Material:", colLabel, y);
  doc.setFont("helvetica", "bold");
  doc.text(truncar(material, 20), colValue, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += LH_SMALL;

  doc.text("Capacidad:", colLabel, y);
  doc.text(capacidad, colValue, y, { align: "right" });
  y += LH_SMALL;

  doc.text("Viajes:", colLabel, y);
  doc.text(viajes, colValue, y, { align: "right" });
  y += LH_SMALL + 0.5;

  linea(y);
  y += 1.5;

  // ── SECCIÓN TIEMPOS ─────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.text("TIEMPOS", CX, y, { align: "center" });
  y += LH_MED;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);

  doc.text("Inicio:", colLabel, y);
  doc.text(horaInicio, colValue, y, { align: "right" });
  y += LH_SMALL;

  doc.text("Fin:", colLabel, y);
  doc.text(horaFin, colValue, y, { align: "right" });
  y += LH_SMALL;

  linea(y);
  y += 1.2;

  doc.text("Total Horas:", colLabel, y);
  doc.text(totalHoras, colValue, y, { align: "right" });
  y += LH_SMALL;

  doc.text("Total Días:", colLabel, y);
  doc.text(totalDias, colValue, y, { align: "right" });
  y += LH_SMALL + 0.5;

  linea(y);
  y += 1.5;

  // ── SECCIÓN OPERADOR ────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.text("OPERADOR", CX, y, { align: "center" });
  y += LH_MED;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text(truncar(operador, 32), colLabel, y);
  y += LH_SMALL;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.text("Placas:", colLabel, y);
  doc.setFont("helvetica", "bold");
  doc.text(placas, colValue, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += LH_SMALL + 0.5;

  linea(y);
  y += 1.5;

  // ── CREADO / COMPLETADO ─────────────────────
  doc.setFontSize(5);
  doc.text("Creado por:", colLabel, y);
  doc.text(truncar(creadoPor, 22), colValue, y, { align: "right" });
  y += LH_SMALL;

  if (completadoPor) {
    doc.text("Completo por:", colLabel, y);
    doc.text(truncar(completadoPor, 20), colValue, y, { align: "right" });
    y += LH_SMALL;
  }

  y += 0.5;
  linea(y);
  y += 1.5;

  // ── QR ──────────────────────────────────────
  const qrSize = 12;
  const qrX = CX - qrSize / 2;

  if (qrDataURL) {
    doc.addImage(qrDataURL, "PNG", qrX, y, qrSize, qrSize);
  }

  const yTextoQR = y + qrSize + 1.5;
  doc.setFontSize(4.5);
  doc.setFont("helvetica", "normal");
  doc.text("Escanear para verificar", CX, yTextoQR, { align: "center" });

  const yUrl = yTextoQR + 3;
  const urlImpresa = vale.qr_verification_url || `${BASE_URL}${vale.folio}`;
  doc.setFontSize(4);
  doc.text(urlImpresa, CX, yUrl, { align: "center" });

  const yLinea2 = yUrl + 2;
  linea(yLinea2);

  // ── ETIQUETA COPIA BLANCO / ORIGINAL ────────
  const yEtiqueta = yLinea2 + 2;

  // Fondo negro para "COPIA BLANCO"
  doc.setFillColor(0, 0, 0);
  doc.rect(ox + PAD, yEtiqueta, W - PAD * 2, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.text("COPIA BLANCO", CX, yEtiqueta + 2.7, { align: "center" });

  // Restaurar color de texto
  doc.setTextColor(0, 0, 0);

  const yOriginal = yEtiqueta + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text("ORIGINAL", CX, yOriginal, { align: "center" });

  // Fecha de emisión
  const yEmitida = yOriginal + LH_SMALL + 0.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.5);
  doc.text(`Emitida: ${fechaHora}`, CX, yEmitida, { align: "center" });
};

// ─────────────────────────────────────────────
// FUNCIÓN EXPORTADA PRINCIPAL
// ─────────────────────────────────────────────

/**
 * Generar PDF con todos los vales de renta de una conciliación.
 * Imprime 4 vales por página en grid 2×2.
 *
 * @param {Array}  vales         - Array de vales con relaciones cargadas:
 *                                 vale_renta_detalle, vehiculos, operadores,
 *                                 obras, persona, persona_completo
 * @param {string} folioConc     - Folio de la conciliación (para nombre del archivo)
 */
export const generarPDFValesRentaBulk = async (vales, folioConc) => {
  if (!vales || vales.length === 0) {
    throw new Error("No hay vales para generar el PDF");
  }

  // 1. Generar todos los QR en paralelo antes de crear el doc
  const qrMap = {};
  await Promise.all(
    vales.map(async (vale) => {
      qrMap[vale.folio] = await generarQRDataURL(vale);
    }),
  );

  // 2. Crear documento
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  // 3. Dibujar vales en páginas
  for (let i = 0; i < vales.length; i++) {
    // Cada 4 vales, nueva página (excepto la primera)
    if (i > 0 && i % 4 === 0) {
      doc.addPage();
    }

    const posicion = POSICIONES[i % 4];
    const vale = vales[i];
    const qr = qrMap[vale.folio] || null;

    dibujarVale(doc, vale, posicion.x, posicion.y, qr);
  }

  // 4. Descargar
  const nombreArchivo = `Vales_Renta_${folioConc}_${
    new Date().toISOString().split("T")[0]
  }.pdf`;

  doc.save(nombreArchivo);
};
