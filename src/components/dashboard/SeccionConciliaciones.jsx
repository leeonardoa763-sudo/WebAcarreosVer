/**
 * src/components/dashboard/SeccionConciliaciones.jsx
 *
 * Sección de historial de conciliaciones en Dashboard
 *
 * Funcionalidades:
 * - Tabs para Renta/Material
 * - Búsqueda por folio
 * - Paginación
 * - Lista agrupada por semana
 *
 * Usado en: Dashboard.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import {
  Truck,
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// 3. Hooks personalizados
import { useConciliacionesDashboard } from "../../hooks/dashboard/useConciliacionesDashboard";

// 4. Componentes
import ListaConciliacionesPorSemana from "./ListaConciliacionesPorSemana";
import ModalVistaPreviewConciliacion from "./ModalVistaPreviewConciliacion";

// 5. Config
import { colors } from "../../config/colors";

// 6. Estilos
import "../../styles/dashboard-conciliaciones.css";

const SeccionConciliaciones = () => {
  const {
    conciliacionesAgrupadas,
    loading,
    error,
    tipoActivo,
    folioSearch,
    cambiarTipo,
    buscarPorFolio,
    currentPage,
    totalPages,
    totalCount,
    irAPagina,
  } = useConciliacionesDashboard();

  // Estado del modal
  const [conciliacionSeleccionada, setConciliacionSeleccionada] =
    useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  /**
   * Abrir modal con conciliación seleccionada
   */
  const handleAbrirModal = (conciliacion) => {
    setConciliacionSeleccionada(conciliacion);
    setModalAbierto(true);
  };

  /**
   * Cerrar modal
   */
  const handleCerrarModal = () => {
    setModalAbierto(false);
    setConciliacionSeleccionada(null);
  };

  return (
    <div className="seccion-conciliaciones">
      {/* Header */}
      <div className="seccion-conciliaciones__header">
        <h2 className="seccion-conciliaciones__title">
          Historial de Conciliaciones
        </h2>
        <p className="seccion-conciliaciones__subtitle">
          Visualiza las conciliaciones generadas agrupadas por semana
        </p>
      </div>

      {/* Tabs Renta / Material */}
      <div className="seccion-conciliaciones__tabs">
        <button
          className={`tab ${tipoActivo === "renta" ? "tab--active" : ""}`}
          onClick={() => cambiarTipo("renta")}
          style={{
            backgroundColor:
              tipoActivo === "renta" ? colors.secondary : "transparent",
            color: tipoActivo === "renta" ? "#fff" : colors.textPrimary,
          }}
        >
          <Truck size={18} />
          <span>Renta</span>
        </button>

        <button
          className={`tab ${tipoActivo === "material" ? "tab--active" : ""}`}
          onClick={() => cambiarTipo("material")}
          style={{
            backgroundColor:
              tipoActivo === "material" ? colors.primary : "transparent",
            color: tipoActivo === "material" ? "#fff" : colors.textPrimary,
          }}
        >
          <Package size={18} />
          <span>Material</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="seccion-conciliaciones__search">
        <div className="search-box">
          <Search size={20} className="search-box__icon" />
          <input
            type="text"
            placeholder="Buscar por folio..."
            value={folioSearch}
            onChange={(e) => buscarPorFolio(e.target.value)}
            className="search-box__input"
          />
        </div>
        <p className="search-box__results">
          {totalCount} {totalCount === 1 ? "resultado" : "resultados"}
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="seccion-conciliaciones__loading">
          <div className="spinner"></div>
          <p>Cargando conciliaciones...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="seccion-conciliaciones__error">
          <p>Error: {error}</p>
        </div>
      )}

      {/* Lista agrupada por semana */}
      {!loading && !error && (
        <>
          {conciliacionesAgrupadas.length === 0 ? (
            <div className="seccion-conciliaciones__empty">
              <p>No se encontraron conciliaciones</p>
            </div>
          ) : (
            <ListaConciliacionesPorSemana
              grupos={conciliacionesAgrupadas}
              onSeleccionar={handleAbrirModal}
            />
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="seccion-conciliaciones__pagination">
              <button
                onClick={() => irAPagina(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination__btn"
              >
                <ChevronLeft size={18} />
                Anterior
              </button>

              <span className="pagination__info">
                Página {currentPage} de {totalPages}
              </span>

              <button
                onClick={() => irAPagina(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination__btn"
              >
                Siguiente
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de vista previa */}
      {modalAbierto && conciliacionSeleccionada && (
        <ModalVistaPreviewConciliacion
          conciliacion={conciliacionSeleccionada}
          onCerrar={handleCerrarModal}
          tipo={tipoActivo}
        />
      )}
    </div>
  );
};

export default SeccionConciliaciones;
