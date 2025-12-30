/**
 * src/components/dashboard/ListaConciliacionesPorMes.jsx
 *
 * Lista de conciliaciones agrupadas por MES y SEMANA con acordeón doble
 *
 * Funcionalidades:
 * - Acordeón colapsable por mes (primer nivel)
 * - Acordeón colapsable por semana dentro del mes (segundo nivel)
 * - Muestra todas las conciliaciones de cada semana
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

const ListaConciliacionesPorMes = ({ meses, onSeleccionar, colorTema }) => {
  const [mesesAbiertos, setMesesAbiertos] = useState({});
  const [semanasAbiertas, setSemanasAbiertas] = useState({});

  const toggleMes = (keyMes) => {
    setMesesAbiertos((prev) => ({
      ...prev,
      [keyMes]: !prev[keyMes],
    }));
  };

  const toggleSemana = (keySemana) => {
    setSemanasAbiertas((prev) => ({
      ...prev,
      [keySemana]: !prev[keySemana],
    }));
  };

  return (
    <div className="lista-conciliaciones-mes">
      {meses.map((mes) => {
        const isMesAbierto = mesesAbiertos[mes.keyMes];

        return (
          <div
            key={mes.keyMes}
            className="mes-grupo"
            style={{
              borderColor: colorTema, // ← AGREGAR color dinámico al borde
              boxShadow: `0 2px 8px ${colorTema}40`, // ← Shadow con color dinámico (40 = 25% opacity)
            }}
          >
            {/* Header del MES */}
            <button
              className="mes-grupo__header"
              onClick={() => toggleMes(mes.keyMes)}
              style={{
                background: `linear-gradient(135deg, ${colorTema} 0%, ${colorTema}dd 100%)`, // ← Gradiente dinámico
              }}
            >
              <div className="mes-grupo__header-left">
                {isMesAbierto ? (
                  <ChevronDown size={22} />
                ) : (
                  <ChevronRight size={22} />
                )}
                <Calendar size={22} />
                <span className="mes-grupo__titulo">
                  {mes.mesNombre} {mes.año}
                </span>
              </div>

              <div className="mes-grupo__header-right">
                <span className="mes-grupo__total" style={{ color: "white" }}>
                  $
                  {mes.totalMes.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </span>
                <span className="mes-grupo__count" style={{ color: colorTema }}>
                  {mes.semanas.length}{" "}
                  {mes.semanas.length === 1 ? "semana" : "semanas"}
                </span>
              </div>
            </button>

            {/* Contenido del MES: Lista de SEMANAS */}
            {isMesAbierto && (
              <div className="mes-grupo__content">
                {mes.semanas.map((semana) => {
                  const keySemana = `${semana.año}-${semana.numeroSemana}`;
                  const isSemanaAbierta = semanasAbiertas[keySemana];

                  return (
                    <div key={keySemana} className="semana-grupo">
                      {/* Header de la SEMANA */}
                      <button
                        className="semana-grupo__header"
                        onClick={() => toggleSemana(keySemana)}
                      >
                        <div className="semana-grupo__header-left">
                          {isSemanaAbierta ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                          <span className="semana-grupo__titulo">
                            Semana {semana.numeroSemana}
                          </span>
                        </div>

                        <div className="semana-grupo__header-right">
                          <span className="semana-grupo__total">
                            $
                            {semana.totalSemana.toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <span className="semana-grupo__periodo">
                            {formatearFechaCorta(semana.fechaInicio)} -{" "}
                            {formatearFechaCorta(semana.fechaFin)}
                          </span>
                          <span className="semana-grupo__count">
                            {semana.conciliaciones.length}{" "}
                            {semana.conciliaciones.length === 1
                              ? "conciliación"
                              : "conciliaciones"}
                          </span>
                        </div>
                      </button>

                      {/* Contenido de la SEMANA: Lista de CONCILIACIONES */}
                      {isSemanaAbierta && (
                        <div className="semana-grupo__content">
                          {semana.conciliaciones.map((conciliacion) => (
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
                                  {conciliacion.total_final.toLocaleString(
                                    "es-MX",
                                    {
                                      minimumFractionDigits: 2,
                                    }
                                  )}
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
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ListaConciliacionesPorMes;
