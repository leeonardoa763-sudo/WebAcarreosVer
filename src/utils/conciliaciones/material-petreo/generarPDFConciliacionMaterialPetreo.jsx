/**
 * src/utils/conciliaciones/material-petreo/generarPDFConciliacionMaterialPetreo.jsx
 *
 * Entry point para generar PDF de conciliaciones de Material Pétreo
 *
 * Dependencias: @react-pdf/renderer, qrcode
 * Usado en: BotonGenerarPDF.jsx
 */

import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import PDFConciliacionMaterialPetreo from "./PDFConciliacionMaterialPetreo";

const BASE_URL = "https://web-acarreos.vercel.app";

/**
 * Generar y descargar PDF de conciliación de Material Pétreo
 *
 * @param {object} conciliacion - Datos de la conciliación desde BD
 * @param {object} valesAgrupados - Vales agrupados por placas
 * @param {object} totales - Totales calculados
 */
export const generarPDFConciliacionMaterialPetreo = async (
  conciliacion,
  valesAgrupados,
  totales
) => {
  try {
    console.log(
      "[generarPDFConciliacionMaterialPetreo] Generando PDF para:",
      conciliacion.folio
    );

    // Generar QR con URL de soporte de vales
    const qrDataUrl = await QRCode.toDataURL(
      `${BASE_URL}/conciliacion/${conciliacion.folio}`,
      { width: 80, margin: 1, color: { dark: "#000000", light: "#FFFFFF" } }
    );

    // Generar el blob del PDF
    const blob = await pdf(
      <PDFConciliacionMaterialPetreo
        conciliacion={conciliacion}
        valesAgrupados={valesAgrupados}
        totales={totales}
        qrDataUrl={qrDataUrl}
      />
    ).toBlob();

    // Crear URL temporal y descargar
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Conciliacion_MAT_PETREO_${conciliacion.folio}.pdf`;
    link.click();

    // Limpiar URL temporal
    URL.revokeObjectURL(url);

    console.log(
      "[generarPDFConciliacionMaterialPetreo] PDF generado exitosamente"
    );
  } catch (error) {
    console.error(
      "[generarPDFConciliacionMaterialPetreo] Error al generar PDF:",
      error
    );
    throw error;
  }
};
