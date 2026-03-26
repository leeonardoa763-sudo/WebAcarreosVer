/**
 * src/components/vales/ValeCardMaterial.jsx
 *
 * Tarjeta compacta de vale de MATERIAL con desplegable
 *
 * Funcionalidades:
 * - Vista compacta: folio, fecha, estado
 * - Desplegable: información completa del vale de material
 * - Muestra volumen según tipo de material (Tipo 3 = Pedidos, Otros = Reales)
 * - Detalles de banco, distancia, precios
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
  Package,
  UserCheck,
  Receipt,
  XCircle,
} from "lucide-react";

// 3. Utils
import {
  formatearFechaHora,
  getBadgeEstado,
  formatearVolumen,
  formatearPeso,
  formatearDistancia,
  formatearFolio,
  formatearMoneda,
  getNombreCompleto,
  formatearHora,
} from "../../utils/formatters";

const ValeCardMaterial = ({ vale, empresaColor }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const badgeEstado = getBadgeEstado(vale.estado);
  const { fecha, hora } = formatearFechaHora(vale.fecha_creacion);

  /**
   * Calcular costo total del vale
   */
  const calcularCostoTotal = () => {
    return vale.vale_material_detalles.reduce(
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

            {/* Fecha de creación */}
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

          {/* Detalles de MATERIAL */}
          <div className="vale-card__detalles-section">
            <h4 className="vale-card__section-title">
              <Package size={16} aria-hidden="true" />
              Detalles de Material
            </h4>

            {!vale.vale_material_detalles?.length ? (
              <p className="vale-card__no-data">Sin detalles de material</p>
            ) : (
              vale.vale_material_detalles.map((detalle, index) => {
                const esTipo3 =
                  detalle.material?.tipo_de_material?.id_tipo_de_material === 3;

                const volumen = esTipo3
                  ? Number(detalle.cantidad_pedida_m3)
                  : Number(detalle.volumen_real_m3);

                const labelVolumen = esTipo3 ? "M³ Pedidos" : "M³ Reales";

                const precioM3 = Number(detalle.precio_m3);
                const costoTotal = Number(detalle.costo_total);
                const pesoTon = Number(detalle.peso_ton);

                return (
                  <div
                    key={detalle.id_detalle_material}
                    className="vale-card__detalle-material"
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
                        <span className="vale-card__detalle-label">Tipo:</span>
                        <span className="vale-card__detalle-value">
                          {detalle.material?.tipo_de_material
                            ?.tipo_de_material || "N/A"}
                        </span>
                      </div>

                      <div className="vale-card__detalle-item-small">
                        <span className="vale-card__detalle-label">Banco:</span>
                        <span className="vale-card__detalle-value">
                          {detalle.bancos?.banco || "N/A"}
                        </span>
                      </div>

                      {vale.operadores?.sindicatos?.sindicato && (
                        <div className="vale-card__field">
                          <span className="vale-card__label">Sindicato:</span>
                          <span className="vale-card__value">
                            {vale.operadores.sindicatos.sindicato}
                          </span>
                        </div>
                      )}

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
                          Distancia:
                        </span>
                        <span className="vale-card__detalle-value">
                          {formatearDistancia(detalle.distancia_km || 0)}
                        </span>
                      </div>

                      <div className="vale-card__detalle-item-small">
                        <span className="vale-card__detalle-label">
                          {labelVolumen}:
                        </span>
                        <span className="vale-card__detalle-value highlight">
                          {!isNaN(volumen) && volumen > 0
                            ? formatearVolumen(volumen)
                            : "Pendiente"}
                        </span>
                      </div>

                      <div className="vale-card__detalle-item-small">
                        <span className="vale-card__detalle-label">
                          Requisición:
                        </span>
                        <span className="vale-card__detalle-value">
                          {detalle.requisicion || "N/A"}
                        </span>
                      </div>

                      <div className="vale-card__detalle-item-small">
                        <span className="vale-card__detalle-label">
                          Precio/M³:
                        </span>
                        <span className="vale-card__detalle-value">
                          {!isNaN(precioM3) && precioM3 > 0
                            ? formatearMoneda(precioM3)
                            : "Pendiente"}
                        </span>
                      </div>

                      {!isNaN(pesoTon) && pesoTon > 0 && (
                        <div className="vale-card__detalle-item-small">
                          <span className="vale-card__detalle-label">
                            Peso:
                          </span>
                          <span className="vale-card__detalle-value">
                            {formatearPeso(pesoTon)}
                          </span>
                        </div>
                      )}

                      <div className="vale-card__detalle-item-small full-width">
                        <span className="vale-card__detalle-label">
                          Importe:
                        </span>
                        <span className="vale-card__detalle-value cost">
                          {!isNaN(costoTotal) && costoTotal > 0
                            ? formatearMoneda(costoTotal)
                            : "Pendiente"}
                        </span>
                      </div>
                    </div>

                    {detalle.notas_adicionales && (
                      <div className="vale-card__notas">
                        <span className="vale-card__detalle-label">Notas:</span>
                        <p className="vale-card__notas-text">
                          {detalle.notas_adicionales}
                        </p>
                      </div>
                    )}

                    {/* Desglose de viajes */}
                    {detalle.vale_material_viajes?.length > 0 && (
                      <div className="vale-card__viajes-desglose vale-card__viajes-desglose--material">
                        <h5 className="vale-card__viajes-title">
                          <Receipt size={13} aria-hidden="true" />
                          Registro de Viajes (
                          {detalle.vale_material_viajes.length})
                        </h5>

                        <div className="vale-card__viajes-tabla-header">
                          <span>Viaje</span>
                          <span>Hora</span>
                          <span>Folio Físico</span>
                          <span>Toneladas</span>
                          <span>M³</span>
                          <span>Costo</span>
                        </div>

                        <div className="vale-card__viajes-lista">
                          {[...detalle.vale_material_viajes]
                            .sort((a, b) => a.numero_viaje - b.numero_viaje)
                            .map((viaje) => (
                              <div
                                key={viaje.id_viaje}
                                className="vale-card__viaje-item vale-card__viaje-item--material"
                              >
                                <span className="vale-card__viaje-numero">
                                  #{viaje.numero_viaje}
                                </span>
                                <span className="vale-card__viaje-hora">
                                  {viaje.hora_registro
                                    ? formatearHora(viaje.hora_registro)
                                    : "—"}
                                </span>
                                <span className="vale-card__viaje-folio">
                                  {viaje.folio_vale_fisico || "—"}
                                </span>
                                <span className="vale-card__viaje-ton">
                                  {viaje.peso_ton
                                    ? `${Number(viaje.peso_ton).toFixed(2)} ton`
                                    : "—"}
                                </span>
                                <span className="vale-card__viaje-m3">
                                  {viaje.volumen_m3
                                    ? formatearVolumen(Number(viaje.volumen_m3))
                                    : "—"}
                                </span>
                                <span className="vale-card__viaje-costo">
                                  {viaje.costo_viaje
                                    ? formatearMoneda(Number(viaje.costo_viaje))
                                    : "—"}
                                </span>
                              </div>
                            ))}
                        </div>

                        <div className="vale-card__viajes-totales">
                          <span className="vale-card__viajes-totales-label">
                            Subtotal viajes:
                          </span>
                          <span className="vale-card__viajes-totales-ton">
                            {detalle.vale_material_viajes
                              .reduce((s, v) => s + Number(v.peso_ton || 0), 0)
                              .toFixed(2)}{" "}
                            ton
                          </span>
                          <span className="vale-card__viajes-totales-costo">
                            {formatearMoneda(
                              detalle.vale_material_viajes.reduce(
                                (s, v) => s + Number(v.costo_viaje || 0),
                                0,
                              ),
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Total General del Vale */}
            {vale.vale_material_detalles?.length > 0 && (
              <div className="vale-card__total">
                <span className="vale-card__total-label">Total del Vale:</span>
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

export default ValeCardMaterial;
