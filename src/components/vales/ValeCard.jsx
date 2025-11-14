/**
 * src/components/vales/ValeCard.jsx
 *
 * Tarjeta compacta de vale con desplegable para detalles completos
 *
 * Funcionalidades:
 * - Vista compacta: folio, fecha, estado
 * - Desplegable: información completa del vale
 * - Distintivos por empresa (CAPAM cyan, TRIACO naranja, COEDESSA amarillo)
 * - Detalles específicos según tipo (material o renta)
 *
 * Usado en: ValesList.jsx
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
  Clock,
  UserCheck,
} from "lucide-react";

// 3. Utils
import {
  formatearFechaCorta,
  formatearFechaHora,
  getBadgeEstado,
  getBadgeTipo,
  formatearVolumen,
  formatearPeso,
  formatearDistancia,
  formatearDuracion,
  formatearFolio,
  formatearMoneda,
  getNombreCompleto,
} from "../../utils/formatters";

const ValeCard = ({ vale, empresaColor }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const badgeEstado = getBadgeEstado(vale.estado);
  const badgeTipo = getBadgeTipo(vale.tipo_vale);
  const { fecha, hora } = formatearFechaHora(vale.fecha_creacion);

  /**
   * Obtener nombre del residente
   */
  const getNombreResidente = () => {
    return getNombreCompleto(vale.persona);
  };

  /**
   * Renderizar detalles de material
   */
  const renderDetallesMaterial = () => {
    if (!vale.vale_material_detalles?.length) {
      return <p className="vale-card__no-data">Sin detalles de material</p>;
    }

    // Calcular total m3
    const totalM3 = vale.vale_material_detalles.reduce(
      (sum, detalle) => sum + (detalle.cantidad_pedida_m3 || 0),
      0
    );

    return (
      <div className="vale-card__detalles-section">
        <h4 className="vale-card__section-title">
          <Package size={16} />
          Detalles de Material
        </h4>

        {vale.vale_material_detalles.map((detalle, index) => (
          <div
            key={detalle.id_detalle_material}
            className="vale-card__detalle-material"
          >
            <div className="vale-card__detalle-header">
              <span className="vale-card__detalle-number">#{index + 1}</span>
              <span className="vale-card__detalle-material-name">
                {detalle.material?.material || "N/A"}
              </span>
            </div>

            <div className="vale-card__detalle-grid">
              <div className="vale-card__detalle-item-small">
                <span className="vale-card__detalle-label">Tipo:</span>
                <span className="vale-card__detalle-value">
                  {detalle.material?.tipo_de_material?.tipo_de_material ||
                    "N/A"}
                </span>
              </div>

              <div className="vale-card__detalle-item-small">
                <span className="vale-card__detalle-label">Banco:</span>
                <span className="vale-card__detalle-value">
                  {detalle.bancos?.banco || "N/A"}
                </span>
              </div>

              <div className="vale-card__detalle-item-small">
                <span className="vale-card__detalle-label">Capacidad:</span>
                <span className="vale-card__detalle-value">
                  {formatearVolumen(detalle.capacidad_m3 || 0)}
                </span>
              </div>

              <div className="vale-card__detalle-item-small">
                <span className="vale-card__detalle-label">Distancia:</span>
                <span className="vale-card__detalle-value">
                  {formatearDistancia(detalle.distancia_km || 0)}
                </span>
              </div>

              <div className="vale-card__detalle-item-small">
                <span className="vale-card__detalle-label">M³ Pedidos:</span>
                <span className="vale-card__detalle-value highlight">
                  {formatearVolumen(detalle.cantidad_pedida_m3 || 0)}
                </span>
              </div>

              {detalle.peso_ton && (
                <div className="vale-card__detalle-item-small">
                  <span className="vale-card__detalle-label">Peso:</span>
                  <span className="vale-card__detalle-value">
                    {formatearPeso(detalle.peso_ton)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Total M3 */}
        <div className="vale-card__total">
          <span className="vale-card__total-label">Total M³ Pedidos:</span>
          <span className="vale-card__total-value">
            {formatearVolumen(totalM3)}
          </span>
        </div>
      </div>
    );
  };

  /**
   * Renderizar detalles de renta
   */
  const renderDetallesRenta = () => {
    if (!vale.vale_renta_detalle?.length) {
      return <p className="vale-card__no-data">Sin detalles de renta</p>;
    }

    // Calcular totales
    const totalHoras = vale.vale_renta_detalle.reduce(
      (sum, detalle) => sum + (detalle.total_horas || 0),
      0
    );
    const totalDias = vale.vale_renta_detalle.reduce(
      (sum, detalle) => sum + (detalle.total_dias || 0),
      0
    );
    const costoTotal = vale.vale_renta_detalle.reduce(
      (sum, detalle) => sum + (detalle.costo_total || 0),
      0
    );

    return (
      <div className="vale-card__detalles-section">
        <h4 className="vale-card__section-title">
          <Clock size={16} />
          Detalles de Renta
        </h4>

        {vale.vale_renta_detalle.map((detalle, index) => (
          <div
            key={detalle.id_vale_renta_detalle}
            className="vale-card__detalle-renta"
          >
            <div className="vale-card__detalle-header">
              <span className="vale-card__detalle-number">#{index + 1}</span>
              <span className="vale-card__detalle-material-name">
                {detalle.material?.material || "N/A"}
              </span>
            </div>

            <div className="vale-card__detalle-grid">
              <div className="vale-card__detalle-item-small">
                <span className="vale-card__detalle-label">Capacidad:</span>
                <span className="vale-card__detalle-value">
                  {formatearVolumen(detalle.capacidad_m3 || 0)}
                </span>
              </div>

              <div className="vale-card__detalle-item-small">
                <span className="vale-card__detalle-label">Núm. Viajes:</span>
                <span className="vale-card__detalle-value">
                  {detalle.numero_viajes || 0}
                </span>
              </div>

              {detalle.hora_inicio && (
                <div className="vale-card__detalle-item-small">
                  <span className="vale-card__detalle-label">Hora Inicio:</span>
                  <span className="vale-card__detalle-value">
                    {new Date(detalle.hora_inicio).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              )}

              {detalle.hora_fin && (
                <div className="vale-card__detalle-item-small">
                  <span className="vale-card__detalle-label">Hora Fin:</span>
                  <span className="vale-card__detalle-value">
                    {new Date(detalle.hora_fin).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              )}

              {detalle.total_horas > 0 && (
                <div className="vale-card__detalle-item-small">
                  <span className="vale-card__detalle-label">Total Horas:</span>
                  <span className="vale-card__detalle-value highlight">
                    {formatearDuracion(detalle.total_horas)}
                  </span>
                </div>
              )}

              {detalle.total_dias > 0 && (
                <div className="vale-card__detalle-item-small">
                  <span className="vale-card__detalle-label">Total Días:</span>
                  <span className="vale-card__detalle-value highlight">
                    {detalle.total_dias}{" "}
                    {detalle.total_dias === 1 ? "día" : "días"}
                  </span>
                </div>
              )}

              {detalle.precios_renta && (
                <>
                  <div className="vale-card__detalle-item-small">
                    <span className="vale-card__detalle-label">
                      Tarifa/Hora:
                    </span>
                    <span className="vale-card__detalle-value">
                      {formatearMoneda(detalle.precios_renta.costo_hr)}
                    </span>
                  </div>

                  <div className="vale-card__detalle-item-small">
                    <span className="vale-card__detalle-label">
                      Tarifa/Día:
                    </span>
                    <span className="vale-card__detalle-value">
                      {formatearMoneda(detalle.precios_renta.costo_dia)}
                    </span>
                  </div>
                </>
              )}

              <div className="vale-card__detalle-item-small full-width">
                <span className="vale-card__detalle-label">Costo Total:</span>
                <span className="vale-card__detalle-value cost">
                  {formatearMoneda(detalle.costo_total || 0)}
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
          </div>
        ))}

        {/* Totales */}
        <div className="vale-card__totales-renta">
          {totalHoras > 0 && (
            <div className="vale-card__total">
              <span className="vale-card__total-label">Total Horas:</span>
              <span className="vale-card__total-value">
                {formatearDuracion(totalHoras)}
              </span>
            </div>
          )}
          {totalDias > 0 && (
            <div className="vale-card__total">
              <span className="vale-card__total-label">Total Días:</span>
              <span className="vale-card__total-value">
                {totalDias} {totalDias === 1 ? "día" : "días"}
              </span>
            </div>
          )}
          <div className="vale-card__total">
            <span className="vale-card__total-label">Costo Total:</span>
            <span className="vale-card__total-value cost">
              {formatearMoneda(costoTotal)}
            </span>
          </div>
        </div>
      </div>
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
            <FileText size={16} />
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

        <button className="vale-card-compact__toggle" aria-label="Ver detalles">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Detalles expandidos */}
      {isExpanded && (
        <div className="vale-card-compact__body">
          {/* Información general */}
          <div className="vale-card__info-general">
            <div className="vale-card__info-row-expanded">
              <Building2 size={16} className="vale-card__icon" />
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
              <Calendar size={16} className="vale-card__icon" />
              <div>
                <span className="vale-card__label">Fecha de Creación:</span>
                <span className="vale-card__value">
                  {fecha} a las {hora}
                </span>
              </div>
            </div>

            <div className="vale-card__info-row-expanded">
              <UserCheck size={16} className="vale-card__icon" />
              <div>
                <span className="vale-card__label">Residente:</span>
                <span className="vale-card__value">{getNombreResidente()}</span>
              </div>
            </div>

            {vale.operadores && (
              <div className="vale-card__info-row-expanded">
                <User size={16} className="vale-card__icon" />
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
                <Truck size={16} className="vale-card__icon" />
                <div>
                  <span className="vale-card__label">Placas:</span>
                  <span className="vale-card__value">
                    {vale.vehiculos.placas}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Detalles específicos según tipo */}
          {vale.tipo_vale === "material" && renderDetallesMaterial()}
          {vale.tipo_vale === "renta" && renderDetallesRenta()}
        </div>
      )}
    </div>
  );
};

export default ValeCard;
