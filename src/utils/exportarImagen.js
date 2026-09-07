/**
 * src/utils/exportarImagen.js
 *
 * Captura elementos del DOM como imagen PNG descargable o como PDF de
 * "captura tal cual" (una página por elemento, sin recomponer el layout),
 * usando html2canvas + jsPDF. Utilidad genérica: no recibe datos agregados,
 * solo el/los nodo(s) a capturar.
 *
 * Dependencias: html2canvas, jspdf
 * Usado en: EstadisticasGlobales.jsx (sección "Desglose por Obra"),
 * ReporteDiario.jsx (imágenes y PDF del reporte, partido en dos secciones)
 */

// 3. Third party
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const ESCALA_CAPTURA = 2;
// html2canvas mide el elemento en px CSS; a 96dpi (estándar de pantalla)
// 1px CSS = 25.4/96 mm — se usa para que el PDF quede al tamaño real
// capturado, sin recomponer el diseño.
const PX_CSS_A_MM = 25.4 / 96;

const capturarElementoComoCanvas = async (elemento) => {
  if (!elemento) throw new Error("Elemento no encontrado para exportar.");
  return html2canvas(elemento, {
    scale: ESCALA_CAPTURA,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
};

const descargarDataUrl = (dataUrl, nombreArchivo) => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Pequeña espera entre descargas: varios navegadores bloquean o preguntan
// confirmación si se disparan varios `<a download>` seguidos sin pausa.
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const exportarElementoComoImagen = async (elemento, nombreArchivo = "captura.png") => {
  const canvas = await capturarElementoComoCanvas(elemento);
  descargarDataUrl(canvas.toDataURL("image/png"), nombreArchivo);
};

// Descarga un PNG por cada elemento de `elementos`, numerados en el nombre
// (`base_1.png`, `base_2.png`, ...). Pensado para partir un reporte largo en
// imágenes más chicas — mejor calidad/legibilidad al verlas en un teléfono
// que una sola imagen muy alta.
export const exportarElementosComoImagenes = async (elementos, nombreBase = "captura") => {
  const validos = (elementos || []).filter(Boolean);
  if (validos.length === 0) throw new Error("Nada para exportar como imagen.");

  for (let i = 0; i < validos.length; i++) {
    const canvas = await capturarElementoComoCanvas(validos[i]);
    descargarDataUrl(canvas.toDataURL("image/png"), `${nombreBase}_${i + 1}.png`);
    if (i < validos.length - 1) await esperar(250);
  }
};

// PDF "tal cual como se ve en la web": cada elemento se captura igual que
// para la imagen y se pega en su propia página, del mismo tamaño que la
// captura (sin recomponer texto/tablas con jsPDF imperativo, a diferencia
// de exportarReporteEstadisticas.js).
export const exportarElementosComoPDF = async (elementos, nombreArchivo = "reporte.pdf") => {
  const validos = (elementos || []).filter(Boolean);
  if (validos.length === 0) throw new Error("Nada para exportar a PDF.");

  let doc = null;
  for (let i = 0; i < validos.length; i++) {
    const canvas = await capturarElementoComoCanvas(validos[i]);
    const anchoMm = (canvas.width / ESCALA_CAPTURA) * PX_CSS_A_MM;
    const altoMm = (canvas.height / ESCALA_CAPTURA) * PX_CSS_A_MM;
    const orientacion = anchoMm >= altoMm ? "landscape" : "portrait";

    if (!doc) {
      doc = new jsPDF({ orientation: orientacion, unit: "mm", format: [anchoMm, altoMm] });
    } else {
      doc.addPage([anchoMm, altoMm], orientacion);
    }
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, anchoMm, altoMm);
  }
  doc.save(nombreArchivo);
};
