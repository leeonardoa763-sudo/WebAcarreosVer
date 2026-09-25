/**
 * src/pages/ReporteDiario.jsx
 *
 * Reporte operativo de un día específico, en página propia (se abre en una
 * pestaña nueva desde EstadisticasGlobales.jsx) para poder exportarse tal
 * cual se ve — con iconos y gráficas incluidos — capturado con html2canvas,
 * como PNG o como PDF (ambos son la misma captura, el PDF solo la mete en
 * página en vez de descargarla directo — no hay una versión imperativa con
 * jsPDF como en exportarReporteEstadisticas.js). La captura se parte en dos
 * (parte1Ref / parte2Ref, ver exportarImagen.js) para que cada imagen/página
 * sea más chica y se lea mejor en un teléfono. Todo el contenido va siempre
 * expandido (nada de acordeones): es una imagen estática, no se puede hacer
 * clic en ella. KPIs con tendencia
 * vs. día anterior, gráfica de material del día (m³ por tipo), flota propia
 * y pipas de agua aparte, gráfica de renta del día (importe por tipo de
 * equipo, con su nivel de eficiencia por viajes/día), ranking de obras por
 * importe (título coloreado por empresa — CAPAM azul, COEDESSA amarillo,
 * TRIACO rojo, resto sin color — con su detalle de material/renta siempre
 * visible en chips horizontales para no alargar la página; cada chip de
 * material trae el acumulado histórico de presupuesto de esa obra/material,
 * el % de presupuesto ya usado (color semáforo) y, si aplica, nota de
 * cuánto de ese material fue a planta de asfaltos — mismo % también en el
 * chip de renta, contra su propio presupuesto por obra) y
 * eficiencia operativa con distribución horaria coloreada
 * por material.
 *
 * Dependencias: useReporteDiario, recharts, exportarImagen, formatters
 * Usado en: App.jsx (ruta /reporte-diario), enlazada desde EstadisticasGlobales.jsx
 */

// 1. React
import { useEffect, useRef, useState } from "react";

// 2. React Router
import { useSearchParams } from "react-router-dom";

// 3. Iconos
import {
  Truck,
  Package,
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Award,
  Download,
  FileDown,
  CalendarDays,
  Factory,
  Droplets,
} from "lucide-react";

// 4. Recharts
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from "recharts";

// 5. Hooks
import { useReporteDiario, formatFechaLocal } from "../hooks/useReporteDiario";

// 6. Utils
import { formatearMoneda, formatearNumero } from "../utils/formatters";
import { exportarElementosComoImagenes, exportarElementosComoPDF } from "../utils/exportarImagen";

// 7. Estilos
import "../styles/reporte-diario.css";

const HOY = formatFechaLocal(new Date());
const AYER = formatFechaLocal(new Date(Date.now() - 86400000));

// Orden validado para que colores adyacentes (incluidos los primeros 3, el
// caso más común de materiales/equipos distintos en un día) se distingan
// entre sí incluso con daltonismo — ver skill dataviz/scripts/validate_palette.js.
// Antes el orden era naranja/azul/verde: naranja↔verde reprobaba la
// separación CVD (protanopía) con ΔE 6.9, justo el "se ven parecidos" que
// se reportó.
const PALETA = ["#004E89", "#FF6B35", "#06B6D4", "#1A936F", "#F59E0B", "#8B5CF6", "#EF4444", "#10B981"];
const MAX_OBRAS_VISIBLES = 6;

// Color por empresa para el título de cada obra en "Obras del Día" (pedido
// explícito de Bruno, distinto del cian que usa colors.capam en otras
// pantallas): CAPAM azul, COEDESSA amarillo, TRIACO rojo. Grupo GEEM (flota
// propia, sin empresa fija) se deja sin color especial.
const colorPorEmpresa = (empresa) => {
  const e = (empresa || "").toUpperCase();
  if (e.includes("CAPAM")) return "#004E89";
  if (e.includes("COEDESSA")) return "#EAB308";
  if (e.includes("TRIACO")) return "#EF4444";
  return null;
};
const COLOR_OBRA_SIN_EMPRESA = "#64748B";

