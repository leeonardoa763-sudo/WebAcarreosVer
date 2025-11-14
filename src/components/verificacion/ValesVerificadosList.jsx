/**
 * src/components/verificacion/ValesVerificadosList.jsx
 *
 * Lista de vales verificados recientemente
 *
 * Usado en: VerificarVales.jsx
 */

// 1. React y hooks
import { useEffect } from "react";

// 2. Icons
import { CheckCircle, FileText, Calendar, User } from "lucide-react";

// 3. Utils
import { formatearFechaHora, formatearFolio } from "../../utils/formatters";

// 4. Config
import { colors } from "../../config/colors";

const ValesVerificadosList = ({ vales, loading }) => {
  if (loading) {
    return (
      <div className="vales-verificados">
        <h3 className="vales-verificados__title">
          Vales Verificados Recientemente
        </h3>
        <div className="vales-verificados__loading">
          <div className="loading-spinner"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (vales.length === 0) {
    return (
      <div className="vales-verificados">
        <h3 className="vales-verificados__title">
          Vales Verificados Recientemente
        </h3>
        <div className="vales-verificados__empty">
          <FileText size={48} style={{ color: colors.textSecondary }} />
          <p>No hay vales verificados aún</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vales-verificados">
      <h3 className="vales-verificados__title">
        Vales Verificados Recientemente
        <span className="vales-verificados__count">{vales.length}</span>
      </h3>

      <div className="vales-verificados__list">
        {vales.map((vale) => {
          const { fecha, hora } = formatearFechaHora(vale.fecha_verificacion);
          const verificador = vale.persona
            ? `${vale.persona.nombre} ${vale.persona.primer_apellido}`.trim()
            : "Desconocido";

          return (
            <div key={vale.id_vale} className="vales-verificados__item">
              <div className="vales-verificados__icon">
                <CheckCircle size={20} style={{ color: colors.accent }} />
              </div>

              <div className="vales-verificados__info">
                <div className="vales-verificados__folio">
                  {formatearFolio(vale.folio)}
                </div>

                <div className="vales-verificados__meta">
                  <span className="vales-verificados__meta-item">
                    <Calendar size={14} />
                    {fecha} {hora}
                  </span>

                  <span className="vales-verificados__meta-item">
                    <User size={14} />
                    {verificador}
                  </span>
                </div>

                {vale.obras && (
                  <div className="vales-verificados__obra">
                    {vale.obras.obra}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ValesVerificadosList;
