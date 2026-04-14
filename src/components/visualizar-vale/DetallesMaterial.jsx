/**
 * src/components/visualizar-vale/DetallesMaterial.jsx
 *
 * Muestra los datos del detalle de un vale de material en la página pública
 * Incluye capacidad, distancia, volumen, peso y precios (si tiene permiso)
 *
 * Dependencias: formatters, colors
 * Usado en: VisualizarVale.jsx
 */

// 1. React
import React from "react";

// 2. Utils
import {
  formatearMoneda,
  formatearVolumen,
  formatearPeso,
} from "../../utils/formatters";

const DetallesMaterial = ({ detalle, mostrarPrecios }) => {
  return (
    <div className="vale-section">
      <h3 className="section-title">DATOS DE VALE</h3>

      <div className="info-full">
        <span className="info-label">Material:</span>
        <span className="info-value">
          {detalle.material?.material || "N/A"}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Capacidad:</span>
        <span className="info-value">
          {formatearVolumen(detalle.capacidad_m3)}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Distancia:</span>
        <span className="info-value">{detalle.distancia_km || 0} Km</span>
      </div>

      <div className="divider-thin"></div>

      <div className="info-row">
        <span className="info-label">Cantidad Pedida:</span>
        <span className="info-value">
          {formatearVolumen(detalle.cantidad_pedida_m3)}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Requisición:</span>
        <span className="info-value">{detalle.requisicion || "N/A"}</span>
      </div>

      {detalle.folio_banco && (
        <div className="info-row">
          <span className="info-label">Folio Banco:</span>
          <span className="info-value">{detalle.folio_banco}</span>
        </div>
      )}

      {detalle.peso_ton && (
        <div className="info-row">
          <span className="info-label">Peso:</span>
          <span className="info-value">{formatearPeso(detalle.peso_ton)}</span>
        </div>
      )}

      {detalle.volumen_real_m3 && (
        <div className="info-row">
          <span className="info-label">Volumen Real:</span>
          <span className="info-value">
            {formatearVolumen(detalle.volumen_real_m3)}
          </span>
        </div>
      )}

      {/* Precios: solo si tiene permiso */}
      {mostrarPrecios && detalle.costo_total && (
        <>
          <div className="divider-thin"></div>

          {detalle.tarifa_primer_km && (
            <div className="info-row">
              <span className="info-label">Tarifa 1er Km:</span>
              <span className="info-value">
                {formatearMoneda(detalle.tarifa_primer_km)}
              </span>
            </div>
          )}

          {detalle.tarifa_subsecuente && (
            <div className="info-row">
              <span className="info-label">Tarifa Subsecuente:</span>
              <span className="info-value">
                {formatearMoneda(detalle.tarifa_subsecuente)}/km
              </span>
            </div>
          )}

          {detalle.precio_m3 && (
            <div className="info-row">
              <span className="info-label">Precio/m³:</span>
              <span className="info-value">
                {formatearMoneda(detalle.precio_m3)}
              </span>
            </div>
          )}

          <div className="info-row info-row-total">
            <span className="info-label">Costo Total:</span>
            <span className="info-value">
              {formatearMoneda(detalle.costo_total)} MXN
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default DetallesMaterial;
