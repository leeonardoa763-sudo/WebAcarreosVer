/**
 * src/pages/EstadisticasGlobales.jsx
 *
 * Carta de presentación del sistema: KPIs, filtros por chips deslizables
 * (mes, semana, obra, empresa, sindicato, material, banco) y gráfica temporal.
 * Dos secciones de desglose por obra: una desde conciliaciones (oficial,
 * clic para ver la conciliación) y otra en tiempo real directo de `vales`
 * (con filtro "Hoy" y exportación a imagen).
 *
 * Dependencias: useEstadisticasGlobales, recharts, estadisticas-globales.css
 * Usado en: App.jsx (ruta /estadisticas)
 */

// 1. React
import { useMemo, useState, useRef, Fragment } from "react";

// 2. Iconos
import {
  LayoutDashboard,
  DollarSign,
  Clock,
  CalendarDays,
  Info,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  X,
  BarChart2,
  Users,
  Truck,
  Activity,
  TrendingUp,
  Award,
  ChevronRight,
  Package,
  Target,
  AlertTriangle,
  ExternalLink,
  FileText,
  Download,
  Image as ImageIcon,
} from "lucide-react";

// 3. Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";

// 4. Hooks
import { useEstadisticasGlobales } from "../hooks/useEstadisticasGlobales";

// 5. Utils
import { generarPDFReporteEstadisticas } from "../utils/exportarReporteEstadisticas";
import { exportarElementoComoImagen } from "../utils/exportarImagen";

// 6. Estilos
import "../styles/estadisticas-globales.css";

// ── Paleta ─────────────────────────────────────────────────────────
const DOT_COLORS = [
  "#FF6B35",
  "#004E89",
  "#1A936F",
  "#F59E0B",
  "#8B5CF6",
  "#06B6D4",
  "#EF4444",
  "#10B981",
];

// ── Utilidades ─────────────────────────────────────────────────────
const formatMXN = (n) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);

const formatNum = (n, decimales = 0) =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n || 0);

const formatKpiMonto = (n) => {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000)
    return `$${(n / 1_000_000).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}M`;
  return formatMXN(n);
};

const formatFecha = (ts) => {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Mexico_City",
  });
};

const getSemaforo = (consumido, presupuestado) => {
  if (!presupuestado || Number(presupuestado) === 0)
    return { pct: 0, pctLabel: "0%", color: "green" };
  const pct = Number(consumido) / Number(presupuestado);
  return {
    pct,
    pctLabel: `${Math.round(pct * 100)}%`,
    color: pct > 1 ? "red" : pct >= 0.8 ? "yellow" : "green",
  };
};

const formatMesChip = (mesKey) => {
  if (!mesKey) return mesKey;
  const [year, month] = mesKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  const mes = d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");
  return `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${year.slice(2)}`;
};

const formatMesEjeX = (mesKey) => {
  if (!mesKey) return "";
  const [year, month] = mesKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d
    .toLocaleDateString("es-MX", { month: "short" })
    .replace(".", "")
    .toUpperCase();
};

const formatMesToolTip = (mesKey) => {
  if (!mesKey) return "";
  const [year, month] = mesKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
};

const formatSemanaChip = (key) => {
  if (!key) return key;
  const [year, sem] = key.split("-S");
  return `Sem ${Number(sem)}, ${year}`;
};

const formatObraCompleta = (obra) => {
  if (!obra) return "Sin obra";
  const partes = [];
  if (obra.empresas?.empresa) partes.push(obra.empresas.empresa);
  if (obra.cc != null) partes.push(`CC ${obra.cc}`);
  partes.push(obra.obra || "Sin obra");
  return partes.join(" · ");
};

// ── KPI Card ───────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sublabel, colorClass, loading }) => {
  if (loading) {
    return (
      <div className="eg__kpi-card eg__kpi-card--skeleton">
        <div className="eg__kpi-icon" style={{ background: "rgba(0,0,0,0.06)" }} />
        <span className="eg__kpi-label" style={{ background: "rgba(0,0,0,0.08)", borderRadius: 3, color: "transparent", width: 80, display: "inline-block" }}>───</span>
        <span className="eg__kpi-value" style={{ background: "rgba(0,0,0,0.1)", borderRadius: 4, color: "transparent", display: "inline-block", width: 120 }}>──────</span>
        <span className="eg__kpi-sublabel" style={{ background: "rgba(0,0,0,0.06)", borderRadius: 3, color: "transparent", display: "inline-block", width: 100 }}>────</span>
      </div>
    );
  }

  return (
    <div className={`eg__kpi-card eg__kpi-card--${colorClass}`}>
      <div className="eg__kpi-icon">
        <Icon size={20} color="white" strokeWidth={2} />
      </div>
      <span className="eg__kpi-label">{label}</span>
      <span className="eg__kpi-value">{value}</span>
      <span className="eg__kpi-sublabel">{sublabel}</span>
    </div>
  );
};

// ── Filter Panel (opciones de la categoría abierta, multi-selección) ──
const FilterPanel = ({ opciones, valoresActivos, onSelect }) => {
  if (!opciones || opciones.length === 0) return null;
  const activos = valoresActivos || [];
  return (
    <div className="eg__filtro-panel">
      <button
        className={`eg__chip${activos.length === 0 ? " eg__chip--active" : ""}`}
        onClick={() => onSelect(null)}
      >
        Todos
      </button>
      {opciones.map((op) => {
        const id = op.id ?? op;
        const nombre = op.nombre ?? op;
        const isActive = activos.some((v) => String(v) === String(id));
        return (
          <button
            key={id}
            className={`eg__chip${isActive ? " eg__chip--active" : ""}`}
            onClick={() => onSelect(id)}
          >
            {nombre}
          </button>
        );
      })}
    </div>
  );
};

