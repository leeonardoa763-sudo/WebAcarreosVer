/**
 * src/pages/ReporteSemanal.jsx
 *
 * Reporte operativo de una semana (lunes a domingo), en página propia (se
 * abre en pestaña nueva desde EstadisticasGlobales.jsx) para exportarse tal
 * cual se ve — con iconos y gráficas incluidos — capturado con html2canvas,
 * como PNG o como PDF. La captura se parte en 3 imágenes (parte1Ref/
 * parte2Ref/parte3Ref) para que cada una sea más chica y se lea mejor en un
 * teléfono que un solo reporte muy alto — un paso más que ReporteDiario.jsx
 * (2 partes) porque aquí se suma el bloque de Indicadores de Eficiencia.
 * Todo el contenido va siempre expandido (es una imagen estática, no
 * acordeones).
 *
 * Parte 1 — encabezado, KPIs con tendencia vs. semana anterior, gráfica de
 * material de la semana (m³ por tipo), flota propia y pipas de agua aparte,
 * gráfica de renta de la semana (importe por tipo de equipo con su nivel de
 * eficiencia). Parte 2 — ranking de obras por importe con desglose de
 * material/renta en chips. Parte 3 — "Indicadores de Eficiencia — Semana"
 * (índice de posición promedio, flete evitado por flota propia y renta no
 * aprovechada, versión a nivel compañía de la última sección de
 * Estadísticas Globales) y Eficiencia Operativa, con distribución de
 * viajes por día de la semana (en vez de por hora del día) y el total de
 * viajes de cada día rotulado sobre su barra.
 *
 * Dependencias: useReporteSemanal, recharts, exportarImagen, formatters
 * Usado en: App.jsx (ruta /reporte-semanal), enlazada desde EstadisticasGlobales.jsx
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
  Download,
  FileDown,
  CalendarRange,
  Factory,
  Droplets,
  Target,
  Wallet,
} from "lucide-react";

// 4. Recharts
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LabelList } from "recharts";

// 5. Hooks
import { useReporteSemanal, formatFechaLocal } from "../hooks/useReporteSemanal";

// 6. Utils
import { formatearMoneda, formatearNumero } from "../utils/formatters";
import { exportarElementosComoImagenes, exportarElementosComoPDF } from "../utils/exportarImagen";
import { calcularSemanaISO } from "../utils/dateUtils";

// 7. Estilos
import "../styles/reporte-semanal.css";

const HOY = formatFechaLocal(new Date());
const HACE_7_DIAS = formatFechaLocal(new Date(Date.now() - 7 * 86400000));

// Mismo orden validado (separación CVD) que ReporteDiario.jsx — ver ahí el
// porqué del orden azul/naranja/cian antes que naranja/azul/verde.
const PALETA = ["#004E89", "#FF6B35", "#06B6D4", "#1A936F", "#F59E0B", "#8B5CF6", "#EF4444", "#10B981"];

const colorPorEmpresa = (empresa) => {
  const e = (empresa || "").toUpperCase();
  if (e.includes("CAPAM")) return "#004E89";
  if (e.includes("COEDESSA")) return "#EAB308";
  if (e.includes("TRIACO")) return "#EF4444";
  return null;
};
const COLOR_OBRA_SIN_EMPRESA = "#64748B";

// Mismo espectro que "Jornada de Renta No Aprovechada" de EstadisticasGlobales.jsx
const NIVEL_RENTA = {
  desperdiciado: { label: "Poca Eficiencia", color: "red" },
  pocaEficiencia: { label: "Eficiencia Media", color: "yellow" },
  buenaEficiencia: { label: "Buena Eficiencia", color: "green" },
  ideal: { label: "Muy Buena Eficiencia", color: "green" },
};

const formatRangoSemana = (semana) => {
  const inicio = new Date(`${semana.fechaInicio}T12:00:00`);
  const fin = new Date(`${semana.fechaFin}T12:00:00`);
  const mismoMes = inicio.getMonth() === fin.getMonth();
  const optsInicio = mismoMes ? { day: "2-digit" } : { day: "2-digit", month: "long" };
  const inicioStr = inicio.toLocaleDateString("es-MX", optsInicio);
  const finStr = fin.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  return `Semana ${semana.numero} · ${inicioStr} – ${finStr}`;
};

// Minutos crudos a "Xh Ymin" pasado 60 min — el promedio semanal entre
// viajes incluye huecos nocturnos/de fin de semana, así que casi siempre
// pasa de una hora y "287 min" es menos legible que "4h 47min".
const formatMinutosHoras = (min) => {
  if (min == null) return "—";
  if (min < 60) return `${formatearNumero(min, 0)} min`;
  const horas = Math.floor(min / 60);
  const minutos = Math.round(min % 60);
  return minutos > 0 ? `${horas}h ${minutos}min` : `${horas}h`;
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

const formatearObra = (obra, cc) => (cc != null ? `CC ${cc} · ${obra || "Sin obra"}` : obra || "Sin obra");

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid rgba(0,78,137,0.12)",
  borderRadius: 10,
  fontSize: 12,
  fontFamily: "Outfit, system-ui, sans-serif",
};

const claseNivelPresupuesto = (pct) => {
  if (pct == null) return null;
  if (pct > 100) return "red";
  if (pct >= 80) return "yellow";
  return "green";
};

const PresupuestoChip = ({ pct }) => {
  const nivel = claseNivelPresupuesto(pct);
  if (nivel == null) return null;
  return (
    <span className={`rps__obra-row-chip-presupuesto rps__obra-row-chip-presupuesto--${nivel}`}>
      {pct}% de presupuesto usado
    </span>
  );
};

const KpiCard = ({ icon: Icon, label, value, comparativa, color }) => {
  const hasTrend = comparativa && typeof comparativa.pct === "number";
  return (
    <div className="rps__kpi">
      <div className="rps__kpi-icon" style={{ backgroundColor: `${color}20`, color }}>
        <Icon size={18} />
      </div>
      <div className="rps__kpi-label">{label}</div>
      <div className="rps__kpi-value">{value}</div>
      {hasTrend && (
        <div className={`rps__kpi-trend rps__kpi-trend--${comparativa.sube ? "up" : "down"}`}>
          {comparativa.sube ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{Math.abs(comparativa.pct)}% vs. semana anterior</span>
        </div>
      )}
    </div>
  );
};

const IndicadorCard = ({ icon: Icon, tono, label, value, sub, children }) => (
  <div className={`rps__indicador-card rps__indicador-card--${tono}`}>
    <div className="rps__indicador-icon">
      <Icon size={15} />
    </div>
    <span className="rps__indicador-label">{label}</span>
    <span className="rps__indicador-value">{value}</span>
    {sub && <span className="rps__indicador-sub">{sub}</span>}
    {children}
  </div>
);

// Trazabilidad del KPI "Renta No Aprovechada" — este indicador es un
// resumen a nivel compañía (sin desglose por obra, ver
// calcularIndicadoresSemana en useReporteSemanal.js), así que sin esta
// lista no había forma de saber a qué obra/día ir a revisar. Muestra hasta
// 4 vales (los de mayor importe); el resto solo se cuenta.
const DetalleRentaDesperdiciada = ({ detalle }) => {
  if (!detalle || detalle.length === 0) return null;
  const visibles = detalle.slice(0, 4);
  const restantes = detalle.length - visibles.length;
  return (
    <ul className="rps__indicador-detalle">
      {visibles.map((v, i) => (
        <li key={`${v.folio || "sf"}-${i}`}>
          <span className="rps__indicador-detalle-dia">{v.fechaLabel}</span>
          <span className="rps__indicador-detalle-obra">{v.obra}</span>
          <span className="rps__indicador-detalle-equipo">{v.equipo}</span>
          <span className="rps__indicador-detalle-importe">{formatearMoneda(v.importe)}</span>
        </li>
      ))}
      {restantes > 0 && (
        <li className="rps__indicador-detalle-mas">+{restantes} vale{restantes === 1 ? "" : "s"} más</li>
      )}
    </ul>
  );
};

const ReporteSemanal = () => {
  const [searchParams] = useSearchParams();
  const {
    semana,
    fechaRef,
    setFechaRef,
    loading,
    error,
    kpis,
    comparativa,
    materialesSemana,
    rentaPorEquipo,
    pipasDeLaSemana,
    flotaPropia,
    indicadoresSemana,
    desgloseMaterial,
    desgloseRenta,
    resumenPorObra,
    eficiencia,
    refresh,
  } = useReporteSemanal();
  const [exportando, setExportando] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  // Reporte partido en 3 imágenes (mejor calidad/legibilidad en teléfono que
  // una o dos muy altas): parte1 = encabezado + KPIs + material/renta;
  // parte2 = Obras de la Semana; parte3 = Indicadores de Eficiencia +
  // Eficiencia Operativa.
  const parte1Ref = useRef(null);
  const parte2Ref = useRef(null);
  const parte3Ref = useRef(null);

  // Permite que el botón "Reporte Semanal" de Estadísticas Globales abra esta
  // pestaña ya posicionada en la semana que el usuario tenía seleccionada.
  useEffect(() => {
    const fechaParam = searchParams.get("fecha");
    if (fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) setFechaRef(fechaParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const semanaActual = calcularSemanaISO(fechaRef).fechaInicio === calcularSemanaISO(HOY).fechaInicio;
  const semanaPasada = calcularSemanaISO(fechaRef).fechaInicio === calcularSemanaISO(HACE_7_DIAS).fechaInicio;

  const handleDescargarImagen = async () => {
    if (!parte1Ref.current || !parte2Ref.current || !parte3Ref.current) return;
    try {
      setExportando(true);
      await exportarElementosComoImagenes(
        [parte1Ref.current, parte2Ref.current, parte3Ref.current],
        `Reporte_Semanal_${semana.año}-S${semana.numero}`
      );
    } catch (err) {
      console.error("Error al exportar imágenes del reporte semanal:", err);
    } finally {
      setExportando(false);
    }
  };

  const handleDescargarPDF = async () => {
    if (!parte1Ref.current || !parte2Ref.current || !parte3Ref.current) return;
    try {
      setExportandoPdf(true);
      await exportarElementosComoPDF(
        [parte1Ref.current, parte2Ref.current, parte3Ref.current],
        `Reporte_Semanal_${semana.año}-S${semana.numero}.pdf`
      );
    } catch (err) {
      console.error("Error al exportar PDF del reporte semanal:", err);
    } finally {
      setExportandoPdf(false);
    }
  };

  const claveObra = (o) => `${o.obra}__${o.cc}`;
  // Se muestran todas las obras con actividad en la semana — a diferencia
  // de un top acotado, aquí no hay "obras que no se ven": el reporte crece
  // verticalmente si hubo muchas obras trabajadas.
  const obrasVisibles = resumenPorObra;
  const maxImporteObra = Math.max(...resumenPorObra.map((o) => o.importeTotal), 1);
  const detalleMaterialPorObra = Object.fromEntries(desgloseMaterial.map((o) => [claveObra(o), o]));
  const detalleRentaPorObra = Object.fromEntries(desgloseRenta.map((o) => [claveObra(o), o]));

  const colorPorMaterial = Object.fromEntries(materialesSemana.map((m, i) => [m.material, PALETA[i % PALETA.length]]));
  const materialChartData = materialesSemana.map((m) => ({ ...m, color: colorPorMaterial[m.material] }));
  const rentaChartData = rentaPorEquipo.map((e, i) => ({ ...e, color: PALETA[i % PALETA.length] }));
  const alturaMaterial = Math.max(materialChartData.length * 48, 90);
  const alturaRenta = Math.max(rentaChartData.length * 48, 90);

  return (
    <div className="rps-page">
      {/* ── Barra de herramientas (no se incluye en la imagen exportada) ── */}
      <div className="rps-page__toolbar">
        <div className="rps-page__toolbar-left">
          <CalendarRange size={16} />
          <span>Reporte Semanal</span>
        </div>
        <div className="rps-page__toolbar-actions">
          <div className="rps__date-quick" role="group" aria-label="Atajos de semana">
            <button
              type="button"
              className={`rps__date-quick-btn${semanaActual ? " rps__date-quick-btn--active" : ""}`}
              onClick={() => setFechaRef(HOY)}
            >
              Esta semana
            </button>
            <button
              type="button"
              className={`rps__date-quick-btn${semanaPasada ? " rps__date-quick-btn--active" : ""}`}
              onClick={() => setFechaRef(HACE_7_DIAS)}
            >
              Semana pasada
            </button>
          </div>
          <input
            type="date"
            className="rps__date-input"
            value={fechaRef}
            onChange={(e) => setFechaRef(e.target.value)}
            aria-label="Seleccionar un día dentro de la semana del reporte"
            title="Cualquier día dentro de la semana a reportar"
          />
          <button
            className="rps__export-btn"
            onClick={handleDescargarImagen}
            disabled={loading || exportando || exportandoPdf}
          >
            <Download size={14} />
            {exportando ? "Generando…" : "Descargar imágenes"}
          </button>
          <button
            className="rps__export-btn rps__export-btn--pdf"
            onClick={handleDescargarPDF}
            disabled={loading || exportando || exportandoPdf}
          >
            <FileDown size={14} />
            {exportandoPdf ? "Generando…" : "Descargar PDF"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rps__error">
          <p>{error}</p>
          <button onClick={refresh}>Reintentar</button>
        </div>
      )}

      {loading ? (
        <div className="rps__loading">Cargando reporte…</div>
      ) : (
        <>
        {/* ── Parte 1: encabezado, KPIs, material y renta de la semana ── */}
        <div className="rps-page__report" ref={parte1Ref}>
          <div className="rps-page__report-header">
            <div>
              <h1 className="rps-page__title">Reporte Semanal</h1>
              <p className="rps-page__subtitle">Control de Acarreos · CAPAM · TRIACO · COEDESSA</p>
            </div>
            <div className="rps-page__report-meta">
              <span className="rps-page__fecha">{formatRangoSemana(semana)}</span>
              <span className="rps-page__generado">Generado el {formatFechaHoraGeneracion()}</span>
            </div>
          </div>

          {/* KPIs */}
          <div className="rps__kpi-grid">
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
              label="Importe (+IVA)"
              value={formatearMoneda(kpis.importeConIva)}
              comparativa={comparativa?.importeConIva}
              color="#8B5CF6"
            />
          </div>

          {/* Material de la semana */}
          <div className="rps__section-header">
            <h3>Material de la Semana</h3>
            <p>m³ movidos por tipo de material, toda la operación</p>
          </div>
          {materialChartData.length === 0 ? (
            <div className="rps__empty">Sin material registrado esta semana.</div>
          ) : (
            <div className="rps__chart-card rps__chart-card--full">
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

          {/* Flota propia (GEEM) y Pipas de agua */}
          <div className="rps__flota-propia">
            <div className="rps__info-card">
              <div className="rps__info-card-header">
                <Truck size={15} />
                <span>Flota Propia (Grupo GEEM)</span>
              </div>
              <div className="rps__info-card-stats">
                <div className="rps__info-card-stat">
                  <span className="rps__info-card-stat-val">{formatearNumero(flotaPropia.viajesGeem, 0)}</span>
                  <span className="rps__info-card-stat-lbl">Viajes</span>
                </div>
                <div className="rps__info-card-stat">
                  <span className="rps__info-card-stat-val">{formatearNumero(flotaPropia.viajesPlanta, 0)}</span>
                  <span className="rps__info-card-stat-lbl">A Planta</span>
                </div>
                <div className="rps__info-card-stat">
                  <span className="rps__info-card-stat-val rps__info-card-stat-val--money">
                    {formatearMoneda(flotaPropia.valorAhorrado)}
                  </span>
                  <span className="rps__info-card-stat-lbl">Ahorro Estimado</span>
                </div>
              </div>
              {flotaPropia.materialesPlanta.length > 0 && (
                <p className="rps__info-card-nota">
                  <Factory size={11} /> A planta:{" "}
                  {flotaPropia.materialesPlanta
                    .map((m) => `${m.material} (${formatearNumero(m.m3, 1)} m³)`)
                    .join(", ")}
                </p>
              )}
            </div>

            <div className="rps__info-card">
              <div className="rps__info-card-header">
                <Droplets size={15} />
                <span>Pipas de Agua</span>
              </div>
              <div className="rps__info-card-stats">
                <div className="rps__info-card-stat">
                  <span className="rps__info-card-stat-val">{formatearNumero(pipasDeLaSemana.totalViajes, 0)}</span>
                  <span className="rps__info-card-stat-lbl">Viajes</span>
                </div>
                <div className="rps__info-card-stat">
                  <span className="rps__info-card-stat-val">
                    {pipasDeLaSemana.volumenAprox != null ? `${formatearNumero(pipasDeLaSemana.volumenAprox, 1)} m³` : "—"}
                  </span>
                  <span className="rps__info-card-stat-lbl">Capacidad Aprox.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Renta de la semana */}
          <div className="rps__section-header">
            <h3>Renta de Equipo de la Semana</h3>
            <p>Importe por tipo de equipo, toda la operación</p>
          </div>
          {rentaChartData.length === 0 ? (
            <div className="rps__empty">Sin renta de equipo registrada esta semana.</div>
          ) : (
            <>
              <div className="rps__chart-card rps__chart-card--full">
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

              <div className="rps__renta-eficiencia">
                {rentaChartData.map((e) => {
                  const nivel = e.nivelEficiencia ? NIVEL_RENTA[e.nivelEficiencia] : null;
                  return (
                    <div key={e.equipo} className={`rps__renta-eficiencia-chip${nivel ? ` rps__renta-eficiencia-chip--${nivel.color}` : ""}`}>
                      <span className="rps__renta-eficiencia-nombre">{e.equipo}</span>
                      <span className="rps__renta-eficiencia-nivel">
                        {nivel ? `${nivel.label}${e.nivelEficiencia === "ideal" ? " ★" : ""}` : "—"}
                      </span>
                      <span className="rps__renta-eficiencia-ratio">
                        {e.viajesPorDia != null ? `${formatearNumero(e.viajesPorDia, 1)} viajes/día` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Parte 2: Obras de la Semana ── */}
        <div className="rps-page__report" ref={parte2Ref}>
          {/* Obras de la semana */}
          <div className="rps__section-header">
            <h3>Obras de la Semana</h3>
            <p>Importe total por obra, con su desglose de material y renta</p>
          </div>

          {resumenPorObra.length === 0 ? (
            <div className="rps__empty">Sin actividad registrada en ninguna obra esta semana.</div>
          ) : (
            <div className="rps__obra-rank">
              {obrasVisibles.map((o) => {
                const key = claveObra(o);
                const color = colorPorEmpresa(o.empresa) || COLOR_OBRA_SIN_EMPRESA;
                const mat = detalleMaterialPorObra[key];
                const renta = detalleRentaPorObra[key];
                return (
                  <div key={key} className="rps__obra-row">
                    <div className="rps__obra-row-top">
                      <span className="rps__obra-row-nombre">{formatearObra(o.obra, o.cc)}</span>
                      <span className="rps__obra-row-importe" style={{ color }}>
                        {formatearMoneda(o.importeTotal)}
                      </span>
                    </div>
                    <div className="rps__obra-row-bar-track">
                      <div
                        className="rps__obra-row-bar-fill"
                        style={{ width: `${Math.max((o.importeTotal / maxImporteObra) * 100, 2)}%`, background: color }}
                      />
                    </div>

                    {(mat || renta) && (
                      <div className="rps__obra-row-chips">
                        {mat?.materiales.map((m) => (
                          <div key={m.material} className="rps__obra-row-chip">
                            <span className="rps__obra-row-chip-nombre">{m.material}</span>
                            <span className="rps__obra-row-chip-stats">
                              {formatearNumero(m.viajes, 0)} viajes · {formatearNumero(m.m3Total, 2)} m³
                            </span>
                            {m.viajesPlanta > 0 && (
                              <span className="rps__obra-row-chip-planta">
                                <Factory size={10} /> A planta de asfaltos: {formatearNumero(m.m3Planta, 1)} m³
                              </span>
                            )}
                            {m.acumuladoM3 != null && (
                              <span className="rps__obra-row-chip-acumulado">
                                Acumulado obra: {formatearNumero(m.acumuladoM3, 0)} m³
                              </span>
                            )}
                            <PresupuestoChip pct={m.pctPresupuestoUsado} />
                          </div>
                        ))}
                        {renta && (
                          <div className="rps__obra-row-chip">
                            <span className="rps__obra-row-chip-nombre">Renta de Equipo</span>
                            <span className="rps__obra-row-chip-stats">
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
            </div>
          )}
        </div>

        {/* ── Parte 3: Indicadores de Eficiencia + Eficiencia Operativa ── */}
        <div className="rps-page__report" ref={parte3Ref}>
          {/* Indicadores de Eficiencia de la Semana — versión compacta a nivel
              compañía de índice de posición, flete evitado y renta no
              aprovechada (ver useIndicadoresEficiencia.js en EstadisticasGlobales) */}
          <div className="rps__section-header">
            <h3>Indicadores de Eficiencia — Semana</h3>
            <p>Índice de posición, flete evitado y renta no aprovechada, toda la operación</p>
          </div>
          <div className="rps__indicadores-grid">
            <IndicadorCard
              icon={Target}
              tono="azul"
              label="Índice de Posición Promedio"
              value={indicadoresSemana.indicePosicionPromedio != null ? `${formatearNumero(indicadoresSemana.indicePosicionPromedio, 1)} km` : "—"}
              sub="Distancia promedio ponderada por m³, todas las obras"
            />
            <IndicadorCard
              icon={Truck}
              tono="verde"
              label="Flete Evitado — Flota Propia"
              value={formatearMoneda(indicadoresSemana.fleteEvitadoTotal)}
              sub={`${formatearNumero(indicadoresSemana.viajesGeemTotal, 0)} viajes GEEM a tarifa de sindicato`}
            />
            <IndicadorCard
              icon={Wallet}
              tono="rojo"
              label="Renta No Aprovechada"
              value={formatearMoneda(indicadoresSemana.rentaDesperdiciadaTotal)}
              sub={
                indicadoresSemana.pctPocaEficienciaRenta != null
                  ? `${indicadoresSemana.pctPocaEficienciaRenta}% de los vales de renta con 1-3 viajes/día`
                  : "Vales de renta con 1-3 viajes/día"
              }
            >
              <DetalleRentaDesperdiciada detalle={indicadoresSemana.detalleRentaDesperdiciada} />
            </IndicadorCard>
          </div>

          {/* Eficiencia operativa */}
          <div className="rps__section-header">
            <h3>Eficiencia Operativa</h3>
            <p>Tiempos entre viajes y distribución de viajes por día de la semana</p>
          </div>

          <div className="rps__eficiencia-grid">
            <div className="rps__stat">
              <Clock size={16} />
              <div>
                <div className="rps__stat-value">
                  {formatMinutosHoras(eficiencia.tiempoPromedioEntreViajesMin)}
                </div>
                <div className="rps__stat-label">Promedio entre viajes</div>
              </div>
            </div>
            <div className="rps__stat">
              <Package size={16} />
              <div>
                <div className="rps__stat-value">{formatearNumero(eficiencia.m3PromedioPorViaje, 2)} m³</div>
                <div className="rps__stat-label">Promedio por viaje</div>
              </div>
            </div>
            <div className="rps__stat">
              <Activity size={16} />
              <div>
                <div className="rps__stat-value">{eficiencia.diaPico ? eficiencia.diaPico.label : "—"}</div>
                <div className="rps__stat-label">Día más activo</div>
              </div>
            </div>
          </div>

          <div className="rps__chart-card rps__chart-card--full" style={{ marginTop: 16 }}>
            <h4>Viajes por Día de la Semana, por Material</h4>
            {eficiencia.materialesDistintos.length === 0 ? (
              <div className="rps__empty">Sin viajes con hora registrada esta semana.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={eficiencia.distribucionDiaria} margin={{ top: 22, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 4" stroke="rgba(0,78,137,0.07)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`${v} viajes`, name]} />
                  <Legend
                    wrapperStyle={{ fontSize: 11.5, fontFamily: "Outfit, system-ui, sans-serif", paddingTop: 10 }}
                    iconType="square"
                    iconSize={9}
                  />
                  {eficiencia.materialesDistintos.map((material, i) => {
                    const esUltimo = i === eficiencia.materialesDistintos.length - 1;
                    return (
                      <Bar
                        key={material}
                        dataKey={material}
                        name={material}
                        stackId="viajes"
                        fill={colorPorMaterial[material] || "#94A3B8"}
                        radius={esUltimo ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                      >
                        {/* Total de viajes del día, rotulado sobre el segmento
                            superior de cada barra apilada (recharts no trae un
                            label de "total de stack" nativo). */}
                        {esUltimo && (
                          <LabelList
                            dataKey={material}
                            position="top"
                            content={({ x, y, width, index }) => {
                              const total = eficiencia.distribucionDiaria[index]?.total;
                              if (!total) return null;
                              return (
                                <text
                                  x={x + width / 2}
                                  y={y - 6}
                                  textAnchor="middle"
                                  fontSize={11}
                                  fontWeight={700}
                                  fontFamily="Barlow Condensed, sans-serif"
                                  fill="#1A2332"
                                >
                                  {total}
                                </text>
                              );
                            }}
                          />
                        )}
                      </Bar>
                    );
                  })}
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

export default ReporteSemanal;
