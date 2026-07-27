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
  ChevronDown,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";

// 4. Hooks / Utils
import { useAutorizacion } from "../hooks/useAutorizacion";
import { formatearFolio } from "../utils/formatters";
import { exportToExcel } from "../utils/exportToExcel";

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

// ─── Subcomponentes ──────────────────────────────────────────────────────────

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

const FilaVale = ({ vale, seleccionable, seleccionado, onToggle, onClick, onDesautorizar }) => {
  const estadoInfo = ESTADOS_LABELS[vale.estado] ?? { label: vale.estado, clase: "atv__estado--emitido" };
  const obra = vale.obras?.obra ?? "—";
  const empresa = vale.obras?.empresas?.empresa ?? vale.obras?.empresas?.sufijo ?? "—";
  const fecha = vale.fecha_programada ?? vale.fecha_creacion?.substring(0, 10) ?? "—";
  const operador = vale.operadores?.nombre_completo ?? "—";

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
      <td className="atv__celda atv__celda--material">{vale._material}</td>
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
  const [resultadoBatch, setResultadoBatch] = useState(null);

  const {
    valesFiltrados,
    loading,
    error,
    opciones,
    filtros,
    cambiarRango,
    cambiarCCs,
    cambiarSindicatos,
    cambiarMateriales,
    cambiarEstadoAutorizacion,
    cambiarBusqueda,
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
      cambiarRango(rangoInicio, rangoFin);
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
    filtros.filtroMateriales.length > 0;

  const handleLimpiarFiltros = () => {
    cambiarCCs([]);
    cambiarSindicatos([]);
    cambiarMateriales([]);
  };

  const handleExportarExcel = () => {
    const filas = valesFiltrados.map((vale) => ({
      Folio: vale.folio ?? "—",
      Empresa: vale.obras?.empresas?.empresa ?? vale.obras?.empresas?.sufijo ?? "—",
      CC: vale.obras?.cc ?? "—",
      Obra: vale.obras?.obra ?? "—",
      "Material / Equipo": vale._material ?? "—",
      Estado: ESTADOS_LABELS[vale.estado]?.label ?? vale.estado ?? "—",
      Fecha: vale.fecha_programada ?? vale.fecha_creacion?.substring(0, 10) ?? "—",
      Operador: vale.operadores?.nombre_completo ?? "—",
      Sindicato: vale.operadores?.sindicatos?.sindicato ?? "—",
      Verificado: vale.verificado_por_sindicato ? "Sí" : "No",
      Autorización: vale.autorizado ? "Autorizado" : "Pendiente",
      "Fecha autorización": vale.fecha_autorizacion
        ? new Date(vale.fecha_autorizacion).toLocaleString("es-MX", {
            timeZone: "America/Mexico_City",
          })
        : "—",
    }));
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
            >
              Aplicar
            </button>

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
          </div>

          {/* Fila 2: Obra, Sindicato, Material + búsqueda */}
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
                <th className="atv__th">Material / Equipo</th>
                <th className="atv__th">Estado</th>
                <th className="atv__th">Fecha</th>
                <th className="atv__th">Operador</th>
                <th className="atv__th">Autorización</th>
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
          vale={valeSeleccionado}
          onCerrar={() => setValeSeleccionado(null)}
          onValeActualizado={refetch}
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
