/**
 * src/utils/conciliaciones/material-corte/generarPDFConciliacionMaterialCorte.jsx
 *
 * Entry point para generar PDF de conciliaciones de Material de Corte
 *
 * Dependencias: @react-pdf/renderer
 * Usado en: BotonGenerarPDF.jsx
 */

import { pdf } from "@react-pdf/renderer";
import PDFConciliacionMaterialCorte from "./PDFConciliacionMaterialCorte";

/**
 * Generar y descargar PDF de conciliación de Material de Corte
 *
 * @param {object} conciliacion - Datos de la conciliación desde BD
 * @param {object} valesAgrupados - Vales agrupados por placas
 * @param {object} totales - Totales calculados
 */
export const generarPDFConciliacionMaterialCorte = async (
  conciliacion,
  valesAgrupados,
  totales
) => {
  try {
    console.log(
      "[generarPDFConciliacionMaterialCorte] Generando PDF para:",
      conciliacion.folio
    );

    // Generar el blob del PDF
    const blob = await pdf(
      <PDFConciliacionMaterialCorte
        conciliacion={conciliacion}
        valesAgrupados={valesAgrupados}
        totales={totales}
      />
    ).toBlob();

    // Crear URL temporal y descargar
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Conciliacion_MAT_CORTE_${conciliacion.folio}.pdf`;
    link.click();

    // Limpiar URL temporal
    URL.revokeObjectURL(url);

    console.log(
      "[generarPDFConciliacionMaterialCorte] PDF generado exitosamente"
    );
  } catch (error) {
    console.error(
      "[generarPDFConciliacionMaterialCorte] Error al generar PDF:",
      error
    );
    throw error;
  }
};
