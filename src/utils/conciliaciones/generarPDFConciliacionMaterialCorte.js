/**
 * src/utils/conciliaciones/generarPDFConciliacionMaterialCorte.js
 *
 * Generación de PDF para conciliaciones de producto de corte (Tipo 3)
 *
 * Características:
 * - Columnas: Material, Distancia, Viajes, Capacidad, M³ Pedidos
 * - SIN Folio Banco, Banco, Toneladas
 * - Retención 4%
 *
 * Usado en: BotonGenerarPDF.jsx
 */

import { jsPDF } from "jspdf";
import {
  formatearMoneda,
  formatearVolumen,
  formatearFecha,
  checkPageBreak,
  generarEncabezado,
  generarFirmas,
  generarPieDePagina,
} from "./pdfHelpers";

export const generarPDFConciliacionMaterialCorte = (
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

    // ========================================
    // ENCABEZADO
    // ========================================
    yPos = generarEncabezado(doc, conciliacion, yPos, marginLeft, marginRight);

    // ========================================
    // TABLA DE DESGLOSE
    // ========================================
    yPos = checkPageBreak(doc, yPos, 30, pageHeight, marginBottom);

    // Definir columnas para Producto de Corte
    const cols = {
      fecha: marginLeft + 2,
      folio: marginLeft + 20,
      material: marginLeft + 40,
      distancia: marginLeft + 85,
      viajes: marginLeft + 110,
      capacidad: marginLeft + 132,
      m3Pedidos: marginLeft + 160,
      importe: marginRight - 2,
    };

    // Encabezados de tabla
    doc.setFillColor(230, 230, 230);
    doc.rect(marginLeft, yPos - 3.5, 185, 7, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");

    doc.text("Fecha", cols.fecha, yPos);
    doc.text("Folio", cols.folio, yPos);
    doc.text("Material", cols.material, yPos);
    doc.text("Dist", cols.distancia, yPos);
    doc.text("Viaj", cols.viajes, yPos, { align: "center" });
    doc.text("Cap", cols.capacidad, yPos, { align: "center" });
    doc.text("M³Ped", cols.m3Pedidos, yPos, { align: "center" });
    doc.text("Importe", cols.importe, yPos, { align: "right" });

    yPos += 7;

    // ========================================
    // ITERACIÓN DE DATOS POR PLACAS
    // ========================================
    Object.entries(valesAgrupados).forEach(([placas, grupo]) => {
      yPos = checkPageBreak(doc, yPos, 15, pageHeight, marginBottom);

      // Encabezado de grupo
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`Placas: ${placas}`, marginLeft + 2, yPos);
      yPos += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);

      grupo.vales.forEach((vale) => {
        vale.vale_material_detalles.forEach((detalle) => {
          const idTipo =
            detalle.material?.tipo_de_material?.id_tipo_de_material;

          // Solo procesar Tipo 3
          if (idTipo === 3) {
            yPos = checkPageBreak(doc, yPos, 6, pageHeight, marginBottom);

            const fecha = formatearFecha(vale.fecha_creacion.split("T")[0]);
            const material = detalle.material?.material || "N/A";
            const costo = formatearMoneda(detalle.costo_total);

            doc.text(fecha, cols.fecha, yPos);
            doc.text(vale.folio, cols.folio, yPos);
            doc.text(material.substring(0, 20), cols.material, yPos);
            doc.text(
              `${formatearVolumen(detalle.distancia_km)}`,
              cols.distancia,
              yPos,
              { align: "right" }
            );
            doc.text("1", cols.viajes, yPos, { align: "center" });
            doc.text(
              `${formatearVolumen(detalle.capacidad_m3)}`,
              cols.capacidad,
              yPos,
              { align: "right" }
            );
            doc.text(
              `${formatearVolumen(detalle.cantidad_pedida_m3)}`,
              cols.m3Pedidos,
              yPos,
              { align: "right" }
            );
            doc.text(`$${costo}`, cols.importe, yPos, { align: "right" });

            yPos += 5;
          }
        });
      });

      // Subtotal del grupo
      yPos = checkPageBreak(doc, yPos, 6, pageHeight, marginBottom);
      doc.setFont("helvetica", "bold");
      doc.text(`Subtotal ${placas}:`, marginLeft + 2, yPos);
      doc.text(`$${formatearMoneda(grupo.subtotal)}`, cols.importe, yPos, {
        align: "right",
      });

      yPos += 8;
    });

    // ========================================
    // RESUMEN Y TOTALES
    // ========================================
    yPos = checkPageBreak(doc, yPos, 40, pageHeight, marginBottom);

    yPos += 2;
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos, marginRight, yPos);
    yPos += 7;

    const labelResumenX = 155;
    const valueResumenX = marginRight - 2;
    const rowHeight = 4.5;

    doc.setFontSize(8);

    // Totales Tipo 3
    if (totales.totalViajesTipo3 > 0) {
      doc.setFont("helvetica", "normal");
      doc.text("Total Viajes:", labelResumenX, yPos, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(`${totales.totalViajesTipo3}`, valueResumenX, yPos, {
        align: "right",
      });
      yPos += rowHeight;

      doc.setFont("helvetica", "normal");
      doc.text("Total m³ Pedidos:", labelResumenX, yPos, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(
        `${formatearVolumen(totales.totalM3Tipo3)}`,
        valueResumenX,
        yPos,
        { align: "right" }
      );
      yPos += rowHeight;
    }

    yPos += 2;

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

    // Retención
    doc.text("Retención 4%:", labelResumenX, yPos, { align: "right" });
    doc.text(`-$${formatearMoneda(totales.retencion)}`, valueResumenX, yPos, {
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
    yPos = checkPageBreak(doc, yPos, 40, pageHeight, marginBottom);
    yPos = generarFirmas(doc, conciliacion, yPos, marginLeft, marginRight);

    // ========================================
    // PIE DE PÁGINA
    // ========================================
    generarPieDePagina(doc, conciliacion);

    const nombreArchivo = `Conciliacion_MAT_CORTE_${conciliacion.folio}.pdf`;
    doc.save(nombreArchivo);
  } catch (error) {
    console.error("Error al generar PDF de Producto de Corte:", error);
    throw error;
  }
};
