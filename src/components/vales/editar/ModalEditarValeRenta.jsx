/**
 * src/components/vales/editar/ModalEditarValeRenta.jsx
 *
 * Modal para cambiar el tipo de renta de un vale (día completo, medio día, por horas).
 * Solo visible para Administrador. Bloqueado si el vale está conciliado o verificado.
 *
 * Dependencias: useEditarValeRenta, useAuth, lucide-react, modal-editar-vale.css
 * Usado en: ValeCardRenta.jsx
 */

// 1. React y hooks
import { useEffect } from "react";

// 2. Icons
import {
  X,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Loader,
  Clock,
  Sun,
  CalendarDays,
} from "lucide-react";

// 3. Config
import { colors } from "../../../config/colors";

// 4. Hooks personalizados
import {
  useEditarValeRenta,
  OPCIONES_TIPO_RENTA,
} from "../../../hooks/editar-vale/useEditarValeRenta";

// 5. Utils
import { formatearMoneda, formatearFolio } from "../../../utils/formatters";

// 6. Estilos
import "../../../styles/modal-editar-vale.css";

// ─── Icono por opción ─────────────────────────────────────────────────────────

const IconoOpcion = ({ valor, size = 18 }) => {
  if (valor === "dia") return <CalendarDays size={size} aria-hidden="true" />;
  if (valor === "medio_dia") return <Sun size={size} aria-hidden="true" />;
  return <Clock size={size} aria-hidden="true" />;
};

// ─── Componente ───────────────────────────────────────────────────────────────

