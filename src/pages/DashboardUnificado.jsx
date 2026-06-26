/**
 * src/pages/DashboardUnificado.jsx
 *
 * Vista principal unificada de vales — tabla filtrable con filtros de período,
 * semana, mes, CC (multi-check), sindicato (multi-check) y búsqueda libre.
 * KPIs dinámicos que responden a todos los filtros activos.
 *
 * Dependencias: useDashboardUnificado, ModalValeDetalle, colors, dateUtils
 * Usado en: App.jsx (ruta /dashboard-unificado)
 */

// 1. React
import { useState, useRef, useEffect } from "react";

// 2. Icons
import {
  Search,
  FileText,
  Layers,
  TruckIcon,
  BarChart3,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  Clock,
  AlertTriangle,
  Route,
  DollarSign,
  Ban,
  Download,
} from "lucide-react";

// 3. Config
import { colors } from "../config/colors";

// 4. Hooks / Utils
import { useDashboardUnificado } from "../hooks/useDashboardUnificado";
import { calcularSemanaISO } from "../utils/dateUtils";
import { useAuth } from "../hooks/useAuth";
import { exportToExcel } from "../utils/exportToExcel";

// 5. Componentes
import ModalValeDetalle from "../components/vales/ModalValeDetalle";

// 6. Estilos
import "../styles/dashboard-unificado.css";

// ─── Constantes ─────────────────────────────────────────────────────────────

