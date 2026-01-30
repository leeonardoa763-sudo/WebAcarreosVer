/**
 * src/components/vales/ValeCardRenta.jsx
 *
 * Tarjeta compacta de vale de RENTA con desplegable
 *
 * Funcionalidades:
 * - Vista compacta: folio, fecha, estado
 * - Desplegable: información completa del vale de renta
 * - Lógica condicional basada en es_renta_por_dia
 * - Si es_renta_por_dia = true: muestra días y tarifa/día
 * - Si es_renta_por_dia = false: muestra horas y tarifa/hora
 *
 * Usado en: ValeCard.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Building2,
  User,
  Truck,
  Clock,
  UserCheck,
} from "lucide-react";

// 3. Utils
import {
  formatearFechaHora,
  getBadgeEstado,
  formatearVolumen,
  formatearDuracion,
  formatearFolio,
  formatearMoneda,
  getNombreCompleto,
} from "../../utils/formatters";

const ValeCardRenta = ({ vale, empresaColor }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const badgeEstado = getBadgeEstado(vale.estado);
  const { fecha, hora } = formatearFechaHora(vale.fecha_creacion);

  /**
   * Calcular costo total del vale
   */
  const calcularCostoTotal = () => {
    return vale.vale_renta_detalle.reduce(
      (sum, detalle) => sum + Number(detalle.costo_total || 0),
      0,
    );
  };

  /**
   * Formatear hora de forma legible
   */
  const formatearHora = (horaISO) => {
    if (!horaISO) return null;
    return new Date(horaISO).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="vale-card-compact">
      {/* Vista compacta */}
      <div
        className="vale-card-compact__header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ borderLeft: `4px solid ${empresaColor}` }}
      >
        <div className="vale-card-compact__main">
          <div className="vale-card-compact__folio">
            <FileText size={16} aria-hidden="true" />
            <span>{formatearFolio(vale.folio)}</span>
          </div>

          <div className="vale-card-compact__info">
            <span className="vale-card-compact__fecha">{fecha}</span>
            <span
              className="vale-card-compact__estado"
              style={{
                color: badgeEstado.color,
                backgroundColor: badgeEstado.background,
              }}
            >
              {badgeEstado.label}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="vale-card-compact__toggle"
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? "Contraer" : "Expandir"} detalles del vale ${formatearFolio(vale.folio)}`}
          aria-controls={`vale-details-${vale.id_vale}`}
          type="button"
        >
          {isExpanded ? (
            <ChevronUp size={20} aria-hidden="true" />
          ) : (
            <ChevronDown size={20} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Detalles expandidos */}
      {isExpanded && (
        <div
          id={`vale-details-${vale.id_vale}`}
          className="vale-card-compact__body"
          role="region"
          aria-label={`Detalles completos del vale ${formatearFolio(vale.folio)}`}
        >
          {/* Información general */}
          <div className="vale-card__info-general">
            <div className="vale-card__info-row-expanded">
              <Building2
                size={16}
                className="vale-card__icon"
                aria-hidden="true"
              />
              <div>
                <span className="vale-card__label">Obra:</span>
                <span className="vale-card__value">
                  {vale.obras?.obra || "N/A"}
                </span>
                <span className="vale-card__sub-value">
                  CC: {vale.obras?.cc || "N/A"} |{" "}
                  {vale.obras?.empresas?.empresa || "N/A"}
                </span>
              </div>
            </div>

            <div className="vale-card__info-row-expanded">
              <Calendar
                size={16}
                className="vale-card__icon"
                aria-hidden="true"
              />
              <div>
                <span className="vale-card__label">Fecha de Creación:</span>
                <span className="vale-card__value">
                  {fecha} a las {hora}
                </span>
              </div>
            </div>

            <div className="vale-card__info-row-expanded">
              <UserCheck
                size={16}
                className="vale-card__icon"
                aria-hidden="true"
              />
              <div>
                <span className="vale-card__label">Residente:</span>
                <span className="vale-card__value">
                  {getNombreCompleto(vale.persona)}
                </span>
              </div>
            </div>

            {vale.operadores && (
              <div className="vale-card__info-row-expanded">
                <User
                  size={16}
                  className="vale-card__icon"
                  aria-hidden="true"
                />
                <div>
                  <span className="vale-card__label">Operador:</span>
                  <span className="vale-card__value">
                    {vale.operadores.nombre_completo}
                  </span>
                  {vale.operadores.sindicatos && (
                    <span className="vale-card__sub-value">
                      Sindicato: {vale.operadores.sindicatos.sindicato}
                    </span>
                  )}
                </div>
              </div>
            )}

            {vale.vehiculos && (
              <div className="vale-card__info-row-expanded">
                <Truck
                  size={16}
                  className="vale-card__icon"
                  aria-hidden="true"
                />
                <div>
                  <span className="vale-card__label">Placas:</span>
                  <span className="vale-card__value">
                    {vale.vehiculos.placas}
                  </span>
                </div>
              </div>
            )}
          </div>

          {vale.vale_renta_detalle?.[0]?.sindicatos?.sindicato && (
            <div className="vale-card__field">
              <span className="vale-card__label">Sindicato:</span>
              <span className="vale-card__value">
                {vale.vale_renta_detalle[0].sindicatos.sindicato}
              </span>
            </div>
          )}

          {/* Detalles de RENTA */}
          <div className="vale-card__detalles-section">
            <h4 className="vale-card__section-title">
              <Clock size={16} aria-hidden="true" />
              Detalles de Renta
            </h4>

            {!vale.vale_renta_detalle?.length ? (
              <p className="vale-card__no-data">Sin detalles de renta</p>
            ) : (
              vale.vale_renta_detalle.map((detalle, index) => {
                // Convertir valores a número
                const costoTotal = Number(detalle.costo_total || 0);
                const totalHoras = Number(detalle.total_horas || 0);
                const totalDias = Number(detalle.total_dias || 0);
                const costoHr = Number(detalle.precios_renta?.costo_hr || 0);
                const costoDia = Number(detalle.precios_renta?.costo_dia || 0);

                // Determinar si es renta por día
                const esRentaPorDia = totalDias > 0;

                return (
                  <div
                    key={detalle.id_vale_renta_detalle}
                    className="vale-card__detalle-renta"
                  >
                    <div className="vale-card__detalle-header">
                      <span className="vale-card__detalle-number">
                        #{index + 1}
                      </span>
                      <span className="vale-card__detalle-material-name">
                        {detalle.material?.material || "N/A"}
                      </span>
                    </div>

                    <div className="vale-card__detalle-grid">
                      {/* Capacidad - SIEMPRE SE MUESTRA */}
                      <div className="vale-card__detalle-item-small">
                        <span className="vale-card__detalle-label">
                          Capacidad:
                        </span>
                        <span className="vale-card__detalle-value">
                          {formatearVolumen(detalle.capacidad_m3 || 0)}
                        </span>
                      </div>

                      {/* Núm. Viajes - SIEMPRE SE MUESTRA */}
                      <div className="vale-card__detalle-item-small">
                        <span className="vale-card__detalle-label">
                          Núm. Viajes:
                        </span>
                        <span className="vale-card__detalle-value">
                          {detalle.numero_viajes || 0}
                        </span>
                      </div>

                      {/* Hora Inicio - SIEMPRE SE MUESTRA si existe */}
                      {detalle.hora_inicio && (
                        <div className="vale-card__detalle-item-small">
                          <span className="vale-card__detalle-label">
                            Hora Inicio:
                          </span>
                          <span className="vale-card__detalle-value">
                            {formatearHora(detalle.hora_inicio)}
                          </span>
                        </div>
                      )}

                      {/* Hora Fin */}
                      {detalle.hora_fin ? (
                        <div className="vale-card__detalle-item-small">
                          <span className="vale-card__detalle-label">
                            Hora Fin:
                          </span>
                          <span className="vale-card__detalle-value">
                            {formatearHora(detalle.hora_fin)}
                          </span>
                        </div>
                      ) : esRentaPorDia ? (
                        <div className="vale-card__detalle-item-small">
                          <span className="vale-card__detalle-label">
                            Hora Fin:
                          </span>
                          <span className="vale-card__detalle-value">
                            {totalDias === 0.5 ? "Medio día" : "Día completo"}{" "}
                            {/* <--- MODIFICADO */}
                          </span>
                        </div>
                      ) : null}

                      {/* CONDICIONAL: Si es renta por DÍA */}
                      {esRentaPorDia ? (
                        <>
                          {/* Total Días */}
                          <div className="vale-card__detalle-item-small">
                            <span className="vale-card__detalle-label">
                              Total Días:
                            </span>
                            <span className="vale-card__detalle-value highlight">
                              {totalDias > 0
                                ? `${totalDias} ${totalDias === 1 ? "día" : "días"}`
                                : "Pendiente"}
                            </span>
                          </div>

                          {/* Tarifa por Día */}
                          <div className="vale-card__detalle-item-small">
                            <span className="vale-card__detalle-label">
                              Tarifa/Día:
                            </span>
                            <span className="vale-card__detalle-value">
                              {costoDia > 0 ? formatearMoneda(costoDia) : "N/A"}
                            </span>
                          </div>
                        </>
                      ) : (
                        /* CONDICIONAL: Si es renta por HORAS */
                        <>
                          {/* Total Horas */}
                          <div className="vale-card__detalle-item-small">
                            <span className="vale-card__detalle-label">
                              Total Horas:
                            </span>
                            <span className="vale-card__detalle-value highlight">
                              {totalHoras > 0
                                ? formatearDuracion(totalHoras)
                                : "Pendiente"}
                            </span>
                          </div>

                          {/* Tarifa por Hora */}
                          <div className="vale-card__detalle-item-small">
                            <span className="vale-card__detalle-label">
                              Tarifa/Hora:
                            </span>
                            <span className="vale-card__detalle-value">
                              {costoHr > 0 ? formatearMoneda(costoHr) : "N/A"}
                            </span>
                          </div>
                        </>
                      )}

                      {/* Costo Total - SIEMPRE SE MUESTRA */}
                      <div className="vale-card__detalle-item-small full-width">
                        <span className="vale-card__detalle-label">
                          Costo Total:
                        </span>
                        <span className="vale-card__detalle-value cost">
                          {costoTotal > 0
                            ? formatearMoneda(costoTotal)
                            : "Pendiente"}
                        </span>
                      </div>
                    </div>

                    {/* Notas adicionales */}
                    {detalle.notas_adicionales && (
                      <div className="vale-card__notas">
                        <span className="vale-card__detalle-label">Notas:</span>
                        <p className="vale-card__notas-text">
                          {detalle.notas_adicionales}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Total General del Vale */}
            {vale.vale_renta_detalle?.length > 0 && (
              <div className="vale-card__total">
                <span className="vale-card__total-label">
                  Costo Total del Vale:
                </span>
                <span className="vale-card__total-value cost">
                  {formatearMoneda(calcularCostoTotal())}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ValeCardRenta;
