/**
 * src/utils/conciliaciones/shared/styles/materialCorteStyles.js
 *
 * Estilos específicos para PDFs de Material de Corte (Tipo 3)
 *
 * COLUMNAS:
 * - Placas, Fecha, Folio, Material, Banco, Distancia, Viajes, Capacidad, M³ Pedidos, Importe
 * - SIN: Folio Banco, Toneladas
 *
 * Usado en: PDFConciliacionMaterialCorte.jsx
 */

import { StyleSheet } from "@react-pdf/renderer";

export const materialCorteStyles = StyleSheet.create({
  // ========================================
  // COLUMNAS ESPECÍFICAS DE CORTE
  // ========================================
  colPlacas: {
    width: 50,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colFecha: {
    width: 55,
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
  colMaterial: {
    width: 80,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colBanco: {
    width: 55,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colDistancia: {
    width: 45,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colViajes: {
    width: 35,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colCapacidad: {
    width: 45,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colM3Pedidos: {
    width: 45,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colImporte: {
    width: 50,
    fontSize: 7,
    textAlign: "right",
    paddingHorizontal: 2,
  },
});
