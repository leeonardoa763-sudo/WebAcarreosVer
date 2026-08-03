/**
 * src/utils/exportarReporteDiario.js
 *
 * Genera el PDF del Reporte Diario (KPIs del día, comparativa vs. día
 * anterior, desglose por material y por renta —agrupado por obra, con su
 * CC—, eficiencia operativa y alertas de presupuestos por agotarse) con el
 * mismo lenguaje visual que exportarReporteEstadisticas.js.
 *
 * Dependencias: jspdf, ./conciliaciones/pdfHelpers (checkPageBreak)
 * Usado en: ModalReporteDiario.jsx
 */

// 1. jsPDF
import { jsPDF } from "jspdf";

// 2. Utils
import { checkPageBreak } from "./conciliaciones/pdfHelpers";

// ── Layout ────────────────────────────────────────────────────────
const PAGE_WIDTH = 215.9;
const PAGE_HEIGHT = 279.4;
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 200;
const MARGIN_BOTTOM = 18;
const USABLE_WIDTH = MARGIN_RIGHT - MARGIN_LEFT;

// ── Colores ───────────────────────────────────────────────────────
const COLOR_SECONDARY = "#004E89";
const COLOR_BLUE = "#004E89";
const COLOR_ORANGE = "#FF6B35";
const COLOR_GREEN = "#1A936F";
const COLOR_PURPLE = "#8B5CF6";
const COLOR_TEXT = "#1A2332";
const COLOR_GRAY = "#64748B";
const COLOR_ROW_ALT = "#F5F6FA";
const COLOR_SUCCESS = "#059669";
const COLOR_WARNING = "#D97706";
const COLOR_DANGER = "#DC2626";

// ── Helpers ───────────────────────────────────────────────────────
const hexToRgb = (hex) => {
  const v = hex.replace("#", "");
  return {
    r: parseInt(v.substring(0, 2), 16),
    g: parseInt(v.substring(2, 4), 16),
    b: parseInt(v.substring(4, 6), 16),
  };
};

const setFill = (doc, hex) => {
  const { r, g, b } = hexToRgb(hex);
  doc.setFillColor(r, g, b);
};

const setTextColor = (doc, hex) => {
  const { r, g, b } = hexToRgb(hex);
  doc.setTextColor(r, g, b);
};

const formatearMoneda = (n) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);

const formatearNumero = (n, decimales = 0) =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n || 0);

const formatearFechaHoraGeneracion = () =>
  new Date().toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  });

const ajustarTexto = (doc, texto, maxWidthMM) => {
  let t = String(texto ?? "");
  if (doc.getTextWidth(t) <= maxWidthMM) return t;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxWidthMM) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
};

// Etiqueta de obra con su CC al inicio: "CC 123 · Nombre de la obra"
const formatearObra = (obra, cc) => (cc != null ? `CC ${cc} · ${obra || "Sin obra"}` : obra || "Sin obra");

// ── Encabezado de sección ───────────────────────────────────────────
const dibujarTituloSeccion = (doc, yPos, texto) => {
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setTextColor(doc, COLOR_SECONDARY);
  doc.text(texto.toUpperCase(), MARGIN_LEFT, yPos);
  doc.setDrawColor(...Object.values(hexToRgb(COLOR_SECONDARY)));
  doc.setLineWidth(0.4);
  doc.line(MARGIN_LEFT, yPos + 1.5, MARGIN_RIGHT, yPos + 1.5);
  setTextColor(doc, COLOR_TEXT);
  return yPos + 8;
};

