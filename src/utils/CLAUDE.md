# utils/

12 archivos de utilidades generales + subdirectorio `conciliaciones/` para generadores de PDF especializados.

## Archivos raíz

| Archivo | Exporta | Propósito |
|---------|---------|-----------|
| `dateUtils.js` | `calcularSemanaISO(fecha)` | Semana ISO 8601: número, año, fechaInicio (lunes), fechaFin (domingo) |
| `formatters.js` | `formatearFecha`, `formatearFechaCorta`, `formatearHora`, `formatearFechaHora`, `formatearMoneda`, `formatearVolumen`, `formatearPeso`, `formatearDistancia`, `getBadgeEstado`, `getBadgeTipo`, `getNombreCompleto` | Formateo para display en UI |
| `pdfExtractor.js` | `extractTextFromPDF`, `extractFolioFromPDF`, `convertPDFToImage(file, scale)` | OCR con pdfjs-dist |
| `qrDecoder.js` | `decodeQRFromCanvas`, `extractFolioFromQRData` | Decodificar QR con jsQR |
| `exportToExcel.js` | `exportToExcel(data, fileName, sheetName, opciones)` | Exportar array de objetos planos a `.xlsx`. `opciones = { formatos, autoFiltro }` |
| `excelFechas.js` | `fechaExcel`, `fechaHoraExcel`, `horaExcel`, `FMT_FECHA`, `FMT_FECHA_HORA`, `FMT_HORA` | Fechas/horas como número de serie de Excel (hora de México) |
| `exportarValesExcel.js` | `exportarValesExcel(vales, fileName)`, `construirHojasVales(vales)` | Export de la pestaña Vales, **normalizado en 6 hojas** unidas por folio |
| `pdfPublicGenerator.js` | `generarPDFMaterialPublico`, `generarPDFRentaPublico` | PDF para vista pública `/vale/:folio` con marca de agua |
| `exportConciliacionesDashboard.js` | `exportarConciliacionesDashboard(conciliaciones, tipo, cb)` | Carga vales bajo demanda y genera Excel de conciliaciones |
| `exportarReporteEstadisticas.js` | `generarPDFReporteEstadisticas(datos)` | PDF de Estadísticas Globales (jsPDF imperativo) |
| `exportarReporteDiario.js` | `generarPDFReporteDiario(datos)` | PDF del Reporte Diario: KPIs de un día, comparativa vs. día anterior, desglose por material y por renta (agrupado por obra, con CC), eficiencia y alertas de presupuesto (jsPDF imperativo) |
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

**exportToExcel.js:** Calcula ancho de columnas automáticamente. Solo acepta un array de objetos planos (sin anidamiento). `opciones.formatos` es un mapa `{ "Nombre de columna": "dd/mm/yyyy" }` que aplica `numFmt` a esa columna — el valor debe llegar ya como número; `z` solo cambia cómo se muestra. `exportMultipleSheetsToExcel` acepta lo mismo por hoja (`{ name, data, formatos, autoFiltro }`) y omite las hojas sin datos.

**excelFechas.js:** Una cadena `"2026-08-20"` llega a Excel como **texto** y no se puede ordenar ni filtrar como fecha. Por eso las fechas se exportan como número de serie (días desde 1899-12-30) y se formatean con `FMT_FECHA`. Los `timestamptz` se desglosan en hora de `America/Mexico_City` antes de convertirse: un viaje de las 19:20 del día 20 en México es `01:20Z` del día 21, y sin la conversión caería en el día equivocado.

**exportarValesExcel.js:** Un libro con una hoja por nivel de detalle, unidas por `Folio`:

| Hoja | Grano | Llave |
|---|---|---|
| `Vales` | 1 fila por vale | `Folio` |
| `Material` | 1 fila por `vale_material_detalles` | `Folio` + `Detalle` |
| `Renta` | 1 fila por `vale_renta_detalle` | `Folio` |
| `Viajes material` | 1 fila por viaje | `Folio` + `Detalle` |
| `Viajes renta` | 1 fila por viaje | `Folio` |
| `Desverificaciones` | 1 fila por solicitud | `Folio` |

Una sola hoja obligaba a repetir los datos del vale en cada viaje y a dejar en blanco lo que no aplica (columnas de renta en filas de material y viceversa, totales del vale en todas menos la primera). Las hojas vacías se omiten del libro.

- **`vale_material_viajes` manda siempre, en los tres tipos** (ver CLAUDE.md raíz, "Tipos de material"). `tickets_material` solo arma filas cuando un vale de corte tiene tickets impresos pero ningún viaje registrado. Ramificar por tipo aquí fue un error real: mandaba las filas del Tipo 3 por los tickets y perdía el override de banco por viaje, reportando el banco con el que se creó el vale.
- **Banco, distancia, precio y costo salen del viaje** (`getBancoViaje` y los `*_override ?? detalle.*`). La columna `Cambio de banco` marca los viajes con override.
- **Tres folios distintos, tres columnas:** `Remisión` = `folio_vale_fisico` (la remisión física del banco); `Folio banco` = `folio_banco` del detalle; `Ticket` = `folio_ticket` del ticket impreso, cruzado por `numero_ticket = numero_viaje`.
- **Cada hoja suma por su cuenta el total del vale.** El importe de `Vales`, el de `Material`+`Renta` y el de `Viajes material` dan la misma cifra porque la app acumula `costo_viaje_override ?? costo_viaje` en `vale_material_detalles.costo_total` (`useViajesMaterial.js`). Las excepciones son las que no tienen medición por viaje: renta (el importe es del vale), corte sin viajes registrados y viajes sin cantidad capturada.
- **Las notas y motivos van en la tabla que los guarda:** `notas_adicionales` + `foto_omitida`/`motivo_sin_foto_*` en `Material` y `Renta`; los motivos por viaje (`registro_anticipado`, `motivo_anticipado_*`, `motivo_sin_foto_*`) en `Viajes material`; `motivo_cancelacion` en `Vales`; los motivos de solicitud y respuesta en `Desverificaciones`. Los códigos se traducen con `motivoLegibleDe` de `excepcionesVale.js` — no duplicar el catálogo aquí.
- **El Tipo 2 sí emite fila de viaje** (una, con los datos del detalle) para que `Viajes material` sea el ledger completo de viajes y `Viajes registrados` de la hoja `Vales` cuadre con él. Es el único caso donde una fila de viaje repite valores del detalle: ahí el detalle *es* el viaje.

**Dos motores de PDF:** Renta usa jsPDF (imperativo), Material usa @react-pdf/renderer (declarativo con JSX). No mezclar sin justificación.
