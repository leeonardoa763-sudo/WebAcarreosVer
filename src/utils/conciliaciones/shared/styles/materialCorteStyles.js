/**
 * src/utils/conciliaciones/shared/styles/materialCorteStyles.js
 *
 * Estilos específicos para PDFs de Material de Corte (Tipo 3)
 *
 * COLUMNAS:
 * - Placas, Fecha, Folio, Material, Banco, Distancia, Viajes, Capacidad, M³ Real, PU/m³, Importe
 *
 * Usado en: PDFConciliacionMaterialCorte.jsx
 */

import { StyleSheet } from "@react-pdf/renderer";

export const materialCorteStyles = StyleSheet.create({
  // ========================================
  // COLUMNAS ESPECÍFICAS DE CORTE
  // Total: 46+50+55+44+75+40+30+43+43+42+48 = 516pt
  // Carta paddingHorizontal:30 + table paddingHorizontal:15 => 522pt disponibles
  // ========================================
  colPlacas: {
    width: 46,
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
  colMaterial: {
    width: 44,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colBanco: {
    width: 75,
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
    width: 30,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colCapacidad: {
    width: 43,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colM3Pedidos: {
    width: 43,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colPU: {
    width: 42,
    fontSize: 7,
    textAlign: "right",
    paddingHorizontal: 2,
  },
  colImporte: {
    width: 48,
    fontSize: 7,
    textAlign: "right",
    paddingHorizontal: 2,
  },

  // ========================================
  // SUBTOTALES ESPECÍFICOS DE CORTE
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