// Mismo espectro/colores que "Jornada de Renta No Aprovechada" en
// EstadisticasGlobales.jsx (COLOR_RANGO_RENTA) — no inventar una paleta nueva
// para el mismo concepto. Claves internas sin cambio (desperdiciado/ideal),
// solo las etiquetas: 1-3 viajes/día = Poca Eficiencia, 4-6 = Eficiencia
// Media, 7-9 = Buena Eficiencia, 10+ = Muy Buena Eficiencia.
const NIVEL_RENTA = {
  desperdiciado: { label: "Poca Eficiencia", color: "red" },
  pocaEficiencia: { label: "Eficiencia Media", color: "yellow" },
  buenaEficiencia: { label: "Buena Eficiencia", color: "green" },
  ideal: { label: "Muy Buena Eficiencia", color: "green" },
};

const formatFechaLarga = (fechaStr) => {
  const fecha = new Date(`${fechaStr}T12:00:00`);
  return fecha.toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
};

const formatFechaHoraGeneracion = () =>
  new Date().toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  });

// Minutos crudos a "Xh Ymin" pasado 60 min, más legible que "287 min".
const formatMinutosHoras = (min) => {
  if (min == null) return "—";
  if (min < 60) return `${formatearNumero(min, 0)} min`;
  const horas = Math.floor(min / 60);
  const minutos = Math.round(min % 60);
  return minutos > 0 ? `${horas}h ${minutos}min` : `${horas}h`;
};

// Etiqueta de obra con su CC al inicio: "CC 123 · Nombre de la obra"
const formatearObra = (obra, cc) => (cc != null ? `CC ${cc} · ${obra || "Sin obra"}` : obra || "Sin obra");

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid rgba(0,78,137,0.12)",
  borderRadius: 10,
  fontSize: 12,
  fontFamily: "Outfit, system-ui, sans-serif",
};

// Mismos umbrales que pctCellClass en EstadisticasGlobales.jsx (no inventar
// una escala nueva para el mismo concepto de "% de presupuesto usado"): rojo
// ya se pasó del presupuesto, amarillo cerca de acabarse, verde el resto.
const claseNivelPresupuesto = (pct) => {
  if (pct == null) return null;
  if (pct > 100) return "red";
  if (pct >= 80) return "yellow";
  return "green";
};

// Línea propia dentro del chip, separada del resto (más margen + borde
// superior) para que el % de presupuesto no se pierda entre las demás
// estadísticas del chip — a propósito distinta de rpd__obra-row-chip-stats.
const PresupuestoChip = ({ pct }) => {
  const nivel = claseNivelPresupuesto(pct);
  if (nivel == null) return null;
  return (
    <span className={`rpd__obra-row-chip-presupuesto rpd__obra-row-chip-presupuesto--${nivel}`}>
      {pct}% de presupuesto usado
    </span>
  );
};

