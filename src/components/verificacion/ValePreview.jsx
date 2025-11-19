/**
 * src/components/verificacion/ValePreview.jsx
 *
 * Preview del vale encontrado antes de verificar
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

  // Calcular totales para vales de renta
  const rentaCalculos = useMemo(() => {
    if (vale.tipo_vale !== "renta" || !vale.vale_renta_detalle) {
      return null;
    }

    let totalHoras = 0;
    let totalDias = 0;
    let costoTotal = 0;

    vale.vale_renta_detalle.forEach((detalle) => {
      const horas = Number(detalle.total_horas || 0);
      const dias = Number(detalle.total_dias || 0);

      totalHoras += horas;
      totalDias += dias;

      // Usar el costo_total que viene de la BD, convertir a número
      costoTotal += Number(detalle.costo_total || 0);
    });

    return { totalHoras, totalDias, costoTotal };
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
          <FileText size={18} />
          <div>
            <span className="vale-preview__label">Folio</span>
            <span className="vale-preview__value">{vale.folio}</span>
          </div>
        </div>

        <div className="vale-preview__row">
          <Calendar size={18} />
          <div>
            <span className="vale-preview__label">Fecha de Emisión</span>
            <span className="vale-preview__value">
              {fecha} - {hora}
            </span>
          </div>
        </div>

        <div className="vale-preview__row">
          <Building2 size={18} />
          <div>
            <span className="vale-preview__label">Obra</span>
            <span className="vale-preview__value">{vale.obras?.obra}</span>
            <span className="vale-preview__subvalue">
              CC: {vale.obras?.cc} | {vale.obras?.empresas?.empresa}
            </span>
          </div>
        </div>

        <div className="vale-preview__row">
          <UserCheck size={18} />
          <div>
            <span className="vale-preview__label">Residente</span>
            <span className="vale-preview__value">
              {getNombreCompleto(vale.persona)}
            </span>
          </div>
        </div>

        <div className="vale-preview__row">
          <Package size={18} />
          <div>
            <span className="vale-preview__label">Tipo de Vale</span>
            <span className="vale-preview__value">{badgeTipo.label}</span>
          </div>
        </div>

        {vale.operadores && (
          <div className="vale-preview__row">
            <User size={18} />
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
            <Truck size={18} />
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
                <Package size={18} />
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
                <Package size={18} />
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
                <DollarSign size={18} />
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

        {/* Detalles de RENTA */}
        {vale.tipo_vale === "renta" && rentaCalculos && (
          <>
            {rentaCalculos.totalDias > 0 && (
              <div className="vale-preview__row">
                <Clock size={18} />
                <div>
                  <span className="vale-preview__label">Total Días</span>
                  <span className="vale-preview__value vale-preview__value--highlight">
                    {rentaCalculos.totalDias}{" "}
                    {rentaCalculos.totalDias === 1 ? "día" : "días"}
                  </span>
                </div>
              </div>
            )}

            {rentaCalculos.totalHoras > 0 && (
              <div className="vale-preview__row">
                <Clock size={18} />
                <div>
                  <span className="vale-preview__label">Total Horas</span>
                  <span className="vale-preview__value vale-preview__value--highlight">
                    {formatearDuracion(rentaCalculos.totalHoras)}
                  </span>
                </div>
              </div>
            )}

            <div className="vale-preview__row vale-preview__row--cost">
              <DollarSign size={18} />
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
        <AlertCircle size={16} />
        <p className="vale-preview__warning">
          Verifica que los datos coincidan con el PDF físico antes de confirmar
        </p>
      </div>
    </div>
  );
};

export default ValePreview;
