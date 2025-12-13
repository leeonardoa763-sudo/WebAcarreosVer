/**
 * src/components/dashboard/preview/VistaPreviewMaterial.jsx
 *
 * Vista previa de conciliación de Material (simula PDF)
 *
 * Funcionalidades:
 * - Diseño idéntico al PDF generado
 * - Soporta Tipo 1 y 2 (Pétreos) y Tipo 3 (Corte)
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

const VistaPreviewMaterial = ({ conciliacion, valesAgrupados }) => {
  // Detectar tipo predominante
  const tipoPredominante = detectarTipoPredominante(valesAgrupados);

  // Calcular totales generales
  const totales = calcularTotales(valesAgrupados);

  return (
    <div className="preview-pdf">
      {/* Encabezado */}
      <div className="preview-pdf__header">
        <h1 className="preview-pdf__title">
          CONCILIACIÓN DE MATERIAL -{" "}
          {tipoPredominante === "petreo"
            ? "MATERIAL PÉTREO"
            : "PRODUCTO DE CORTE"}
        </h1>
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

      {/* Tabla según tipo */}
      {tipoPredominante === "petreo" ? (
        <TablaMaterialPetreo valesAgrupados={valesAgrupados} />
      ) : (
        <TablaMaterialCorte valesAgrupados={valesAgrupados} />
      )}

      {/* Totales */}
      <div className="preview-pdf__totals">
        {/* Totales por tipo */}
        {totales.totalViajesTipo1 > 0 && (
          <>
            <h3 className="totales-subtitulo">Materiales Pétreos (Tipo 1)</h3>
            <div className="total-row">
              <span className="total-label">Total Viajes:</span>
              <span className="total-value">{totales.totalViajesTipo1}</span>
            </div>
            <div className="total-row">
              <span className="total-label">Total m³ Reales:</span>
              <span className="total-value">
                {totales.totalM3Tipo1.toFixed(2)} m³
              </span>
            </div>
            <div className="total-row">
              <span className="total-label">Total Toneladas:</span>
              <span className="total-value">
                {totales.totalToneladasTipo1.toFixed(2)} ton
              </span>
            </div>
          </>
        )}

        {totales.totalViajesTipo2 > 0 && (
          <>
            <h3 className="totales-subtitulo">Materiales Pétreos (Tipo 2)</h3>
            <div className="total-row">
              <span className="total-label">Total Viajes:</span>
              <span className="total-value">{totales.totalViajesTipo2}</span>
            </div>
            <div className="total-row">
              <span className="total-label">Total m³ Reales:</span>
              <span className="total-value">
                {totales.totalM3Tipo2.toFixed(2)} m³
              </span>
            </div>
            <div className="total-row">
              <span className="total-label">Total Toneladas:</span>
              <span className="total-value">
                {totales.totalToneladasTipo2.toFixed(2)} ton
              </span>
            </div>
          </>
        )}

        {totales.totalViajesTipo3 > 0 && (
          <>
            <h3 className="totales-subtitulo">Producto de Corte (Tipo 3)</h3>
            <div className="total-row">
              <span className="total-label">Total Viajes:</span>
              <span className="total-value">{totales.totalViajesTipo3}</span>
            </div>
            <div className="total-row">
              <span className="total-label">Total m³ Pedidos:</span>
              <span className="total-value">
                {totales.totalM3Tipo3.toFixed(2)} m³
              </span>
            </div>
          </>
        )}

        {/* Precio por m³ */}
        {totales.totalM3General > 0 && (
          <div className="total-row">
            <span className="total-label">Precio/m³:</span>
            <span className="total-value">
              {formatearMoneda(conciliacion.subtotal / totales.totalM3General)}
            </span>
          </div>
        )}

        <div className="preview-pdf__divider"></div>

        {/* Totales financieros */}
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

        <div className="total-row">
          <span className="total-label">Retención 4%:</span>
          <span className="total-value total-value--retencion">
            -{formatearMoneda(conciliacion.retencion_4_porciento)}
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

/* ========================================
   TABLA MATERIAL PÉTREO (Tipo 1 y 2)
   ======================================== */

