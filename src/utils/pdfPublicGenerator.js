/**
 * src/utils/pdfPublicGenerator.js
 *
 * Generación de PDFs para vales públicos (desde verificación web)
 *
 * DIFERENCIAS CON APP MÓVIL:
 * - Usa jsPDF en lugar de expo-print
 * - Agrega marca de agua "COPIA DE VERIFICACIÓN WEB"
 * - Acceso público (sin autenticación)
 *
 * Usado en: VerificarVale.jsx
 */

// 1. jsPDF
import { jsPDF } from "jspdf";

// 2. Utils
import {
  formatearFecha,
  formatearFechaCorta,
  formatearHora,
  formatearMoneda,
} from "./formatters";

/**
 * Generar PDF de vale de MATERIAL con marca de agua
 */
export const generarPDFMaterialPublico = (valeData) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 170], // Ancho 80mm (ticket), largo 297mm (A4)
  });

  let yPos = 6;
  const marginLeft = 5;
  const pageWidth = 80;
  const centerX = pageWidth / 2;

  // ========================================
  // MARCA DE AGUA
  // ========================================
  doc.setTextColor(220, 53, 69); // Rojo
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("COPIA DE VERIFICACIÓN WEB", centerX, yPos, { align: "center" });
  yPos += 5;
  doc.setTextColor(0); // Reset a negro

  // ========================================
  // LOGO Y HEADER
  // ========================================
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(valeData.obras?.empresas?.empresa || "EMPRESA", centerX, yPos, {
    align: "center",
  });
  yPos += 5;

  doc.setFontSize(10);
  doc.text("VALE DE MATERIAL - ACARREO", centerX, yPos, { align: "center" });
  yPos += 7;

  // Línea divisoria
  doc.setLineWidth(0.3);
  doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
  yPos += 5;

  // ========================================
  // DATOS PRINCIPALES
  // ========================================
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");

  doc.text("Folio:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(valeData.folio, marginLeft + 20, yPos);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(formatearFechaCorta(valeData.fecha_creacion), marginLeft + 20, yPos);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Hora:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(formatearHora(valeData.fecha_creacion), marginLeft + 20, yPos);
  yPos += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Obra:", marginLeft, yPos);
  yPos += 3;
  doc.setFont("helvetica", "normal");
  const obraText = doc.splitTextToSize(
    valeData.obras?.obra || "N/A",
    pageWidth - marginLeft * 2
  );
  doc.text(obraText, marginLeft, yPos);
  yPos += obraText.length * 3 + 2;

  const detalle = valeData.vale_material_detalles?.[0] || {};

  doc.setFont("helvetica", "bold");
  doc.text("Banco:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(detalle.bancos?.banco || "N/A", marginLeft + 20, yPos);
  yPos += 5;

  // Línea divisoria
  doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
  yPos += 5;

  // ========================================
  // DATOS DE VALE
  // ========================================
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DE VALE", centerX, yPos, { align: "center" });
  yPos += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Material:", marginLeft, yPos);
  yPos += 3;
  doc.setFont("helvetica", "normal");
  const materialText = doc.splitTextToSize(
    detalle.material?.material || "N/A",
    pageWidth - marginLeft * 2
  );
  doc.text(materialText, marginLeft, yPos);
  yPos += materialText.length * 3 + 2;

  doc.setFont("helvetica", "bold");
  doc.text("Capacidad:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${detalle.capacidad_m3 || "N/A"} m³`, marginLeft + 25, yPos);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Distancia:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${detalle.distancia_km || "N/A"} Km`, marginLeft + 25, yPos);
  yPos += 5;

  doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Cantidad Pedida:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${detalle.cantidad_pedida_m3 || "N/A"} m³`, marginLeft + 30, yPos);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Requisición:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(detalle.requisicion || "N/A", marginLeft + 30, yPos);
  yPos += 4;

  if (detalle.folio_banco) {
    doc.setFont("helvetica", "bold");
    doc.text("Folio Banco:", marginLeft, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(detalle.folio_banco, marginLeft + 25, yPos);
    yPos += 4;
  }

  if (detalle.peso_ton) {
    doc.setFont("helvetica", "bold");
    doc.text("Peso:", marginLeft, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${detalle.peso_ton} Ton`, marginLeft + 25, yPos);
    yPos += 4;
  }

  if (detalle.volumen_real_m3) {
    doc.setFont("helvetica", "bold");
    doc.text("Volumen Real:", marginLeft, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${detalle.volumen_real_m3} m³`, marginLeft + 25, yPos);
    yPos += 4;
  }

  // ========================================
  // PRECIOS (si existen)
  // ========================================
  if (detalle.costo_total) {
    yPos += 1;
    doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
    yPos += 4;

    if (detalle.tarifa_primer_km) {
      doc.setFont("helvetica", "bold");
      doc.text("Tarifa 1er Km:", marginLeft, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(
        formatearMoneda(detalle.tarifa_primer_km),
        marginLeft + 30,
        yPos
      );
      yPos += 4;
    }

    if (detalle.tarifa_subsecuente) {
      doc.setFont("helvetica", "bold");
      doc.text("Tarifa Sub.:", marginLeft, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${formatearMoneda(detalle.tarifa_subsecuente)}/km`,
        marginLeft + 30,
        yPos
      );
      yPos += 4;
    }

    if (detalle.precio_m3) {
      doc.setFont("helvetica", "bold");
      doc.text("Precio/m³:", marginLeft, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(formatearMoneda(detalle.precio_m3), marginLeft + 30, yPos);
      yPos += 4;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Costo Total:", marginLeft, yPos);
    doc.text(
      formatearMoneda(detalle.costo_total) + " MXN",
      marginLeft + 30,
      yPos
    );
    yPos += 5;
  }

  // ========================================
  // DATOS GENERALES
  // ========================================
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS GENERALES", centerX, yPos, { align: "center" });
  yPos += 5;

  doc.setFontSize(8);
  doc.text("Operador:", marginLeft, yPos);
  yPos += 3;
  doc.setFont("helvetica", "normal");
  const operadorText = doc.splitTextToSize(
    valeData.operadores?.nombre_completo || "N/A",
    pageWidth - marginLeft * 2
  );
  doc.text(operadorText, marginLeft, yPos);
  yPos += operadorText.length * 3 + 2;

  doc.setFont("helvetica", "bold");
  doc.text("Placas:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(valeData.vehiculos?.placas || "N/A", marginLeft + 20, yPos);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Sindicato:", marginLeft, yPos);
  yPos += 3;
  doc.setFont("helvetica", "normal");
  const sindicatoText = doc.splitTextToSize(
    valeData.vehiculos?.sindicatos?.sindicato || "N/A",
    pageWidth - marginLeft * 2
  );
  doc.text(sindicatoText, marginLeft, yPos);
  yPos += sindicatoText.length * 3 + 5;

  // ========================================
  // NOTAS (si existen)
  // ========================================
  if (detalle.notas_adicionales) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("NOTAS", centerX, yPos, { align: "center" });
    yPos += 4;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const notasText = doc.splitTextToSize(
      detalle.notas_adicionales,
      pageWidth - marginLeft * 2
    );
    doc.text(notasText, marginLeft, yPos);
    yPos += notasText.length * 3 + 5;
  }

  // ========================================
  // FOOTER
  // ========================================
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(128);
  doc.text(
    `Emitida: ${formatearFechaCorta(valeData.fecha_creacion)} ${formatearHora(valeData.fecha_creacion)}`,
    centerX,
    yPos,
    { align: "center" }
  );

  // Descargar
  doc.save(`Vale_${valeData.folio}_Web.pdf`);
};

