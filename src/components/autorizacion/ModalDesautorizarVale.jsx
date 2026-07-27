/**
 * src/components/autorizacion/ModalDesautorizarVale.jsx
 *
 * Modal de confirmación para revertir la autorización de un vale
 * (por ejemplo si el Administrador autorizó por error). Motivo opcional.
 *
 * Dependencias: hooks/useAutorizacion.js, utils/formatters.js
 * Usado en: pages/AutorizarVales.jsx
 */

// 1. React
import { useState } from "react";

// 2. Icons
import { ShieldOff, AlertTriangle, X } from "lucide-react";

// 3. Utils
import { formatearFolio } from "../../utils/formatters";

// 5. Estilos (reutiliza modal-cancelar-vale.css — misma estructura, prefijo mcv__)
import "../../styles/modal-cancelar-vale.css";

const ModalDesautorizarVale = ({ vale, onCerrar, desautorizarVale, desautorizando }) => {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState(null);

  const handleConfirmar = async (e) => {
    e.preventDefault();
    setError(null);

    const { success, error: errorMsg } = await desautorizarVale(vale.id_vale, motivo);
    if (success) {
      onCerrar();
    } else {
      setError(errorMsg || "Error al desautorizar el vale");
    }
  };

  return (
    <div
      className="mcv__overlay"
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mdv-titulo"
    >
      <div className="mcv__panel">
        {/* Header */}
        <div className="mcv__header">
          <div className="mcv__header-left">
            <ShieldOff size={20} className="mcv__header-icon" aria-hidden="true" />
            <h2 id="mdv-titulo" className="mcv__titulo">
              Desautorizar Vale
            </h2>
          </div>
          <button
            type="button"
            className="mcv__cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
            disabled={desautorizando}
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
              <strong>El vale volverá a estado "pendiente de autorización".</strong>
              <p>
                El vale{" "}
                <span className="mcv__folio">{formatearFolio(vale.folio)}</span>{" "}
                no podrá incluirse en una conciliación hasta que se autorice de nuevo.
              </p>
            </div>
          </div>

          {/* Campo de motivo (opcional) */}
          <div className="mcv__campo">
            <label htmlFor="mdv-motivo" className="mcv__label">
              Motivo (opcional)
            </label>
            <textarea
              id="mdv-motivo"
              className="mcv__textarea"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describe por qué se revierte la autorización..."
              rows={4}
              maxLength={500}
              disabled={desautorizando}
              autoFocus
            />
            <span className="mcv__contador" aria-live="polite">
              {motivo.trim().length} / 500
            </span>
          </div>

          {/* Error */}
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
              disabled={desautorizando}
            >
              Volver
            </button>
            <button
              type="submit"
              className="mcv__btn mcv__btn--cancelar"
              disabled={desautorizando}
            >
              {desautorizando ? "Desautorizando..." : "Confirmar desautorización"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalDesautorizarVale;
