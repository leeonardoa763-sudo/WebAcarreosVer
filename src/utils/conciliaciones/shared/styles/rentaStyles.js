/**
 * src/utils/conciliaciones/shared/styles/rentaStyles.js
 *
 * Estilos específicos para PDFs de Renta de Maquinaria
 *
 * COLUMNAS:
 * - Placas, Folio, Fecha, Material Movido, Viajes, Días, Horas, Importe
 *
 * Usado en: PDFConciliacionRenta.jsx
 */

import { StyleSheet } from "@react-pdf/renderer";

export const rentaStyles = StyleSheet.create({
  // ========================================
  // COLUMNAS ESPECÍFICAS DE RENTA
  // ========================================
  colPlacas: {
    width: 60,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colFolio: {
    width: 70,
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
  colMaterial: {
    width: 100,
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
  colDias: {
    width: 40,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colHoras: {
    width: 50,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colImporte: {
    width: 60,
    fontSize: 7,
    textAlign: "right",
    paddingHorizontal: 2,
  },

  // ========================================
  // SUBTOTALES ESPECÍFICOS DE RENTA
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

  // ========================================
  // TABLA - ENCABEZADO ESPECÍFICO DE RENTA
  // ========================================
  tableHeaderRenta: {
    flexDirection: "row",
    backgroundColor: "#004E89",
    padding: "3.5pt 0",
    fontSize: 7,
    fontWeight: 700,
    color: "white",
  },
});
