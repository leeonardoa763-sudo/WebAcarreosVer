/**
 * src/components/vales/ValesList.jsx
 *
 * Lista de vales con agrupación por tipo (Material/Renta) y por obra
 *
 * Funcionalidades:
 * - Agrupar primero por tipo de vale
 * - Dentro de cada tipo, agrupar por obra
 * - Dentro de obra/material, agrupar por tipo de material (solo para material)
 * - Grupos colapsables/expandibles
 * - Tarjetas compactas con desplegable
 * - Accesibilidad completa con ARIA
 *
 * Usado en: Vales.jsx
 */

// 1. React y hooks
import { useState, useMemo } from "react";

// 2. Icons
import { ChevronDown, ChevronRight, Package, Truck } from "lucide-react";

// 3. Componentes
import ValeCard from "./ValeCard";

const ValesList = ({ vales }) => {
  // Estado para grupos colapsados
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  /**
   * Obtener color según empresa
   */
  const getEmpresaColor = (nombreEmpresa) => {
    if (!nombreEmpresa) return "#7F8C8D";

    const empresa = nombreEmpresa.toUpperCase();
    if (empresa.includes("CAPAM")) return "#06B6D4"; // Cyan
    if (empresa.includes("TRIACO")) return "#F97316"; // Naranja
    if (empresa.includes("COEDESSA")) return "#EAB308"; // Amarillo
    return "#7F8C8D"; // Gris por defecto
  };

  /**
   * Agrupar vales por tipo, obra y material
   */
  const valesAgrupados = useMemo(() => {
    const grupos = {
      material: {},
      renta: {},
    };

    vales.forEach((vale) => {
      const tipo = vale.tipo_vale;
      const idObra = vale.id_obra;
      const nombreObra = vale.obras?.obra || "Sin obra";

      // Inicializar grupo de obra si no existe
      if (!grupos[tipo][idObra]) {
        grupos[tipo][idObra] = {
          nombre: nombreObra,
          empresa: vale.obras?.empresas?.empresa || "Sin empresa",
          vales: [],
          materiales: {}, // Solo para tipo material
        };
      }

      // Para material, agrupar también por tipo de material
      if (tipo === "material") {
        // Obtener todos los materiales únicos del vale
        const materialesDelVale = new Set();
        vale.vale_material_detalles?.forEach((detalle) => {
          const nombreMaterial = detalle.material?.material;
          if (nombreMaterial) {
            materialesDelVale.add(nombreMaterial);
          }
        });

        // Si tiene materiales, agregar a cada grupo
        if (materialesDelVale.size > 0) {
          materialesDelVale.forEach((nombreMaterial) => {
            if (!grupos[tipo][idObra].materiales[nombreMaterial]) {
              grupos[tipo][idObra].materiales[nombreMaterial] = [];
            }
            grupos[tipo][idObra].materiales[nombreMaterial].push(vale);
          });
        } else {
          // Si no tiene detalles pero es tipo material, crear grupo "Sin especificar"
          if (!grupos[tipo][idObra].materiales["Sin especificar"]) {
            grupos[tipo][idObra].materiales["Sin especificar"] = [];
          }
          grupos[tipo][idObra].materiales["Sin especificar"].push(vale);
        }
      } else {
        // Para renta, solo agregar al grupo de obra
        grupos[tipo][idObra].vales.push(vale);
      }
    });

    return grupos;
  }, [vales]);

  /**
   * Toggle collapse de grupo
   */
  const toggleGroup = (groupId) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  /**
   * Verificar si un grupo está colapsado
   */
  const isCollapsed = (groupId) => {
    return collapsedGroups.has(groupId);
  };

  /**
   * Renderizar grupo de vales de material
   */
  const renderMaterialGroup = () => {
    const materialObras = Object.entries(valesAgrupados.material);

    if (materialObras.length === 0) return null;

    const tipoGroupId = "material-tipo";
    const tipoCollapsed = isCollapsed(tipoGroupId);

    return (
      <div className="vales-group-tipo">
        <button
          className="vales-group-tipo__header"
          onClick={() => toggleGroup(tipoGroupId)}
          aria-expanded={!tipoCollapsed}
          aria-controls={tipoGroupId}
          aria-label={`${tipoCollapsed ? "Expandir" : "Contraer"} grupo de vales de material. ${Object.values(
            valesAgrupados.material
          ).reduce(
            (total, obra) =>
              total +
              Object.values(obra.materiales).reduce(
                (sum, vales) => sum + vales.length,
                0
              ),
            0
          )} vales`}
          type="button"
        >
          <div className="vales-group-tipo__title">
            {tipoCollapsed ? (
              <ChevronRight size={20} aria-hidden="true" />
            ) : (
              <ChevronDown size={20} aria-hidden="true" />
            )}
            <Package size={22} aria-hidden="true" />
            <h3>VALES DE MATERIAL</h3>
          </div>
          <span className="vales-group-tipo__count" aria-hidden="true">
            {Object.values(valesAgrupados.material).reduce(
              (total, obra) =>
                total +
                Object.values(obra.materiales).reduce(
                  (sum, vales) => sum + vales.length,
                  0
                ),
              0
            )}{" "}
            vales
          </span>
        </button>

        {!tipoCollapsed && (
          <div
            id={tipoGroupId}
            className="vales-group-tipo__content"
            role="region"
            aria-label="Contenido de vales de material"
          >
            {materialObras.map(([idObra, obraData]) => {
              const obraGroupId = `material-obra-${idObra}`;
              const obraCollapsed = isCollapsed(obraGroupId);
              const empresaColor = getEmpresaColor(obraData.empresa);

              return (
                <div key={`obra-${idObra}`} className="vales-group-obra">
                  <button
                    className="vales-group-obra__header"
                    onClick={() => toggleGroup(obraGroupId)}
                    style={{ borderLeft: `4px solid ${empresaColor}` }}
                    aria-expanded={!obraCollapsed}
                    aria-controls={obraGroupId}
                    aria-label={`${obraCollapsed ? "Expandir" : "Contraer"} obra ${obraData.nombre}. ${Object.values(
                      obraData.materiales
                    ).reduce((sum, vales) => sum + vales.length, 0)} vales`}
                    type="button"
                  >
                    <div className="vales-group-obra__title">
                      {obraCollapsed ? (
                        <ChevronRight size={18} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={18} aria-hidden="true" />
                      )}
                      <div>
                        <h4>{obraData.nombre}</h4>
                        <span className="vales-group-obra__empresa">
                          {obraData.empresa}
                        </span>
                      </div>
                    </div>
                    <span
                      className="vales-group-obra__count"
                      aria-hidden="true"
                    >
                      {Object.values(obraData.materiales).reduce(
                        (sum, vales) => sum + vales.length,
                        0
                      )}{" "}
                      vales
                    </span>
                  </button>

                  {!obraCollapsed && (
                    <div
                      id={obraGroupId}
                      className="vales-group-obra__content"
                      role="region"
                      aria-label={`Contenido de la obra ${obraData.nombre}`}
                    >
                      {Object.entries(obraData.materiales).map(
                        ([nombreMaterial, valesMaterial]) => {
                          const materialGroupId = `material-obra-${idObra}-${nombreMaterial}`;
                          const materialCollapsed =
                            isCollapsed(materialGroupId);

                          return (
                            <div
                              key={`material-${nombreMaterial}`}
                              className="vales-group-material"
                            >
                              <button
                                className="vales-group-material__header"
                                onClick={() => toggleGroup(materialGroupId)}
                                aria-expanded={!materialCollapsed}
                                aria-controls={materialGroupId}
                                aria-label={`${materialCollapsed ? "Expandir" : "Contraer"} material ${nombreMaterial}. ${valesMaterial.length} ${valesMaterial.length === 1 ? "vale" : "vales"}`}
                                type="button"
                              >
                                <div className="vales-group-material__title">
                                  {materialCollapsed ? (
                                    <ChevronRight
                                      size={16}
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <ChevronDown size={16} aria-hidden="true" />
                                  )}
                                  <span>{nombreMaterial}</span>
                                </div>
                                <span
                                  className="vales-group-material__count"
                                  aria-hidden="true"
                                >
                                  {valesMaterial.length}{" "}
                                  {valesMaterial.length === 1
                                    ? "vale"
                                    : "vales"}
                                </span>
                              </button>

                              {!materialCollapsed && (
                                <div
                                  id={materialGroupId}
                                  className="vales-group-material__content"
                                  role="region"
                                  aria-label={`Contenido de vales de material ${nombreMaterial}`}
                                >
                                  {valesMaterial.map((vale) => (
                                    <ValeCard
                                      key={vale.id_vale}
                                      vale={vale}
                                      empresaColor={empresaColor}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  /**
   * Renderizar grupo de vales de renta
   */
  const renderRentaGroup = () => {
    const rentaObras = Object.entries(valesAgrupados.renta);

    if (rentaObras.length === 0) return null;

    const tipoGroupId = "renta-tipo";
    const tipoCollapsed = isCollapsed(tipoGroupId);

    return (
      <div className="vales-group-tipo">
        <button
          className="vales-group-tipo__header"
          onClick={() => toggleGroup(tipoGroupId)}
          aria-expanded={!tipoCollapsed}
          aria-controls={tipoGroupId}
          aria-label={`${tipoCollapsed ? "Expandir" : "Contraer"} grupo de vales de renta. ${Object.values(
            valesAgrupados.renta
          ).reduce((total, obra) => total + obra.vales.length, 0)} vales`}
          type="button"
        >
          <div className="vales-group-tipo__title">
            {tipoCollapsed ? (
              <ChevronRight size={20} aria-hidden="true" />
            ) : (
              <ChevronDown size={20} aria-hidden="true" />
            )}
            <Truck size={22} aria-hidden="true" />
            <h3>VALES DE RENTA</h3>
          </div>
          <span className="vales-group-tipo__count" aria-hidden="true">
            {Object.values(valesAgrupados.renta).reduce(
              (total, obra) => total + obra.vales.length,
              0
            )}{" "}
            vales
          </span>
        </button>

        {!tipoCollapsed && (
          <div
            id={tipoGroupId}
            className="vales-group-tipo__content"
            role="region"
            aria-label="Contenido de vales de renta"
          >
            {rentaObras.map(([idObra, obraData]) => {
              const obraGroupId = `renta-obra-${idObra}`;
              const obraCollapsed = isCollapsed(obraGroupId);
              const empresaColor = getEmpresaColor(obraData.empresa);

              return (
                <div key={`obra-${idObra}`} className="vales-group-obra">
                  <button
                    className="vales-group-obra__header"
                    onClick={() => toggleGroup(obraGroupId)}
                    style={{ borderLeft: `4px solid ${empresaColor}` }}
                    aria-expanded={!obraCollapsed}
                    aria-controls={obraGroupId}
                    aria-label={`${obraCollapsed ? "Expandir" : "Contraer"} obra ${obraData.nombre}. ${obraData.vales.length} ${obraData.vales.length === 1 ? "vale" : "vales"}`}
                    type="button"
                  >
                    <div className="vales-group-obra__title">
                      {obraCollapsed ? (
                        <ChevronRight size={18} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={18} aria-hidden="true" />
                      )}
                      <div>
                        <h4>{obraData.nombre}</h4>
                        <span className="vales-group-obra__empresa">
                          {obraData.empresa}
                        </span>
                      </div>
                    </div>
                    <span
                      className="vales-group-obra__count"
                      aria-hidden="true"
                    >
                      {obraData.vales.length}{" "}
                      {obraData.vales.length === 1 ? "vale" : "vales"}
                    </span>
                  </button>

                  {!obraCollapsed && (
                    <div
                      id={obraGroupId}
                      className="vales-group-obra__content"
                      role="region"
                      aria-label={`Contenido de la obra ${obraData.nombre}`}
                    >
                      <div className="vales-group-material__content">
                        {obraData.vales.map((vale) => (
                          <ValeCard
                            key={vale.id_vale}
                            vale={vale}
                            empresaColor={empresaColor}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="vales-list-grouped">
      {renderMaterialGroup()}
      {renderRentaGroup()}
    </div>
  );
};

export default ValesList;
