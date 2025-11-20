/**
 * src/components/conciliaciones/ResumenTotales.jsx
 *
 * Componente que muestra el resumen de totales de la conciliación
 *
 * Funcionalidades:
 * - Muestra total de días/turnos
 * - Muestra total de horas
 * - Muestra subtotal, IVA y total
 *
 * Usado en: Conciliaciones.jsx
 */

// 1. Icons
import { DollarSign, Clock, Calendar } from "lucide-react";

// 2. Utils
import { formatearMoneda, formatearDuracion } from "../../utils/formatters";

const ResumenTotales = ({ totales }) => {
  if (!totales) return null;

  return (
    <div className="resumen-totales">
      <div className="resumen-totales__header">
        <DollarSign size={20} aria-hidden="true" />
        <h3 className="resumen-totales__title">Resumen de Totales</h3>
      </div>

      <div className="resumen-totales__body">
        {/* Total Días */}
        {totales.totalDias > 0 && (
          <div className="resumen-totales__row">
            <div className="resumen-totales__label">
              <Calendar size={16} aria-hidden="true" />
              <span>Total Turnos (días):</span>
            </div>
            <span className="resumen-totales__value resumen-totales__value--highlight">
              {totales.totalDias} {totales.totalDias === 1 ? "día" : "días"}
            </span>
          </div>
        )}

        {/* Total Horas */}
        {totales.totalHoras > 0 && (
          <div className="resumen-totales__row">
            <div className="resumen-totales__label">
              <Clock size={16} aria-hidden="true" />
              <span>Total Horas:</span>
            </div>
            <span className="resumen-totales__value resumen-totales__value--highlight">
              {formatearDuracion(totales.totalHoras)}
            </span>
          </div>
        )}

        <div className="resumen-totales__divider"></div>

        {/* Subtotal */}
        <div className="resumen-totales__row">
          <span className="resumen-totales__label">Subtotal:</span>
          <span className="resumen-totales__value">
            {formatearMoneda(totales.subtotal)}
          </span>
        </div>

        {/* IVA */}
        <div className="resumen-totales__row">
          <span className="resumen-totales__label">IVA 16%:</span>
          <span className="resumen-totales__value">
            {formatearMoneda(totales.iva)}
          </span>
        </div>

        <div className="resumen-totales__divider resumen-totales__divider--bold"></div>

        {/* Total */}
        <div className="resumen-totales__row resumen-totales__row--total">
          <span className="resumen-totales__label resumen-totales__label--total">
            TOTAL:
          </span>
          <span className="resumen-totales__value resumen-totales__value--total">
            {formatearMoneda(totales.total)} MXN
          </span>
        </div>
      </div>
    </div>
  );
};

export default ResumenTotales;