const ModalEditarValeRenta = ({
  /** UUID del vale_renta_detalle a editar */
  idValeRentaDetalle,
  /** Folio del vale padre — solo para mostrar en el header */
  folioVale,
  /** Callback cuando el modal se cierra */
  onCerrar,
  /** Callback cuando se guardan cambios exitosamente */
  onGuardadoExitoso,
}) => {
  const {
    detalle,
    opcionSeleccionada,
    totalHorasInput,
    costoPreview,
    loading,
    guardando,
    error,
    mensajeExito,
    hayCambiosPendientes,
    cargarDetalle,
    seleccionarOpcion,
    setTotalHorasInput,
    guardarCambios,
    descartarCambios,
  } = useEditarValeRenta();

  // Cargar detalle al montar
  useEffect(() => {
    if (idValeRentaDetalle) {
      cargarDetalle(idValeRentaDetalle);
    }
  }, [idValeRentaDetalle, cargarDetalle]);

  // Notificar al padre cuando el guardado es exitoso
  useEffect(() => {
    if (mensajeExito && onGuardadoExitoso) {
      onGuardadoExitoso();
    }
  }, [mensajeExito, onGuardadoExitoso]);

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleGuardar = async () => {
    await guardarCambios();
  };

  const handleDescartar = () => {
    if (hayCambiosPendientes) {
      const confirmar = window.confirm(
        "¿Descartar los cambios? Esta acción no se puede deshacer.",
      );
      if (!confirmar) return;
    }
    descartarCambios();
  };

  const handleCerrar = () => {
    if (hayCambiosPendientes && !mensajeExito) {
      const confirmar = window.confirm(
        "¿Cerrar sin guardar? Los cambios se perderán.",
      );
      if (!confirmar) return;
    }
    onCerrar();
  };

  // ── Render: Loading ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mev__overlay" role="dialog" aria-modal="true">
        <div className="mev__panel mev__panel--sm">
          <div className="mev__loading">
            <Loader
              size={28}
              className="mev__spinner"
              style={{ color: colors.primary }}
            />
            <span>Cargando detalle de renta...</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Error al cargar ────────────────────────────────────────────────

  if (!detalle && !loading) {
    return (
      <div className="mev__overlay" role="dialog" aria-modal="true">
        <div className="mev__panel mev__panel--sm">
          <div className="mev__error-carga">
            <AlertCircle size={24} color="#ef4444" />
            <span>No se pudo cargar el detalle. Intenta de nuevo.</span>
            <button
              type="button"
              className="mev__btn-cerrar"
              onClick={onCerrar}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { costo_dia, costo_hr } = detalle?.precios_renta || {};
  const materialNombre = detalle?.material?.material || "Sin material";

  // ── Render principal ───────────────────────────────────────────────────────

  return (
    <div
      className="mev__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mer-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCerrar();
      }}
    >
      <div className="mev__panel mev__panel--sm">
        {/* ── Header ── */}
        <div className="mev__header">
          <div className="mev__header-izq">
            <div className="mev__header-icono">
              <Clock size={20} />
            </div>
            <div>
              <h2 id="mer-titulo" className="mev__titulo">
                Editar Tipo de Renta
              </h2>
              <p className="mev__subtitulo">
                Vale {formatearFolio(folioVale)} — {materialNombre}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="mev__btn-cerrar"
            onClick={handleCerrar}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Cuerpo ── */}
        <div className="mev__body">
          {/* Tarifas de referencia */}
          {(costo_dia || costo_hr) && (
            <div className="mer__tarifas">
              {costo_dia && (
                <div className="mer__tarifa-item">
                  <CalendarDays size={14} aria-hidden="true" />
                  <span className="mer__tarifa-label">Tarifa por día:</span>
                  <span className="mer__tarifa-valor">
                    {formatearMoneda(costo_dia)}
                  </span>
                </div>
              )}
              {costo_hr && (
                <div className="mer__tarifa-item">
                  <Clock size={14} aria-hidden="true" />
                  <span className="mer__tarifa-label">Tarifa por hora:</span>
                  <span className="mer__tarifa-valor">
                    {formatearMoneda(costo_hr)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Opciones de tipo de renta */}
          <div className="mer__opciones">
            <p className="mer__opciones-titulo">Selecciona el tipo de renta:</p>

            <div className="mer__opciones-grid">
              {OPCIONES_TIPO_RENTA.map((opcion) => {
                const activa = opcionSeleccionada === opcion.valor;
                return (
                  <button
                    key={opcion.valor}
                    type="button"
                    className={`mer__opcion-btn${activa ? " mer__opcion-btn--activa" : ""}`}
                    onClick={() => seleccionarOpcion(opcion.valor)}
                    aria-pressed={activa}
                  >
                    <IconoOpcion valor={opcion.valor} size={20} />
                    <span className="mer__opcion-label">{opcion.label}</span>
                    {activa && (
                      <span className="mer__opcion-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input de horas — solo cuando opción es "horas" */}
          {opcionSeleccionada === "horas" && (
            <div className="mer__horas-input-wrap">
              <label htmlFor="mer-horas" className="mer__horas-label">
                Número de horas trabajadas:
              </label>
              <div className="mer__horas-campo">
                <Clock
                  size={16}
                  aria-hidden="true"
                  className="mer__horas-icono"
                />
                <input
                  id="mer-horas"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={totalHorasInput}
                  onChange={(e) => setTotalHorasInput(e.target.value)}
                  className="mer__horas-input"
                  placeholder="Ej: 4.5"
                  aria-label="Total de horas"
                />
                <span className="mer__horas-sufijo">hrs</span>
              </div>
            </div>
          )}

          {/* Preview del costo calculado */}
          {costoPreview !== null && costoPreview > 0 && (
            <div className="mer__costo-preview">
              <span className="mer__costo-label">Costo calculado:</span>
              <span className="mer__costo-valor">
                {formatearMoneda(costoPreview)}
              </span>
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="mev__banner mev__banner--error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Mensaje de éxito */}
          {mensajeExito && (
            <div className="mev__banner mev__banner--exito" role="status">
              <CheckCircle size={16} />
              <span>{mensajeExito}</span>
            </div>
          )}
        </div>

        {/* ── Footer con acciones ── */}
        <div className="mev__footer">
          <button
            type="button"
            className="mev__btn mev__btn--secundario"
            onClick={handleDescartar}
            disabled={guardando || !hayCambiosPendientes}
          >
            <RotateCcw size={15} />
            Descartar
          </button>

          <button
            type="button"
            className="mev__btn mev__btn--primario"
            onClick={handleGuardar}
            disabled={guardando || !hayCambiosPendientes}
          >
            {guardando ? (
              <>
                <Loader size={15} className="mev__spinner" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={15} />
                Guardar cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEditarValeRenta;
