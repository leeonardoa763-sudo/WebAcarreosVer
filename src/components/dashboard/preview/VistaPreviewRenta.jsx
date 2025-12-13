/**
 * src/components/dashboard/preview/VistaPreviewRenta.jsx
 *
 * Vista previa de conciliación de Renta (simula PDF)
 *
 * Funcionalidades:
 * - Diseño idéntico al PDF generado
 * - Encabezado, tabla, totales y firmas
 *
 * Usado en: ModalVistaPreviewConciliacion.jsx
 */

// 1. React
import React from "react";

// 2. Utils
import {
  formatearFechaCorta,
  formatearMoneda,
} from "../../../utils/formatters";

const VistaPreviewRenta = ({ conciliacion, valesAgrupados }) => {
  // Calcular totales generales
  const totales = calcularTotales(valesAgrupados);

  // Obtener tarifas del primer detalle
  const { tarifaPorDia, tarifaPorHora } = obtenerTarifas(valesAgrupados);

  return (
    <div className="preview-pdf">
      {/* Encabezado */}
      <div className="preview-pdf__header">
        <h1 className="preview-pdf__title">CONCILIACIÓN DE RENTA</h1>
        <div className="preview-pdf__divider"></div>

        <div className="preview-pdf__info">
          <div className="info-row">
            <span className="info-label">Folio:</span>
            <span className="info-value">{conciliacion.folio}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Empresa:</span>
            <span className="info-value">{conciliacion.empresas.empresa}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Sindicato:</span>
            <span className="info-value">
              {conciliacion.sindicatos.sindicato}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Obra:</span>
            <span className="info-value">
              {conciliacion.obras.cc} - {conciliacion.obras.obra}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Semana / Periodo:</span>
            <span className="info-value">
              {conciliacion.numero_semana} (
              {formatearFechaCorta(conciliacion.fecha_inicio)} al{" "}
              {formatearFechaCorta(conciliacion.fecha_fin)})
            </span>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="preview-pdf__table">
        <table>
          <thead>
            <tr>
              <th>Placas</th>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Material Movido</th>
              <th>Viajes</th>
              <th>Días</th>
              <th>Horas</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(valesAgrupados).map(([placas, grupo]) => (
              <React.Fragment key={placas}>
                {grupo.vales.map((vale) =>
                  vale.vale_renta_detalle.map((detalle, idx) => (
                    <tr key={`${vale.id_vale}-${idx}`}>
                      <td>{placas}</td>
                      <td>{vale.folio}</td>
                      <td>
                        {formatearFechaCorta(vale.fecha_creacion.split("T")[0])}
                      </td>
                      <td>{detalle.material?.material || "N/A"}</td>
                      <td className="text-center">
                        {detalle.numero_viajes || 0}
                      </td>
                      <td className="text-center">{detalle.total_dias || 0}</td>
                      <td className="text-center">
                        {detalle.total_horas
                          ? Number(detalle.total_horas).toFixed(2)
                          : "0.00"}
                      </td>
                      <td className="text-right">
                        {formatearMoneda(detalle.costo_total || 0)}
                      </td>
                    </tr>
                  ))
                )}
                {/* Subtotal por placas */}
                <tr className="subtotal-row">
                  <td colSpan="4" className="text-right">
                    <strong>Subtotal {placas}:</strong>
                  </td>
                  <td className="text-center">
                    <strong>
                      {grupo.vales.reduce(
                        (sum, v) =>
                          sum +
                          v.vale_renta_detalle.reduce(
                            (s, d) => s + Number(d.numero_viajes || 0),
                            0
                          ),
                        0
                      )}
                    </strong>
                  </td>
                  <td className="text-center">
                    <strong>{grupo.totalDias}</strong>
                  </td>
                  <td className="text-center">
                    <strong>{grupo.totalHoras.toFixed(2)}</strong>
                  </td>
                  <td className="text-right">
                    <strong>{formatearMoneda(grupo.subtotal)}</strong>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div className="preview-pdf__totals">
        {totales.totalDias > 0 && (
          <div className="total-row">
            <span className="total-label">Total Días:</span>
            <span className="total-value">{totales.totalDias}</span>
          </div>
        )}

        {totales.totalHoras > 0 && (
          <div className="total-row">
            <span className="total-label">Total Horas:</span>
            <span className="total-value">{totales.totalHoras.toFixed(2)}</span>
          </div>
        )}

        {tarifaPorDia > 0 && (
          <div className="total-row">
            <span className="total-label">Tarifa/Día:</span>
            <span className="total-value">{formatearMoneda(tarifaPorDia)}</span>
          </div>
        )}

        {tarifaPorHora > 0 && (
          <div className="total-row">
            <span className="total-label">Tarifa/Hora:</span>
            <span className="total-value">
              {formatearMoneda(tarifaPorHora)}
            </span>
          </div>
        )}

        <div className="preview-pdf__divider"></div>

        <div className="total-row">
          <span className="total-label">Subtotal:</span>
          <span className="total-value">
            {formatearMoneda(conciliacion.subtotal)}
          </span>
        </div>

        <div className="total-row">
          <span className="total-label">IVA 16%:</span>
          <span className="total-value">
            {formatearMoneda(conciliacion.iva_16_porciento)}
          </span>
        </div>

        <div className="total-row total-row--final">
          <span className="total-label">TOTAL:</span>
          <span className="total-value">
            {formatearMoneda(conciliacion.total_final)} MXN
          </span>
        </div>
      </div>

      {/* Firmas */}
      <div className="preview-pdf__firmas">
        <div className="firma-box">
          <div className="firma-linea"></div>
          <p className="firma-texto">FIRMA DEL SINDICATO</p>
          <p className="firma-nombre">
            {conciliacion.sindicatos.nombre_completo}
          </p>
        </div>

        <div className="firma-box">
          <div className="firma-linea"></div>
          <p className="firma-texto">FIRMA DE AUTORIZACIÓN</p>
          <p className="firma-nombre">Ing. Bruno Leonardo Aguilar Saucedo</p>
        </div>
      </div>

      {/* Footer */}
      <div className="preview-pdf__footer">
        <p>Generado: {new Date().toLocaleString("es-MX")}</p>
      </div>
    </div>
  );
};

// Helpers
const calcularTotales = (valesAgrupados) => {
  let totalDias = 0;
  let totalHoras = 0;

  Object.values(valesAgrupados).forEach((grupo) => {
    totalDias += grupo.totalDias;
    totalHoras += grupo.totalHoras;
  });

  return { totalDias, totalHoras };
};

const obtenerTarifas = (valesAgrupados) => {
  let tarifaPorDia = 0;
  let tarifaPorHora = 0;

  Object.values(valesAgrupados).some((grupo) =>
    grupo.vales.some((vale) =>
      vale.vale_renta_detalle.some((detalle) => {
        if (detalle.precios_renta) {
          tarifaPorDia = detalle.precios_renta.costo_dia || 0;
          tarifaPorHora = detalle.precios_renta.costo_hr || 0;
          return true;
        }
        return false;
      })
    )
  );

  return { tarifaPorDia, tarifaPorHora };
};

export default VistaPreviewRenta;
