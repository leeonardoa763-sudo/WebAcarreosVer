/**
 * src/components/vales/ValeCardRenta.jsx
 *
 * Tarjeta compacta de vale de RENTA con desplegable
 *
 * Funcionalidades:
 * - Vista compacta: folio, fecha efectiva, estado
 * - Desplegable: información completa del vale de renta
 * - Muestra fecha de creación Y fecha de emisión (programada) si son distintas
 * - Desglose de viajes individuales desde vale_renta_viajes
 * - Lógica condicional basada en es_renta_por_dia
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
  MapPin,
  XCircle,
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

/**
 * Formatear una fecha ISO a dd/mm/yyyy
 */
const formatearFechaCorta = (fechaISO) => {
  if (!fechaISO) return "N/A";
  const date = new Date(fechaISO + (fechaISO.includes("T") ? "" : "T00:00:00"));
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Formatear hora de forma legible (HH:MM am/pm)
 */
const formatearHora = (horaISO) => {
  if (!horaISO) return null;
  return new Date(horaISO).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Obtener la fecha efectiva de un vale para mostrar en header.
 * Usa fecha_programada si existe, si no usa fecha_creacion.
 */
const obtenerFechaEfectiva = (vale) => {
  const fechaRaw = vale.fecha_programada || vale.fecha_creacion;
  const { fecha } = formatearFechaHora(fechaRaw);
  return fecha;
};

const ValeCardRenta = ({ vale, empresaColor }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const badgeEstado = getBadgeEstado(vale.estado);

  // Fecha de creación (cuando se registró en el sistema)
  const { fecha: fechaCreacion, hora: horaCreacion } = formatearFechaHora(
    vale.fecha_creacion,
  );

  // Fecha efectiva para el header (programada si existe, si no creacion)
  const fechaHeader = obtenerFechaEfectiva(vale);

  // Saber si tiene fecha programada diferente a creacion
  const tieneFechaProgramada =
    vale.fecha_programada &&
    vale.fecha_programada !== vale.fecha_creacion?.split("T")[0];

  /**
   * Calcular costo total del vale
   */
  const calcularCostoTotal = () => {
    return vale.vale_renta_detalle.reduce(
      (sum, detalle) => sum + Number(detalle.costo_total || 0),
      0,
    );
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
            <span className="vale-card-compact__fecha">{fechaHeader}</span>
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
            {/* Obra */}
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

            {/* Fecha de creación (siempre visible) */}
            <div className="vale-card__info-row-expanded">
              <Calendar
                size={16}
                className="vale-card__icon"
                aria-hidden="true"
              />
              <div>
                <span className="vale-card__label">Fecha de Creación:</span>
                <span className="vale-card__value">
                  {fechaCreacion} a las {horaCreacion}
                </span>
              </div>
            </div>

            {/* Fecha de emisión — solo si es diferente a la de creación */}
            {tieneFechaProgramada && (
              <div className="vale-card__info-row-expanded">
                <Calendar
                  size={16}
                  className="vale-card__icon"
                  style={{ color: "#8B5CF6" }}
                  aria-hidden="true"
                />
                <div>
                  <span
                    className="vale-card__label"
                    style={{ color: "#8B5CF6", fontWeight: 700 }}
                  >
                    Fecha de Emisión:
                  </span>
                  <span
                    className="vale-card__value"
                    style={{ color: "#8B5CF6", fontWeight: 600 }}
                  >
                    {formatearFechaCorta(vale.fecha_programada)}
                  </span>
                  <span className="vale-card__sub-value">
                    Vale planeado con anticipación
                  </span>
                </div>
              </div>
            )}

            {/* Residente */}
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

            {/* Operador */}
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

            {/* Placas */}
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

            {/* Fecha de verificación */}
            {vale.fecha_verificacion && (
              <div className="vale-card__info-row-expanded">
                <Calendar
                  size={16}
                  className="vale-card__icon"
                  style={{ color: "#004E89" }}
                  aria-hidden="true"
                />
                <div>
                  <span
                    className="vale-card__label"
                    style={{ color: "#004E89" }}
                  >
                    Fecha de Verificación:
                  </span>
                  <span
                    className="vale-card__value"
                    style={{ color: "#004E89" }}
                  >
                    {formatearFechaHora(vale.fecha_verificacion).fecha} a las{" "}
                    {formatearFechaHora(vale.fecha_verificacion).hora}
                  </span>
                </div>
              </div>
            )}

            {/* Fecha de completado */}
            {vale.fecha_completado && (
              <div className="vale-card__info-row-expanded">
                <Calendar
                  size={16}
                  className="vale-card__icon"
                  style={{ color: "#10B981" }}
                  aria-hidden="true"
                />
                <div>
                  <span
                    className="vale-card__label"
                    style={{ color: "#10B981" }}
                  >
                    Fecha de Completado:
                  </span>
                  <span
                    className="vale-card__value"
                    style={{ color: "#10B981" }}
                  >
                    {formatearFechaHora(vale.fecha_completado).fecha} a las{" "}
                    {formatearFechaHora(vale.fecha_completado).hora}
                  </span>
                </div>
              </div>
            )}

            {/* Fecha de cancelación */}
            {vale.fecha_cancelacion && (
              <div className="vale-card__info-row-expanded">
                <XCircle
                  size={16}
                  className="vale-card__icon"
                  style={{ color: "#DC2626" }}
                  aria-hidden="true"
                />
                <div>
                  <span
                    className="vale-card__label"
                    style={{ color: "#DC2626" }}
                  >
                    Fecha de Cancelación:
                  </span>
                  <span
                    className="vale-card__value"
                    style={{ color: "#DC2626" }}
                  >
                    {formatearFechaHora(vale.fecha_cancelacion).fecha} a las{" "}
                    {formatearFechaHora(vale.fecha_cancelacion).hora}
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

          {/* Motivo de cancelación */}
          {vale.estado === "cancelado" && vale.motivo_cancelacion && (
            <div className="vale-card__cancelacion-motivo">
              <span className="vale-card__cancelacion-label">
                Motivo de cancelación:
              </span>
              <p className="vale-card__cancelacion-texto">
                {vale.motivo_cancelacion}
              </p>
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
                const costoTotal = Number(detalle.costo_total || 0);
                const totalHoras = Number(detalle.total_horas || 0);
                const totalDias = Number(detalle.total_dias || 0);
                const costoHr = Number(detalle.precios_renta?.costo_hr || 0);
                const costoDia = Number(detalle.precios_renta?.costo_dia || 0);
                const esRentaPorDia = totalDias > 0;

                const viajesRegistrados = detalle.vale_renta_viajes || [];
                const viajesOrdenados = [...viajesRegistrados].sort(
                  (a, b) => a.numero_viaje - b.numero_viaje,
                );

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
                      <div className="vale-card__detalle-item-small">
                        <span className="vale-card__detalle-label">
                          Capacidad:
                        </span>
                        <span className="vale-card__detalle-value">
                          {formatearVolumen(detalle.capacidad_m3 || 0)}
                        </span>
                      </div>

                      <div className="vale-card__detalle-item-small">
                        <span className="vale-card__detalle-label">
                          Núm. Viajes:
                        </span>
                        <span className="vale-card__detalle-value">
                          {detalle.numero_viajes || 0}
                        </span>
                      </div>

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
                            {totalDias === 0.5 ? "Medio día" : "Día completo"}
                          </span>
                        </div>
                      ) : null}

                      {esRentaPorDia ? (
                        <>
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
                        <>
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

                    {viajesOrdenados.length > 0 && (
                      <div className="vale-card__viajes-desglose">
                        <h5 className="vale-card__viajes-title">
                          <MapPin size={13} aria-hidden="true" />
                          Registro de Viajes
                        </h5>
                        <div className="vale-card__viajes-lista">
                          {viajesOrdenados.map((viaje) => (
                            <div
                              key={viaje.id_viaje}
                              className="vale-card__viaje-item"
                            >
                              <span className="vale-card__viaje-numero">
                                Viaje {viaje.numero_viaje}
                              </span>
                              <span className="vale-card__viaje-hora">
                                {formatearHora(viaje.hora_registro)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
