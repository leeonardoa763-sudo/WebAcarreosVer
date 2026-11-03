/**
 * src/pages/ReporteMensual.jsx
 *
 * Reporte mensual corporativo (todas las obras), en página propia (se abre
 * en pestaña nueva desde EstadisticasGlobales.jsx). A diferencia de los
 * reportes diario/semanal (imagen/PDF con html2canvas), este es un HTML
 * interactivo — filtros de obra/empresa/material/banco, tooltips y
 * animaciones — que se descarga como un solo archivo autocontenido para
 * abrirse con doble clic. Lo que se ve en el iframe es exactamente ese
 * archivo (construirHtml), así que vista y descarga no pueden diferir.
 *
 * Dependencias: useReporteMensual, reporte-mensual/construirHtml
 * Usado en: App.jsx (ruta /reporte-mensual), enlazada desde EstadisticasGlobales.jsx
 */

// 1. React
import { useEffect, useMemo } from "react";

// 2. React Router
import { useSearchParams } from "react-router-dom";

// 3. Iconos
import { CalendarRange, Download } from "lucide-react";

// 4. Hooks
import { useReporteMensual, mesAnteriorDe } from "../hooks/useReporteMensual";

// 5. Utils
import { construirHtml, descargarHtml } from "../reporte-mensual/construirHtml";

// 6. Estilos
import "../styles/reporte-mensual.css";

const hoy = new Date();
const MES_ACTUAL = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

const ReporteMensual = () => {
  const [searchParams] = useSearchParams();
  // Por defecto, el último mes cerrado: es el que se reporta a los jefes.
  const { mes, setMes, reporte, loading, error, refresh } = useReporteMensual(mesAnteriorDe(MES_ACTUAL));

  useEffect(() => {
    const mesParam = searchParams.get("mes");
    if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) setMes(mesParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const html = useMemo(() => (reporte ? construirHtml(reporte) : null), [reporte]);

  return (
    <div className="rpm-page">
      <div className="rpm-page__toolbar">
        <div className="rpm-page__titulo">
          <CalendarRange size={16} />
          <span>Reporte Mensual</span>
        </div>
        <div className="rpm-page__acciones">
          <input
            type="month"
            className="rpm-page__mes"
            value={mes}
            max={MES_ACTUAL}
            onChange={(e) => e.target.value && setMes(e.target.value)}
            aria-label="Mes del reporte"
          />
          <button
            className="rpm-page__btn"
            onClick={() => descargarHtml(html, `Reporte_Mensual_${mes}.html`)}
            disabled={loading || !html}
          >
            <Download size={14} />
            Descargar HTML
          </button>
        </div>
      </div>

      {error ? (
        <div className="rpm-page__estado rpm-page__estado--error">
          <p>{error}</p>
          <button onClick={refresh}>Reintentar</button>
        </div>
      ) : loading || !html ? (
        <div className="rpm-page__estado">Cargando reporte…</div>
      ) : (
        <iframe className="rpm-page__marco" title={`Reporte mensual ${mes}`} srcDoc={html} />
      )}
    </div>
  );
};

export default ReporteMensual;
