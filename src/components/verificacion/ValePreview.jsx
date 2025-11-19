/**
 * src/components/verificacion/ValePreview.jsx
 *
 * Preview del vale encontrado antes de verificar
 *
 * Funcionalidades:
 * - Muestra información general del vale
 * - Para RENTA: usa lógica de es_renta_por_dia
 *   - Si es_renta_por_dia = true: muestra días
 *   - Si es_renta_por_dia = false: muestra horas
 * - Para MATERIAL: muestra volúmenes según tipo
 * - Costo total siempre de la BD
 */

// 1. React y hooks
import { useMemo } from "react";

// 2. Icons
import {
  FileText,
  Calendar,
  Building2,
  User,
  Truck,
  Package,
  Clock,
  DollarSign,
  UserCheck,
  AlertCircle,
} from "lucide-react";

// 3. Utils
import {
  formatearFechaHora,
  getBadgeEstado,
  getBadgeTipo,
  formatearVolumen,
  formatearMoneda,
  getNombreCompleto,
  formatearDuracion,
} from "../../utils/formatters";

const ValePreview = ({ vale }) => {
  const badgeEstado = getBadgeEstado(vale.estado);
  const badgeTipo = getBadgeTipo(vale.tipo_vale);
  const { fecha, hora } = formatearFechaHora(vale.fecha_creacion);

  // Calcular totales para vales de renta basado en es_renta_por_dia
  const rentaCalculos = useMemo(() => {
    if (vale.tipo_vale !== "renta" || !vale.vale_renta_detalle) {
      return null;
    }

    let totalHorasPorHora = 0; // Solo detalles con es_renta_por_dia = false
    let totalDiasPorDia = 0; // Solo detalles con es_renta_por_dia = true
    let costoTotal = 0;
    let tieneRentaPorDia = false;
    let tieneRentaPorHora = false;

    vale.vale_renta_detalle.forEach((detalle) => {
      const esRentaPorDia = detalle.es_renta_por_dia === true;

      if (esRentaPorDia) {
        // Sumar solo días de detalles que son por día
        totalDiasPorDia += Number(detalle.total_dias || 0);
        tieneRentaPorDia = true;
      } else {
        // Sumar solo horas de detalles que son por hora
        totalHorasPorHora += Number(detalle.total_horas || 0);
        tieneRentaPorHora = true;
      }

      // Siempre sumar el costo total de la BD
      costoTotal += Number(detalle.costo_total || 0);
    });

    return {
      totalHorasPorHora,
      totalDiasPorDia,
      costoTotal,
      tieneRentaPorDia,
      tieneRentaPorHora,
    };
  }, [vale]);

  // Calcular totales para vales de material
  const materialCalculos = useMemo(() => {
    if (vale.tipo_vale !== "material" || !vale.vale_material_detalles) {
      return null;
    }

    // Separar por tipo de material y convertir a número
    const totalM3Tipo3 = vale.vale_material_detalles
      .filter((d) => d.material?.tipo_de_material?.id_tipo_de_material === 3)
      .reduce((sum, d) => sum + Number(d.cantidad_pedida_m3 || 0), 0);

    const totalM3Otros = vale.vale_material_detalles
      .filter((d) => d.material?.tipo_de_material?.id_tipo_de_material !== 3)
      .reduce((sum, d) => sum + Number(d.volumen_real_m3 || 0), 0);

    // Usar el costo_total que viene de la BD, convertir a número
    const costoTotal = vale.vale_material_detalles.reduce(
      (sum, d) => sum + Number(d.costo_total || 0),
      0
    );

    return { totalM3Tipo3, totalM3Otros, costoTotal };
  }, [vale]);

  return (
    <div className="vale-preview">
      <div className="vale-preview__header">
        <h3 className="vale-preview__title">Vale Encontrado</h3>
        <span
          className="vale-preview__badge"
          style={{
            color: badgeEstado.color,
            backgroundColor: badgeEstado.background,
          }}
        >
          {badgeEstado.label}
        </span>
      </div>

      <div className="vale-preview__content">
        <div className="vale-preview__row">
          <FileText size={18} aria-hidden="true" />
          <div>
            <span className="vale-preview__label">Folio</span>
            <span className="vale-preview__value">{vale.folio}</span>
          </div>
        </div>

        <div className="vale-preview__row">
          <Calendar size={18} aria-hidden="true" />
          <div>
            <span className="vale-preview__label">Fecha de Emisión</span>
            <span className="vale-preview__value">
              {fecha} - {hora}
            </span>
          </div>
        </div>

        <div className="vale-preview__row">
          <Building2 size={18} aria-hidden="true" />
          <div>
            <span className="vale-preview__label">Obra</span>
            <span className="vale-preview__value">{vale.obras?.obra}</span>
            <span className="vale-preview__subvalue">
              CC: {vale.obras?.cc} | {vale.obras?.empresas?.empresa}
            </span>
          </div>
        </div>

        <div className="vale-preview__row">
          <UserCheck size={18} aria-hidden="true" />
          <div>
            <span className="vale-preview__label">Residente</span>
            <span className="vale-preview__value">
              {getNombreCompleto(vale.persona)}
            </span>
          </div>
        </div>

        <div className="vale-preview__row">
          <Package size={18} aria-hidden="true" />
          <div>
            <span className="vale-preview__label">Tipo de Vale</span>
            <span className="vale-preview__value">{badgeTipo.label}</span>
          </div>
        </div>

        {vale.operadores && (
          <div className="vale-preview__row">
            <User size={18} aria-hidden="true" />
            <div>
              <span className="vale-preview__label">Operador</span>
              <span className="vale-preview__value">
                {vale.operadores.nombre_completo}
              </span>
              {vale.operadores.sindicatos && (
                <span className="vale-preview__subvalue">
                  {vale.operadores.sindicatos.sindicato}
                </span>
              )}
            </div>
          </div>
        )}

        {vale.vehiculos && (
          <div className="vale-preview__row">
            <Truck size={18} aria-hidden="true" />
            <div>
              <span className="vale-preview__label">Placas</span>
              <span className="vale-preview__value">
                {vale.vehiculos.placas}
              </span>
            </div>
          </div>
        )}

        {/* Detalles de MATERIAL */}
        {vale.tipo_vale === "material" && materialCalculos && (
          <>
            {materialCalculos.totalM3Tipo3 > 0 && (
              <div className="vale-preview__row">
                <Package size={18} aria-hidden="true" />
                <div>
                  <span className="vale-preview__label">
                    Total M³ Pedidos (Tipo 3)
                  </span>
                  <span className="vale-preview__value vale-preview__value--highlight">
                    {formatearVolumen(materialCalculos.totalM3Tipo3)}
                  </span>
                </div>
              </div>
            )}

            {materialCalculos.totalM3Otros > 0 && (
              <div className="vale-preview__row">
                <Package size={18} aria-hidden="true" />
                <div>
                  <span className="vale-preview__label">
                    Total M³ Reales (Otros)
                  </span>
                  <span className="vale-preview__value vale-preview__value--highlight">
                    {formatearVolumen(materialCalculos.totalM3Otros)}
                  </span>
                </div>
              </div>
            )}

            {materialCalculos.costoTotal > 0 && (
              <div className="vale-preview__row vale-preview__row--cost">
                <DollarSign size={18} aria-hidden="true" />
                <div>
                  <span className="vale-preview__label">Costo Total</span>
                  <span className="vale-preview__value vale-preview__value--cost">
                    {formatearMoneda(materialCalculos.costoTotal)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Detalles de RENTA - Nueva lógica basada en es_renta_por_dia */}
        {vale.tipo_vale === "renta" && rentaCalculos && (
          <>
            {/* Mostrar días solo si hay rentas por día */}
            {rentaCalculos.tieneRentaPorDia &&
              rentaCalculos.totalDiasPorDia > 0 && (
                <div className="vale-preview__row">
                  <Clock size={18} aria-hidden="true" />
                  <div>
                    <span className="vale-preview__label">Total Días</span>
                    <span className="vale-preview__value vale-preview__value--highlight">
                      {rentaCalculos.totalDiasPorDia}{" "}
                      {rentaCalculos.totalDiasPorDia === 1 ? "día" : "días"}
                    </span>
                  </div>
                </div>
              )}

            {/* Mostrar horas solo si hay rentas por hora */}
            {rentaCalculos.tieneRentaPorHora &&
              rentaCalculos.totalHorasPorHora > 0 && (
                <div className="vale-preview__row">
                  <Clock size={18} aria-hidden="true" />
                  <div>
                    <span className="vale-preview__label">Total Horas</span>
                    <span className="vale-preview__value vale-preview__value--highlight">
                      {formatearDuracion(rentaCalculos.totalHorasPorHora)}
                    </span>
                  </div>
                </div>
              )}

            {/* Costo total siempre se muestra */}
            <div className="vale-preview__row vale-preview__row--cost">
              <DollarSign size={18} aria-hidden="true" />
              <div>
                <span className="vale-preview__label">Costo Total</span>
                <span className="vale-preview__value vale-preview__value--cost">
                  {formatearMoneda(rentaCalculos.costoTotal)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="vale-preview__footer">
        <AlertCircle size={16} aria-hidden="true" />
        <p className="vale-preview__warning">
          Verifica que los datos coincidan con el PDF físico antes de confirmar
        </p>
      </div>
    </div>
  );
};

export default ValePreview;
