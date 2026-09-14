/**
 * src/utils/conciliaciones/generarPDFValesRentaBulk.js
 *
 * Genera un PDF tamaño carta con 4 vales de renta por página (grid 2×2).
 * Replica el formato físico del vale impreso incluyendo QR, secciones
 * SERVICIO, TIEMPOS, OPERADOR, VIAJES REGISTRADOS y etiqueta de copia
 * (roja/blanca) según el estado real del vale.
 *
 * La tabla de VIAJES REGISTRADOS siempre muestra TODOS los viajes del vale
 * (no se recorta a un máximo): la altura de fila y el tamaño de fuente se
 * calculan dinámicamente según cuánto espacio libre quede en la celda tras
 * el resto del contenido, igual que en generarPDFValesMaterialBulk.js.
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

// Padding interno de cada celda + interlineados base
const PAD = 2.5;
const LH_SMALL = 3.2;
const LH_MED = 3.8;

// Rango de altura/fuente de las filas de la tabla de viajes: se calculan
// dinámicamente entre estos límites según cuántos viajes haya que mostrar.
const FILA_ALTURA_MAX = 3.1;
const FILA_ALTURA_MIN = 1.55;
const FILA_FUENTE_MAX = 4.5;
const FILA_FUENTE_MIN = 2.7;

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
 * Trunca por ANCHO real en mm (vs. `truncar`, que corta a N caracteres fijos
 * sin importar cuánto espacio hay). Necesario en la tabla de viajes: nombres
 * cortos ("Agua") desperdiciaban columna y nombres largos ("Material Pétreo
 * (100%)") se cortaban aunque sobrara espacio en pantalla. Requiere que el
 * font/tamaño ya estén fijados en `doc` antes de llamarla (usa getTextWidth
 * del estado actual). Con el doc de medición (getTextWidth === undefined)
 * cae directo al peor caso sin tronar.
 */
