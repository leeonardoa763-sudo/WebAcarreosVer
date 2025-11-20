/**
 * src/utils/conciliaciones/generarPDFConciliacionRenta.js
 *
 * Genera PDF de conciliación con formato oficial
 */

import jsPDF from "jspdf";
import "jspdf-autotable";

export const generarPDFConciliacionRenta = (conciliacion, valesAgrupados) => {
  const doc = new jsPDF("portrait", "mm", "letter");
  let yPos = 20;

  // Formatear fecha
  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    const dia = date.getDate();
    const mes = date.toLocaleDateString("es-MX", { month: "long" });
    const año = date.getFullYear();
    return `${dia} de ${mes} de ${año}`;
  };

  const formatearFechaCorta = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  };

  // Header - Nombre del sindicato
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(conciliacion.sindicatos.nombre_completo.toUpperCase(), 105, yPos, {
    align: "center",
  });
  yPos += 8;

  // Título
  doc.setFontSize(14);
  doc.text("REPORTE DE CONCILIACION", 105, yPos, { align: "center" });
  yPos += 10;

  // Info general
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Empresa: ${conciliacion.empresas.empresa}`, 20, yPos);
  yPos += 5;
  doc.text(`Obra: ${conciliacion.obras.obra}`, 20, yPos);
  yPos += 5;
  doc.text(
    `Periodo: ${formatearFechaCorta(conciliacion.fecha_inicio)} - ${formatearFechaCorta(conciliacion.fecha_fin)}`,
    20,
    yPos
  );
  yPos += 5;
  doc.text(
    `Fecha de generación: ${formatearFecha(conciliacion.fecha_generacion)}`,
    20,
    yPos
  );
  yPos += 10;

  // Preparar datos de la tabla
  const tableData = [];
  Object.values(valesAgrupados).forEach((grupo) => {
    grupo.vales.forEach((vale) => {
      vale.vale_renta_detalle.forEach((detalle) => {
        tableData.push([
          formatearFechaCorta(vale.fecha_creacion),
          grupo.placas,
          vale.folio,
          detalle.material?.material || "N/A",
          detalle.capacidad_m3 || 0,
          detalle.numero_viajes || 0,
          detalle.total_dias || 0,
          detalle.total_horas || 0,
        ]);
      });
    });
  });

  // Tabla principal
  doc.autoTable({
    startY: yPos,
    head: [
      ["FECHA", "PLACAS", "FOLIO", "MATERIAL", "CAP", "VIAJES", "DIAS", "HRS"],
    ],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 22 },
      2: { cellWidth: 28 },
      3: { cellWidth: 45 },
      4: { cellWidth: 15, halign: "center" },
      5: { cellWidth: 18, halign: "center" },
      6: { cellWidth: 15, halign: "center" },
      7: { cellWidth: 15, halign: "center" },
    },
    margin: { left: 20, right: 20 },
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Totales
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  const totales = conciliacion.totalesGenerales || {
    totalDias: 0,
    totalHoras: 0,
  };

  if (totalesGenerales.totalDias > 0) {
    doc.text(`TOTAL TURNOS: ${totalesGenerales.totalDias}`, 20, yPos);
    yPos += 5;
  }

  if (totalesGenerales.totalHoras > 0) {
    doc.text(`TOTAL HORAS: ${totalesGenerales.totalHoras}`, 20, yPos);
    yPos += 5;
  }

  yPos += 5;
  doc.text(
    `SUBTOTAL: $${conciliacion.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
    20,
    yPos
  );
  yPos += 5;
  doc.text(
    `IVA 16%: $${conciliacion.iva_16_porciento.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
    20,
    yPos
  );
  yPos += 5;
  doc.setFontSize(12);
  doc.text(
    `TOTAL: $${conciliacion.total_final.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
    20,
    yPos
  );
  yPos += 15;

  // Firmas
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const firmaY = yPos + 20;

  // Línea sindicato
  doc.line(30, firmaY, 90, firmaY);
  doc.text("SINDICATO", 60, firmaY + 5, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(
    conciliacion.nombre_firma_sindicato ||
      conciliacion.sindicatos.nombre_firma_conciliacion,
    60,
    firmaY + 10,
    { align: "center" }
  );

  // Línea empresa
  doc.setFont("helvetica", "normal");
  doc.line(125, firmaY, 185, firmaY);
  doc.text("EMPRESA", 155, firmaY + 5, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text("ING. BRUNO LEONARDO AGUILAR SAUCEDO", 155, firmaY + 10, {
    align: "center",
  });

  // Folio en footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(`Folio: ${conciliacion.folio}`, 105, 270, { align: "center" });

  // Descargar
  doc.save(`Conciliacion_${conciliacion.folio}.pdf`);
};