const KpiCard = ({ icon: Icon, label, value, comparativa, color }) => {
  const hasTrend = comparativa && typeof comparativa.pct === "number";
  return (
    <div className="rpd__kpi">
      <div className="rpd__kpi-icon" style={{ backgroundColor: `${color}20`, color }}>
        <Icon size={18} />
      </div>
      <div className="rpd__kpi-label">{label}</div>
      <div className="rpd__kpi-value">{value}</div>
      {hasTrend && (
        <div className={`rpd__kpi-trend rpd__kpi-trend--${comparativa.sube ? "up" : "down"}`}>
          {comparativa.sube ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{Math.abs(comparativa.pct)}% vs. ayer</span>
        </div>
      )}
    </div>
  );
};

const ReporteDiario = () => {
  const [searchParams] = useSearchParams();
  const {
    fecha,
    setFecha,
    loading,
    error,
    kpis,
    comparativa,
    materialesDelDia,
    rentaPorEquipo,
    pipasDelDia,
    flotaPropia,
    desgloseMaterial,
    desgloseRenta,
    resumenPorObra,
    eficiencia,
    refresh,
  } = useReporteDiario();
  const [exportando, setExportando] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  // El reporte se captura en dos partes (mismo criterio para imagen y PDF):
  // parte 1 = encabezado + KPIs + material/renta del día; parte 2 = Obras
  // del Día + Eficiencia Operativa. Partirlo da imágenes/páginas más chicas
  // y de mejor calidad para verse en un teléfono que una sola muy alta.
  const parte1Ref = useRef(null);
  const parte2Ref = useRef(null);

  // Permite que el botón "Reporte Diario" de Estadísticas Globales abra esta
  // pestaña ya posicionada en la fecha que el usuario tenía seleccionada.
  useEffect(() => {
    const fechaParam = searchParams.get("fecha");
    if (fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) setFecha(fechaParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDescargarImagen = async () => {
    if (!parte1Ref.current || !parte2Ref.current) return;
    try {
      setExportando(true);
      await exportarElementosComoImagenes([parte1Ref.current, parte2Ref.current], `Reporte_Diario_${fecha}`);
    } catch (err) {
      console.error("Error al exportar imágenes del reporte diario:", err);
    } finally {
      setExportando(false);
    }
  };

  // PDF "tal cual como está el diseño en la web": misma captura que las
  // imágenes (html2canvas), no una recomposición imperativa como
  // exportarReporteEstadisticas.js.
  const handleDescargarPDF = async () => {
    if (!parte1Ref.current || !parte2Ref.current) return;
    try {
      setExportandoPdf(true);
      await exportarElementosComoPDF([parte1Ref.current, parte2Ref.current], `Reporte_Diario_${fecha}.pdf`);
    } catch (err) {
      console.error("Error al exportar PDF del reporte diario:", err);
    } finally {
      setExportandoPdf(false);
    }
  };

  const claveObra = (o) => `${o.obra}__${o.cc}`;
  const obrasVisibles = resumenPorObra.slice(0, MAX_OBRAS_VISIBLES);
  const obrasRestantes = resumenPorObra.length - obrasVisibles.length;
  const maxImporteObra = Math.max(...resumenPorObra.map((o) => o.importeTotal), 1);
  const detalleMaterialPorObra = Object.fromEntries(desgloseMaterial.map((o) => [claveObra(o), o]));
  const detalleRentaPorObra = Object.fromEntries(desgloseRenta.map((o) => [claveObra(o), o]));

  // Mismo color para el mismo material en la gráfica de Material del Día y en
  // la distribución horaria de abajo — se asigna una sola vez, a partir del
  // set más grande (materialesDelDia), y ambas gráficas lo reusan.
  const colorPorMaterial = Object.fromEntries(materialesDelDia.map((m, i) => [m.material, PALETA[i % PALETA.length]]));
  const materialChartData = materialesDelDia.map((m) => ({ ...m, color: colorPorMaterial[m.material] }));
  const rentaChartData = rentaPorEquipo.map((e, i) => ({ ...e, color: PALETA[i % PALETA.length] }));
  const alturaMaterial = Math.max(materialChartData.length * 48, 90);
  const alturaRenta = Math.max(rentaChartData.length * 48, 90);

  return (
    <div className="rpd-page">
      {/* ── Barra de herramientas (no se incluye en la imagen exportada) ── */}
      <div className="rpd-page__toolbar">
        <div className="rpd-page__toolbar-left">
          <CalendarDays size={16} />
          <span>Reporte Diario</span>
        </div>
        <div className="rpd-page__toolbar-actions">
          <div className="rpd__date-quick" role="group" aria-label="Atajos de fecha">
            <button
              type="button"
              className={`rpd__date-quick-btn${fecha === HOY ? " rpd__date-quick-btn--active" : ""}`}
              onClick={() => setFecha(HOY)}
            >
              Hoy
            </button>
            <button
              type="button"
              className={`rpd__date-quick-btn${fecha === AYER ? " rpd__date-quick-btn--active" : ""}`}
              onClick={() => setFecha(AYER)}
            >
              Ayer
            </button>
          </div>
          <input
            type="date"
            className="rpd__date-input"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            aria-label="Seleccionar fecha del reporte"
          />
          <button
            className="rpd__export-btn"
            onClick={handleDescargarImagen}
            disabled={loading || exportando || exportandoPdf}
          >
            <Download size={14} />
            {exportando ? "Generando…" : "Descargar imágenes"}
          </button>
          <button
            className="rpd__export-btn rpd__export-btn--pdf"
            onClick={handleDescargarPDF}
            disabled={loading || exportando || exportandoPdf}
          >
            <FileDown size={14} />
            {exportandoPdf ? "Generando…" : "Descargar PDF"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rpd__error">
          <p>{error}</p>
          <button onClick={refresh}>Reintentar</button>
        </div>
      )}

      {loading ? (
        <div className="rpd__loading">Cargando reporte…</div>
      ) : (
        <>
        {/* ── Parte 1: encabezado, KPIs, material y renta del día ── */}
        <div className="rpd-page__report" ref={parte1Ref}>
          <div className="rpd-page__report-header">
            <div>
              <h1 className="rpd-page__title">Reporte Diario</h1>
              <p className="rpd-page__subtitle">Control de Acarreos · CAPAM · TRIACO · COEDESSA</p>
            </div>
            <div className="rpd-page__report-meta">
              <span className="rpd-page__fecha">{formatFechaLarga(fecha)}</span>
              <span className="rpd-page__generado">Generado el {formatFechaHoraGeneracion()}</span>
            </div>
          </div>

          {/* KPIs */}
          <div className="rpd__kpi-grid">
            <KpiCard
              icon={Truck}
              label="Vehículos Activos"
              value={formatearNumero(kpis.vehiculosActivos, 0)}
              comparativa={comparativa?.vehiculosActivos}
              color="#004E89"
            />
            <KpiCard
              icon={Package}
              label="Material Movido"
              value={`${formatearNumero(kpis.materialM3, 1)} m³`}
              comparativa={comparativa?.materialM3}
              color="#1A936F"
            />
            <KpiCard
              icon={Activity}
              label="Total de Viajes"
              value={formatearNumero(kpis.totalViajes, 0)}
              comparativa={comparativa?.totalViajes}
              color="#FF6B35"
            />
            <KpiCard
              icon={DollarSign}
              label="Importe (sin IVA)"
              value={formatearMoneda(kpis.importeTotal)}
              comparativa={comparativa?.importeTotal}
              color="#8B5CF6"
            />
          </div>

          {/* Material del día */}
          <div className="rpd__section-header">
            <h3>Material del Día</h3>
            <p>m³ movidos por tipo de material, toda la operación</p>
          </div>
          {materialChartData.length === 0 ? (
            <div className="rpd__empty">Sin material registrado este día.</div>
          ) : (
            <div className="rpd__chart-card rpd__chart-card--full">
              <ResponsiveContainer width="100%" height={alturaMaterial}>
                <BarChart data={materialChartData} layout="vertical" margin={{ top: 4, right: 64, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 4" stroke="rgba(0,78,137,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="material"
                    interval={0}
                    tick={{ fontSize: 12.5, fill: "#1A2332", fontFamily: "Barlow Condensed, sans-serif", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={140}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, _name, props) => [`${formatearNumero(v, 2)} m³ · ${formatearMoneda(props.payload.importe)}`, "Volumen"]}
                  />
                  <Bar
                    dataKey="m3Total"
                    radius={[0, 6, 6, 0]}
                    barSize={30}
                    label={{ position: "right", fontSize: 12, fill: "#64748B", formatter: (v) => `${formatearNumero(v, 1)} m³` }}
                  >
                    {materialChartData.map((m) => (
                      <Cell key={m.material} fill={m.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Flota propia (GEEM) y Pipas de agua — ambas quedan fuera de las
              gráficas de arriba (GEEM no factura, pipas no se mide en m³),
              así que este es el único lugar donde se ven. */}
          <div className="rpd__flota-propia">
            <div className="rpd__info-card">
              <div className="rpd__info-card-header">
                <Truck size={15} />
                <span>Flota Propia (Grupo GEEM)</span>
              </div>
              <div className="rpd__info-card-stats">
                <div className="rpd__info-card-stat">
                  <span className="rpd__info-card-stat-val">{formatearNumero(flotaPropia.viajesGeem, 0)}</span>
                  <span className="rpd__info-card-stat-lbl">Viajes</span>
                </div>
                <div className="rpd__info-card-stat">
                  <span className="rpd__info-card-stat-val">{formatearNumero(flotaPropia.viajesPlanta, 0)}</span>
                  <span className="rpd__info-card-stat-lbl">A Planta</span>
                </div>
                <div className="rpd__info-card-stat">
                  <span className="rpd__info-card-stat-val rpd__info-card-stat-val--money">
                    {formatearMoneda(flotaPropia.valorAhorrado)}
                  </span>
                  <span className="rpd__info-card-stat-lbl">Ahorro Estimado</span>
                </div>
              </div>
              {flotaPropia.materialesPlanta.length > 0 && (
                <p className="rpd__info-card-nota">
                  <Factory size={11} /> A planta:{" "}
                  {flotaPropia.materialesPlanta
                    .map((m) => `${m.material} (${formatearNumero(m.m3, 1)} m³)`)
                    .join(", ")}
                </p>
              )}
            </div>

            <div className="rpd__info-card">
              <div className="rpd__info-card-header">
                <Droplets size={15} />
                <span>Pipas de Agua</span>
              </div>
              <div className="rpd__info-card-stats">
                <div className="rpd__info-card-stat">
                  <span className="rpd__info-card-stat-val">{formatearNumero(pipasDelDia.totalViajes, 0)}</span>
                  <span className="rpd__info-card-stat-lbl">Viajes</span>
                </div>
                <div className="rpd__info-card-stat">
                  <span className="rpd__info-card-stat-val">
                    {pipasDelDia.volumenAprox != null ? `${formatearNumero(pipasDelDia.volumenAprox, 1)} m³` : "—"}
                  </span>
                  <span className="rpd__info-card-stat-lbl">Capacidad Aprox.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Renta del día */}
          <div className="rpd__section-header">
            <h3>Renta de Equipo del Día</h3>
            <p>Importe por tipo de equipo, toda la operación</p>
          </div>
          {rentaChartData.length === 0 ? (
            <div className="rpd__empty">Sin renta de equipo registrada este día.</div>
          ) : (
            <>
              <div className="rpd__chart-card rpd__chart-card--full">
                <ResponsiveContainer width="100%" height={alturaRenta}>
                  <BarChart data={rentaChartData} layout="vertical" margin={{ top: 4, right: 84, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 4" stroke="rgba(0,78,137,0.06)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="equipo"
                      interval={0}
                      tick={{ fontSize: 12.5, fill: "#1A2332", fontFamily: "Barlow Condensed, sans-serif", fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      width={150}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v, _name, props) => [
                        `${formatearMoneda(v)} · ${formatearNumero(props.payload.horas, 1)} hrs · ${formatearNumero(props.payload.dias, 1)} días`,
                        "Importe",
                      ]}
                    />
                    <Bar
                      dataKey="importe"
                      radius={[0, 6, 6, 0]}
                      barSize={30}
                      label={{ position: "right", fontSize: 12, fill: "#64748B", formatter: (v) => formatearMoneda(v) }}
                    >
                      {rentaChartData.map((e) => (
                        <Cell key={e.equipo} fill={e.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Eficiencia de renta por viajes/día — mismo espectro que
                  "Jornada de Renta No Aprovechada" de Estadísticas Globales. */}
              <div className="rpd__renta-eficiencia">
                {rentaChartData.map((e) => {
                  const nivel = e.nivelEficiencia ? NIVEL_RENTA[e.nivelEficiencia] : null;
                  return (
                    <div key={e.equipo} className={`rpd__renta-eficiencia-chip${nivel ? ` rpd__renta-eficiencia-chip--${nivel.color}` : ""}`}>
                      <span className="rpd__renta-eficiencia-nombre">{e.equipo}</span>
                      <span className="rpd__renta-eficiencia-nivel">
                        {nivel ? `${nivel.label}${e.nivelEficiencia === "ideal" ? " ★" : ""}` : "—"}
                      </span>
                      <span className="rpd__renta-eficiencia-ratio">
                        {e.viajesPorDia != null ? `${formatearNumero(e.viajesPorDia, 1)} viajes/día` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Parte 2: Obras del Día + Eficiencia Operativa ── */}
        <div className="rpd-page__report" ref={parte2Ref}>
          {/* Obras del día — ranking visual por importe (material + renta),
              detalle siempre visible (esto es una imagen, no se puede hacer
              clic) en chips horizontales para no alargar demasiado la
              página cuando una obra tiene muchos materiales distintos. */}
          <div className="rpd__section-header">
            <h3>Obras del Día</h3>
            <p>Importe total por obra, con su desglose de material y renta</p>
          </div>

          {resumenPorObra.length === 0 ? (
            <div className="rpd__empty">Sin actividad registrada en ninguna obra este día.</div>
          ) : (
            <div className="rpd__obra-rank">
              {obrasVisibles.map((o) => {
                const key = claveObra(o);
                const color = colorPorEmpresa(o.empresa) || COLOR_OBRA_SIN_EMPRESA;
                const mat = detalleMaterialPorObra[key];
                const renta = detalleRentaPorObra[key];
                return (
                  <div key={key} className="rpd__obra-row">
                    <div className="rpd__obra-row-top">
                      <span className="rpd__obra-row-nombre">{formatearObra(o.obra, o.cc)}</span>
                      <span className="rpd__obra-row-importe" style={{ color }}>
                        {formatearMoneda(o.importeTotal)}
                      </span>
                    </div>
                    <div className="rpd__obra-row-bar-track">
                      <div
                        className="rpd__obra-row-bar-fill"
                        style={{ width: `${Math.max((o.importeTotal / maxImporteObra) * 100, 2)}%`, background: color }}
                      />
                    </div>

                    {(mat || renta) && (
                      <div className="rpd__obra-row-chips">
                        {mat?.materiales.map((m) => (
                          <div key={m.material} className="rpd__obra-row-chip">
                            <span className="rpd__obra-row-chip-nombre">{m.material}</span>
                            <span className="rpd__obra-row-chip-stats">
                              {formatearNumero(m.viajes, 0)} viajes · {formatearNumero(m.m3Total, 2)} m³
                            </span>
                            {m.viajesPlanta > 0 && (
                              <span className="rpd__obra-row-chip-planta">
                                <Factory size={10} /> A planta de asfaltos: {formatearNumero(m.m3Planta, 1)} m³
                              </span>
                            )}
                            {m.acumuladoM3 != null && (
                              <span className="rpd__obra-row-chip-acumulado">
                                Acumulado obra: {formatearNumero(m.acumuladoM3, 0)} m³
                              </span>
                            )}
                            <PresupuestoChip pct={m.pctPresupuestoUsado} />
                          </div>
                        ))}
                        {renta && (
                          <div className="rpd__obra-row-chip">
                            <span className="rpd__obra-row-chip-nombre">Renta de Equipo</span>
                            <span className="rpd__obra-row-chip-stats">
                              {formatearNumero(renta.vales, 0)} vale{renta.vales === 1 ? "" : "s"} · {formatearNumero(renta.horas, 1)} hrs ·{" "}
                              {formatearNumero(renta.dias, 1)} días · {formatearMoneda(renta.importe)}
                            </span>
                            <PresupuestoChip pct={renta.pctPresupuestoUsado} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {obrasRestantes > 0 && (
                <p className="rpd__obra-rank-mas">
                  + {obrasRestantes} obra{obrasRestantes === 1 ? "" : "s"} más con actividad este día
                </p>
              )}
            </div>
          )}

          {/* Eficiencia operativa */}
          <div className="rpd__section-header">
            <h3>Eficiencia Operativa</h3>
            <p>Tiempos entre viajes y distribución horaria por material</p>
          </div>

          <div className="rpd__eficiencia-grid">
            <div className="rpd__stat">
              <Clock size={16} />
              <div>
                <div className="rpd__stat-value">
                  {formatMinutosHoras(eficiencia.tiempoPromedioEntreViajesMin)}
                </div>
                <div className="rpd__stat-label">Promedio entre viajes</div>
              </div>
            </div>
            <div className="rpd__stat">
              <Package size={16} />
              <div>
                <div className="rpd__stat-value">{formatearNumero(eficiencia.m3PromedioPorViaje, 2)} m³</div>
                <div className="rpd__stat-label">Promedio por viaje</div>
              </div>
            </div>
            <div className="rpd__stat">
              <Activity size={16} />
              <div>
                <div className="rpd__stat-value">{eficiencia.horaPico ? eficiencia.horaPico.label : "—"}</div>
                <div className="rpd__stat-label">Hora pico de actividad</div>
              </div>
            </div>
            <div className="rpd__stat">
              <Award size={16} />
              <div>
                <div className="rpd__stat-value">{eficiencia.vehiculoTop ? eficiencia.vehiculoTop.placas : "—"}</div>
                <div className="rpd__stat-label">
                  Vehículo más productivo
                  {eficiencia.vehiculoTop && ` · ${formatearNumero(eficiencia.vehiculoTop.viajes, 0)} viajes`}
                </div>
              </div>
            </div>
          </div>

          <div className="rpd__chart-card rpd__chart-card--full">
            <h4>Viajes por Hora del Día, por Material</h4>
            {eficiencia.materialesDistintos.length === 0 ? (
              <div className="rpd__empty">Sin viajes con hora registrada este día.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={eficiencia.distribucionHoraria}>
                  <CartesianGrid strokeDasharray="3 4" stroke="rgba(0,78,137,0.07)" vertical={false} />
                  <XAxis dataKey="label" interval={2} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`${v} viajes`, name]} />
                  <Legend
                    wrapperStyle={{ fontSize: 11.5, fontFamily: "Outfit, system-ui, sans-serif", paddingTop: 10 }}
                    iconType="square"
                    iconSize={9}
                  />
                  {eficiencia.materialesDistintos.map((material, i) => (
                    <Bar
                      key={material}
                      dataKey={material}
                      name={material}
                      stackId="viajes"
                      fill={colorPorMaterial[material] || "#94A3B8"}
                      radius={i === eficiencia.materialesDistintos.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default ReporteDiario;
