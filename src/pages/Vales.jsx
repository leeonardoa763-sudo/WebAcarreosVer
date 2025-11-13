/**
 * src/pages/Vales.jsx
 *
 * Página de listado y búsqueda de vales
 *
 * Funcionalidades:
 * - Lista de vales con paginación
 * - Filtros avanzados (obra, tipo, estado, fechas)
 * - Búsqueda por folio, operador, placas
 * - Vista de tarjetas con información resumida
 * - Clic en tarjeta para ver detalle completo
 *
 * Acceso: Solo ADMINISTRADOR, FINANZAS, SINDICATO
 */

// 1. React y hooks
import { useState } from "react";

// 2. React Router
import { useNavigate } from "react-router-dom";

// 3. Icons
import { Search, Filter, X } from "lucide-react";

// 4. Hooks personalizados
import { useVales } from "../hooks/useVales";

// 5. Componentes
import ValesList from "../components/vales/ValesList";
import ValeFilters from "../components/vales/ValeFilters";

// 6. Estilos
import "../styles/vales.css";

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
    pagination,
    goToPage,
  } = useVales();

  // Estado local para mostrar/ocultar filtros
  const [showFilters, setShowFilters] = useState(false);

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
    // Por ahora solo mostramos en consola
    // Después implementaremos modal o página de detalle
    console.log("Vale seleccionado:", vale);
  };

  /**
   * Limpiar todos los filtros
   */
  const handleClearFilters = () => {
    clearFilters();
    setShowFilters(false);
  };

  return (
    <div className="vales-page">
      {/* Header */}
      <div className="vales-page__header">
        <div className="vales-page__title-section">
          <h1 className="vales-page__title">Vales</h1>
          <p className="vales-page__subtitle">
            {pagination.totalCount}{" "}
            {pagination.totalCount === 1
              ? "vale encontrado"
              : "vales encontrados"}
          </p>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="vales-page__toolbar">
        {/* Búsqueda */}
        <div className="vales-page__search">
          <Search size={20} className="vales-page__search-icon" />
          <input
            type="text"
            placeholder="Buscar por folio, operador o placas..."
            value={filters.searchTerm}
            onChange={handleSearch}
            className="vales-page__search-input"
          />
          {filters.searchTerm && (
            <button
              onClick={() => updateFilters({ searchTerm: "" })}
              className="vales-page__search-clear"
              aria-label="Limpiar búsqueda"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Botón de filtros */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`vales-page__filter-button ${showFilters ? "active" : ""}`}
        >
          <Filter size={20} />
          <span>Filtros</span>
          {hasFilters && <span className="vales-page__filter-badge"></span>}
        </button>

        {/* Botón limpiar filtros */}
        {hasFilters && (
          <button
            onClick={handleClearFilters}
            className="vales-page__clear-button"
          >
            <X size={20} />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="vales-page__filters">
          <ValeFilters
            filters={filters}
            updateFilters={updateFilters}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Contenido principal */}
      <div className="vales-page__content">
        {loading ? (
          <div className="vales-page__loading">
            <div className="loading-spinner"></div>
            <p>Cargando vales...</p>
          </div>
        ) : error ? (
          <div className="vales-page__error">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Reintentar
            </button>
          </div>
        ) : vales.length === 0 ? (
          <div className="vales-page__empty">
            <p>No se encontraron vales</p>
            {hasFilters && (
              <button
                onClick={handleClearFilters}
                className="btn btn-secondary"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Lista de vales */}
            <ValesList vales={vales} onValeClick={handleValeClick} />

            {/* Paginación */}
            {pagination.totalPages > 1 && (
              <div className="vales-page__pagination">
                <button
                  onClick={() => goToPage(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="vales-page__pagination-button"
                >
                  Anterior
                </button>

                <div className="vales-page__pagination-info">
                  Página {pagination.currentPage} de {pagination.totalPages}
                </div>

                <button
                  onClick={() => goToPage(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="vales-page__pagination-button"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Vales;
