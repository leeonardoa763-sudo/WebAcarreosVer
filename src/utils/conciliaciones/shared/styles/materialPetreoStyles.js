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
  // ========================================
  colPlacas: {
    width: 55,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colFecha: {
    width: 60,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colFolio: {
    width: 60,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colFolioBanco: {
    width: 60,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colMaterial: {
    width: 85,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colBanco: {
    width: 50,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colDistancia: {
    width: 40,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colViajes: {
    width: 40,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colVol: {
    width: 40,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colTon: {
    width: 40,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
});
