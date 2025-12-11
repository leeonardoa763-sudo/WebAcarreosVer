import { pdf } from "@react-pdf/renderer";
import PDFConciliacionMaterialPetreo from "./PDFConciliacionMaterialPetreo";

export const generarPDFConciliacionMaterialPetreo = async (
  conciliacion,
  valesAgrupados,
  totales
) => {
  try {
    const blob = await pdf(
      <PDFConciliacionMaterialPetreo
        conciliacion={conciliacion}
        valesAgrupados={valesAgrupados}
        totales={totales}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Conciliacion_MAT_PETREO_${conciliacion.folio}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error al generar PDF:", error);
    throw error;
  }
};
