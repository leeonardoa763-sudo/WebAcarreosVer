/**
 * src/pages/AutorizarVales.jsx
 *
 * Pestaña "Autorizar Vales" — control independiente del Administrador,
 * separado de la verificación del sindicato. Permite seleccionar varios
 * vales por checkbox y autorizarlos en lote; también permite desautorizar
 * un vale ya autorizado. La conciliación exige que el vale esté autorizado
 * además de verificado (ver hooks/conciliaciones/*Queries.js).
 *
 * Dependencias: useAutorizacion, ModalValeDetalle, ModalDesautorizarVale, colors
 * Usado en: App.jsx (ruta /autorizar-vales, solo Administrador)
 */

// 1. React
import { useState, useRef, useEffect } from "react";

// 2. Icons
import {
  Search,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Download,
  FileText,
  Layers,
  Weight,
  DollarSign,
} from "lucide-react";

// 4. Hooks / Utils
import { useAutorizacion } from "../hooks/useAutorizacion";
import { formatearFolio } from "../utils/formatters";
import { exportToExcel } from "../utils/exportToExcel";
import { getAlertaConfig } from "../utils/alertasVale";

// 5. Componentes
import ModalValeDetalle from "../components/vales/ModalValeDetalle";
import ModalDesautorizarVale from "../components/autorizacion/ModalDesautorizarVale";

// 6. Estilos
import "../styles/autorizar-vales.css";

// ─── Constantes ─────────────────────────────────────────────────────────────

const ESTADOS_LABELS = {
  emitido: { label: "Emitido", clase: "atv__estado--emitido" },
  en_proceso: { label: "En proceso", clase: "atv__estado--en-proceso" },
  verificado: { label: "Verificado", clase: "atv__estado--verificado" },
  conciliado: { label: "Conciliado", clase: "atv__estado--conciliado" },
};

