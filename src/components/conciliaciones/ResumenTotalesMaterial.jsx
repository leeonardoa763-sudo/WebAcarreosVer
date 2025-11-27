/**
 * src/components/conciliaciones/ResumenTotalesMaterial.jsx
 *
 * Componente que muestra el resumen de totales de conciliación de material
 *
 * Funcionalidades:
 * - Muestra subtotal, IVA 16%, Retención 4%, y Total
 * - Muestra totales de viajes por tipo
 * - Muestra totales de m³ y toneladas por tipo
 *
 * Usado en: Conciliaciones.jsx
 */

// 1. Icons
import { DollarSign, Truck, Package, Weight } from "lucide-react";

// 2. Utils
import {
  formatearMoneda,
  formatearVolumen,
  formatearPeso,
} from "../../utils/formatters";

const ResumenTotalesMaterial = ({ totales }) => {
  if (!totales) return null;

  const tieneTipo1 =
    totales.totalViajesTipo1 > 0 ||
    totales.totalM3Tipo1 > 0 ||
    totales.totalToneladasTipo1 > 0;

  const tieneTipo2 =
    totales.totalViajesTipo2 > 0 ||
    totales.totalM3Tipo2 > 0 ||
    totales.totalToneladasTipo2 > 0;

  const tieneTipo3 = totales.totalViajesTipo3 > 0 || totales.totalM3Tipo3 > 0;

  return (
    <div className="resumen-totales">
      <div className="resumen-totales__header">
        <DollarSign size={20} aria-hidden="true" />
        <h3 className="resumen-totales__title">Resumen de Totales</h3>
      </div>

      <div className="resumen-totales__body">
        {/* Totales por Tipo de Material */}
        {tieneTipo1 && (
          <div className="resumen-totales__seccion">
            <h4 className="resumen-totales__subtitulo">
              Materiales Pétreos (Tipo 1)
            </h4>

            {totales.totalViajesTipo1 > 0 && (
              <div className="resumen-totales__row">
                <div className="resumen-totales__label">
                  <Truck size={16} aria-hidden="true" />
                  <span>Total Viajes:</span>
                </div>
                <span className="resumen-totales__value resumen-totales__value--highlight">
                  {totales.totalViajesTipo1}{" "}
                  {totales.totalViajesTipo1 === 1 ? "viaje" : "viajes"}
                </span>
              </div>
            )}

            {totales.totalM3Tipo1 > 0 && (
              <div className="resumen-totales__row">
                <div className="resumen-totales__label">
                  <Package size={16} aria-hidden="true" />
                  <span>Total m³ Reales:</span>
                </div>
                <span className="resumen-totales__value resumen-totales__value--highlight">
                  {formatearVolumen(totales.totalM3Tipo1)}
                </span>
              </div>
            )}

            {totales.totalToneladasTipo1 > 0 && (
              <div className="resumen-totales__row">
                <div className="resumen-totales__label">
                  <Weight size={16} aria-hidden="true" />
                  <span>Total Toneladas:</span>
                </div>
                <span className="resumen-totales__value resumen-totales__value--highlight">
                  {formatearPeso(totales.totalToneladasTipo1)}
                </span>
              </div>
            )}
          </div>
        )}

        {tieneTipo2 && (
          <div className="resumen-totales__seccion">
            <h4 className="resumen-totales__subtitulo">
              Materiales Pétreos (Tipo 2)
            </h4>

            {totales.totalViajesTipo2 > 0 && (
              <div className="resumen-totales__row">
                <div className="resumen-totales__label">
                  <Truck size={16} aria-hidden="true" />
                  <span>Total Viajes:</span>
                </div>
                <span className="resumen-totales__value resumen-totales__value--highlight">
                  {totales.totalViajesTipo2}{" "}
                  {totales.totalViajesTipo2 === 1 ? "viaje" : "viajes"}
                </span>
              </div>
            )}

            {totales.totalM3Tipo2 > 0 && (
              <div className="resumen-totales__row">
                <div className="resumen-totales__label">
                  <Package size={16} aria-hidden="true" />
                  <span>Total m³ Reales:</span>
                </div>
                <span className="resumen-totales__value resumen-totales__value--highlight">
                  {formatearVolumen(totales.totalM3Tipo2)}
                </span>
              </div>
            )}

            {totales.totalToneladasTipo2 > 0 && (
              <div className="resumen-totales__row">
                <div className="resumen-totales__label">
                  <Weight size={16} aria-hidden="true" />
                  <span>Total Toneladas:</span>
                </div>
                <span className="resumen-totales__value resumen-totales__value--highlight">
                  {formatearPeso(totales.totalToneladasTipo2)}
                </span>
              </div>
            )}
          </div>
        )}

        {tieneTipo3 && (
          <div className="resumen-totales__seccion">
            <h4 className="resumen-totales__subtitulo">
              Producto de Corte (Tipo 3)
            </h4>

            {totales.totalViajesTipo3 > 0 && (
              <div className="resumen-totales__row">
                <div className="resumen-totales__label">
                  <Truck size={16} aria-hidden="true" />
                  <span>Total Viajes:</span>
                </div>
                <span className="resumen-totales__value resumen-totales__value--highlight">
                  {totales.totalViajesTipo3}{" "}
                  {totales.totalViajesTipo3 === 1 ? "viaje" : "viajes"}
                </span>
              </div>
            )}

            {totales.totalM3Tipo3 > 0 && (
              <div className="resumen-totales__row">
                <div className="resumen-totales__label">
                  <Package size={16} aria-hidden="true" />
                  <span>Total m³ Pedidos:</span>
                </div>
                <span className="resumen-totales__value resumen-totales__value--highlight">
                  {formatearVolumen(totales.totalM3Tipo3)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="resumen-totales__divider"></div>

        {/* Totales Financieros */}
        <div className="resumen-totales__row">
          <span className="resumen-totales__label">Subtotal:</span>
          <span className="resumen-totales__value">
            {formatearMoneda(totales.subtotal)}
          </span>
        </div>

        <div className="resumen-totales__row">
          <span className="resumen-totales__label">IVA 16%:</span>
          <span className="resumen-totales__value">
            {formatearMoneda(totales.iva)}
          </span>
        </div>

        <div className="resumen-totales__row resumen-totales__row--retencion">
          <span className="resumen-totales__label">Retención 4%:</span>
          <span className="resumen-totales__value resumen-totales__value--retencion">
            - {formatearMoneda(totales.retencion)}
          </span>
        </div>

        <div className="resumen-totales__divider resumen-totales__divider--bold"></div>

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

export default ResumenTotalesMaterial;