// ── Gráfica Material vs Tiempo ─────────────────────────────────────
const GraficaTiempo = ({ seriesTiempo, loading }) => {
  const { data, materiales } = seriesTiempo;

  if (loading) {
    return (
      <div className="eg__chart-section">
        <div className="eg__chart-skeleton" />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div className="eg__chart-section">
      <div className="eg__chart-header">
        <div className="eg__chart-header-left">
          <div className="eg__chart-eyebrow">
            <BarChart2 size={13} />
            Evolución histórica
          </div>
          <h2 className="eg__chart-title">Material vs Tiempo</h2>
        </div>
        <span className="eg__chart-subtitle">m³ transportados por mes · Top {materiales.length} materiales</span>
      </div>
      <div className="eg__chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 12, right: 28, left: -8, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 4" stroke="rgba(0,78,137,0.07)" vertical={false} />
            <XAxis
              dataKey="mes"
              tickFormatter={formatMesEjeX}
              tick={{ fontSize: 10.5, fontFamily: "Outfit, system-ui, sans-serif", fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              tick={{ fontSize: 10.5, fontFamily: "Outfit, system-ui, sans-serif", fill: "#64748B" }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              formatter={(v, name) => [`${Number(v).toLocaleString("es-MX")} m³`, name]}
              labelFormatter={formatMesToolTip}
              contentStyle={{
                background: "#ffffff",
                border: "1px solid rgba(0,78,137,0.12)",
                borderRadius: 10,
                fontSize: 12,
                fontFamily: "Outfit, system-ui, sans-serif",
                boxShadow: "0 8px 28px rgba(0,78,137,0.11)",
              }}
              itemStyle={{ fontFamily: "Barlow Condensed, system-ui, sans-serif", fontSize: 13 }}
              labelStyle={{ fontWeight: 700, color: "#1A2332", marginBottom: 4 }}
              cursor={{ fill: "rgba(0,78,137,0.04)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11.5, fontFamily: "Outfit, system-ui, sans-serif", paddingTop: 16 }}
              iconType="square"
              iconSize={8}
            />
            {materiales.map((mat, i) => (
              <Bar
                key={mat}
                dataKey={mat}
                stackId="stack"
                fill={DOT_COLORS[i % DOT_COLORS.length]}
                radius={i === materiales.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ── Tooltip compartido ──────────────────────────────────────────────
const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid rgba(0,78,137,0.12)",
  borderRadius: 10,
  fontSize: 12,
  fontFamily: "Outfit, system-ui, sans-serif",
  boxShadow: "0 8px 28px rgba(0,78,137,0.11)",
};

// ── Gráfica Viajes de Renta ────────────────────────────────────────
const GraficaViajesRenta = ({ seriesTiempoRenta, tablaViajesRentaPorEquipo, loading }) => {
  const { data, equipos } = seriesTiempoRenta;

  if (loading) {
    return (
      <div className="eg__chart-section">
        <div className="eg__chart-skeleton" />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const totales = tablaViajesRentaPorEquipo.reduce(
    (acc, obraRow) => ({
      viajes:     acc.viajes     + obraRow.subtotal.viajes,
      totalDias:  acc.totalDias  + obraRow.subtotal.totalDias,
      totalHoras: acc.totalHoras + obraRow.subtotal.totalHoras,
    }),
    { viajes: 0, totalDias: 0, totalHoras: 0 }
  );

  return (
    <div className="eg__chart-section">
      <div className="eg__chart-header">
        <div className="eg__chart-header-left">
          <div className="eg__chart-eyebrow">
            <Clock size={13} />
            Equipo rentado en obra
          </div>
          <h2 className="eg__chart-title">Viajes de Renta por Tipo de Equipo</h2>
        </div>
        <span className="eg__chart-subtitle">
          Viajes registrados por mes · Top {equipos.length} tipos de equipo
        </span>
      </div>

      <div className="eg__chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 12, right: 28, left: -8, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 4" stroke="rgba(0,78,137,0.07)" vertical={false} />
            <XAxis
              dataKey="mes"
              tickFormatter={formatMesEjeX}
              tick={{ fontSize: 10.5, fontFamily: "Outfit, system-ui, sans-serif", fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              tick={{ fontSize: 10.5, fontFamily: "Outfit, system-ui, sans-serif", fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
              width={32}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(v, name) => [`${Number(v).toLocaleString("es-MX")} viajes`, name]}
              labelFormatter={formatMesToolTip}
              contentStyle={tooltipStyle}
              itemStyle={{ fontFamily: "Barlow Condensed, system-ui, sans-serif", fontSize: 13 }}
              labelStyle={{ fontWeight: 700, color: "#1A2332", marginBottom: 4 }}
              cursor={{ fill: "rgba(0,78,137,0.04)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11.5, fontFamily: "Outfit, system-ui, sans-serif", paddingTop: 16 }}
              iconType="square"
              iconSize={8}
            />
            {equipos.map((equipo, i) => (
              <Bar
                key={equipo}
                dataKey={equipo}
                stackId="stack"
                fill={DOT_COLORS[i % DOT_COLORS.length]}
                radius={i === equipos.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {tablaViajesRentaPorEquipo.length > 0 && (
        <div className="eg__tabla-wrap">
          <table className="eg__tabla">
            <thead>
              <tr>
                <th>Tipo de Equipo</th>
                <th>Viajes</th>
                <th>Días</th>
                <th>Horas</th>
              </tr>
            </thead>
            <tbody>
              {tablaViajesRentaPorEquipo.map((obraRow) => (
                <Fragment key={obraRow.obra}>
                  <tr className="eg__tabla-obra-header">
                    <td colSpan={4}>
                      <span className="eg__tabla-obra-label">
                        {obraRow.cc != null && (
                          <span className="eg__tabla-obra-cc">CC {obraRow.cc}</span>
                        )}
                        {obraRow.obra}
                      </span>
                    </td>
                  </tr>
                  {obraRow.equipos.map((eq, i) => (
                    <tr key={eq.equipo}>
                      <td>
                        <div className="eg__material-name eg__material-name--sub">
                          <span
                            className="eg__material-dot"
                            style={{ background: DOT_COLORS[i % DOT_COLORS.length] }}
                          />
                          {eq.equipo}
                        </div>
                      </td>
                      <td>{formatNum(eq.viajes)}</td>
                      <td>{formatNum(eq.totalDias, 1)}</td>
                      <td>{formatNum(eq.totalHoras, 1)}</td>
                    </tr>
                  ))}
                  {obraRow.equipos.length > 1 && (
                    <tr className="eg__tabla-subtotal">
                      <td>Subtotal</td>
                      <td>{formatNum(obraRow.subtotal.viajes)}</td>
                      <td>{formatNum(obraRow.subtotal.totalDias, 1)}</td>
                      <td>{formatNum(obraRow.subtotal.totalHoras, 1)}</td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
            {tablaViajesRentaPorEquipo.length > 1 && (
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td>{formatNum(totales.viajes)}</td>
                  <td>{formatNum(totales.totalDias, 1)}</td>
                  <td>{formatNum(totales.totalHoras, 1)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
};

// ── Gráfica Horas Pico ─────────────────────────────────────────────
const GraficaHorasPico = ({ horasPico }) => {
  const maxViajes = Math.max(...horasPico.map((h) => h.viajes), 1);
  const promedio = Math.round(horasPico.reduce((s, h) => s + h.viajes, 0) / 24);

  return (
    <div className="eg__avanzado-chart-wrap">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={horasPico} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="gradHoras" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#FF6B35" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" stroke="rgba(0,78,137,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9.5, fill: "#64748B", fontFamily: "Outfit, system-ui, sans-serif" }}
            axisLine={false}
            tickLine={false}
            interval={1}
            angle={-35}
            dy={8}
            height={40}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#64748B", fontFamily: "Outfit, system-ui, sans-serif" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => [`${v} viajes`, "Registros"]}
            labelFormatter={(l) => `Hora: ${l}`}
            labelStyle={{ fontWeight: 700, color: "#1A2332" }}
            itemStyle={{ color: "#FF6B35" }}
          />
          <ReferenceLine y={promedio} stroke="rgba(0,78,137,0.35)" strokeDasharray="4 3"
            label={{ value: `Prom ${promedio}`, fill: "#64748B", fontSize: 10, position: "insideTopRight" }} />
          <Area
            type="monotone"
            dataKey="viajes"
            stroke="#FF6B35"
            strokeWidth={2.5}
            fill="url(#gradHoras)"
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (payload.viajes !== maxViajes) return null;
              return <circle key={cx} cx={cx} cy={cy} r={5} fill="#FF6B35" stroke="#fff" strokeWidth={2} />;
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Gráfica Viajes por Vale ────────────────────────────────────────
const GraficaViajesPorVale = ({ viajesPorVale }) => (
  <div className="eg__avanzado-chart-wrap">
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={viajesPorVale} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 4" stroke="rgba(0,78,137,0.06)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="rango" tick={{ fontSize: 12, fill: "#1A2332", fontFamily: "Barlow Condensed, system-ui, sans-serif", fontWeight: 600 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} vales`, "Cantidad"]} labelFormatter={(l) => `${l} viajes/vale`} labelStyle={{ fontWeight: 700, color: "#1A2332" }} />
        <Bar dataKey="count" fill="#004E89" radius={[0, 6, 6, 0]} barSize={20}
          label={{ position: "right", fontSize: 11, fill: "#64748B", fontFamily: "Barlow Condensed, system-ui, sans-serif" }} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// ── Gráfica Rendimiento por Material ──────────────────────────────
const GraficaRendimiento = ({ rendimientoPorMaterial }) => (
  <div className="eg__avanzado-chart-wrap">
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rendimientoPorMaterial} margin={{ top: 8, right: 16, left: -12, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 4" stroke="rgba(0,78,137,0.06)" vertical={false} />
        <XAxis dataKey="material" tick={{ fontSize: 9.5, fill: "#64748B" }} axisLine={false} tickLine={false} dy={6} />
        <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v, name) => [
            name === "m3PorViaje" ? `${v} m³/viaje` : `${v} viajes/vale`,
            name === "m3PorViaje" ? "Rendimiento m³" : "Viajes por vale",
          ]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.materialFull || ""}
          labelStyle={{ fontWeight: 700, color: "#1A2332" }}
        />
        <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Outfit, system-ui, sans-serif", paddingTop: 12 }} iconSize={8} iconType="square"
          formatter={(v) => v === "m3PorViaje" ? "m³ / viaje" : "Viajes / vale"} />
        <Bar dataKey="m3PorViaje" fill="#1A936F" radius={[4, 4, 0, 0]} />
        <Bar dataKey="viajesPorVale" fill="#F59E0B" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// ── Top table (residentes, checadores, placas) ─────────────────────
const TopTable = ({ rows, cols, emptyMsg }) => (
  <div className="eg__top-table-wrap">
    <table className="eg__top-table">
      <thead>
        <tr>
          <th>#</th>
          {cols.map((c) => <th key={c.key}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={cols.length + 1} className="eg__top-empty">{emptyMsg}</td></tr>
        ) : rows.map((row, i) => (
          <tr key={i}>
            <td className="eg__top-rank">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
            </td>
            {cols.map((c) => (
              <td key={c.key} className={c.numeric ? "eg__top-num" : ""}>
                {c.format ? c.format(row[c.key]) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Sección Análisis Avanzado ──────────────────────────────────────
const SeccionPresupuestos = ({ materialRows, rentaRows, hayAlerta, loading }) => {
  const obrasMaterial = useMemo(() => {
    const map = {};
    materialRows.forEach((p) => {
      const obraId = p.id_obra;
      if (!map[obraId]) {
        map[obraId] = { obraId, obraLabel: formatObraCompleta(p.obras), items: [] };
      }
      map[obraId].items.push(p);
    });
    return Object.values(map).sort((a, b) => a.obraLabel.localeCompare(b.obraLabel));
  }, [materialRows]);

  const tieneData = materialRows.length > 0 || rentaRows.length > 0;

  if (loading) {
    return (
      <div className="eg__presup-section">
        <div className="eg__presup-skeleton" />
      </div>
    );
  }

  return (
    <div className="eg__presup-section">
      {hayAlerta && (
        <div className="eg__presup-alerta">
          <AlertTriangle size={16} className="eg__presup-alerta__icon" />
          <span className="eg__presup-alerta__msg">
            Uno o más conceptos han superado el presupuesto asignado.
          </span>
        </div>
      )}

      <div className="eg__presup-header">
        <div className="eg__presup-eyebrow">
          <Target size={13} />
          Control de Presupuesto
        </div>
        <h2 className="eg__presup-title">Presupuestos</h2>
        <p className="eg__presup-sub">
          Consumo acumulado vs. presupuesto asignado por obra
        </p>
      </div>

      {!tieneData ? (
        <div className="eg__presup-empty">
          Sin presupuestos configurados para las obras seleccionadas.
        </div>
      ) : (
        <div className="eg__presup-body">
          {obrasMaterial.length > 0 && (
            <div className="eg__presup-bloque">
              <div className="eg__presup-bloque__label">
                <Truck size={12} />
                Material
              </div>
              {obrasMaterial.map(({ obraId, obraLabel, items }) => (
                <div key={obraId} className="eg__presup-obra-grupo">
                  <div className="eg__presup-obra-nombre">{obraLabel}</div>
                  <div className="eg__presup-items">
                    {items.map((p) => {
                      const sem = getSemaforo(p.m3_consumidos, p.m3_presupuestados);
                      const barWidth = Math.min(sem.pct, 1) * 100;
                      return (
                        <div
                          key={p.id}
                          className={`eg__presup-item eg__presup-item--${sem.color}`}
                          title={`${formatNum(p.m3_consumidos, 2)} m³ de ${formatNum(p.m3_presupuestados, 2)} m³ presupuestados`}
                        >
                          <span className="eg__presup-item__nombre">
                            {p.material?.material || "—"}
                          </span>
                          <div className="eg__presup-item__bar-track">
                            <div
                              className={`eg__presup-item__bar-fill eg__presup-item__bar-fill--${sem.color}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <span className={`eg__presup-item__pct eg__presup-item__pct--${sem.color}`}>
                            {sem.pctLabel}
                          </span>
                          <span className="eg__presup-item__nums">
                            {formatNum(p.m3_consumidos, 1)} / {formatNum(p.m3_presupuestados, 1)} m³
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {rentaRows.length > 0 && (
            <div className="eg__presup-bloque eg__presup-bloque--renta">
              <div className="eg__presup-bloque__label">
                <Clock size={12} />
                Renta de Equipo
              </div>
              <div className="eg__presup-items eg__presup-items--full">
                {rentaRows.map((p) => {
                  const sem = getSemaforo(p.monto_consumido, p.monto_presupuestado);
                  const barWidth = Math.min(sem.pct, 1) * 100;
                  return (
                    <div
                      key={p.id}
                      className={`eg__presup-item eg__presup-item--${sem.color}`}
                      title={`${formatObraCompleta(p.obras)} · ${formatMXN(p.monto_consumido)} de ${formatMXN(p.monto_presupuestado)} presupuestados`}
                    >
                      <span className="eg__presup-item__nombre">
                        {formatObraCompleta(p.obras)}
                      </span>
                      <div className="eg__presup-item__bar-track">
                        <div
                          className={`eg__presup-item__bar-fill eg__presup-item__bar-fill--${sem.color}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className={`eg__presup-item__pct eg__presup-item__pct--${sem.color}`}>
                        {sem.pctLabel}
                      </span>
                      <span className="eg__presup-item__nums">
                        {formatKpiMonto(p.monto_consumido)} / {formatKpiMonto(p.monto_presupuestado)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SeccionAnalisisAvanzado = ({
  horasPico, viajesPorVale, topResidentes, topChecadores, topPlacas, rendimientoPorMaterial,
}) => {
  const totalViajes = horasPico.reduce((s, h) => s + h.viajes, 0);
  const horaPico = horasPico.reduce((max, h) => h.viajes > max.viajes ? h : max, { viajes: 0, label: "--" });

  return (
    <div className="eg__avanzado-section">
      {/* Eyebrow */}
      <div className="eg__avanzado-header">
        <div className="eg__avanzado-eyebrow">
          <Activity size={13} />
          Análisis Detallado
        </div>
        <h2 className="eg__avanzado-title">Estadísticas de Operación</h2>
        <p className="eg__avanzado-sub">Rendimientos, horas pico, residentes, checadores y vehículos más activos</p>
      </div>

      {/* Fila 1: Horas pico + Viajes por vale */}
      <div className="eg__avanzado-grid-2">
        <div className="eg__avanzado-card">
          <div className="eg__avanzado-card-header">
            <div className="eg__avanzado-card-left">
              <span className="eg__avanzado-card-eyebrow"><Activity size={11} /> Distribución horaria</span>
              <h3 className="eg__avanzado-card-title">Horas Pico de Registro</h3>
            </div>
            <div className="eg__avanzado-kpis">
              <div className="eg__avanzado-kpi">
                <span className="eg__avanzado-kpi-val">{horaPico.label}</span>
                <span className="eg__avanzado-kpi-label">Hora pico</span>
              </div>
              <div className="eg__avanzado-kpi">
                <span className="eg__avanzado-kpi-val">{totalViajes.toLocaleString("es-MX")}</span>
                <span className="eg__avanzado-kpi-label">Viajes total</span>
              </div>
            </div>
          </div>
          <GraficaHorasPico horasPico={horasPico} />
        </div>

        <div className="eg__avanzado-card">
          <div className="eg__avanzado-card-header">
            <div className="eg__avanzado-card-left">
              <span className="eg__avanzado-card-eyebrow"><BarChart2 size={11} /> Distribución</span>
              <h3 className="eg__avanzado-card-title">Viajes por Vale</h3>
            </div>
          </div>
          <GraficaViajesPorVale viajesPorVale={viajesPorVale} />
        </div>
      </div>

      {/* Fila 2: Rendimiento por material */}
      {rendimientoPorMaterial.length > 0 && (
        <div className="eg__avanzado-card eg__avanzado-card--full">
          <div className="eg__avanzado-card-header">
            <div className="eg__avanzado-card-left">
              <span className="eg__avanzado-card-eyebrow"><TrendingUp size={11} /> Eficiencia</span>
              <h3 className="eg__avanzado-card-title">Rendimiento por Material</h3>
            </div>
            <span className="eg__avanzado-card-sub">m³ promedio por viaje · viajes promedio por vale</span>
          </div>
          <GraficaRendimiento rendimientoPorMaterial={rendimientoPorMaterial} />
        </div>
      )}

      {/* Fila 3: Top Residentes + Top Checadores */}
      <div className="eg__avanzado-grid-2">
        <div className="eg__avanzado-card">
          <div className="eg__avanzado-card-header">
            <div className="eg__avanzado-card-left">
              <span className="eg__avanzado-card-eyebrow"><Users size={11} /> Residentes</span>
              <h3 className="eg__avanzado-card-title">Top Creadores de Vales</h3>
            </div>
            <span className="eg__avanzado-badge">{topResidentes.length} residentes</span>
          </div>
          <TopTable
            rows={topResidentes}
            emptyMsg="Sin datos de residentes"
            cols={[
              { key: "nombre", label: "Residente" },
              { key: "vales", label: "Vales", numeric: true },
              { key: "m3Total", label: "m³", numeric: true, format: (v) => `${Math.round(v).toLocaleString("es-MX")}` },
            ]}
          />
        </div>

        <div className="eg__avanzado-card">
          <div className="eg__avanzado-card-header">
            <div className="eg__avanzado-card-left">
              <span className="eg__avanzado-card-eyebrow"><Award size={11} /> Checadores</span>
              <h3 className="eg__avanzado-card-title">Top Registradores de Viajes</h3>
            </div>
            <span className="eg__avanzado-badge">{topChecadores.length} checadores</span>
          </div>
          <TopTable
            rows={topChecadores}
            emptyMsg="Sin datos de checadores"
            cols={[
              { key: "nombre", label: "Checador" },
              { key: "viajes", label: "Viajes", numeric: true },
              { key: "m3Total", label: "m³", numeric: true, format: (v) => `${Math.round(v).toLocaleString("es-MX")}` },
            ]}
          />
        </div>
      </div>

      {/* Fila 4: Top Placas */}
      <div className="eg__avanzado-card eg__avanzado-card--full">
        <div className="eg__avanzado-card-header">
          <div className="eg__avanzado-card-left">
            <span className="eg__avanzado-card-eyebrow"><Truck size={11} /> Vehículos</span>
            <h3 className="eg__avanzado-card-title">Top Placas por Actividad</h3>
          </div>
          <span className="eg__avanzado-badge">{topPlacas.length} vehículos</span>
        </div>
        <TopTable
          rows={topPlacas}
          emptyMsg="Sin datos de vehículos"
          cols={[
            { key: "placas", label: "Placas" },
            { key: "operador", label: "Operador" },
            { key: "vales", label: "Vales", numeric: true },
            { key: "viajes", label: "Viajes", numeric: true },
            { key: "m3Total", label: "m³ Total", numeric: true, format: (v) => `${Math.round(v).toLocaleString("es-MX")}` },
          ]}
        />
      </div>
    </div>
  );
};

// ── Modal: conciliaciones por material ─────────────────────────────
const ModalConciliacionesMaterial = ({ obraNombre, materialNombre, conciliaciones, onClose }) => {
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="eg__cm-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="eg__cm-modal">
        {/* Header */}
        <div className="eg__cm-header">
          <div className="eg__cm-header-left">
            <div className="eg__cm-header-eyebrow">
              <FileText size={13} />
              {obraNombre}
            </div>
            <h2 className="eg__cm-header-title">Conciliaciones de {materialNombre}</h2>
            <span className="eg__cm-header-count">
              {conciliaciones.length} {conciliaciones.length === 1 ? "conciliación" : "conciliaciones"}
            </span>
          </div>
          <button className="eg__cm-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Lista */}
        <div className="eg__cm-list">
          {conciliaciones.length === 0 ? (
            <div className="eg__cm-empty">
              Sin conciliaciones registradas para este material.
            </div>
          ) : (
            conciliaciones.map((conc) => (
              <div key={conc.id_conciliacion} className="eg__cm-item">
                <div className="eg__cm-item-info">
                  <span className="eg__cm-item-folio">{conc.folio}</span>
                  <span className="eg__cm-item-meta">
                    {conc.fecha_generacion
                      ? new Date(conc.fecha_generacion).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          timeZone: "America/Mexico_City",
                        })
                      : "—"}
                    {conc.sindicatos?.sindicato && (
                      <> · {conc.sindicatos.sindicato}</>
                    )}
                  </span>
                </div>
                <div className="eg__cm-item-right">
                  <span className="eg__cm-item-monto">
                    {formatMXN(Number(conc.total_final || 0))}
                  </span>
                  <a
                    href={`/conciliacion/${conc.folio}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="eg__cm-btn-ver"
                  >
                    Ver soporte
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ── Componente principal ────────────────────────────────────────────
const EstadisticasGlobales = () => {
  // 1. Hook principal
  const {
    loading,
    error,
    resumen,
    tablaMaterial,
    ultimaConciliacion,
    fetchEstadisticas,
    valeAConciliacion,
    filtros,
    toggleFiltro,
    resetFiltros,
    hayFiltrosActivos,
    opcionesMeses,
    opcionesSemanas,
    opcionesObras,
    opcionesEmpresas,
    opcionesSindicatos,
    opcionesMateriales,
    opcionesBancos,
    seriesTiempo,
    seriesTiempoRenta,
    tablaViajesRentaPorEquipo,
    topResidentes,
    topChecadores,
    topPlacas,
    horasPico,
    viajesPorVale,
    rendimientoPorMaterial,
    tablaObraMaterial,
    tablaRentaPorObra,
    periodoTiempoReal,
    seleccionarPeriodoTiempoReal,
    semanaTiempoReal,
    seleccionarSemanaTiempoReal,
    opcionesSemanasTiempoReal,
    loadingTiempoReal,
    errorTiempoReal,
    tablaObraMaterialTiempoReal,
    tablaObraRentaTiempoReal,
    loadingPresupuestos,
    presupuestosMaterialFiltrados,
    presupuestosRentaFiltrados,
    hayAlertaPresupuesto,
    comparativaPeriodoAnterior,
  } = useEstadisticasGlobales();

  // 2. Categoría abierta en el panel de filtros
  const [categoriaAbierta, setCategoriaAbierta] = useState(null);

  // 3. Modal de conciliaciones por material
  const [modalMaterial, setModalMaterial] = useState(null);

  // 4. Exportación de reporte PDF
  const [exportando, setExportando] = useState(false);

  // 5. Exportación de imagen del Desglose por Obra en tiempo real
  const [exportandoImagen, setExportandoImagen] = useState(false);
  const desgloseObraRef = useRef(null);

  const handleMaterialClick = (obraNombre, mat) => {
    const concMap = {};
    [...(mat.valesIds || [])].forEach((id) => {
      const c = valeAConciliacion[id];
      if (c) concMap[c.id_conciliacion] = c;
    });
    const concArr = Object.values(concMap).sort(
      (a, b) => new Date(b.fecha_generacion) - new Date(a.fecha_generacion)
    );
    setModalMaterial({ obraNombre, materialNombre: mat.material, conciliaciones: concArr });
  };

  const handleRentaClick = (row) => {
    const concArr = [...(row.conciliacionesArr || [])].sort(
      (a, b) => new Date(b.fecha_generacion) - new Date(a.fecha_generacion)
    );
    setModalMaterial({ obraNombre: row.obra, materialNombre: "Renta de Equipo", conciliaciones: concArr });
  };

  const toggleCategoria = (key) =>
    setCategoriaAbierta((prev) => (prev === key ? null : key));

  const handleExportarPDF = () => {
    try {
      setExportando(true);

      const filtrosActivos = categoriasConfig
        .filter((c) => c.valoresActivos.length > 0 && c.key !== "mes" && c.key !== "semana")
        .map((c) => ({ label: c.label, value: c.valorLabel }));

      const periodoLabel = filtros.mes.length > 0
        ? filtros.mes.map(formatMesChip).join(", ")
        : filtros.semana.length > 0
        ? filtros.semana.map(formatSemanaChip).join(", ")
        : "Todos los periodos";

      const periodoAnteriorLabel = comparativaPeriodoAnterior
        ? comparativaPeriodoAnterior.modo === "mes"
          ? formatMesChip(comparativaPeriodoAnterior.anteriorKey)
          : formatSemanaChip(comparativaPeriodoAnterior.anteriorKey)
        : null;

      const horaPicoDestacada = horasPico.reduce(
        (max, h) => (h.viajes > max.viajes ? h : max),
        { viajes: 0, label: "--" }
      );

      generarPDFReporteEstadisticas({
        filtrosActivos,
        periodoLabel,
        resumen,
        totalesTablaObra,
        comparativaPeriodoAnterior,
        periodoAnteriorLabel,
        tablaObraMaterial,
        tablaRentaPorObra,
        totalesRenta,
        presupuestosMaterial: presupuestosMaterialFiltrados,
        presupuestosRenta: presupuestosRentaFiltrados,
        hayAlertaPresupuesto,
        topResidente: topResidentes[0] || null,
        topChecador: topChecadores[0] || null,
        topPlaca: topPlacas[0] || null,
        horaPico: horaPicoDestacada.viajes > 0 ? horaPicoDestacada : null,
        mejorRendimiento: rendimientoPorMaterial[0] || null,
        ultimaConciliacion,
      });
    } catch (err) {
      console.error("Error al exportar reporte PDF:", err);
    } finally {
      setExportando(false);
    }
  };

  const handleExportarImagen = async () => {
    if (!desgloseObraRef.current) return;
    try {
      setExportandoImagen(true);
      const nombreArchivo = `Desglose_Obra_${new Date().toISOString().substring(0, 10)}.png`;
      await exportarElementoComoImagen(desgloseObraRef.current, nombreArchivo);
    } catch (err) {
      console.error("Error al exportar imagen:", err);
    } finally {
      setExportandoImagen(false);
    }
  };

  // 3. Totales de tablas
  const totalesTabla = useMemo(
    () =>
      tablaMaterial.reduce(
        (acc, row) => ({
          m3Total:     acc.m3Total     + row.m3Total,
          valesCount:  acc.valesCount  + row.valesCount,
          totalViajes: acc.totalViajes + row.totalViajes,
          importeIVA:  acc.importeIVA  + row.importeIVA,
        }),
        { m3Total: 0, valesCount: 0, totalViajes: 0, importeIVA: 0 }
      ),
    [tablaMaterial]
  );

  const totalesTablaObra = useMemo(
    () =>
      tablaObraMaterial.reduce(
        (acc, obraRow) => ({
          m3Total:     acc.m3Total     + obraRow.subtotal.m3Total,
          valesCount:  acc.valesCount  + obraRow.subtotal.valesCount,
          totalViajes: acc.totalViajes + obraRow.subtotal.totalViajes,
          importeIVA:  acc.importeIVA  + obraRow.subtotal.importeIVA,
        }),
        { m3Total: 0, valesCount: 0, totalViajes: 0, importeIVA: 0 }
      ),
    [tablaObraMaterial]
  );

  const totalesRenta = useMemo(
    () =>
      tablaRentaPorObra.reduce(
        (acc, row) => ({
          conciliaciones: acc.conciliaciones + row.conciliaciones,
          totalViajes:    acc.totalViajes    + row.totalViajes,
          totalDias:      acc.totalDias      + row.totalDias,
          totalHoras:     acc.totalHoras     + row.totalHoras,
          importeTotal:   acc.importeTotal   + row.importeTotal,
        }),
        { conciliaciones: 0, totalViajes: 0, totalDias: 0, totalHoras: 0, importeTotal: 0 }
      ),
    [tablaRentaPorObra]
  );

  const totalesTablaObraTiempoReal = useMemo(
    () =>
      tablaObraMaterialTiempoReal.reduce(
        (acc, obraRow) => ({
          m3Total:     acc.m3Total     + obraRow.subtotal.m3Total,
          valesCount:  acc.valesCount  + obraRow.subtotal.valesCount,
          totalViajes: acc.totalViajes + obraRow.subtotal.totalViajes,
          importeIVA:  acc.importeIVA  + obraRow.subtotal.importeIVA,
        }),
        { m3Total: 0, valesCount: 0, totalViajes: 0, importeIVA: 0 }
      ),
    [tablaObraMaterialTiempoReal]
  );

  const totalesRentaTiempoReal = useMemo(
    () =>
      tablaObraRentaTiempoReal.reduce(
        (acc, row) => ({
          vales:          acc.vales          + row.vales,
          totalViajes:    acc.totalViajes    + row.totalViajes,
          totalDias:      acc.totalDias      + row.totalDias,
          totalHoras:     acc.totalHoras     + row.totalHoras,
          subtotalSinIva: acc.subtotalSinIva + row.subtotalSinIva,
        }),
        { vales: 0, totalViajes: 0, totalDias: 0, totalHoras: 0, subtotalSinIva: 0 }
      ),
    [tablaObraRentaTiempoReal]
  );

  // 4. Config de categorías de filtros (multi-selección por categoría)
  const buildValorLabel = (opciones, valores) => {
    if (!valores || valores.length === 0) return null;
    if (valores.length === 1) {
      return opciones.find((o) => String(o.id) === String(valores[0]))?.nombre ?? String(valores[0]);
    }
    return `${valores.length} seleccionados`;
  };

  const categoriasConfig = useMemo(() => {
    const base = [
      {
        key: "mes", label: "Mes",
        opciones: opcionesMeses.map((m) => ({ id: m, nombre: formatMesChip(m) })),
        valoresActivos: filtros.mes,
      },
      {
        key: "semana", label: "Semana",
        opciones: opcionesSemanas.map((s) => ({ id: s, nombre: formatSemanaChip(s) })),
        valoresActivos: filtros.semana,
      },
      {
        key: "idObra", label: "Obra",
        opciones: opcionesObras,
        valoresActivos: filtros.idObra,
      },
      {
        key: "idEmpresa", label: "Empresa",
        opciones: opcionesEmpresas,
        valoresActivos: filtros.idEmpresa,
      },
      {
        key: "idSindicato", label: "Sindicato",
        opciones: opcionesSindicatos,
        valoresActivos: filtros.idSindicato,
      },
      {
        key: "material", label: "Material",
        opciones: opcionesMateriales.map((m) => ({ id: m, nombre: m })),
        valoresActivos: filtros.material,
      },
      {
        key: "idBanco", label: "Banco",
        opciones: opcionesBancos,
        valoresActivos: filtros.idBanco,
      },
    ];
    return base.map((c) => ({ ...c, valorLabel: buildValorLabel(c.opciones, c.valoresActivos) }));
  }, [filtros, opcionesMeses, opcionesSemanas, opcionesObras, opcionesEmpresas, opcionesSindicatos, opcionesMateriales, opcionesBancos]);

  const categoriaActual = categoriaAbierta
    ? categoriasConfig.find((c) => c.key === categoriaAbierta)
    : null;

  // 5. Skeleton de tabla
  const renderSkeletonRows = () =>
    Array.from({ length: 6 }).map((_, i) => (
      <tr key={i} className="eg__skeleton-row">
        <td>████████████████</td>
        <td>████████</td>
        <td>██████</td>
        <td>██████</td>
        <td>████████████████</td>
      </tr>
    ));

  // 6. Render
  return (
    <div className="eg__page">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="eg__header">
        <div className="eg__header-left">
          <div className="eg__eyebrow">
            <span className="eg__eyebrow-dot" />
            Control de Acarreos
          </div>
          <h1 className="eg__title">Estadísticas Globales</h1>
          <span className="eg__subtitle">
            Acumulado histórico · Basado en conciliaciones finalizadas
          </span>
        </div>
        <div className="eg__header-actions">
          <button
            className="eg__export-btn"
            onClick={handleExportarPDF}
            disabled={loading || !!error || exportando}
          >
            <Download size={14} />
            {exportando ? "Generando…" : "Exportar PDF"}
          </button>
          <button
            className={`eg__refresh-btn${loading ? " eg__refresh-btn--loading" : ""}`}
            onClick={fetchEstadisticas}
            disabled={loading}
          >
            <RefreshCw size={14} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ── Banner última conciliación ─────────────────────────── */}
      {ultimaConciliacion && !loading && !error && (
        <div className="eg__banner">
          <Info size={15} className="eg__banner-icon" />
          <div className="eg__banner-text">
            <span className="eg__banner-label">
              Datos actualizados hasta la última conciliación
            </span>
            <span className="eg__banner-sep">·</span>
            <span className="eg__banner-folio">{ultimaConciliacion.folio}</span>
            <span className="eg__banner-sep">·</span>
            <span className="eg__banner-date">
              {formatFecha(ultimaConciliacion.fecha_generacion)}
            </span>
          </div>
        </div>
      )}

      {/* ── Error global ──────────────────────────────────────── */}
      {error && !loading && (
        <div className="eg__error">
          <AlertCircle size={36} className="eg__error-icon" />
          <h3 className="eg__error-title">No se pudieron cargar las estadísticas</h3>
          <p className="eg__error-msg">{error}</p>
        </div>
      )}

      {/* ── Filtros compactos (sticky) ────────────────────────── */}
      {!error && !loading && (
        <div className="eg__filtros-wrap eg__filtros-wrap--sticky">
          {/* Barra de disparadores */}
          <div className="eg__filtros-bar">
            <SlidersHorizontal size={13} className="eg__filtros-bar-icon" />
            {categoriasConfig
              .filter((c) => c.opciones.length > 0)
              .map((cat) => {
                const isOpen = categoriaAbierta === cat.key;
                const isActivo = cat.valoresActivos.length > 0;
                return (
                  <button
                    key={cat.key}
                    className={[
                      "eg__filtro-trigger",
                      isActivo  ? "eg__filtro-trigger--activo" : "",
                      isOpen    ? "eg__filtro-trigger--abierto" : "",
                    ].join(" ")}
                    onClick={() => toggleCategoria(cat.key)}
                  >
                    <span className="eg__filtro-trigger-label">{cat.label}</span>
                    {isActivo && (
                      <span className="eg__filtro-trigger-val">{cat.valorLabel}</span>
                    )}
                    <ChevronDown
                      size={11}
                      className={`eg__filtro-chevron${isOpen ? " eg__filtro-chevron--open" : ""}`}
                    />
                  </button>
                );
              })}
            {hayFiltrosActivos && (
              <button
                className="eg__filtros-clear"
                onClick={() => { resetFiltros(); setCategoriaAbierta(null); }}
                title="Limpiar todos los filtros"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Panel de opciones */}
          {categoriaActual && categoriaActual.opciones.length > 0 && (
            <FilterPanel
              opciones={categoriaActual.opciones}
              valoresActivos={categoriaActual.valoresActivos}
              onSelect={(v) => toggleFiltro(categoriaActual.key, v)}
            />
          )}
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      {!error && (
        <div className="eg__kpi-grid">
          <KpiCard
            icon={Package}
            label="Material Movido"
            value={loading ? "—" : `${formatNum(totalesTablaObra.m3Total, 2)} m³`}
            sublabel="Volumen total transportado"
            colorClass="teal"
            loading={loading}
          />
          <KpiCard
            icon={LayoutDashboard}
            label="Total Conciliaciones"
            value={loading ? "—" : formatNum(resumen?.totalConciliaciones)}
            sublabel="Documentos finalizados"
            colorClass="blue"
            loading={loading}
          />
          <KpiCard
            icon={DollarSign}
            label="Importe Total"
            value={loading ? "—" : formatKpiMonto(resumen?.totalImporte)}
            sublabel={loading ? "" : formatMXN(resumen?.totalImporte)}
            colorClass="orange"
            loading={loading}
          />
          <KpiCard
            icon={Clock}
            label="Horas de Renta"
            value={loading ? "—" : formatNum(resumen?.totalHorasRenta, 1)}
            sublabel="Horas acumuladas en renta"
            colorClass="green"
            loading={loading}
          />
          <KpiCard
            icon={CalendarDays}
            label="Días de Renta"
            value={loading ? "—" : formatNum(resumen?.totalDiasRenta, 1)}
            sublabel="Días acumulados en renta"
            colorClass="amber"
            loading={loading}
          />
        </div>
      )}

      {/* ── Tabla por obra (material + renta) — desde conciliaciones ─── */}
      {!error && (
        <div className="eg__tabla-section">
          <div className="eg__tabla-header">
            <h2 className="eg__tabla-title">Desglose por Obra</h2>
            {!loading && (
              <span className="eg__tabla-badge">
                {tablaObraMaterial.length}{" "}
                {tablaObraMaterial.length === 1 ? "obra" : "obras"}
              </span>
            )}
          </div>

          {/* ─ Sub-sección material ─ */}
          <div className="eg__tabla-subseccion">
            <span className="eg__tabla-subseccion__label">
              <Truck size={12} />
              Material
            </span>
          </div>
          <div className="eg__tabla-wrap">
            <table className="eg__tabla">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>M³ Total</th>
                  <th>Vales</th>
                  <th>Viajes</th>
                  <th>Importe + IVA</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  renderSkeletonRows()
                ) : tablaObraMaterial.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="eg__empty">
                      {hayFiltrosActivos
                        ? "Sin resultados para los filtros seleccionados."
                        : "Sin datos de material en conciliaciones."}
                    </td>
                  </tr>
                ) : (
                  tablaObraMaterial.map((obraRow) => (
                    <Fragment key={obraRow.obra}>
                      <tr className="eg__tabla-obra-header">
                        <td colSpan={5}>
                          <span className="eg__tabla-obra-label">
                            {obraRow.empresa && (
                              <span className="eg__tabla-obra-empresa">{obraRow.empresa}</span>
                            )}
                            {obraRow.cc != null && (
                              <span className="eg__tabla-obra-cc">CC {obraRow.cc}</span>
                            )}
                            {obraRow.obra}
                          </span>
                        </td>
                      </tr>
                      {obraRow.materiales.map((mat, matIdx) => (
                        <tr
                          key={mat.material}
                          className="eg__tabla-row--clickable"
                          onClick={() => handleMaterialClick(obraRow.obra, mat)}
                          title="Ver conciliaciones de este material"
                        >
                          <td>
                            <div className="eg__material-name eg__material-name--sub">
                              <span
                                className="eg__material-dot"
                                style={{ background: DOT_COLORS[matIdx % DOT_COLORS.length] }}
                              />
                              {mat.material}
                            </div>
                          </td>
                          <td>{formatNum(mat.m3Total, 2)} m³</td>
                          <td>{formatNum(mat.valesCount)}</td>
                          <td>{formatNum(mat.totalViajes)}</td>
                          <td className="eg__importe-cell">{formatMXN(mat.importeIVA)}</td>
                        </tr>
                      ))}
                      {obraRow.materiales.length > 1 && (
                        <tr className="eg__tabla-subtotal">
                          <td>Subtotal</td>
                          <td>{formatNum(obraRow.subtotal.m3Total, 2)} m³</td>
                          <td>{formatNum(obraRow.subtotal.valesCount)}</td>
                          <td>{formatNum(obraRow.subtotal.totalViajes)}</td>
                          <td className="eg__importe-cell">{formatMXN(obraRow.subtotal.importeIVA)}</td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
              {!loading && tablaObraMaterial.length > 0 && (
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td>{formatNum(totalesTablaObra.m3Total, 2)} m³</td>
                    <td>{formatNum(totalesTablaObra.valesCount)}</td>
                    <td>{formatNum(totalesTablaObra.totalViajes)}</td>
                    <td className="eg__importe-cell">
                      {formatMXN(totalesTablaObra.importeIVA)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* ─ Sub-sección renta ─ */}
          {!loading && (
            <>
              <div className="eg__tabla-subseccion eg__tabla-subseccion--renta">
                <span className="eg__tabla-subseccion__label">
                  <Clock size={12} />
                  Renta de Equipo
                </span>
                {tablaRentaPorObra.length > 0 && (
                  <span className="eg__tabla-badge eg__tabla-badge--green">
                    {tablaRentaPorObra.length}{" "}
                    {tablaRentaPorObra.length === 1 ? "obra" : "obras"}
                  </span>
                )}
              </div>
              <div className="eg__tabla-wrap">
                <table className="eg__tabla">
                  <thead>
                    <tr>
                      <th>Obra</th>
                      <th>Conciliaciones</th>
                      <th>Días</th>
                      <th>Horas</th>
                      <th>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablaRentaPorObra.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="eg__empty">
                          {hayFiltrosActivos
                            ? "Sin renta para los filtros seleccionados."
                            : "Sin conciliaciones de renta."}
                        </td>
                      </tr>
                    ) : (
                      tablaRentaPorObra.map((row) => (
                        <tr
                          key={row.obra}
                          className="eg__tabla-row--clickable"
                          onClick={() => handleRentaClick(row)}
                          title="Ver conciliaciones de esta obra"
                        >
                          <td>
                            <span className="eg__obra-cell">
                              {row.empresa && (
                                <span className="eg__tabla-obra-empresa">{row.empresa}</span>
                              )}
                              {row.cc != null && (
                                <span className="eg__tabla-obra-cc">CC {row.cc}</span>
                              )}
                              {row.obra}
                            </span>
                          </td>
                          <td>{formatNum(row.conciliaciones)}</td>
                          <td>{formatNum(row.totalDias, 1)}</td>
                          <td>{formatNum(row.totalHoras, 1)}</td>
                          <td className="eg__importe-cell">{formatMXN(row.importeTotal)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {tablaRentaPorObra.length > 0 && (
                    <tfoot>
                      <tr>
                        <td>Total</td>
                        <td>{formatNum(totalesRenta.conciliaciones)}</td>
                        <td>{formatNum(totalesRenta.totalDias, 1)}</td>
                        <td>{formatNum(totalesRenta.totalHoras, 1)}</td>
                        <td className="eg__importe-cell">
                          {formatMXN(totalesRenta.importeTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tabla por obra (material + renta) — en tiempo real ─── */}
      {!error && (
        <div className="eg__tabla-section">
          <div className="eg__tabla-header">
            <div className="eg__tabla-header-left">
              <h2 className="eg__tabla-title">Desglose por Obra — Hoy</h2>
              <span className="eg__tabla-eyebrow-live">En tiempo real</span>
            </div>
            <div className="eg__tabla-header-right">
              <div className="eg__periodo-group">
                <button
                  className={`eg__periodo-btn${periodoTiempoReal === "hoy" ? " eg__periodo-btn--activo" : ""}`}
                  onClick={() => seleccionarPeriodoTiempoReal("hoy")}
                  title="Vales creados hoy"
                >
                  <CalendarDays size={13} />
                  Hoy
                </button>
                <button
                  className={`eg__periodo-btn${periodoTiempoReal === "ayer" ? " eg__periodo-btn--activo" : ""}`}
                  onClick={() => seleccionarPeriodoTiempoReal("ayer")}
                  title="Vales creados ayer"
                >
                  Ayer
                </button>
                <button
                  className={`eg__periodo-btn${periodoTiempoReal === "semana" ? " eg__periodo-btn--activo" : ""}`}
                  onClick={() => seleccionarPeriodoTiempoReal("semana")}
                  title="Vales creados en la semana seleccionada"
                >
                  Semana
                </button>
                {periodoTiempoReal === "semana" && (
                  <select
                    className="eg__periodo-select"
                    value={semanaTiempoReal}
                    onChange={(e) => seleccionarSemanaTiempoReal(e.target.value)}
                  >
                    {opcionesSemanasTiempoReal.map((sem) => (
                      <option key={sem} value={sem}>{formatSemanaChip(sem)}</option>
                    ))}
                  </select>
                )}
              </div>
              <button
                className="eg__export-img-btn"
                onClick={handleExportarImagen}
                disabled={loadingTiempoReal || !!errorTiempoReal || exportandoImagen}
              >
                <ImageIcon size={13} />
                {exportandoImagen ? "Generando…" : "Exportar imagen"}
              </button>
              {!loadingTiempoReal && (
                <span className="eg__tabla-badge">
                  {tablaObraMaterialTiempoReal.length}{" "}
                  {tablaObraMaterialTiempoReal.length === 1 ? "obra" : "obras"}
                </span>
              )}
            </div>
          </div>

          <p className="eg__tabla-subnota">
            Incluye vales emitidos, verificados y conciliados aún no incluidos en un
            reporte oficial (no incluye borradores ni cancelados). El importe de
            Renta se muestra sin IVA ni retención — para la cifra oficial consulta
            la conciliación correspondiente.
          </p>

          {errorTiempoReal && (
            <div className="eg__empty">
              No se pudo cargar el desglose en tiempo real: {errorTiempoReal}
            </div>
          )}

          <div ref={desgloseObraRef}>
            {/* ─ Sub-sección material ─ */}
            <div className="eg__tabla-subseccion">
              <span className="eg__tabla-subseccion__label">
                <Truck size={12} />
                Material
              </span>
            </div>
            <div className="eg__tabla-wrap">
              <table className="eg__tabla">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>M³ Total</th>
                    <th>Vales</th>
                    <th>Viajes</th>
                    <th>Importe + IVA</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTiempoReal ? (
                    renderSkeletonRows()
                  ) : tablaObraMaterialTiempoReal.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="eg__empty">
                        Sin datos de material para el periodo y filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    tablaObraMaterialTiempoReal.map((obraRow) => (
                      <Fragment key={obraRow.obra}>
                        <tr className="eg__tabla-obra-header">
                          <td colSpan={5}>
                            <span className="eg__tabla-obra-label">
                              {obraRow.empresa && (
                                <span className="eg__tabla-obra-empresa">{obraRow.empresa}</span>
                              )}
                              {obraRow.cc != null && (
                                <span className="eg__tabla-obra-cc">CC {obraRow.cc}</span>
                              )}
                              {obraRow.obra}
                            </span>
                          </td>
                        </tr>
                        {obraRow.materiales.map((mat, matIdx) => (
                          <tr key={mat.material}>
                            <td>
                              <div className="eg__material-name eg__material-name--sub">
                                <span
                                  className="eg__material-dot"
                                  style={{ background: DOT_COLORS[matIdx % DOT_COLORS.length] }}
                                />
                                {mat.material}
                              </div>
                            </td>
                            <td>{formatNum(mat.m3Total, 2)} m³</td>
                            <td>{formatNum(mat.valesCount)}</td>
                            <td>{formatNum(mat.totalViajes)}</td>
                            <td className="eg__importe-cell">{formatMXN(mat.importeIVA)}</td>
                          </tr>
                        ))}
                        {obraRow.materiales.length > 1 && (
                          <tr className="eg__tabla-subtotal">
                            <td>Subtotal</td>
                            <td>{formatNum(obraRow.subtotal.m3Total, 2)} m³</td>
                            <td>{formatNum(obraRow.subtotal.valesCount)}</td>
                            <td>{formatNum(obraRow.subtotal.totalViajes)}</td>
                            <td className="eg__importe-cell">{formatMXN(obraRow.subtotal.importeIVA)}</td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
                {!loadingTiempoReal && tablaObraMaterialTiempoReal.length > 0 && (
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td>{formatNum(totalesTablaObraTiempoReal.m3Total, 2)} m³</td>
                      <td>{formatNum(totalesTablaObraTiempoReal.valesCount)}</td>
                      <td>{formatNum(totalesTablaObraTiempoReal.totalViajes)}</td>
                      <td className="eg__importe-cell">
                        {formatMXN(totalesTablaObraTiempoReal.importeIVA)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* ─ Sub-sección renta ─ */}
            {!loadingTiempoReal && (
              <>
                <div className="eg__tabla-subseccion eg__tabla-subseccion--renta">
                  <span className="eg__tabla-subseccion__label">
                    <Clock size={12} />
                    Renta de Equipo
                  </span>
                  {tablaObraRentaTiempoReal.length > 0 && (
                    <span className="eg__tabla-badge eg__tabla-badge--green">
                      {tablaObraRentaTiempoReal.length}{" "}
                      {tablaObraRentaTiempoReal.length === 1 ? "obra" : "obras"}
                    </span>
                  )}
                </div>
                <div className="eg__tabla-wrap">
                  <table className="eg__tabla">
                    <thead>
                      <tr>
                        <th>Obra</th>
                        <th>Vales</th>
                        <th>Viajes</th>
                        <th>Días</th>
                        <th>Horas</th>
                        <th>Subtotal (sin IVA)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tablaObraRentaTiempoReal.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="eg__empty">
                            Sin renta para el periodo y filtros seleccionados.
                          </td>
                        </tr>
                      ) : (
                        tablaObraRentaTiempoReal.map((row) => (
                          <tr key={row.obra}>
                            <td>
                              <span className="eg__obra-cell">
                                {row.empresa && (
                                  <span className="eg__tabla-obra-empresa">{row.empresa}</span>
                                )}
                                {row.cc != null && (
                                  <span className="eg__tabla-obra-cc">CC {row.cc}</span>
                                )}
                                {row.obra}
                              </span>
                            </td>
                            <td>{formatNum(row.vales)}</td>
                            <td>{formatNum(row.totalViajes)}</td>
                            <td>{formatNum(row.totalDias, 1)}</td>
                            <td>{formatNum(row.totalHoras, 1)}</td>
                            <td className="eg__importe-cell">{formatMXN(row.subtotalSinIva)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {tablaObraRentaTiempoReal.length > 0 && (
                      <tfoot>
                        <tr>
                          <td>Total</td>
                          <td>{formatNum(totalesRentaTiempoReal.vales)}</td>
                          <td>{formatNum(totalesRentaTiempoReal.totalViajes)}</td>
                          <td>{formatNum(totalesRentaTiempoReal.totalDias, 1)}</td>
                          <td>{formatNum(totalesRentaTiempoReal.totalHoras, 1)}</td>
                          <td className="eg__importe-cell">
                            {formatMXN(totalesRentaTiempoReal.subtotalSinIva)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Presupuestos ──────────────────────────────────────── */}
      {!error && (
        <SeccionPresupuestos
          materialRows={presupuestosMaterialFiltrados}
          rentaRows={presupuestosRentaFiltrados}
          hayAlerta={hayAlertaPresupuesto}
          loading={loadingPresupuestos}
        />
      )}

      {/* ── Gráfica Material vs Tiempo ─────────────────────────── */}
      {!error && (
        <GraficaTiempo seriesTiempo={seriesTiempo} loading={loading} />
      )}

      {/* ── Viajes de Renta por Tipo de Equipo ───────────────── */}
      {!error && (
        <GraficaViajesRenta
          seriesTiempoRenta={seriesTiempoRenta}
          tablaViajesRentaPorEquipo={tablaViajesRentaPorEquipo}
          loading={loading}
        />
      )}

      {/* ── Análisis Avanzado ─────────────────────────────────── */}
      {!error && !loading && (
        <SeccionAnalisisAvanzado
          horasPico={horasPico}
          viajesPorVale={viajesPorVale}
          topResidentes={topResidentes}
          topChecadores={topChecadores}
          topPlacas={topPlacas}
          rendimientoPorMaterial={rendimientoPorMaterial}
        />
      )}

      {/* ── Modal conciliaciones por material ──────────────────── */}
      {modalMaterial && (
        <ModalConciliacionesMaterial
          obraNombre={modalMaterial.obraNombre}
          materialNombre={modalMaterial.materialNombre}
          conciliaciones={modalMaterial.conciliaciones}
          onClose={() => setModalMaterial(null)}
        />
      )}

      {/* ── Deerflow branding ─────────────────────────────────── */}
      <div className="eg__deerflow">
        <a href="https://deerflow.tech" target="_blank" rel="noopener noreferrer">
          ✦ Deerflow
        </a>
      </div>
    </div>
  );
};

export default EstadisticasGlobales;
