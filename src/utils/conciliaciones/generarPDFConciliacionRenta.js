/**
 * src/utils/conciliaciones/generarPDFConciliacionRenta.js
 *
 * Generación de PDF para conciliaciones de renta
 *
 * Dependencias: jspdf
 * Usado en: BotonGenerarPDF.jsx
 */

// 1. Imports
import { jsPDF } from "jspdf";

export const generarPDFConciliacionRenta = (
  conciliacion,
  valesAgrupados,
  totales
) => {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    let yPos = 12;
    const marginLeft = 15;
    const marginRight = 200;
    const pageHeight = 279;
    const marginBottom = 20;

    // Función para formatear números con separador de miles
    const formatearMoneda = (numero) => {
      return numero.toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    // Función para formatear fecha a dd/mm/yyyy
    const formatearFecha = (fechaISO) => {
      const fecha = new Date(fechaISO + "T00:00:00");
      const dia = String(fecha.getDate()).padStart(2, "0");
      const mes = String(fecha.getMonth() + 1).padStart(2, "0");
      const año = fecha.getFullYear();
      return `${dia}/${mes}/${año}`;
    };

    // Función mejorada para verificar salto de página
    const checkPageBreak = (neededSpace = 15) => {
      if (yPos + neededSpace > pageHeight - marginBottom) {
        doc.addPage();
        yPos = 12;
        return true;
      }
      return false;
    };

    // ========================================
    // ENCABEZADO
    // ========================================
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CONCILIACIÓN DE RENTA", 108, yPos, { align: "center" });
    yPos += 6;

    // Línea decorativa
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos, marginRight, yPos);
    yPos += 7;

    // ========================================
    // INFORMACIÓN GENERAL
    // ========================================
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

    // ========================================
    // TABLA DE DESGLOSE
    // ========================================
    checkPageBreak(30);

    // Encabezados de tabla
    doc.setFillColor(230, 230, 230);
    doc.rect(marginLeft, yPos - 3.5, 185, 7, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");

    const cols = {
      placas: marginLeft + 2,
      folio: marginLeft + 22,
      fecha: marginLeft + 42,
      material: marginLeft + 62,
      viajes: marginLeft + 105,
      dias: marginLeft + 120,
      horas: marginLeft + 135,
      importe: marginRight - 2,
    };

    doc.text("Placas", cols.placas, yPos);
    doc.text("Folio Vale", cols.folio, yPos);
    doc.text("Fecha", cols.fecha, yPos);
    doc.text("Material", cols.material, yPos);
    doc.text("Viajes", cols.viajes, yPos, { align: "center" });
    doc.text("Días", cols.dias, yPos, { align: "center" });
    doc.text("Horas", cols.horas, yPos, { align: "center" });
    doc.text("Importe", cols.importe, yPos, { align: "right" });

    yPos += 7;

    // Iteración de datos
    Object.entries(valesAgrupados).forEach(([placas, grupo]) => {
      checkPageBreak(20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      grupo.vales.forEach((vale) => {
        vale.vale_renta_detalle.forEach((detalle) => {
          checkPageBreak(6);

          const fecha = formatearFecha(vale.fecha_creacion.split("T")[0]);
          const material = detalle.material?.material || "N/A";
          const costo = formatearMoneda(detalle.costo_total);

          doc.text(placas, cols.placas, yPos);
          doc.text(vale.folio, cols.folio, yPos);
          doc.text(fecha, cols.fecha, yPos);
          doc.text(material.substring(0, 25), cols.material, yPos);
          doc.text(`${detalle.numero_viajes || 0}`, cols.viajes, yPos, {
            align: "center",
          });
          doc.text(`${detalle.total_dias || 0}`, cols.dias, yPos, {
            align: "center",
          });
          doc.text(`${detalle.total_horas || 0}`, cols.horas, yPos, {
            align: "center",
          });
          doc.text(`$${costo}`, cols.importe, yPos, { align: "right" });

          yPos += 5;
        });
      });

      // Subtotal del grupo
      checkPageBreak(6);
      doc.setFont("helvetica", "bold");
      doc.text(`$${formatearMoneda(grupo.subtotal)}`, cols.importe, yPos, {
        align: "right",
      });

      yPos += 6;
    });

    // ========================================
    // RESUMEN Y TOTALES
    // ========================================
    checkPageBreak(30);

    yPos += 2;
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos, marginRight, yPos);
    yPos += 6;

    const labelResumenX = 155;
    const valueResumenX = marginRight - 2;
    const rowHeight = 4;

    doc.setFontSize(8);

    // Días y Horas
    if (totales.totalDias > 0) {
      doc.setFont("helvetica", "normal");
      doc.text("Total Días:", labelResumenX, yPos, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(`${totales.totalDias}`, valueResumenX, yPos, { align: "right" });
      yPos += rowHeight;
    }

    if (totales.totalHoras > 0) {
      doc.setFont("helvetica", "normal");
      doc.text("Total Horas:", labelResumenX, yPos, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(`${totales.totalHoras}`, valueResumenX, yPos, {
        align: "right",
      });
      yPos += rowHeight;
    }

    yPos += 1.5;

    // Subtotal
    doc.setFont("helvetica", "bold");
    doc.text("Subtotal:", labelResumenX, yPos, { align: "right" });
    doc.text(`$${formatearMoneda(totales.subtotal)}`, valueResumenX, yPos, {
      align: "right",
    });
    yPos += rowHeight;

    // IVA
    doc.setFont("helvetica", "normal");
    doc.text("IVA 16%:", labelResumenX, yPos, { align: "right" });
    doc.text(`$${formatearMoneda(totales.iva)}`, valueResumenX, yPos, {
      align: "right",
    });
    yPos += rowHeight;

    // Total Final
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", labelResumenX, yPos, { align: "right" });
    doc.text(`$${formatearMoneda(totales.total)} MXN`, valueResumenX, yPos, {
      align: "right",
    });

    yPos += 18;

    // ========================================
    // FIRMAS
    // ========================================
    checkPageBreak(40);

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

    // ========================================
    // PIE DE PÁGINA
    // ========================================
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

    const nombreArchivo = `Conciliacion_${conciliacion.folio}.pdf`;
    doc.save(nombreArchivo);
  } catch (error) {
    console.error("Error al generar PDF:", error);
    throw error;
  }
};
