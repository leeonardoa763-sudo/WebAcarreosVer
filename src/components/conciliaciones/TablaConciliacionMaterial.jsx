/**
 * src/components/conciliaciones/TablaConciliacionMaterial.jsx
 *
 * Tabla interactiva de vista previa de conciliación de material
 *
 * Funcionalidades:
 * - Agrupación colapsable por placas
 * - Muestra detalles según tipo de material (1, 2 o 3)
 * - Subtotales por grupo de placas
 * - Columnas dinámicas según id_tipo_de_material
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
  formatearPeso,
} from "../../utils/formatters";

const TablaConciliacionMaterial = ({ valesAgrupados }) => {
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

  /**
   * Renderizar fila según tipo de material
   */
  const renderFilaDetalle = (vale, detalle, idx) => {
    const idTipo = detalle.material?.tipo_de_material?.id_tipo_de_material;

    // TIPO 1 y 2: Materiales Petreos
    if (idTipo === 1 || idTipo === 2) {
      return (
        <tr key={`${vale.id_vale}-${idx}`}>
          <td>{formatearFechaCorta(vale.fecha_creacion)}</td>
          <td className="tabla-vales__folio">{vale.folio}</td>
          <td className="tabla-vales__folio-banco">
            {detalle.folio_banco || "N/A"}
          </td>
          <td>
            <div className="tabla-vales__material">
              <Package size={14} aria-hidden="true" />
              <span>{detalle.material?.material || "N/A"}</span>
            </div>
          </td>
          <td>{detalle.bancos?.banco || "N/A"}</td>
          <td>{detalle.distancia_km?.toFixed(1) || 0} km</td>
          <td className="tabla-vales__viajes">1</td>
          <td>{formatearVolumen(detalle.volumen_real_m3)}</td>
          <td>{formatearPeso(detalle.peso_ton)}</td>
          <td className="tabla-vales__costo">
            {formatearMoneda(detalle.costo_total || 0)}
          </td>
        </tr>
      );
    }

    // TIPO 3: Producto de Corte
    if (idTipo === 3) {
      return (
        <tr key={`${vale.id_vale}-${idx}`}>
          <td>{formatearFechaCorta(vale.fecha_creacion)}</td>
          <td className="tabla-vales__folio">{vale.folio}</td>
          <td>
            <div className="tabla-vales__material">
              <Package size={14} aria-hidden="true" />
              <span>{detalle.material?.material || "N/A"}</span>
            </div>
          </td>
          <td>{formatearVolumen(detalle.distancia_km)} km</td>
          <td className="tabla-vales__viajes">1</td>
          <td>{formatearVolumen(detalle.capacidad_m3)}</td>
          <td>{formatearVolumen(detalle.cantidad_pedida_m3)}</td>
          <td className="tabla-vales__costo">
            {formatearMoneda(detalle.costo_total || 0)}
          </td>
        </tr>
      );
    }

    // Fallback si no coincide ningún tipo
    return null;
  };

  /**
   * Renderizar encabezados según tipo de material predominante
   */
  const renderEncabezados = (grupo) => {
    // Detectar si hay vales tipo 3
    const tieneTipo3 = grupo.vales.some((vale) =>
      vale.vale_material_detalles.some(
        (d) => d.material?.tipo_de_material?.id_tipo_de_material === 3
      )
    );

    // Detectar si hay vales tipo 1 o 2
    const tieneTipo1o2 = grupo.vales.some((vale) =>
      vale.vale_material_detalles.some((d) => {
        const idTipo = d.material?.tipo_de_material?.id_tipo_de_material;
        return idTipo === 1 || idTipo === 2;
      })
    );

    // Si tiene ambos tipos, mostrar encabezados completos
    if (tieneTipo1o2 && tieneTipo3) {
      return (
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Folio</th>
            <th>Folio Banco</th>
            <th>Material</th>
            <th>Banco</th>
            <th>Distancia</th>
            <th>Viajes</th>
            <th>Cap. (m³)</th>
            <th>Vol. Real (m³)</th>
            <th>M³ Pedidos</th>
            <th>Toneladas</th>
            <th>Importe</th>
          </tr>
        </thead>
      );
    }

    // Solo tipo 3
    if (tieneTipo3) {
      return (
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Folio</th>
            <th>Material</th>
            <th>Distancia</th>
            <th>Viajes</th>
            <th>Cap. (m³)</th>
            <th>M³ Pedidos</th>
            <th>Importe</th>
          </tr>
        </thead>
      );
    }

    // Solo tipo 1 o 2
    return (
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Folio</th>
          <th>Folio Banco</th>
          <th>Material</th>
          <th>Banco</th>
          <th>Distancia</th>
          <th>Viajes</th>
          <th>Vol. Real (m³)</th>
          <th>Toneladas</th>
          <th>Importe</th>
        </tr>
      </thead>
    );
  };

  return (
    <div className="tabla-conciliacion">
      <div className="tabla-conciliacion__header">
        <h3 className="tabla-conciliacion__title">
          Vista Previa - Vales Agrupados por Placas
        </h3>
      </div>

      <div className="tabla-conciliacion__grupos">
        {Object.entries(valesAgrupados).map(([placas, grupo]) => {
          const isCollapsed = collapsed[placas];
          const totalViajes =
            grupo.totalesTipo1.totalViajes +
            grupo.totalesTipo2.totalViajes +
            grupo.totalesTipo3.totalViajes;

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
                  <span className="grupo-placas__stat">
                    {totalViajes} {totalViajes === 1 ? "viaje" : "viajes"}
                  </span>
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
                    {renderEncabezados(grupo)}
                    <tbody>
                      {grupo.vales.map((vale) =>
                        vale.vale_material_detalles.map((detalle, idx) =>
                          renderFilaDetalle(vale, detalle, idx)
                        )
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

export default TablaConciliacionMaterial;
