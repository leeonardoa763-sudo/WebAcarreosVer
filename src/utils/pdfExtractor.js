/**
 * src/utils/pdfExtractor.js
 *
 * Utilidades para extraer información de PDFs de vales
 *
 * Funcionalidades:
 * - Extraer texto completo del PDF
 * - Buscar y extraer folio mediante regex
 * - Convertir PDF a imagen para procesamiento de QR
 *
 * Usado en: useVerificacion.js
 */

import * as pdfjsLib from "pdfjs-dist";

// Configurar worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

/**
 * Extraer texto completo del PDF
 */
export const extractTextFromPDF = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    // Extraer texto de todas las páginas
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    return { success: true, text: fullText };
  } catch (error) {
    console.error("Error en extractTextFromPDF:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Extraer folio del texto usando regex
 * Busca patrón: FOLIO CP-XXX-XXXXX o similar
 */
export const extractFolioFromText = (text) => {
  try {
    // Patrón para folios: 2 letras - 3 dígitos - 5 dígitos
    const folioPattern = /FOLIO\s+([A-Z]{2}-\d{3}-\d{5})/i;
    const match = text.match(folioPattern);

    if (match && match[1]) {
      return { success: true, folio: match[1].toUpperCase() };
    }

    // Intentar patrón alternativo sin la palabra FOLIO
    const altPattern = /([A-Z]{2}-\d{3}-\d{5})/;
    const altMatch = text.match(altPattern);

    if (altMatch && altMatch[1]) {
      return { success: true, folio: altMatch[1].toUpperCase() };
    }

    return { success: false, error: "No se encontró folio en el texto" };
  } catch (error) {
    console.error("Error en extractFolioFromText:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Convertir primera página del PDF a imagen (Canvas)
 * Necesario para decodificar QR
 */
export const convertPDFToImage = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1); // Primera página

    const viewport = page.getViewport({ scale: 2.0 }); // Escala 2x para mejor calidad
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    return { success: true, canvas };
  } catch (error) {
    console.error("Error en convertPDFToImage:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Extraer folio del PDF (intenta OCR primero)
 */
export const extractFolioFromPDF = async (file) => {
  try {
    // Método 1: Extraer texto y buscar folio
    const textResult = await extractTextFromPDF(file);

    if (textResult.success) {
      const folioResult = extractFolioFromText(textResult.text);
      if (folioResult.success) {
        return folioResult;
      }
    }

    return {
      success: false,
      error: "No se pudo extraer el folio del PDF",
      needsQR: true, // Indica que debe intentar con QR
    };
  } catch (error) {
    console.error("Error en extractFolioFromPDF:", error);
    return { success: false, error: error.message };
  }
};