/**
 * Generar PDF de vale de RENTA con marca de agua
 */
export const generarPDFRentaPublico = (valeData) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 170],
  });

  let yPos = 5;
  const marginLeft = 5;
  const pageWidth = 80;
  const centerX = pageWidth / 2;

  // ========================================
  // MARCA DE AGUA
  // ========================================
  doc.setTextColor(220, 53, 69);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("COPIA DE VERIFICACIÓN WEB", centerX, yPos, { align: "center" });
  yPos += 5;
  doc.setTextColor(0);

  // ========================================
  // HEADER
  // ========================================
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(valeData.obras?.empresas?.empresa || "EMPRESA", centerX, yPos, {
    align: "center",
  });
  yPos += 5;

  doc.setFontSize(10);
  doc.text("VALE DE RENTA - SERVICIO", centerX, yPos, { align: "center" });
  yPos += 7;

  doc.setLineWidth(0.3);
  doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
  yPos += 5;

  // ========================================
  // DATOS PRINCIPALES
  // ========================================
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");

  doc.text("Folio:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(valeData.folio, marginLeft + 20, yPos);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(formatearFechaCorta(valeData.fecha_creacion), marginLeft + 20, yPos);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Hora:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(formatearHora(valeData.fecha_creacion), marginLeft + 20, yPos);
  yPos += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Obra:", marginLeft, yPos);
  yPos += 3;
  doc.setFont("helvetica", "normal");
  const obraText = doc.splitTextToSize(
    valeData.obras?.obra || "N/A",
    pageWidth - marginLeft * 2
  );
  doc.text(obraText, marginLeft, yPos);
  yPos += obraText.length * 3 + 2;

  const detalle = valeData.vale_renta_detalle?.[0] || {};

  doc.setFont("helvetica", "bold");
  doc.text("Sindicato:", marginLeft, yPos);
  yPos += 3;
  doc.setFont("helvetica", "normal");
  const sindicatoText = doc.splitTextToSize(
    detalle.sindicatos?.sindicato || "N/A",
    pageWidth - marginLeft * 2
  );
  doc.text(sindicatoText, marginLeft, yPos);
  yPos += sindicatoText.length * 3 + 2;

  doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
  yPos += 5;

  // ========================================
  // SERVICIO DE RENTA
  // ========================================
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("SERVICIO DE RENTA", centerX, yPos, { align: "center" });
  yPos += 5;

  doc.setFontSize(8);
  doc.text("Material Movido:", marginLeft, yPos);
  yPos += 3;
  doc.setFont("helvetica", "normal");
  const materialText = doc.splitTextToSize(
    detalle.material?.material || "N/A",
    pageWidth - marginLeft * 2
  );
  doc.text(materialText, marginLeft, yPos);
  yPos += materialText.length * 3 + 2;

  doc.setFont("helvetica", "bold");
  doc.text("Capacidad:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${detalle.capacidad_m3 || "N/A"} m³`, marginLeft + 25, yPos);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Núm. Viajes:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${detalle.numero_viajes || 1}`, marginLeft + 25, yPos);
  yPos += 5;

  doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
  yPos += 4;

  const esRentaPorDia = detalle.es_renta_por_dia === true;

  doc.setFont("helvetica", "bold");
  doc.text("Hora Inicio:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(
    detalle.hora_inicio ? formatearHora(detalle.hora_inicio) : "N/A",
    marginLeft + 25,
    yPos
  );
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Hora Fin:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(
    esRentaPorDia
      ? "Día completo"
      : detalle.hora_fin
        ? formatearHora(detalle.hora_fin)
        : "Pendiente",
    marginLeft + 25,
    yPos
  );
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Total Horas:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(
    esRentaPorDia ? "N/A" : `${detalle.total_horas || 0} hrs`,
    marginLeft + 25,
    yPos
  );
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Total Días:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(esRentaPorDia ? "1 día" : "N/A", marginLeft + 25, yPos);
  yPos += 5;

  doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
  yPos += 4;

  const precioRenta = detalle.precios_renta || {};

  if (precioRenta.costo_hr) {
    doc.setFont("helvetica", "bold");
    doc.text("Tarifa/Hora:", marginLeft, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(formatearMoneda(precioRenta.costo_hr), marginLeft + 25, yPos);
    yPos += 4;
  }

  if (precioRenta.costo_dia) {
    doc.setFont("helvetica", "bold");
    doc.text("Tarifa/Día:", marginLeft, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(formatearMoneda(precioRenta.costo_dia), marginLeft + 25, yPos);
    yPos += 4;
  }

  if (detalle.costo_total) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Costo Total:", marginLeft, yPos);
    doc.text(
      formatearMoneda(detalle.costo_total) + " MXN",
      marginLeft + 25,
      yPos
    );
    yPos += 5;
  }

  // ========================================
  // DATOS GENERALES
  // ========================================
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS GENERALES", centerX, yPos, { align: "center" });
  yPos += 5;

  doc.setFontSize(8);
  doc.text("Operador:", marginLeft, yPos);
  yPos += 3;
  doc.setFont("helvetica", "normal");
  const operadorText = doc.splitTextToSize(
    valeData.operadores?.nombre_completo || "N/A",
    pageWidth - marginLeft * 2
  );
  doc.text(operadorText, marginLeft, yPos);
  yPos += operadorText.length * 3 + 2;

  doc.setFont("helvetica", "bold");
  doc.text("Placas:", marginLeft, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(valeData.vehiculos?.placas || "N/A", marginLeft + 20, yPos);
  yPos += 5;

  // ========================================
  // EMITIDO POR
  // ========================================
  if (valeData.persona) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("EMITIDO POR", centerX, yPos, { align: "center" });
    yPos += 4;

    doc.setFontSize(8);
    doc.text("Residente:", marginLeft, yPos);
    yPos += 3;
    doc.setFont("helvetica", "normal");
    const residenteNombre = `${valeData.persona.nombre} ${
      valeData.persona.primer_apellido
    }${
      valeData.persona.segundo_apellido
        ? " " + valeData.persona.segundo_apellido
        : ""
    }`;
    const residenteText = doc.splitTextToSize(
      residenteNombre,
      pageWidth - marginLeft * 2
    );
    doc.text(residenteText, marginLeft, yPos);
    yPos += residenteText.length * 3 + 5;
  }

  // ========================================
  // NOTAS
  // ========================================
  if (detalle.notas_adicionales) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("NOTAS", centerX, yPos, { align: "center" });
    yPos += 4;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const notasText = doc.splitTextToSize(
      detalle.notas_adicionales,
      pageWidth - marginLeft * 2
    );
    doc.text(notasText, marginLeft, yPos);
    yPos += notasText.length * 3 + 5;
  }

  // ========================================
  // FOOTER
  // ========================================
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(128);
  doc.text(
    `Emitida: ${formatearFechaCorta(valeData.fecha_creacion)} ${formatearHora(valeData.fecha_creacion)}`,
    centerX,
    yPos,
    { align: "center" }
  );

  doc.save(`Vale_${valeData.folio}_Web.pdf`);
};
