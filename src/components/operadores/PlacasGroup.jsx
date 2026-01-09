/**
 * src/components/operadores/PlacasGroup.jsx
 *
 * Componente para mostrar un grupo de placas con sus vales agrupados por estado
 *
 * Estructura:
 * - Header con placas y totales
 * - Grupos de estados (verificado, en_proceso, emitido, etc.)
 * - Lista de vales por estado (ordenados por fecha)
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
  // Estado para controlar qué estados están colapsados
  const [estadosColapsados, setEstadosColapsados] = useState(new Set());

  // Estado para controlar qué vales están expandidos
  const [valesExpandidos, setValesExpandidos] = useState(new Set());

  /**
   * Toggle colapsar estado
   */
  const toggleEstado = (estado) => {
    setEstadosColapsados((prev) => {
      const nuevoSet = new Set(prev);
      if (nuevoSet.has(estado)) {
        nuevoSet.delete(estado);
      } else {
        nuevoSet.add(estado);
      }
      return nuevoSet;
    });
  };

  /**
   * Toggle expandir vale
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

    const IconoComponente = iconos[estado] || File;
    return IconoComponente;
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

      {/* Contenido: Estados y vales */}
      {!estaColapsado && (
        <div
          className="placas-group__content"
          id={`placas-content-${placas}`}
          role="region"
          aria-label={`Vales de ${placas}`}
        >
          {vehiculoData.porEstado.map((estadoGrupo) => {
            const IconoEstado = obtenerIconoComponente(estadoGrupo.estado);
            const estadoColapsado = estadosColapsados.has(estadoGrupo.estado);

            return (
              <div key={estadoGrupo.estado} className="estado-group">
                {/* Header del estado */}
                <button
                  type="button"
                  className="estado-group__header"
                  onClick={() => toggleEstado(estadoGrupo.estado)}
                  style={{
                    borderLeftColor: helpers.obtenerColorEstado(
                      estadoGrupo.estado
                    ),
                  }}
                  aria-expanded={!estadoColapsado}
                  aria-controls={`estado-content-${placas}-${estadoGrupo.estado}`}
                >
                  <div className="estado-group__header-left">
                    {estadoColapsado ? (
                      <ChevronRight size={18} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={18} aria-hidden="true" />
                    )}
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
                  </div>

                  <div className="estado-group__header-right">
                    <span className="estado-group__stat">
                      {estadoGrupo.totalViajes}{" "}
                      {estadoGrupo.totalViajes === 1 ? "vale" : "vales"}
                    </span>
                    {tipoVale === "material" ? (
                      <span className="estado-group__stat estado-group__stat--primary">
                        {helpers.formatearNumero(estadoGrupo.totalM3)} m³
                      </span>
                    ) : (
                      <>
                        <span className="estado-group__stat">
                          {helpers.formatearNumero(estadoGrupo.totalDias)} días
                        </span>
                        <span className="estado-group__stat estado-group__stat--primary">
                          {helpers.formatearNumero(estadoGrupo.totalHoras)} hrs
                        </span>
                      </>
                    )}
                  </div>
                </button>

                {/* Lista de vales del estado */}
                {!estadoColapsado && (
                  <div
                    className="estado-group__vales"
                    id={`estado-content-${placas}-${estadoGrupo.estado}`}
                    role="region"
                    aria-label={`Vales ${helpers.obtenerEtiquetaEstado(estadoGrupo.estado)}`}
                  >
                    {estadoGrupo.vales.map((vale) => {
                      const valeExpandido = valesExpandidos.has(vale.id_vale);

                      return (
                        <div key={vale.id_vale} className="vale-item">
                          {/* Header compacto del vale */}
                          <button
                            type="button"
                            className="vale-item__header"
                            onClick={() => toggleVale(vale.id_vale)}
                            aria-expanded={valeExpandido}
                            aria-controls={`vale-content-${vale.id_vale}`}
                          >
                            <div className="vale-item__header-left">
                              {valeExpandido ? (
                                <ChevronDown size={16} aria-hidden="true" />
                              ) : (
                                <ChevronRight size={16} aria-hidden="true" />
                              )}
                              <span className="vale-item__folio">
                                {vale.folio}
                              </span>
                              <span className="vale-item__fecha">
                                {helpers.formatearFechaCorta(
                                  vale.fecha_creacion
                                )}
                              </span>
                            </div>

                            <div className="vale-item__header-right">
                              <span className="vale-item__obra">
                                {vale.obras?.obra || "Sin obra"}
                              </span>
                            </div>
                          </button>

                          {/* Detalle completo del vale (ValeCard) */}
                          {valeExpandido && (
                            <div
                              className="vale-item__content"
                              id={`vale-content-${vale.id_vale}`}
                              role="region"
                              aria-label={`Detalles del vale ${vale.folio}`}
                            >
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
          })}
        </div>
      )}
    </div>
  );
};

export default PlacasGroup;
