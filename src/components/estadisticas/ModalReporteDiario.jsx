/**
 * src/components/estadisticas/ModalReporteDiario.jsx
 *
 * Vista previa en pantalla del Reporte Diario: KPIs del día con comparativa
 * vs. día anterior, desglose por material y por renta (agrupado por obra,
 * con su CC), eficiencia operativa y alertas de presupuestos por agotarse.
 * Incluye botón para exportar el mismo contenido a PDF.
 *
 * Dependencias: useReporteDiario, recharts, exportarReporteDiario, formatters
 * Usado en: EstadisticasGlobales.jsx
 */

// 1. React
import { useState, Fragment } from "react";

// 2. Iconos
import {
  X,
  Truck,
  Package,
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Award,
  Download,
  AlertTriangle,
} from "lucide-react";

// 3. Recharts
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

// 4. Hooks
import { useReporteDiario } from "../../hooks/useReporteDiario";

// 5. Utils
import { formatearMoneda, formatearNumero } from "../../utils/formatters";
import { generarPDFReporteDiario } from "../../utils/exportarReporteDiario";

// 6. Estilos
import "../../styles/reporte-diario.css";

const formatFechaLarga = (fechaStr) => {
  const fecha = new Date(`${fechaStr}T12:00:00`);
  return fecha.toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
};

// Etiqueta de obra con su CC al inicio: "CC 123 · Nombre de la obra"
const formatearObra = (obra, cc) => (cc != null ? `CC ${cc} · ${obra || "Sin obra"}` : obra || "Sin obra");

