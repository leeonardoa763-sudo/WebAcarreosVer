# utils/

10 archivos de utilidades generales + subdirectorio `conciliaciones/` para generadores de PDF especializados.

## Archivos raíz

| Archivo | Exporta | Propósito |
|---------|---------|-----------|
| `dateUtils.js` | `calcularSemanaISO(fecha)` | Semana ISO 8601: número, año, fechaInicio (lunes), fechaFin (domingo) |
| `formatters.js` | `formatearFecha`, `formatearFechaCorta`, `formatearHora`, `formatearFechaHora`, `formatearMoneda`, `formatearVolumen`, `formatearPeso`, `formatearDistancia`, `getBadgeEstado`, `getBadgeTipo`, `getNombreCompleto` | Formateo para display en UI |
| `pdfExtractor.js` | `extractTextFromPDF`, `extractFolioFromPDF`, `convertPDFToImage(file, scale)` | OCR con pdfjs-dist |
| `qrDecoder.js` | `decodeQRFromCanvas`, `extractFolioFromQRData` | Decodificar QR con jsQR |
| `exportToExcel.js` | `exportToExcel(data, fileName, sheetName)` | Exportar array de objetos planos a `.xlsx` |
| `pdfPublicGenerator.js` | `generarPDFMaterialPublico`, `generarPDFRentaPublico` | PDF para vista pública `/vale/:folio` con marca de agua |
| `exportConciliacionesDashboard.js` | `exportarConciliacionesDashboard(conciliaciones, tipo, cb)` | Carga vales bajo demanda y genera Excel de conciliaciones |
| `exportarReporteEstadisticas.js` | `generarPDFReporteEstadisticas(datos)` | PDF de Estadísticas Globales (jsPDF imperativo) |
| `exportarImagen.js` | `exportarElementoComoImagen(elemento, nombreArchivo)` | Captura un nodo DOM como PNG descargable (html2canvas) |

## conciliaciones/ — generadores de PDF

| Archivo | Motor | Propósito |
|---------|-------|-----------|
| `pdfHelpers.js` | — | Helpers compartidos: `formatearMoneda`, `checkPageBreak` |
| `calcularTotalesPorBanco.js` | — | Desglosa m³, toneladas, PU y peso específico por banco para Material Pétreo (Tipo 1/2) — usado en el PDF y en `VisualizarConciliacion.jsx` |
| `generarPDFConciliacionRenta.js` | **jsPDF** | PDF de conciliación de renta |
| `generarPDFConciliacionMaterialPetreo.js` | **@react-pdf/renderer** | PDF material Tipo 1 y 2 |
| `generarPDFConciliacionMaterialCorte.js` | **@react-pdf/renderer** | PDF material Tipo 3 (corte/tepetate) |
| `shared/styles/sharedStyles.js` | @react-pdf/renderer | StyleSheet compartido entre PDFs de material |

## Gotchas importantes

**dateUtils.js:** El domingo es la última jornada de la semana **anterior** (ISO 8601 estricto). Las semanas van de lunes a domingo.

**pdfExtractor.js:** Regex de folio: `/[A-Z]{2,3}-\d{3}-\d{5}/`. `convertPDFToImage(file, scale)` recibe escala como parámetro (default `2.0`). Si el QR no decodifica a 2x, `useVerificacion.js` llama nuevamente con `3.0`.

**qrDecoder.js:** Siempre usa `inversionAttempts: "attemptBoth"` — intenta imagen normal e invertida automáticamente para QRs con bajo contraste o fondo de color.

**pdfPublicGenerator.js:** Imprime marca de agua roja **"COPIA DE VERIFICACIÓN WEB"** en diagonal. No confundir con los generadores de conciliación.

**exportToExcel.js:** Calcula ancho de columnas automáticamente + headers en negrita con fondo. Solo acepta un array de objetos planos (sin anidamiento).

**Dos motores de PDF:** Renta usa jsPDF (imperativo), Material usa @react-pdf/renderer (declarativo con JSX). No mezclar sin justificación.
