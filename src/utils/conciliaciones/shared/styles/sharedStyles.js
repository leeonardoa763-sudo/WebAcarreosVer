/**
 * src/utils/conciliaciones/shared/styles/sharedStyles.js
 *
 * Estilos compartidos para PDFs de conciliaciones de material
 *
 * Usado en: PDFConciliacionMaterialPetreo.jsx, PDFConciliacionMaterialCorte.jsx
 */

import { StyleSheet } from "@react-pdf/renderer";

export const sharedStyles = StyleSheet.create({
  // ========================================
  // PÁGINA
  // ========================================
  page: {
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 30,
    fontSize: 9,
    fontFamily: "Roboto",
  },

  // ========================================
  // ENCABEZADO
  // ========================================
  title: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 8,
  },
  divider: {
    borderBottom: "0.5pt solid #000",
    marginBottom: 7,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  infoLabel: {
    width: "15%",
    fontWeight: 700,
  },
  infoValue: {
    width: "85%",
  },

  // ========================================
  // TABLA - ESTRUCTURA BASE
  // ========================================
  table: {
    marginTop: 10,
    paddingHorizontal: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#FF6B35",
    padding: "3.5pt 0",
    fontSize: 7,
    fontWeight: 700,
    color: "white",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #E0E0E0",
    padding: "2.5pt 0",
    fontSize: 7,
    alignItems: "center",
  },

  // ========================================
  // SUBTOTALES POR GRUPO
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
  // TOTALES FINALES
  // ========================================
  totalesSection: {
    marginTop: 10,
    borderTop: "0.5pt solid #000",
    paddingTop: 7,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 2,
    fontSize: 7,
  },
  totalLabel: {
    width: "25%",
    textAlign: "right",
    paddingRight: 10,
  },
  totalValue: {
    width: "15%",
    textAlign: "right",
    fontWeight: 700,
  },
  totalFinal: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 3,
  },

  // ========================================
  // FIRMAS
  // ========================================
  firmasSection: {
    marginTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  firmaBox: {
    width: "45%",
    alignItems: "center",
  },
  firmaLinea: {
    borderTop: "0.3pt solid #000",
    width: "100%",
    marginBottom: 5,
  },
  firmaTexto: {
    fontSize: 8,
    fontWeight: 700,
  },
  firmaNombre: {
    fontSize: 7,
    marginTop: 5,
  },

  // ========================================
  // FOOTER
  // ========================================
  footer: {
    position: "absolute",
    bottom: 15,
    left: 15,
    right: 15,
    textAlign: "center",
    fontSize: 7,
    color: "#808080",
  },
});
