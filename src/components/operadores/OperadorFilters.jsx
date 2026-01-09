/**
 * src/components/operadores/OperadorFilters.jsx
 *
 * Componente de filtros para la página de Operadores
 *
 * Filtros disponibles:
 * - Rango de fechas (inicio - fin)
 * - Empresa
 * - Obra
 * - Sindicato
 * - Búsqueda por placas
 *
 * Dependencias: Catálogos de obras, empresas, sindicatos
 * Usado en: pages/Operadores.jsx
 */

// 1. React y hooks
import { useState, useEffect } from "react";

// 2. Icons
import { Search, Filter, X, Calendar } from "lucide-react";

// 3. Config
import { supabase } from "../../config/supabase";

const OperadorFilters = ({
  filtros,
  actualizarFiltros,
  limpiarFiltros,
  hayFiltrosActivos,
}) => {
  // Estados para catálogos
  const [obras, setObras] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [sindicatos, setSindicatos] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  // Estado para mostrar/ocultar filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  /**
   * Cargar catálogos al montar
   */
  useEffect(() => {
    cargarCatalogos();
  }, []);

  /**
   * Cargar obras, empresas y sindicatos
   */
  const cargarCatalogos = async () => {
    try {
      setLoadingCatalogos(true);

      // Cargar obras con empresa
      const { data: obrasData } = await supabase
        .from("obras")
        .select(
          `
          id_obra,
          obra,
          cc,
          empresas (
            id_empresa,
            empresa
          )
        `
        )
        .order("obra");

      // Cargar empresas
      const { data: empresasData } = await supabase
        .from("empresas")
        .select("id_empresa, empresa")
        .order("empresa");

      // Cargar sindicatos
      const { data: sindicatosData } = await supabase
        .from("sindicatos")
        .select("id_sindicato, sindicato")
        .order("sindicato");

      setObras(obrasData || []);
      setEmpresas(empresasData || []);
      setSindicatos(sindicatosData || []);
    } catch (error) {
      console.error("Error al cargar catálogos:", error);
    } finally {
      setLoadingCatalogos(false);
    }
  };

  /**
   * Manejar cambio de filtro
   */
  const handleFiltroChange = (campo, valor) => {
    actualizarFiltros({ [campo]: valor });
  };

  /**
   * Manejar búsqueda por placas
   */
  const handleSearchChange = (e) => {
    const valor = e.target.value;
    actualizarFiltros({ searchTerm: valor });
  };

  /**
   * Limpiar todos los filtros
   */
  const handleLimpiarFiltros = () => {
    limpiarFiltros();
    setMostrarFiltros(false);
  };

  return (
    <div className="operador-filters">
      {/* Barra superior con búsqueda y botón de filtros */}
      <div className="operador-filters__search-bar">
        {/* Búsqueda por placas */}
        <div className="operador-filters__search">
          <Search size={20} aria-hidden="true" />
          <input
            type="text"
            placeholder="Buscar por placas..."
            value={filtros.searchTerm || ""}
            onChange={handleSearchChange}
            className="operador-filters__search-input"
            aria-label="Buscar por placas"
          />
          {filtros.searchTerm && (
            <button
              type="button"
              onClick={() => handleFiltroChange("searchTerm", "")}
              className="operador-filters__clear-search"
              aria-label="Limpiar búsqueda"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Botón para mostrar/ocultar filtros */}
        <button
          type="button"
          className={`operador-filters__toggle ${hayFiltrosActivos ? "operador-filters__toggle--active" : ""}`}
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          aria-expanded={mostrarFiltros}
          aria-controls="filtros-avanzados"
        >
          <Filter size={20} aria-hidden="true" />
          <span>Filtros</span>
          {hayFiltrosActivos && (
            <span
              className="operador-filters__badge"
              aria-label="Filtros activos"
            >
              •
            </span>
          )}
        </button>

        {/* Botón limpiar filtros */}
        {hayFiltrosActivos && (
          <button
            type="button"
            className="operador-filters__clear"
            onClick={handleLimpiarFiltros}
          >
            <X size={18} aria-hidden="true" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* Panel de filtros avanzados */}
      {mostrarFiltros && (
        <div
          className="operador-filters__panel"
          id="filtros-avanzados"
          role="region"
          aria-label="Filtros avanzados"
        >
          <div className="operador-filters__grid">
            {/* Filtro: Fecha inicio */}
            <div className="operador-filters__field">
              <label htmlFor="fecha-inicio" className="operador-filters__label">
                <Calendar size={16} aria-hidden="true" />
                Fecha Inicio
              </label>
              <input
                type="date"
                id="fecha-inicio"
                value={filtros.fecha_inicio || ""}
                onChange={(e) =>
                  handleFiltroChange("fecha_inicio", e.target.value)
                }
                className="operador-filters__input"
              />
            </div>

            {/* Filtro: Fecha fin */}
            <div className="operador-filters__field">
              <label htmlFor="fecha-fin" className="operador-filters__label">
                <Calendar size={16} aria-hidden="true" />
                Fecha Fin
              </label>
              <input
                type="date"
                id="fecha-fin"
                value={filtros.fecha_fin || ""}
                onChange={(e) =>
                  handleFiltroChange("fecha_fin", e.target.value)
                }
                className="operador-filters__input"
              />
            </div>

            {/* Filtro: Empresa */}
            <div className="operador-filters__field">
              <label htmlFor="empresa" className="operador-filters__label">
                Empresa
              </label>
              <select
                id="empresa"
                value={filtros.id_empresa || ""}
                onChange={(e) =>
                  handleFiltroChange(
                    "id_empresa",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="operador-filters__select"
                disabled={loadingCatalogos}
              >
                <option value="">Todas las empresas</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id_empresa} value={empresa.id_empresa}>
                    {empresa.empresa}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro: Obra */}
            <div className="operador-filters__field">
              <label htmlFor="obra" className="operador-filters__label">
                Obra
              </label>
              <select
                id="obra"
                value={filtros.id_obra || ""}
                onChange={(e) =>
                  handleFiltroChange(
                    "id_obra",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="operador-filters__select"
                disabled={loadingCatalogos}
              >
                <option value="">Todas las obras</option>
                {obras.map((obra) => (
                  <option key={obra.id_obra} value={obra.id_obra}>
                    {obra.obra}{" "}
                    {obra.empresas?.empresa && `(${obra.empresas.empresa})`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperadorFilters;
