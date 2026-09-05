/**
 * src/utils/exportarReporteEstadisticas.js
 *
 * Genera el reporte PDF de Estadísticas Globales (KPIs, comparativa vs
 * periodo anterior, material movido por obra, renta por obra, control
 * de presupuesto, datos destacados e indicadores de eficiencia/oportunidad)
 * respetando los filtros activos de la página.
 *
 * Dependencias: jspdf, ./conciliaciones/pdfHelpers (checkPageBreak),
 * ./interpretacionIndicadores (textos de los indicadores de eficiencia,
 * compartidos con EstadisticasGlobales.jsx para no decir cosas distintas)
 * Usado en: EstadisticasGlobales.jsx
 */

// 1. jsPDF
import { jsPDF } from "jspdf";

// 2. Utils
import { checkPageBreak } from "./conciliaciones/pdfHelpers";
import {
  INDICE_POSICION_OBRA,
  FLETE_EVITADO_FLOTA_PROPIA,
  VIABILIDAD_FLOTA_PROPIA,
  RENTA_NO_APROVECHADA,
} from "./interpretacionIndicadores";

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

// ── Ahorro vs. proceso anterior en papel ─────────────────────────────
// El cálculo (costo viejo de talonario vs. costo nuevo de ticket térmico)
// ya viene resuelto en `ahorroEstimado` desde useEstadisticasGlobales.js —
// aquí solo se arma el vínculo al QR de cada conciliación.
const BASE_URL_CONCILIACION = "https://web-acarreos.vercel.app"; // mismo dominio que el QR de conciliaciones

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

const formatearMesCorto = (mesKey) => {
  if (!mesKey) return "";
  const [year, month] = mesKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "").toUpperCase();
};

