/**
 * src/components/conciliaciones/AccionesConciliacion.jsx
 *
 * Botones de acción para generar PDF y exportar Excel
 *
 * Funcionalidades:
 * - Botón Generar PDF
 * - Botón Exportar Excel
 * - Estados de loading
 *
 * Usado en: Conciliaciones.jsx
 */

// 1. Icons
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";

// 2. Config
import { colors } from "../../config/colors";

const AccionesConciliacion = ({
  onGenerarPDF,
  onExportarExcel,
  disabled,
  loadingPDF,
  loadingExcel,
}) => {
  return (
    <div className="acciones-conciliacion">
      <button
        onClick={onGenerarPDF}
        disabled={disabled || loadingPDF || loadingExcel}
        className="acciones-conciliacion__button acciones-conciliacion__button--pdf"
        style={{ backgroundColor: colors.accent }}
        type="button"
        aria-label="Generar PDF de la conciliación"
      >
        {loadingPDF ? (
          <>
            <Loader2
              size={20}
              className="acciones-conciliacion__spinner"
              aria-hidden="true"
            />
            <span>Generando PDF...</span>
          </>
        ) : (
          <>
            <FileText size={20} aria-hidden="true" />
            <span>Generar PDF</span>
          </>
        )}
      </button>

      <button
        onClick={onExportarExcel}
        disabled={disabled || loadingPDF || loadingExcel}
        className="acciones-conciliacion__button acciones-conciliacion__button--excel"
        style={{ backgroundColor: colors.secondary }}
        type="button"
        aria-label="Exportar a Excel"
      >
        {loadingExcel ? (
          <>
            <Loader2
              size={20}
              className="acciones-conciliacion__spinner"
              aria-hidden="true"
            />
            <span>Exportando Excel...</span>
          </>
        ) : (
          <>
            <FileSpreadsheet size={20} aria-hidden="true" />
            <span>Exportar Excel</span>
          </>
        )}
      </button>
    </div>
  );
};

export default AccionesConciliacion;
