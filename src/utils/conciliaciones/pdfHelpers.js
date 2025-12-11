/**
 * src/utils/conciliaciones/pdfHelpers.js
 *
 * Funciones compartidas para generación de PDFs de conciliaciones
 *
 * Funcionalidades:
 * - Formateo de números, fechas y monedas
 * - Verificación de saltos de página
 * - Generación de encabezados y firmas
 *
 * Usado en: generarPDFConciliacionMaterialPetreo.js, generarPDFConciliacionMaterialCorte.js
 */

/**
 * Formatear números con separador de miles
 */
export const formatearMoneda = (numero) => {
  return numero.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formatear volumen
 */
export const formatearVolumen = (numero) => {
  return numero.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formatear fecha a dd/mm/yyyy
 */
export const formatearFecha = (fechaISO) => {
  const fecha = new Date(fechaISO + "T00:00:00");
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const año = fecha.getFullYear();
  return `${dia}/${mes}/${año}`;
};

/**
 * Verificar si necesita salto de página
 */
export const checkPageBreak = (
  doc,
  yPos,
  neededSpace,
  pageHeight,
  marginBottom
) => {
  if (yPos + neededSpace > pageHeight - marginBottom) {
    doc.addPage();
    return 12; // Nueva yPos
  }
  return yPos;
};

/**
 * Generar encabezado del PDF
 */
export const generarEncabezado = (
  doc,
  conciliacion,
  yPos,
  marginLeft,
  marginRight
) => {
  // Título principal
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("CONCILIACIÓN DE MATERIAL", 108, yPos, { align: "center" });
  yPos += 6;

  // Línea decorativa
  doc.setLineWidth(0.5);
  doc.line(marginLeft, yPos, marginRight, yPos);
  yPos += 7;

  // Información general
  const labelX = 70;
  const valueX = 100;
  const lineHeight = 5;

  doc.setFontSize(9);

  doc.setFont("helvetica", "bold");
  doc.text(`Folio:`, labelX, yPos, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(conciliacion.folio, valueX, yPos);
  yPos += lineHeight;

  doc.setFont("helvetica", "bold");
  doc.text(`Empresa:`, labelX, yPos, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(conciliacion.empresas.empresa, valueX, yPos);
  yPos += lineHeight;

  doc.setFont("helvetica", "bold");
  doc.text(`Sindicato:`, labelX, yPos, { align: "right" });
  doc.setFont("helvetica", "normal");
  const nombreSindicato =
    conciliacion.sindicatos.nombre_completo.length > 45
      ? conciliacion.sindicatos.nombre_completo.substring(0, 45) + "..."
      : conciliacion.sindicatos.nombre_completo;
  doc.text(nombreSindicato, valueX, yPos);
  yPos += lineHeight;

  doc.setFont("helvetica", "bold");
  doc.text(`Obra:`, labelX, yPos, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(conciliacion.obras.obra, valueX, yPos);
  yPos += lineHeight;

  doc.setFont("helvetica", "bold");
  doc.text(`Semana / Periodo:`, labelX, yPos, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(
    `${conciliacion.numero_semana} (${formatearFecha(conciliacion.fecha_inicio)} al ${formatearFecha(conciliacion.fecha_fin)})`,
    valueX,
    yPos
  );
  yPos += 9;

  return yPos;
};

/**
 * Generar sección de firmas
 */
export const generarFirmas = (
  doc,
  conciliacion,
  yPos,
  marginLeft,
  marginRight
) => {
  const firmaY = yPos;

  // Líneas de firma
  doc.setLineWidth(0.3);
  doc.line(marginLeft + 10, firmaY, marginLeft + 80, firmaY);
  doc.line(marginRight - 80, firmaY, marginRight - 10, firmaY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");

  // Textos de firma
  doc.text("FIRMA DEL SINDICATO", marginLeft + 45, firmaY + 5, {
    align: "center",
  });
  doc.text("FIRMA DE AUTORIZACIÓN", marginRight - 45, firmaY + 5, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  const firmante =
    conciliacion.sindicatos.nombre_firma_conciliacion ||
    conciliacion.sindicatos.nombre_completo;
  doc.text(firmante.substring(0, 40), marginLeft + 45, firmaY + 10, {
    align: "center",
  });

  doc.text(
    "Ing. Bruno Leonardo Aguilar Saucedo",
    marginRight - 45,
    firmaY + 10,
    {
      align: "center",
    }
  );

  return firmaY + 15;
};

/**
 * Generar pie de página con numeración
 */
export const generarPieDePagina = (doc, conciliacion) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(128);
    doc.text(
      `Página ${i} de ${pageCount} - Generado: ${new Date().toLocaleString("es-MX")}`,
      108,
      272,
      { align: "center" }
    );
  }
};