const KpiTile = ({ icon: Icon, label, value, comparativa, color }) => {
  const hasTrend = comparativa && typeof comparativa.pct === "number";
  return (
    <div className="rpd__kpi">
      <div className="rpd__kpi-icon" style={{ backgroundColor: `${color}20`, color }}>
        <Icon size={18} />
      </div>
      <div className="rpd__kpi-label">{label}</div>
      <div className="rpd__kpi-value">{value}</div>
      {hasTrend && (
        <div className={`rpd__kpi-trend rpd__kpi-trend--${comparativa.sube ? "up" : "down"}`}>
          {comparativa.sube ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{Math.abs(comparativa.pct)}% vs. ayer</span>
        </div>
      )}
    </div>
  );
};

const ModalReporteDiario = ({ presupuestosMaterial, presupuestosRenta, onClose }) => {
  const { fecha, setFecha, loading, error, kpis, comparativa, desgloseMaterial, desgloseRenta, eficiencia, refresh } =
    useReporteDiario();
  const [exportando, setExportando] = useState(false);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const alertasPresupuesto = [
    ...(presupuestosMaterial || []).flatMap((obraRow) =>
      (obraRow.materiales || [])
        .filter((m) => m.pctPresupuesto != null && m.pctPresupuesto >= 80)
        .map((m) => ({
          obra: formatearObra(obraRow.obra, obraRow.cc),
          concepto: m.material,
          pct: m.pctPresupuesto,
          consumido: `${formatearNumero(m.m3Total, 1)} m³`,
          presupuestado: `${formatearNumero(m.m3Presupuestado, 1)} m³`,
        }))
    ),
    ...(presupuestosRenta || [])
      .filter((r) => r.pctPresupuesto != null && r.pctPresupuesto >= 80)
      .map((r) => ({
        obra: formatearObra(r.obra, r.cc),
        concepto: "Renta de Equipo",
        pct: r.pctPresupuesto,
        consumido: formatearMoneda(r.subtotalSinIva),
        presupuestado: formatearMoneda(r.montoPresupuestado),
      })),
  ].sort((a, b) => b.pct - a.pct);

  const handleExportarPDF = () => {
    try {
      setExportando(true);
      generarPDFReporteDiario({
        fecha,
        fechaLabel: formatFechaLarga(fecha),
        kpis,
        comparativa,
        desgloseMaterial,
        desgloseRenta,
        eficiencia,
        alertasPresupuesto,
      });
    } catch (err) {
      console.error("Error al exportar reporte diario:", err);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="rpd__overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="rpd__modal">
        {/* Header */}
        <div className="rpd__header">
          <div className="rpd__header-left">
            <h2 className="rpd__title">Reporte Diario</h2>
            <p className="rpd__subtitle">Actividad operativa de un día específico</p>
          </div>
          <div className="rpd__header-actions">
            <input
              type="date"
              className="rpd__date-input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              aria-label="Seleccionar fecha del reporte"
            />
            <button className="rpd__export-btn" onClick={handleExportarPDF} disabled={loading || exportando}>
              <Download size={14} />
              {exportando ? "Generando…" : "Exportar PDF"}
            </button>
            <button className="rpd__close" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="rpd__body">
          <p className="rpd__fecha-label">{formatFechaLarga(fecha)}</p>

          {error && (
            <div className="rpd__error">
              <p>{error}</p>
              <button onClick={refresh}>Reintentar</button>
            </div>
          )}

          {loading ? (
            <div className="rpd__loading">Cargando reporte…</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="rpd__kpi-grid">
                <KpiTile
                  icon={Truck}
                  label="Vehículos Activos"
                  value={formatearNumero(kpis.vehiculosActivos, 0)}
                  comparativa={comparativa?.vehiculosActivos}
                  color="#004E89"
                />
                <KpiTile
                  icon={Package}
                  label="Material Movido"
                  value={`${formatearNumero(kpis.materialM3, 1)} m³`}
                  comparativa={comparativa?.materialM3}
                  color="#1A936F"
                />
                <KpiTile
                  icon={Activity}
                  label="Total de Viajes"
                  value={formatearNumero(kpis.totalViajes, 0)}
                  comparativa={comparativa?.totalViajes}
                  color="#FF6B35"
                />
                <KpiTile
                  icon={DollarSign}
                  label="Importe (+IVA)"
                  value={formatearMoneda(kpis.importeConIva)}
                  comparativa={comparativa?.importeConIva}
                  color="#8B5CF6"
                />
              </div>

              {/* Desglose por material */}
              <div className="rpd__section-header">
                <h3>Desglose por Material</h3>
                <p>Material movido el día seleccionado, agrupado por obra</p>
              </div>

              {desgloseMaterial.length === 0 ? (
                <div className="rpd__empty">Sin material registrado este día.</div>
              ) : (
                <div className="rpd__table-wrap">
                  <table className="rpd__table">
                    <thead>
                      <tr>
                        <th>Obra / Material</th>
                        <th className="rpd__table-right">Viajes</th>
                        <th className="rpd__table-right">M³ Total</th>
                        <th className="rpd__table-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {desgloseMaterial.map((obraRow) => (
                        <Fragment key={`obra-${obraRow.obra}-${obraRow.cc}`}>
                          <tr className="rpd__table-row--obra">
                            <td colSpan={4}>{formatearObra(obraRow.obra, obraRow.cc)}</td>
                          </tr>
                          {obraRow.materiales.map((m) => (
                            <tr key={`${obraRow.obra}-${obraRow.cc}-${m.material}`}>
                              <td className="rpd__table-indent">{m.material}</td>
                              <td className="rpd__table-right">{formatearNumero(m.viajes, 0)}</td>
                              <td className="rpd__table-right">{formatearNumero(m.m3Total, 2)} m³</td>
                              <td className="rpd__table-right">{formatearMoneda(m.importe)}</td>
                            </tr>
                          ))}
                          {obraRow.materiales.length > 1 && (
                            <tr className="rpd__table-row--subtotal">
                              <td className="rpd__table-indent">Subtotal</td>
                              <td className="rpd__table-right">{formatearNumero(obraRow.subtotal.viajes, 0)}</td>
                              <td className="rpd__table-right">{formatearNumero(obraRow.subtotal.m3Total, 2)} m³</td>
                              <td className="rpd__table-right">{formatearMoneda(obraRow.subtotal.importe)}</td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Desglose por renta */}
              <div className="rpd__section-header">
                <h3>Desglose por Renta</h3>
                <p>Renta de equipo el día seleccionado, agrupado por obra</p>
              </div>

              {desgloseRenta.length === 0 ? (
                <div className="rpd__empty">Sin renta de equipo registrada este día.</div>
              ) : (
                <div className="rpd__table-wrap">
                  <table className="rpd__table">
                    <thead>
                      <tr>
                        <th>Obra</th>
                        <th className="rpd__table-right">Vales</th>
                        <th className="rpd__table-right">Horas</th>
                        <th className="rpd__table-right">Días</th>
                        <th className="rpd__table-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {desgloseRenta.map((r) => (
                        <tr key={`renta-${r.obra}-${r.cc}`}>
                          <td>{formatearObra(r.obra, r.cc)}</td>
                          <td className="rpd__table-right">{formatearNumero(r.vales, 0)}</td>
                          <td className="rpd__table-right">{formatearNumero(r.horas, 1)}</td>
                          <td className="rpd__table-right">{formatearNumero(r.dias, 1)}</td>
                          <td className="rpd__table-right">{formatearMoneda(r.importe)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Eficiencia operativa */}
              <div className="rpd__section-header">
                <h3>Eficiencia Operativa</h3>
                <p>Tiempos entre viajes y distribución horaria</p>
              </div>

              <div className="rpd__eficiencia-grid">
                <div className="rpd__stat">
                  <Clock size={16} />
                  <div>
                    <div className="rpd__stat-value">
                      {eficiencia.tiempoPromedioEntreViajesMin != null
                        ? `${formatearNumero(eficiencia.tiempoPromedioEntreViajesMin, 0)} min`
                        : "—"}
                    </div>
                    <div className="rpd__stat-label">Promedio entre viajes</div>
                  </div>
                </div>
                <div className="rpd__stat">
                  <Package size={16} />
                  <div>
                    <div className="rpd__stat-value">{formatearNumero(eficiencia.m3PromedioPorViaje, 2)} m³</div>
                    <div className="rpd__stat-label">Promedio por viaje</div>
                  </div>
                </div>
                <div className="rpd__stat">
                  <Activity size={16} />
                  <div>
                    <div className="rpd__stat-value">{eficiencia.horaPico ? eficiencia.horaPico.label : "—"}</div>
                    <div className="rpd__stat-label">Hora pico de actividad</div>
                  </div>
                </div>
                <div className="rpd__stat">
                  <Award size={16} />
                  <div>
                    <div className="rpd__stat-value">{eficiencia.vehiculoTop ? eficiencia.vehiculoTop.placas : "—"}</div>
                    <div className="rpd__stat-label">Vehículo más productivo</div>
                  </div>
                </div>
              </div>

              <div className="rpd__chart-card rpd__chart-card--full">
                <h4>Viajes por Hora del Día</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={eficiencia.distribucionHoraria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" interval={2} tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: "rgba(15,25,35,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 11 }}
                    />
                    <Bar dataKey="viajes" fill="#FF6B35" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Presupuestos por agotarse */}
              <div className="rpd__section-header">
                <h3>Presupuestos por Agotarse</h3>
                <p>Conceptos con 80% o más de su presupuesto consumido (acumulado histórico)</p>
              </div>

              {alertasPresupuesto.length === 0 ? (
                <div className="rpd__empty rpd__empty--sano">Todos los presupuestos están en buen estado.</div>
              ) : (
                <div className="rpd__alertas">
                  {alertasPresupuesto.map((a, i) => (
                    <div key={`${a.obra}-${a.concepto}-${i}`} className={`rpd__alerta rpd__alerta--${a.pct > 100 ? "red" : "yellow"}`}>
                      <AlertTriangle size={16} />
                      <div className="rpd__alerta-info">
                        <div className="rpd__alerta-obra">{a.obra}</div>
                        <div className="rpd__alerta-concepto">{a.concepto}</div>
                        <div className="rpd__alerta-detalle">
                          {a.consumido} de {a.presupuestado}
                        </div>
                      </div>
                      <div className="rpd__alerta-pct">{Math.round(a.pct)}%</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalReporteDiario;
