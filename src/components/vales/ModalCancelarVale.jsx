/**
 * src/components/vales/ModalCancelarVale.jsx
 *
 * Modal de confirmación para cancelar un vale.
 * Solo accesible para Administrador. Solo para estados 'emitido' y 'en_proceso'.
 *
 * Dependencias: hooks/vales/useCancelarVale.js, utils/formatters.js
 * Usado en: components/vales/ValeCardMaterial.jsx, ValeCardRenta.jsx
 */

// 1. React
import { useState } from "react";

// 2. Icons
import { XCircle, AlertTriangle, X } from "lucide-react";

// 3. Utils
import { formatearFolio } from "../../utils/formatters";

// 4. Hooks personalizados
import { useCancelarVale } from "../../hooks/vales/useCancelarVale";

const MOTIVO_MIN = 10;

const ModalCancelarVale = ({ vale, onCerrar, onCanceladoExitoso }) => {
  const [motivo, setMotivo] = useState("");
  const { cancelarVale, loading, error } = useCancelarVale();

  const motivoValido = motivo.trim().length >= MOTIVO_MIN;

  const handleConfirmar = async (e) => {
    e.preventDefault();
    if (!motivoValido) return;

    const { success } = await cancelarVale(vale.id_vale, vale.estado, motivo);
    if (success) {
      onCanceladoExitoso();
    }
  };

  return (
    <div
      className="mcv__overlay"
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mcv-titulo"
    >
      <div className="mcv__panel">
        {/* Header */}
        <div className="mcv__header">
          <div className="mcv__header-left">
            <XCircle size={20} className="mcv__header-icon" aria-hidden="true" />
            <h2 id="mcv-titulo" className="mcv__titulo">
              Cancelar Vale
            </h2>
          </div>
          <button
            type="button"
            className="mcv__cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
            disabled={loading}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleConfirmar} className="mcv__body">
          {/* Advertencia */}
          <div className="mcv__advertencia" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>Esta acción no se puede deshacer.</strong>
              <p>
                El vale{" "}
                <span className="mcv__folio">{formatearFolio(vale.folio)}</span>{" "}
                quedará marcado como cancelado permanentemente.
              </p>
            </div>
          </div>

          {/* Campo de motivo */}
          <div className="mcv__campo">
            <label htmlFor="mcv-motivo" className="mcv__label">
              Motivo de cancelación <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="mcv-motivo"
              className="mcv__textarea"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describe el motivo por el que se cancela este vale..."
              rows={4}
              maxLength={500}
              disabled={loading}
              autoFocus
            />
            <span className="mcv__contador" aria-live="polite">
              {motivo.trim().length < MOTIVO_MIN
                ? `Mínimo ${MOTIVO_MIN} caracteres (faltan ${MOTIVO_MIN - motivo.trim().length})`
                : `${motivo.trim().length} / 500`}
            </span>
          </div>

          {/* Error del servidor */}
          {error && (
            <p className="mcv__error" role="alert">
              {error}
            </p>
          )}

          {/* Acciones */}
          <div className="mcv__acciones">
            <button
              type="button"
              className="mcv__btn mcv__btn--secundario"
              onClick={onCerrar}
              disabled={loading}
            >
              Volver
            </button>
            <button
              type="submit"
              className="mcv__btn mcv__btn--cancelar"
              disabled={!motivoValido || loading}
            >
              {loading ? "Cancelando..." : "Confirmar cancelación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalCancelarVale;
