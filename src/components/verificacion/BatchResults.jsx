/**
 * src/components/verificacion/BatchResults.jsx
 *
 * Muestra resultados del procesamiento masivo con detalles
 */

import {
  CheckCircle,
  AlertCircle,
  XCircle,
  FileCheck,
  Package,
  Clock,
} from "lucide-react";
import { colors } from "../../config/colors";
import { formatearVolumen, formatearDuracion } from "../../utils/formatters";

const BatchResults = ({
  results,
  onConfirmVerification,
  onCancel,
  processing,
}) => {
  const { success, alreadyVerified, errors } = results;

  const getValeDetails = (vale) => {
    if (vale.tipo_vale === "material" && vale.vale_material_detalles) {
      const totalM3 = vale.vale_material_detalles.reduce(
        (sum, detalle) => sum + (detalle.cantidad_pedida_m3 || 0),
        0
      );
      const materiales = vale.vale_material_detalles
        .map((d) => d.material?.material)
        .filter(Boolean)
        .join(", ");

      return {
        tipo: "Material",
        detalle: materiales || "Sin especificar",
        cantidad: formatearVolumen(totalM3),
        icon: Package,
      };
    }

    if (vale.tipo_vale === "renta" && vale.vale_renta_detalle) {
      const primerDetalle = vale.vale_renta_detalle[0];

      // Sumar número de viajes
      const totalViajes = vale.vale_renta_detalle.reduce(
        (sum, detalle) => sum + (detalle.numero_viajes || 0),
        0
      );

      let cantidad = "Pendiente";

      // Verificar si tiene días >= 1 (días completos)
      if (primerDetalle.total_dias && primerDetalle.total_dias >= 1) {
        cantidad = `${primerDetalle.total_dias} ${primerDetalle.total_dias === 1 ? "día" : "días"}`;
      }
      // Si tiene horas, mostrar horas
      else if (primerDetalle.total_horas && primerDetalle.total_horas > 0) {
        cantidad = formatearDuracion(primerDetalle.total_horas);
      }

      return {
        tipo: "Renta",
        detalle: `${totalViajes} ${totalViajes === 1 ? "viaje" : "viajes"}`,
        cantidad: cantidad,
        icon: Clock,
      };
    }

    return {
      tipo: vale.tipo_vale,
      detalle: "Sin detalles",
      cantidad: "N/A",
      icon: FileCheck,
    };
  };
  return (
    <div className="batch-results">
      <h3 className="batch-results__title">Resultados del Análisis</h3>

      <div className="batch-results__summary">
        <div className="batch-results__stat batch-results__stat--success">
          <CheckCircle size={24} />
          <div>
            <span className="batch-results__stat-value">{success.length}</span>
            <span className="batch-results__stat-label">
              Listos para verificar
            </span>
          </div>
        </div>

        <div className="batch-results__stat batch-results__stat--warning">
          <AlertCircle size={24} />
          <div>
            <span className="batch-results__stat-value">
              {alreadyVerified.length}
            </span>
            <span className="batch-results__stat-label">Ya verificados</span>
          </div>
        </div>

        <div className="batch-results__stat batch-results__stat--error">
          <XCircle size={24} />
          <div>
            <span className="batch-results__stat-value">{errors.length}</span>
            <span className="batch-results__stat-label">Con errores</span>
          </div>
        </div>
      </div>

      {success.length > 0 && (
        <div className="batch-results__section">
          <h4 className="batch-results__section-title">
            <CheckCircle size={18} style={{ color: colors.accent }} />
            Vales Listos ({success.length})
          </h4>
          <div className="batch-results__list">
            {success.map((item, index) => {
              const details = getValeDetails(item.vale);
              const IconComponent = details.icon;

              return (
                <div
                  key={index}
                  className="batch-results__item batch-results__item--success"
                >
                  <div className="batch-results__item-header">
                    <FileCheck size={16} />
                    <span className="batch-results__folio">{item.folio}</span>
                  </div>

                  <div className="batch-results__item-details">
                    <div className="batch-results__detail">
                      <span className="batch-results__detail-label">Obra:</span>
                      <span className="batch-results__detail-value">
                        {item.vale.obras?.obra}
                      </span>
                    </div>

                    <div className="batch-results__detail">
                      <IconComponent size={14} />
                      <span className="batch-results__detail-label">
                        {details.tipo}:
                      </span>
                      <span className="batch-results__detail-value">
                        {details.detalle}
                      </span>
                    </div>

                    <div className="batch-results__detail">
                      <span className="batch-results__detail-label">
                        Cantidad:
                      </span>
                      <span className="batch-results__detail-value batch-results__detail-value--highlight">
                        {details.cantidad}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {alreadyVerified.length > 0 && (
        <div className="batch-results__section">
          <h4 className="batch-results__section-title">
            <AlertCircle size={18} style={{ color: colors.warning }} />
            Ya Verificados ({alreadyVerified.length})
          </h4>
          <div className="batch-results__list">
            {alreadyVerified.map((item, index) => (
              <div
                key={index}
                className="batch-results__item batch-results__item--warning"
              >
                <span className="batch-results__folio">{item.folio}</span>
                <span className="batch-results__message">
                  Este vale ya fue verificado anteriormente
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="batch-results__section">
          <h4 className="batch-results__section-title">
            <XCircle size={18} style={{ color: colors.error }} />
            Errores ({errors.length})
          </h4>
          <div className="batch-results__list">
            {errors.map((item, index) => (
              <div
                key={index}
                className="batch-results__item batch-results__item--error"
              >
                <span className="batch-results__folio">
                  {item.folio || item.fileName}
                </span>
                <span className="batch-results__error">{item.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="batch-results__actions">
        <button
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={processing}
        >
          Cancelar
        </button>

        {success.length > 0 && (
          <button
            onClick={() => onConfirmVerification(success)}
            disabled={processing}
            className="btn btn-primary"
            style={{ backgroundColor: colors.accent }}
          >
            {processing
              ? "Verificando..."
              : `Verificar ${success.length} Vale${success.length !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>
    </div>
  );
};

export default BatchResults;
