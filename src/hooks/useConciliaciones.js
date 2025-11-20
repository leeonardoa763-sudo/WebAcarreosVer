/**
 * src/hooks/useConciliaciones.js
 *
 * Hook principal de manejo de conciliaciones (orquestador)
 *
 * Funcionalidades:
 * - Integra todos los módulos de conciliaciones
 * - Gestiona estados globales
 * - Expone API unificada
 * - Maneja carga de datos y vista previa
 *
 * Usado en: pages/Conciliaciones.jsx
 */

// 1. React y hooks
import { useState, useEffect, useCallback } from "react";

// 2. Hooks personalizados
import { useAuth } from "./useAuth";

// 3. Módulos de conciliaciones
import {
  initialConciliacionesState,
  initialFiltrosState,
  initialVistaPreviaState,
} from "./conciliaciones/useConciliacionesState";
import { useConciliacionesQueries } from "./conciliaciones/useConciliacionesQueries";
import { useConciliacionesHelpers } from "./conciliaciones/useConciliacionesHelpers";
import { useConciliacionesGenerar } from "./conciliaciones/useConciliacionesGenerar";

export const useConciliaciones = () => {
  const { userProfile, hasRole } = useAuth();

  // Estados principales
  const [conciliaciones, setConciliaciones] = useState(
    initialConciliacionesState.conciliaciones
  );
  const [loading, setLoading] = useState(initialConciliacionesState.loading);
  const [error, setError] = useState(initialConciliacionesState.error);

  // Estados de filtros
  const [filtros, setFiltros] = useState(initialFiltrosState);

  // Estados de vista previa
  const [vistaPrevia, setVistaPrevia] = useState(initialVistaPreviaState);

  // Estados de catálogos
  const [semanas, setSemanas] = useState([]);
  const [obras, setObras] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  // Hooks de módulos
  const queries = useConciliacionesQueries();
  const helpers = useConciliacionesHelpers();
  const generar = useConciliacionesGenerar(queries, helpers, userProfile);

  /**
   * Cargar semanas con vales verificados
   */
  const loadSemanas = useCallback(async () => {
    if (!userProfile?.id_persona) return;

    setLoadingCatalogos(true);
    const idSindicato = hasRole("Administrador")
      ? null
      : userProfile.id_sindicato;

    const resultado =
      await queries.fetchSemanasConValesVerificados(idSindicato);
    setSemanas(resultado.data);
    setLoadingCatalogos(false);
  }, [queries, userProfile, hasRole]);

  /**
   * Cargar obras con vales verificados para la semana seleccionada
   */
  const loadObras = useCallback(
    async (semana) => {
      if (!semana || !userProfile?.id_persona) return;

      setLoadingCatalogos(true);
      const idSindicato = hasRole("Administrador")
        ? filtros.sindicatoSeleccionado
        : userProfile.id_sindicato;

      const resultado = await queries.fetchObrasConValesVerificados(
        semana,
        idSindicato
      );
      setObras(resultado.data);
      setLoadingCatalogos(false);
    },
    [queries, filtros.sindicatoSeleccionado, userProfile, hasRole]
  );

  /**
   * Cargar vista previa de conciliación
   */
  const cargarVistaPrevia = useCallback(async () => {
    if (!filtros.semanaSeleccionada || !filtros.obraSeleccionada) {
      setError("Debe seleccionar semana y obra");
      return;
    }

    try {
      setVistaPrevia((prev) => ({ ...prev, loading: true, error: null }));

      const idSindicato = hasRole("Administrador")
        ? filtros.sindicatoSeleccionado
        : userProfile.id_sindicato;

      const resultado = await queries.fetchValesVerificadosRenta(
        filtros,
        idSindicato
      );

      if (!resultado.success) {
        throw new Error(resultado.error);
      }

      // Validar vales
      const validacion = helpers.validarValesDisponibles(resultado.data);
      if (!validacion.valid) {
        throw new Error(validacion.error);
      }

      // Agrupar por placas
      const gruposPorPlacas = helpers.agruparValesPorPlacas(resultado.data);

      // Calcular totales
      const totales = helpers.calcularTotalesGenerales(gruposPorPlacas);

      setVistaPrevia({
        valesAgrupados: gruposPorPlacas,
        totalesGenerales: totales,
        valesOriginales: resultado.data,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error en cargarVistaPrevia:", error);
      setVistaPrevia((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, [filtros, queries, helpers, userProfile, hasRole]);

  /**
   * Actualizar filtros
   */
  const updateFiltros = useCallback((nuevosFiltros) => {
    setFiltros((prev) => ({
      ...prev,
      ...nuevosFiltros,
    }));

    // Limpiar vista previa si cambian filtros críticos
    if (
      nuevosFiltros.semanaSeleccionada !== undefined ||
      nuevosFiltros.obraSeleccionada !== undefined ||
      nuevosFiltros.sindicatoSeleccionado !== undefined
    ) {
      setVistaPrevia(initialVistaPreviaState);
    }
  }, []);

  /**
   * Limpiar filtros
   */
  const clearFiltros = useCallback(() => {
    setFiltros(initialFiltrosState);
    setVistaPrevia(initialVistaPreviaState);
    setObras([]);
  }, []);

  /**
   * Generar conciliación
   */
  const generarConciliacion = useCallback(async () => {
    if (!vistaPrevia.valesOriginales.length) {
      return {
        success: false,
        error: "No hay vales para generar conciliación",
      };
    }

    const resultado = await generar.generarNuevaConciliacion(
      vistaPrevia.valesOriginales,
      vistaPrevia.totalesGenerales,
      filtros
    );

    if (resultado.success) {
      // Limpiar vista previa
      clearFiltros();

      // Recargar semanas (puede que ya no haya vales disponibles)
      await loadSemanas();
    }

    return resultado;
  }, [vistaPrevia, filtros, generar, clearFiltros, loadSemanas]);

  /**
   * Cargar historial de conciliaciones
   */
  const loadHistorial = useCallback(async () => {
    if (!userProfile?.id_persona) return;

    try {
      setLoading(true);
      setError(null);

      const idSindicato = hasRole("Administrador")
        ? null
        : userProfile.id_sindicato;

      const resultado = await queries.fetchConciliacionesGeneradas(
        { tipo_conciliacion: "renta" },
        idSindicato
      );

      if (!resultado.success) {
        throw new Error(resultado.error);
      }

      setConciliaciones(resultado.data);
    } catch (error) {
      console.error("Error en loadHistorial:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [queries, userProfile, hasRole]);

  /**
   * Obtener conciliación existente para regenerar PDF/Excel
   */
  const obtenerConciliacion = useCallback(
    async (idConciliacion) => {
      return await generar.obtenerConciliacionExistente(idConciliacion);
    },
    [generar]
  );

  // Cargar semanas al montar
  useEffect(() => {
    if (userProfile?.id_persona) {
      loadSemanas();
    }
  }, [userProfile?.id_persona, loadSemanas]);

  // Cargar obras cuando cambia la semana
  useEffect(() => {
    if (filtros.semanaSeleccionada) {
      loadObras(filtros.semanaSeleccionada);
    }
  }, [filtros.semanaSeleccionada, loadObras]);

  return {
    // Datos
    conciliaciones,
    semanas,
    obras,
    loading,
    loadingCatalogos,
    error,

    // Filtros
    filtros,
    updateFiltros,
    clearFiltros,

    // Vista previa
    vistaPrevia,
    cargarVistaPrevia,

    // Acciones
    generarConciliacion,
    obtenerConciliacion,
    loadHistorial,

    // Helpers
    helpers,
  };
};
