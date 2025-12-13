/**
 * src/components/dashboard/ListaConciliacionesPorSemana.jsx
 *
 * Lista de conciliaciones agrupadas por semana con acordeón
 *
 * Funcionalidades:
 * - Acordeón colapsable por semana
 * - Muestra folios de conciliaciones
 * - Click en folio abre modal
 *
 * Usado en: SeccionConciliaciones.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import { ChevronDown, ChevronRight, Calendar } from "lucide-react";

// 3. Utils
import { formatearFechaCorta } from "../../utils/formatters";

const ListaConciliacionesPorSemana = ({ grupos, onSeleccionar }) => {
  const [semanasAbiertas, setSemanasAbiertas] = useState({});

  /**
   * Toggle semana
   */
  const toggleSemana = (key) => {
    setSemanasAbiertas((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="lista-conciliaciones-semana">
      {grupos.map((grupo) => {
        const key = `${grupo.año}-${grupo.numeroSemana}`;
        const isOpen = semanasAbiertas[key];

        return (
          <div key={key} className="semana-grupo">
            {/* Header de semana */}
            <button
              className="semana-grupo__header"
              onClick={() => toggleSemana(key)}
            >
              <div className="semana-grupo__header-left">
                {isOpen ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronRight size={20} />
                )}
                <Calendar size={20} />
                <span className="semana-grupo__titulo">
                  Semana {grupo.numeroSemana} - {grupo.año}
                </span>
              </div>

              <div className="semana-grupo__header-right">
                <span className="semana-grupo__periodo">
                  {formatearFechaCorta(grupo.fechaInicio)} -{" "}
                  {formatearFechaCorta(grupo.fechaFin)}
                </span>
                <span className="semana-grupo__count">
                  {grupo.conciliaciones.length}{" "}
                  {grupo.conciliaciones.length === 1
                    ? "conciliación"
                    : "conciliaciones"}
                </span>
              </div>
            </button>

            {/* Lista de conciliaciones */}
            {isOpen && (
              <div className="semana-grupo__content">
                {grupo.conciliaciones.map((conciliacion) => (
                  <button
                    key={conciliacion.id_conciliacion}
                    className="conciliacion-item"
                    onClick={() => onSeleccionar(conciliacion)}
                  >
                    <div className="conciliacion-item__folio">
                      {conciliacion.folio}
                    </div>
                    <div className="conciliacion-item__info">
                      <span className="conciliacion-item__obra">
                        {conciliacion.obras?.obra}
                      </span>
                      <span className="conciliacion-item__total">
                        $
                        {conciliacion.total_final.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ListaConciliacionesPorSemana;