const truncarAncho = (doc, texto, maxWidthMm) => {
  if (!texto) return "—";
  if (doc.getTextWidth(texto) <= maxWidthMm) return texto;

  let low = 0;
  let high = texto.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidato = texto.substring(0, mid) + "…";
    if (doc.getTextWidth(candidato) <= maxWidthMm) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low > 0 ? texto.substring(0, low) + "…" : "…";
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
 * Dibuja (o mide, si `doc` es un doc de medición) un vale de renta dentro de
 * la celda (ox, oy). Retorna la posición Y final — se usa tanto para medir
 * el espacio fijo disponible como, en el trazo real, informativamente.
 *
 * @param {jsPDF} doc       - Instancia de jsPDF (o doc de medición)
 * @param {Object} vale     - Objeto vale con relaciones cargadas
 * @param {number} ox       - Origen X de la celda
 * @param {number} oy       - Origen Y de la celda
 * @param {string} qrDataURL - Imagen QR como dataURL (puede ser null)
 * @param {Object} filaViajes - { rowHeight, fontSize } de cada fila de la
 *                                tabla de viajes (calculado dinámicamente)
 */
const dibujarVale = (doc, vale, ox, oy, qrDataURL, filaViajes) => {
  // ── Extraer datos del vale ──────────────────
  const detalle = vale.vale_renta_detalle?.[0] || {};
  const empresa = vale.obras?.empresas?.empresa || "—";
  const obra = vale.obras
    ? `${vale.obras.cc || ""} - ${vale.obras.obra || ""}`.trim()
    : "—";
  const sindicato = vale.operadores?.sindicatos?.sindicato || "—";
  const material =
    detalle.material?.material || detalle.categoria_planeada?.categoria || "—";
  // La capacidad puede no quedar fijada en el detalle (vale creado antes de
  // asignar vehículo) — igual que pdfRentaGeneratorRecibo.js, se prefiere la
  // capacidad real del vehículo asignado y se cae al detalle si no hay.
  const capacidadRaw = vale.vehiculos?.capacidad_m3 ?? detalle.capacidad_m3;
  const capacidad = capacidadRaw != null ? `${capacidadRaw} m³` : "—";
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

  // Viajes registrados en tabla hija — se muestran TODOS
  const viajesRenta = detalle.vale_renta_viajes || [];
  const totalViajes = viajesRenta.length || detalle.numero_viajes || 0;
  // Pipas de agua: la columna destino es el POZO al que se rellena, no un banco.
  const esPipa = !!vale?.es_pipa_agua;

  // El viaje normal guarda su propio banco_descarga/material; los vales
  // viejos y las pipas lo resuelven por el ticket de descarga impreso
  // (mismo patrón que pdfRentaGeneratorRecibo.js — cruce por numero_ticket
  // === numero_viaje). Sin este fallback, banco_descarga sale null y la
  // columna queda en "—" aunque el vale sí tenga ticket de pozo/descarga.
  const ticketsDescarga = vale.tickets_descarga || [];
  const ticketMap = {};
  ticketsDescarga.forEach((t) => {
    ticketMap[t.numero_ticket] = t;
  });

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
  const CX = ox + W / 2; // centro X de la celda
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

  // ── SECCIÓN VIAJES REGISTRADOS ──────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.6);
  doc.text("VIAJES REGISTRADOS", CX, y, { align: "center" });
  y += LH_MED - 0.3;

  if (viajesRenta.length > 0) {
    const { rowHeight, fontSize } = filaViajes;

    // Encabezado de la mini-tabla
    doc.setFontSize(Math.max(fontSize, 3.6));
    doc.setFont("helvetica", "bold");

    // Columnas por posición Y ANCHO real (no por conteo de caracteres): con
    // ancho fijo, "Material" y "Banco" se recortaban aunque sobrara espacio
    // en pantalla (nombres cortos) y se cortaban de más con nombres largos.
    const colNum = colLabel;
    const colHora = ox + W * 0.09;
    const colMaterial = ox + W * 0.22;
    const colDestino = ox + W * 0.62;
    const anchoMaterial = colDestino - colMaterial - 1.5;
    const anchoDestino = ox + W - PAD - colDestino;

    doc.text("#", colNum, y);
    doc.text("Hora", colHora, y);
    doc.text("Material", colMaterial, y);
    doc.text(esPipa ? "Pozo" : "Banco", colDestino, y);
    y += Math.max(rowHeight, 1.9);

    doc.setLineWidth(0.15);
    doc.line(colLabel, y - 0.6, ox + W - PAD, y - 0.6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);

    viajesRenta
      .slice()
      .sort((a, b) => (a.numero_viaje ?? 0) - (b.numero_viaje ?? 0))
      .forEach((viaje) => {
        const horaTexto = formatearHora(viaje.hora_registro);
        const ticket = ticketMap[viaje.numero_viaje];
        const materialBase =
          viaje.material?.material || ticket?.material_ticket?.material || material;
        const matTexto = viaje.carga_porcentaje
          ? `${materialBase} (${viaje.carga_porcentaje}%)`
          : materialBase;
        const destinoTexto = viaje.banco_descarga || ticket?.banco_descarga || "—";

        doc.text(String(viaje.numero_viaje ?? "—"), colNum, y);
        doc.text(horaTexto, colHora, y);
        doc.text(truncarAncho(doc, matTexto, anchoMaterial), colMaterial, y);
        doc.text(truncarAncho(doc, destinoTexto, anchoDestino), colDestino, y);
        y += rowHeight;
      });

    // Totales de viajes
    linea(y);
    y += 1.3;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.text("Viajes registrados", colLabel, y);
    doc.setFont("helvetica", "bold");
    doc.text(String(viajesRenta.length), colValue, y, { align: "right" });
    y += LH_SMALL;
  } else {
    // Sin viajes registrados aún
    doc.setFont("helvetica", "italic");
    doc.setFontSize(4.8);
    doc.text(
      totalViajes > 0
        ? `${totalViajes} viaje(s) — sin detalle`
        : "Sin viajes registrados",
      CX,
      y,
      { align: "center" },
    );
    y += LH_MED;
  }

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

  // ── ETIQUETA DE COPIA (según estado real del vale) ──
  const yEtiqueta = yLinea2 + 2;
  const { badge, sub } = obtenerEtiquetaCopia(vale.estado);

  doc.setFillColor(0, 0, 0);
  doc.rect(ox + PAD, yEtiqueta, W - PAD * 2, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.text(badge, CX, yEtiqueta + 2.7, { align: "center" });

  // Restaurar color de texto
  doc.setTextColor(0, 0, 0);

  let yTrasEtiqueta = yEtiqueta + 4;
  if (sub) {
    const ySub = yTrasEtiqueta + LH_SMALL;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.text(sub, CX, ySub, { align: "center" });
    yTrasEtiqueta = ySub;
  }

  // Fecha de emisión
  const yEmitida = yTrasEtiqueta + LH_SMALL + 0.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.5);
  doc.text(`Emitida: ${fechaHora}`, CX, yEmitida, { align: "center" });

  return yEmitida;
};

// ─────────────────────────────────────────────
// FUNCIÓN EXPORTADA PRINCIPAL
// ─────────────────────────────────────────────

/**
 * Generar PDF con todos los vales de renta de una conciliación.
 * Imprime 4 vales por página en grid 2×2. Cada vale muestra TODOS sus
 * viajes — si son muchos, la tabla usa filas más chicas para que quepan.
 *
 * @param {Array}  vales         - Array de vales con relaciones cargadas:
 *                                 vale_renta_detalle (con vale_renta_viajes),
 *                                 vehiculos, operadores, obras, persona
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
    const numViajes = (vale.vale_renta_detalle?.[0]?.vale_renta_viajes || [])
      .length;
    const filaViajes = calcularDimensionesFilas(
      vale,
      posicion.x,
      posicion.y,
      numViajes,
    );

    dibujarVale(doc, vale, posicion.x, posicion.y, qr, filaViajes);
  }

  // 4. Descargar
  const nombreArchivo = `Vales_Renta_${folioConc}_${
    new Date().toISOString().split("T")[0]
  }.pdf`;

  doc.save(nombreArchivo);
};
