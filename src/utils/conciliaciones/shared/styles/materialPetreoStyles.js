/**
 * src/utils/conciliaciones/shared/styles/materialPetreoStyles.js
 *
 * Estilos específicos para PDFs de Material Pétreo (Tipo 1 y 2)
 *
 * COLUMNAS:
 * - Placas, Fecha, Folio, Folio Banco, Material, Banco, Distancia, Viajes, Volumen, Toneladas, Importe
 *
 * Usado en: PDFConciliacionMaterialPetreo.jsx
 */

import { StyleSheet } from "@react-pdf/renderer";

export const materialPetreoStyles = StyleSheet.create({
  // ========================================
  // COLUMNAS ESPECÍFICAS DE PÉTREO
  // Total ancho: 55+50+55+50+75+48+33+36+36+47 = 485pt
  // Página carta con padding 30c/lado = ~535pt disponibles
  // ========================================
  colPlacas: {
    width: 55,
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
    width: 55,
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
    width: 75,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colBanco: {
    width: 48,
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
