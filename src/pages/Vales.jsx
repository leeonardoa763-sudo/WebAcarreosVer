/**
 * src/pages/Vales.jsx
 *
 * Página de listado y búsqueda de vales
 *
 * Funcionalidades:
 * - Lista de vales con pestañas Material/Renta
 * - Agrupación por mes y semana
 * - Filtros avanzados (obra, tipo, estado, fechas)
 * - Búsqueda por folio, operador, placas
 * - Vista de tarjetas con información resumida
 * - Accesibilidad completa con ARIA labels
 *
 * Acceso: Solo ADMINISTRADOR, FINANZAS, SINDICATO
 */

// 1. React y hooks
import { useState } from "react";

// 2. React Router
import { useNavigate } from "react-router-dom";

// 3. Icons
import { Search, Filter, X, Package, Truck } from "lucide-react";

// 4. Hooks personalizados
import { useVales } from "../hooks/useVales";

// 5. Componentes
import ValesList from "../components/vales/ValesList";
import ValeFilters from "../components/vales/ValeFilters";

// 6. Estilos
import "../styles/vales.css";

// Constantes de pestañas (Renta primero)
const TABS = [
  { id: "renta", label: "Renta", icon: Truck },
  { id: "material", label: "Material", icon: Package },
];

const Vales = () => {
  const navigate = useNavigate();
  const {
    vales,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    hasFilters,
  } = useVales();

  // Estado local para mostrar/ocultar filtros
  const [showFilters, setShowFilters] = useState(false);

  // Estado para pestaña activa (Renta por defecto)
  const [activeTab, setActiveTab] = useState("renta");

  /**
   * Manejar búsqueda por término
   */
  const handleSearch = (e) => {
    const searchTerm = e.target.value;
    updateFilters({ searchTerm });
  };

  /**
   * Manejar clic en vale para ver detalle
   */
  const handleValeClick = (vale) => {
    console.log("Vale seleccionado:", vale);
  };

  /**
   * Limpiar todos los filtros
   */
  const handleClearFilters = () => {
    clearFilters();
    setShowFilters(false);
  };

  /**
   * Limpiar solo el término de búsqueda
   */
  const handleClearSearch = () => {
    updateFilters({ searchTerm: "" });
  };

  // Filtrar vales por tipo según pestaña activa
  const valesFiltrados = vales.filter((vale) => vale.tipo_vale === activeTab);

  return (
    <div className="vales-page">
      {/* Header */}
      <header className="vales-page__header">
        <div className="vales-page__title-section">
          <h1 className="vales-page__title">Vales</h1>
          <p className="vales-page__subtitle" aria-live="polite">
            {valesFiltrados.length}{" "}
            {valesFiltrados.length === 1
              ? "vale encontrado"
              : "vales encontrados"}
          </p>
        </div>
      </header>

      {/* Pestañas Material/Renta */}
      <div className="vales-tabs" role="tablist" aria-label="Tipos de vales">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`vales-tab ${activeTab === tab.id ? "vales-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              data-type={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              type="button"
            >
              <Icon size={20} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Barra de búsqueda y filtros */}
      <div
        className="vales-page__toolbar"
        role="search"
        aria-label="Búsqueda y filtros de vales"
      >
        {/* Búsqueda */}
        <div className="vales-page__search">
          <Search
            size={20}
            className="vales-page__search-icon"
            aria-hidden="true"
          />
          <label htmlFor="search-vales-input" className="sr-only">
            Buscar vales por folio, operador o placas
          </label>
          <input
            id="search-vales-input"
            type="search"
            placeholder="Buscar por folio, operador o placas..."
            value={filters.searchTerm}
            onChange={handleSearch}
            className="vales-page__search-input"
            aria-describedby="search-vales-help"
            autoComplete="off"
          />
          <span id="search-vales-help" className="sr-only">
            Ingrese el folio del vale, nombre del operador o placas del vehículo
            para buscar
          </span>
          {filters.searchTerm && (
            <button
              onClick={handleClearSearch}
              className="vales-page__search-clear"
              aria-label="Limpiar búsqueda"
              type="button"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Botón de filtros */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`vales-page__filter-button ${showFilters ? "active" : ""}`}
          aria-expanded={showFilters}
          aria-controls="vales-filters-panel"
          aria-label={`${showFilters ? "Ocultar" : "Mostrar"} panel de filtros avanzados`}
          type="button"
        >
          <Filter size={20} aria-hidden="true" />
          <span>Filtros</span>
          {hasFilters && (
            <span
              className="vales-page__filter-badge"
              aria-label="Filtros activos"
            ></span>
          )}
        </button>

        {/* Botón limpiar filtros */}
        {hasFilters && (
          <button
            onClick={handleClearFilters}
            className="vales-page__clear-button"
            aria-label="Limpiar todos los filtros"
            type="button"
          >
            <X size={20} aria-hidden="true" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <aside
          id="vales-filters-panel"
          className="vales-page__filters"
          role="region"
          aria-label="Panel de filtros avanzados"
        >
          <ValeFilters
            filters={filters}
            updateFilters={updateFilters}
            onClose={() => setShowFilters(false)}
          />
        </aside>
      )}

      {/* Contenido principal */}
      <main
        className="vales-page__content"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {loading ? (
          <div className="vales-page__loading" role="status" aria-live="polite">
            <div className="loading-spinner" aria-hidden="true"></div>
            <p>Cargando vales...</p>
          </div>
        ) : error ? (
          <div className="vales-page__error" role="alert" aria-live="assertive">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              type="button"
            >
              Reintentar
            </button>
          </div>
        ) : valesFiltrados.length === 0 ? (
          <div className="vales-page__empty" role="status" aria-live="polite">
            <p>
              {hasFilters
                ? "No se encontraron vales con los filtros aplicados"
                : `No hay vales de ${activeTab} registrados`}
            </p>
            {hasFilters && (
              <button
                onClick={handleClearFilters}
                className="btn btn-secondary"
                type="button"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <ValesList vales={valesFiltrados} onValeClick={handleValeClick} />
        )}
      </main>
    </div>
  );
};

export default Vales;