const PERIODOS = [
  { id: "hoy", label: "Hoy" },
  { id: "ayer", label: "Ayer" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mes" },
];

const TIPOS = [
  { id: "todos", label: "Todos" },
  { id: "petreos", label: "Pétreos" },
  { id: "asfaltico", label: "Asfáltico" },
  { id: "corte", label: "Corte" },
  { id: "renta", label: "Renta" },
];

const ETIQUETAS_TIPO = {
  petreos: { label: "Pétreos", clase: "du__tipo--petreos" },
  asfaltico: { label: "Asfáltico", clase: "du__tipo--asfaltico" },
  corte: { label: "Corte", clase: "du__tipo--corte" },
  renta: { label: "Renta", clase: "du__tipo--renta" },
};

const ETIQUETAS_ESTADO = {
  emitido: { label: "Emitido", clase: "du__estado--emitido" },
  en_proceso: { label: "En proceso", clase: "du__estado--en-proceso" },
  verificado: { label: "Verificado", clase: "du__estado--verificado" },
  conciliado: { label: "Conciliado", clase: "du__estado--conciliado" },
  cancelado: { label: "Cancelado", clase: "du__estado--cancelado" },
};

const ESTADOS_OPCIONES = ["emitido", "en_proceso", "verificado", "conciliado"];
const ESTADOS_LABELS = {
  emitido: "Emitido",
  en_proceso: "En proceso",
  verificado: "Verificado",
  conciliado: "Conciliado",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const getWeekValue = () => {
  const sem = calcularSemanaISO(new Date());
  return `${sem.año}-W${String(sem.numero).padStart(2, "0")}`;
};

const getMonthValue = () => {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
};

// ─── Subcomponentes ──────────────────────────────────────────────────────────

const KpiCard = ({ icono: Icono, titulo, valor, subtitulo, gradiente }) => (
  <div className="du__kpi-card" style={{ background: gradiente }}>
    <span className="du__kpi-titulo">{titulo}</span>
    <span className="du__kpi-valor">{valor}</span>
    {subtitulo && <span className="du__kpi-sub">{subtitulo}</span>}
    <Icono size={64} className="du__kpi-deco" />
  </div>
);

/**
 * Dropdown con checkboxes para selección múltiple.
 * seleccionados: string[], opciones: string[], onChange: (string[]) => void
 */
const CheckboxDropdown = ({ label, opciones, seleccionados, onChange, labelsMap }) => {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);

  const toggle = (opcion) => {
    onChange(
      seleccionados.includes(opcion)
        ? seleccionados.filter((s) => s !== opcion)
        : [...seleccionados, opcion],
    );
  };

  const activo = seleccionados.length > 0;

  return (
    <div className="du__chk-dropdown" ref={ref}>
      <button
        className={`du__chk-trigger ${activo ? "du__chk-trigger--activo" : ""}`}
        onClick={() => setAbierto((v) => !v)}
        type="button"
      >
        {label}
        {activo && <span className="du__chk-badge">{seleccionados.length}</span>}
        <ChevronDown size={12} className={`du__chk-chevron ${abierto ? "du__chk-chevron--abierto" : ""}`} />
      </button>

      {abierto && (
        <div className="du__chk-panel">
          {opciones.length === 0 ? (
            <span className="du__chk-vacio">Sin opciones disponibles</span>
          ) : (
            opciones.map((op) => (
              <label key={op} className="du__chk-item">
                <input
                  type="checkbox"
                  className="du__chk-input"
                  checked={seleccionados.includes(op)}
                  onChange={() => toggle(op)}
                />
                <span className="du__chk-label">{labelsMap?.[op] ?? op}</span>
              </label>
            ))
          )}
          {activo && (
            <button
              className="du__chk-limpiar"
              onClick={() => onChange([])}
              type="button"
            >
              Limpiar selección
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const FilaVale = ({ vale, onClick, mostrarCancelados }) => {
  const tipoInfo = ETIQUETAS_TIPO[vale._tipo] ?? ETIQUETAS_TIPO.petreos;
  const estadoInfo = ETIQUETAS_ESTADO[vale.estado] ?? {
    label: vale.estado,
    clase: "du__estado--emitido",
  };

  const empresa =
    vale.obras?.empresas?.empresa ?? vale.obras?.empresas?.sufijo ?? "—";
  const obra = vale.obras?.obra ?? "—";
  const fecha =
    vale.fecha_programada ?? vale.fecha_creacion?.substring(0, 10) ?? "—";
  const operador = vale.operadores?.nombre_completo ?? "—";
  const placas = vale.vehiculos?.placas ?? "—";

  const cantidadTexto = vale._cantidad
    ? `${Number(vale._cantidad.valor ?? 0).toFixed(2)} ${vale._cantidad.unidad}`
    : "—";

  const motivoCancelacion = vale.motivo_cancelacion ?? "Sin motivo registrado";
  const fechaCancelacion = vale.fecha_cancelacion
    ? new Date(vale.fecha_cancelacion).toLocaleDateString("es-MX", {
        timeZone: "America/Mexico_City",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  const trProps = {
    tabIndex: 0,
    onClick: () => onClick(vale),
    onKeyDown: (e) => e.key === "Enter" && onClick(vale),
  };

  if (mostrarCancelados) {
    return (
      <tr className="du__fila du__fila--cancelada" {...trProps}>
        <td className="du__celda du__celda--folio">
          <span className="du__folio">{vale.folio}</span>
        </td>
        <td className="du__celda">{empresa}</td>
        <td className="du__celda du__celda--obra">{obra}</td>
        <td className="du__celda">
          <span className={`du__badge-tipo ${tipoInfo.clase}`}>
            {tipoInfo.label}
          </span>
        </td>
        <td className="du__celda du__celda--material">{vale._material}</td>
        <td className="du__celda du__celda--motivo" title={motivoCancelacion}>
          {motivoCancelacion}
        </td>
        <td className="du__celda du__celda--fecha">{fechaCancelacion}</td>
        <td className="du__celda du__celda--fecha">{fecha}</td>
        <td className="du__celda du__celda--operador">{operador}</td>
      </tr>
    );
  }

  return (
    <tr className="du__fila" {...trProps}>
      <td className="du__celda du__celda--folio">
        <span className="du__folio">{vale.folio}</span>
      </td>
      <td className="du__celda">{empresa}</td>
      <td className="du__celda du__celda--obra">{obra}</td>
      <td className="du__celda">
        <span className={`du__badge-tipo ${tipoInfo.clase}`}>
          {tipoInfo.label}
        </span>
      </td>
      <td className="du__celda du__celda--material">{vale._material}</td>
      <td className="du__celda du__celda--numero">{cantidadTexto}</td>
      <td className="du__celda">
        <span className={`du__badge-estado ${estadoInfo.clase}`}>
          {estadoInfo.label}
        </span>
      </td>
      <td className="du__celda du__celda--fecha">{fecha}</td>
      <td className="du__celda du__celda--operador">{operador}</td>
      <td className="du__celda du__celda--placas">{placas}</td>
    </tr>
  );
};

const fmtImporte = (v) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 10_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${Number(v).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
};

// ─── Página principal ────────────────────────────────────────────────────────

const DashboardUnificado = () => {
  // 1. Estados
  const [valeSeleccionado, setValeSeleccionado] = useState(null);
  const [rangoInicio, setRangoInicio] = useState("");
  const [rangoFin, setRangoFin] = useState("");
  const [semanaValue, setSemanaValue] = useState("");
  const [mesValue, setMesValue] = useState("");

  // 2. Auth
  const { userProfile } = useAuth();
  const esAdministrador = userProfile?.roles?.role === "Administrador";

  // 3. Hook principal
  const {
    valesPagina,
    valesFiltrados,
    loading,
    error,
    hasMasDatos,
    totalCargados,
    filtros,
    opciones,
    pagina,
    totalPaginas,
    totalFiltrados,
    setPagina,
    cambiarPeriodo,
    cambiarTipo,
    cambiarBusqueda,
    cambiarRango,
    cambiarCCs,
    cambiarSindicatos,
    cambiarEstados,
    cambiarSemana,
    cambiarMes,
    refetch,
    kpis,
    kpisDesdeLocales,
    aplicarKpis,
    resetearKpis,
    mostrarCancelados,
    toggleCancelados,
  } = useDashboardUnificado();

  // 4. Handlers
  const handlePeriodo = (periodo) => {
    cambiarPeriodo(periodo);
    if (periodo === "hoy" || periodo === "ayer") {
      setSemanaValue("");
      setMesValue("");
    } else if (periodo === "semana") {
      setSemanaValue(getWeekValue());
      setMesValue("");
    } else if (periodo === "mes") {
      setSemanaValue("");
      setMesValue(getMonthValue());
    }
  };

  const handleSemana = (weekStr) => {
    setSemanaValue(weekStr);
    if (weekStr) {
      setMesValue("");
      cambiarSemana(weekStr);
    }
  };

  const handleMes = (monthStr) => {
    setMesValue(monthStr);
    if (monthStr) {
      setSemanaValue("");
      cambiarMes(monthStr);
    }
  };

  const handleAplicarRango = () => {
    if (rangoInicio && rangoFin) {
      setSemanaValue("");
      setMesValue("");
      cambiarRango(rangoInicio, rangoFin);
    }
  };

  const handleValeActualizado = () => {
    refetch();
    setValeSeleccionado(null);
  };

  // 5. Export
  const handleExportarExcel = () => {
    const filas = valesFiltrados.map((vale) => {
      // Reúne todos los folios de remisión: folio_vale_fisico por viaje (primero),
      // con folio_banco del detalle como fallback si el viaje no lo tiene.
      const foliosSet = new Set();
      for (const det of vale.vale_material_detalles ?? []) {
        const foliosViaje = (det.vale_material_viajes ?? [])
          .map((v) => v.folio_vale_fisico)
          .filter(Boolean);
        if (foliosViaje.length > 0) {
          foliosViaje.forEach((f) => foliosSet.add(f));
        } else if (det.folio_banco) {
          foliosSet.add(det.folio_banco);
        }
      }
      const foliosRemision = foliosSet.size > 0 ? [...foliosSet].join(", ") : "";

      const esMaterial = vale.tipo_vale === "material";
      const rentaDet = vale.vale_renta_detalle?.[0];
      const esPorDia = rentaDet?.es_renta_por_dia;

      const m3 = esMaterial ? Number(vale._cantidad?.valor ?? 0).toFixed(2) : "";
      const dias = (!esMaterial && esPorDia) ? Number(rentaDet?.total_dias ?? 0).toFixed(2) : "";
      const horas = (!esMaterial && !esPorDia) ? Number(rentaDet?.total_horas ?? 0).toFixed(2) : "";

      return {
        Folio: vale.folio ?? "—",
        Empresa: vale.obras?.empresas?.empresa ?? vale.obras?.empresas?.sufijo ?? "—",
        CC: vale.obras?.cc ?? "—",
        Obra: vale.obras?.obra ?? "—",
        Tipo: ETIQUETAS_TIPO[vale._tipo]?.label ?? vale._tipo,
        "Material / Equipo": vale._material ?? "—",
        "m³": m3,
        Días: dias,
        Horas: horas,
        "Folios remisión": foliosRemision || "—",
        Estado: ETIQUETAS_ESTADO[vale.estado]?.label ?? vale.estado ?? "—",
        Fecha: vale.fecha_programada ?? vale.fecha_creacion?.substring(0, 10) ?? "—",
        Operador: vale.operadores?.nombre_completo ?? "—",
        Placas: vale.vehiculos?.placas ?? "—",
        Sindicato: vale.operadores?.sindicatos?.sindicato ?? "—",
        "Motivo cancelación": vale.motivo_cancelacion ?? "",
      };
    });
    exportToExcel(
      filas,
      `vales_${filtros.fechaInicio}_${filtros.fechaFin}`,
      "Vales",
    );
  };

  // 6. Valores derivados
  const periodoLabel =
    filtros.periodoActivo === "hoy"
      ? "Hoy"
      : filtros.periodoActivo === "ayer"
      ? "Ayer"
      : filtros.periodoActivo === "semana"
      ? "Esta semana"
      : filtros.periodoActivo === "mes"
      ? "Este mes"
      : `${filtros.fechaInicio} — ${filtros.fechaFin}`;

  const hayFiltrosExtra =
    filtros.filtroCCs.length > 0 ||
    filtros.filtroSindicatos.length > 0 ||
    filtros.filtroEstados.length > 0;

  const handleLimpiarFiltros = () => {
    cambiarCCs([]);
    cambiarSindicatos([]);
    cambiarEstados([]);
  };

  // 5. Render
  return (
    <div className="du__contenedor">
      {/* ── Encabezado ── */}
      <header className="du__header">
        <div className="du__header-texto">
          <h1 className="du__titulo">Vales</h1>
          <p className="du__subtitulo">Vista unificada · {periodoLabel}</p>
        </div>
        <div className="du__header-botones">
          <button
            className="du__btn-exportar"
            onClick={handleExportarExcel}
            disabled={loading || valesFiltrados.length === 0}
            title={`Exportar ${valesFiltrados.length} vales a Excel`}
          >
            <Download size={15} />
            Excel
          </button>
          <button
            className="du__btn-refresh"
            onClick={refetch}
            disabled={loading}
            title="Actualizar"
          >
            <RefreshCw size={16} className={loading ? "du__spin" : ""} />
          </button>
        </div>
      </header>

      {/* ── Aviso de datos truncados (solo Administrador) ── */}
      {esAdministrador && hasMasDatos && (
        <div className="du__aviso-limite">
          <AlertTriangle size={15} />
          <span>
            {totalFiltrados < totalCargados
              ? `Filtros activos: ${totalFiltrados.toLocaleString()} vales visibles de ${totalCargados.toLocaleString()} cargados (hay más en la BD). `
              : `La tabla muestra los primeros ${totalCargados.toLocaleString()} vales del período. `}
            Usa <strong>Calcular KPIs</strong> para obtener métricas de los vales visibles.
          </span>
        </div>
      )}

      {/* ── Indicador de fuente de KPIs (solo Administrador) ── */}
      {esAdministrador && kpisDesdeLocales && (
        <div className="du__kpi-fuente">
          <Calculator size={13} />
          <span>
            KPIs calculados desde {totalFiltrados.toLocaleString()} vales filtrados
            {hasMasDatos ? " · datos parciales (hay más en la BD)" : " · datos completos"}
            {" · "}Viajes no disponible con filtros
          </span>
          <button className="du__btn-resetear-kpis" onClick={resetearKpis} type="button">
            Ver KPIs globales
          </button>
        </div>
      )}

      {/* ── KPI Cards (solo Administrador) ── */}
      {esAdministrador && (
        <section className="du__kpi-grid">
          <KpiCard
            icono={FileText}
            titulo="Total vales"
            valor={kpis.totalVales}
            subtitulo={kpisDesdeLocales ? "filtrados" : (hayFiltrosExtra ? "filtrados" : periodoLabel.toLowerCase())}
            gradiente="linear-gradient(135deg, #f97316 0%, #fb923c 100%)"
          />
          <KpiCard
            icono={Layers}
            titulo="m³ material"
            valor={kpis.totalM3.toFixed(1)}
            subtitulo="volumen real"
            gradiente="linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)"
          />
          <KpiCard
            icono={TruckIcon}
            titulo="Vales renta"
            valor={kpis.totalRenta}
            subtitulo="equipos"
            gradiente="linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)"
          />
          <KpiCard
            icono={Clock}
            titulo="Tiempo renta"
            valor={kpis.tiempoRenta}
            subtitulo="días · horas acum."
            gradiente="linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)"
          />
          <KpiCard
            icono={BarChart3}
            titulo="Pendientes"
            valor={kpis.pendientes}
            subtitulo="estado emitido"
            gradiente="linear-gradient(135deg, #b45309 0%, #f59e0b 100%)"
          />
          <KpiCard
            icono={Route}
            titulo="Viajes"
            valor={kpis.totalViajes}
            subtitulo={kpisDesdeLocales ? "no disp. con filtros" : "registros de viaje"}
            gradiente="linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)"
          />
          <KpiCard
            icono={DollarSign}
            titulo="Importe"
            valor={fmtImporte(kpis.importeTotal)}
            subtitulo="costo total acum."
            gradiente="linear-gradient(135deg, #065f46 0%, #34d399 100%)"
          />
        </section>
      )}

      {/* ── Filtros ── */}
      <section className="du__filtros">
        {/* Fila 1: Período rápido + semana/mes pickers + rango libre */}
        <div className="du__filtros-grupo">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              className={`du__periodo-btn ${filtros.periodoActivo === p.id ? "du__periodo-btn--activo" : ""}`}
              onClick={() => handlePeriodo(p.id)}
            >
              {p.label}
            </button>
          ))}

          <input
            type="week"
            className="du__input-semana"
            value={semanaValue}
            onChange={(e) => handleSemana(e.target.value)}
            title="Seleccionar semana específica"
          />

          <input
            type="month"
            className="du__input-mes"
            value={mesValue}
            onChange={(e) => handleMes(e.target.value)}
            title="Seleccionar mes específico"
          />

          <div className="du__rango">
            <input
              type="date"
              className="du__input-fecha"
              value={rangoInicio}
              onChange={(e) => setRangoInicio(e.target.value)}
            />
            <span className="du__rango-sep">—</span>
            <input
              type="date"
              className="du__input-fecha"
              value={rangoFin}
              onChange={(e) => setRangoFin(e.target.value)}
            />
            <button
              className="du__btn-aplicar"
              onClick={handleAplicarRango}
              disabled={!rangoInicio || !rangoFin}
            >
              Aplicar
            </button>
          </div>

          <button
            className={`du__cancelados-btn ${mostrarCancelados ? "du__cancelados-btn--activo" : ""}`}
            onClick={toggleCancelados}
            type="button"
            title={mostrarCancelados ? "Ocultar cancelados" : "Ver vales cancelados"}
          >
            <Ban size={13} />
            Cancelados
          </button>
        </div>

        {/* Fila 2: CC, Sindicato, Estado + Calcular KPIs */}
        <div className="du__filtros-grupo du__filtros-grupo--checks">
          <CheckboxDropdown
            label="CC"
            opciones={opciones.ccs}
            seleccionados={filtros.filtroCCs}
            onChange={cambiarCCs}
          />
          <CheckboxDropdown
            label="Sindicato"
            opciones={opciones.sindicatos}
            seleccionados={filtros.filtroSindicatos}
            onChange={cambiarSindicatos}
          />
          <CheckboxDropdown
            label="Estado"
            opciones={ESTADOS_OPCIONES}
            seleccionados={filtros.filtroEstados}
            onChange={cambiarEstados}
            labelsMap={ESTADOS_LABELS}
          />
          {hayFiltrosExtra && (
            <button
              className="du__btn-limpiar"
              onClick={handleLimpiarFiltros}
              type="button"
            >
              Limpiar filtros
            </button>
          )}
          {esAdministrador && (
            <div className="du__calcular-kpis-wrap">
              <button
                className={`du__btn-calcular-kpis ${kpisDesdeLocales ? "du__btn-calcular-kpis--activo" : ""}`}
                onClick={aplicarKpis}
                type="button"
                title="Calcular KPIs con los filtros activos"
              >
                <Calculator size={13} />
                Calcular KPIs
              </button>
            </div>
          )}
        </div>

        {/* Fila 3: Pills de tipo + búsqueda libre */}
        <div className="du__filtros-grupo du__filtros-grupo--pills">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              className={`du__tipo-pill ${filtros.tipoActivo === t.id ? "du__tipo-pill--activo" : ""}`}
              onClick={() => cambiarTipo(t.id)}
            >
              {t.label}
            </button>
          ))}
          <div className="du__busqueda">
            <Search size={15} className="du__busqueda-icono" />
            <input
              type="text"
              className="du__busqueda-input"
              placeholder="Folio, obra, operador, material, placas…"
              value={filtros.busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── Tabla ── */}
      <section className="du__tabla-wrapper">
        {error && (
          <div className="du__error">
            <AlertCircle size={16} />
            <span>Error al cargar vales: {error}</span>
          </div>
        )}

        {loading ? (
          <div className="du__loading">
            <RefreshCw size={20} className="du__spin" />
            <span>Cargando vales…</span>
          </div>
        ) : valesPagina.length === 0 ? (
          <div className="du__vacio">
            <FileText size={36} />
            <p>No hay vales para los filtros seleccionados.</p>
          </div>
        ) : (
          <table className="du__tabla">
            <thead className="du__tabla-head">
              {mostrarCancelados ? (
                <tr>
                  <th className="du__th">Folio</th>
                  <th className="du__th">Empresa</th>
                  <th className="du__th">Obra</th>
                  <th className="du__th">Tipo</th>
                  <th className="du__th">Material / Equipo</th>
                  <th className="du__th">Motivo cancelación</th>
                  <th className="du__th">Fecha cancelación</th>
                  <th className="du__th">Fecha prog.</th>
                  <th className="du__th">Operador</th>
                </tr>
              ) : (
                <tr>
                  <th className="du__th">Folio</th>
                  <th className="du__th">Empresa</th>
                  <th className="du__th">Obra</th>
                  <th className="du__th">Tipo</th>
                  <th className="du__th">Material / Equipo</th>
                  <th className="du__th du__th--numero">Cantidad</th>
                  <th className="du__th">Estado</th>
                  <th className="du__th">Fecha</th>
                  <th className="du__th">Operador</th>
                  <th className="du__th">Placas</th>
                </tr>
              )}
            </thead>
            <tbody>
              {valesPagina.map((vale) => (
                <FilaVale
                  key={vale.id_vale}
                  vale={vale}
                  onClick={setValeSeleccionado}
                  mostrarCancelados={mostrarCancelados}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Paginación ── */}
      {!loading && totalFiltrados > 0 && (
        <footer className="du__paginacion">
          <span className="du__paginacion-info">
            {totalFiltrados} vale{totalFiltrados !== 1 ? "s" : ""} · página{" "}
            {pagina} de {totalPaginas}
          </span>
          <div className="du__paginacion-controles">
            <button
              className="du__pag-btn"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="du__pag-btn"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      )}

      {/* ── Modal de Detalle (sin modificaciones) ── */}
      {valeSeleccionado && (
        <ModalValeDetalle
          vale={valeSeleccionado}
          onCerrar={() => setValeSeleccionado(null)}
          onValeActualizado={handleValeActualizado}
        />
      )}
    </div>
  );
};

export default DashboardUnificado;
