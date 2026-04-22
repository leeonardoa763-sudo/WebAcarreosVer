/**
 * src/components/verificacion/BatchResults.jsx
 *
 * Muestra resultados del procesamiento masivo con detalles expandidos.
 * Para material: muestra por banco — distancia, tarifas, precio/m³, viajes, m³.
 * Para renta: muestra duración, viajes y costo.
 * Dependencias: date-fns, formatters, colors
 * Usado en: VerificarVales.jsx
 */

import {
  CheckCircle,
  AlertCircle,
  XCircle,
  FileCheck,
  Package,
  Clock,
  DollarSign,
  Truck,
  MapPin,
  Calendar,
} from "lucide-react";
import { getISOWeek } from "date-fns";
import { colors } from "../../config/colors";
import {
  formatearVolumen,
  formatearDuracion,
  formatearMoneda,
} from "../../utils/formatters";

const BatchResults = ({
  results,
  onConfirmVerification,
  onCancel,
  processing,
}) => {
  const { success, alreadyVerified, errors } = results;

  const calcularSemana = (vale) => {
    const fechaRef = vale.fecha_programada || vale.fecha_creacion;
    if (!fechaRef) return null;
    try {
      return getISOWeek(new Date(fechaRef.substring(0, 10) + "T12:00:00"));
    } catch {
      return null;
    }
  };

  const getMaterialInfo = (vale) => {
    if (!vale.vale_material_detalles?.length) return null;

    const grupos = [];

    vale.vale_material_detalles
      .filter(
        (d) =>
          Number(d.volumen_real_m3 ?? d.cantidad_pedida_m3 ?? 0) > 0 ||
          Number(d.costo_total ?? 0) > 0,
      )
      .forEach((d) => {
        const esTipo3 =
          d.material?.tipo_de_material?.id_tipo_de_material === 3;
        const labelM3 = esTipo3 ? "Pedidos" : "Reales";
        const viajes = d.vale_material_viajes ?? [];

        if (viajes.length === 0) {
          grupos.push({
            material: d.material?.material ?? "Sin especificar",
            banco: d.bancos?.banco ?? "Sin banco",
            distancia: Number(d.distancia_km ?? 0),
            precioM3: Number(d.precio_m3 ?? 0),
            tarifaPrimerKm: null,
            tarifaSubsecuente: null,
            numViajes: 0,
            m3: Number(d.volumen_real_m3 ?? d.cantidad_pedida_m3 ?? 0),
            labelM3,
            costo: Number(d.costo_total ?? 0),
          });
          return;
        }

        // Agrupar viajes por banco efectivo (override o default)
        const bancoMap = new Map();
        viajes.forEach((v) => {
          const key = v.id_banco_override ?? "default";
          if (!bancoMap.has(key)) {
            const esOverride = v.id_banco_override != null;
            bancoMap.set(key, {
              banco: esOverride
                ? (v.bancos_override?.banco ?? "Banco override")
                : (d.bancos?.banco ?? "Sin banco"),
              distancia: esOverride
                ? Number(v.distancia_km_override ?? d.distancia_km ?? 0)
                : Number(d.distancia_km ?? 0),
              precioM3: esOverride
                ? Number(v.precio_m3_override ?? 0)
                : Number(v.precio_m3 ?? d.precio_m3 ?? 0),
              tarifaPrimerKm:
                v.tarifa_primer_km != null
                  ? Number(v.tarifa_primer_km)
                  : null,
              tarifaSubsecuente:
                v.tarifa_subsecuente != null
                  ? Number(v.tarifa_subsecuente)
                  : null,
              viajes: [],
            });
          }
          bancoMap.get(key).viajes.push(v);
        });

        bancoMap.forEach((grupo) => {
          const costo = grupo.viajes.reduce(
            (s, v) =>
              s + Number(v.costo_viaje_override ?? v.costo_viaje ?? 0),
            0,
          );
          const m3 = grupo.viajes.reduce(
            (s, v) => s + Number(v.volumen_m3 ?? 0),
            0,
          );
          grupos.push({
            material: d.material?.material ?? "Sin especificar",
            banco: grupo.banco,
            distancia: grupo.distancia,
            precioM3: grupo.precioM3,
            tarifaPrimerKm: grupo.tarifaPrimerKm,
            tarifaSubsecuente: grupo.tarifaSubsecuente,
            numViajes: grupo.viajes.length,
            m3,
            labelM3,
            costo,
          });
        });
      });

    return grupos;
  };

  const getRentaInfo = (vale) => {
    if (!vale.vale_renta_detalle?.length) return null;

    const totalViajes = vale.vale_renta_detalle.reduce(
      (sum, d) => sum + (d.numero_viajes ?? 0),
      0,
    );

    let totalHorasPorHora = 0;
    let totalDiasPorDia = 0;
    let tieneRentaPorDia = false;
    let tieneRentaPorHora = false;

    vale.vale_renta_detalle.forEach((d) => {
      const totalDias = Number(d.total_dias ?? 0);
      if (totalDias > 0) {
        totalDiasPorDia += totalDias;
        tieneRentaPorDia = true;
      } else {
        totalHorasPorHora += Number(d.total_horas ?? 0);
        tieneRentaPorHora = true;
      }
    });

    let cantidad = "Pendiente";
    if (tieneRentaPorDia && totalDiasPorDia > 0) {
      cantidad =
        totalDiasPorDia === 0.5
          ? "0.5 días (medio día)"
          : `${totalDiasPorDia} ${totalDiasPorDia === 1 ? "día" : "días"}`;
      if (tieneRentaPorHora && totalHorasPorHora > 0)
        cantidad += ` + ${formatearDuracion(totalHorasPorHora)}`;
    } else if (tieneRentaPorHora && totalHorasPorHora > 0) {
      cantidad = formatearDuracion(totalHorasPorHora);
    }

    const costoTotal = vale.vale_renta_detalle.reduce(
      (sum, d) => sum + Number(d.costo_total ?? 0),
      0,
    );

    const detalles = vale.vale_renta_detalle.map((d) => ({
      material: d.material?.material ?? "Sin especificar",
      cantidad,
      totalViajes,
      costoPorHr: d.precios_renta?.costo_hr,
      costoPorDia: d.precios_renta?.costo_dia,
      costo: Number(d.costo_total ?? 0),
    }));

    return { detalles, costoTotal };
  };

  return (
    <div className="batch-results">
      <h3 className="batch-results__title">Resultados del Análisis</h3>

      <div className="batch-results__summary">
        <div className="batch-results__stat batch-results__stat--success">
          <CheckCircle size={24} />
          <div>
            <span className="batch-results__stat-value">{success.length}</span>
            <span className="batch-results__stat-label">
              Listos para verificar
            </span>
          </div>
        </div>

        <div className="batch-results__stat batch-results__stat--warning">
          <AlertCircle size={24} />
          <div>
            <span className="batch-results__stat-value">
              {alreadyVerified.length}
            </span>
            <span className="batch-results__stat-label">Ya verificados</span>
          </div>
        </div>

        <div className="batch-results__stat batch-results__stat--error">
          <XCircle size={24} />
          <div>
            <span className="batch-results__stat-value">{errors.length}</span>
            <span className="batch-results__stat-label">Con errores</span>
          </div>
        </div>
      </div>

      {success.length > 0 && (
        <div className="batch-results__section">
          <h4 className="batch-results__section-title">
            <CheckCircle size={18} style={{ color: colors.accent }} />
            Vales Listos ({success.length})
          </h4>
          <div className="batch-results__list">
            {success.map((item, index) => {
              const semana = calcularSemana(item.vale);
              const placas = item.vale.vehiculos?.placas;
              const esMaterial = item.vale.tipo_vale === "material";
              const materialInfo = esMaterial ? getMaterialInfo(item.vale) : null;
              const rentaInfo = !esMaterial ? getRentaInfo(item.vale) : null;
              const costoTotal = esMaterial
                ? (materialInfo?.reduce((s, d) => s + d.costo, 0) ?? 0)
                : (rentaInfo?.costoTotal ?? 0);

              return (
                <div
                  key={index}
                  className="batch-results__item batch-results__item--success"
                >
                  {/* Encabezado: folio + semana */}
                  <div className="batch-results__item-header">
                    <FileCheck size={16} />
                    <span className="batch-results__folio">{item.folio}</span>
                    {semana && (
                      <span className="batch-results__semana">
                        <Calendar size={12} />
                        Sem. {semana}
                      </span>
                    )}
                  </div>

                  <div className="batch-results__item-details">
                    {/* Obra */}
                    <div className="batch-results__detail">
                      <span className="batch-results__detail-label">Obra:</span>
                      <span className="batch-results__detail-value">
                        {item.vale.obras?.obra}
                      </span>
                    </div>

                    {/* Placas */}
                    <div className="batch-results__detail">
                      <Truck size={13} />
                      <span className="batch-results__detail-label">
                        Placas:
                      </span>
                      <span className="batch-results__detail-value">
                        {placas ?? "—"}
                      </span>
                    </div>

                    {/* Bloques por banco (material) */}
                    {esMaterial &&
                      materialInfo?.map((d, i) => (
                        <div key={i} className="batch-results__banco-block">
                          <div className="batch-results__banco-header">
                            <Package size={13} />
                            <span className="batch-results__banco-material">
                              {d.material}
                            </span>
                            <span className="batch-results__detail-label">
                              — {d.banco}
                            </span>
                          </div>

                          <div className="batch-results__banco-grid">
                            <div className="batch-results__banco-cell">
                              <MapPin size={11} />
                              <span className="batch-results__detail-label">
                                Dist:
                              </span>
                              <span className="batch-results__detail-value">
                                {d.distancia} km
                              </span>
                            </div>

                            {d.tarifaPrimerKm != null && (
                              <div className="batch-results__banco-cell">
                                <span className="batch-results__detail-label">
                                  1er km:
                                </span>
                                <span className="batch-results__detail-value">
                                  {formatearMoneda(d.tarifaPrimerKm)}/m³
                                </span>
                              </div>
                            )}

                            {d.tarifaSubsecuente != null && (
                              <div className="batch-results__banco-cell">
                                <span className="batch-results__detail-label">
                                  Subs:
                                </span>
                                <span className="batch-results__detail-value">
                                  {formatearMoneda(d.tarifaSubsecuente)}/m³
                                </span>
                              </div>
                            )}

                            <div className="batch-results__banco-cell">
                              <span className="batch-results__detail-label">
                                $/m³:
                              </span>
                              <span className="batch-results__detail-value batch-results__detail-value--highlight">
                                {formatearMoneda(d.precioM3)}
                              </span>
                            </div>

                            <div className="batch-results__banco-cell">
                              <span className="batch-results__detail-label">
                                Viajes:
                              </span>
                              <span className="batch-results__detail-value">
                                {d.numViajes}
                              </span>
                            </div>

                            <div className="batch-results__banco-cell">
                              <span className="batch-results__detail-label">
                                m³ ({d.labelM3}):
                              </span>
                              <span className="batch-results__detail-value batch-results__detail-value--highlight">
                                {formatearVolumen(d.m3)}
                              </span>
                            </div>

                            <div className="batch-results__banco-cell">
                              <DollarSign size={11} />
                              <span className="batch-results__detail-label">
                                Subtotal:
                              </span>
                              <span className="batch-results__detail-value">
                                {formatearMoneda(d.costo)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                    {/* Bloques por detalle (renta) */}
                    {!esMaterial &&
                      rentaInfo?.detalles.map((d, i) => (
                        <div key={i} className="batch-results__banco-block">
                          <div className="batch-results__banco-header">
                            <Clock size={13} />
                            <span className="batch-results__banco-material">
                              {d.material}
                            </span>
                          </div>

                          <div className="batch-results__banco-grid">
                            <div className="batch-results__banco-cell">
                              <span className="batch-results__detail-label">
                                Viajes:
                              </span>
                              <span className="batch-results__detail-value">
                                {d.totalViajes}
                              </span>
                            </div>

                            <div className="batch-results__banco-cell">
                              <span className="batch-results__detail-label">
                                Duración:
                              </span>
                              <span className="batch-results__detail-value batch-results__detail-value--highlight">
                                {d.cantidad}
                              </span>
                            </div>

                            {d.costoPorHr != null && (
                              <div className="batch-results__banco-cell">
                                <span className="batch-results__detail-label">
                                  $/hr:
                                </span>
                                <span className="batch-results__detail-value">
                                  {formatearMoneda(d.costoPorHr)}
                                </span>
                              </div>
                            )}

                            {d.costoPorDia != null && (
                              <div className="batch-results__banco-cell">
                                <span className="batch-results__detail-label">
                                  $/día:
                                </span>
                                <span className="batch-results__detail-value">
                                  {formatearMoneda(d.costoPorDia)}
                                </span>
                              </div>
                            )}

                            <div className="batch-results__banco-cell">
                              <DollarSign size={11} />
                              <span className="batch-results__detail-label">
                                Subtotal:
                              </span>
                              <span className="batch-results__detail-value">
                                {formatearMoneda(d.costo)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                    {/* Costo total (siempre) */}
                    {costoTotal > 0 && (
                      <div className="batch-results__detail batch-results__total">
                        <DollarSign size={14} />
                        <span className="batch-results__detail-label">
                          Costo Total:
                        </span>
                        <span className="batch-results__detail-value batch-results__detail-value--highlight">
                          {formatearMoneda(costoTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {alreadyVerified.length > 0 && (
        <div className="batch-results__section">
          <h4 className="batch-results__section-title">
            <AlertCircle size={18} style={{ color: colors.warning }} />
            Ya Verificados ({alreadyVerified.length})
          </h4>
          <div className="batch-results__list">
            {alreadyVerified.map((item, index) => (
              <div
                key={index}
                className="batch-results__item batch-results__item--warning"
              >
                <span className="batch-results__folio">{item.folio}</span>
                <span className="batch-results__message">
                  Este vale ya fue verificado anteriormente
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="batch-results__section">
          <h4 className="batch-results__section-title">
            <XCircle size={18} style={{ color: colors.error }} />
            Errores ({errors.length})
          </h4>
          <div className="batch-results__list">
            {errors.map((item, index) => (
              <div
                key={index}
                className="batch-results__item batch-results__item--error"
              >
                <span className="batch-results__folio">
                  {item.folio || item.fileName}
                </span>
                <span className="batch-results__error">{item.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="batch-results__actions">
        <button
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={processing}
        >
          Cancelar
        </button>

        {success.length > 0 && (
          <button
            onClick={() => onConfirmVerification(success)}
            disabled={processing}
            className="btn btn-primary"
            style={{ backgroundColor: colors.accent }}
          >
            {processing
              ? "Verificando..."
              : `Verificar ${success.length} Vale${success.length !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>
    </div>
  );
};

export default BatchResults;
