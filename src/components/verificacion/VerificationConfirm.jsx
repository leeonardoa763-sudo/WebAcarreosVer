/**
 * src/components/verificacion/VerificationConfirm.jsx
 *
 * Botón de confirmación de verificación con advertencia
 * Genérico vía prop itemLabel ("vale" | "conciliación")
 *
 * Usado en: VerificarVales.jsx, VerificarConciliacionAccion.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

// 3. Config
import { colors } from "../../config/colors";

const VerificationConfirm = ({
  onConfirm,
  disabled = false,
  loading = false,
  itemLabel = "vale",
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleFirstClick = () => {
    if (!showConfirm) {
      setShowConfirm(true);
    }
  };

  const handleConfirm = () => {
    onConfirm();
    setShowConfirm(false);
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  if (!showConfirm) {
    return (
      <div className="verification-confirm">
        <div className="verification-confirm__warning">
          <AlertTriangle size={20} />
          <p>
            Esta acción no se puede deshacer. {itemLabel === "vale" ? "El" : "La"}{" "}
            {itemLabel} quedará marcad{itemLabel === "vale" ? "o" : "a"} como
            verificad{itemLabel === "vale" ? "o" : "a"}.
          </p>
        </div>

        <button
          onClick={handleFirstClick}
          disabled={disabled || loading}
          className="verification-confirm__button verification-confirm__button--primary"
          style={{ backgroundColor: colors.accent }}
        >
          <CheckCircle size={20} />
          Verificar {itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)}
        </button>
      </div>
    );
  }

  return (
    <div className="verification-confirm verification-confirm--expanded">
      <div className="verification-confirm__warning verification-confirm__warning--danger">
        <AlertTriangle size={20} />
        <p>¿Estás seguro? Esta acción es permanente.</p>
      </div>

      <div className="verification-confirm__actions">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="verification-confirm__button verification-confirm__button--secondary"
        >
          Cancelar
        </button>

        <button
          onClick={handleConfirm}
          disabled={loading}
          className="verification-confirm__button verification-confirm__button--danger"
          style={{ backgroundColor: colors.accent }}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="verification-confirm__spinner" />
              Verificando...
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              Sí, Verificar
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default VerificationConfirm;
