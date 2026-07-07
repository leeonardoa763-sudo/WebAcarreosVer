/**
 * src/utils/exportarImagen.js
 *
 * Captura un elemento del DOM como imagen PNG descargable, usando html2canvas.
 * Utilidad genérica: no recibe datos agregados, solo el nodo a capturar.
 *
 * Dependencias: html2canvas
 * Usado en: EstadisticasGlobales.jsx (sección "Desglose por Obra")
 */

// 3. Third party
import html2canvas from "html2canvas";

export const exportarElementoComoImagen = async (elemento, nombreArchivo = "captura.png") => {
  if (!elemento) throw new Error("Elemento no encontrado para exportar.");

  const canvas = await html2canvas(elemento, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
