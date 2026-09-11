/**
 * src/utils/conciliaciones/generarPDFValesMaterialBulk.js
 *
 * Genera un PDF tamaño carta con 4 vales de material por página (grid 2×2).
 * Replica el formato físico del vale impreso incluyendo QR, secciones
 * MATERIAL, OPERADOR, VIAJES REGISTRADOS y etiqueta de copia (roja/blanca)
 * según el estado real del vale.
 *
 * La tabla de VIAJES REGISTRADOS siempre muestra TODOS los viajes del vale
 * (no se recorta a un máximo): la altura de fila y el tamaño de fuente se
 * calculan dinámicamente según cuánto espacio libre quede en la celda tras
 * el resto del contenido, para que quepan sin encimarse con la celda vecina.
 *
 * Dependencias: jspdf, qrcode
 * Usado en: ModalVistaPreviewConciliacion.jsx, DashboardUnificado.jsx
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

// Padding interno de cada celda + interlineados base (usados también para
// medir cuánto espacio fijo consume el contenido que NO es la tabla)
const PAD = 2.5;
const LH_SMALL = 3.0;
const LH_MED = 3.6;

// Rango de altura/fuente de las filas de la tabla de viajes: se calculan
// dinámicamente entre estos límites según cuántos viajes haya que mostrar.
const FILA_ALTURA_MAX = 3.1;
const FILA_ALTURA_MIN = 1.55;
const FILA_FUENTE_MAX = 4.5;
const FILA_FUENTE_MIN = 2.7;

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
 * Etiqueta de copia según estado real del vale — replica la lógica de
 * colorCopia de la app móvil (roja al crear / blanca al completar).
 */
