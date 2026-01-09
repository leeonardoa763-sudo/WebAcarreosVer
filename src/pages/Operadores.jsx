/**
 * src/pages/Operadores.jsx
 *
 * Página de Reporte por Operadores
 *
 * Muestra vales agrupados por:
 * - Empresa → Placas → Estado → Vales
 *
 * Características:
 * - Pestañas: Material y Renta
 * - Filtros avanzados
 * - Exportar a Excel
 * - Expandir/colapsar todo
 * - Resumen general con totales
 *
 * Dependencias: useOperadores, OperadorFilters, OperadoresList
 * Usado en: App.jsx (ruta /operadores)
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import {
  Truck,
  Package,
  Download,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

// 3. Hooks personalizados
import { useOperadores } from "../hooks/useOperadores";

// 4. Componentes
import OperadorFilters from "../components/operadores/OperadorFilters";
import OperadoresList from "../components/operadores/OperadoresList";

// 5. Estilos
import "../styles/operadores.css";

const Operadores = () => {
  // Hook principal
  const {
    // Datos
    datos,
    resumen,
    loading,
    error,

    // Pestaña
    pestañaActiva,
    cambiarPestaña,

    // Grupos
    toggleGrupo,
    estaColapsado,
    expandirTodos,
    colapsarTodos,

    // Filtros
    filtros,
    actualizarFiltros,
    limpiarFiltros,
    hayFiltrosActivos,

    // Acciones
    recargarDatos,
    exportarAExcel,

    // Helpers
    helpers,
  } = useOperadores();

  // Estado local para controlar botón expandir/colapsar
  const [todosExpandidos, setTodosExpandidos] = useState(false);

  /**
   * Manejar expandir/colapsar todo
   */
  const handleToggleTodos = () => {
    if (todosExpandidos) {
      colapsarTodos();
    } else {
      expandirTodos();
    }
    setTodosExpandidos(!todosExpandidos);
  };

  return (
    <div className="operadores-page">
      {/* Header */}
      <header className="operadores-header">
        <div className="operadores-header__title">
          <h1>Reporte por Operadores</h1>
        </div>

        {/* Pestañas */}
        <div
          className="operadores-tabs"
          role="tablist"
          aria-label="Tipo de vale"
        >
          <button
            type="button"
            role="tab"
            aria-selected={pestañaActiva === "material"}
            aria-controls="panel-material"
            className={`operadores-tabs__tab ${pestañaActiva === "material" ? "operadores-tabs__tab--active" : ""}`}
            onClick={() => cambiarPestaña("material")}
          >
            <Package size={20} aria-hidden="true" />
            <span>Material</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pestañaActiva === "renta"}
            aria-controls="panel-renta"
            className={`operadores-tabs__tab ${pestañaActiva === "renta" ? "operadores-tabs__tab--active" : ""}`}
            onClick={() => cambiarPestaña("renta")}
          >
            <Truck size={20} aria-hidden="true" />
            <span>Renta</span>
          </button>
        </div>
      </header>

      {/* Resumen General */}
      <div className="operadores-summary">
        <div className="operadores-summary__card">
          <span className="operadores-summary__label">Empresas</span>
          <span className="operadores-summary__value">
            {resumen.totalEmpresas || 0}
          </span>
        </div>
        <div className="operadores-summary__card">
          <span className="operadores-summary__label">Vehículos</span>
          <span className="operadores-summary__value">
            {resumen.totalVehiculos || 0}
          </span>
        </div>
        <div className="operadores-summary__card">
          <span className="operadores-summary__label">Viajes</span>
          <span className="operadores-summary__value">
            {resumen.totalViajes || 0}
          </span>
        </div>
        {pestañaActiva === "material" ? (
          <div className="operadores-summary__card operadores-summary__card--primary">
            <span className="operadores-summary__label">Total M³</span>
            <span className="operadores-summary__value">
              {helpers.formatearNumero(resumen.totalM3 || 0)}
            </span>
          </div>
        ) : (
          <>
            <div className="operadores-summary__card">
              <span className="operadores-summary__label">Total Días</span>
              <span className="operadores-summary__value">
                {helpers.formatearNumero(resumen.totalDias || 0)}
              </span>
            </div>
            <div className="operadores-summary__card operadores-summary__card--primary">
              <span className="operadores-summary__label">Total Horas</span>
              <span className="operadores-summary__value">
                {helpers.formatearNumero(resumen.totalHoras || 0)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Filtros */}
      <OperadorFilters
        filtros={filtros}
        actualizarFiltros={actualizarFiltros}
        limpiarFiltros={limpiarFiltros}
        hayFiltrosActivos={hayFiltrosActivos}
      />

      {/* Barra de acciones */}
      <div className="operadores-actions">
        <div className="operadores-actions__left">
          <button
            type="button"
            className="operadores-actions__button"
            onClick={handleToggleTodos}
            aria-label={todosExpandidos ? "Colapsar todo" : "Expandir todo"}
          >
            {todosExpandidos ? (
              <>
                <ChevronUp size={18} aria-hidden="true" />
                <span>Colapsar Todo</span>
              </>
            ) : (
              <>
                <ChevronDown size={18} aria-hidden="true" />
                <span>Expandir Todo</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="operadores-actions__button"
            onClick={recargarDatos}
            disabled={loading}
            aria-label="Recargar datos"
          >
            <RefreshCw size={18} aria-hidden="true" />
            <span>Recargar</span>
          </button>
        </div>

        <div className="operadores-actions__right">
          <button
            type="button"
            className="operadores-actions__button operadores-actions__button--primary"
            onClick={exportarAExcel}
            disabled={loading || !datos || datos.length === 0}
            aria-label="Exportar a Excel"
          >
            <Download size={18} aria-hidden="true" />
            <span>Exportar a Excel</span>
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div
        className="operadores-content"
        role="tabpanel"
        id={`panel-${pestañaActiva}`}
        aria-labelledby={`tab-${pestañaActiva}`}
      >
        {/* Loading */}
        {loading && (
          <div className="operadores-loading">
            <RefreshCw
              size={32}
              className="operadores-loading__spinner"
              aria-hidden="true"
            />
            <p>Cargando datos...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="operadores-error">
            <p>❌ Error: {error}</p>
            <button
              type="button"
              onClick={recargarDatos}
              className="operadores-error__retry"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Lista de operadores */}
        {!loading && !error && (
          <OperadoresList
            datos={datos}
            tipoVale={pestañaActiva}
            toggleGrupo={toggleGrupo}
            estaColapsado={estaColapsado}
            helpers={helpers}
          />
        )}
      </div>
    </div>
  );
};

export default Operadores;
