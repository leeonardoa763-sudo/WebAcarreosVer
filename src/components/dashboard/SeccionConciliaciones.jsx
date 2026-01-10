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

import { Truck, Package, Search, Download } from "lucide-react";

// 3. Hooks personalizados
import { useConciliacionesDashboard } from "../../hooks/dashboard/useConciliacionesDashboard";

// 4. Componentes
import ListaConciliacionesPorMes from "./ListaConciliacionesPorMes";
import ModalVistaPreviewConciliacion from "./ModalVistaPreviewConciliacion";

// 5. Config
import { colors } from "../../config/colors";

// 6. Estilos
import "../../styles/dashboard-conciliaciones.css";

// 7. Utils
import { exportarConciliacionesDashboard } from "../../utils/exportConciliacionesDashboard";

const SeccionConciliaciones = () => {
  const {
    conciliacionesAgrupadas,
    loading,
    error,
    tipoActivo,
    folioSearch,
    cambiarTipo,
    buscarPorFolio,
    totalCount,
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

  /**
   * Manejar exportación a Excel
   */
  const handleExportarExcel = async () => {
    try {
      // Obtener todas las conciliaciones filtradas (aplanadas del agrupamiento)
      const todasLasConciliaciones = [];

      conciliacionesAgrupadas.forEach((mes) => {
        mes.semanas.forEach((semana) => {
          todasLasConciliaciones.push(...semana.conciliaciones);
        });
      });

      if (todasLasConciliaciones.length === 0) {
        alert("No hay conciliaciones para exportar");
        return;
      }

      // Mostrar loading
      const btnExportar = document.querySelector(".btn-exportar-excel");
      const contenidoOriginal = btnExportar ? btnExportar.innerHTML : null;

      if (btnExportar) {
        btnExportar.disabled = true;
        btnExportar.innerHTML = "<span>Preparando datos...</span>";
      }

      // Cargar vales para estas conciliaciones
      const { exportarConVales } = await import(
        "../../utils/exportConciliacionesDashboard"
      );
      await exportarConVales(todasLasConciliaciones, tipoActivo);

      // Restaurar botón
      if (btnExportar && contenidoOriginal) {
        btnExportar.disabled = false;
        btnExportar.innerHTML = contenidoOriginal;
      }
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("Error al exportar las conciliaciones");

      // Restaurar botón en caso de error
      const btnExportar = document.querySelector(".btn-exportar-excel");
      if (btnExportar) {
        btnExportar.disabled = false;
        btnExportar.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>Exportar a Excel</span>
      `;
      }
    }
  };

  return (
    <div className="seccion-conciliaciones">
      {/* Header */}
      <div className="seccion-conciliaciones__header">
        <div className="seccion-conciliaciones__header-content">
          <div>
            <h2 className="seccion-conciliaciones__title">
              Historial de Conciliaciones
            </h2>
            <p className="seccion-conciliaciones__subtitle">
              Visualiza las conciliaciones generadas agrupadas por semana
            </p>
          </div>

          {/* Botón de exportación */}
          <button
            className="btn-exportar-excel"
            onClick={handleExportarExcel}
            disabled={loading || totalCount === 0}
            title="Exportar a Excel"
          >
            <Download size={18} />
            <span>Exportar a Excel</span>
          </button>
        </div>
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
            <ListaConciliacionesPorMes
              meses={conciliacionesAgrupadas}
              onSeleccionar={handleAbrirModal}
              colorTema={
                tipoActivo === "renta" ? colors.secondary : colors.primary
              }
            />
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
