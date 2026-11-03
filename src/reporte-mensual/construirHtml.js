/**
 * src/reporte-mensual/construirHtml.js
 *
 * Une plantilla + comun.js + datos en UN solo HTML autocontenido: es lo que
 * se ve en ReporteMensual.jsx (iframe) y lo mismo que se descarga, para que
 * el archivo abra con doble clic sin servidor ni archivos aparte. Sin
 * internet solo cambian las fuentes (Fraunces / IBM Plex caen a Georgia /
 * Segoe UI); todo lo demás funciona igual.
 */

import plantilla from "./plantilla.html?raw";
import comun from "./comun.js?raw";

// `<` escapado: una nota del residente con "</script>" no debe cerrar la etiqueta.
const datosJs = (reporte) => `window.REPORTE = ${JSON.stringify(reporte).replace(/</g, "\\u003c")};`;

// Reemplazo con función: el código trae `$` que String.replace interpretaría.
export const construirHtml = (reporte) =>
  plantilla.replace("/*DATOS*/", () => datosJs(reporte)).replace("/*COMUN*/", () => comun);

export const descargarHtml = (html, nombre) => {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
