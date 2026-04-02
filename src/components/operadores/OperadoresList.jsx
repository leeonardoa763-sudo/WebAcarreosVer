/**
 * src/components/operadores/OperadoresList.jsx
 *
 * Lista de vales agrupados por empresa, en tabla plana ordenada por fecha.
 *
 * Estructura:
 * - Empresa (header colapsable con totales)
 * - Tabla de todos sus vales ordenados por fecha descendente
 * - Clic en fila expande ValeCard completo inline
 *
 * Dependencias: ValeCard
 * Usado en: pages/Operadores.jsx
 */

// 1. React y hooks
import React, { useState, useMemo } from "react";

// 2. Icons
import { ChevronDown, ChevronRight, Building2 } from "lucide-react";

// 3. Componentes
import ValeCard from "../vales/ValeCard";

const OperadoresList = ({
  datos,
  tipoVale,
  toggleGrupo,
  estaColapsado,
  helpers,
}) => {
  // Controla qué filas de vale están expandidas (id_vale)
  const [valesExpandidos, setValesExpandidos] = useState(new Set());

  const hayDatos = useMemo(() => datos && datos.length > 0, [datos]);

  /**
   * Aplanar todos los vales de una empresa en un array
   * ordenado por fecha efectiva descendente.
   */
  const aplanarValesEmpresa = (empresa) => {
    const vales = [];

    empresa.vehiculos.forEach((vehiculo) => {
      vehiculo.porEstado.forEach((estadoGrupo) => {
        estadoGrupo.vales.forEach((vale) => {
          vales.push({
            ...vale,
            // Adjuntar placas al vale para mostrar en tabla
            _placas: vehiculo.placas,
          });
        });
      });
    });

    // Ordenar por fecha efectiva descendente
    return vales.sort((a, b) => {
      const fechaA = a.fecha_programada || a.fecha_creacion || "";
      const fechaB = b.fecha_programada || b.fecha_creacion || "";
      return fechaB.localeCompare(fechaA);
    });
  };

  /**
   * Toggle expandir/colapsar fila de vale
   */
  const toggleVale = (idVale) => {
    setValesExpandidos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(idVale)) {
        nuevo.delete(idVale);
      } else {
        nuevo.add(idVale);
      }
      return nuevo;
    });
  };

  if (!hayDatos) {
    return (
      <div className="operadores-list-empty">
        <p>No hay datos para mostrar</p>
      </div>
    );
  }

  return (
    <div className="operadores-list">
      {datos.map((empresa) => {
        const empresaId = `empresa-${empresa.id_empresa}`;
        const empresaColapsada = estaColapsado(empresaId);
        const colorEmpresa = helpers.obtenerColorEmpresa(
          empresa.nombre_empresa,
        );
        const valesPlanos = aplanarValesEmpresa(empresa);

        return (
          <div key={empresa.id_empresa} className="empresa-group">
            {/* ── Header de empresa ── */}
            <button
              type="button"
              className="empresa-group__header"
              onClick={() => toggleGrupo(empresaId)}
              style={{ borderLeftColor: colorEmpresa, borderLeftWidth: "4px" }}
              aria-expanded={!empresaColapsada}
              aria-controls={`empresa-content-${empresa.id_empresa}`}
            >
              <div className="empresa-group__header-left">
                {empresaColapsada ? (
                  <ChevronRight size={20} aria-hidden="true" />
                ) : (
                  <ChevronDown size={20} aria-hidden="true" />
                )}
                <Building2
                  size={20}
                  aria-hidden="true"
                  style={{ color: colorEmpresa }}
                />
                <span className="empresa-group__nombre">
                  {empresa.nombre_empresa}
                </span>
              </div>

              <div className="empresa-group__header-right">
                <span className="empresa-group__stat">
                  {empresa.totalVehiculos}{" "}
                  {empresa.totalVehiculos === 1 ? "vehículo" : "vehículos"}
                </span>
                <span className="empresa-group__stat">
                  {empresa.totalViajes}{" "}
                  {empresa.totalViajes === 1 ? "viaje" : "viajes"}
                </span>
                {tipoVale === "material" ? (
                  <span className="empresa-group__stat empresa-group__stat--primary">
                    {helpers.formatearNumero(empresa.totalM3)} m³
                  </span>
                ) : (
                  <>
                    <span className="empresa-group__stat">
                      {helpers.formatearNumero(empresa.totalDias)} días
                    </span>
                    <span className="empresa-group__stat empresa-group__stat--primary">
                      {helpers.formatearNumero(empresa.totalHoras)} hrs
                    </span>
                  </>
                )}
              </div>
            </button>

            {/* ── Tabla de vales ── */}
            {!empresaColapsada && (
              <div
                id={`empresa-content-${empresa.id_empresa}`}
                className="empresa-group__content"
              >
                {valesPlanos.length === 0 ? (
                  <p className="operadores-table__empty">
                    Sin vales registrados
                  </p>
                ) : (
                  <table className="operadores-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Folio</th>
                        <th>Placas</th>
                        <th>Obra</th>
                        <th>Operador</th>
                        <th>Estado</th>
                        {tipoVale === "material" ? (
                          <th className="operadores-table__col-num">M³</th>
                        ) : (
                          <>
                            <th className="operadores-table__col-num">Días</th>
                            <th className="operadores-table__col-num">Hrs</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {valesPlanos.map((vale) => {
                        const expandido = valesExpandidos.has(vale.id_vale);

                        // Fecha efectiva (programada o creacion)
                        const fechaRaw =
                          vale.fecha_programada || vale.fecha_creacion || "";
                        const fechaStr = fechaRaw
                          ? fechaRaw
                              .substring(0, 10)
                              .split("-")
                              .reverse()
                              .join("/")
                          : "—";

                        // Color de estado
                        const colorEstado = helpers.obtenerColorEstado(
                          vale.estado,
                        );
                        const etiquetaEstado = helpers.obtenerEtiquetaEstado(
                          vale.estado,
                        );

                        // Totales por fila
                        let totalM3 = null;
                        let totalDias = null;
                        let totalHoras = null;

                        if (tipoVale === "material") {
                          totalM3 = (vale.vale_material_detalles || []).reduce(
                            (sum, d) => {
                              const esTipo3 =
                                d.material?.tipo_de_material
                                  ?.id_tipo_de_material === 3;
                              return (
                                sum +
                                Number(
                                  esTipo3
                                    ? d.cantidad_pedida_m3
                                    : d.volumen_real_m3 || 0,
                                )
                              );
                            },
                            0,
                          );
                        } else {
                          totalDias = (vale.vale_renta_detalle || []).reduce(
                            (sum, d) => sum + Number(d.total_dias || 0),
                            0,
                          );
                          totalHoras = (vale.vale_renta_detalle || []).reduce(
                            (sum, d) => sum + Number(d.total_horas || 0),
                            0,
                          );
                        }

                        return (
                          <React.Fragment key={vale.id_vale}>
                            {/* ── Fila del vale ── */}
                            <tr
                              className={`operadores-table__row ${expandido ? "operadores-table__row--expanded" : ""}`}
                              onClick={() => toggleVale(vale.id_vale)}
                              aria-expanded={expandido}
                            >
                              <td className="operadores-table__fecha">
                                {fechaStr}
                              </td>
                              <td className="operadores-table__folio">
                                {vale.folio}
                              </td>
                              <td className="operadores-table__placas">
                                {vale._placas}
                              </td>
                              <td className="operadores-table__obra">
                                {vale.obras?.obra || "—"}
                              </td>
                              <td className="operadores-table__operador">
                                {vale.operadores?.nombre_completo || "—"}
                              </td>
                              <td>
                                <span
                                  className="operadores-table__estado-badge"
                                  style={{
                                    color: colorEstado,
                                    borderColor: colorEstado,
                                  }}
                                >
                                  {etiquetaEstado}
                                </span>
                              </td>
                              {tipoVale === "material" ? (
                                <td className="operadores-table__col-num">
                                  {totalM3 > 0
                                    ? helpers.formatearNumero(totalM3)
                                    : "—"}
                                </td>
                              ) : (
                                <>
                                  <td className="operadores-table__col-num">
                                    {totalDias > 0
                                      ? helpers.formatearNumero(totalDias)
                                      : "—"}
                                  </td>
                                  <td className="operadores-table__col-num">
                                    {totalHoras > 0
                                      ? helpers.formatearNumero(totalHoras)
                                      : "—"}
                                  </td>
                                </>
                              )}
                            </tr>

                            {/* ── ValeCard expandido inline ── */}
                            {expandido && (
                              <tr className="operadores-table__row-card">
                                <td
                                  colSpan={tipoVale === "material" ? 7 : 8}
                                  className="operadores-table__card-cell"
                                >
                                  <ValeCard
                                    vale={vale}
                                    empresaColor={colorEmpresa}
                                  />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OperadoresList;