const obtenerEtiquetaCopia = (estado) => {
  if (estado === "cancelado") return { badge: "CANCELADO", sub: null };
  if (estado === "en_proceso")
    return { badge: "COPIA ROJA", sub: "BANCO DE MATERIAL" };
  return { badge: "COPIA BLANCA", sub: "ORIGINAL" };
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

/**
 * "doc" de solo medición: no dibuja nada, cualquier método invocado es un
 * no-op. Se usa para correr dibujarVale() una vez con altura de fila 0 y así
 * saber cuánto espacio fijo (todo excepto las filas de viajes) consume el
 * resto del contenido del vale.
 */
const crearDocDeMedicion = () => new Proxy({}, { get: () => () => {} });

/**
 * Calcula altura de fila y tamaño de fuente para que TODOS los viajes quepan
 * en el espacio vertical libre de la celda. Con pocos viajes usa el tamaño
 * cómodo (FILA_ALTURA_MAX); con muchos los reduce hasta FILA_ALTURA_MIN.
 */
const calcularDimensionesFilas = (vale, ox, oy, numViajes) => {
  if (numViajes === 0) {
    return { rowHeight: FILA_ALTURA_MAX, fontSize: FILA_FUENTE_MAX };
  }

  const yFijo = dibujarVale(crearDocDeMedicion(), vale, ox, oy, null, {
    rowHeight: 0,
    fontSize: FILA_FUENTE_MAX,
  });
  const alturaFija = yFijo - oy;
  const alturaDisponible = CELDA_ALTO - PAD - alturaFija;

  const rowHeight = Math.min(
    FILA_ALTURA_MAX,
    Math.max(FILA_ALTURA_MIN, alturaDisponible / numViajes),
  );
  const fontSize = Math.min(
    FILA_FUENTE_MAX,
    Math.max(FILA_FUENTE_MIN, rowHeight * 1.35),
  );
  return { rowHeight, fontSize };
};

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: DIBUJAR UN VALE EN UNA CELDA
// ─────────────────────────────────────────────

/**
 * Dibuja (o mide, si `doc` es un doc de medición) un vale de material dentro
 * de la celda (ox, oy). Devuelve la posición Y final — se usa tanto para
 * medir el espacio fijo disponible como, en el trazo real, informativamente.
 *
 * @param {jsPDF}  doc         - Instancia de jsPDF (o doc de medición)
 * @param {Object} vale        - Objeto vale con relaciones cargadas
 * @param {number} ox          - Origen X de la celda
 * @param {number} oy          - Origen Y de la celda
 * @param {string} qrDataURL   - Imagen QR como dataURL (puede ser null)
 * @param {Object} filaViajes  - { rowHeight, fontSize } de cada fila de la
 *                                tabla de viajes (calculado dinámicamente)
 */
const dibujarVale = (doc, vale, ox, oy, qrDataURL, filaViajes) => {
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
  const esTipo3 = detalle.material?.tipo_de_material?.id_tipo_de_material === 3;

  // Viajes registrados en tabla hija — se muestran TODOS
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
  const CX = ox + W / 2;
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
  y += 1.3;

  // ── FECHAS ──────────────────────────────────────────────────────────────
  doc.setFontSize(5.2);
  doc.setFont("helvetica", "normal");
  doc.text("Creacion:", colLabel, y);
  doc.text(fechaCreacion, colValue, y, { align: "right" });
  y += LH_SMALL;

  doc.text("Emision:", colLabel, y);
  doc.text(fechaEmision, colValue, y, { align: "right" });
  y += LH_SMALL;

  linea(y);
  y += 1.3;

  // ── OBRA Y BANCO (combinadas en una línea cada una) ─────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.4);
  doc.text(`OBRA: ${truncar(obra, 32)}`, colLabel, y);
  y += LH_SMALL;

  doc.text(`BANCO: ${truncar(banco, 32)}`, colLabel, y);
  y += LH_SMALL;

  linea(y);
  y += 1.3;

  // ── SECCIÓN MATERIAL (sin título — ya es evidente por el contexto) ──────
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
  y += LH_SMALL;

  linea(y);
  y += 1.3;

  // ── SECCIÓN OPERADOR (sin título) ────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.4);
  doc.text(truncar(operador, 36), colLabel, y);
  y += LH_SMALL;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.1);
  doc.text(`Placas: ${placas}`, colLabel, y);
  doc.text(`Sind: ${truncar(sindicato, 14)}`, colValue, y, { align: "right" });
  y += LH_SMALL;

  linea(y);
  y += 1.3;

  // ── SECCIÓN VIAJES REGISTRADOS ──────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.6);
  doc.text("VIAJES REGISTRADOS", CX, y, { align: "center" });
  y += LH_MED - 0.3;

  if (viajes.length > 0) {
    const { rowHeight, fontSize } = filaViajes;

    // Encabezado de la mini-tabla
    doc.setFontSize(Math.max(fontSize, 3.6));
    doc.setFont("helvetica", "bold");

    const colBanco = colLabel;
    const colRem = ox + W * 0.42;
    const colM3 = ox + W * 0.6;
    const colHora = ox + W * 0.78;

    doc.text("Banco", colBanco, y);
    doc.text("Rem.", colRem, y);
    doc.text(esTipo3 ? "—" : "m³", colM3, y);
    doc.text("Hora", colHora, y);
    y += Math.max(rowHeight, 1.9);

    doc.setLineWidth(0.15);
    doc.line(colLabel, y - 0.6, ox + W - PAD, y - 0.6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);

    viajes.forEach((viaje) => {
      const bancoViaje = viaje.bancos_override?.banco ?? banco;
      const bancoTexto = truncar(bancoViaje, 13);
      const remision = viaje.folio_vale_fisico || "—";
      const m3Texto = Number(viaje.volumen_m3 || 0).toFixed(2);
      const horaTexto = formatearHora(
        viaje.hora_registro || viaje.created_at || "",
      );

      doc.text(bancoTexto, colBanco, y);
      doc.text(truncar(remision, 8), colRem, y);
      doc.text(m3Texto, colM3, y);
      doc.text(horaTexto, colHora, y);
      y += rowHeight;
    });

    // Totales de viajes
    linea(y);
    y += 1.3;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.text("Viajes", colLabel, y);
    doc.setFont("helvetica", "bold");
    doc.text(String(totalViajes), colLabel + 12, y);

    doc.setFont("helvetica", "normal");
    doc.text("Total m³", ox + W * 0.55, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${totalM3.toFixed(2)} m³`, colValue, y, { align: "right" });
    y += LH_SMALL;
  } else {
    // Sin viajes registrados aún
    doc.setFont("helvetica", "italic");
    doc.setFontSize(4.8);
    doc.text("Sin viajes registrados", CX, y, { align: "center" });
    y += LH_MED;
  }

  linea(y);
  y += 1.3;

  // ── CREADO / COMPLETADO POR (combinados en una sola línea) ─────────────
  doc.setFontSize(4.6);
  doc.setFont("helvetica", "normal");
  if (completadoPor) {
    doc.text(`Creo: ${truncar(creadoPor, 16)}`, colLabel, y);
    doc.text(`Complet: ${truncar(completadoPor, 15)}`, colValue, y, {
      align: "right",
    });
  } else {
    doc.text("Creado por:", colLabel, y);
    doc.setFont("helvetica", "bold");
    doc.text(truncar(creadoPor, 26), colValue, y, { align: "right" });
  }
  y += LH_SMALL;

  linea(y);
  y += 1.3;

  // ── QR ──────────────────────────────────────────────────────────────────
  const qrSize = 10;
  const qrX = CX - qrSize / 2;

  if (qrDataURL) {
    doc.addImage(qrDataURL, "PNG", qrX, y, qrSize, qrSize);
  }

  const yTextoQR = y + qrSize + 1.2;
  doc.setFontSize(4.3);
  doc.setFont("helvetica", "normal");
  doc.text("Escanear para verificar", CX, yTextoQR, { align: "center" });

  const yUrl = yTextoQR + 2.6;
  const urlImpresa = vale.qr_verification_url || `${BASE_URL}${vale.folio}`;
  doc.setFontSize(3.8);
  doc.text(urlImpresa, CX, yUrl, { align: "center" });

  const yLinea2 = yUrl + 1.6;
  linea(yLinea2);

  // ── ETIQUETA DE COPIA (según estado real del vale) ──────────────────────
  const yEtiqueta = yLinea2 + 1.6;
  const { badge, sub } = obtenerEtiquetaCopia(vale.estado);
  const altoBadge = 3.5;

  doc.setFillColor(0, 0, 0);
  doc.rect(ox + PAD, yEtiqueta, W - PAD * 2, altoBadge, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.3);
  doc.setFont("helvetica", "bold");
  doc.text(badge, CX, yEtiqueta + altoBadge - 1.1, { align: "center" });

  doc.setTextColor(0, 0, 0);

  let yTrasEtiqueta = yEtiqueta + altoBadge;
  if (sub) {
    const ySub = yTrasEtiqueta + LH_SMALL - 0.6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.3);
    doc.text(sub, CX, ySub, { align: "center" });
    yTrasEtiqueta = ySub;
  }

  const yEmitida = yTrasEtiqueta + LH_SMALL - 0.6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.3);
  doc.text(`Emitida: ${fechaEmision}`, CX, yEmitida, { align: "center" });

  return yEmitida;
};

// ─────────────────────────────────────────────
// FUNCIÓN EXPORTADA PRINCIPAL
// ─────────────────────────────────────────────

/**
 * Generar PDF con todos los vales de material de una conciliación.
 * Imprime 4 vales por página en grid 2×2. Cada vale muestra TODOS sus
 * viajes — si son muchos, la tabla usa filas más chicas para que quepan.
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

  // 3. Dibujar vales en páginas (grid 2×2, 4 por página)
  for (let i = 0; i < vales.length; i++) {
    // Cada 4 vales, nueva página (excepto la primera)
    if (i > 0 && i % 4 === 0) {
      doc.addPage();
    }

    const posicion = POSICIONES[i % 4];
    const vale = vales[i];
    const numViajes = (vale.vale_material_detalles?.[0]?.vale_material_viajes || [])
      .length;
    const filaViajes = calcularDimensionesFilas(
      vale,
      posicion.x,
      posicion.y,
      numViajes,
    );

    dibujarVale(
      doc,
      vale,
      posicion.x,
      posicion.y,
      qrMap[vale.folio] || null,
      filaViajes,
    );
  }

  // 4. Descargar
  const nombreArchivo = `Vales_Material_${folioConc}_${
    new Date().toISOString().split("T")[0]
  }.pdf`;

  doc.save(nombreArchivo);
};
