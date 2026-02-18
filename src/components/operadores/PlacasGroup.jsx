/**
 * src/components/operadores/PlacasGroup.jsx
 *
 * Componente para mostrar un grupo de placas con sus vales agrupados por estado y fecha
 *
 * Estructura:
 * - Header con placas y totales
 * - Grupos de estados (verificado, en_proceso, emitido, etc.)
 * - Dentro de cada estado, vales agrupados por fecha (colapsable)
 * - Al hacer click en un vale, se expande para mostrar detalles completos
 *
 * Dependencias: ValeCard (para mostrar detalle completo del vale)
 * Usado en: OperadoresList.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import {
  ChevronDown,
  ChevronRight,
  Truck,
  FileEdit,
  Clock,
  FileText,
  CheckCircle,
  DollarSign,
  FileCheck,
  Archive,
  HelpCircle,
  File,
} from "lucide-react";

// 3. Componentes
import ValeCard from "../vales/ValeCard";

const PlacasGroup = ({
  placas,
  vehiculoData,
  colorEmpresa,
  tipoVale,
  estaColapsado,
  onToggle,
  helpers,
}) => {
  // Estado para controlar qué vales están expandidos
  const [valesExpandidos, setValesExpandidos] = useState(new Set());

  // Estado para controlar qué grupos de fecha están colapsados
  const [fechasColapsadas, setFechasColapsadas] = useState(new Set());

  /**
   * Toggle expandir/colapsar grupo de fecha
   */
  const toggleFecha = (claveUnica) => {
    setFechasColapsadas((prev) => {
      const nuevoSet = new Set(prev);
      if (nuevoSet.has(claveUnica)) {
        nuevoSet.delete(claveUnica);
      } else {
        nuevoSet.add(claveUnica);
      }
      return nuevoSet;
    });
  };

  /**
   * Toggle expandir detalle de vale
   */
  const toggleVale = (idVale) => {
    setValesExpandidos((prev) => {
      const nuevoSet = new Set(prev);
      if (nuevoSet.has(idVale)) {
        nuevoSet.delete(idVale);
      } else {
        nuevoSet.add(idVale);
      }
      return nuevoSet;
    });
  };

  /**
   * Agrupar vales por fecha (yyyy-MM-dd) dentro de un estado
   * Devuelve array ordenado por fecha descendente
   */
  const agruparValesPorFecha = (vales) => {
    const grupos = {};

    vales.forEach((vale) => {
      const fechaClave = vale.fecha_creacion
        ? vale.fecha_creacion.split("T")[0]
        : "sin-fecha";

      if (!grupos[fechaClave]) {
        grupos[fechaClave] = [];
      }
      grupos[fechaClave].push(vale);
    });

    return Object.entries(grupos)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([fecha, valesDelDia]) => ({ fecha, valesDelDia }));
  };

  /**
   * Obtener componente de ícono según el estado
   */
  const obtenerIconoComponente = (estado) => {
    const iconos = {
      borrador: FileEdit,
      en_proceso: Clock,
      emitido: FileText,
      verificado: CheckCircle,
      pagado: DollarSign,
      conciliado: FileCheck,
      archivado: Archive,
      sin_estado: HelpCircle,
    };

    return iconos[estado] || File;
  };

  return (
    <div className="placas-group">
      {/* Header del grupo de placas */}
      <button
        type="button"
        className="placas-group__header"
        onClick={onToggle}
        style={{ borderLeftColor: colorEmpresa }}
        aria-expanded={!estaColapsado}
        aria-controls={`placas-content-${placas}`}
      >
        <div className="placas-group__header-left">
          {estaColapsado ? (
            <ChevronRight size={20} aria-hidden="true" />
          ) : (
            <ChevronDown size={20} aria-hidden="true" />
          )}
          <Truck size={20} aria-hidden="true" />
          <span className="placas-group__placas">{placas}</span>
        </div>

        <div className="placas-group__header-right">
          <span className="placas-group__stat">
            {vehiculoData.totalViajes}{" "}
            {vehiculoData.totalViajes === 1 ? "viaje" : "viajes"}
          </span>
          {tipoVale === "material" ? (
            <span className="placas-group__stat placas-group__stat--primary">
              {helpers.formatearNumero(vehiculoData.totalM3)} m³
            </span>
          ) : (
            <>
              <span className="placas-group__stat">
                {helpers.formatearNumero(vehiculoData.totalDias)} días
              </span>
              <span className="placas-group__stat placas-group__stat--primary">
                {helpers.formatearNumero(vehiculoData.totalHoras)} hrs
              </span>
            </>
          )}
        </div>
      </button>

      {/* Contenido: Estados → Fechas → Vales */}
      {!estaColapsado && (
        <div
          className="placas-group__content"
          id={`placas-content-${placas}`}
          role="region"
          aria-label={`Vales de ${placas}`}
        >
          {vehiculoData.porEstado.map((estadoGrupo) => {
            const IconoEstado = obtenerIconoComponente(estadoGrupo.estado);

            return (
              <div key={estadoGrupo.estado} className="estado-group-simple">
                {/* Header del estado */}
                <div className="estado-group-simple__header">
                  <IconoEstado
                    size={18}
                    aria-hidden="true"
                    style={{
                      color: helpers.obtenerColorEstado(estadoGrupo.estado),
                    }}
                  />
                  <span className="estado-group__nombre">
                    {helpers.obtenerEtiquetaEstado(estadoGrupo.estado)}
                  </span>
                  <span className="estado-group-simple__count">
                    ({estadoGrupo.totalViajes}{" "}
                    {estadoGrupo.totalViajes === 1 ? "vale" : "vales"})
                  </span>
                </div>

                {/* Vales agrupados por fecha */}
                <div className="estado-group-simple__vales">
                  {agruparValesPorFecha(estadoGrupo.vales).map(
                    ({ fecha, valesDelDia }) => {
                      const claveFecha = `${estadoGrupo.estado}-${placas}-${fecha}`;
                      const fechaColapsada = fechasColapsadas.has(claveFecha);
                      const nombreObra =
                        valesDelDia[0]?.obras?.obra || "Sin obra";

                      return (
                        <div key={claveFecha} className="fecha-group">
                          {/* Header colapsable por fecha */}
                          <button
                            type="button"
                            className="fecha-group__header"
                            onClick={() => toggleFecha(claveFecha)}
                            aria-expanded={!fechaColapsada}
                          >
                            <div className="fecha-group__header-left">
                              {fechaColapsada ? (
                                <ChevronRight size={16} aria-hidden="true" />
                              ) : (
                                <ChevronDown size={16} aria-hidden="true" />
                              )}
                              <span className="fecha-group__fecha">
                                {helpers.formatearFechaCorta(
                                  fecha + "T00:00:00",
                                )}
                              </span>
                            </div>
                            <div className="fecha-group__header-right">
                              <span className="fecha-group__obra">
                                {nombreObra}
                              </span>
                            </div>
                          </button>

                          {/* Lista de vales de esa fecha */}
                          {!fechaColapsada && (
                            <div className="fecha-group__vales">
                              {valesDelDia.map((vale) => {
                                const valeExpandido = valesExpandidos.has(
                                  vale.id_vale,
                                );

                                return (
                                  <div key={vale.id_vale} className="vale-item">
                                    <button
                                      type="button"
                                      className="vale-item__header"
                                      onClick={() => toggleVale(vale.id_vale)}
                                      aria-expanded={valeExpandido}
                                    >
                                      <div className="vale-item__header-left">
                                        {valeExpandido ? (
                                          <ChevronDown
                                            size={16}
                                            aria-hidden="true"
                                          />
                                        ) : (
                                          <ChevronRight
                                            size={16}
                                            aria-hidden="true"
                                          />
                                        )}
                                        <File size={14} aria-hidden="true" />
                                        <span className="vale-item__folio">
                                          {vale.folio}
                                        </span>
                                      </div>
                                    </button>

                                    {valeExpandido && (
                                      <div className="vale-item__content">
                                        <ValeCard vale={vale} />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlacasGroup;