const ESTADOS_AUTORIZACION = [
  { id: "pendientes", label: "Pendientes" },
  { id: "autorizados", label: "Autorizados" },
  { id: "todos", label: "Todos" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtImporte = (v) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 10_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${Number(v).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
};

// ─── Subcomponentes ──────────────────────────────────────────────────────────

const KpiCard = ({ icono: Icono, titulo, valor, gradiente }) => (
  <div className="atv__kpi-card" style={{ background: gradiente }}>
    <span className="atv__kpi-titulo">{titulo}</span>
    <span className="atv__kpi-valor">{valor}</span>
    <Icono size={56} className="atv__kpi-deco" />
  </div>
);

const CheckboxDropdown = ({ label, opciones, seleccionados, onChange }) => {
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
    <div className="atv__chk-dropdown" ref={ref}>
      <button
        className={`atv__chk-trigger ${activo ? "atv__chk-trigger--activo" : ""}`}
        onClick={() => setAbierto((v) => !v)}
        type="button"
      >
        {label}
        {activo && <span className="atv__chk-badge">{seleccionados.length}</span>}
        <ChevronDown
          size={12}
          className={`atv__chk-chevron ${abierto ? "atv__chk-chevron--abierto" : ""}`}
        />
      </button>

      {abierto && (
        <div className="atv__chk-panel">
          {opciones.length === 0 ? (
            <span className="atv__chk-vacio">Sin opciones disponibles</span>
          ) : (
            opciones.map((op) => (
              <label key={op} className="atv__chk-item">
                <input
                  type="checkbox"
                  className="atv__chk-input"
                  checked={seleccionados.includes(op)}
                  onChange={() => toggle(op)}
                />
                <span className="atv__chk-label">{op}</span>
              </label>
            ))
          )}
          {activo && (
            <button className="atv__chk-limpiar" onClick={() => onChange([])} type="button">
              Limpiar selección
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const AlertasVale = ({ alertas }) => {
  if (!alertas || alertas.length === 0) {
    return <span className="atv__sin-alertas">—</span>;
  }
  return (
    <div className="atv__alertas-grupo">
      {alertas.map((a, i) => {
        const cfg = getAlertaConfig(a.tipo);
        const Icono = cfg.icono;
        return (
          <span key={i} className={`atv__badge-alerta atv__badge-alerta--${cfg.nivel}`} title={a.texto}>
            <Icono size={11} />
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
};

const FilaVale = ({ vale, seleccionable, seleccionado, onToggle, onClick, onDesautorizar }) => {
  const estadoInfo = ESTADOS_LABELS[vale.estado] ?? { label: vale.estado, clase: "atv__estado--emitido" };
  const obra = vale.obras?.obra ?? "—";
  const empresa = vale.obras?.empresas?.empresa ?? vale.obras?.empresas?.sufijo ?? "—";
  const fecha = vale._fecha ?? "—";
  const operador = vale.operadores?.nombre_completo ?? "—";
  const volumen = vale._volumen != null ? vale._volumen.toFixed(2) : "—";

  return (
    <tr
      className={`atv__fila ${seleccionado ? "atv__fila--seleccionada" : ""}`}
      onClick={() => onClick(vale)}
    >
      <td
        className="atv__celda atv__celda--check"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          className="atv__checkbox"
          checked={seleccionado}
          disabled={!seleccionable}
          onChange={() => onToggle(vale.id_vale)}
        />
      </td>
      <td className="atv__celda">
        <span className="atv__folio">{formatearFolio(vale.folio)}</span>
      </td>
      <td className="atv__celda">{empresa}</td>
      <td className="atv__celda atv__celda--obra">{obra}</td>
      <td className="atv__celda">{vale._tipoVale}</td>
      <td className="atv__celda atv__celda--material">{vale._material}</td>
      <td className="atv__celda atv__celda--volumen">{volumen}</td>
      <td className="atv__celda">
        <span className={`atv__badge-estado ${estadoInfo.clase}`}>{estadoInfo.label}</span>
      </td>
      <td className="atv__celda atv__celda--fecha">{fecha}</td>
      <td className="atv__celda atv__celda--operador">{operador}</td>
      <td className="atv__celda">
        {vale.autorizado ? (
          <span className="atv__badge-auth atv__badge-auth--si">
            <CheckCircle2 size={12} /> Autorizado
          </span>
        ) : (
          <span className="atv__badge-auth atv__badge-auth--no">
            <XCircle size={12} /> Pendiente
          </span>
        )}
      </td>
      <td className="atv__celda atv__celda--alertas">
        <AlertasVale alertas={vale._alertas} />
      </td>
      <td className="atv__celda atv__celda--accion" onClick={(e) => e.stopPropagation()}>
        {vale.autorizado && vale.estado !== "conciliado" && (
          <button
            type="button"
            className="atv__btn-desautorizar"
            onClick={() => onDesautorizar(vale)}
          >
            <ShieldOff size={12} />
            Desautorizar
          </button>
        )}
      </td>
    </tr>
  );
};

// ─── Página principal ────────────────────────────────────────────────────────

const AutorizarVales = () => {
  const [valeSeleccionado, setValeSeleccionado] = useState(null);
  const [valeADesautorizar, setValeADesautorizar] = useState(null);
  const [rangoInicio, setRangoInicio] = useState("");
  const [rangoFin, setRangoFin] = useState("");
  const [semanaValue, setSemanaValue] = useState("");
  const [mesValue, setMesValue] = useState("");
  const [resultadoBatch, setResultadoBatch] = useState(null);

  const {
    valesFiltrados,
    todosVales,
    loading,
    error,
    opciones,
    kpis,
    kpisDesdeFiltros,
    aplicarKpis,
    resetearKpis,
    filtros,
    cambiarRango,
    cambiarSemana,
    cambiarMes,
    cambiarCCs,
    cambiarSindicatos,
    cambiarMateriales,
    cambiarTiposVale,
    cambiarEstadoAutorizacion,
    cambiarBusqueda,
    cambiarSoloAlertas,
    refetch,
    selectedIds,
    esSeleccionable,
    toggleSelect,
    selectAllPendientesVisibles,
    clearSelection,
    autorizarBatch,
    autorizando,
    desautorizarVale,
    desautorizando,
  } = useAutorizacion();

  useEffect(() => {
    setRangoInicio(filtros.fechaInicio);
    setRangoFin(filtros.fechaFin);
  }, [filtros.fechaInicio, filtros.fechaFin]);

  const handleAplicarRango = () => {
    if (rangoInicio && rangoFin) {
      setSemanaValue("");
      setMesValue("");
      cambiarRango(rangoInicio, rangoFin);
      aplicarKpis();
    }
  };

  const handleSemana = (weekStr) => {
    setSemanaValue(weekStr);
    if (weekStr) {
      setMesValue("");
      cambiarSemana(weekStr);
      aplicarKpis();
    }
  };

  const handleMes = (monthStr) => {
    setMesValue(monthStr);
    if (monthStr) {
      setSemanaValue("");
      cambiarMes(monthStr);
      aplicarKpis();
    }
  };

  const handleAutorizarSeleccion = async () => {
    setResultadoBatch(null);
    const resultado = await autorizarBatch([...selectedIds]);
    setResultadoBatch(resultado);
  };

  const seleccionablesVisibles = valesFiltrados.filter(esSeleccionable);
  const todosSeleccionados =
    seleccionablesVisibles.length > 0 &&
    seleccionablesVisibles.every((v) => selectedIds.has(v.id_vale));

  const hayFiltrosExtra =
    filtros.filtroCCs.length > 0 ||
    filtros.filtroSindicatos.length > 0 ||
    filtros.filtroMateriales.length > 0 ||
    filtros.filtroTiposVale.length > 0;

  const handleLimpiarFiltros = () => {
    cambiarCCs([]);
    cambiarSindicatos([]);
    cambiarMateriales([]);
    cambiarTiposVale([]);
  };

  // Salta al vale comparado en una alerta cruzada (remisión/vale duplicado),
  // dentro del mismo modal — buscarlo en todosVales, no en valesFiltrados,
  // porque puede estar fuera de los filtros/tab activos.
  const handleVerVale = (idVale) => {
    const otro = todosVales.find((v) => v.id_vale === idVale);
    if (otro) setValeSeleccionado(otro);
  };

  const handleExportarExcel = () => {
    const filas = valesFiltrados.flatMap((vale) => {
      const identidad = {
        Folio: vale.folio ?? "—",
        Empresa: vale.obras?.empresas?.empresa ?? vale.obras?.empresas?.sufijo ?? "—",
        CC: vale.obras?.cc ?? "—",
        Obra: vale.obras?.obra ?? "—",
        Tipo: vale._tipoVale,
        "Material / Equipo": vale._material ?? "—",
      };
      const resto = {
        Estado: ESTADOS_LABELS[vale.estado]?.label ?? vale.estado ?? "—",
        Fecha: vale._fecha ?? "—",
        Operador: vale.operadores?.nombre_completo ?? "—",
        Sindicato: vale.operadores?.sindicatos?.sindicato ?? "—",
        Verificado: vale.verificado_por_sindicato ? "Sí" : "No",
        Autorización: vale.autorizado ? "Autorizado" : "Pendiente",
        "Fecha autorización": vale.fecha_autorizacion
          ? new Date(vale.fecha_autorizacion).toLocaleString("es-MX", {
              timeZone: "America/Mexico_City",
            })
          : "—",
        Alertas: vale._alertas?.length
          ? vale._alertas.map((a) => a.texto).join(" | ")
          : "—",
      };
      const filaBase = {
        Remisión: "—",
        Viaje: "",
        Banco: "—",
        "Distancia km": "",
        "m³": "",
        Toneladas: "",
        "Precio m³": "",
        "Costo viaje": "",
      };

      // Renta: sin concepto de remisión — una sola fila resumen.
      if (vale.tipo_vale === "renta") {
        return [{ ...identidad, ...filaBase, ...resto }];
      }

      // Material: un renglón por remisión física.
      // Tipos 1/2 → un viaje = una remisión (folio_vale_fisico), con su
      // propio peso_ton / volumen_m3. Tipo 3 (corte) → un ticket = una
      // remisión, pero el peso/volumen solo existe a nivel detalle (no por
      // ticket individual), así que se asigna únicamente al primer renglón
      // para no fabricar cifras por remisión que no se midieron.
      const filas = [];
      for (const det of vale.vale_material_detalles ?? []) {
        const banco = det.bancos?.banco ?? "—";
        const viajes = det.vale_material_viajes ?? [];

        if (viajes.length > 0) {
          for (const v of viajes) {
            filas.push({
              ...identidad,
              Remisión: v.folio_vale_fisico ?? det.folio_banco ?? "—",
              Viaje: v.numero_viaje ?? "",
              Banco: v.bancos_override?.banco ?? banco,
              "Distancia km": v.distancia_km_override ?? det.distancia_km ?? "",
              "m³": v.volumen_m3 ?? "",
              Toneladas: v.peso_ton ?? "",
              "Precio m³": v.precio_m3_override ?? v.precio_m3 ?? det.precio_m3 ?? "",
              "Costo viaje": v.costo_viaje_override ?? v.costo_viaje ?? "",
              ...resto,
            });
          }
        } else if ((vale.tickets_material ?? []).length > 0) {
          vale.tickets_material.forEach((ticket, idx) => {
            filas.push({
              ...identidad,
              Remisión: ticket.folio_ticket ?? "—",
              Viaje: ticket.numero_ticket ?? "",
              Banco: banco,
              "Distancia km": det.distancia_km ?? "",
              "m³": idx === 0 ? (det.volumen_real_m3 ?? "") : "",
              Toneladas: idx === 0 ? (det.peso_ton ?? "") : "",
              "Precio m³": idx === 0 ? (det.precio_m3 ?? "") : "",
              "Costo viaje": idx === 0 ? (det.costo_total ?? "") : "",
              ...resto,
            });
          });
        } else {
          // Sin viajes ni tickets registrados: una fila resumen del detalle.
          filas.push({
            ...identidad,
            Remisión: det.folio_banco ?? "—",
            Viaje: "",
            Banco: banco,
            "Distancia km": det.distancia_km ?? "",
            "m³": det.volumen_real_m3 ?? "",
            Toneladas: det.peso_ton ?? "",
            "Precio m³": det.precio_m3 ?? "",
            "Costo viaje": det.costo_total ?? "",
            ...resto,
          });
        }
      }

      return filas.length > 0 ? filas : [{ ...identidad, ...filaBase, ...resto }];
    });
    exportToExcel(filas, `autorizar_vales_${filtros.fechaInicio}_${filtros.fechaFin}`, "Vales");
  };

  return (
    <div className="atv__contenedor">
      {/* ── Encabezado ── */}
      <header className="atv__header">
        <div>
          <h1 className="atv__titulo">Autorizar Vales</h1>
          <p className="atv__subtitulo">
            Control del Administrador — un vale necesita estar autorizado (además de
            verificado) para poder incluirse en una conciliación.
          </p>
        </div>
        <div className="atv__header-botones">
          <button
            className="atv__btn-exportar"
            onClick={handleExportarExcel}
            disabled={loading || valesFiltrados.length === 0}
            title={`Exportar ${valesFiltrados.length} vales a Excel`}
          >
            <Download size={15} />
            Excel
          </button>
          <button
            className="atv__btn-refresh"
            onClick={refetch}
            disabled={loading}
            title="Actualizar"
          >
            <RefreshCw size={16} className={loading ? "atv__spin" : ""} />
          </button>
        </div>
      </header>

      {/* ── KPIs ── */}
      {kpisDesdeFiltros && (
        <div className="atv__kpi-fuente">
          <span>
            KPIs recalculados con los filtros activos ({valesFiltrados.length}{" "}
            vale{valesFiltrados.length !== 1 ? "s" : ""})
          </span>
          <button
            className="atv__btn-resetear-kpis"
            onClick={resetearKpis}
            type="button"
          >
            Ver KPIs de todo el período
          </button>
        </div>
      )}
      <section className="atv__kpi-grid">
        <KpiCard
          icono={FileText}
          titulo="Total vales"
          valor={kpis.total}
          gradiente="linear-gradient(135deg, #f97316 0%, #fb923c 100%)"
        />
        <KpiCard
          icono={ShieldOff}
          titulo="Pendientes"
          valor={kpis.pendientes}
          gradiente="linear-gradient(135deg, #b45309 0%, #f59e0b 100%)"
        />
        <KpiCard
          icono={ShieldCheck}
          titulo="Autorizados"
          valor={kpis.autorizados}
          gradiente="linear-gradient(135deg, #065f46 0%, #34d399 100%)"
        />
        <KpiCard
          icono={AlertTriangle}
          titulo="Con alertas"
          valor={kpis.conAlertas}
          gradiente="linear-gradient(135deg, #b91c1c 0%, #f87171 100%)"
        />
        <KpiCard
          icono={Layers}
          titulo="m³ total"
          valor={kpis.totalM3.toFixed(1)}
          gradiente="linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)"
        />
        <KpiCard
          icono={Weight}
          titulo="Toneladas"
          valor={kpis.totalToneladas.toFixed(1)}
          gradiente="linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)"
        />
        <KpiCard
          icono={DollarSign}
          titulo="Importe"
          valor={fmtImporte(kpis.importeTotal)}
          gradiente="linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)"
        />
      </section>

      {/* ── Zona sticky: filtros ── */}
      <div className="atv__sticky-zona">
        <section className="atv__filtros">
          {/* Fila 1: rango de fechas + pills de autorización */}
          <div className="atv__filtros-grupo">
            <input
              type="date"
              className="atv__input-fecha"
              value={rangoInicio}
              onChange={(e) => setRangoInicio(e.target.value)}
            />
            <span className="atv__rango-sep">—</span>
            <input
              type="date"
              className="atv__input-fecha"
              value={rangoFin}
              onChange={(e) => setRangoFin(e.target.value)}
            />
            <button
              className="atv__btn-limpiar"
              onClick={handleAplicarRango}
              disabled={!rangoInicio || !rangoFin}
              type="button"
              title="Aplica el rango de fechas y recalcula los KPIs con los filtros activos"
            >
              Aplicar
            </button>

            <input
              type="week"
              className="atv__input-semana"
              value={semanaValue}
              onChange={(e) => handleSemana(e.target.value)}
              title="Filtrar por semana específica"
            />

            <input
              type="month"
              className="atv__input-mes"
              value={mesValue}
              onChange={(e) => handleMes(e.target.value)}
              title="Filtrar por mes específico"
            />

            {ESTADOS_AUTORIZACION.map((e) => (
              <button
                key={e.id}
                className={`atv__estado-pill ${filtros.estadoAutorizacion === e.id ? "atv__estado-pill--activo" : ""}`}
                onClick={() => cambiarEstadoAutorizacion(e.id)}
                type="button"
              >
                {e.label}
              </button>
            ))}

            <button
              className={`atv__estado-pill atv__estado-pill--alerta ${filtros.soloAlertas ? "atv__estado-pill--alerta-activo" : ""}`}
              onClick={() => cambiarSoloAlertas((v) => !v)}
              type="button"
              title="Mostrar solo vales con alguna alerta"
            >
              <AlertTriangle size={12} />
              Con alertas
            </button>
          </div>

          {/* Fila 2: Obra, Sindicato, Tipo, Material + búsqueda */}
          <div className="atv__filtros-grupo atv__filtros-grupo--checks">
            <CheckboxDropdown
              label="Obra"
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
              label="Tipo"
              opciones={opciones.tiposVale}
              seleccionados={filtros.filtroTiposVale}
              onChange={cambiarTiposVale}
            />
            <CheckboxDropdown
              label="Material"
              opciones={opciones.materiales}
              seleccionados={filtros.filtroMateriales}
              onChange={cambiarMateriales}
            />
            {hayFiltrosExtra && (
              <button className="atv__btn-limpiar" onClick={handleLimpiarFiltros} type="button">
                Limpiar filtros
              </button>
            )}

            <div className="atv__busqueda">
              <Search size={15} className="atv__busqueda-icono" />
              <input
                type="text"
                className="atv__busqueda-input"
                placeholder="Folio, remisión, obra, operador, material…"
                value={filtros.busqueda}
                onChange={(e) => cambiarBusqueda(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ── Barra de acción en lote ── */}
        {selectedIds.size > 0 && (
          <div className="atv__barra-accion">
            <span className="atv__barra-accion-texto">
              {selectedIds.size} vale{selectedIds.size !== 1 ? "s" : ""} seleccionado
              {selectedIds.size !== 1 ? "s" : ""}
            </span>
            <div className="atv__barra-accion-botones">
              <button
                className="atv__btn-cancelar-seleccion"
                onClick={clearSelection}
                disabled={autorizando}
                type="button"
              >
                Cancelar selección
              </button>
              <button
                className="atv__btn-autorizar"
                onClick={handleAutorizarSeleccion}
                disabled={autorizando}
                type="button"
              >
                <ShieldCheck size={15} />
                {autorizando ? "Autorizando..." : `Autorizar ${selectedIds.size} vales`}
              </button>
            </div>
          </div>
        )}

        {/* ── Resultado de la última autorización en lote ── */}
        {resultadoBatch && (
          <>
            {resultadoBatch.autorizados.length > 0 && (
              <div className="atv__resultado atv__resultado--ok">
                <span>
                  ✓ {resultadoBatch.autorizados.length} vale
                  {resultadoBatch.autorizados.length !== 1 ? "s" : ""} autorizado
                  {resultadoBatch.autorizados.length !== 1 ? "s" : ""} correctamente.
                </span>
              </div>
            )}
            {resultadoBatch.errores.length > 0 && (
              <div className="atv__resultado atv__resultado--errores">
                <span>
                  {resultadoBatch.errores.length} vale
                  {resultadoBatch.errores.length !== 1 ? "s" : ""} no se pudieron autorizar:
                </span>
                {resultadoBatch.errores.map(({ idVale, error: err }) => (
                  <span key={idVale}>· Vale #{idVale}: {err}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {/* /atv__sticky-zona */}

      {/* ── Tabla ── */}
      <section className="atv__tabla-wrapper">
        {error && (
          <div className="atv__error">
            <AlertCircle size={16} />
            <span>Error al cargar vales: {error}</span>
          </div>
        )}

        {loading ? (
          <div className="atv__loading">
            <RefreshCw size={20} className="atv__spin" />
            <span>Cargando vales…</span>
          </div>
        ) : valesFiltrados.length === 0 ? (
          <div className="atv__vacio">
            <ShieldCheck size={36} />
            <p>No hay vales para los filtros seleccionados.</p>
          </div>
        ) : (
          <table className="atv__tabla">
            <thead className="atv__tabla-head">
              <tr>
                <th className="atv__th atv__th--check">
                  <input
                    type="checkbox"
                    className="atv__checkbox"
                    checked={todosSeleccionados}
                    disabled={seleccionablesVisibles.length === 0}
                    onChange={selectAllPendientesVisibles}
                    title="Seleccionar todos los pendientes visibles"
                  />
                </th>
                <th className="atv__th">Folio</th>
                <th className="atv__th">Empresa</th>
                <th className="atv__th">Obra</th>
                <th className="atv__th">Tipo</th>
                <th className="atv__th">Material / Equipo</th>
                <th className="atv__th">Vol. (m³)</th>
                <th className="atv__th">Estado</th>
                <th className="atv__th">Fecha</th>
                <th className="atv__th">Operador</th>
                <th className="atv__th">Autorización</th>
                <th className="atv__th">Alertas</th>
                <th className="atv__th"></th>
              </tr>
            </thead>
            <tbody>
              {valesFiltrados.map((vale) => (
                <FilaVale
                  key={vale.id_vale}
                  vale={vale}
                  seleccionable={esSeleccionable(vale)}
                  seleccionado={selectedIds.has(vale.id_vale)}
                  onToggle={toggleSelect}
                  onClick={setValeSeleccionado}
                  onDesautorizar={setValeADesautorizar}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Modal de Detalle ── */}
      {valeSeleccionado && (
        <ModalValeDetalle
          key={valeSeleccionado.id_vale}
          vale={valeSeleccionado}
          onCerrar={() => setValeSeleccionado(null)}
          onValeActualizado={refetch}
          onVerVale={handleVerVale}
        />
      )}

      {/* ── Modal de Desautorización ── */}
      {valeADesautorizar && (
        <ModalDesautorizarVale
          vale={valeADesautorizar}
          onCerrar={() => setValeADesautorizar(null)}
          desautorizarVale={desautorizarVale}
          desautorizando={desautorizando}
        />
      )}
    </div>
  );
};

export default AutorizarVales;
