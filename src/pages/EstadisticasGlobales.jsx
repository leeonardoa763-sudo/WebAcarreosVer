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
import { useMemo, useState, useRef, useEffect, Fragment } from "react";

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
  TrendingDown,
  Minus,
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
import { useIndicadoresEficiencia } from "../hooks/useIndicadoresEficiencia";

// 5. Componentes
import ModalReporteDiario from "../components/estadisticas/ModalReporteDiario";

// 6. Utils
import { generarPDFReporteEstadisticas } from "../utils/exportarReporteEstadisticas";
import { exportarElementoComoImagen } from "../utils/exportarImagen";
import {
  INDICE_POSICION_OBRA,
  FLETE_EVITADO_FLOTA_PROPIA,
  VIABILIDAD_FLOTA_PROPIA,
  RENTA_NO_APROVECHADA,
} from "../utils/interpretacionIndicadores";

// 7. Estilos
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

// ── Badge de nivel (Alto/Medio/Bajo) para los indicadores de eficiencia ─────
// `invertido`: en la mayoría de los indicadores "Alto" es malo (rojo); en
// aprovechamiento de ruta es al revés (Alto = ruta bien exprimida = verde).
const nivelBadge = (nivel, invertido = false) => {
  if (!nivel) return <span className="eg__pct-cell eg__pct-cell--none">—</span>;
  const colorPorNivel = invertido
    ? { alto: "green", medio: "yellow", bajo: "red" }
    : { alto: "red", medio: "yellow", bajo: "green" };
  const labelPorNivel = { alto: "Alto", medio: "Medio", bajo: "Bajo" };
  return (
    <span className={`eg__pct-cell eg__pct-cell--${colorPorNivel[nivel]}`}>
      {labelPorNivel[nivel]}
    </span>
  );
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
// Lista con checkboxes: se pueden marcar varias opciones a la vez. El botón
// "Limpiar" (onSelect(null)) deja la categoría en "todos". El switch Incluir/
// Excluir invierte la lógica de todo el arreglo seleccionado (IN ⇄ NOT IN).
const FilterPanel = ({ opciones, valoresActivos, onSelect, modo, onToggleModo }) => {
  if (!opciones || opciones.length === 0) return null;
  const activos = valoresActivos || [];
  return (
    <div className="eg__filtro-lista">
      <div className="eg__filtro-lista-head">
        <span className="eg__filtro-lista-titulo">
          {activos.length > 0
            ? `${activos.length} seleccionada${activos.length === 1 ? "" : "s"}`
            : "Selecciona una o varias opciones"}
        </span>
        <div className="eg__filtro-lista-head-right">
          {onToggleModo && (
            <div className="eg__filtro-modo" role="group" aria-label="Incluir o excluir selección">
              <button
                type="button"
                className={`eg__filtro-modo-btn${modo !== "excluir" ? " eg__filtro-modo-btn--activo" : ""}`}
                onClick={() => modo === "excluir" && onToggleModo()}
              >
                Incluir
              </button>
              <button
                type="button"
                className={`eg__filtro-modo-btn eg__filtro-modo-btn--excluir${modo === "excluir" ? " eg__filtro-modo-btn--activo" : ""}`}
                onClick={() => modo !== "excluir" && onToggleModo()}
              >
                Excluir
              </button>
            </div>
          )}
          {activos.length > 0 && (
            <button
              type="button"
              className="eg__filtro-lista-limpiar"
              onClick={() => onSelect(null)}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>
      <div className="eg__filtro-lista-opciones">
        {opciones.map((op) => {
          const id = op.id ?? op;
          const nombre = op.nombre ?? op;
          const isActive = activos.some((v) => String(v) === String(id));
          return (
            <label
              key={id}
              className={`eg__filtro-opcion${isActive ? " eg__filtro-opcion--active" : ""}`}
            >
              <input
                type="checkbox"
                className="eg__filtro-opcion-check"
                checked={isActive}
                onChange={() => onSelect(id)}
              />
              <span className="eg__filtro-opcion-nombre">{nombre}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

// ── Filtros de una sección (subconjunto de categorías relevante a ella) ──
// Vive dentro del body de cada SeccionColapsable. Las categorías comparten el
// mismo estado global de filtros/modosFiltro — solo cambia qué chips se
// muestran según lo que esa sección realmente usa.
const FiltrosSeccion = ({ categorias, categoriaAbierta, onToggleCategoria, onSelect, modosFiltro, onToggleModo }) => {
  const visibles = categorias.filter((c) => c.opciones.length > 0);
  if (visibles.length === 0) return null;

  const hayActivosAqui = visibles.some((c) => c.valoresActivos.length > 0);
  const categoriaActual = categoriaAbierta ? visibles.find((c) => c.key === categoriaAbierta) : null;

  return (
    <div className="eg__filtros-wrap">
      <div className="eg__filtros-bar">
        <SlidersHorizontal size={13} className="eg__filtros-bar-icon" />
        {visibles.map((cat) => {
          const isOpen = categoriaAbierta === cat.key;
          const isActivo = cat.valoresActivos.length > 0;
          const esExcluir = modosFiltro[cat.key] === "excluir";
          return (
            <button
              key={cat.key}
              className={[
                "eg__filtro-trigger",
                isActivo ? "eg__filtro-trigger--activo" : "",
                isOpen ? "eg__filtro-trigger--abierto" : "",
              ].join(" ")}
              onClick={() => onToggleCategoria(cat.key)}
            >
              <span className="eg__filtro-trigger-label">
                {esExcluir && isActivo ? `Sin ${cat.label.toLowerCase()}` : cat.label}
              </span>
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
        {hayActivosAqui && (
          <button
            className="eg__filtros-clear"
            onClick={() => {
              visibles.forEach((c) => { if (c.valoresActivos.length > 0) onSelect(c.key, null); });
              onToggleCategoria(null);
            }}
            title="Limpiar filtros de esta sección"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {categoriaActual && categoriaActual.opciones.length > 0 && (
        <FilterPanel
          opciones={categoriaActual.opciones}
          valoresActivos={categoriaActual.valoresActivos}
          onSelect={(v) => onSelect(categoriaActual.key, v)}
          modo={modosFiltro[categoriaActual.key]}
          onToggleModo={() => onToggleModo(categoriaActual.key)}
        />
      )}
    </div>
  );
};

// ── Gráfica Material vs Tiempo ─────────────────────────────────────
const GraficaTiempo = ({ seriesTiempo, loading, mostrarEncabezado = true, modo = "m3", onModoChange }) => {
  const { data, dataViajes, materiales } = seriesTiempo;
  const [materialActivo, setMaterialActivo] = useState(null);

  if (loading) {
    return (
      <div className="eg__chart-section">
        <div className="eg__chart-skeleton" />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const dataModo = modo === "viajes" ? dataViajes : data;
  const unidad = modo === "viajes" ? "viajes" : "m³";

  // Si el material seleccionado ya no existe en el set actual (cambiaron
  // filtros), lo ignoramos en vez de dejar la gráfica vacía.
  const activo = materialActivo && materiales.includes(materialActivo) ? materialActivo : null;
  const materialesVisibles = activo ? [activo] : materiales;
  const handleLegendClick = (entry) => {
    setMaterialActivo((actual) => (actual === entry.value ? null : entry.value));
  };

  return (
    <div className="eg__chart-section">
      {mostrarEncabezado && (
        <div className="eg__chart-header">
          <div className="eg__chart-header-left">
            <div className="eg__chart-eyebrow">
              <TrendingUp size={13} />
              Evolución histórica
            </div>
            <h2 className="eg__chart-title">Material vs Tiempo</h2>
          </div>
          <span className="eg__chart-subtitle">
            {activo
              ? `${activo} · ${unidad} por mes (escala propia)`
              : `${unidad} por mes · ${materiales.length} materiales`}
          </span>
        </div>
      )}
      <div className="eg__chart-toolbar">
        <div className="eg__chart-modo-switch" role="group" aria-label="Métrica de la gráfica">
          <button
            type="button"
            className={modo === "m3" ? "eg__chart-modo-switch__btn eg__chart-modo-switch__btn--active" : "eg__chart-modo-switch__btn"}
            onClick={() => onModoChange?.("m3")}
          >
            m³
          </button>
          <button
            type="button"
            className={modo === "viajes" ? "eg__chart-modo-switch__btn eg__chart-modo-switch__btn--active" : "eg__chart-modo-switch__btn"}
            onClick={() => onModoChange?.("viajes")}
          >
            Viajes
          </button>
        </div>
        {activo && (
          <button type="button" className="eg__chart-reset-pill" onClick={() => setMaterialActivo(null)}>
            <X size={12} /> Ver todos los materiales
          </button>
        )}
      </div>
      <div className="eg__chart-wrap">
        {/* domain "auto" recalcula la escala del eje Y solo con las líneas
            renderizadas, así que al aislar un material la gráfica queda con
            su propia escala automáticamente. */}
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dataModo} margin={{ top: 12, right: 28, left: -8, bottom: 0 }}>
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
              domain={[0, "auto"]}
              allowDecimals={modo === "m3"}
              tick={{ fontSize: 10.5, fontFamily: "Outfit, system-ui, sans-serif", fill: "#64748B" }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              formatter={(v, name) => [`${Number(v).toLocaleString("es-MX")} ${unidad}`, name]}
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
              cursor={{ stroke: "rgba(0,78,137,0.25)", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Legend
              payload={materiales.map((mat, i) => ({
                value: mat,
                id: mat,
                type: "circle",
                color: DOT_COLORS[i % DOT_COLORS.length],
              }))}
              onClick={handleLegendClick}
              wrapperStyle={{ fontSize: 11.5, fontFamily: "Outfit, system-ui, sans-serif", paddingTop: 16, cursor: "pointer" }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span
                  style={{
                    opacity: activo && activo !== value ? 0.4 : 1,
                    fontWeight: activo === value ? 700 : 500,
                  }}
                >
                  {value}
                </span>
              )}
            />
            {materialesVisibles.map((mat) => {
              const i = materiales.indexOf(mat);
              return (
                <Line
                  key={mat}
                  type="monotone"
                  dataKey={mat}
                  name={mat}
                  stroke={DOT_COLORS[i % DOT_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, strokeWidth: 0, fill: DOT_COLORS[i % DOT_COLORS.length] }}
                  activeDot={{ r: 5.5, strokeWidth: 2, stroke: "#fff" }}
                  isAnimationActive={!activo}
                />
              );
            })}
          </LineChart>
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
const GraficaViajesRenta = ({ seriesTiempoRenta, tablaViajesRentaPorEquipo, loading, mostrarEncabezado = true }) => {
  const { data, equipos } = seriesTiempoRenta;

  if (loading) {
    return (
      <div className="eg__chart-section">
        <div className="eg__chart-skeleton" />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const totalesBase = tablaViajesRentaPorEquipo.reduce(
    (acc, obraRow) => ({
      viajes:         acc.viajes         + obraRow.subtotal.viajes,
      totalDias:      acc.totalDias      + obraRow.subtotal.totalDias,
      totalHoras:     acc.totalHoras     + obraRow.subtotal.totalHoras,
      importeTotal:   acc.importeTotal   + obraRow.subtotal.importeTotal,
      capacidadSuma:  acc.capacidadSuma  + obraRow.subtotal.capacidadSuma,
      capacidadCount: acc.capacidadCount + obraRow.subtotal.capacidadCount,
    }),
    { viajes: 0, totalDias: 0, totalHoras: 0, importeTotal: 0, capacidadSuma: 0, capacidadCount: 0 }
  );
  const totales = {
    ...totalesBase,
    capacidadPromedio: totalesBase.capacidadCount > 0 ? totalesBase.capacidadSuma / totalesBase.capacidadCount : null,
    importePorViaje: totalesBase.viajes > 0 ? totalesBase.importeTotal / totalesBase.viajes : null,
  };
  totales.precioAproxM3 = totales.importePorViaje != null && totales.capacidadPromedio
    ? totales.importePorViaje / totales.capacidadPromedio
    : null;

  return (
    <div className="eg__chart-section">
      {mostrarEncabezado && (
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
      )}

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
                <th>Capacidad Prom.</th>
                <th>Importe / Viaje</th>
                <th>Precio Aprox. /m³</th>
              </tr>
            </thead>
            <tbody>
              {tablaViajesRentaPorEquipo.map((obraRow) => (
                <Fragment key={obraRow.obra}>
                  <tr className="eg__tabla-obra-header">
                    <td colSpan={7}>
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
                      <td>{eq.capacidadPromedio != null ? `${formatNum(eq.capacidadPromedio, 2)} m³` : "—"}</td>
                      <td className="eg__importe-cell">{eq.importePorViaje != null ? formatMXN(eq.importePorViaje) : "—"}</td>
                      <td className="eg__importe-cell">{eq.precioAproxM3 != null ? formatMXN(eq.precioAproxM3) : "—"}</td>
                    </tr>
                  ))}
                  {obraRow.equipos.length > 1 && (
                    <tr className="eg__tabla-subtotal">
                      <td>Subtotal</td>
                      <td>{formatNum(obraRow.subtotal.viajes)}</td>
                      <td>{formatNum(obraRow.subtotal.totalDias, 1)}</td>
                      <td>{formatNum(obraRow.subtotal.totalHoras, 1)}</td>
                      <td>{obraRow.subtotal.capacidadPromedio != null ? `${formatNum(obraRow.subtotal.capacidadPromedio, 2)} m³` : "—"}</td>
                      <td className="eg__importe-cell">{obraRow.subtotal.importePorViaje != null ? formatMXN(obraRow.subtotal.importePorViaje) : "—"}</td>
                      <td className="eg__importe-cell">{obraRow.subtotal.precioAproxM3 != null ? formatMXN(obraRow.subtotal.precioAproxM3) : "—"}</td>
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
                  <td>{totales.capacidadPromedio != null ? `${formatNum(totales.capacidadPromedio, 2)} m³` : "—"}</td>
                  <td className="eg__importe-cell">{totales.importePorViaje != null ? formatMXN(totales.importePorViaje) : "—"}</td>
                  <td className="eg__importe-cell">{totales.precioAproxM3 != null ? formatMXN(totales.precioAproxM3) : "—"}</td>
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

// ── Tarjeta de Índice de Posición por obra ──────────────────────────
// Una tarjeta por obra (no una fila más en una tabla grande): el número
// agregado va arriba junto con el rango de distancia usado y la tendencia
// mensual (si hay ≥3 meses de historia); abajo, un toggle entre el desglose
// por banco (qué tanto pesa cada uno en el índice, no solo en el volumen) y
// por material (precio de flete promedio ponderado por m³).
const TarjetaIndicePosicionObra = ({ datos }) => {
  const [vista, setVista] = useState("banco");
  const obraLabel = [datos.empresa, datos.cc != null ? `CC ${datos.cc}` : null, datos.obra]
    .filter(Boolean)
    .join(" · ");

  const filasBanco = datos.bancos.map((b) => ({
    banco: b.banco,
    m3: b.m3,
    pctVol: b.pctVol,
    distanciaKm: b.distanciaKm,
    viajes: b.viajes,
    aportaIndiceCell: (
      <span className={b.dominante ? "eg__pct-cell eg__pct-cell--red" : ""}>
        {formatNum(b.aportaIndice, 1)}%{b.dominante ? " ⚠" : ""}
      </span>
    ),
  }));

  const filasMaterial = datos.materiales.map((m) => ({
    material: m.material,
    m3: m.m3,
    precioFleteM3: m.precioFleteM3,
    rango: m.precioMin === m.precioMax ? formatMXN(m.precioMin) : `${formatMXN(m.precioMin)} – ${formatMXN(m.precioMax)}`,
  }));

  return (
    <div className="eg__avanzado-card">
      <div className="eg__avanzado-card-header">
        <div className="eg__avanzado-card-left">
          <span className="eg__avanzado-card-eyebrow"><Target size={11} /> {obraLabel}</span>
          <h3 className="eg__avanzado-card-title">{formatNum(datos.m3Total, 0)} m³ transportados</h3>
        </div>
        <div className="eg__avanzado-kpis">
          {datos.tendenciaMensual && datos.tendenciaMensual.length >= 2 && (() => {
            const primero = datos.tendenciaMensual[0];
            const ultimo = datos.tendenciaMensual[datos.tendenciaMensual.length - 1];
            const delta = ultimo.indice - primero.indice;
            // Umbral chico para no marcar como tendencia un ruido de <5%.
            const empeora = delta > primero.indice * 0.05;
            const mejora = delta < -primero.indice * 0.05;
            const Icono = empeora ? TrendingUp : mejora ? TrendingDown : Minus;
            return (
              <div className="eg__avanzado-kpi" title={`${formatNum(primero.indice, 1)} km (${formatMesChip(primero.mes)}) → ${formatNum(ultimo.indice, 1)} km (${formatMesChip(ultimo.mes)})`}>
                <span
                  className={
                    "eg__avanzado-kpi-val eg__tendencia-val" +
                    (empeora ? " eg__tendencia-val--mal" : mejora ? " eg__tendencia-val--bien" : " eg__tendencia-val--neutra")
                  }
                >
                  <Icono size={15} strokeWidth={2.5} />
                  {delta > 0 ? "+" : ""}{formatNum(delta, 1)} km
                </span>
                <span className="eg__avanzado-kpi-label">
                  {empeora ? "Empeoró" : mejora ? "Mejoró" : "Estable"} · {datos.tendenciaMensual.length} meses
                </span>
              </div>
            );
          })()}
          {datos.distanciaMinKm != null && (
            <div className="eg__avanzado-kpi">
              <span className="eg__avanzado-kpi-val">{formatNum(datos.distanciaMinKm, 0)}–{formatNum(datos.distanciaMaxKm, 0)}</span>
              <span className="eg__avanzado-kpi-label">Rango km</span>
            </div>
          )}
          <div className="eg__avanzado-kpi">
            <span className="eg__avanzado-kpi-val">{formatNum(datos.indicePosicion, 1)} km</span>
            <span className="eg__avanzado-kpi-label">Índice</span>
          </div>
          <div className="eg__avanzado-kpi">
            {nivelBadge(datos.nivel)}
            <span className="eg__avanzado-kpi-label">Nivel</span>
          </div>
        </div>
      </div>

      <div className="eg__chart-toolbar" style={{ padding: "10px 16px 0" }}>
        <div className="eg__chart-modo-switch" role="group" aria-label="Ver desglose por banco o por material">
          <button
            type="button"
            className={vista === "banco" ? "eg__chart-modo-switch__btn eg__chart-modo-switch__btn--active" : "eg__chart-modo-switch__btn"}
            onClick={() => setVista("banco")}
          >
            Por Banco
          </button>
          <button
            type="button"
            className={vista === "material" ? "eg__chart-modo-switch__btn eg__chart-modo-switch__btn--active" : "eg__chart-modo-switch__btn"}
            onClick={() => setVista("material")}
          >
            Por Material
          </button>
        </div>
      </div>

      {vista === "banco" ? (
        <TopTable
          rows={filasBanco}
          emptyMsg="Sin bancos con distancia registrada"
          cols={[
            { key: "banco", label: "Banco" },
            { key: "m3", label: "m³", numeric: true, format: (v) => formatNum(v, 0) },
            { key: "pctVol", label: "% Vol.", numeric: true, format: (v) => `${formatNum(v, 1)}%` },
            { key: "distanciaKm", label: "Distancia", numeric: true, format: (v) => `${formatNum(v, 1)} km` },
            { key: "viajes", label: "Viajes", numeric: true, format: (v) => formatNum(v, 0) },
            { key: "aportaIndiceCell", label: "% del Índice", numeric: true },
          ]}
        />
      ) : (
        <TopTable
          rows={filasMaterial}
          emptyMsg="Sin precio de flete registrado para estos materiales"
          cols={[
            { key: "material", label: "Material" },
            { key: "m3", label: "m³", numeric: true, format: (v) => formatNum(v, 0) },
            { key: "precioFleteM3", label: "Precio Flete Prom./m³", numeric: true, format: (v) => (v != null ? formatMXN(v) : "—") },
            { key: "rango", label: "Rango de Precio" },
          ]}
        />
      )}

      {datos.bancoDominante && (
        <p className="eg__avanzado-card-sub" style={{ padding: "10px 16px 16px" }}>
          {INDICE_POSICION_OBRA.notaBancoDominante}
        </p>
      )}
    </div>
  );
};

// ── Tarjeta de Flete Evitado por obra (GRUPO GEEM) ──────────────────
// El importe pagado a GEEM en el sistema ($1/km) es un valor técnico, no
// real — no se muestra. El único monto es el valor completo a tarifa de
// sindicato, que es directamente lo evitado.
const TarjetaFleteEvitadoObra = ({ datos }) => {
  const obraLabel = [datos.empresa, datos.cc != null ? `CC ${datos.cc}` : null, datos.obra]
    .filter(Boolean)
    .join(" · ");

  const filasRutas = datos.rutas.map((r) => ({
    banco: r.banco,
    material: r.material,
    m3: r.m3,
    viajes: r.viajes,
    distanciaKm: r.distanciaKm,
    valorSindicato: r.valorSindicato,
  }));

  return (
    <div className="eg__avanzado-card">
      <div className="eg__avanzado-card-header">
        <div className="eg__avanzado-card-left">
          <span className="eg__avanzado-card-eyebrow"><Truck size={11} /> {obraLabel}</span>
          <h3 className="eg__avanzado-card-title">{formatMXN(datos.valorTotalSindicato)} evitados</h3>
        </div>
        <div className="eg__avanzado-kpis">
          <div className="eg__avanzado-kpi">
            <span className="eg__avanzado-kpi-val">{datos.pctVolumenObra != null ? `${formatNum(datos.pctVolumenObra, 1)}%` : "—"}</span>
            <span className="eg__avanzado-kpi-label">Del Volumen de la Obra</span>
          </div>
          <div className="eg__avanzado-kpi">
            <span className="eg__avanzado-kpi-val">{formatNum(datos.viajesGeem, 0)}</span>
            <span className="eg__avanzado-kpi-label">Viajes GEEM</span>
          </div>
          <div className="eg__avanzado-kpi">
            <span className="eg__avanzado-kpi-val">{formatNum(datos.camionesGeemDistintos, 0)}</span>
            <span className="eg__avanzado-kpi-label">Camiones GEEM</span>
          </div>
          {datos.viajesGeemPlanta > 0 && (
            <div className="eg__avanzado-kpi">
              <span className="eg__avanzado-kpi-val">{formatNum(datos.pctPlanta, 0)}%</span>
              <span className="eg__avanzado-kpi-label">A Planta Asfaltos</span>
            </div>
          )}
        </div>
      </div>

      <TopTable
        rows={filasRutas}
        emptyMsg="Sin rutas de GEEM registradas"
        cols={[
          { key: "banco", label: "Banco" },
          { key: "material", label: "Material" },
          { key: "m3", label: "m³", numeric: true, format: (v) => formatNum(v, 0) },
          { key: "distanciaKm", label: "Distancia", numeric: true, format: (v) => `${formatNum(v, 1)} km` },
          { key: "viajes", label: "Viajes", numeric: true, format: (v) => formatNum(v, 0) },
          { key: "valorSindicato", label: "Valor a Tarifa Sindicato", numeric: true, format: (v) => formatMXN(v) },
        ]}
      />

      {datos.viajesPorMes.length > 1 && (
        <div style={{ padding: "4px 16px 16px" }}>
          <span className="eg__avanzado-card-eyebrow" style={{ marginBottom: 4, display: "inline-flex" }}>
            <CalendarDays size={11} /> Uso mensual de GEEM
          </span>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={datos.viajesPorMes} margin={{ top: 8, right: 20, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 4" stroke="rgba(0,78,137,0.07)" vertical={false} />
              <XAxis
                dataKey="mes"
                tickFormatter={formatMesEjeX}
                tick={{ fontSize: 10, fontFamily: "Outfit, system-ui, sans-serif", fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fontFamily: "Outfit, system-ui, sans-serif", fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                formatter={(v) => [`${v} viajes`, "GEEM"]}
                labelFormatter={formatMesToolTip}
                contentStyle={tooltipStyle}
                labelStyle={{ fontWeight: 700, color: "#1A2332", marginBottom: 4 }}
              />
              <Line
                type="monotone"
                dataKey="viajes"
                stroke="#004E89"
                strokeWidth={2.5}
                dot={{ r: 3.5, strokeWidth: 0, fill: "#004E89" }}
                activeDot={{ r: 5.5, strokeWidth: 2, stroke: "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// ── Tarjeta "¿Se justifica comprar un camión?" por obra ─────────────
// Combina camiones activos/día (toda la flota) con el ranking de placas de
// sindicato (excluye GEEM) — el importe pagado a la placa top simula el
// ahorro de haberla tenido como camión propio.
const TarjetaViabilidadFlotaObra = ({ camiones, topCamioneros }) => {
  const obraLabel = [topCamioneros.empresa, topCamioneros.cc != null ? `CC ${topCamioneros.cc}` : null, topCamioneros.obra]
    .filter(Boolean)
    .join(" · ");
  const mejor = topCamioneros.top[0];

  const filasTop = topCamioneros.top.map((p) => ({
    placas: p.placas,
    operador: p.operador,
    viajes: p.viajes,
    m3: p.m3,
    viajesPorDia: p.viajesPorDia,
    importe: p.importe,
  }));

  return (
    <div className="eg__avanzado-card">
      <div className="eg__avanzado-card-header">
        <div className="eg__avanzado-card-left">
          <span className="eg__avanzado-card-eyebrow"><Package size={11} /> {obraLabel}</span>
          <h3 className="eg__avanzado-card-title">
            {mejor ? `${mejor.placas} — top camión, ${formatMXN(mejor.importe)} pagados` : "Sin placas de sindicato en este filtro"}
          </h3>
        </div>
        <div className="eg__avanzado-kpis">
          {camiones && (
            <>
              <div className="eg__avanzado-kpi">
                <span className="eg__avanzado-kpi-val">{formatNum(camiones.promedioCamionesDia, 1)}</span>
                <span className="eg__avanzado-kpi-label">Camiones/día Prom.</span>
              </div>
              <div className="eg__avanzado-kpi">
                <span className="eg__avanzado-kpi-val">{formatNum(camiones.maxCamionesDia, 0)}</span>
                <span className="eg__avanzado-kpi-label">Máx. Camiones/día</span>
              </div>
            </>
          )}
          {topCamioneros.promedioViajesPorDiaObra != null && (
            <div className="eg__avanzado-kpi">
              <span className="eg__avanzado-kpi-val">{formatNum(topCamioneros.promedioViajesPorDiaObra, 1)}</span>
              <span className="eg__avanzado-kpi-label">Viajes/día Prom. Camión</span>
            </div>
          )}
          <div className="eg__avanzado-kpi">
            <span className="eg__avanzado-kpi-val">{formatMXN(topCamioneros.promedioImportePorCamion)}</span>
            <span className="eg__avanzado-kpi-label">Pagado — Camión Prom. ({topCamioneros.totalPlacas})</span>
          </div>
        </div>
      </div>

      <TopTable
        rows={filasTop}
        emptyMsg="Sin placas de sindicato con viajes en este filtro"
        cols={[
          { key: "placas", label: "Placa" },
          { key: "operador", label: "Operador" },
          { key: "viajes", label: "Viajes", numeric: true, format: (v) => formatNum(v, 0) },
          { key: "m3", label: "m³", numeric: true, format: (v) => formatNum(v, 0) },
          { key: "viajesPorDia", label: "Viajes/día", numeric: true, format: (v) => (v != null ? formatNum(v, 1) : "—") },
          { key: "importe", label: "Pagado (ahorro si fuera propio)", numeric: true, format: (v) => formatMXN(v) },
        ]}
      />
    </div>
  );
};

// ── Tarjeta de Jornada de Renta No Aprovechada por obra ─────────────
// Cada vale de renta se clasifica por su propio ritmo (viajes ÷ días) en un
// espectro de eficiencia — ver calcularRentaNoAprovechada en
// useIndicadoresEficiencia.js. Solo el espectro "Desperdiciado" (1-3
// viajes/día) cuenta como dinero perdido (el costo completo del vale); los
// demás son señal de eficiencia, no de pérdida. Cuando algún vale de un
// espectro trae nota del checador/operador, un botón la muestra.
const COLOR_RANGO_RENTA = {
  desperdiciado: "red",
  pocaEficiencia: "yellow",
  buenaEficiencia: "green",
  ideal: "green",
};

const TarjetaRentaNoAprovechadaObra = ({ datos }) => {
  const [notasAbiertas, setNotasAbiertas] = useState(null);
  const obraLabel = [datos.empresa, datos.cc != null ? `CC ${datos.cc}` : null, datos.obra]
    .filter(Boolean)
    .join(" · ");

  const filasRangos = datos.rangos.map((r) => ({
    label: (
      <span className={`eg__pct-cell eg__pct-cell--${COLOR_RANGO_RENTA[r.key]}`}>
        {r.label}{r.key === "ideal" ? " ★" : ""}
      </span>
    ),
    rango: r.rango,
    count: r.count,
    pctVales: r.pctVales,
    importe: r.importe,
    notasCell: r.valesConNota.length > 0 ? (
      <button
        type="button"
        className="eg__notas-btn"
        onClick={() => setNotasAbiertas(r)}
        title="Ver notas de estos vales"
      >
        <FileText size={12} /> {r.valesConNota.length}
      </button>
    ) : (
      <span className="eg__notas-btn eg__notas-btn--vacio">—</span>
    ),
  }));

  return (
    <div className="eg__avanzado-card">
      <div className="eg__avanzado-card-header">
        <div className="eg__avanzado-card-left">
          <span className="eg__avanzado-card-eyebrow"><Clock size={11} /> {obraLabel}</span>
          <h3 className="eg__avanzado-card-title">{formatMXN(datos.totalDesperdiciado)} desperdiciados</h3>
        </div>
        <div className="eg__avanzado-kpis">
          <div className="eg__avanzado-kpi">
            <span className="eg__avanzado-kpi-val">{formatNum(datos.totalVales, 0)}</span>
            <span className="eg__avanzado-kpi-label">Vales de Renta</span>
          </div>
          <div className="eg__avanzado-kpi">
            <span className="eg__avanzado-kpi-val">{formatMXN(datos.totalImporte)}</span>
            <span className="eg__avanzado-kpi-label">Invertido en Renta</span>
          </div>
        </div>
      </div>

      <TopTable
        rows={filasRangos}
        emptyMsg="Sin vales de renta en este filtro"
        cols={[
          { key: "label", label: "Espectro" },
          { key: "rango", label: "Viajes/día" },
          { key: "count", label: "Vales", numeric: true, format: (v) => formatNum(v, 0) },
          { key: "pctVales", label: "% de Vales", numeric: true, format: (v) => `${formatNum(v, 1)}%` },
          { key: "importe", label: "Invertido", numeric: true, format: (v) => formatMXN(v) },
          { key: "notasCell", label: "Notas", numeric: true },
        ]}
      />

      {notasAbiertas && (
        <div
          className="eg__notas-overlay"
          onClick={(ev) => { if (ev.target === ev.currentTarget) setNotasAbiertas(null); }}
          role="dialog"
          aria-modal="true"
        >
          <div className="eg__notas-modal">
            <div className="eg__notas-modal-header">
              <div>
                <span className="eg__notas-modal-eyebrow">{obraLabel}</span>
                <h4 className="eg__notas-modal-title">{notasAbiertas.label} ({notasAbiertas.rango}) — Notas</h4>
              </div>
              <button className="eg__notas-modal-close" onClick={() => setNotasAbiertas(null)} aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>
            <div className="eg__notas-modal-body">
              {notasAbiertas.valesConNota.map((v, i) => (
                <div key={i} className="eg__notas-item">
                  <div className="eg__notas-item-head">
                    <span className="eg__notas-item-folio">{v.folio || `Vale #${v.idVale}`}</span>
                    <span className="eg__notas-item-monto">{formatMXN(v.importe)}</span>
                  </div>
                  <span className="eg__notas-item-meta">
                    {v.equipo} · {formatNum(v.viajesPorDiaReal, 1)} viajes/día · {formatNum(v.totalDias, 1)} días rentados
                  </span>
                  <p className="eg__notas-item-texto">{v.nota}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sección Análisis Avanzado ──────────────────────────────────────
const SeccionPresupuestos = ({ materialRows, rentaRows, hayAlerta, loading, mostrarEncabezado = true }) => {
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

      {mostrarEncabezado && (
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
      )}

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
  mostrarEncabezado = true,
}) => {
  const totalViajes = horasPico.reduce((s, h) => s + h.viajes, 0);
  const horaPico = horasPico.reduce((max, h) => h.viajes > max.viajes ? h : max, { viajes: 0, label: "--" });

  return (
    <div className="eg__avanzado-section">
      {/* Eyebrow */}
      {mostrarEncabezado && (
        <div className="eg__avanzado-header">
          <div className="eg__avanzado-eyebrow">
            <Activity size={13} />
            Análisis Detallado
          </div>
          <h2 className="eg__avanzado-title">Estadísticas de Operación</h2>
          <p className="eg__avanzado-sub">Rendimientos, horas pico, residentes, checadores y vehículos más activos</p>
        </div>
      )}

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

// ── Sección colapsable (acordeón) ──────────────────────────────────
// Encabezado clicable con chevron; el cuerpo se desmonta al plegarse.
// El estado abierto/cerrado lo controla el padre (persistido en localStorage).
const SeccionColapsable = ({
  id,
  titulo,
  subtitulo,
  badge,
  headerRight,
  abierta,
  onToggle,
  bodyClassName = "",
  children,
}) => (
  <div className={`eg__col ${abierta ? "eg__col--abierta" : "eg__col--cerrada"}`}>
    <div
      className="eg__col-head"
      role="button"
      tabIndex={0}
      aria-expanded={abierta}
      onClick={() => onToggle(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(id);
        }
      }}
    >
      <ChevronDown
        size={18}
        className={`eg__col-chevron${abierta ? "" : " eg__col-chevron--cerrado"}`}
      />
      <div className="eg__col-head-main">
        <h2 className="eg__col-title">{titulo}</h2>
        {subtitulo && <span className="eg__col-subtitulo">{subtitulo}</span>}
      </div>
      {badge}
      {headerRight && (
        <div className="eg__col-head-right" onClick={(e) => e.stopPropagation()}>
          {headerRight}
        </div>
      )}
    </div>
    {abierta && (
      <div className={`eg__col-body ${bodyClassName}`}>{children}</div>
    )}
  </div>
);

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
    fetchValesTiempoReal,
    fetchPresupuestos,
    valeAConciliacion,
    estadisticasCargadas,
    tiempoRealCargado,
    presupuestosCargados,
    garantizarEstadisticas,
    garantizarTiempoReal,
    garantizarPresupuestos,
    filtros,
    toggleFiltro,
    hayFiltrosActivos,
    modosFiltro,
    toggleModoFiltro,
    opcionesMeses,
    opcionesSemanas,
    opcionesObras,
    opcionesEmpresas,
    opcionesSindicatos,
    opcionesMateriales,
    opcionesBancos,
    opcionesTipoMaterial,
    seriesTiempo,
    seriesTiempoRenta,
    seriesImporteTiempo,
    seriesCamionesRentaTiempo,
    tablaViajesRentaPorEquipo,
    derivarPrecioRenta,
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
    rangoTiempoRealDesde,
    rangoTiempoRealHasta,
    seleccionarRangoTiempoReal,
    loadingTiempoReal,
    errorTiempoReal,
    tablaObraMaterialTiempoReal,
    tablaObraRentaTiempoReal,
    rangoAcumuladoDesde,
    rangoAcumuladoHasta,
    seleccionarRangoAcumulado,
    tablaObraMaterialAcumulado,
    tablaObraRentaAcumulado,
    valesReporteFiltrados,
    tablaObraMaterialReporte,
    tablaObraRentaReporte,
    tablaBancoMaterialReporte,
    ahorroEstimado,
    serieConciliacionesPorMes,
    conciliacionesPorObraTipo,
    loadingPresupuestos,
    presupuestosMaterialFiltrados,
    presupuestosRentaFiltrados,
    hayAlertaPresupuesto,
    comparativaPeriodoAnterior,
  } = useEstadisticasGlobales();

  // 1b. Indicadores de eficiencia/oportunidad (posición, flota propia, renta)
  // — reusa valesReporteFiltrados, no vuelve a pedir vales.
  const {
    indicePosicionObra,
    fleteEvitadoFlotaPropia,
    camionesPorDia,
    topCamionerosPorObra,
    rentaNoAprovechada,
    indicadoresEficienciaCargados,
    garantizarIndicadoresEficiencia,
  } = useIndicadoresEficiencia(valesReporteFiltrados, filtros.idTipoMaterial, modosFiltro.idTipoMaterial);

  // 2. Categoría abierta en el panel de filtros
  const [categoriaAbierta, setCategoriaAbierta] = useState(null);

  // 2b. Métrica activa de la gráfica Material vs Tiempo ("m3" | "viajes") —
  // controla tanto la gráfica interactiva como la sección del PDF exportado.
  const [modoGraficaTiempo, setModoGraficaTiempo] = useState("m3");

  // 3. Modal de conciliaciones por material
  const [modalMaterial, setModalMaterial] = useState(null);

  // 3b. Modal de Reporte Diario
  const [mostrarReporteDiario, setMostrarReporteDiario] = useState(false);

  // 3c. Acción pendiente de que terminen de cargar los dominios necesarios
  // ("pdf" | "reporte-diario" | null). Los datos derivados del hook (resumen,
  // tablas, etc.) solo se actualizan en el siguiente render después de que un
  // fetch resuelve, así que la acción real se dispara desde un efecto que
  // observa las banderas *Cargado/*Cargadas, no justo después del await.
  const [pendingAccion, setPendingAccion] = useState(null);

  // 4. Exportación de reporte PDF
  const [exportando, setExportando] = useState(false);

  // 5. Exportación de imagen del Desglose por Obra en tiempo real
  const [exportandoImagen, setExportandoImagen] = useState(false);
  const desgloseObraRef = useRef(null);

  // 5b. Exportación de imagen del Volumen Acumulado por Obra
  const [exportandoImagenAcumulado, setExportandoImagenAcumulado] = useState(false);
  const desgloseAcumuladoRef = useRef(null);

  // 6. Estado de secciones colapsables. Todas inician colapsadas (cerradas)
  // en cada carga — solo se muestran los encabezados; expandir/plegar es solo
  // para la sesión actual. Cada sección dispara la carga perezosa del/los
  // dominio(s) de datos que necesita la PRIMERA vez que se despliega.
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({});
  const seccionAbierta = (secId) => !!seccionesAbiertas[secId];
  const CARGA_POR_SECCION = {
    resumen: [garantizarEstadisticas],
    desglose: [garantizarEstadisticas],
    hoy: [garantizarTiempoReal],
    acumulado: [garantizarTiempoReal, garantizarPresupuestos],
    presupuestos: [garantizarPresupuestos],
    "grafica-material": [garantizarEstadisticas],
    "viajes-renta": [garantizarEstadisticas],
    "analisis-avanzado": [garantizarEstadisticas],
    eficiencia: [garantizarTiempoReal, garantizarIndicadoresEficiencia],
  };
  const toggleSeccion = (secId) =>
    setSeccionesAbiertas((prev) => {
      const abrir = !prev[secId];
      if (abrir) (CARGA_POR_SECCION[secId] || []).forEach((fn) => fn());
      return { ...prev, [secId]: abrir };
    });

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

  // El PDF necesita los 3 dominios (algunos pueden no haberse cargado todavía
  // si el usuario no desplegó ninguna sección relacionada). Solo se dispara
  // la carga aquí; la generación real ocurre en el efecto de abajo, una vez
  // que las tablas derivadas del hook ya reflejan los datos frescos.
  const handleExportarPDF = () => {
    setExportando(true);
    garantizarEstadisticas();
    garantizarTiempoReal();
    garantizarPresupuestos();
    garantizarIndicadoresEficiencia();
    setPendingAccion("pdf");
  };

  useEffect(() => {
    if (pendingAccion !== "pdf") return;
    if (!(estadisticasCargadas && tiempoRealCargado && presupuestosCargados && indicadoresEficienciaCargados)) return;

    try {
      const filtrosActivos = categoriasConfig
        .filter((c) => c.valoresActivos.length > 0 && c.key !== "mes" && c.key !== "semana")
        .map((c) => ({
          label: modosFiltro[c.key] === "excluir" ? `${c.label} (excluye)` : c.label,
          value: c.valorLabel,
        }));

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

      // Las tablas del reporte usan datos reales (directo de `vales`) pero
      // agrupados según los filtros seleccionados de la página (mes/semana/obra/
      // etc.), no conciliaciones. Los KPIs de material (m³ e importe) se
      // recalculan desde esa misma fuente para que cuadren con la tabla.
      const periodoTablasLabel =
        filtros.mes.length > 0 || filtros.semana.length > 0 ? periodoLabel : null;

      // Lista de conciliaciones vinculadas de la sección de Ahorro: solo
      // tiene sentido cuando hay obra(s) puntuales en el filtro — con el
      // reporte global (sin obra) se omite en vez de listar todo el sistema.
      const bloquesObraConciliaciones = filtros.idObra
        .map((id) => conciliacionesPorObraTipo[id])
        .filter(Boolean);

      generarPDFReporteEstadisticas({
        filtrosActivos,
        periodoLabel,
        periodoTablasLabel,
        resumen: { ...resumen, totalImporte: totalesReporteMaterial.importeIVA },
        totalesTablaObra: totalesReporteMaterial,
        comparativaPeriodoAnterior,
        periodoAnteriorLabel,
        tablaObraMaterial: tablaObraMaterialReporte,
        tablaBancoMaterial: tablaBancoMaterialReporte,
        tablaRentaPorObra: tablaObraRentaReporte,
        totalesRenta: totalesReporteRenta,
        tablaViajesRentaPorEquipo,
        seriesImporteTiempo,
        seriesCamionesRentaTiempo,
        seriesTiempo,
        modoGraficaTiempo,
        presupuestosMaterial: presupuestosMaterialFiltrados,
        presupuestosRenta: presupuestosRentaFiltrados,
        hayAlertaPresupuesto,
        topResidente: topResidentes[0] || null,
        topChecador: topChecadores[0] || null,
        topPlaca: topPlacas[0] || null,
        horaPico: horaPicoDestacada.viajes > 0 ? horaPicoDestacada : null,
        mejorRendimiento: rendimientoPorMaterial[0] || null,
        ultimaConciliacion,
        ahorroEstimado,
        serieConciliacionesPorMes,
        bloquesObraConciliaciones,
        indicePosicionObra,
        fleteEvitadoFlotaPropia,
        camionesPorDia,
        topCamionerosPorObra,
        rentaNoAprovechada,
      });
    } catch (err) {
      console.error("Error al exportar reporte PDF:", err);
    } finally {
      setExportando(false);
      setPendingAccion(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAccion, estadisticasCargadas, tiempoRealCargado, presupuestosCargados, indicadoresEficienciaCargados]);

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

  const handleExportarImagenAcumulado = async () => {
    if (!desgloseAcumuladoRef.current) return;
    try {
      setExportandoImagenAcumulado(true);
      const nombreArchivo = `Volumen_Acumulado_Obra_${new Date().toISOString().substring(0, 10)}.png`;
      await exportarElementoComoImagen(desgloseAcumuladoRef.current, nombreArchivo);
    } catch (err) {
      console.error("Error al exportar imagen:", err);
    } finally {
      setExportandoImagenAcumulado(false);
    }
  };

  // Reporte Diario necesita el acumulado histórico + presupuestos (tiempoReal +
  // presupuestos): dispara la carga y abre el modal solo cuando ya están listos.
  const handleAbrirReporteDiario = () => {
    garantizarTiempoReal();
    garantizarPresupuestos();
    setPendingAccion("reporte-diario");
  };

  useEffect(() => {
    if (pendingAccion !== "reporte-diario") return;
    if (!(tiempoRealCargado && presupuestosCargados)) return;
    setMostrarReporteDiario(true);
    setPendingAccion(null);
  }, [pendingAccion, tiempoRealCargado, presupuestosCargados]);

  // Refresca solo los dominios que ya se cargaron alguna vez (no tiene caso
  // pedir datos de una sección que el usuario nunca ha desplegado).
  const handleActualizar = () => {
    if (estadisticasCargadas) fetchEstadisticas();
    if (tiempoRealCargado) fetchValesTiempoReal();
    if (presupuestosCargados) fetchPresupuestos();
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

  const totalesRenta = useMemo(() => {
    const t = tablaRentaPorObra.reduce(
      (acc, row) => ({
        conciliaciones: acc.conciliaciones + row.conciliaciones,
        totalViajes:    acc.totalViajes    + row.totalViajes,
        totalDias:      acc.totalDias      + row.totalDias,
        totalHoras:     acc.totalHoras     + row.totalHoras,
        importeTotal:   acc.importeTotal   + row.importeTotal,
        capacidadSuma:  acc.capacidadSuma  + (row.capacidadSuma || 0),
        capacidadCount: acc.capacidadCount + (row.capacidadCount || 0),
      }),
      { conciliaciones: 0, totalViajes: 0, totalDias: 0, totalHoras: 0, importeTotal: 0, capacidadSuma: 0, capacidadCount: 0 }
    );
    return {
      ...t,
      ...derivarPrecioRenta({
        capacidadSuma: t.capacidadSuma,
        capacidadCount: t.capacidadCount,
        importeTotal: t.importeTotal,
        viajes: t.totalViajes,
      }),
    };
  }, [tablaRentaPorObra, derivarPrecioRenta]);

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

  const totalesRentaTiempoReal = useMemo(() => {
    const t = tablaObraRentaTiempoReal.reduce(
      (acc, row) => ({
        vales:          acc.vales          + row.vales,
        totalViajes:    acc.totalViajes    + row.totalViajes,
        totalDias:      acc.totalDias      + row.totalDias,
        totalHoras:     acc.totalHoras     + row.totalHoras,
        subtotalSinIva: acc.subtotalSinIva + row.subtotalSinIva,
        capacidadSuma:  acc.capacidadSuma  + (row.capacidadSuma || 0),
        capacidadCount: acc.capacidadCount + (row.capacidadCount || 0),
      }),
      { vales: 0, totalViajes: 0, totalDias: 0, totalHoras: 0, subtotalSinIva: 0, capacidadSuma: 0, capacidadCount: 0 }
    );
    return {
      ...t,
      ...derivarPrecioRenta({
        capacidadSuma: t.capacidadSuma,
        capacidadCount: t.capacidadCount,
        importeTotal: t.subtotalSinIva,
        viajes: t.totalViajes,
      }),
    };
  }, [tablaObraRentaTiempoReal, derivarPrecioRenta]);

  const totalesTablaObraAcumulado = useMemo(() => {
    const t = tablaObraMaterialAcumulado.reduce(
      (acc, obraRow) => ({
        m3Total:        acc.m3Total        + obraRow.subtotal.m3Total,
        valesCount:     acc.valesCount     + obraRow.subtotal.valesCount,
        totalViajes:    acc.totalViajes    + obraRow.subtotal.totalViajes,
        importeIVA:     acc.importeIVA     + obraRow.subtotal.importeIVA,
        m3Presupuestado: acc.m3Presupuestado + obraRow.subtotal.m3Presupuestado,
      }),
      { m3Total: 0, valesCount: 0, totalViajes: 0, importeIVA: 0, m3Presupuestado: 0 }
    );
    t.pctPresupuesto = t.m3Presupuestado ? (t.m3Total / t.m3Presupuestado) * 100 : null;
    return t;
  }, [tablaObraMaterialAcumulado]);

  const totalesRentaAcumulado = useMemo(() => {
    const t = tablaObraRentaAcumulado.reduce(
      (acc, row) => ({
        vales:              acc.vales              + row.vales,
        totalViajes:        acc.totalViajes        + row.totalViajes,
        totalDias:          acc.totalDias          + row.totalDias,
        totalHoras:         acc.totalHoras         + row.totalHoras,
        subtotalSinIva:     acc.subtotalSinIva     + row.subtotalSinIva,
        montoPresupuestado: acc.montoPresupuestado + (row.montoPresupuestado || 0),
        capacidadSuma:      acc.capacidadSuma      + (row.capacidadSuma || 0),
        capacidadCount:     acc.capacidadCount     + (row.capacidadCount || 0),
      }),
      { vales: 0, totalViajes: 0, totalDias: 0, totalHoras: 0, subtotalSinIva: 0, montoPresupuestado: 0, capacidadSuma: 0, capacidadCount: 0 }
    );
    t.pctPresupuesto = t.montoPresupuestado ? (t.subtotalSinIva / t.montoPresupuestado) * 100 : null;
    return {
      ...t,
      ...derivarPrecioRenta({
        capacidadSuma: t.capacidadSuma,
        capacidadCount: t.capacidadCount,
        importeTotal: t.subtotalSinIva,
        viajes: t.totalViajes,
      }),
    };
  }, [tablaObraRentaAcumulado, derivarPrecioRenta]);

  // Totales de las tablas del reporte PDF (vales reales por filtros globales)
  const totalesReporteMaterial = useMemo(
    () =>
      tablaObraMaterialReporte.reduce(
        (acc, obraRow) => ({
          m3Total:     acc.m3Total     + obraRow.subtotal.m3Total,
          valesCount:  acc.valesCount  + obraRow.subtotal.valesCount,
          totalViajes: acc.totalViajes + obraRow.subtotal.totalViajes,
          importeIVA:  acc.importeIVA  + obraRow.subtotal.importeIVA,
        }),
        { m3Total: 0, valesCount: 0, totalViajes: 0, importeIVA: 0 }
      ),
    [tablaObraMaterialReporte]
  );

  const totalesReporteRenta = useMemo(
    () =>
      tablaObraRentaReporte.reduce(
        (acc, row) => ({
          vales:          acc.vales          + row.vales,
          totalViajes:    acc.totalViajes    + row.totalViajes,
          totalDias:      acc.totalDias      + row.totalDias,
          totalHoras:     acc.totalHoras     + row.totalHoras,
          subtotalSinIva: acc.subtotalSinIva + row.subtotalSinIva,
        }),
        { vales: 0, totalViajes: 0, totalDias: 0, totalHoras: 0, subtotalSinIva: 0 }
      ),
    [tablaObraRentaReporte]
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
      {
        key: "idTipoMaterial", label: "Tipo de Material",
        opciones: opcionesTipoMaterial,
        valoresActivos: filtros.idTipoMaterial,
      },
    ];
    return base.map((c) => ({ ...c, valorLabel: buildValorLabel(c.opciones, c.valoresActivos) }));
  }, [filtros, opcionesMeses, opcionesSemanas, opcionesObras, opcionesEmpresas, opcionesSindicatos, opcionesMateriales, opcionesBancos, opcionesTipoMaterial]);

  // Subconjunto de categoriasConfig relevante a una sección, en el orden dado.
  const buildCategorias = (keys) =>
    keys.map((k) => categoriasConfig.find((c) => c.key === k)).filter(Boolean);

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

  // 5b. Color de la celda "% Presupuesto" (mismos umbrales que getSemaforo)
  const pctCellClass = (pct) => {
    if (pct == null) return "eg__pct-cell--none";
    if (pct > 100) return "eg__pct-cell--red";
    if (pct >= 80) return "eg__pct-cell--yellow";
    return "eg__pct-cell--green";
  };
  const formatPct = (pct) => (pct == null ? "—" : `${formatNum(pct, 0)}%`);

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
            className="eg__report-btn"
            onClick={handleAbrirReporteDiario}
            disabled={pendingAccion === "reporte-diario"}
          >
            <CalendarDays size={14} />
            {pendingAccion === "reporte-diario" ? "Cargando…" : "Reporte Diario"}
          </button>
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
            onClick={handleActualizar}
            disabled={loading || !(estadisticasCargadas || tiempoRealCargado || presupuestosCargados)}
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

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      {!error && (
        <SeccionColapsable
          id="resumen"
          titulo="Resumen"
          subtitulo="Indicadores principales del periodo"
          abierta={seccionAbierta("resumen")}
          onToggle={toggleSeccion}
          bodyClassName="eg__col-body--pad"
        >
        <FiltrosSeccion
          categorias={buildCategorias(["mes", "semana", "idObra", "idEmpresa", "idSindicato", "material", "idBanco"])}
          categoriaAbierta={categoriaAbierta}
          onToggleCategoria={toggleCategoria}
          onSelect={toggleFiltro}
          modosFiltro={modosFiltro}
          onToggleModo={toggleModoFiltro}
        />
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
        </SeccionColapsable>
      )}

      {/* ── Tabla por obra (material + renta) — desde conciliaciones ─── */}
      {!error && (
        <SeccionColapsable
          id="desglose"
          titulo="Desglose por Obra"
          subtitulo="Oficial · desde conciliaciones finalizadas"
          abierta={seccionAbierta("desglose")}
          onToggle={toggleSeccion}
          badge={
            !loading && (
              <span className="eg__tabla-badge">
                {tablaObraMaterial.length}{" "}
                {tablaObraMaterial.length === 1 ? "obra" : "obras"}
              </span>
            )
          }
        >
          <FiltrosSeccion
            categorias={buildCategorias(["mes", "semana", "idObra", "idEmpresa", "idSindicato", "material", "idBanco"])}
            categoriaAbierta={categoriaAbierta}
            onToggleCategoria={toggleCategoria}
            onSelect={toggleFiltro}
            modosFiltro={modosFiltro}
            onToggleModo={toggleModoFiltro}
          />
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
                      <th>Precio / Viaje</th>
                      <th>Precio Aprox. /m³</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablaRentaPorObra.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="eg__empty">
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
                          <td className="eg__importe-cell">
                            {row.precioPorViaje != null ? formatMXN(row.precioPorViaje) : "—"}
                          </td>
                          <td className="eg__importe-cell">
                            {row.precioAproxM3 != null ? formatMXN(row.precioAproxM3) : "—"}
                          </td>
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
                        <td className="eg__importe-cell">
                          {totalesRenta.precioPorViaje != null ? formatMXN(totalesRenta.precioPorViaje) : "—"}
                        </td>
                        <td className="eg__importe-cell">
                          {totalesRenta.precioAproxM3 != null ? formatMXN(totalesRenta.precioAproxM3) : "—"}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}
        </SeccionColapsable>
      )}

      {/* ── Tabla por obra (material + renta) — en tiempo real ─── */}
      {!error && (
        <SeccionColapsable
          id="hoy"
          titulo="Desglose por Obra — Hoy"
          subtitulo="En tiempo real · directo de vales"
          abierta={seccionAbierta("hoy")}
          onToggle={toggleSeccion}
          badge={
            !loadingTiempoReal && (
              <span className="eg__tabla-badge">
                {tablaObraMaterialTiempoReal.length}{" "}
                {tablaObraMaterialTiempoReal.length === 1 ? "obra" : "obras"}
              </span>
            )
          }
          headerRight={
            <>
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
                <button
                  className={`eg__periodo-btn${periodoTiempoReal === "rango" ? " eg__periodo-btn--activo" : ""}`}
                  onClick={() => seleccionarRangoTiempoReal(rangoTiempoRealDesde, rangoTiempoRealHasta)}
                  title="Rango de fechas personalizado"
                >
                  Rango
                </button>
                {periodoTiempoReal === "rango" && (
                  <div className="eg__rango-fechas">
                    <input
                      type="date"
                      className="eg__rango-fechas-input"
                      value={rangoTiempoRealDesde || ""}
                      onChange={(e) => seleccionarRangoTiempoReal(e.target.value, rangoTiempoRealHasta)}
                    />
                    <span className="eg__rango-fechas-sep">–</span>
                    <input
                      type="date"
                      className="eg__rango-fechas-input"
                      value={rangoTiempoRealHasta || ""}
                      onChange={(e) => seleccionarRangoTiempoReal(rangoTiempoRealDesde, e.target.value)}
                    />
                  </div>
                )}
              </div>
              <button
                className="eg__export-img-btn"
                onClick={handleExportarImagen}
                disabled={loadingTiempoReal || !tiempoRealCargado || !!errorTiempoReal || exportandoImagen}
              >
                <ImageIcon size={13} />
                {exportandoImagen ? "Generando…" : "Exportar imagen"}
              </button>
            </>
          }
        >
          <FiltrosSeccion
            categorias={buildCategorias(["idObra", "idEmpresa", "idSindicato", "material", "idBanco"])}
            categoriaAbierta={categoriaAbierta}
            onToggleCategoria={toggleCategoria}
            onSelect={toggleFiltro}
            modosFiltro={modosFiltro}
            onToggleModo={toggleModoFiltro}
          />
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
                        <th>Precio / Viaje</th>
                        <th>Precio Aprox. /m³</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tablaObraRentaTiempoReal.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="eg__empty">
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
                            <td className="eg__importe-cell">
                              {row.precioPorViaje != null ? formatMXN(row.precioPorViaje) : "—"}
                            </td>
                            <td className="eg__importe-cell">
                              {row.precioAproxM3 != null ? formatMXN(row.precioAproxM3) : "—"}
                            </td>
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
                          <td className="eg__importe-cell">
                            {totalesRentaTiempoReal.precioPorViaje != null ? formatMXN(totalesRentaTiempoReal.precioPorViaje) : "—"}
                          </td>
                          <td className="eg__importe-cell">
                            {totalesRentaTiempoReal.precioAproxM3 != null ? formatMXN(totalesRentaTiempoReal.precioAproxM3) : "—"}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </>
            )}
          </div>
        </SeccionColapsable>
      )}

      {/* ── Tabla por obra (material + renta) — acumulado histórico ─── */}
      {!error && (
        <SeccionColapsable
          id="acumulado"
          titulo="Volumen Acumulado por Obra"
          subtitulo="Histórico total · vs presupuesto"
          abierta={seccionAbierta("acumulado")}
          onToggle={toggleSeccion}
          badge={
            !loadingTiempoReal && (
              <span className="eg__tabla-badge">
                {tablaObraMaterialAcumulado.length}{" "}
                {tablaObraMaterialAcumulado.length === 1 ? "obra" : "obras"}
              </span>
            )
          }
          headerRight={
            <button
              className="eg__export-img-btn"
              onClick={handleExportarImagenAcumulado}
              disabled={loadingTiempoReal || loadingPresupuestos || !tiempoRealCargado || !presupuestosCargados || !!errorTiempoReal || exportandoImagenAcumulado}
            >
              <ImageIcon size={13} />
              {exportandoImagenAcumulado ? "Generando…" : "Exportar imagen"}
            </button>
          }
        >
          <FiltrosSeccion
            categorias={buildCategorias(["idObra", "idEmpresa", "idSindicato", "material", "idBanco"])}
            categoriaAbierta={categoriaAbierta}
            onToggleCategoria={toggleCategoria}
            onSelect={toggleFiltro}
            modosFiltro={modosFiltro}
            onToggleModo={toggleModoFiltro}
          />
          <p className="eg__tabla-subnota">
            Volumen histórico total ejecutado (todos los vales emitidos, verificados
            y conciliados desde el inicio, sin contar cancelados ni borradores). El
            importe de Renta se muestra sin IVA ni retención. La columna % Presupuesto
            compara lo ejecutado contra lo asignado por obra en{" "}
            <code>presupuesto_material_obra</code> / <code>presupuesto_renta_obra</code>.
          </p>

          <div className="eg__rango-fechas eg__rango-fechas--acumulado">
            <span className="eg__rango-fechas-label">Filtrar por fecha (opcional):</span>
            <input
              type="date"
              className="eg__rango-fechas-input"
              value={rangoAcumuladoDesde || ""}
              onChange={(e) => seleccionarRangoAcumulado(e.target.value, rangoAcumuladoHasta)}
            />
            <span className="eg__rango-fechas-sep">–</span>
            <input
              type="date"
              className="eg__rango-fechas-input"
              value={rangoAcumuladoHasta || ""}
              onChange={(e) => seleccionarRangoAcumulado(rangoAcumuladoDesde, e.target.value)}
            />
            {(rangoAcumuladoDesde || rangoAcumuladoHasta) && (
              <button
                type="button"
                className="eg__rango-fechas-limpiar"
                onClick={() => seleccionarRangoAcumulado(null, null)}
              >
                Limpiar
              </button>
            )}
          </div>

          {errorTiempoReal && (
            <div className="eg__empty">
              No se pudo cargar el acumulado histórico: {errorTiempoReal}
            </div>
          )}

          <div ref={desgloseAcumuladoRef}>
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
                    <th>% Presupuesto</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTiempoReal || loadingPresupuestos ? (
                    renderSkeletonRows()
                  ) : tablaObraMaterialAcumulado.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="eg__empty">
                        Sin datos de material para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    tablaObraMaterialAcumulado.map((obraRow) => (
                      <Fragment key={obraRow.obra}>
                        <tr className="eg__tabla-obra-header">
                          <td colSpan={6}>
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
                            <td className={`eg__pct-cell ${pctCellClass(mat.pctPresupuesto)}`}>
                              {formatPct(mat.pctPresupuesto)}
                            </td>
                          </tr>
                        ))}
                        {obraRow.materiales.length > 1 && (
                          <tr className="eg__tabla-subtotal">
                            <td>Subtotal</td>
                            <td>{formatNum(obraRow.subtotal.m3Total, 2)} m³</td>
                            <td>{formatNum(obraRow.subtotal.valesCount)}</td>
                            <td>{formatNum(obraRow.subtotal.totalViajes)}</td>
                            <td className="eg__importe-cell">{formatMXN(obraRow.subtotal.importeIVA)}</td>
                            <td className={`eg__pct-cell ${pctCellClass(obraRow.subtotal.pctPresupuesto)}`}>
                              {formatPct(obraRow.subtotal.pctPresupuesto)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
                {!loadingTiempoReal && !loadingPresupuestos && tablaObraMaterialAcumulado.length > 0 && (
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td>{formatNum(totalesTablaObraAcumulado.m3Total, 2)} m³</td>
                      <td>{formatNum(totalesTablaObraAcumulado.valesCount)}</td>
                      <td>{formatNum(totalesTablaObraAcumulado.totalViajes)}</td>
                      <td className="eg__importe-cell">
                        {formatMXN(totalesTablaObraAcumulado.importeIVA)}
                      </td>
                      <td className={`eg__pct-cell ${pctCellClass(totalesTablaObraAcumulado.pctPresupuesto)}`}>
                        {formatPct(totalesTablaObraAcumulado.pctPresupuesto)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* ─ Sub-sección renta ─ */}
            {!loadingTiempoReal && !loadingPresupuestos && (
              <>
                <div className="eg__tabla-subseccion eg__tabla-subseccion--renta">
                  <span className="eg__tabla-subseccion__label">
                    <Clock size={12} />
                    Renta de Equipo
                  </span>
                  {tablaObraRentaAcumulado.length > 0 && (
                    <span className="eg__tabla-badge eg__tabla-badge--green">
                      {tablaObraRentaAcumulado.length}{" "}
                      {tablaObraRentaAcumulado.length === 1 ? "obra" : "obras"}
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
                        <th>Precio / Viaje</th>
                        <th>Precio Aprox. /m³</th>
                        <th>% Presupuesto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tablaObraRentaAcumulado.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="eg__empty">
                            Sin renta para los filtros seleccionados.
                          </td>
                        </tr>
                      ) : (
                        tablaObraRentaAcumulado.map((row) => (
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
                            <td className="eg__importe-cell">
                              {row.precioPorViaje != null ? formatMXN(row.precioPorViaje) : "—"}
                            </td>
                            <td className="eg__importe-cell">
                              {row.precioAproxM3 != null ? formatMXN(row.precioAproxM3) : "—"}
                            </td>
                            <td className={`eg__pct-cell ${pctCellClass(row.pctPresupuesto)}`}>
                              {formatPct(row.pctPresupuesto)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {tablaObraRentaAcumulado.length > 0 && (
                      <tfoot>
                        <tr>
                          <td>Total</td>
                          <td>{formatNum(totalesRentaAcumulado.vales)}</td>
                          <td>{formatNum(totalesRentaAcumulado.totalViajes)}</td>
                          <td>{formatNum(totalesRentaAcumulado.totalDias, 1)}</td>
                          <td>{formatNum(totalesRentaAcumulado.totalHoras, 1)}</td>
                          <td className="eg__importe-cell">
                            {formatMXN(totalesRentaAcumulado.subtotalSinIva)}
                          </td>
                          <td className="eg__importe-cell">
                            {totalesRentaAcumulado.precioPorViaje != null ? formatMXN(totalesRentaAcumulado.precioPorViaje) : "—"}
                          </td>
                          <td className="eg__importe-cell">
                            {totalesRentaAcumulado.precioAproxM3 != null ? formatMXN(totalesRentaAcumulado.precioAproxM3) : "—"}
                          </td>
                          <td className={`eg__pct-cell ${pctCellClass(totalesRentaAcumulado.pctPresupuesto)}`}>
                            {formatPct(totalesRentaAcumulado.pctPresupuesto)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </>
            )}
          </div>
        </SeccionColapsable>
      )}

      {/* ── Presupuestos ──────────────────────────────────────── */}
      {!error && (
        <SeccionColapsable
          id="presupuestos"
          titulo="Presupuestos"
          subtitulo="Consumo acumulado vs. presupuesto asignado por obra"
          abierta={seccionAbierta("presupuestos")}
          onToggle={toggleSeccion}
          bodyClassName="eg__col-body--pad"
        >
          <FiltrosSeccion
            categorias={buildCategorias(["idObra", "idEmpresa", "material"])}
            categoriaAbierta={categoriaAbierta}
            onToggleCategoria={toggleCategoria}
            onSelect={toggleFiltro}
            modosFiltro={modosFiltro}
            onToggleModo={toggleModoFiltro}
          />
          <SeccionPresupuestos
            materialRows={presupuestosMaterialFiltrados}
            rentaRows={presupuestosRentaFiltrados}
            hayAlerta={hayAlertaPresupuesto}
            loading={loadingPresupuestos}
            mostrarEncabezado={false}
          />
        </SeccionColapsable>
      )}

      {/* ── Gráfica Material vs Tiempo ─────────────────────────── */}
      {!error && (
        <SeccionColapsable
          id="grafica-material"
          titulo="Material vs Tiempo"
          subtitulo={
            modoGraficaTiempo === "viajes"
              ? "Evolución histórica · viajes registrados por mes"
              : "Evolución histórica · m³ transportados por mes"
          }
          abierta={seccionAbierta("grafica-material")}
          onToggle={toggleSeccion}
        >
          <FiltrosSeccion
            categorias={buildCategorias(["idObra", "idEmpresa", "idSindicato", "material", "idBanco"])}
            categoriaAbierta={categoriaAbierta}
            onToggleCategoria={toggleCategoria}
            onSelect={toggleFiltro}
            modosFiltro={modosFiltro}
            onToggleModo={toggleModoFiltro}
          />
          <GraficaTiempo
            seriesTiempo={seriesTiempo}
            modo={modoGraficaTiempo}
            onModoChange={setModoGraficaTiempo}
            loading={loading}
            mostrarEncabezado={false}
          />
        </SeccionColapsable>
      )}

      {/* ── Viajes de Renta por Tipo de Equipo ───────────────── */}
      {!error && (
        <SeccionColapsable
          id="viajes-renta"
          titulo="Viajes de Renta por Tipo de Equipo"
          subtitulo="Equipo rentado en obra · viajes registrados por mes"
          abierta={seccionAbierta("viajes-renta")}
          onToggle={toggleSeccion}
        >
          <FiltrosSeccion
            categorias={buildCategorias(["mes", "semana", "idObra", "idEmpresa", "idSindicato"])}
            categoriaAbierta={categoriaAbierta}
            onToggleCategoria={toggleCategoria}
            onSelect={toggleFiltro}
            modosFiltro={modosFiltro}
            onToggleModo={toggleModoFiltro}
          />
          <GraficaViajesRenta
            seriesTiempoRenta={seriesTiempoRenta}
            tablaViajesRentaPorEquipo={tablaViajesRentaPorEquipo}
            loading={loading}
            mostrarEncabezado={false}
          />
        </SeccionColapsable>
      )}

      {/* ── Análisis Avanzado ─────────────────────────────────── */}
      {!error && (
        <SeccionColapsable
          id="analisis-avanzado"
          titulo="Análisis de Operación"
          subtitulo="Rendimientos, horas pico, residentes, checadores y vehículos"
          abierta={seccionAbierta("analisis-avanzado")}
          onToggle={toggleSeccion}
          bodyClassName="eg__col-body--pad"
        >
          <FiltrosSeccion
            categorias={buildCategorias(["mes", "semana", "idObra", "idEmpresa", "idSindicato", "material", "idBanco"])}
            categoriaAbierta={categoriaAbierta}
            onToggleCategoria={toggleCategoria}
            onSelect={toggleFiltro}
            modosFiltro={modosFiltro}
            onToggleModo={toggleModoFiltro}
          />
          {loading ? (
            <div className="eg__chart-skeleton" />
          ) : (
            <SeccionAnalisisAvanzado
              horasPico={horasPico}
              viajesPorVale={viajesPorVale}
              topResidentes={topResidentes}
              topChecadores={topChecadores}
              topPlacas={topPlacas}
              rendimientoPorMaterial={rendimientoPorMaterial}
              mostrarEncabezado={false}
            />
          )}
        </SeccionColapsable>
      )}

      {/* ── Indicadores de Eficiencia y Oportunidad ───────────────── */}
      {!error && (
        <SeccionColapsable
          id="eficiencia"
          titulo="Indicadores de Eficiencia y Oportunidad"
          subtitulo="Comparaciones de banco, ruta y renta — más allá de lo descriptivo"
          abierta={seccionAbierta("eficiencia")}
          onToggle={toggleSeccion}
          bodyClassName="eg__col-body--pad"
        >
          <FiltrosSeccion
            categorias={buildCategorias(["mes", "semana", "idObra", "idEmpresa", "idSindicato", "idTipoMaterial"])}
            categoriaAbierta={categoriaAbierta}
            onToggleCategoria={toggleCategoria}
            onSelect={toggleFiltro}
            modosFiltro={modosFiltro}
            onToggleModo={toggleModoFiltro}
          />
          <div className="eg__avanzado-card">
            <div className="eg__avanzado-card-header">
              <div className="eg__avanzado-card-left">
                <span className="eg__avanzado-card-eyebrow"><Target size={11} /> Posición vs. bancos</span>
                <h3 className="eg__avanzado-card-title">{INDICE_POSICION_OBRA.titulo}</h3>
              </div>
            </div>
            <p className="eg__avanzado-card-sub" style={{ padding: "0 16px 16px" }}>
              {INDICE_POSICION_OBRA.descripcion}
            </p>
          </div>

          {indicePosicionObra.length === 0 ? (
            <div className="eg__avanzado-card">
              <p className="eg__top-empty" style={{ padding: 20 }}>
                Sin datos suficientes para calcular el índice de posición en este filtro.
              </p>
            </div>
          ) : (
            indicePosicionObra.map((o, idx) => (
              <TarjetaIndicePosicionObra key={`${o.obra}-${o.cc}-${idx}`} datos={o} />
            ))
          )}

          {/* Flete Evitado por Flota Propia */}
          <div className="eg__avanzado-card">
            <div className="eg__avanzado-card-header">
              <div className="eg__avanzado-card-left">
                <span className="eg__avanzado-card-eyebrow"><Truck size={11} /> Flota propia</span>
                <h3 className="eg__avanzado-card-title">{FLETE_EVITADO_FLOTA_PROPIA.titulo}</h3>
              </div>
            </div>
            <p className="eg__avanzado-card-sub" style={{ padding: "0 16px 16px" }}>{FLETE_EVITADO_FLOTA_PROPIA.descripcion}</p>
          </div>

          {fleteEvitadoFlotaPropia.length === 0 ? (
            <div className="eg__avanzado-card">
              <p className="eg__top-empty" style={{ padding: 20 }}>
                Sin viajes de GRUPO GEEM (flota propia) en este filtro.
              </p>
            </div>
          ) : (
            <>
              {fleteEvitadoFlotaPropia.map((o, idx) => (
                <TarjetaFleteEvitadoObra key={`${o.obra}-${o.cc}-${idx}`} datos={o} />
              ))}
              <div className="eg__avanzado-card">
                <p className="eg__avanzado-card-sub" style={{ padding: "16px" }}>{FLETE_EVITADO_FLOTA_PROPIA.nota}</p>
              </div>
            </>
          )}

          {/* ¿Se justifica comprar un camión? */}
          <div className="eg__avanzado-card">
            <div className="eg__avanzado-card-header">
              <div className="eg__avanzado-card-left">
                <span className="eg__avanzado-card-eyebrow"><Package size={11} /> Justificación de flota</span>
                <h3 className="eg__avanzado-card-title">{VIABILIDAD_FLOTA_PROPIA.titulo}</h3>
              </div>
            </div>
          </div>

          {topCamionerosPorObra.length === 0 ? (
            <div className="eg__avanzado-card">
              <p className="eg__top-empty" style={{ padding: 20 }}>
                Sin placas de sindicato con viajes de material en este filtro.
              </p>
            </div>
          ) : (
            <>
              {topCamionerosPorObra.map((o, idx) => {
                const camiones = camionesPorDia.find((c) => c.obra === o.obra && c.cc === o.cc) || null;
                return (
                  <TarjetaViabilidadFlotaObra
                    key={`${o.obra}-${o.cc}-${idx}`}
                    camiones={camiones}
                    topCamioneros={o}
                  />
                );
              })}
            </>
          )}

          {/* Jornada de Renta No Aprovechada */}
          <div className="eg__avanzado-card">
            <div className="eg__avanzado-card-header">
              <div className="eg__avanzado-card-left">
                <span className="eg__avanzado-card-eyebrow"><Clock size={11} /> Renta de equipo</span>
                <h3 className="eg__avanzado-card-title">{RENTA_NO_APROVECHADA.titulo}</h3>
              </div>
            </div>
            <p className="eg__avanzado-card-sub" style={{ padding: "0 16px 16px" }}>{RENTA_NO_APROVECHADA.descripcion}</p>
          </div>

          {rentaNoAprovechada.length === 0 ? (
            <div className="eg__avanzado-card">
              <p className="eg__top-empty" style={{ padding: 20 }}>
                Sin vales de renta con días y viajes registrados en este filtro.
              </p>
            </div>
          ) : (
            <>
              {rentaNoAprovechada.map((o, idx) => (
                <TarjetaRentaNoAprovechadaObra key={`${o.obra}-${o.cc}-${idx}`} datos={o} />
              ))}
              <div className="eg__avanzado-card">
                <p className="eg__avanzado-card-sub" style={{ padding: "16px" }}>{RENTA_NO_APROVECHADA.nota}</p>
              </div>
            </>
          )}
        </SeccionColapsable>
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

      {/* ── Modal Reporte Diario ──────────────────────────────── */}
      {mostrarReporteDiario && (
        <ModalReporteDiario
          presupuestosMaterial={tablaObraMaterialAcumulado}
          presupuestosRenta={tablaObraRentaAcumulado}
          onClose={() => setMostrarReporteDiario(false)}
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
