/**
 * src/components/vales/ValesList.jsx
 *
 * Lista de vales con agrupación por mes, semana, obra y material
 *
 * Funcionalidades:
 * - Agrupar por mes y semana
 * - Dentro de semana, agrupar por obra
 * - Dentro de obra, agrupar por tipo de material (solo para material)
 * - Grupos colapsables/expandibles
 * - Tarjetas compactas con desplegable
 * - Accesibilidad completa con ARIA
 *
 * Usado en: Vales.jsx
 */

// 1. React y hooks
import { useState, useMemo } from "react";

// 2. Icons
import { ChevronDown, ChevronRight } from "lucide-react";

// 3. Utils
import { format, getWeek } from "date-fns";
import { es } from "date-fns/locale";

// 4. Componentes
import ValeCard from "./ValeCard";

const ValesList = ({ vales }) => {
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
   * Agrupar vales por mes, semana, obra y material
   */
  const valesAgrupados = useMemo(() => {
    const grupos = {};

    vales.forEach((vale) => {
      const fecha = new Date(vale.fecha_creacion);

      // Mes
      const mes = format(fecha, "MMMM yyyy", { locale: es });
      if (!grupos[mes]) grupos[mes] = {};

      // Semana (calculada con getWeek)
      const numeroSemana = getWeek(fecha, { weekStartsOn: 1 });
      const semana = `Semana ${numeroSemana}`;
      if (!grupos[mes][semana]) grupos[mes][semana] = {};

      // Obra dentro de semana
      const idObra = vale.id_obra;
      const nombreObra = vale.obras?.obra || "Sin obra";

      if (!grupos[mes][semana][idObra]) {
        grupos[mes][semana][idObra] = {
          nombre: nombreObra,
          empresa: vale.obras?.empresas?.empresa || "Sin empresa",
          materiales: {},
        };
      }

      // Material (solo para tipo material)
      if (vale.tipo_vale === "material") {
        const materialesDelVale = new Set();
        vale.vale_material_detalles?.forEach((detalle) => {
          const nombreMaterial = detalle.material?.material;
          if (nombreMaterial) materialesDelVale.add(nombreMaterial);
        });

        if (materialesDelVale.size > 0) {
          materialesDelVale.forEach((nombreMaterial) => {
            if (!grupos[mes][semana][idObra].materiales[nombreMaterial]) {
              grupos[mes][semana][idObra].materiales[nombreMaterial] = [];
            }
            grupos[mes][semana][idObra].materiales[nombreMaterial].push(vale);
          });
        } else {
          if (!grupos[mes][semana][idObra].materiales["Sin especificar"]) {
            grupos[mes][semana][idObra].materiales["Sin especificar"] = [];
          }
          grupos[mes][semana][idObra].materiales["Sin especificar"].push(vale);
        }
      } else {
        // Para renta, agrupar directamente
        if (!grupos[mes][semana][idObra].materiales["renta"]) {
          grupos[mes][semana][idObra].materiales["renta"] = [];
        }
        grupos[mes][semana][idObra].materiales["renta"].push(vale);
      }
    });

    return grupos;
  }, [vales]);

  /**
   * Calcular IDs de todos los grupos para colapsar al inicio
   */
  const todosLosGrupos = useMemo(() => {
    const ids = new Set();
    Object.entries(valesAgrupados).forEach(([mes, semanas]) => {
      Object.entries(semanas).forEach(([semana, obras]) => {
        Object.entries(obras).forEach(([idObra, obraData]) => {
          const groupKey = `${mes}-${semana}-${idObra}`;
          ids.add(groupKey);

          Object.keys(obraData.materiales).forEach((material) => {
            ids.add(`${groupKey}-${material}`);
          });
        });
      });
    });
    return ids;
  }, [valesAgrupados]);

  // Estado para grupos colapsados - todos colapsados al inicio
  const [collapsedGroups, setCollapsedGroups] = useState(todosLosGrupos);

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

  return (
    <div className="vales-list">
      {Object.keys(valesAgrupados).length === 0 ? (
        <p>No hay vales</p>
      ) : (
        Object.entries(valesAgrupados).map(([mes, semanas]) => (
          <div key={mes} className="vales-group-mes">
            <h2 className="vales-group-mes__title">{mes}</h2>

            {Object.entries(semanas).map(([semana, obras]) => (
              <div key={semana} className="vales-group-semana">
                <h3 className="vales-group-semana__title">{semana}</h3>

                {Object.entries(obras).map(([idObra, obraData]) => {
                  const groupKey = `${mes}-${semana}-${idObra}`;
                  const isObraCollapsed = isCollapsed(groupKey);
                  const color = getEmpresaColor(obraData.empresa);

                  return (
                    <div key={idObra} className="vales-group-obra">
                      <button
                        className="vales-group-obra__header"
                        onClick={() => toggleGroup(groupKey)}
                        style={{ borderLeftColor: color }}
                        aria-expanded={!isObraCollapsed}
                        type="button"
                      >
                        {isObraCollapsed ? (
                          <ChevronRight size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                        <div className="vales-group-obra__info">
                          <span className="vales-group-obra__nombre">
                            {obraData.nombre}
                          </span>
                          <span className="vales-group-obra__empresa">
                            {obraData.empresa}
                          </span>
                        </div>
                      </button>

                      {!isObraCollapsed && (
                        <div className="vales-group-obra__content">
                          {Object.entries(obraData.materiales).map(
                            ([material, valesMaterial]) => {
                              const materialKey = `${groupKey}-${material}`;
                              const isMaterialCollapsed =
                                isCollapsed(materialKey);

                              return (
                                <div
                                  key={material}
                                  className="vales-group-material"
                                >
                                  <button
                                    className="vales-group-material__header"
                                    onClick={() => toggleGroup(materialKey)}
                                    aria-expanded={!isMaterialCollapsed}
                                    type="button"
                                  >
                                    {isMaterialCollapsed ? (
                                      <ChevronRight size={16} />
                                    ) : (
                                      <ChevronDown size={16} />
                                    )}
                                    <span>{material}</span>
                                    <span className="vales-group-material__count">
                                      {valesMaterial.length}{" "}
                                      {valesMaterial.length === 1
                                        ? "vale"
                                        : "vales"}
                                    </span>
                                  </button>

                                  {!isMaterialCollapsed && (
                                    <div className="vales-group-material__vales">
                                      {valesMaterial.map((vale) => (
                                        <ValeCard
                                          key={vale.id_vale}
                                          vale={vale}
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
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default ValesList;
