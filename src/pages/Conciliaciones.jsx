/**
 * src/pages/Conciliaciones.jsx
 *
 * Página principal de gestión de conciliaciones
 *
 * Funcionalidades:
 * - Filtros de selección (semana, obra, sindicato)
 * - Vista previa de vales agrupados
 * - Resumen de totales
 * - Generación de conciliación
 *
 * Requiere: Rol Sindicato o Administrador
 */

// 1. React y hooks
import { useState } from "react";

// 2. Hooks personalizados
import { useConciliaciones } from "../hooks/useConciliaciones";

// 3. Componentes

import FiltrosConciliacion from "../components/conciliaciones/FiltrosConciliacion";
import TablaConciliacionRenta from "../components/conciliaciones/TablaConciliacionRenta";
import ResumenTotales from "../components/conciliaciones/ResumenTotales";

// 4. Estilos
import "../styles/conciliaciones.css";

const Conciliaciones = () => {
  const {
    // Catálogos
    semanas,
    obras,
    loadingCatalogos,

    // Filtros
    filtros,
    updateFiltros,
    clearFiltros,

    // Vista previa
    vistaPrevia,
    cargarVistaPrevia,

    // Acciones
    generarConciliacion,
  } = useConciliaciones();

  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: null, texto: "" });

  /**
   * Handler para generar conciliación
   */
  const handleGenerar = async () => {
    if (
      !vistaPrevia.valesAgrupados ||
      Object.keys(vistaPrevia.valesAgrupados).length === 0
    ) {
      setMensaje({
        tipo: "error",
        texto: "No hay vales para generar conciliación",
      });
      return;
    }

    try {
      setGenerando(true);
      setMensaje({ tipo: null, texto: "" });

      const resultado = await generarConciliacion();

      if (resultado.success) {
        setMensaje({
          tipo: "success",
          texto: `Conciliación generada exitosamente: ${resultado.data.folio}`,
        });
      } else {
        throw new Error(resultado.error);
      }
    } catch (error) {
      console.error("Error al generar conciliación:", error);
      setMensaje({
        tipo: "error",
        texto: error.message || "Error al generar conciliación",
      });
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="conciliaciones-page">
      <div className="conciliaciones-page__header">
        <h1>Conciliaciones de Renta</h1>
        <p className="conciliaciones-page__subtitle">
          Genera conciliaciones agrupando vales verificados por semana y obra
        </p>
      </div>

      {/* Mensaje de éxito/error */}
      {mensaje.tipo && (
        <div
          className={`conciliaciones-message conciliaciones-message--${mensaje.tipo}`}
        >
          {mensaje.texto}
        </div>
      )}

      {/* Filtros */}
      <FiltrosConciliacion
        semanas={semanas}
        obras={obras}
        filtros={filtros}
        onFiltrosChange={updateFiltros}
        onCargarVistaPrevia={cargarVistaPrevia}
        onLimpiar={clearFiltros}
        loading={loadingCatalogos}
        vistaPreviaLoading={vistaPrevia.loading}
      />

      {/* Vista previa y totales */}
      {vistaPrevia.error && (
        <div className="conciliaciones-message conciliaciones-message--error">
          {vistaPrevia.error}
        </div>
      )}

      {vistaPrevia.valesAgrupados && (
        <>
          <TablaConciliacionRenta valesAgrupados={vistaPrevia.valesAgrupados} />

          <ResumenTotales
            totalesGenerales={vistaPrevia.totalesGenerales}
            loading={vistaPrevia.loading}
          />

          {/* Botón generar */}
          <div className="conciliaciones-actions">
            <button
              onClick={handleGenerar}
              disabled={generando}
              className="btn btn--primary"
            >
              {generando ? "Generando..." : "Generar Conciliación"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Conciliaciones;
