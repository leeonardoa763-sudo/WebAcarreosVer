/**
 * src/utils/conciliaciones/generarPDFValesMaterialBulk.js
 *
 * Genera un PDF tamaño carta con 4 vales de material por página (grid 2×2).
 * Replica el formato físico del vale impreso incluyendo QR, secciones
 * MATERIAL, OPERADOR, VIAJES REGISTRADOS y etiqueta COPIA BLANCA / ORIGINAL.
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

const CELDA_ANCHO = (PAGINA_ANCHO - MARGEN_X * 2) / 2;
const CELDA_ALTO = PAGINA_ALTO - MARGEN_Y * 2;

const POSICIONES = [
  { x: MARGEN_X + (PAGINA_ANCHO - MARGEN_X * 2) / 4, y: MARGEN_Y },
];

// URL base para QR
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

  // Extraer hora directamente del string original sin conversión de zona
  const parteHora = isoString.includes("T") ? isoString.split("T")[1] : "";
  const hora = parteHora ? parteHora.substring(0, 5) : "";

  return hora ? `${dia}/${mes}/${anio} ${hora}` : `${dia}/${mes}/${anio}`;
};

/**
 * Formatear hora desde string ISO completo a hora México
 */
const formatearHora = (isoString) => {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Mexico_City",
    });
  } catch {
    return isoString;
  }
};

/**
 * Truncar texto a maxChars + "…"
 */
const truncar = (texto, maxChars) => {
  if (!texto) return "—";
  if (texto.length <= maxChars) return texto;
  return texto.substring(0, maxChars - 1) + "…";
};

/**
 * Generar imagen QR como dataURL PNG
 */
