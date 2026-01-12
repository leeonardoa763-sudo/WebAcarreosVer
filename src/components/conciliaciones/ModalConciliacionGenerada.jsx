/**
 * src/components/conciliaciones/ModalConciliacionGenerada.jsx
 *
 * Modal que aparece después de generar una conciliación exitosamente
 * Muestra información de la conciliación y botón para descargar PDF
 *
 * Usado en: Conciliaciones.jsx
 */

// 1. React y hooks
import { useEffect } from "react";

// 2. Icons
import { CheckCircle, Download, X } from "lucide-react";

// 3. Config
import { colors } from "../../config/colors";

// 4. Componentes
import BotonGenerarPDF from "./BotonGenerarPDF";

const ModalConciliacionGenerada = ({
  isOpen,
  onClose,
  conciliacion,
  valesAgrupados,
  totales,
  tipoConciliacion,
}) => {
  // Cerrar con tecla ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !conciliacion) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-content--success"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="modal-header">
          <div className="modal-header__title-container">
            <CheckCircle
              size={32}
              style={{ color: colors.success }}
              aria-hidden="true"
            />
            <h3>¡Conciliación Generada Exitosamente!</h3>
          </div>
          <button
            onClick={onClose}
            className="modal-close-button"
            aria-label="Cerrar modal"
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body del modal */}
        <div className="modal-body">
          <div className="conciliacion-generada-info">
            <div className="conciliacion-generada-info__item">
              <span className="conciliacion-generada-info__label">Folio:</span>
              <span className="conciliacion-generada-info__value">
                {conciliacion.folio}
              </span>
            </div>

            <div className="conciliacion-generada-info__item">
              <span className="conciliacion-generada-info__label">Tipo:</span>
              <span className="conciliacion-generada-info__value">
                {tipoConciliacion === "renta"
                  ? "Renta de Equipo"
                  : "Acarreo de Material"}
              </span>
            </div>

            <div className="conciliacion-generada-info__item">
              <span className="conciliacion-generada-info__label">Obra:</span>
              <span className="conciliacion-generada-info__value">
                {conciliacion.obras?.obra || "N/A"}
              </span>
            </div>

            <div className="conciliacion-generada-info__item">
              <span className="conciliacion-generada-info__label">Semana:</span>
              <span className="conciliacion-generada-info__value">
                Semana {conciliacion.numero_semana} - {conciliacion.año}
              </span>
            </div>

            <div className="conciliacion-generada-info__item">
              <span className="conciliacion-generada-info__label">
                Período:
              </span>
              <span className="conciliacion-generada-info__value">
                {new Date(conciliacion.fecha_inicio).toLocaleDateString(
                  "es-MX"
                )}{" "}
                al{" "}
                {new Date(conciliacion.fecha_fin).toLocaleDateString("es-MX")}
              </span>
            </div>

            <div className="conciliacion-generada-info__item conciliacion-generada-info__item--total">
              <span className="conciliacion-generada-info__label">Total:</span>
              <span className="conciliacion-generada-info__value conciliacion-generada-info__value--total">
                $
                {conciliacion.total_final?.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                MXN
              </span>
            </div>
          </div>

          <div className="modal-info-message">
            <p>
              La conciliación ha sido guardada correctamente. Puedes descargar
              el PDF para revisión e impresión.
            </p>
          </div>
        </div>

        {/* Footer del modal con botones */}
        <div className="modal-footer">
          <button
            onClick={onClose}
            className="btn btn--secondary"
            type="button"
          >
            Cerrar
          </button>

          <BotonGenerarPDF
            conciliacion={conciliacion}
            valesAgrupados={valesAgrupados}
            totales={totales}
            tipoConciliacion={tipoConciliacion}
            customIcon={<Download size={20} />}
            customText="Descargar PDF"
            customClassName="btn btn--primary btn--download-pdf"
          />
        </div>
      </div>
    </div>
  );
};

export default ModalConciliacionGenerada;
