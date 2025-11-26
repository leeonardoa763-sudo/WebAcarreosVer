/**
 * src/utils/conciliaciones/generarPDFConciliacionRenta.js
 *
 * Generación de PDF para conciliaciones de renta
 *
 * VERSIÓN ULTRA SIMPLE: Sin autoTable, solo texto y líneas
 *
 * Dependencias: jspdf
 * Usado en: BotonGenerarPDF.jsx
 */

// 1. Imports
import { jsPDF } from "jspdf";

/**
 * Generar PDF de conciliación de renta
 *
 * @param {Object} conciliacion - Datos completos de la conciliación
 * @param {Object} valesAgrupados - Vales agrupados por placas
 * @param {Object} totales - Totales generales
 */
export const generarPDFConciliacionRenta = (
  conciliacion,
  valesAgrupados,
  totales
) => {
  try {
    // Crear documento PDF (tamaño carta)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    let yPos = 20; // Posición Y inicial
    const marginLeft = 20;
    const pageHeight = 279; // Altura página carta
    const marginBottom = 20;

    // Función para agregar nueva página si es necesario
    const checkPageBreak = (neededSpace = 10) => {
      if (yPos + neededSpace > pageHeight - marginBottom) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // ========================================
    // ENCABEZADO
    // ========================================
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CONCILIACIÓN DE RENTA", 105, yPos, { align: "center" });
    yPos += 10;

    // Línea decorativa
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos, 195, yPos);
    yPos += 8;

    // ========================================
    // INFORMACIÓN GENERAL
    // ========================================
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.text(`Folio: ${conciliacion.folio}`, marginLeft, yPos);
    yPos += 6;

    doc.text(
      `Sindicato: ${conciliacion.sindicatos.nombre_completo}`,
      marginLeft,
      yPos
    );
    yPos += 6;

    doc.text(`Obra: ${conciliacion.obras.obra}`, marginLeft, yPos);
    yPos += 6;

    doc.text(
      `Semana: ${conciliacion.numero_semana} / ${conciliacion.año}`,
      marginLeft,
      yPos
    );
    yPos += 6;

    doc.text(
      `Periodo: ${conciliacion.fecha_inicio} al ${conciliacion.fecha_fin}`,
      marginLeft,
      yPos
    );
    yPos += 10;

    // ========================================
    // DESGLOSE POR VEHÍCULO
    // ========================================
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DESGLOSE POR VEHÍCULO", marginLeft, yPos);
    yPos += 8;

    // Iterar por cada grupo de placas
    Object.entries(valesAgrupados).forEach(([placas, grupo]) => {
      checkPageBreak(30);

      // Encabezado del grupo (placas)
      doc.setFillColor(230, 230, 230);
      doc.rect(marginLeft, yPos - 5, 175, 8, "F");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`VEHÍCULO: ${placas}`, marginLeft + 2, yPos);
      yPos += 10;

      // Encabezados de columnas
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Folio", marginLeft, yPos);
      doc.text("Fecha", marginLeft + 35, yPos);
      doc.text("Material", marginLeft + 60, yPos);
      doc.text("Días", marginLeft + 110, yPos);
      doc.text("Horas", marginLeft + 130, yPos);
      doc.text("Importe", marginLeft + 155, yPos);
      yPos += 5;

      // Línea separadora
      doc.setLineWidth(0.3);
      doc.line(marginLeft, yPos, 195, yPos);
      yPos += 5;

      // Iterar por cada vale del grupo
      doc.setFont("helvetica", "normal");
      grupo.vales.forEach((vale) => {
        vale.vale_renta_detalle.forEach((detalle) => {
          checkPageBreak(8);

          const fecha = vale.fecha_creacion.split("T")[0];
          const material = detalle.material?.material || "N/A";
          const dias = detalle.total_dias || 0;
          const horas = detalle.total_horas || 0;
          const costo = detalle.costo_total.toFixed(2);

          doc.text(vale.folio, marginLeft, yPos);
          doc.text(fecha, marginLeft + 35, yPos);
          doc.text(material.substring(0, 20), marginLeft + 60, yPos);
          doc.text(`${dias}`, marginLeft + 110, yPos);
          doc.text(`${horas}`, marginLeft + 130, yPos);
          doc.text(`$${costo}`, marginLeft + 155, yPos);
          yPos += 5;
        });
      });

      // Subtotal del grupo
      yPos += 2;
      doc.setFont("helvetica", "bold");
      doc.text(`Subtotal ${placas}:`, marginLeft + 110, yPos);
      doc.text(`$${grupo.subtotal.toFixed(2)}`, marginLeft + 155, yPos);
      yPos += 8;

      doc.setFont("helvetica", "normal");
    });

    // ========================================
    // RESUMEN DE TOTALES
    // ========================================
    checkPageBreak(40);

    yPos += 5;
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos, 195, yPos);
    yPos += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN", marginLeft, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Total días
    if (totales.totalDias > 0) {
      doc.text(`Total Días:`, marginLeft, yPos);
      doc.text(`${totales.totalDias}`, 190, yPos, { align: "right" });
      yPos += 6;
    }

    // Total horas
    if (totales.totalHoras > 0) {
      doc.text(`Total Horas:`, marginLeft, yPos);
      doc.text(`${totales.totalHoras}`, 190, yPos, { align: "right" });
      yPos += 6;
    }

    yPos += 4;

    // Subtotal
    doc.text(`Subtotal:`, marginLeft, yPos);
    doc.text(`$${totales.subtotal.toFixed(2)} MXN`, 190, yPos, {
      align: "right",
    });
    yPos += 6;

    // IVA
    doc.text(`IVA 16%:`, marginLeft, yPos);
    doc.text(`$${totales.iva.toFixed(2)} MXN`, 190, yPos, { align: "right" });
    yPos += 6;

    // Línea antes del total
    doc.setLineWidth(0.3);
    doc.line(marginLeft, yPos, 195, yPos);
    yPos += 6;

    // Total
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`TOTAL:`, marginLeft, yPos);
    doc.text(`$${totales.total.toFixed(2)} MXN`, 190, yPos, { align: "right" });

    // ========================================
    // PIE DE PÁGINA
    // ========================================
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Página ${i} de ${pageCount}`, 105, 270, { align: "center" });
      doc.text(`Generado: ${new Date().toLocaleString("es-MX")}`, 105, 275, {
        align: "center",
      });
    }

    // ========================================
    // DESCARGAR PDF
    // ========================================
    const nombreArchivo = `Conciliacion_${conciliacion.folio}.pdf`;
    doc.save(nombreArchivo);

    console.log("PDF generado exitosamente:", nombreArchivo);
  } catch (error) {
    console.error("Error al generar PDF:", error);
    throw error;
  }
};