// `fecha_inicio`/`fecha_fin` de conciliaciones son DATE puro ("2026-08-20"),
// sin componente de hora: new Date() lo interpreta como medianoche UTC y,
// al convertir a America/Mexico_City, cae un día antes. Se fuerza mediodía
// local antes de construir el Date (mismo patrón que "Timestamps y zonas
// horarias" en el CLAUDE.md raíz).
const formatearFechaSolo = (fechaISO) => {
  if (!fechaISO) return "—";
  return new Date(`${fechaISO.substring(0, 10)}T12:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

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

// ── Agrupar materiales por tipo (Pétreos / Base Asfáltica / Tepetate-Corte) ──
const ORDEN_TIPOS_MATERIAL = [1, 2, 3];
const NOMBRE_TIPO_FALLBACK = { 1: "Materiales Pétreos", 2: "Base Asfáltica", 3: "Tepetate / Corte" };

const agruparMaterialesPorTipo = (materiales) => {
  const grupos = {};
  materiales.forEach((m) => {
    const key = m.tipoId ?? "sin-tipo";
    if (!grupos[key]) {
      grupos[key] = {
        tipoId: m.tipoId ?? null,
        tipoNombre: m.tipoNombre || NOMBRE_TIPO_FALLBACK[m.tipoId] || "Sin clasificar",
        items: [],
      };
    }
    grupos[key].items.push(m);
  });
  return Object.values(grupos).sort((a, b) => {
    const ia = a.tipoId != null ? ORDEN_TIPOS_MATERIAL.indexOf(a.tipoId) : -1;
    const ib = b.tipoId != null ? ORDEN_TIPOS_MATERIAL.indexOf(b.tipoId) : -1;
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
};

// ── Agrupar filas de presupuesto por obra ────────────────────────────
const agruparPresupuestoPorObra = (arr) => {
  const obraMap = {};
  arr.forEach((p) => {
    const obraId = p.obras?.id_obra ?? formatearObraCompleta(p.obras?.empresas?.empresa, p.obras?.cc, p.obras?.obra);
    if (!obraMap[obraId]) {
      obraMap[obraId] = {
        empresa: p.obras?.empresas?.empresa || null,
        cc: p.obras?.cc ?? null,
        obra: p.obras?.obra || "Sin obra",
        items: [],
      };
    }
    obraMap[obraId].items.push(p);
  });
  return Object.values(obraMap).sort((a, b) =>
    formatearObraCompleta(a.empresa, a.cc, a.obra).localeCompare(formatearObraCompleta(b.empresa, b.cc, b.obra))
  );
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
    } else if (opts.fillTipo) {
      setFill(doc, "#F5F7FA");
      doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
    } else if (rowIndex % 2 === 1) {
      setFill(doc, COLOR_ROW_ALT);
      doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
    }

    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.sub ? 7 : 8);
    if (opts.tipoHeader || opts.sub) setTextColor(doc, COLOR_GRAY);
    let x = MARGIN_LEFT;
    columnas.forEach((col, i) => {
      const textX = col.align === "right" ? x + col.width - 2 : x + 2;
      if (i === 0 && opts.span) {
        doc.text(ajustarTexto(doc, cells[0], USABLE_WIDTH - 4), MARGIN_LEFT + (opts.indent ?? 2), yPos + 4.2);
      } else {
        const raw = String(cells[i] ?? "");
        const texto = col.align === "left" ? ajustarTexto(doc, raw, col.width - 4) : raw;
        doc.text(texto, textX, yPos + 4.2, { align: col.align === "right" ? "right" : "left" });
      }
      x += col.width;
    });
    if (opts.tipoHeader || opts.sub) setTextColor(doc, COLOR_TEXT);

    yPos += rowHeight;
    rowIndex += 1;
  };

  tablaObraMaterial.forEach((obraRow) => {
    const obraLabel = formatearObraCompleta(obraRow.empresa, obraRow.cc, obraRow.obra);
    drawRow([obraLabel, "", "", "", ""], { fillHeader: true, bold: true, span: true });

    const gruposPorTipo = agruparMaterialesPorTipo(obraRow.materiales);
    gruposPorTipo.forEach((grupo) => {
      drawRow([grupo.tipoNombre.toUpperCase(), "", "", "", ""], {
        fillTipo: true, bold: true, span: true, tipoHeader: true, indent: 4,
      });
      grupo.items.forEach((mat) => {
        drawRow([
          `  ${mat.material}`,
          `${formatearNumero(mat.m3Total, 2)} m³`,
          formatearNumero(mat.valesCount),
          formatearNumero(mat.totalViajes),
          formatearMoneda(mat.importeIVA),
        ], { sub: true });
      });
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

// ── Gráfica: barras horizontales de m³ por banco ─────────────────────
// No existe otro tipo de gráfica de barras en este archivo (solo mini line
// charts) — mismo lenguaje visual que dibujarKpis/dibujarComparativa.
const dibujarBarrasBancos = (doc, x, yPosInicial, width, bancos, colorHex, maxBarras = 8) => {
  const datos = (bancos || []).slice(0, maxBarras);
  if (datos.length === 0) return yPosInicial;

  let yPos = yPosInicial;
  const maxVal = Math.max(...datos.map((b) => b.m3Total), 1);
  const labelWidth = 38;
  const barAreaWidth = width - labelWidth - 22;
  const barHeight = 4.5;
  const gap = 1.8;

  datos.forEach((b) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    setTextColor(doc, COLOR_TEXT);
    doc.text(ajustarTexto(doc, b.banco, labelWidth - 2), x, yPos + barHeight - 1);

    const barW = Math.max((b.m3Total / maxVal) * barAreaWidth, 0.5);
    setFill(doc, "#E8EEF4");
    doc.rect(x + labelWidth, yPos, barAreaWidth, barHeight, "F");
    setFill(doc, colorHex);
    doc.rect(x + labelWidth, yPos, barW, barHeight, "F");

    doc.setFontSize(6.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text(`${formatearNumero(b.m3Total, 1)} m³`, x + labelWidth + barAreaWidth + 2, yPos + barHeight - 1);

    yPos += barHeight + gap;
  });

  setTextColor(doc, COLOR_TEXT);
  return yPos + 2;
};

// ── Tabla: Material por Banco (distancia, precio/m³ e importe, agrupado
// por tipo de material) ───────────────────────────────────────────────
// Banco/distancia/precio/costo ya vienen resueltos por viaje con el patrón
// viaje.*_override ?? viaje.* ?? detalle.* (ver agregarBancoMaterialReal en
// useEstadisticasGlobales.js) — esta función solo dibuja lo que recibe.
const dibujarSeccionBancoMaterial = (doc, yPosInicial, tablaBancoMaterial) => {
  let yPos = dibujarTituloSeccion(doc, yPosInicial, "Material por Banco");

  const columnas = [
    { label: "BANCO", width: 55, align: "left" },
    { label: "M³ TOTAL", width: 25, align: "right" },
    { label: "VIAJES", width: 20, align: "right" },
    { label: "DIST. PROM (KM)", width: 30, align: "right" },
    { label: "PRECIO PROM/M³", width: 30, align: "right" },
    { label: "IMPORTE + IVA", width: 25, align: "right" },
  ];

  if (!tablaBancoMaterial || tablaBancoMaterial.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text("Sin datos de banco para los filtros seleccionados.", MARGIN_LEFT, yPos + 5);
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
    doc.setFontSize(opts.sub ? 7 : 8);
    if (opts.sub) setTextColor(doc, COLOR_GRAY);
    let x = MARGIN_LEFT;
    columnas.forEach((col, i) => {
      const textX = col.align === "right" ? x + col.width - 2 : x + 2;
      if (i === 0 && opts.span) {
        doc.text(ajustarTexto(doc, cells[0], USABLE_WIDTH - 4), MARGIN_LEFT + (opts.indent ?? 2), yPos + 4.2);
      } else {
        const raw = String(cells[i] ?? "");
        const texto = col.align === "left" ? ajustarTexto(doc, raw, col.width - 4) : raw;
        doc.text(texto, textX, yPos + 4.2, { align: col.align === "right" ? "right" : "left" });
      }
      x += col.width;
    });
    if (opts.sub) setTextColor(doc, COLOR_TEXT);

    yPos += rowHeight;
    rowIndex += 1;
  };

  const totalGeneral = { viajes: 0, m3Total: 0, importeIVA: 0 };
  const chartRowHeight = 4.5 + 1.8;
  const alturaGraficaDe = (grupo) => Math.min(grupo.bancos.length, 8) * chartRowHeight + 4;
  const filasBancosDe = (grupo) =>
    grupo.bancos.reduce((acc, b) => acc + 1 + b.materiales.length, 0);

  tablaBancoMaterial.forEach((grupo) => {
    // Reservar el espacio de la tabla del grupo (header + bancos + desglose
    // de materiales + subtotal) más su gráfica como un solo bloque, para que
    // no se separen en páginas distintas (la gráfica quedaría huérfana, sin
    // la tabla que la explica).
    const alturaGrupo =
      rowHeight * (1 + filasBancosDe(grupo) + (grupo.bancos.length > 1 ? 1 : 0)) +
      4 + alturaGraficaDe(grupo) + 4;
    yPos = checkPageBreak(doc, yPos, alturaGrupo, PAGE_HEIGHT, MARGIN_BOTTOM);
    if (yPos === 12) {
      yPos = dibujarEncabezadoColumnas(doc, yPos, columnas);
    }

    drawRow([grupo.tipoNombre.toUpperCase(), "", "", "", "", ""], {
      fillHeader: true, bold: true, span: true,
    });

    grupo.bancos.forEach((b) => {
      drawRow([
        `  ${b.banco}`,
        `${formatearNumero(b.m3Total, 2)} m³`,
        formatearNumero(b.viajes),
        formatearNumero(b.distanciaKmProm, 1),
        formatearMoneda(b.precioM3Prom),
        formatearMoneda(b.importeIVA),
      ], { bold: true });

      b.materiales.forEach((m) => {
        drawRow([
          `      ${m.material}`,
          `${formatearNumero(m.m3Total, 2)} m³`,
          formatearNumero(m.viajes),
          formatearNumero(m.distanciaKmProm, 1),
          formatearMoneda(m.precioM3Prom),
          formatearMoneda(m.importeIVA),
        ], { sub: true });
      });
    });

    if (grupo.bancos.length > 1) {
      drawRow([
        "  Subtotal",
        `${formatearNumero(grupo.subtotal.m3Total, 2)} m³`,
        formatearNumero(grupo.subtotal.viajes),
        "",
        "",
        formatearMoneda(grupo.subtotal.importeIVA),
      ], { fillSubtotal: true, bold: true });
    }

    totalGeneral.viajes += grupo.subtotal.viajes;
    totalGeneral.m3Total += grupo.subtotal.m3Total;
    totalGeneral.importeIVA += grupo.subtotal.importeIVA;

    // Gráfica de m³ por banco de este tipo, debajo de su tabla (el bloque
    // completo ya se reservó arriba, este checkPageBreak es solo por si la
    // estimación de alturaGrupo se quedó corta).
    yPos = checkPageBreak(doc, yPos, alturaGraficaDe(grupo), PAGE_HEIGHT, MARGIN_BOTTOM);
    yPos += 2;
    const colorIdx = grupo.tipoId != null ? ORDEN_TIPOS_MATERIAL.indexOf(grupo.tipoId) : -1;
    yPos = dibujarBarrasBancos(
      doc, MARGIN_LEFT, yPos, USABLE_WIDTH, grupo.bancos,
      COLORES_MATERIALES_PDF[(colorIdx === -1 ? 0 : colorIdx) % COLORES_MATERIALES_PDF.length]
    );
    yPos += 2;
  });

  drawRow([
    "TOTAL",
    `${formatearNumero(totalGeneral.m3Total, 2)} m³`,
    formatearNumero(totalGeneral.viajes),
    "",
    "",
    formatearMoneda(totalGeneral.importeIVA),
  ], { fillHeader: true, bold: true });

  yPos += 6;
  yPos = dibujarTablaTarifasBanco(doc, yPos, tablaBancoMaterial);

  return yPos;
};

// ── Tabla: Tarifas por KM por Banco (por banco, agrupado por tipo de
// material; una fila por tarifa realmente usada en el periodo — puede haber
// más de una por banco si surte varios materiales o si la tarifa cambió
// dentro del rango del reporte) ───────────────────────────────────────
// Solo se muestran 1er km y tarifa subsecuente (el resto de los tramos de
// precios_material casi no se usa). Solo incluye tarifas de sindicato CTM
// (SINDICATO_TARIFAS_REPORTE en useEstadisticasGlobales.js) — otros
// sindicatos (p.ej. datos de prueba) se omiten de esta tabla.
const dibujarTablaTarifasBanco = (doc, yPosInicial, tablaBancoMaterial) => {
  let yPos = dibujarTituloSeccion(doc, yPosInicial, "Tarifas por KM por Banco (Sindicato CTM)");

  const columnas = [
    { label: "BANCO", width: 85, align: "left" },
    { label: "1ER KM ($/M³)", width: 50, align: "right" },
    { label: "TARIFA SUBSECUENTE", width: 50, align: "right" },
  ];

  const grupos = (tablaBancoMaterial || [])
    .map((grupo) => ({ ...grupo, bancos: grupo.bancos.filter((b) => b.tarifas.length > 0) }))
    .filter((grupo) => grupo.bancos.length > 0);

  if (grupos.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text("Sin datos de tarifas para los filtros seleccionados.", MARGIN_LEFT, yPos + 5);
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
    } else if (rowIndex % 2 === 1) {
      setFill(doc, COLOR_ROW_ALT);
      doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
    }

    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.bold ? 8 : 7.5);
    if (opts.span) {
      doc.text(ajustarTexto(doc, cells[0], USABLE_WIDTH - 4), MARGIN_LEFT + 2, yPos + 4.2);
    } else {
      let x = MARGIN_LEFT;
      columnas.forEach((col, i) => {
        const textX = col.align === "right" ? x + col.width - 2 : x + 2;
        const raw = String(cells[i] ?? "");
        const texto = col.align === "left" ? ajustarTexto(doc, raw, col.width - 4) : raw;
        doc.text(texto, textX, yPos + 4.2, { align: col.align === "right" ? "right" : "left" });
        x += col.width;
      });
    }

    yPos += rowHeight;
    rowIndex += 1;
  };

  grupos.forEach((grupo) => {
    drawRow([grupo.tipoNombre.toUpperCase()], { fillHeader: true, bold: true, span: true });

    grupo.bancos.forEach((b) => {
      b.tarifas.forEach((t, i) => {
        drawRow([
          i === 0 ? `  ${b.banco}` : "",
          t.primer_km != null ? formatearMoneda(t.primer_km) : "—",
          t.km_sub_int1 != null ? formatearMoneda(t.km_sub_int1) : "—",
        ]);
      });
    });
  });

  return yPos + 6;
};

// ── Tabla: Renta de Equipo — Precio por Viaje y m³ ───────────────────
// Usa tablaViajesRentaPorEquipo (obra → equipo, con precio derivado de la
// capacidad del vehículo — ver derivarPrecioRenta en useEstadisticasGlobales).
// m³ Aprox. Acarreado = viajes × capacidad promedio del vehículo: no existe
// volumen capturado en BD para renta, es una estimación para dimensionar el
// movimiento de material transportado en equipo rentado.
const dibujarTablaRentaPrecios = (doc, yPosInicial, tablaViajesRentaPorEquipo) => {
  const filas = (tablaViajesRentaPorEquipo || []).filter((obraRow) => obraRow.equipos?.length > 0);
  if (filas.length === 0) return yPosInicial;

  let yPos = dibujarTituloSeccion(doc, yPosInicial, "Renta de Equipo — Precio por Viaje y m³");

  const columnas = [
    { label: "EQUIPO", width: 45, align: "left" },
    { label: "VIAJES", width: 20, align: "right" },
    { label: "CAP. PROM.", width: 30, align: "right" },
    { label: "PRECIO / VIAJE", width: 35, align: "right" },
    { label: "PRECIO APROX. /M³", width: 30, align: "right" },
    { label: "M³ APROX.", width: 25, align: "right" },
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
        doc.text(ajustarTexto(doc, cells[0], USABLE_WIDTH - 4), MARGIN_LEFT + (opts.indent ?? 2), yPos + 4.2);
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

  const totalesGeneral = { viajes: 0, capacidadSuma: 0, capacidadCount: 0, importeTotal: 0, m3Aprox: 0 };

  filas.forEach((obraRow) => {
    drawRow([formatearObraCompleta(obraRow.empresa, obraRow.cc, obraRow.obra), "", "", "", "", ""], {
      fillHeader: true, bold: true, span: true,
    });

    obraRow.equipos.forEach((eq) => {
      const m3Aprox = eq.capacidadPromedio != null ? eq.viajes * eq.capacidadPromedio : null;
      drawRow([
        `  ${eq.equipo}`,
        formatearNumero(eq.viajes),
        eq.capacidadPromedio != null ? `${formatearNumero(eq.capacidadPromedio, 2)} m³` : "—",
        eq.importePorViaje != null ? formatearMoneda(eq.importePorViaje) : "—",
        eq.precioAproxM3 != null ? formatearMoneda(eq.precioAproxM3) : "—",
        m3Aprox != null ? `${formatearNumero(m3Aprox, 2)} m³` : "—",
      ]);
      totalesGeneral.viajes += eq.viajes;
      totalesGeneral.capacidadSuma += eq.capacidadSuma || 0;
      totalesGeneral.capacidadCount += eq.capacidadCount || 0;
      totalesGeneral.importeTotal += eq.importeTotal || 0;
      if (m3Aprox != null) totalesGeneral.m3Aprox += m3Aprox;
    });

    if (obraRow.equipos.length > 1) {
      const sub = obraRow.subtotal;
      const subM3Aprox = sub.capacidadPromedio != null ? sub.viajes * sub.capacidadPromedio : null;
      drawRow([
        "  Subtotal",
        formatearNumero(sub.viajes),
        sub.capacidadPromedio != null ? `${formatearNumero(sub.capacidadPromedio, 2)} m³` : "—",
        sub.importePorViaje != null ? formatearMoneda(sub.importePorViaje) : "—",
        sub.precioAproxM3 != null ? formatearMoneda(sub.precioAproxM3) : "—",
        subM3Aprox != null ? `${formatearNumero(subM3Aprox, 2)} m³` : "—",
      ], { fillSubtotal: true, bold: true });
    }
  });

  const capPromGeneral = totalesGeneral.capacidadCount > 0 ? totalesGeneral.capacidadSuma / totalesGeneral.capacidadCount : null;
  const precioViajeGeneral = totalesGeneral.viajes > 0 ? totalesGeneral.importeTotal / totalesGeneral.viajes : null;
  const precioM3General = precioViajeGeneral != null && capPromGeneral ? precioViajeGeneral / capPromGeneral : null;
  drawRow([
    "TOTAL",
    formatearNumero(totalesGeneral.viajes),
    capPromGeneral != null ? `${formatearNumero(capPromGeneral, 2)} m³` : "—",
    precioViajeGeneral != null ? formatearMoneda(precioViajeGeneral) : "—",
    precioM3General != null ? formatearMoneda(precioM3General) : "—",
    `${formatearNumero(totalesGeneral.m3Aprox, 2)} m³`,
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
      { label: "MATERIAL", width: 72, align: "left" },
      { label: "CONSUMIDO m³", width: 38, align: "right" },
      { label: "PRESUPUESTADO m³", width: 38, align: "right" },
      { label: "% USO", width: 37, align: "right" },
    ];
    yPos = dibujarEncabezadoColumnas(doc, yPos, columnasMat);

    let rowIndexMat = 0;
    const drawFilaMat = (cells, opts = {}) => {
      yPos = checkPageBreak(doc, yPos, rowHeight, PAGE_HEIGHT, MARGIN_BOTTOM);
      if (yPos === 12) {
        yPos = dibujarEncabezadoColumnas(doc, yPos, columnasMat);
      }
      if (opts.fillHeader) {
        setFill(doc, "#E8EEF4");
        doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
      } else if (opts.fillTipo) {
        setFill(doc, "#F5F7FA");
        doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
      } else if (rowIndexMat % 2 === 1) {
        setFill(doc, COLOR_ROW_ALT);
        doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
      }

      doc.setFont("helvetica", opts.bold ? "bold" : "normal");
      doc.setFontSize(8);
      if (opts.tipoHeader) setTextColor(doc, COLOR_GRAY);
      let x = MARGIN_LEFT;
      columnasMat.forEach((col, i) => {
        const textX = col.align === "right" ? x + col.width - 2 : x + 2;
        if (i === 0 && opts.span) {
          doc.text(ajustarTexto(doc, cells[0], USABLE_WIDTH - 4), MARGIN_LEFT + (opts.indent ?? 2), yPos + 4.2);
        } else {
          if (opts.pctIndex === i) {
            setTextColor(doc, opts.pctColor);
            doc.setFont("helvetica", "bold");
          }
          const raw = String(cells[i] ?? "");
          const texto = col.align === "left" ? ajustarTexto(doc, raw, col.width - 4) : raw;
          doc.text(texto, textX, yPos + 4.2, { align: col.align === "right" ? "right" : "left" });
          if (opts.pctIndex === i) {
            setTextColor(doc, opts.tipoHeader ? COLOR_GRAY : COLOR_TEXT);
            doc.setFont("helvetica", opts.bold ? "bold" : "normal");
          }
        }
        x += col.width;
      });
      if (opts.tipoHeader) setTextColor(doc, COLOR_TEXT);

      yPos += rowHeight;
      rowIndexMat += 1;
    };

    const presupuestosConTipo = presupuestosMaterialUsados.map((p) => ({
      ...p,
      tipoId: p.material?.tipo_de_material?.id_tipo_de_material ?? null,
      tipoNombre: p.material?.tipo_de_material?.tipo_de_material || null,
    }));

    agruparPresupuestoPorObra(presupuestosConTipo).forEach((obraGrupo) => {
      drawFilaMat([formatearObraCompleta(obraGrupo.empresa, obraGrupo.cc, obraGrupo.obra), "", "", ""], {
        fillHeader: true, bold: true, span: true,
      });

      agruparMaterialesPorTipo(obraGrupo.items).forEach((grupoTipo) => {
        drawFilaMat([grupoTipo.tipoNombre.toUpperCase(), "", "", ""], {
          fillTipo: true, bold: true, span: true, tipoHeader: true, indent: 4,
        });

        grupoTipo.items.forEach((p) => {
          const sem = calcularSemaforo(p.m3_consumidos, p.m3_presupuestados);
          drawFilaMat([
            `  ${p.material?.material || "—"}`,
            `${formatearNumero(p.m3_consumidos, 1)} m³`,
            `${formatearNumero(p.m3_presupuestados, 1)} m³`,
            sem.pctLabel,
          ], { pctIndex: 3, pctColor: sem.color });
        });
      });
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

// ── Mini gráfica de línea (Material vs Tiempo, small multiples) ────────
const COLORES_MATERIALES_PDF = [COLOR_ORANGE, COLOR_BLUE, COLOR_GREEN, COLOR_AMBER, "#8B5CF6"];

const dibujarMiniLineChart = (doc, x, y, width, height, titulo, valores, meses, colorHex, modo = "m3", formatearValorPersonalizado = null) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setTextColor(doc, COLOR_TEXT);
  doc.text(ajustarTexto(doc, titulo, width - 4), x + 2, y + 5);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(x, y, width, height);

  const maxVal = Math.max(...valores, 0);
  const chartX = x + 13;
  const chartY = y + 14;
  const chartW = width - 17;
  const chartH = height - 26;

  if (maxVal <= 0 || meses.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text("Sin datos en el periodo", x + width / 2, y + height / 2, { align: "center" });
    setTextColor(doc, COLOR_TEXT);
    return;
  }

  const decimales = modo === "viajes" ? 0 : (maxVal >= 10 ? 0 : 1);
  const fmt = formatearValorPersonalizado || ((v) => formatearNumero(v, decimales));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  setTextColor(doc, COLOR_GRAY);
  doc.text(fmt(maxVal), chartX - 2, chartY + 1.5, { align: "right" });
  doc.text(fmt(0), chartX - 2, chartY + chartH, { align: "right" });

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.15);
  doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);

  const n = meses.length;
  const stepX = n > 1 ? chartW / (n - 1) : 0;
  const puntos = valores.map((v, i) => ({
    px: chartX + (n > 1 ? i * stepX : chartW / 2),
    py: chartY + chartH - (Math.max(v, 0) / maxVal) * chartH,
    v,
  }));

  const { r, g, b } = hexToRgb(colorHex);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.5);
  for (let i = 0; i < puntos.length - 1; i++) {
    doc.line(puntos[i].px, puntos[i].py, puntos[i + 1].px, puntos[i + 1].py);
  }
  setFill(doc, colorHex);
  puntos.forEach((p) => doc.circle(p.px, p.py, 0.55, "F"));

  // Etiqueta de valor en cada punto — arriba si hay espacio, si no abajo
  // para no salirse del marco cuando el punto está pegado al techo.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.8);
  setTextColor(doc, COLOR_TEXT);
  puntos.forEach((p) => {
    const hayEspacioArriba = p.py - chartY > 3.5;
    const labelY = hayEspacioArriba ? p.py - 1.6 : p.py + 3.6;
    doc.text(fmt(p.v), p.px, labelY, { align: "center" });
  });

  // Etiquetas de mes: todas, no solo la primera y la última. Si hay muchos
  // meses se saltan algunos para que no se encimen, conservando siempre el
  // primero y el último.
  const pasoMes = n > 6 ? Math.ceil(n / 6) : 1;
  doc.setFontSize(5);
  setTextColor(doc, COLOR_GRAY);
  meses.forEach((mes, i) => {
    if (i !== 0 && i !== n - 1 && i % pasoMes !== 0) return;
    const align = i === 0 ? "left" : i === n - 1 ? "right" : "center";
    doc.text(formatearMesCorto(mes), puntos[i].px, chartY + chartH + 4.5, { align });
  });

  setTextColor(doc, COLOR_TEXT);
};

// ── Sección: Material vs Tiempo (una mini gráfica por material, agrupada
// por tipo — Pétreos / Base Asfáltica / Tepetate-Corte, igual que la tabla
// de Material Movido por Obra) ───────────────────────────────────────
const dibujarSeccionMaterialVsTiempo = (doc, yPosInicial, seriesTiempo, modo) => {
  const { data, dataViajes, gruposTipoMateriales } = seriesTiempo || {};
  const fuente = modo === "viajes" ? dataViajes : data;
  const meses = (fuente || []).map((row) => row.mes);

  if (!gruposTipoMateriales || gruposTipoMateriales.length === 0 || meses.length === 0) return yPosInicial;

  const unidadLabel = modo === "viajes" ? "Viajes por Mes" : "m³ por Mes";
  let yPos = dibujarTituloSeccion(doc, yPosInicial, `Material vs Tiempo — ${unidadLabel}`);

  const cols = 2;
  const gap = 4;
  const chartWidth = (USABLE_WIDTH - gap * (cols - 1)) / cols;
  const chartHeight = 44;
  const alturaEncabezadoTipo = 9;

  gruposTipoMateriales.forEach((grupo) => {
    yPos = checkPageBreak(doc, yPos, alturaEncabezadoTipo + chartHeight + gap, PAGE_HEIGHT, MARGIN_BOTTOM);

    setFill(doc, "#F5F7FA");
    doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text(grupo.tipoNombre.toUpperCase(), MARGIN_LEFT + 2, yPos + 4.2);
    setTextColor(doc, COLOR_TEXT);
    yPos += alturaEncabezadoTipo;

    for (let i = 0; i < grupo.materiales.length; i += cols) {
      const filaMateriales = grupo.materiales.slice(i, i + cols);
      yPos = checkPageBreak(doc, yPos, chartHeight + gap, PAGE_HEIGHT, MARGIN_BOTTOM);

      filaMateriales.forEach((mat, colIdx) => {
        const x = MARGIN_LEFT + colIdx * (chartWidth + gap);
        const idxEnGrupo = grupo.materiales.indexOf(mat);
        const valores = fuente.map((row) => Number(row[mat] || 0));
        dibujarMiniLineChart(
          doc, x, yPos, chartWidth, chartHeight, mat, valores, meses,
          COLORES_MATERIALES_PDF[idxEnGrupo % COLORES_MATERIALES_PDF.length], modo
        );
      });

      yPos += chartHeight + gap;
    }

    yPos += 2;
  });

  return yPos + 4;
};

// ── Sección: Tendencias — Importe Gastado y Camiones Rentados por Mes ──
// Ignoran el filtro mes/semana (igual que Material vs Tiempo) para mostrar
// la evolución histórica completa.
const dibujarSeccionTendencias = (doc, yPosInicial, seriesImporteTiempo, seriesCamionesRentaTiempo) => {
  const dataImporte = seriesImporteTiempo?.data || [];
  const dataCamiones = seriesCamionesRentaTiempo?.data || [];
  if (dataImporte.length === 0 && dataCamiones.length === 0) return yPosInicial;

  let yPos = dibujarTituloSeccion(doc, yPosInicial, "Tendencias — Importe Gastado y Renta de Equipo");

  const chartHeight = 48;

  if (dataImporte.length > 0) {
    yPos = checkPageBreak(doc, yPos, chartHeight + 4, PAGE_HEIGHT, MARGIN_BOTTOM);
    dibujarMiniLineChart(
      doc, MARGIN_LEFT, yPos, USABLE_WIDTH, chartHeight,
      "Importe Gastado en Renta de Equipo por Mes",
      dataImporte.map((d) => d.importeRenta),
      dataImporte.map((d) => d.mes),
      COLOR_ORANGE, "importe", formatearMonedaCorta
    );
    yPos += chartHeight + 6;
  }

  if (dataCamiones.length > 0) {
    yPos = checkPageBreak(doc, yPos, chartHeight + 4, PAGE_HEIGHT, MARGIN_BOTTOM);
    dibujarMiniLineChart(
      doc, MARGIN_LEFT, yPos, USABLE_WIDTH, chartHeight,
      "Camiones Rentados por Mes",
      dataCamiones.map((d) => d.camiones),
      dataCamiones.map((d) => d.mes),
      COLOR_GREEN, "viajes"
    );
    yPos += chartHeight + 6;
  }

  return yPos + 2;
};

// ── Tabla de conciliaciones vinculadas, agrupada por material ──────────
// Antes solo se listaban los números de conciliación como vínculos sueltos;
// ahora cada fila trae el detalle que explica ese importe (periodo, m³,
// vales, viajes) y un link de soporte que abre la misma página pública a la
// que lleva el QR de esa conciliación. `label` es el nombre del material
// (null para omitir el subtítulo, caso "Renta" que no se subdivide por
// material). El importe de material ya viene recalculado por material (no
// es el subtotal completo de la conciliación) — ver conciliacionesPorObraTipo
// en useEstadisticasGlobales.js. ───────────────────────────────────────
const COLUMNAS_TABLA_CONCILIACIONES = [
  { key: "numero", label: "#", width: 7, align: "left" },
  { key: "periodo", label: "PERIODO", width: 33, align: "left" },
  { key: "importe", label: "IMPORTE", width: 27, align: "right" },
  { key: "totalFinal", label: "IMPORTE C/IVA-RET.", width: 30, align: "right" },
  { key: "m3", label: "M³", width: 22, align: "right" },
  { key: "vales", label: "VALES", width: 16, align: "right" },
  { key: "viajes", label: "VIAJES", width: 18, align: "right" },
  { key: "link", label: "SOPORTE", width: 22, align: "left" },
];

const dibujarEncabezadoTablaConciliaciones = (doc, yPos) => {
  setFill(doc, "#E8EEF4");
  doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  setTextColor(doc, COLOR_SECONDARY);
  let x = MARGIN_LEFT;
  COLUMNAS_TABLA_CONCILIACIONES.forEach((col) => {
    const textX = col.align === "right" ? x + col.width - 1.5 : x + 1.5;
    doc.text(col.label, textX, yPos + 3.8, { align: col.align === "right" ? "right" : "left" });
    x += col.width;
  });
  setTextColor(doc, COLOR_TEXT);
  return yPos + 5.5;
};

const dibujarTablaConciliaciones = (doc, yPosInicial, label, items) => {
  if (!items || items.length === 0) return yPosInicial;

  const rowHeight = 5;
  const alturaLabel = label ? 5 : 0;
  let yPos = checkPageBreak(doc, yPosInicial, alturaLabel + 5.5 + rowHeight * 2, PAGE_HEIGHT, MARGIN_BOTTOM);

  if (label) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    setTextColor(doc, COLOR_GRAY);
    doc.text(label, MARGIN_LEFT + 2, yPos);
    setTextColor(doc, COLOR_TEXT);
    yPos += alturaLabel;
  }

  yPos = dibujarEncabezadoTablaConciliaciones(doc, yPos);

  items.forEach((item, i) => {
    yPos = checkPageBreak(doc, yPos, rowHeight, PAGE_HEIGHT, MARGIN_BOTTOM);
    if (yPos === 12) {
      yPos = dibujarEncabezadoTablaConciliaciones(doc, yPos);
    }

    if (i % 2 === 1) {
      setFill(doc, COLOR_ROW_ALT);
      doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
    }

    const periodoTxt = item.fechaInicio && item.fechaFin
      ? `${formatearFechaSolo(item.fechaInicio)} - ${formatearFechaSolo(item.fechaFin)}`
      : formatearFechaCorte(item.fecha);
    const valores = {
      numero: String(item.numero),
      periodo: periodoTxt,
      importe: formatearMoneda(item.subtotal),
      totalFinal: formatearMoneda(item.totalFinal),
      m3: item.m3 != null ? `${formatearNumero(item.m3, 2)} m³` : "—",
      vales: formatearNumero(item.vales),
      viajes: formatearNumero(item.viajes),
      link: "Ver soporte",
    };

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    let x = MARGIN_LEFT;
    COLUMNAS_TABLA_CONCILIACIONES.forEach((col) => {
      const textX = col.align === "right" ? x + col.width - 1.5 : x + 1.5;
      const raw = valores[col.key];
      const texto = col.align === "left" ? ajustarTexto(doc, raw, col.width - 3) : raw;
      if (col.key === "link") {
        setTextColor(doc, COLOR_BLUE);
        doc.textWithLink(texto, textX, yPos + 3.5, {
          url: `${BASE_URL_CONCILIACION}/conciliacion/${item.folio}`,
        });
        setTextColor(doc, COLOR_TEXT);
      } else {
        doc.text(texto, textX, yPos + 3.5, { align: col.align === "right" ? "right" : "left" });
      }
      x += col.width;
    });

    yPos += rowHeight;
  });

  return yPos + 3;
};

// ── Sección: Ahorro Estimado vs. Proceso Anterior en Papel ────────────
const dibujarSeccionAhorro = (doc, yPosInicial, ahorroEstimado, serieConciliacionesPorMes, bloquesObraConciliaciones) => {
  if (!ahorroEstimado) return yPosInicial;

  let yPos = dibujarTituloSeccion(doc, yPosInicial, "Ahorro Estimado vs. Proceso Anterior en Papel");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setTextColor(doc, COLOR_GRAY);
  doc.text(
    "Comparación estimada: $2 por vale de papel (talonario) contra el costo real del ticket térmico impreso en campo. Conciliaciones: $1 por copia en papel evitada.",
    MARGIN_LEFT, yPos, { maxWidth: USABLE_WIDTH }
  );
  setTextColor(doc, COLOR_TEXT);
  yPos += 8;

  const kpis = [
    { label: "Ahorro Material", value: formatearMonedaCorta(ahorroEstimado.ahorroMaterial), sublabel: formatearMoneda(ahorroEstimado.ahorroMaterial), color: COLOR_TEAL },
    { label: "Ahorro Renta", value: formatearMonedaCorta(ahorroEstimado.ahorroRenta), sublabel: formatearMoneda(ahorroEstimado.ahorroRenta), color: COLOR_GREEN },
    { label: "Ahorro Conciliaciones", value: formatearMonedaCorta(ahorroEstimado.ahorroConciliaciones), sublabel: formatearMoneda(ahorroEstimado.ahorroConciliaciones), color: COLOR_AMBER },
    { label: "Ahorro Total", value: formatearMonedaCorta(ahorroEstimado.ahorroTotal), sublabel: formatearMoneda(ahorroEstimado.ahorroTotal), color: COLOR_ORANGE },
  ];
  yPos = dibujarKpis(doc, yPos, kpis);

  const dataConc = serieConciliacionesPorMes?.data || [];
  if (dataConc.length > 0) {
    const chartHeight = 48;
    yPos = checkPageBreak(doc, yPos, chartHeight + 4, PAGE_HEIGHT, MARGIN_BOTTOM);
    dibujarMiniLineChart(
      doc, MARGIN_LEFT, yPos, USABLE_WIDTH, chartHeight,
      "Conciliaciones Generadas por Mes",
      dataConc.map((d) => d.conciliaciones),
      dataConc.map((d) => d.mes),
      COLOR_BLUE, "viajes"
    );
    yPos += chartHeight + 6;
  }

  if (bloquesObraConciliaciones && bloquesObraConciliaciones.length > 0) {
    bloquesObraConciliaciones.forEach((bloque) => {
      yPos = checkPageBreak(doc, yPos, 14, PAGE_HEIGHT, MARGIN_BOTTOM);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setTextColor(doc, COLOR_SECONDARY);
      doc.text(`Conciliaciones — ${bloque.obraNombre}`, MARGIN_LEFT, yPos);
      setTextColor(doc, COLOR_TEXT);
      yPos += 6;

      const nombresTipos = Object.keys(bloque.grupos).sort((a, b) => {
        if (a === "Renta") return 1;
        if (b === "Renta") return -1;
        return a.localeCompare(b);
      });
      nombresTipos.forEach((tipoNombre) => {
        yPos = checkPageBreak(doc, yPos, 10, PAGE_HEIGHT, MARGIN_BOTTOM);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        setTextColor(doc, COLOR_GRAY);
        doc.text(tipoNombre.toUpperCase(), MARGIN_LEFT, yPos);
        setTextColor(doc, COLOR_TEXT);
        yPos += 5;

        const materiales = bloque.grupos[tipoNombre];
        const nombresMateriales = Object.keys(materiales).sort((a, b) => a.localeCompare(b));
        nombresMateriales.forEach((materialNombre) => {
          // "Renta" no se subdivide por material — su única clave repite el
          // nombre del tipo, así que se omite el subtítulo en ese caso.
          const label = materialNombre === tipoNombre ? null : materialNombre;
          yPos = dibujarTablaConciliaciones(doc, yPos, label, materiales[materialNombre]);
        });
        yPos += 2;
      });
      yPos += 3;
    });
  }

  return yPos;
};

// ── Párrafo con salto de línea automático (splitTextToSize de jsPDF) ────
const dibujarParrafo = (doc, x, yPosInicial, texto, maxWidth, opts = {}) => {
  const { fontSize = 7.5, color = COLOR_GRAY, lineHeight = 3.6 } = opts;
  let yPos = yPosInicial;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  setTextColor(doc, color);
  const lineas = doc.splitTextToSize(texto, maxWidth);
  lineas.forEach((linea) => {
    yPos = checkPageBreak(doc, yPos, lineHeight, PAGE_HEIGHT, MARGIN_BOTTOM);
    doc.text(linea, x, yPos);
    yPos += lineHeight;
  });
  setTextColor(doc, COLOR_TEXT);
  return yPos;
};

// ── Fila de chips KPI (label + valor), mismo lenguaje visual que
// dibujarComparativa pero sin delta/color por defecto — un color por chip
// es opcional (ej. nivel Alto/Medio/Bajo en rojo/ámbar/verde) ───────────
const dibujarChipsKpi = (doc, yPosInicial, chips) => {
  if (!chips || chips.length === 0) return yPosInicial;
  const gap = 3;
  const boxWidth = (USABLE_WIDTH - gap * (chips.length - 1)) / chips.length;
  const boxHeight = 14;
  let yPos = checkPageBreak(doc, yPosInicial, boxHeight + 2, PAGE_HEIGHT, MARGIN_BOTTOM);

  chips.forEach((chip, i) => {
    const x = MARGIN_LEFT + i * (boxWidth + gap);
    setFill(doc, COLOR_ROW_ALT);
    doc.roundedRect(x, yPos, boxWidth, boxHeight, 1.2, 1.2, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text(chip.label, x + 3, yPos + 5, { maxWidth: boxWidth - 6 });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    setTextColor(doc, chip.color || COLOR_TEXT);
    doc.text(String(chip.value), x + 3, yPos + 11.5, { maxWidth: boxWidth - 6 });
  });

  setTextColor(doc, COLOR_TEXT);
  return yPos + boxHeight + 5;
};

// ── Tabla genérica compacta (header + filas alternadas). Cada celda puede
// ser un valor plano o `[texto, colorHex]` para pintar solo esa celda (ej.
// % del índice de un banco dominante en rojo) ───────────────────────────
const dibujarTablaGenerica = (doc, yPosInicial, columnas, filas, emptyMsg) => {
  let yPos = yPosInicial;

  if (!filas || filas.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setTextColor(doc, COLOR_GRAY);
    doc.text(emptyMsg, MARGIN_LEFT, yPos + 4);
    setTextColor(doc, COLOR_TEXT);
    return yPos + 10;
  }

  yPos = dibujarEncabezadoColumnas(doc, yPos, columnas);
  const rowHeight = 6;
  let rowIndex = 0;

  filas.forEach((cells) => {
    yPos = checkPageBreak(doc, yPos, rowHeight, PAGE_HEIGHT, MARGIN_BOTTOM);
    if (yPos === 12) {
      yPos = dibujarEncabezadoColumnas(doc, yPos, columnas);
    }
    if (rowIndex % 2 === 1) {
      setFill(doc, COLOR_ROW_ALT);
      doc.rect(MARGIN_LEFT, yPos, USABLE_WIDTH, rowHeight, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    let x = MARGIN_LEFT;
    columnas.forEach((col, i) => {
      const textX = col.align === "right" ? x + col.width - 2 : x + 2;
      const rawCell = cells[i];
      const cellColor = Array.isArray(rawCell) ? rawCell[1] : null;
      const raw = String((Array.isArray(rawCell) ? rawCell[0] : rawCell) ?? "");
      if (cellColor) { setTextColor(doc, cellColor); doc.setFont("helvetica", "bold"); }
      const texto = col.align === "left" ? ajustarTexto(doc, raw, col.width - 4) : raw;
      doc.text(texto, textX, yPos + 4.2, { align: col.align === "right" ? "right" : "left" });
      if (cellColor) { setTextColor(doc, COLOR_TEXT); doc.setFont("helvetica", "normal"); }
      x += col.width;
    });

    yPos += rowHeight;
    rowIndex += 1;
  });

  return yPos + 4;
};

// ── Encabezado de tarjeta por obra (obra + línea de valor destacado) ────
const dibujarEncabezadoObra = (doc, yPosInicial, obraLabel, valorDestacado) => {
  let yPos = checkPageBreak(doc, yPosInicial, 12, PAGE_HEIGHT, MARGIN_BOTTOM);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTextColor(doc, COLOR_SECONDARY);
  doc.text(obraLabel, MARGIN_LEFT, yPos + 4);
  setTextColor(doc, COLOR_TEXT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(valorDestacado, MARGIN_LEFT, yPos + 9, { maxWidth: USABLE_WIDTH });
  return yPos + 12;
};

// ── Indicador: Índice de Posición de la Obra ────────────────────────────
const NIVEL_COLOR_PDF = { alto: COLOR_DANGER, medio: COLOR_WARNING, bajo: COLOR_SUCCESS };
const NIVEL_LABEL_PDF = { alto: "Alto", medio: "Medio", bajo: "Bajo" };

const dibujarSeccionIndicePosicion = (doc, yPosInicial, indicePosicionObra) => {
  let yPos = dibujarTituloSeccion(doc, yPosInicial, INDICE_POSICION_OBRA.titulo);
  yPos = dibujarParrafo(doc, MARGIN_LEFT, yPos, INDICE_POSICION_OBRA.descripcion, USABLE_WIDTH) + 3;

  if (!indicePosicionObra || indicePosicionObra.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text("Sin datos suficientes para calcular el índice de posición en este filtro.", MARGIN_LEFT, yPos + 4);
    setTextColor(doc, COLOR_TEXT);
    return yPos + 12;
  }

  const columnasBanco = [
    { label: "BANCO", width: 55, align: "left" },
    { label: "M³", width: 25, align: "right" },
    { label: "% VOL.", width: 22, align: "right" },
    { label: "DISTANCIA", width: 28, align: "right" },
    { label: "VIAJES", width: 22, align: "right" },
    { label: "% DEL ÍNDICE", width: 28, align: "right" },
  ];
  const columnasMaterial = [
    { label: "MATERIAL", width: 55, align: "left" },
    { label: "M³", width: 30, align: "right" },
    { label: "PRECIO FLETE PROM/M³", width: 45, align: "right" },
    { label: "RANGO DE PRECIO", width: 50, align: "right" },
  ];

  indicePosicionObra.forEach((o) => {
    yPos = dibujarEncabezadoObra(
      doc, yPos,
      formatearObraCompleta(o.empresa, o.cc, o.obra),
      `${formatearNumero(o.m3Total, 0)} m³ transportados`
    );

    const chips = [];
    if (o.tendenciaMensual && o.tendenciaMensual.length >= 2) {
      const primero = o.tendenciaMensual[0];
      const ultimo = o.tendenciaMensual[o.tendenciaMensual.length - 1];
      const delta = ultimo.indice - primero.indice;
      const empeora = delta > primero.indice * 0.05;
      const mejora = delta < -primero.indice * 0.05;
      chips.push({
        label: `Tendencia (${o.tendenciaMensual.length} meses)`,
        value: `${delta > 0 ? "+" : ""}${formatearNumero(delta, 1)} km`,
        color: empeora ? COLOR_DANGER : mejora ? COLOR_SUCCESS : COLOR_GRAY,
      });
    }
    if (o.distanciaMinKm != null) {
      chips.push({ label: "Rango km", value: `${formatearNumero(o.distanciaMinKm, 0)}–${formatearNumero(o.distanciaMaxKm, 0)}` });
    }
    chips.push({ label: "Índice", value: `${formatearNumero(o.indicePosicion, 1)} km` });
    chips.push({ label: "Nivel", value: NIVEL_LABEL_PDF[o.nivel] || "—", color: NIVEL_COLOR_PDF[o.nivel] });
    yPos = dibujarChipsKpi(doc, yPos, chips);

    const filasBanco = (o.bancos || []).map((b) => [
      b.banco,
      `${formatearNumero(b.m3, 0)} m³`,
      `${formatearNumero(b.pctVol, 1)}%`,
      `${formatearNumero(b.distanciaKm, 1)} km`,
      formatearNumero(b.viajes, 0),
      [`${formatearNumero(b.aportaIndice, 1)}%${b.dominante ? " !" : ""}`, b.dominante ? COLOR_DANGER : null],
    ]);
    yPos = dibujarTablaGenerica(doc, yPos, columnasBanco, filasBanco, "Sin bancos con distancia registrada.");

    if (o.bancoDominante) {
      yPos = dibujarParrafo(doc, MARGIN_LEFT, yPos, INDICE_POSICION_OBRA.notaBancoDominante, USABLE_WIDTH, { fontSize: 7, color: COLOR_WARNING }) + 2;
    }

    const filasMaterial = (o.materiales || []).map((m) => [
      m.material,
      `${formatearNumero(m.m3, 0)} m³`,
      m.precioFleteM3 != null ? formatearMoneda(m.precioFleteM3) : "—",
      m.precioMin === m.precioMax ? formatearMoneda(m.precioMin) : `${formatearMoneda(m.precioMin)} – ${formatearMoneda(m.precioMax)}`,
    ]);
    yPos = dibujarTablaGenerica(doc, yPos, columnasMaterial, filasMaterial, "Sin precio de flete registrado para estos materiales.");

    yPos += 4;
  });

  return dibujarParrafo(doc, MARGIN_LEFT, yPos, INDICE_POSICION_OBRA.nota(indicePosicionObra.length), USABLE_WIDTH, { fontSize: 7 }) + 4;
};

// ── Indicador: Flete Evitado por Flota Propia (GRUPO GEEM) ──────────────
const dibujarSeccionFleteEvitado = (doc, yPosInicial, fleteEvitadoFlotaPropia) => {
  let yPos = dibujarTituloSeccion(doc, yPosInicial, FLETE_EVITADO_FLOTA_PROPIA.titulo);
  yPos = dibujarParrafo(doc, MARGIN_LEFT, yPos, FLETE_EVITADO_FLOTA_PROPIA.descripcion, USABLE_WIDTH) + 3;

  if (!fleteEvitadoFlotaPropia || fleteEvitadoFlotaPropia.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text("Sin viajes de GRUPO GEEM (flota propia) en este filtro.", MARGIN_LEFT, yPos + 4);
    setTextColor(doc, COLOR_TEXT);
    return yPos + 12;
  }

  const columnasRutas = [
    { label: "BANCO", width: 45, align: "left" },
    { label: "MATERIAL", width: 40, align: "left" },
    { label: "M³", width: 25, align: "right" },
    { label: "DISTANCIA", width: 25, align: "right" },
    { label: "VIAJES", width: 20, align: "right" },
    { label: "VALOR TARIFA SINDICATO", width: 30, align: "right" },
  ];

  fleteEvitadoFlotaPropia.forEach((o) => {
    yPos = dibujarEncabezadoObra(
      doc, yPos,
      formatearObraCompleta(o.empresa, o.cc, o.obra),
      `${formatearMoneda(o.valorTotalSindicato)} evitados`
    );

    const chips = [
      { label: "Del Volumen de la Obra", value: o.pctVolumenObra != null ? `${formatearNumero(o.pctVolumenObra, 1)}%` : "—" },
      { label: "Viajes GEEM", value: formatearNumero(o.viajesGeem, 0) },
      { label: "Camiones GEEM", value: formatearNumero(o.camionesGeemDistintos, 0) },
    ];
    if (o.viajesGeemPlanta > 0) {
      chips.push({ label: "A Planta Asfaltos", value: `${formatearNumero(o.pctPlanta, 0)}%` });
    }
    yPos = dibujarChipsKpi(doc, yPos, chips);

    const filasRutas = (o.rutas || []).map((r) => [
      r.banco,
      r.material,
      `${formatearNumero(r.m3, 0)} m³`,
      `${formatearNumero(r.distanciaKm, 1)} km`,
      formatearNumero(r.viajes, 0),
      formatearMoneda(r.valorSindicato),
    ]);
    yPos = dibujarTablaGenerica(doc, yPos, columnasRutas, filasRutas, "Sin rutas de GEEM registradas.");

    if (o.viajesPorMes && o.viajesPorMes.length > 1) {
      const chartHeight = 40;
      yPos = checkPageBreak(doc, yPos, chartHeight + 4, PAGE_HEIGHT, MARGIN_BOTTOM);
      dibujarMiniLineChart(
        doc, MARGIN_LEFT, yPos, USABLE_WIDTH, chartHeight,
        "Uso mensual de GEEM",
        o.viajesPorMes.map((v) => v.viajes),
        o.viajesPorMes.map((v) => v.mes),
        COLOR_BLUE, "viajes"
      );
      yPos += chartHeight + 4;
    }

    yPos += 3;
  });

  return dibujarParrafo(doc, MARGIN_LEFT, yPos, FLETE_EVITADO_FLOTA_PROPIA.nota, USABLE_WIDTH, { fontSize: 7 }) + 4;
};

// ── Indicador: ¿Se justifica comprar un camión? ─────────────────────────
const dibujarSeccionViabilidadFlota = (doc, yPosInicial, topCamionerosPorObra, camionesPorDia) => {
  let yPos = dibujarTituloSeccion(doc, yPosInicial, VIABILIDAD_FLOTA_PROPIA.titulo);
  yPos = dibujarParrafo(doc, MARGIN_LEFT, yPos, VIABILIDAD_FLOTA_PROPIA.descripcionTopCamioneros, USABLE_WIDTH) + 3;

  if (!topCamionerosPorObra || topCamionerosPorObra.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text("Sin placas de sindicato con viajes de material en este filtro.", MARGIN_LEFT, yPos + 4);
    setTextColor(doc, COLOR_TEXT);
    return yPos + 12;
  }

  const columnasTop = [
    { label: "PLACA", width: 28, align: "left" },
    { label: "OPERADOR", width: 52, align: "left" },
    { label: "VIAJES", width: 20, align: "right" },
    { label: "M³", width: 20, align: "right" },
    { label: "VIAJES/DÍA", width: 25, align: "right" },
    { label: "PAGADO (AHORRO SI PROPIO)", width: 40, align: "right" },
  ];

  topCamionerosPorObra.forEach((o) => {
    const camiones = (camionesPorDia || []).find((c) => c.obra === o.obra && c.cc === o.cc) || null;
    const mejor = o.top?.[0];

    yPos = dibujarEncabezadoObra(
      doc, yPos,
      formatearObraCompleta(o.empresa, o.cc, o.obra),
      mejor ? `${mejor.placas} — top camión, ${formatearMoneda(mejor.importe)} pagados` : "Sin placas de sindicato en este filtro"
    );

    const chips = [];
    if (camiones) {
      chips.push({ label: "Camiones/día Prom.", value: formatearNumero(camiones.promedioCamionesDia, 1) });
      chips.push({ label: "Máx. Camiones/día", value: formatearNumero(camiones.maxCamionesDia, 0) });
    }
    if (o.promedioViajesPorDiaObra != null) {
      chips.push({ label: "Viajes/día Prom. Camión", value: formatearNumero(o.promedioViajesPorDiaObra, 1) });
    }
    chips.push({ label: `Pagado — Camión Prom. (${o.totalPlacas})`, value: formatearMonedaCorta(o.promedioImportePorCamion) });
    yPos = dibujarChipsKpi(doc, yPos, chips);

    const filasTop = (o.top || []).map((p) => [
      p.placas,
      p.operador,
      formatearNumero(p.viajes, 0),
      `${formatearNumero(p.m3, 0)} m³`,
      p.viajesPorDia != null ? formatearNumero(p.viajesPorDia, 1) : "—",
      formatearMoneda(p.importe),
    ]);
    yPos = dibujarTablaGenerica(doc, yPos, columnasTop, filasTop, "Sin placas de sindicato con viajes en este filtro.");

    yPos += 3;
  });

  return dibujarParrafo(doc, MARGIN_LEFT, yPos, VIABILIDAD_FLOTA_PROPIA.nota, USABLE_WIDTH, { fontSize: 7 }) + 4;
};

// ── Indicador: Jornada de Renta No Aprovechada ──────────────────────────
const COLOR_RANGO_RENTA_PDF = {
  desperdiciado: COLOR_DANGER,
  pocaEficiencia: COLOR_WARNING,
  buenaEficiencia: COLOR_SUCCESS,
  ideal: COLOR_SUCCESS,
};

const dibujarSeccionRentaNoAprovechada = (doc, yPosInicial, rentaNoAprovechada) => {
  let yPos = dibujarTituloSeccion(doc, yPosInicial, RENTA_NO_APROVECHADA.titulo);
  yPos = dibujarParrafo(doc, MARGIN_LEFT, yPos, RENTA_NO_APROVECHADA.descripcion, USABLE_WIDTH) + 3;

  if (!rentaNoAprovechada || rentaNoAprovechada.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_GRAY);
    doc.text("Sin vales de renta con días y viajes registrados en este filtro.", MARGIN_LEFT, yPos + 4);
    setTextColor(doc, COLOR_TEXT);
    return yPos + 12;
  }

  const columnasRango = [
    { label: "ESPECTRO", width: 42, align: "left" },
    { label: "VIAJES/DÍA", width: 28, align: "left" },
    { label: "VALES", width: 25, align: "right" },
    { label: "% DE VALES", width: 30, align: "right" },
    { label: "INVERTIDO", width: 40, align: "right" },
    { label: "CON NOTA", width: 20, align: "right" },
  ];

  rentaNoAprovechada.forEach((o) => {
    yPos = dibujarEncabezadoObra(
      doc, yPos,
      formatearObraCompleta(o.empresa, o.cc, o.obra),
      `${formatearMoneda(o.totalDesperdiciado)} desperdiciados`
    );

    const chips = [
      { label: "Vales de Renta", value: formatearNumero(o.totalVales, 0) },
      { label: "Invertido en Renta", value: formatearMonedaCorta(o.totalImporte) },
    ];
    yPos = dibujarChipsKpi(doc, yPos, chips);

    const filasRango = (o.rangos || []).map((r) => [
      [`${r.label}${r.key === "ideal" ? " *" : ""}`, COLOR_RANGO_RENTA_PDF[r.key]],
      r.rango,
      formatearNumero(r.count, 0),
      `${formatearNumero(r.pctVales, 1)}%`,
      formatearMoneda(r.importe),
      r.valesConNota?.length > 0 ? formatearNumero(r.valesConNota.length, 0) : "—",
    ]);
    yPos = dibujarTablaGenerica(doc, yPos, columnasRango, filasRango, "Sin vales de renta en este filtro.");

    yPos += 3;
  });

  return dibujarParrafo(doc, MARGIN_LEFT, yPos, RENTA_NO_APROVECHADA.nota, USABLE_WIDTH, { fontSize: 7 }) + 4;
};

// ── Sección: Indicadores de Eficiencia y Oportunidad (los 4 bloques de
// arriba, en el mismo orden que la tarjeta colapsable "eficiencia" en la
// página) ────────────────────────────────────────────────────────────
const dibujarSeccionIndicadoresEficiencia = (
  doc, yPosInicial,
  indicePosicionObra, fleteEvitadoFlotaPropia, topCamionerosPorObra, camionesPorDia, rentaNoAprovechada
) => {
  let yPos = yPosInicial;
  yPos = dibujarSeccionIndicePosicion(doc, yPos, indicePosicionObra);
  yPos = checkPageBreak(doc, yPos, 24, PAGE_HEIGHT, MARGIN_BOTTOM);
  yPos = dibujarSeccionFleteEvitado(doc, yPos, fleteEvitadoFlotaPropia);
  yPos = checkPageBreak(doc, yPos, 24, PAGE_HEIGHT, MARGIN_BOTTOM);
  yPos = dibujarSeccionViabilidadFlota(doc, yPos, topCamionerosPorObra, camionesPorDia);
  yPos = checkPageBreak(doc, yPos, 24, PAGE_HEIGHT, MARGIN_BOTTOM);
  yPos = dibujarSeccionRentaNoAprovechada(doc, yPos, rentaNoAprovechada);
  return yPos;
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
    tablaBancoMaterial = [],
    tablaRentaPorObra = [],
    totalesRenta,
    tablaViajesRentaPorEquipo = [],
    seriesImporteTiempo,
    seriesCamionesRentaTiempo,
    seriesTiempo,
    modoGraficaTiempo = "m3",
    presupuestosMaterial = [],
    presupuestosRenta = [],
    hayAlertaPresupuesto = false,
    topResidente,
    topChecador,
    topPlaca,
    horaPico,
    mejorRendimiento,
    ultimaConciliacion,
    ahorroEstimado,
    serieConciliacionesPorMes,
    bloquesObraConciliaciones = [],
    indicePosicionObra = [],
    fleteEvitadoFlotaPropia = [],
    camionesPorDia = [],
    topCamionerosPorObra = [],
    rentaNoAprovechada = [],
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

  // ── Material por Banco (distancia, precio/m³, importe, agrupado por tipo)
  // — siempre en página nueva, igual que Tendencias/Presupuestos, para no
  // partir sus tablas y gráficas contra el final de "Material Movido por Obra" ──
  if (tablaBancoMaterial.length > 0) {
    doc.addPage();
    yPos = 12;
    yPos = dibujarSeccionBancoMaterial(doc, yPos, tablaBancoMaterial);
  }

  // ── Material vs Tiempo (una mini gráfica por material) ──
  if (seriesTiempo) {
    yPos = checkPageBreak(doc, yPos, 20, PAGE_HEIGHT, MARGIN_BOTTOM);
    yPos = dibujarSeccionMaterialVsTiempo(doc, yPos, seriesTiempo, modoGraficaTiempo);
  }

  // ── Tabla renta ──
  if (tablaRentaPorObra.length > 0) {
    yPos = checkPageBreak(doc, yPos, 20, PAGE_HEIGHT, MARGIN_BOTTOM);
    yPos = dibujarTablaRenta(doc, yPos, tablaRentaPorObra, totalesRenta, periodoTablasLabel);
  }

  // ── Renta de Equipo — Precio por Viaje y m³ (análisis derivado de la
  // capacidad del vehículo) ──
  if (tablaViajesRentaPorEquipo.length > 0) {
    yPos = checkPageBreak(doc, yPos, 20, PAGE_HEIGHT, MARGIN_BOTTOM);
    yPos = dibujarTablaRentaPrecios(doc, yPos, tablaViajesRentaPorEquipo);
  }

  // ── Tendencias: Importe Gastado y Camiones Rentados por Mes ──
  if ((seriesImporteTiempo?.data?.length > 0) || (seriesCamionesRentaTiempo?.data?.length > 0)) {
    doc.addPage();
    yPos = 12;
    yPos = dibujarSeccionTendencias(doc, yPos, seriesImporteTiempo, seriesCamionesRentaTiempo);
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
  yPos = dibujarPresupuestos(doc, yPos, presupuestosMaterial, presupuestosRenta, hayAlertaPresupuesto);

  // ── Ahorro estimado vs. proceso anterior en papel (siempre en página nueva) ──
  doc.addPage();
  yPos = 12;
  yPos = dibujarSeccionAhorro(doc, yPos, ahorroEstimado, serieConciliacionesPorMes, bloquesObraConciliaciones);

  // ── Indicadores de Eficiencia y Oportunidad (siempre en página nueva) ──
  const hayIndicadoresEficiencia =
    indicePosicionObra.length > 0 ||
    fleteEvitadoFlotaPropia.length > 0 ||
    topCamionerosPorObra.length > 0 ||
    rentaNoAprovechada.length > 0;
  if (hayIndicadoresEficiencia) {
    doc.addPage();
    yPos = 12;
    dibujarSeccionIndicadoresEficiencia(
      doc, yPos, indicePosicionObra, fleteEvitadoFlotaPropia, topCamionerosPorObra, camionesPorDia, rentaNoAprovechada
    );
  }

  dibujarPieDePagina(doc, ultimaConciliacion);

  const nombreArchivo = `Reporte_Estadisticas_${periodoLabel.replace(/[^\w-]+/g, "_")}_${new Date()
    .toISOString()
    .substring(0, 10)
    .replace(/-/g, "")}.pdf`;

  doc.save(nombreArchivo);
};
