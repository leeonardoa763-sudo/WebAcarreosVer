/**
 * src/utils/exportarReporteEstadisticas.js
 *
 * Genera el reporte PDF de Estadísticas Globales (KPIs, comparativa vs
 * periodo anterior, material movido por obra, renta por obra, control
 * de presupuesto y datos destacados) respetando los filtros activos
 * de la página.
 *
 * Dependencias: jspdf, ./conciliaciones/pdfHelpers (checkPageBreak)
 * Usado en: EstadisticasGlobales.jsx
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

// ── Colores (mismos hex que .eg__kpi-card--* en estadisticas-globales.css) ──
const COLOR_SECONDARY = "#004E89";
const COLOR_TEAL = "#06B6D4";
const COLOR_BLUE = "#004E89";
const COLOR_ORANGE = "#FF6B35";
const COLOR_GREEN = "#1A936F";
const COLOR_AMBER = "#F59E0B";
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

const formatearMonedaCorta = (n) => {
  if (!n && n !== 0) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return formatearMoneda(n);
};

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

const formatearFechaCorte = (ts) => {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Mexico_City",
  });
};

const calcularDeltaPct = (actual, anterior) => {
  if (!anterior) return actual > 0 ? 100 : 0;
  return ((actual - anterior) / anterior) * 100;
};

const ajustarTexto = (doc, texto, maxWidthMM) => {
  let t = String(texto ?? "");
  if (doc.getTextWidth(t) <= maxWidthMM) return t;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxWidthMM) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
};

const formatearObraCompleta = (empresa, cc, obra) => {
  const partes = [];
  if (empresa) partes.push(empresa);
  if (cc != null) partes.push(`CC ${cc}`);
  partes.push(obra || "Sin obra");
  return partes.join(" · ");
};

const calcularSemaforo = (consumido, presupuestado) => {
  if (!presupuestado || Number(presupuestado) === 0) {
    return { pct: 0, pctLabel: "0%", color: COLOR_SUCCESS };
  }
  const pct = Number(consumido) / Number(presupuestado);
  return {
    pct,
    pctLabel: `${Math.round(pct * 100)}%`,
    color: pct > 1 ? COLOR_DANGER : pct >= 0.8 ? COLOR_WARNING : COLOR_SUCCESS,
  };
};

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

// ── Comparativa vs periodo anterior ─────────────────────────────────
const dibujarComparativa = (doc, yPos, comparativaPeriodoAnterior, periodoAnteriorLabel) => {
  if (!comparativaPeriodoAnterior) return yPos;

  const { actual, anterior } = comparativaPeriodoAnterior;
  const items = [
    { label: "Material (m³)", d: calcularDeltaPct(actual.m3Total, anterior.m3Total) },
    { label: "Importe", d: calcularDeltaPct(actual.importeTotal, anterior.importeTotal) },
    { label: "Conciliaciones", d: calcularDeltaPct(actual.totalConciliaciones, anterior.totalConciliaciones) },
    { label: "Horas Renta", d: calcularDeltaPct(actual.totalHorasRenta, anterior.totalHorasRenta) },
    { label: "Días Renta", d: calcularDeltaPct(actual.totalDiasRenta, anterior.totalDiasRenta) },
  ];

  yPos = dibujarTituloSeccion(doc, yPos, `Comparativa vs ${periodoAnteriorLabel}`);

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

    const signo = item.d >= 0 ? "+" : "";
    setTextColor(doc, item.d >= 0 ? COLOR_SUCCESS : COLOR_DANGER);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${signo}${formatearNumero(item.d, 1)}%`, x + 3, yPos + 11);
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

// ── Tabla: Material Movido por Obra ─────────────────────────────────
const dibujarTablaMaterial = (doc, yPosInicial, tablaObraMaterial, totalesTablaObra, periodoTablas) => {
  let yPos = dibujarTituloSeccion(
    doc,
    yPosInicial,
    periodoTablas ? `Material Movido por Obra — ${periodoTablas}` : "Material Movido por Obra"
  );

  const columnas = [
    { label: "MATERIAL", width: 70, align: "left" },
    { label: "M³ TOTAL", width: 30, align: "right" },
    { label: "VALES", width: 25, align: "right" },
    { label: "VIAJES", width: 25, align: "right" },
    { label: "IMPORTE + IVA", width: 35, align: "right" },
  ];

  if (!tablaObraMaterial || tablaObraMaterial.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text("Sin datos de material para los filtros seleccionados.", MARGIN_LEFT, yPos + 5);
    setTextColor(doc, COLOR_TEXT);
    return yPos + 12;
  }

  yPos = dibujarEncabezadoColumnas(doc, yPos, columnas);

  const rowHeight = 6;
  let rowIndex = 0;

  const drawRow = (cells, opts = {}) => {
    yPos = checkPageBreak(doc, yPos, rowHeight, PAGE_HEIGHT, MARGIN_BOTTOM);
    if (yPos === 12) {
      yPos = dibujarEncabezadoColumnas(doc, yPos, columnas);
    }

    if (opts.fillHeader) {
      setFill(doc, "#E8EEF4");
      doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
    } else if (opts.fillSubtotal) {
      setFill(doc, "#EFF3EE");
      doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
    } else if (rowIndex % 2 === 1) {
      setFill(doc, COLOR_ROW_ALT);
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
        const texto = col.align === "left" ? ajustarTexto(doc, raw, col.width - 4) : raw;
        doc.text(texto, textX, yPos + 4.2, { align: col.align === "right" ? "right" : "left" });
      }
      x += col.width;
    });

    yPos += rowHeight;
    rowIndex += 1;
  };

  tablaObraMaterial.forEach((obraRow) => {
    const obraLabel = formatearObraCompleta(obraRow.empresa, obraRow.cc, obraRow.obra);
    drawRow([obraLabel, "", "", "", ""], { fillHeader: true, bold: true, span: true });

    obraRow.materiales.forEach((mat) => {
      drawRow([
        `  ${mat.material}`,
        `${formatearNumero(mat.m3Total, 2)} m³`,
        formatearNumero(mat.valesCount),
        formatearNumero(mat.totalViajes),
        formatearMoneda(mat.importeIVA),
      ]);
    });

    if (obraRow.materiales.length > 1) {
      drawRow([
        "  Subtotal",
        `${formatearNumero(obraRow.subtotal.m3Total, 2)} m³`,
        formatearNumero(obraRow.subtotal.valesCount),
        formatearNumero(obraRow.subtotal.totalViajes),
        formatearMoneda(obraRow.subtotal.importeIVA),
      ], { fillSubtotal: true, bold: true });
    }
  });

  drawRow([
    "TOTAL",
    `${formatearNumero(totalesTablaObra.m3Total, 2)} m³`,
    formatearNumero(totalesTablaObra.valesCount),
    formatearNumero(totalesTablaObra.totalViajes),
    formatearMoneda(totalesTablaObra.importeIVA),
  ], { fillHeader: true, bold: true });

  return yPos + 6;
};

// ── Tabla: Renta de Equipo por Obra ─────────────────────────────────
const dibujarTablaRenta = (doc, yPosInicial, tablaRentaPorObra, totalesRenta, periodoTablas) => {
  if (!tablaRentaPorObra || tablaRentaPorObra.length === 0) return yPosInicial;

  let yPos = dibujarTituloSeccion(
    doc,
    yPosInicial,
    periodoTablas ? `Renta de Equipo por Obra — ${periodoTablas}` : "Renta de Equipo por Obra"
  );

  const columnas = [
    { label: "OBRA", width: 65, align: "left" },
    { label: "VALES", width: 20, align: "right" },
    { label: "VIAJES", width: 20, align: "right" },
    { label: "DÍAS", width: 20, align: "right" },
    { label: "HORAS", width: 20, align: "right" },
    { label: "IMPORTE S/IVA", width: 40, align: "right" },
  ];

  yPos = dibujarEncabezadoColumnas(doc, yPos, columnas);

  const rowHeight = 6;
  let rowIndex = 0;

  const drawRow = (cells, opts = {}) => {
    yPos = checkPageBreak(doc, yPos, rowHeight, PAGE_HEIGHT, MARGIN_BOTTOM);
    if (yPos === 12) {
      yPos = dibujarEncabezadoColumnas(doc, yPos, columnas);
    }

    if (opts.fillHeader) {
      setFill(doc, "#E8EEF4");
      doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
    } else if (rowIndex % 2 === 1) {
      setFill(doc, COLOR_ROW_ALT);
      doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
    }

    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
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
  };

  tablaRentaPorObra.forEach((row) => {
    drawRow([
      formatearObraCompleta(row.empresa, row.cc, row.obra),
      formatearNumero(row.vales),
      formatearNumero(row.totalViajes),
      formatearNumero(row.totalDias, 1),
      formatearNumero(row.totalHoras, 1),
      formatearMoneda(row.subtotalSinIva),
    ]);
  });

  drawRow([
    "TOTAL",
    formatearNumero(totalesRenta.vales),
    formatearNumero(totalesRenta.totalViajes),
    formatearNumero(totalesRenta.totalDias, 1),
    formatearNumero(totalesRenta.totalHoras, 1),
    formatearMoneda(totalesRenta.subtotalSinIva),
  ], { fillHeader: true, bold: true });

  return yPos + 6;
};

// ── Control de Presupuesto ───────────────────────────────────────────
const dibujarPresupuestos = (doc, yPosInicial, presupuestosMaterial, presupuestosRenta, hayAlertaPresupuesto) => {
  let yPos = dibujarTituloSeccion(doc, yPosInicial, "Control de Presupuesto");

  if (hayAlertaPresupuesto) {
    yPos = checkPageBreak(doc, yPos, 9, PAGE_HEIGHT, MARGIN_BOTTOM);
    setFill(doc, "#FEE2E2");
    doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, 7, "F");
    setTextColor(doc, COLOR_DANGER);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Uno o más conceptos han superado el presupuesto asignado.", MARGIN_LEFT + 2, yPos + 4.6);
    setTextColor(doc, COLOR_TEXT);
    yPos += 10;
  }

  const presupuestosMaterialUsados = (presupuestosMaterial || []).filter((p) => Number(p.m3_consumidos) > 0);
  const presupuestosRentaUsados = (presupuestosRenta || []).filter((p) => Number(p.monto_consumido) > 0);

  const sinMaterial = presupuestosMaterialUsados.length === 0;
  const sinRenta = presupuestosRentaUsados.length === 0;

  if (sinMaterial && sinRenta) {
    const hayPresupuestosConfigurados =
      (presupuestosMaterial && presupuestosMaterial.length > 0) ||
      (presupuestosRenta && presupuestosRenta.length > 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text(
      hayPresupuestosConfigurados
        ? "Sin consumo registrado en los presupuestos configurados para las obras seleccionadas."
        : "Sin presupuestos configurados para las obras seleccionadas.",
      MARGIN_LEFT,
      yPos + 4
    );
    setTextColor(doc, COLOR_TEXT);
    return yPos + 12;
  }

  const rowHeight = 6;

  const drawSemaforoRow = (columnas, cells, pctIndex, color, opts = {}) => {
    yPos = checkPageBreak(doc, yPos, rowHeight, PAGE_HEIGHT, MARGIN_BOTTOM);
    if (yPos === 12) {
      yPos = dibujarEncabezadoColumnas(doc, yPos, columnas);
    }
    if (opts.rowIndexOdd) {
      setFill(doc, COLOR_ROW_ALT);
      doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    let x = MARGIN_LEFT;
    columnas.forEach((col, i) => {
      const textX = col.align === "right" ? x + col.width - 2 : x + 2;
      setTextColor(doc, i === pctIndex ? color : COLOR_TEXT);
      if (i === pctIndex) doc.setFont("helvetica", "bold"); else doc.setFont("helvetica", "normal");
      const raw = String(cells[i] ?? "");
      const texto = col.align === "left" ? ajustarTexto(doc, raw, col.width - 4) : raw;
      doc.text(texto, textX, yPos + 4.2, { align: col.align === "right" ? "right" : "left" });
      x += col.width;
    });
    setTextColor(doc, COLOR_TEXT);
    yPos += rowHeight;
  };

  const ordenarPorObra = (arr) =>
    [...arr].sort((a, b) =>
      formatearObraCompleta(a.obras?.empresas?.empresa, a.obras?.cc, a.obras?.obra)
        .localeCompare(formatearObraCompleta(b.obras?.empresas?.empresa, b.obras?.cc, b.obras?.obra))
    );

  // ── Material ──
  if (!sinMaterial) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_SECONDARY);
    doc.text("Material", MARGIN_LEFT, yPos + 4);
    setTextColor(doc, COLOR_TEXT);
    yPos += 6;

    const columnasMat = [
      { label: "OBRA", width: 62, align: "left" },
      { label: "MATERIAL", width: 42, align: "left" },
      { label: "CONSUMIDO m³", width: 28, align: "right" },
      { label: "PRESUPUESTADO m³", width: 28, align: "right" },
      { label: "% USO", width: 25, align: "right" },
    ];
    yPos = dibujarEncabezadoColumnas(doc, yPos, columnasMat);

    ordenarPorObra(presupuestosMaterialUsados).forEach((p, i) => {
      const sem = calcularSemaforo(p.m3_consumidos, p.m3_presupuestados);
      drawSemaforoRow(columnasMat, [
        formatearObraCompleta(p.obras?.empresas?.empresa, p.obras?.cc, p.obras?.obra),
        p.material?.material || "—",
        `${formatearNumero(p.m3_consumidos, 1)} m³`,
        `${formatearNumero(p.m3_presupuestados, 1)} m³`,
        sem.pctLabel,
      ], 4, sem.color, { rowIndexOdd: i % 2 === 1 });
    });

    yPos += 5;
  }

  // ── Renta ──
  if (!sinRenta) {
    yPos = checkPageBreak(doc, yPos, 15, PAGE_HEIGHT, MARGIN_BOTTOM);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_SECONDARY);
    doc.text("Renta de Equipo", MARGIN_LEFT, yPos + 4);
    setTextColor(doc, COLOR_TEXT);
    yPos += 6;

    const columnasRenta = [
      { label: "OBRA", width: 95, align: "left" },
      { label: "CONSUMIDO", width: 35, align: "right" },
      { label: "PRESUPUESTADO", width: 35, align: "right" },
      { label: "% USO", width: 20, align: "right" },
    ];
    yPos = dibujarEncabezadoColumnas(doc, yPos, columnasRenta);

    ordenarPorObra(presupuestosRentaUsados).forEach((p, i) => {
      const sem = calcularSemaforo(p.monto_consumido, p.monto_presupuestado);
      drawSemaforoRow(columnasRenta, [
        formatearObraCompleta(p.obras?.empresas?.empresa, p.obras?.cc, p.obras?.obra),
        formatearMoneda(p.monto_consumido),
        formatearMoneda(p.monto_presupuestado),
        sem.pctLabel,
      ], 3, sem.color, { rowIndexOdd: i % 2 === 1 });
    });
  }

  return yPos + 6;
};

// ── Datos destacados ─────────────────────────────────────────────────
const dibujarDatosDestacados = (doc, yPosInicial, destacados) => {
  let yPos = dibujarTituloSeccion(doc, yPosInicial, "Datos Destacados");
  yPos = checkPageBreak(doc, yPos, destacados.length * 6 + 4, PAGE_HEIGHT, MARGIN_BOTTOM);

  doc.setFontSize(8.5);
  destacados.forEach((item) => {
    doc.setFont("helvetica", "bold");
    setTextColor(doc, COLOR_TEXT);
    doc.text(`${item.label}:`, MARGIN_LEFT, yPos);
    doc.setFont("helvetica", "normal");
    setTextColor(doc, COLOR_GRAY);
    doc.text(item.value, MARGIN_LEFT + 55, yPos, { maxWidth: USABLE_WIDTH - 55 });
    yPos += 6;
  });

  setTextColor(doc, COLOR_TEXT);
  return yPos + 4;
};

// ── Pie de página ────────────────────────────────────────────────────
const dibujarPieDePagina = (doc, ultimaConciliacion) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    setTextColor(doc, COLOR_GRAY);
    doc.setFont("helvetica", "normal");
    const corte = ultimaConciliacion
      ? ` · Datos hasta ${formatearFechaCorte(ultimaConciliacion.fecha_generacion)} (${ultimaConciliacion.folio})`
      : "";
    doc.text(
      `Página ${i} de ${pageCount} · Generado el ${formatearFechaHoraGeneracion()}${corte}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 8,
      { align: "center" }
    );
  }
  setTextColor(doc, COLOR_TEXT);
};

// ── Generador principal ──────────────────────────────────────────────
export const generarPDFReporteEstadisticas = (datos) => {
  const {
    filtrosActivos = [],
    periodoLabel = "Todos los periodos",
    periodoTablasLabel = null,
    resumen,
    totalesTablaObra,
    comparativaPeriodoAnterior,
    periodoAnteriorLabel,
    tablaObraMaterial = [],
    tablaRentaPorObra = [],
    totalesRenta,
    presupuestosMaterial = [],
    presupuestosRenta = [],
    hayAlertaPresupuesto = false,
    topResidente,
    topChecador,
    topPlaca,
    horaPico,
    mejorRendimiento,
    ultimaConciliacion,
  } = datos;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  let yPos = 12;

  // ── Encabezado ──
  setFill(doc, COLOR_SECONDARY);
  doc.rect(0, 0, PAGE_WIDTH, 22, "F");
  setTextColor(doc, "#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("REPORTE DE ESTADÍSTICAS GLOBALES", MARGIN_LEFT, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Control de Acarreos · CAPAM · TRIACO · COEDESSA", MARGIN_LEFT, 18);
  setTextColor(doc, COLOR_TEXT);
  yPos = 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Periodo:", MARGIN_LEFT, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(periodoLabel, MARGIN_LEFT + 15, yPos, { maxWidth: USABLE_WIDTH - 15 });

  const filtrosTexto = filtrosActivos.length > 0
    ? filtrosActivos.map((f) => `${f.label}: ${f.value}`).join("   ·   ")
    : "Sin filtros adicionales";
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Filtros:", MARGIN_LEFT, yPos);
  doc.setFont("helvetica", "normal");
  setTextColor(doc, COLOR_GRAY);
  doc.text(filtrosTexto, MARGIN_LEFT + 15, yPos, { maxWidth: USABLE_WIDTH - 15 });
  setTextColor(doc, COLOR_TEXT);
  yPos += 9;

  // ── KPIs ──
  const kpis = [
    {
      label: "Material Movido",
      value: `${formatearNumero(totalesTablaObra.m3Total, 2)} m³`,
      sublabel: "Volumen total",
      color: COLOR_TEAL,
    },
    {
      label: "Conciliaciones",
      value: formatearNumero(resumen?.totalConciliaciones),
      sublabel: "Documentos",
      color: COLOR_BLUE,
    },
    {
      label: "Importe Total",
      value: formatearMonedaCorta(resumen?.totalImporte),
      sublabel: formatearMoneda(resumen?.totalImporte),
      color: COLOR_ORANGE,
    },
    {
      label: "Horas de Renta",
      value: formatearNumero(resumen?.totalHorasRenta, 1),
      sublabel: "Horas acumuladas",
      color: COLOR_GREEN,
    },
    {
      label: "Días de Renta",
      value: formatearNumero(resumen?.totalDiasRenta, 1),
      sublabel: "Días acumulados",
      color: COLOR_AMBER,
    },
  ];
  yPos = dibujarKpis(doc, yPos, kpis);

  // ── Comparativa vs periodo anterior ──
  yPos = dibujarComparativa(doc, yPos, comparativaPeriodoAnterior, periodoAnteriorLabel);

  // ── Tabla material ──
  yPos = checkPageBreak(doc, yPos, 20, PAGE_HEIGHT, MARGIN_BOTTOM);
  yPos = dibujarTablaMaterial(doc, yPos, tablaObraMaterial, totalesTablaObra, periodoTablasLabel);

  // ── Tabla renta ──
  if (tablaRentaPorObra.length > 0) {
    yPos = checkPageBreak(doc, yPos, 20, PAGE_HEIGHT, MARGIN_BOTTOM);
    yPos = dibujarTablaRenta(doc, yPos, tablaRentaPorObra, totalesRenta, periodoTablasLabel);
  }

  // ── Datos destacados ──
  const destacados = [];
  if (horaPico) destacados.push({ label: "Hora Pico de Registro", value: `${horaPico.label} · ${formatearNumero(horaPico.viajes)} viajes` });
  if (topResidente) destacados.push({ label: "Top Residente (creador de vales)", value: `${topResidente.nombre} · ${formatearNumero(topResidente.vales)} vales · ${formatearNumero(topResidente.m3Total, 1)} m³` });
  if (topChecador) destacados.push({ label: "Top Checador (registra viajes)", value: `${topChecador.nombre} · ${formatearNumero(topChecador.viajes)} viajes · ${formatearNumero(topChecador.m3Total, 1)} m³` });
  if (topPlaca) destacados.push({ label: "Top Placa por Actividad", value: `${topPlaca.placas} (${topPlaca.operador}) · ${formatearNumero(topPlaca.viajes)} viajes` });
  if (mejorRendimiento) destacados.push({ label: "Mejor Rendimiento", value: `${mejorRendimiento.materialFull} · ${formatearNumero(mejorRendimiento.m3PorViaje, 2)} m³/viaje` });

  if (destacados.length > 0) {
    yPos = checkPageBreak(doc, yPos, 20, PAGE_HEIGHT, MARGIN_BOTTOM);
    dibujarDatosDestacados(doc, yPos, destacados);
  }

  // ── Control de presupuesto (siempre en página nueva) ──
  doc.addPage();
  yPos = 12;
  dibujarPresupuestos(doc, yPos, presupuestosMaterial, presupuestosRenta, hayAlertaPresupuesto);

  dibujarPieDePagina(doc, ultimaConciliacion);

  const nombreArchivo = `Reporte_Estadisticas_${periodoLabel.replace(/[^\w-]+/g, "_")}_${new Date()
    .toISOString()
    .substring(0, 10)
    .replace(/-/g, "")}.pdf`;

  doc.save(nombreArchivo);
};
