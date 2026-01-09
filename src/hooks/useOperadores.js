/**
 * src/hooks/useOperadores.js
 *
 * Hook principal para la página de Operadores
 *
 * Integra:
 * - useOperadoresState: Manejo de estados
 * - useOperadoresQueries: Consultas a BD
 * - useOperadoresHelpers: Funciones auxiliares
 *
 * Funcionalidades:
 * - Obtener vales agrupados por empresa → placas → estado
 * - Cambiar entre pestañas (Material/Renta)
 * - Aplicar filtros
 * - Expandir/colapsar grupos
 * - Exportar a Excel
 *
 * Usado en: pages/Operadores.jsx
 */

// 1. React y hooks
import { useEffect, useCallback } from "react";

// 2. Hooks personalizados
import { useAuth } from "./useAuth";
import { useOperadoresState } from "./operadores/useOperadoresState";
import {
  obtenerValesMaterialAgrupados,
  obtenerValesRentaAgrupados,
} from "./operadores/useOperadoresQueries";
import * as helpers from "./operadores/useOperadoresHelpers";

// 3. Utils
import { exportToExcel } from "../utils/exportToExcel";

export const useOperadores = () => {
  // Auth
  const { userProfile } = useAuth();

  // Estado del hook
  const {
    // Estados
    pestañaActiva,
    datosAgrupados,
    loading,
    error,
    gruposColapsados,
    filtros,
    resumenGeneral,

    // Setters
    setDatosAgrupados,
    setLoading,
    setError,
    setResumenGeneral,

    // Funciones de pestaña
    cambiarPestaña,

    // Funciones de grupos
    toggleGrupo,
    estaColapsado,
    expandirTodos,
    colapsarTodos,

    // Funciones de filtros
    actualizarFiltros,
    limpiarFiltros,
    hayFiltrosActivos,
  } = useOperadoresState();

  /**
   * Obtener vales agrupados según la pestaña activa
   */
  const obtenerVales = useCallback(async () => {
    if (!userProfile?.id_persona) {
      setError("No hay sesión activa");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let resultado;

      if (pestañaActiva === "material") {
        resultado = await obtenerValesMaterialAgrupados(filtros, userProfile);
      } else {
        resultado = await obtenerValesRentaAgrupados(filtros, userProfile);
      }

      // Actualizar datos agrupados
      setDatosAgrupados((prev) => ({
        ...prev,
        [pestañaActiva]: resultado.datos,
      }));

      // Actualizar resumen
      setResumenGeneral((prev) => ({
        ...prev,
        [pestañaActiva]: resultado.resumen,
      }));
    } catch (err) {
      console.error("Error en obtenerVales:", err);
      setError(err.message || "Error al obtener vales");
    } finally {
      setLoading(false);
    }
  }, [
    pestañaActiva,
    filtros,
    userProfile,
    setDatosAgrupados,
    setResumenGeneral,
    setLoading,
    setError,
  ]);

  /**
   * Efecto: Obtener vales cuando cambian filtros o pestaña
   */
  useEffect(() => {
    obtenerVales();
  }, [obtenerVales]);

  /**
   * Cambiar pestaña y recargar datos
   */
  const handleCambiarPestaña = useCallback(
    (nuevaPestaña) => {
      cambiarPestaña(nuevaPestaña);
    },
    [cambiarPestaña]
  );

  /**
   * Exportar datos a Excel
   */
  const exportarAExcel = useCallback(() => {
    try {
      const datos = datosAgrupados[pestañaActiva];

      if (!datos || datos.length === 0) {
        alert("No hay datos para exportar");
        return;
      }

      let datosExcel;

      if (pestañaActiva === "material") {
        datosExcel = helpers.prepararDatosExcelMaterial(datos);
      } else {
        datosExcel = helpers.prepararDatosExcelRenta(datos);
      }

      const nombreArchivo = helpers.generarNombreArchivoExcel(
        pestañaActiva,
        filtros
      );

      exportToExcel(datosExcel, nombreArchivo);
    } catch (err) {
      console.error("Error al exportar a Excel:", err);
      alert("Error al exportar a Excel");
    }
  }, [datosAgrupados, pestañaActiva, filtros]);

  /**
   * Recargar datos
   */
  const recargarDatos = useCallback(() => {
    obtenerVales();
  }, [obtenerVales]);

  /**
   * Aplicar filtros y recargar
   */
  const handleActualizarFiltros = useCallback(
    (nuevosFiltros) => {
      actualizarFiltros(nuevosFiltros);
    },
    [actualizarFiltros]
  );

  /**
   * Limpiar filtros y recargar
   */
  const handleLimpiarFiltros = useCallback(() => {
    limpiarFiltros();
  }, [limpiarFiltros]);

  /**
   * Obtener datos actuales de la pestaña activa
   */
  const datosActuales = datosAgrupados[pestañaActiva] || [];
  const resumenActual = resumenGeneral[pestañaActiva] || {};

  return {
    // Datos
    datos: datosActuales,
    resumen: resumenActual,
    loading,
    error,

    // Pestaña
    pestañaActiva,
    cambiarPestaña: handleCambiarPestaña,

    // Grupos
    toggleGrupo,
    estaColapsado,
    expandirTodos,
    colapsarTodos,

    // Filtros
    filtros,
    actualizarFiltros: handleActualizarFiltros,
    limpiarFiltros: handleLimpiarFiltros,
    hayFiltrosActivos: hayFiltrosActivos(),

    // Acciones
    recargarDatos,
    exportarAExcel,

    // Helpers (exportar para usar en componentes)
    helpers: {
      obtenerColorEmpresa: helpers.obtenerColorEmpresa,
      obtenerColorEstado: helpers.obtenerColorEstado,
      obtenerIconoEstado: helpers.obtenerIconoEstado,
      obtenerEtiquetaEstado: helpers.obtenerEtiquetaEstado,
      formatearNumero: helpers.formatearNumero,
      formatearFecha: helpers.formatearFecha,
      formatearFechaCorta: helpers.formatearFechaCorta,
      formatearHora: helpers.formatearHora,
    },
  };
};
