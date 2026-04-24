/**
 * src/utils/conciliaciones/shared/styles/materialPetreoStyles.js
 *
 * Estilos específicos para PDFs de Material Pétreo (Tipo 1 y 2)
 *
 * COLUMNAS:
 * - Placas, Fecha, Folio, Folio Banco, Material, Banco, Distancia, Viajes, Volumen, Toneladas, PU/m³, Importe
 *
 * Usado en: PDFConciliacionMaterialPetreo.jsx
 */

import { StyleSheet } from "@react-pdf/renderer";

export const materialPetreoStyles = StyleSheet.create({
  // ========================================
  // COLUMNAS ESPECÍFICAS DE PÉTREO
  // Total: 53+50+54+50+60+63+33+36+36+40+47 = 522pt
  // Carta paddingHorizontal:30 + table paddingHorizontal:15 => 522pt disponibles
  // ========================================
  colPlacas: {
    width: 53,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colFecha: {
    width: 50,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colFolio: {
    width: 54,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colRemision: {
    width: 50,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colMaterial: {
    width: 60,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colBanco: {
    width: 63,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colDistancia: {
    width: 33,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colVol: {
    width: 36,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colTon: {
    width: 36,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colPU: {
    width: 40,
    fontSize: 7,
    textAlign: "right",
    paddingHorizontal: 2,
  },
  colImporte: {
    width: 47,
    fontSize: 7,
    textAlign: "right",
    paddingHorizontal: 2,
  },

  // ========================================
  // SUBTOTALES ESPECÍFICOS DE PÉTREO
  // ========================================
  subtotalRow: {
    flexDirection: "row",
    padding: "3pt 0",
    fontSize: 7,
    fontWeight: 700,
  },
  subtotalLabel: {
    width: "50%",
    paddingLeft: 2,
  },
  subtotalValues: {
    width: "50%",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  subtotalItem: {
    marginLeft: 10,
    textAlign: "right",
  },
});