const TablaMaterialPetreo = ({ valesAgrupados }) => {
  return (
    <div className="preview-pdf__table">
      <table>
        <thead>
          <tr>
            <th>Placas</th>
            <th>Fecha</th>
            <th>Folio</th>
            <th>F.Banco</th>
            <th>Material</th>
            <th>Banco</th>
            <th>Dist (km)</th>
            <th>Viajes</th>
            <th>Vol (m³)</th>
            <th>Ton</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(valesAgrupados).map(([placas, grupo]) => {
            let viajesGrupo = 0;
            let m3Grupo = 0;
            let toneladasGrupo = 0;

            return (
              <React.Fragment key={placas}>
                {grupo.vales.map((vale) =>
                  vale.vale_material_detalles.map((detalle, idx) => {
                    const idTipo =
                      detalle.material?.tipo_de_material?.id_tipo_de_material;

                    // Solo mostrar Tipo 1 y 2
                    if (idTipo !== 1 && idTipo !== 2) return null;

                    viajesGrupo += 1;
                    m3Grupo += Number(detalle.volumen_real_m3 || 0);
                    toneladasGrupo += Number(detalle.peso_ton || 0);

                    return (
                      <tr key={`${vale.id_vale}-${idx}`}>
                        <td>{placas}</td>
                        <td>
                          {formatearFechaCorta(
                            vale.fecha_creacion.split("T")[0]
                          )}
                        </td>
                        <td>{vale.folio}</td>
                        <td>{detalle.folio_banco || "N/A"}</td>
                        <td>{detalle.material?.material || "N/A"}</td>
                        <td>{detalle.bancos?.banco || "N/A"}</td>
                        <td className="text-center">
                          {Number(detalle.distancia_km).toFixed(1)}
                        </td>
                        <td className="text-center">1</td>
                        <td className="text-right">
                          {Number(detalle.volumen_real_m3).toFixed(2)}
                        </td>
                        <td className="text-right">
                          {Number(detalle.peso_ton).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Subtotal por placas */}
                <tr className="subtotal-row">
                  <td colSpan="7" className="text-right">
                    <strong>Subtotal {placas}:</strong>
                  </td>
                  <td className="text-center">
                    <strong>{viajesGrupo}</strong>
                  </td>
                  <td className="text-right">
                    <strong>{m3Grupo.toFixed(2)}</strong>
                  </td>
                  <td className="text-right">
                    <strong>{toneladasGrupo.toFixed(2)}</strong>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ========================================
   TABLA MATERIAL DE CORTE (Tipo 3)
   ======================================== */

const TablaMaterialCorte = ({ valesAgrupados }) => {
  return (
    <div className="preview-pdf__table">
      <table>
        <thead>
          <tr>
            <th>Placas</th>
            <th>Fecha</th>
            <th>Folio</th>
            <th>Material</th>
            <th>Banco</th>
            <th>Dist (km)</th>
            <th>Viajes</th>
            <th>Cap (m³)</th>
            <th>M³ Ped</th>
            <th>Importe</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(valesAgrupados).map(([placas, grupo]) => {
            let viajesGrupo = 0;
            let m3Grupo = 0;

            return (
              <React.Fragment key={placas}>
                {grupo.vales.map((vale) =>
                  vale.vale_material_detalles.map((detalle, idx) => {
                    const idTipo =
                      detalle.material?.tipo_de_material?.id_tipo_de_material;

                    // Solo mostrar Tipo 3
                    if (idTipo !== 3) return null;

                    viajesGrupo += 1;
                    m3Grupo += Number(detalle.cantidad_pedida_m3 || 0);

                    return (
                      <tr key={`${vale.id_vale}-${idx}`}>
                        <td>{placas}</td>
                        <td>
                          {formatearFechaCorta(
                            vale.fecha_creacion.split("T")[0]
                          )}
                        </td>
                        <td>{vale.folio}</td>
                        <td>{detalle.material?.material || "N/A"}</td>
                        <td>{detalle.bancos?.banco || "N/A"}</td>
                        <td className="text-center">
                          {Number(detalle.distancia_km).toFixed(1)}
                        </td>
                        <td className="text-center">1</td>
                        <td className="text-right">
                          {Number(detalle.capacidad_m3).toFixed(2)}
                        </td>
                        <td className="text-right">
                          {Number(detalle.cantidad_pedida_m3).toFixed(2)}
                        </td>
                        <td className="text-right">
                          {formatearMoneda(detalle.costo_total || 0)}
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Subtotal por placas */}
                <tr className="subtotal-row">
                  <td colSpan="6" className="text-right">
                    <strong>Subtotal {placas}:</strong>
                  </td>
                  <td className="text-center">
                    <strong>{viajesGrupo}</strong>
                  </td>
                  <td colSpan="1"></td>
                  <td className="text-right">
                    <strong>{m3Grupo.toFixed(2)}</strong>
                  </td>
                  <td className="text-right">
                    <strong>{formatearMoneda(grupo.subtotal)}</strong>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ========================================
   HELPERS
   ======================================== */

/**
 * Detectar tipo predominante de material
 */
const detectarTipoPredominante = (valesAgrupados) => {
  let conteoTipo1o2 = 0;
  let conteoTipo3 = 0;

  Object.values(valesAgrupados).forEach((grupo) => {
    grupo.vales.forEach((vale) => {
      vale.vale_material_detalles?.forEach((detalle) => {
        const idTipo = detalle.material?.tipo_de_material?.id_tipo_de_material;
        if (idTipo === 1 || idTipo === 2) conteoTipo1o2++;
        if (idTipo === 3) conteoTipo3++;
      });
    });
  });

  return conteoTipo1o2 > conteoTipo3 ? "petreo" : "corte";
};

/**
 * Calcular totales generales
 */
const calcularTotales = (valesAgrupados) => {
  let totalViajesTipo1 = 0;
  let totalViajesTipo2 = 0;
  let totalViajesTipo3 = 0;
  let totalM3Tipo1 = 0;
  let totalM3Tipo2 = 0;
  let totalM3Tipo3 = 0;
  let totalToneladasTipo1 = 0;
  let totalToneladasTipo2 = 0;

  Object.values(valesAgrupados).forEach((grupo) => {
    totalViajesTipo1 += grupo.totalesTipo1.totalViajes;
    totalViajesTipo2 += grupo.totalesTipo2.totalViajes;
    totalViajesTipo3 += grupo.totalesTipo3.totalViajes;

    totalM3Tipo1 += grupo.totalesTipo1.totalM3;
    totalM3Tipo2 += grupo.totalesTipo2.totalM3;
    totalM3Tipo3 += grupo.totalesTipo3.totalM3;

    totalToneladasTipo1 += grupo.totalesTipo1.totalToneladas;
    totalToneladasTipo2 += grupo.totalesTipo2.totalToneladas;
  });

  return {
    totalViajesTipo1,
    totalViajesTipo2,
    totalViajesTipo3,
    totalM3Tipo1,
    totalM3Tipo2,
    totalM3Tipo3,
    totalToneladasTipo1,
    totalToneladasTipo2,
    totalM3General: totalM3Tipo1 + totalM3Tipo2 + totalM3Tipo3,
  };
};

export default VistaPreviewMaterial;
