/**
 * src/utils/conciliaciones/generarPDFConciliacionMaterial.js
 *
 * Generación de PDF para conciliaciones de material
 *
 * Funcionalidades:
 * - Formato portrait (vertical)
 * - Columnas dinámicas según tipo de material
 * - Incluye retención 4%
 * - Totales por tipo de material
 *
 * Dependencias: jspdf
 * Usado en: BotonGenerarPDF.jsx
 */

// 1. Imports
import { jsPDF } from "jspdf";

export const generarPDFConciliacionMaterial = (
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

    // Función para formatear volumen
    const formatearVolumen = (numero) => {
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

    // Determinar qué tipos de material hay en los vales
    const detectarTiposMaterial = () => {
      let tieneTipo1 = false;
      let tieneTipo2 = false;
      let tieneTipo3 = false;

      Object.values(valesAgrupados).forEach((grupo) => {
        grupo.vales.forEach((vale) => {
          vale.vale_material_detalles.forEach((detalle) => {
            const idTipo =
              detalle.material?.tipo_de_material?.id_tipo_de_material;
            if (idTipo === 1) tieneTipo1 = true;
            if (idTipo === 2) tieneTipo2 = true;
            if (idTipo === 3) tieneTipo3 = true;
          });
        });
      });

      return { tieneTipo1, tieneTipo2, tieneTipo3 };
    };

    const { tieneTipo1, tieneTipo2, tieneTipo3 } = detectarTiposMaterial();
    const tieneTipo1o2 = tieneTipo1 || tieneTipo2;

    // ========================================
    // ENCABEZADO
    // ========================================
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CONCILIACIÓN DE MATERIAL", 108, yPos, { align: "center" });
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

    // Definir columnas según tipos presentes
    let cols = {};

    if (tieneTipo1o2 && !tieneTipo3) {
      // Solo Tipo 1 y 2: Material Pétreo
      cols = {
        fecha: marginLeft + 2,
        folio: marginLeft + 20,
        folioBanco: marginLeft + 38,
        material: marginLeft + 58,
        banco: marginLeft + 88,
        distancia: marginLeft + 115,
        viajes: marginLeft + 135,
        volReal: marginLeft + 152,
        toneladas: marginLeft + 172,
        importe: marginRight - 2,
      };
    } else if (!tieneTipo1o2 && tieneTipo3) {
      // Solo Tipo 3: Producto de Corte
      cols = {
        fecha: marginLeft + 2,
        folio: marginLeft + 20,
        material: marginLeft + 40,
        distancia: marginLeft + 85,
        viajes: marginLeft + 110,
        capacidad: marginLeft + 132,
        m3Pedidos: marginLeft + 160,
        importe: marginRight - 2,
      };
    } else {
      // Ambos tipos mezclados (layout compacto)
      cols = {
        fecha: marginLeft + 2,
        folio: marginLeft + 18,
        material: marginLeft + 36,
        banco: marginLeft + 68,
        distancia: marginLeft + 92,
        viajes: marginLeft + 112,
        volReal: marginLeft + 130,
        m3Pedidos: marginLeft + 152,
        toneladas: marginLeft + 172,
        importe: marginRight - 2,
      };
    }

    // Encabezados de tabla
    doc.setFillColor(230, 230, 230);
    doc.rect(marginLeft, yPos - 3.5, 185, 7, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");

    doc.text("Fecha", cols.fecha, yPos);
    doc.text("Folio", cols.folio, yPos);

    if (cols.folioBanco) {
      doc.text("F.Banco", cols.folioBanco, yPos);
    }

    doc.text("Material", cols.material, yPos);

    if (cols.banco) {
      doc.text("Banco", cols.banco, yPos);
    }

    doc.text("Dist", cols.distancia, yPos);
    doc.text("Viaj", cols.viajes, yPos, { align: "center" });

    if (cols.capacidad) {
      doc.text("Cap", cols.capacidad, yPos, { align: "center" });
    }

    if (cols.volReal) {
      doc.text("Vol", cols.volReal, yPos, { align: "center" });
    }

    if (cols.m3Pedidos) {
      doc.text("M³Ped", cols.m3Pedidos, yPos, { align: "center" });
    }

    if (cols.toneladas) {
      doc.text("Ton", cols.toneladas, yPos, { align: "center" });
    }

    doc.text("Importe", cols.importe, yPos, { align: "right" });

    yPos += 7;

    // ========================================
    // ITERACIÓN DE DATOS POR PLACAS
    // ========================================
    Object.entries(valesAgrupados).forEach(([placas, grupo]) => {
      checkPageBreak(15);

      // Encabezado de grupo (placas)
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`Placas: ${placas}`, marginLeft + 2, yPos);
      yPos += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);

      grupo.vales.forEach((vale) => {
        vale.vale_material_detalles.forEach((detalle) => {
          checkPageBreak(6);

          const idTipo =
            detalle.material?.tipo_de_material?.id_tipo_de_material;
          const fecha = formatearFecha(vale.fecha_creacion.split("T")[0]);
          const material = detalle.material?.material || "N/A";
          const costo = formatearMoneda(detalle.costo_total);

          // Columnas comunes
          doc.text(fecha, cols.fecha, yPos);
          doc.text(vale.folio, cols.folio, yPos);

          if (idTipo === 1 || idTipo === 2) {
            // TIPO 1 y 2: Material Pétreo
            if (cols.folioBanco) {
              doc.text(detalle.folio_banco || "N/A", cols.folioBanco, yPos);
            }
            doc.text(material.substring(0, 15), cols.material, yPos);
            if (cols.banco) {
              doc.text(
                (detalle.bancos?.banco || "N/A").substring(0, 12),
                cols.banco,
                yPos
              );
            }
            doc.text(
              `${formatearVolumen(detalle.distancia_km)}`,
              cols.distancia,
              yPos,
              { align: "right" }
            );
            doc.text("1", cols.viajes, yPos, { align: "center" });
            if (cols.volReal) {
              doc.text(
                `${formatearVolumen(detalle.volumen_real_m3)}`,
                cols.volReal,
                yPos,
                { align: "right" }
              );
            }
            if (cols.toneladas) {
              doc.text(
                `${formatearVolumen(detalle.peso_ton)}`,
                cols.toneladas,
                yPos,
                { align: "right" }
              );
            }
          } else if (idTipo === 3) {
            // TIPO 3: Producto de Corte
            doc.text(material.substring(0, 20), cols.material, yPos);
            doc.text(
              `${formatearVolumen(detalle.distancia_km)}`,
              cols.distancia,
              yPos,
              { align: "right" }
            );
            doc.text("1", cols.viajes, yPos, { align: "center" });
            if (cols.capacidad) {
              doc.text(
                `${formatearVolumen(detalle.capacidad_m3)}`,
                cols.capacidad,
                yPos,
                { align: "right" }
              );
            }
            if (cols.m3Pedidos) {
              doc.text(
                `${formatearVolumen(detalle.cantidad_pedida_m3)}`,
                cols.m3Pedidos,
                yPos,
                { align: "right" }
              );
            }
          }

          doc.text(`$${costo}`, cols.importe, yPos, { align: "right" });

          yPos += 5;
        });
      });

      // Subtotal del grupo
      checkPageBreak(6);
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
    checkPageBreak(40);

    yPos += 2;
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos, marginRight, yPos);
    yPos += 7;

    const labelResumenX = 155;
    const valueResumenX = marginRight - 2;
    const rowHeight = 4.5;

    doc.setFontSize(8);

    // Totales por tipo de material
    if (totales.totalViajesTipo1 > 0) {
      doc.setFont("helvetica", "normal");
      doc.text("Total Viajes Tipo 1:", labelResumenX, yPos, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(`${totales.totalViajesTipo1}`, valueResumenX, yPos, {
        align: "right",
      });
      yPos += rowHeight;
    }

    if (totales.totalM3Tipo1 > 0) {
      doc.setFont("helvetica", "normal");
      doc.text("Total m³ Tipo 1:", labelResumenX, yPos, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(
        `${formatearVolumen(totales.totalM3Tipo1)}`,
        valueResumenX,
        yPos,
        {
          align: "right",
        }
      );
      yPos += rowHeight;
    }

    if (totales.totalToneladasTipo1 > 0) {
      doc.setFont("helvetica", "normal");
      doc.text("Total Ton Tipo 1:", labelResumenX, yPos, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(
        `${formatearVolumen(totales.totalToneladasTipo1)}`,
        valueResumenX,
        yPos,
        {
          align: "right",
        }
      );
      yPos += rowHeight;
    }

    if (totales.totalViajesTipo2 > 0) {
      doc.setFont("helvetica", "normal");
      doc.text("Total Viajes Tipo 2:", labelResumenX, yPos, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(`${totales.totalViajesTipo2}`, valueResumenX, yPos, {
        align: "right",
      });
      yPos += rowHeight;
    }

    if (totales.totalM3Tipo2 > 0) {
      doc.setFont("helvetica", "normal");
      doc.text("Total m³ Tipo 2:", labelResumenX, yPos, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(
        `${formatearVolumen(totales.totalM3Tipo2)}`,
        valueResumenX,
        yPos,
        {
          align: "right",
        }
      );
      yPos += rowHeight;
    }

    if (totales.totalToneladasTipo2 > 0) {
      doc.setFont("helvetica", "normal");
      doc.text("Total Ton Tipo 2:", labelResumenX, yPos, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(
        `${formatearVolumen(totales.totalToneladasTipo2)}`,
        valueResumenX,
        yPos,
        {
          align: "right",
        }
      );
      yPos += rowHeight;
    }

    if (totales.totalViajesTipo3 > 0) {
      doc.setFont("helvetica", "normal");
      doc.text("Total Viajes Tipo 3:", labelResumenX, yPos, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(`${totales.totalViajesTipo3}`, valueResumenX, yPos, {
        align: "right",
      });
      yPos += rowHeight;
    }

    if (totales.totalM3Tipo3 > 0) {
      doc.setFont("helvetica", "normal");
      doc.text("Total m³ Tipo 3:", labelResumenX, yPos, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(
        `${formatearVolumen(totales.totalM3Tipo3)}`,
        valueResumenX,
        yPos,
        {
          align: "right",
        }
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

    const nombreArchivo = `Conciliacion_MAT_${conciliacion.folio}.pdf`;
    doc.save(nombreArchivo);
  } catch (error) {
    console.error("Error al generar PDF de Material:", error);
    throw error;
  }
};