const generarQRDataURL = async (vale) => {
  try {
    const url = vale.qr_verification_url || `${BASE_URL}${vale.folio}`;
    return await QRCode.toDataURL(url, {
      width: 80,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: DIBUJAR UN VALE EN UNA CELDA
// ─────────────────────────────────────────────

/**
 * Dibuja un vale de material dentro de la celda (ox, oy).
 *
 * @param {jsPDF}  doc       - Instancia de jsPDF
 * @param {Object} vale      - Objeto vale con relaciones cargadas
 * @param {number} ox        - Origen X de la celda
 * @param {number} oy        - Origen Y de la celda
 * @param {string} qrDataURL - Imagen QR como dataURL (puede ser null)
 */
const dibujarVale = (doc, vale, ox, oy, qrDataURL) => {
  // ── Extraer datos del vale ──────────────────────────────────────────────
  // Un vale de material puede tener múltiples detalles pero normalmente es 1
  const detalle = vale.vale_material_detalles?.[0] || {};
  const empresa = vale.obras?.empresas?.empresa || "—";
  const obra = vale.obras
    ? `${vale.obras.cc || ""} - ${vale.obras.obra || ""}`.trim()
    : "—";
  const banco = detalle.bancos?.banco || "—";
  const material = detalle.material?.material || "—";
  const capacidad =
    detalle.capacidad_m3 != null ? `${detalle.capacidad_m3} m³` : "—";
  const distancia =
    detalle.distancia_km != null ? `${detalle.distancia_km} Km` : "—";
  const operador = vale.operadores?.nombre_completo || "—";
  const placas = vale.vehiculos?.placas || "—";
  const sindicato = vale.operadores?.sindicatos?.sindicato || "—";

  // Viajes registrados en tabla hija
  const viajes = detalle.vale_material_viajes || [];

  // Totales
  const totalViajes = viajes.length;
  const totalM3 = viajes.reduce((acc, v) => acc + Number(v.volumen_m3 || 0), 0);

  // Personas
  const p = vale.persona;
  const pc = vale.persona_completador;
  const creadoPor = p
    ? `${p.nombre || ""} ${p.primer_apellido || ""} ${p.segundo_apellido || ""}`.trim()
    : "—";
  const completadoPor = pc
    ? `${pc.nombre || ""} ${pc.primer_apellido || ""} ${pc.segundo_apellido || ""}`.trim()
    : "";

  // Fechas
  const fechaCreacion = formatearFechaHora(vale.fecha_creacion);
  const fechaEmision = formatearFechaHora(
    vale.fecha_completado || vale.fecha_creacion,
  );

  // ── Constantes de layout interno ───────────────────────────────────────
  const W = CELDA_ANCHO;
  const PAD = 2.5;
  const CX = ox + W / 2;
  const LH_SMALL = 3.2;
  const LH_MED = 3.8;
  const colLabel = ox + PAD;
  const colValue = ox + W - PAD;

  let y = oy + PAD;

  // ── Borde exterior de la celda ──────────────────────────────────────────
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(ox, oy, W, CELDA_ALTO);

  // ── Línea separadora helper ─────────────────────────────────────────────
  const linea = (yPos) => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(ox + PAD, yPos, ox + W - PAD, yPos);
  };

  // ── ENCABEZADO ──────────────────────────────────────────────────────────
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text(empresa.toUpperCase(), CX, y, { align: "center" });
  y += LH_MED;

  doc.setFontSize(6.5);
  doc.text("VALE DE MATERIAL", CX, y, { align: "center" });
  y += LH_MED;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(`No. ${vale.folio}`, CX, y, { align: "center" });
  y += LH_SMALL;

  linea(y);
  y += 1.5;

  // ── FECHAS ──────────────────────────────────────────────────────────────
  doc.setFontSize(5.2);
  doc.setFont("helvetica", "normal");
  doc.text("Fecha creacion:", colLabel, y);
  doc.text(fechaCreacion, colValue, y, { align: "right" });
  y += LH_SMALL;

  doc.text("Fecha emision:", colLabel, y);
  doc.text(fechaEmision, colValue, y, { align: "right" });
  y += LH_SMALL + 0.5;

  linea(y);
  y += 1.5;

  // ── OBRA Y BANCO ────────────────────────────────────────────────────────
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.text("OBRA:", colLabel, y);
  y += LH_SMALL;

  doc.setFontSize(5.5);
  doc.text(truncar(obra, 36), colLabel, y);
  y += LH_SMALL;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.text("BANCO:", colLabel, y);
  y += LH_SMALL;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text(truncar(banco, 36), colLabel, y);
  y += LH_SMALL + 0.5;

  linea(y);
  y += 1.5;

  // ── SECCIÓN MATERIAL ────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.text("MATERIAL", CX, y, { align: "center" });
  y += LH_MED;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);

  doc.text("Material:", colLabel, y);
  doc.setFont("helvetica", "bold");
  doc.text(truncar(material, 22), colValue, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += LH_SMALL;

  doc.text("Capacidad:", colLabel, y);
  doc.text(capacidad, colValue, y, { align: "right" });
  y += LH_SMALL;

  doc.text("Distancia:", colLabel, y);
  doc.text(distancia, colValue, y, { align: "right" });
  y += LH_SMALL + 0.5;

  linea(y);
  y += 1.5;

  // ── SECCIÓN OPERADOR ────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.text("OPERADOR", CX, y, { align: "center" });
  y += LH_MED;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text(truncar(operador, 36), colLabel, y);
  y += LH_SMALL;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.text("Placas:", colLabel, y);
  doc.setFont("helvetica", "bold");
  doc.text(placas, colValue, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += LH_SMALL;

  doc.text("Sindicato:", colLabel, y);
  doc.text(truncar(sindicato, 22), colValue, y, { align: "right" });
  y += LH_SMALL + 0.5;

  linea(y);
  y += 1.5;

  // ── SECCIÓN VIAJES REGISTRADOS ──────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.text("VIAJES REGISTRADOS", CX, y, { align: "center" });
  y += LH_MED;

  if (viajes.length > 0) {
    // Encabezado de la mini-tabla
    doc.setFontSize(4.8);
    doc.setFont("helvetica", "bold");

    const colBanco = colLabel;
    const colRem = ox + W * 0.42;
    const colM3 = ox + W * 0.6;
    const colHora = ox + W * 0.78;

    doc.text("Banco", colBanco, y);
    doc.text("Rem.", colRem, y);
    doc.text("m³", colM3, y);
    doc.text("Hora", colHora, y);
    y += LH_SMALL * 0.8;

    doc.setLineWidth(0.15);
    doc.line(colLabel, y, ox + W - PAD, y);
    y += 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.5);

    // Máximo 6 viajes para no salirse de la celda
    const viajesAMostrar = viajes.slice(0, 6);

    viajesAMostrar.forEach((viaje) => {
      const bancoTexto = truncar(banco, 14);
      const remision = viaje.folio_vale_fisico || "—";
      const m3Texto = Number(viaje.volumen_m3 || 0).toFixed(2);
      const horaTexto = formatearHora(
        viaje.hora_registro || viaje.created_at || "",
      );

      doc.text(bancoTexto, colBanco, y);
      doc.text(truncar(remision, 8), colRem, y);
      doc.text(m3Texto, colM3, y);
      doc.text(horaTexto, colHora, y);
      y += LH_SMALL;
    });

    // Si hay más de 6 viajes, indicarlo
    if (viajes.length > 6) {
      doc.setFontSize(4.2);
      doc.setFont("helvetica", "italic");
      doc.text(`... y ${viajes.length - 6} viaje(s) más`, colLabel, y);
      y += LH_SMALL;
    }

    // Totales de viajes
    y += 0.5;
    linea(y);
    y += 1.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.text("Viajes", colLabel, y);
    doc.setFont("helvetica", "bold");
    doc.text(String(totalViajes), colLabel + 12, y);

    doc.setFont("helvetica", "normal");
    doc.text("Total m³", ox + W * 0.55, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${totalM3.toFixed(2)} m³`, colValue, y, { align: "right" });
    y += LH_SMALL + 0.5;
  } else {
    // Sin viajes registrados aún
    doc.setFont("helvetica", "italic");
    doc.setFontSize(4.8);
    doc.text("Sin viajes registrados", CX, y, { align: "center" });
    y += LH_MED;
  }

  linea(y);
  y += 1.5;

  // ── CREADO / COMPLETADO POR ─────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.8);
  doc.text("Creado por:", colLabel, y);
  doc.setFont("helvetica", "bold");
  doc.text(truncar(creadoPor, 22), colValue, y, { align: "right" });
  y += LH_SMALL;

  if (completadoPor) {
    doc.setFont("helvetica", "normal");
    doc.text("Completo por:", colLabel, y);
    doc.setFont("helvetica", "bold");
    doc.text(truncar(completadoPor, 20), colValue, y, { align: "right" });
    y += LH_SMALL;
  }

  linea(y);
  y += 1.5;

  // ── QR ──────────────────────────────────────────────────────────────────
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

  // ── ETIQUETA COPIA BLANCA / ORIGINAL ────────────────────────────────────
  const yEtiqueta = yLinea2 + 2;

  doc.setFillColor(0, 0, 0);
  doc.rect(ox + PAD, yEtiqueta, W - PAD * 2, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.text("COPIA BLANCA", CX, yEtiqueta + 2.7, { align: "center" });

  doc.setTextColor(0, 0, 0);

  const yOriginal = yEtiqueta + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text("ORIGINAL", CX, yOriginal, { align: "center" });

  const yEmitida = yOriginal + LH_SMALL + 0.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.5);
  doc.text(`Emitida: ${fechaEmision}`, CX, yEmitida, { align: "center" });
};

// ─────────────────────────────────────────────
// FUNCIÓN EXPORTADA PRINCIPAL
// ─────────────────────────────────────────────

/**
 * Generar PDF con todos los vales de material de una conciliación.
 * Imprime 4 vales por página en grid 2×2.
 *
 * @param {Array}  vales     - Array de vales con relaciones cargadas:
 *                             vale_material_detalles (con vale_material_viajes),
 *                             vehiculos, operadores, obras, persona
 * @param {string} folioConc - Folio de la conciliación (para nombre del archivo)
 */
export const generarPDFValesMaterialBulk = async (vales, folioConc) => {
  if (!vales || vales.length === 0) {
    throw new Error("No hay vales para generar el PDF");
  }

  // 1. Generar todos los QR en paralelo
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
    // Nueva página cada 4 vales (excepto la primera)
    if (i > 0) {
      doc.addPage();
    }

    const posicion = POSICIONES[0];
    dibujarVale(
      doc,
      vales[i],
      posicion.x,
      posicion.y,
      qrMap[vales[i].folio] || null,
    );
  }

  // 4. Descargar
  const nombreArchivo = `Vales_Material_${folioConc}_${
    new Date().toISOString().split("T")[0]
  }.pdf`;

  doc.save(nombreArchivo);
};
