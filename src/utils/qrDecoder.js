/**
 * src/utils/qrDecoder.js
 *
 * Utilidades para decodificar códigos QR de PDFs
 *
 * Funcionalidades:
 * - Detectar y decodificar QR en imagen/canvas
 * - Extraer folio de URL del QR
 *
 * Usado en: useVerificacion.js
 */

import jsQR from "jsqr";

/**
 * Decodificar QR de un canvas
 */
export const decodeQRFromCanvas = (canvas) => {
  try {
    const context = canvas.getContext("2d");
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      return { success: true, data: code.data };
    }

    return { success: false, error: "No se detectó código QR" };
  } catch (error) {
    console.error("Error en decodeQRFromCanvas:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Extraer folio de URL del QR
 * URL esperada: https://verify.controldeacarreos.com/vale/CP-143-00001
 */
export const extractFolioFromQRData = (qrData) => {
  try {
    // Buscar patrón de folio en la URL
    const folioPattern = /vale\/([A-Z]{2}-\d{3}-\d{5})/i;
    const match = qrData.match(folioPattern);

    if (match && match[1]) {
      return { success: true, folio: match[1].toUpperCase() };
    }

    // Si no encuentra el patrón, intentar extraer cualquier folio
    const anyFolioPattern = /([A-Z]{2}-\d{3}-\d{5})/i;
    const anyMatch = qrData.match(anyFolioPattern);

    if (anyMatch && anyMatch[1]) {
      return { success: true, folio: anyMatch[1].toUpperCase() };
    }

    return { success: false, error: "No se encontró folio en el QR" };
  } catch (error) {
    console.error("Error en extractFolioFromQRData:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Decodificar QR y extraer folio del PDF
 */
export const extractFolioFromQR = async (canvas) => {
  try {
    // Decodificar QR
    const qrResult = decodeQRFromCanvas(canvas);

    if (!qrResult.success) {
      return qrResult;
    }

    // Extraer folio de la URL del QR
    return extractFolioFromQRData(qrResult.data);
  } catch (error) {
    console.error("Error en extractFolioFromQR:", error);
    return { success: false, error: error.message };
  }
};
