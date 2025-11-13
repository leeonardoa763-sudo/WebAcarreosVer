/**
 * src/components/vales/ValeCard.jsx
 *
 * Tarjeta individual de vale con información resumida
 *
 * Funcionalidades:
 * - Muestra folio, tipo, estado
 * - Información de obra y operador
 * - Fecha de creación
 * - Detalles según tipo (material o renta)
 * - Badges de estado y tipo
 * - Hover effect para indicar clickeable
 *
 * Usado en: ValesList.jsx
 */

// 1. React y hooks
import React from "react";

// 2. Icons
import {
  FileText,
  Calendar,
  Building2,
  User,
  Truck,
  Package,
  Clock,
} from "lucide-react";

// 3. Utils
import {
  formatearFechaCorta,
  getBadgeEstado,
  getBadgeTipo,
  formatearVolumen,
  formatearPeso,
  formatearDuracion,
  formatearFolio,
} from "../../utils/formatters";

const ValeCard = ({ vale, onClick }) => {
  const badgeEstado = getBadgeEstado(vale.estado);
  const badgeTipo = getBadgeTipo(vale.tipo_vale);

  /**
   * Renderizar detalles según tipo de vale
   */
  const renderDetalles = () => {
    if (vale.tipo_vale === "material") {
      // Calcular totales de material
      const totalM3 = vale.vale_material_detalles?.reduce(
        (sum, detalle) => sum + (detalle.cantidad_pedida_m3 || 0),
        0
      );
      const totalTon = vale.vale_material_detalles?.reduce(
        (sum, detalle) => sum + (detalle.peso_ton || 0),
        0
      );
      const cantidadDetalles = vale.vale_material_detalles?.length || 0;

      return (
        <div className="vale-card__detalles">
          <div className="vale-card__detalle-item">
            <Package size={14} className="vale-card__detalle-icon" />
            <span>
              {cantidadDetalles}{" "}
              {cantidadDetalles === 1 ? "material" : "materiales"}
            </span>
          </div>
          {totalM3 > 0 && (
            <div className="vale-card__detalle-item">
              <span>{formatearVolumen(totalM3)}</span>
            </div>
          )}
          {totalTon > 0 && (
            <div className="vale-card__detalle-item">
              <span>{formatearPeso(totalTon)}</span>
            </div>
          )}
        </div>
      );
    } else if (vale.tipo_vale === "renta") {
      // Calcular totales de renta
      const totalHoras = vale.vale_renta_detalle?.reduce(
        (sum, detalle) => sum + (detalle.total_horas || 0),
        0
      );
      const totalDias = vale.vale_renta_detalle?.reduce(
        (sum, detalle) => sum + (detalle.total_dias || 0),
        0
      );
      const cantidadDetalles = vale.vale_renta_detalle?.length || 0;

      return (
        <div className="vale-card__detalles">
          <div className="vale-card__detalle-item">
            <Clock size={14} className="vale-card__detalle-icon" />
            <span>
              {cantidadDetalles}{" "}
              {cantidadDetalles === 1 ? "servicio" : "servicios"}
            </span>
          </div>
          {totalHoras > 0 && (
            <div className="vale-card__detalle-item">
              <span>{formatearDuracion(totalHoras)}</span>
            </div>
          )}
          {totalDias > 0 && (
            <div className="vale-card__detalle-item">
              <span>
                {totalDias} {totalDias === 1 ? "día" : "días"}
              </span>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="vale-card" onClick={onClick}>
      {/* Header con folio y badges */}
      <div className="vale-card__header">
        <div className="vale-card__folio">
          <FileText size={16} />
          <span>{formatearFolio(vale.folio)}</span>
        </div>
        <div className="vale-card__badges">
          <span
            className="vale-card__badge"
            style={{
              color: badgeTipo.color,
              backgroundColor: badgeTipo.background,
            }}
          >
            {badgeTipo.label}
          </span>
          <span
            className="vale-card__badge"
            style={{
              color: badgeEstado.color,
              backgroundColor: badgeEstado.background,
            }}
          >
            {badgeEstado.label}
          </span>
        </div>
      </div>

      {/* Información principal */}
      <div className="vale-card__body">
        {/* Obra */}
        <div className="vale-card__info-row">
          <Building2 size={16} className="vale-card__icon" />
          <div className="vale-card__info-content">
            <span className="vale-card__info-label">Obra</span>
            <span className="vale-card__info-value">
              {vale.obras?.obra || "N/A"}
            </span>
          </div>
        </div>

        {/* Operador */}
        {vale.operadores && (
          <div className="vale-card__info-row">
            <User size={16} className="vale-card__icon" />
            <div className="vale-card__info-content">
              <span className="vale-card__info-label">Operador</span>
              <span className="vale-card__info-value">
                {vale.operadores.nombre_completo}
              </span>
            </div>
          </div>
        )}

        {/* Vehículo */}
        {vale.vehiculos && (
          <div className="vale-card__info-row">
            <Truck size={16} className="vale-card__icon" />
            <div className="vale-card__info-content">
              <span className="vale-card__info-label">Placas</span>
              <span className="vale-card__info-value">
                {vale.vehiculos.placas}
              </span>
            </div>
          </div>
        )}

        {/* Fecha de creación */}
        <div className="vale-card__info-row">
          <Calendar size={16} className="vale-card__icon" />
          <div className="vale-card__info-content">
            <span className="vale-card__info-label">Fecha</span>
            <span className="vale-card__info-value">
              {formatearFechaCorta(vale.fecha_creacion)}
            </span>
          </div>
        </div>
      </div>

      {/* Detalles específicos del tipo */}
      {renderDetalles()}

      {/* Footer con empresa */}
      <div className="vale-card__footer">
        <span className="vale-card__empresa">
          {vale.obras?.empresas?.empresa || "Sin empresa"}
        </span>
      </div>
    </div>
  );
};

export default ValeCard;