// ── KPI boxes ────────────────────────────────────────────────────
const dibujarKpis = (doc, yPos, kpis) => {
  const gap = 3;
  const boxWidth = (USABLE_WIDTH - gap * (kpis.length - 1)) / kpis.length;
  const boxHeight = 22;

  kpis.forEach((kpi, i) => {
    const x = MARGIN_LEFT + i * (boxWidth + gap);
    setFill(doc, kpi.color);
    doc.roundedRect(x, yPos, boxWidth, boxHeight, 1.5, 1.5, "F");

    setTextColor(doc, "#FFFFFF");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(kpi.label.toUpperCase(), x + 3, yPos + 6, { maxWidth: boxWidth - 6 });

    doc.setFontSize(12);
    doc.text(kpi.value, x + 3, yPos + 13.5, { maxWidth: boxWidth - 6 });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(kpi.sublabel || "", x + 3, yPos + 19, { maxWidth: boxWidth - 6 });
  });

  setTextColor(doc, COLOR_TEXT);
  return yPos + boxHeight + 8;
};

// ── Comparativa vs. día anterior ────────────────────────────────────
const dibujarComparativa = (doc, yPos, comparativa) => {
  if (!comparativa) return yPos;

  const items = [
    { label: "Vehículos Activos", d: comparativa.vehiculosActivos },
    { label: "Material (m³)", d: comparativa.materialM3 },
    { label: "Total de Viajes", d: comparativa.totalViajes },
    { label: "Importe +IVA", d: comparativa.importeConIva },
  ];

  yPos = dibujarTituloSeccion(doc, yPos, "Comparativa vs. Día Anterior");

  const gap = 3;
  const boxWidth = (USABLE_WIDTH - gap * (items.length - 1)) / items.length;
  const boxHeight = 14;

  items.forEach((item, i) => {
    const x = MARGIN_LEFT + i * (boxWidth + gap);
    setFill(doc, COLOR_ROW_ALT);
    doc.roundedRect(x, yPos, boxWidth, boxHeight, 1.2, 1.2, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text(item.label, x + 3, yPos + 5, { maxWidth: boxWidth - 6 });

    const pct = item.d?.pct ?? 0;
    const signo = pct >= 0 ? "+" : "";
    setTextColor(doc, item.d?.sube ? COLOR_SUCCESS : COLOR_DANGER);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${signo}${formatearNumero(pct, 0)}%`, x + 3, yPos + 11);
  });

  setTextColor(doc, COLOR_TEXT);
  return yPos + boxHeight + 8;
};

// ── Tabla genérica: encabezado de columnas ──────────────────────────
const dibujarEncabezadoColumnas = (doc, yPos, columnas) => {
  setFill(doc, COLOR_SECONDARY);
  doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, 6.5, "F");
  setTextColor(doc, "#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);

  let x = MARGIN_LEFT;
  columnas.forEach((col) => {
    const textX = col.align === "right" ? x + col.width - 2 : x + 2;
    doc.text(col.label, textX, yPos + 4.5, { align: col.align === "right" ? "right" : "left" });
    x += col.width;
  });

  setTextColor(doc, COLOR_TEXT);
  return yPos + 6.5;
};

// ── Tabla: desglose por material (agrupado por obra, con CC) ────────
const dibujarTablaMaterial = (doc, yPosInicial, desgloseMaterial) => {
  let yPos = dibujarTituloSeccion(doc, yPosInicial, "Desglose por Material");

  if (!desgloseMaterial || desgloseMaterial.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text("Sin material registrado este día.", MARGIN_LEFT, yPos + 5);
    setTextColor(doc, COLOR_TEXT);
    return yPos + 12;
  }

  const columnas = [
    { label: "OBRA / MATERIAL", width: 78, align: "left" },
    { label: "VIAJES", width: 22, align: "right" },
    { label: "M³ TOTAL", width: 40, align: "right" },
    { label: "IMPORTE", width: 45, align: "right" },
  ];
  yPos = dibujarEncabezadoColumnas(doc, yPos, columnas);

  const rowHeight = 6;

  const drawRow = (cells, opts = {}) => {
    yPos = checkPageBreak(doc, yPos, rowHeight, PAGE_HEIGHT, MARGIN_BOTTOM);
    if (yPos === 12) yPos = dibujarEncabezadoColumnas(doc, yPos, columnas);

    if (opts.fillHeader) {
      setFill(doc, "#E8EEF4");
      doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
    } else if (opts.fillSubtotal) {
      setFill(doc, "#EFF3EE");
      doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
    }

    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(8);
    let x = MARGIN_LEFT;
    columnas.forEach((col, i) => {
      const textX = col.align === "right" ? x + col.width - 2 : x + 2;
      if (i === 0 && opts.span) {
        doc.text(ajustarTexto(doc, cells[0], USABLE_WIDTH - 4), MARGIN_LEFT + 2, yPos + 4.2);
      } else {
        const raw = String(cells[i] ?? "");
        const indent = opts.indent && i === 0 ? "  " : "";
        const texto = col.align === "left" ? ajustarTexto(doc, `${indent}${raw}`, col.width - 4) : raw;
        doc.text(texto, textX, yPos + 4.2, { align: col.align === "right" ? "right" : "left" });
      }
      x += col.width;
    });

    yPos += rowHeight;
  };

  desgloseMaterial.forEach((obraRow) => {
    drawRow([formatearObra(obraRow.obra, obraRow.cc), "", "", ""], { fillHeader: true, bold: true, span: true });

    obraRow.materiales.forEach((m) => {
      drawRow(
        [m.material, formatearNumero(m.viajes, 0), `${formatearNumero(m.m3Total, 2)} m³`, formatearMoneda(m.importe)],
        { indent: true }
      );
    });

    if (obraRow.materiales.length > 1) {
      drawRow(
        [
          "Subtotal",
          formatearNumero(obraRow.subtotal.viajes, 0),
          `${formatearNumero(obraRow.subtotal.m3Total, 2)} m³`,
          formatearMoneda(obraRow.subtotal.importe),
        ],
        { fillSubtotal: true, bold: true, indent: true }
      );
    }
  });

  return yPos + 6;
};

// ── Tabla: desglose por renta (agrupado por obra, con CC) ────────────
const dibujarTablaRenta = (doc, yPosInicial, desgloseRenta) => {
  let yPos = dibujarTituloSeccion(doc, yPosInicial, "Desglose por Renta");

  if (!desgloseRenta || desgloseRenta.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text("Sin renta de equipo registrada este día.", MARGIN_LEFT, yPos + 5);
    setTextColor(doc, COLOR_TEXT);
    return yPos + 12;
  }

  const columnas = [
    { label: "OBRA", width: 80, align: "left" },
    { label: "VALES", width: 20, align: "right" },
    { label: "HORAS", width: 25, align: "right" },
    { label: "DÍAS", width: 20, align: "right" },
    { label: "IMPORTE", width: 40, align: "right" },
  ];
  yPos = dibujarEncabezadoColumnas(doc, yPos, columnas);

  const rowHeight = 6;
  let rowIndex = 0;

  desgloseRenta.forEach((r) => {
    yPos = checkPageBreak(doc, yPos, rowHeight, PAGE_HEIGHT, MARGIN_BOTTOM);
    if (yPos === 12) yPos = dibujarEncabezadoColumnas(doc, yPos, columnas);

    if (rowIndex % 2 === 1) {
      setFill(doc, COLOR_ROW_ALT);
      doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
    }

    const cells = [
      formatearObra(r.obra, r.cc),
      formatearNumero(r.vales),
      formatearNumero(r.horas, 1),
      formatearNumero(r.dias, 1),
      formatearMoneda(r.importe),
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    let x = MARGIN_LEFT;
    columnas.forEach((col, i) => {
      const textX = col.align === "right" ? x + col.width - 2 : x + 2;
      const raw = String(cells[i] ?? "");
      const texto = col.align === "left" ? ajustarTexto(doc, raw, col.width - 4) : raw;
      doc.text(texto, textX, yPos + 4.2, { align: col.align === "right" ? "right" : "left" });
      x += col.width;
    });

    yPos += rowHeight;
    rowIndex += 1;
  });

  return yPos + 6;
};

// ── Eficiencia operativa ─────────────────────────────────────────────
const dibujarEficiencia = (doc, yPosInicial, eficiencia) => {
  let yPos = dibujarTituloSeccion(doc, yPosInicial, "Eficiencia Operativa");

  const items = [
    {
      label: "Tiempo promedio entre viajes",
      value: eficiencia.tiempoPromedioEntreViajesMin != null
        ? `${formatearNumero(eficiencia.tiempoPromedioEntreViajesMin, 0)} min`
        : "—",
    },
    { label: "Volumen promedio por viaje", value: `${formatearNumero(eficiencia.m3PromedioPorViaje, 2)} m³` },
    { label: "Hora pico de actividad", value: eficiencia.horaPico ? `${eficiencia.horaPico.label} (${formatearNumero(eficiencia.horaPico.viajes)} viajes)` : "—" },
    { label: "Vehículo más productivo", value: eficiencia.vehiculoTop ? `${eficiencia.vehiculoTop.placas} · ${formatearNumero(eficiencia.vehiculoTop.m3Total, 1)} m³` : "—" },
    { label: "Obra con más actividad", value: eficiencia.obraTop ? `${eficiencia.obraTop.obra} · ${formatearNumero(eficiencia.obraTop.m3Total, 1)} m³` : "—" },
  ];

  yPos = checkPageBreak(doc, yPos, items.length * 6 + 4, PAGE_HEIGHT, MARGIN_BOTTOM);

  doc.setFontSize(8.5);
  items.forEach((item) => {
    doc.setFont("helvetica", "bold");
    setTextColor(doc, COLOR_TEXT);
    doc.text(`${item.label}:`, MARGIN_LEFT, yPos);
    doc.setFont("helvetica", "normal");
    setTextColor(doc, COLOR_GRAY);
    doc.text(item.value, MARGIN_LEFT + 65, yPos, { maxWidth: USABLE_WIDTH - 65 });
    yPos += 6;
  });

  setTextColor(doc, COLOR_TEXT);
  return yPos + 4;
};

// ── Presupuestos por agotarse ────────────────────────────────────────
const dibujarAlertasPresupuesto = (doc, yPosInicial, alertas) => {
  let yPos = dibujarTituloSeccion(doc, yPosInicial, "Presupuestos por Agotarse");

  if (!alertas || alertas.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_SUCCESS);
    doc.text("Todos los presupuestos están en buen estado (menos del 80% consumido).", MARGIN_LEFT, yPos + 5);
    setTextColor(doc, COLOR_TEXT);
    return yPos + 12;
  }

  const columnas = [
    { label: "OBRA", width: 62, align: "left" },
    { label: "CONCEPTO", width: 43, align: "left" },
    { label: "CONSUMIDO", width: 32, align: "right" },
    { label: "PRESUPUESTADO", width: 33, align: "right" },
    { label: "% USO", width: 15, align: "right" },
  ];
  yPos = dibujarEncabezadoColumnas(doc, yPos, columnas);

  const rowHeight = 6;
  alertas.forEach((a, i) => {
    yPos = checkPageBreak(doc, yPos, rowHeight, PAGE_HEIGHT, MARGIN_BOTTOM);
    if (yPos === 12) yPos = dibujarEncabezadoColumnas(doc, yPos, columnas);

    if (i % 2 === 1) {
      setFill(doc, COLOR_ROW_ALT);
      doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
    }

    const cells = [a.obra, a.concepto, a.consumido, a.presupuestado, `${Math.round(a.pct)}%`];
    const color = a.pct > 100 ? COLOR_DANGER : COLOR_WARNING;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    let x = MARGIN_LEFT;
    columnas.forEach((col, ci) => {
      const textX = col.align === "right" ? x + col.width - 2 : x + 2;
      setTextColor(doc, ci === 4 ? color : COLOR_TEXT);
      doc.setFont("helvetica", ci === 4 ? "bold" : "normal");
      const raw = String(cells[ci] ?? "");
      const texto = col.align === "left" ? ajustarTexto(doc, raw, col.width - 4) : raw;
      doc.text(texto, textX, yPos + 4.2, { align: col.align === "right" ? "right" : "left" });
      x += col.width;
    });

    setTextColor(doc, COLOR_TEXT);
    yPos += rowHeight;
  });

  return yPos + 6;
};

// ── Pie de página ────────────────────────────────────────────────────
const dibujarPieDePagina = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    setTextColor(doc, COLOR_GRAY);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Página ${i} de ${pageCount} · Generado el ${formatearFechaHoraGeneracion()}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 8,
      { align: "center" }
    );
  }
  setTextColor(doc, COLOR_TEXT);
};

// ── Generador principal ──────────────────────────────────────────────
export const generarPDFReporteDiario = (datos) => {
  const {
    fecha,
    fechaLabel,
    kpis,
    comparativa,
    desgloseMaterial,
    desgloseRenta,
    eficiencia,
    alertasPresupuesto = [],
  } = datos;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  let yPos = 12;

  // ── Encabezado ──
  setFill(doc, COLOR_SECONDARY);
  doc.rect(0, 0, PAGE_WIDTH, 22, "F");
  setTextColor(doc, "#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("REPORTE DIARIO", MARGIN_LEFT, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Control de Acarreos · CAPAM · TRIACO · COEDESSA · ${fechaLabel}`, MARGIN_LEFT, 18);
  setTextColor(doc, COLOR_TEXT);
  yPos = 30;

  // ── KPIs ──
  const kpiBoxes = [
    { label: "Vehículos Activos", value: formatearNumero(kpis.vehiculosActivos), sublabel: "Con al menos 1 viaje", color: COLOR_BLUE },
    { label: "Material Movido", value: `${formatearNumero(kpis.materialM3, 1)} m³`, sublabel: "Volumen total", color: COLOR_GREEN },
    { label: "Total de Viajes", value: formatearNumero(kpis.totalViajes), sublabel: "Material + renta", color: COLOR_ORANGE },
    { label: "Importe +IVA", value: formatearMoneda(kpis.importeConIva), sublabel: `Subtotal: ${formatearMoneda(kpis.importeTotal)}`, color: COLOR_PURPLE },
  ];
  yPos = dibujarKpis(doc, yPos, kpiBoxes);

  // ── Comparativa ──
  yPos = dibujarComparativa(doc, yPos, comparativa);

  // ── Desglose por material ──
  yPos = checkPageBreak(doc, yPos, 20, PAGE_HEIGHT, MARGIN_BOTTOM);
  yPos = dibujarTablaMaterial(doc, yPos, desgloseMaterial);

  // ── Desglose por renta ──
  yPos = checkPageBreak(doc, yPos, 20, PAGE_HEIGHT, MARGIN_BOTTOM);
  yPos = dibujarTablaRenta(doc, yPos, desgloseRenta);

  // ── Eficiencia ──
  yPos = checkPageBreak(doc, yPos, 30, PAGE_HEIGHT, MARGIN_BOTTOM);
  yPos = dibujarEficiencia(doc, yPos, eficiencia || {});

  // ── Presupuestos por agotarse ──
  yPos = checkPageBreak(doc, yPos, 20, PAGE_HEIGHT, MARGIN_BOTTOM);
  dibujarAlertasPresupuesto(doc, yPos, alertasPresupuesto);

  dibujarPieDePagina(doc);

  const nombreArchivo = `Reporte_Diario_${(fecha || new Date().toISOString().substring(0, 10)).replace(/-/g, "")}.pdf`;
  doc.save(nombreArchivo);
};
