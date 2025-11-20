/**
 * src/components/conciliaciones/TablaConciliacionRenta.jsx
 *
 * Tabla interactiva de vista previa de conciliación de renta
 *
 * Funcionalidades:
 * - Agrupación colapsable por placas
 * - Muestra detalles de cada vale
 * - Subtotales por grupo de placas
 *
 * Usado en: Conciliaciones.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import {
  ChevronDown,
  ChevronRight,
  Truck,
  FileText,
  Package,
} from "lucide-react";

// 3. Utils
import {
  formatearFechaCorta,
  formatearMoneda,
  formatearVolumen,
  formatearDuracion,
} from "../../utils/formatters";

const TablaConciliacionRenta = ({ valesAgrupados }) => {
  const [collapsed, setCollapsed] = useState({});

  const toggleGroup = (placas) => {
    setCollapsed((prev) => ({
      ...prev,
      [placas]: !prev[placas],
    }));
  };

  if (!valesAgrupados || Object.keys(valesAgrupados).length === 0) {
    return (
      <div className="tabla-conciliacion-empty">
        <FileText size={48} style={{ color: "#7F8C8D" }} aria-hidden="true" />
        <p>No hay vales para mostrar</p>
      </div>
    );
  }

  return (
    <div className="tabla-conciliacion">
      <div className="tabla-conciliacion__header">
        <h3 className="tabla-conciliacion__title">
          Vista Previa - Vales Agrupados
        </h3>
      </div>

      <div className="tabla-conciliacion__grupos">
        {Object.entries(valesAgrupados).map(([placas, grupo]) => {
          const isCollapsed = collapsed[placas];

          return (
            <div key={placas} className="grupo-placas">
              <button
                className="grupo-placas__header"
                onClick={() => toggleGroup(placas)}
                aria-expanded={!isCollapsed}
                aria-controls={`grupo-${placas}`}
                type="button"
              >
                <div className="grupo-placas__header-left">
                  {isCollapsed ? (
                    <ChevronRight size={20} aria-hidden="true" />
                  ) : (
                    <ChevronDown size={20} aria-hidden="true" />
                  )}
                  <Truck size={20} aria-hidden="true" />
                  <span className="grupo-placas__placas">{placas}</span>
                </div>

                <div className="grupo-placas__header-right">
                  <span className="grupo-placas__count">
                    {grupo.vales.length}{" "}
                    {grupo.vales.length === 1 ? "vale" : "vales"}
                  </span>
                  {grupo.totalDias > 0 && (
                    <span className="grupo-placas__stat">
                      {grupo.totalDias} {grupo.totalDias === 1 ? "día" : "días"}
                    </span>
                  )}
                  {grupo.totalHoras > 0 && (
                    <span className="grupo-placas__stat">
                      {formatearDuracion(grupo.totalHoras)}
                    </span>
                  )}
                  <span className="grupo-placas__subtotal">
                    {formatearMoneda(grupo.subtotal)}
                  </span>
                </div>
              </button>

              {!isCollapsed && (
                <div
                  id={`grupo-${placas}`}
                  className="grupo-placas__content"
                  role="region"
                  aria-label={`Detalles de vales del vehículo con placas ${placas}`}
                >
                  <table className="tabla-vales">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Folio</th>
                        <th>Material</th>
                        <th>Cap. (m³)</th>
                        <th>Viajes</th>
                        <th>Días</th>
                        <th>Horas</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.vales.map((vale) =>
                        vale.vale_renta_detalle.map((detalle, idx) => (
                          <tr key={`${vale.id_vale}-${idx}`}>
                            <td>{formatearFechaCorta(vale.fecha_creacion)}</td>
                            <td className="tabla-vales__folio">{vale.folio}</td>
                            <td>
                              <div className="tabla-vales__material">
                                <Package size={14} aria-hidden="true" />
                                <span>
                                  {detalle.material?.material || "N/A"}
                                </span>
                              </div>
                            </td>
                            <td>{formatearVolumen(detalle.capacidad_m3)}</td>
                            <td className="tabla-vales__viajes">
                              {detalle.numero_viajes}
                            </td>
                            <td className="tabla-vales__dias">
                              {detalle.total_dias || 0}
                            </td>
                            <td className="tabla-vales__horas">
                              {detalle.total_horas
                                ? formatearDuracion(detalle.total_horas)
                                : "0 hrs"}
                            </td>
                            <td className="tabla-vales__costo">
                              {formatearMoneda(detalle.costo_total || 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  <div className="grupo-placas__footer">
                    <span className="grupo-placas__footer-label">
                      Subtotal {placas}:
                    </span>
                    <span className="grupo-placas__footer-value">
                      {formatearMoneda(grupo.subtotal)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TablaConciliacionRenta;
