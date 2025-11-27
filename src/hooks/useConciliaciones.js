/**
 * src/hooks/useConciliaciones.js
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./useAuth";

import {
  initialConciliacionesState,
  initialFiltrosState,
  initialVistaPreviaState,
} from "./conciliaciones/useConciliacionesState";
import { useConciliacionesQueries } from "./conciliaciones/useConciliacionesQueries";
import { useConciliacionesHelpers } from "./conciliaciones/useConciliacionesHelpers";
import { useConciliacionesGenerar } from "./conciliaciones/useConciliacionesGenerar";
import { useSindicatos } from "./conciliaciones/useSindicatos";

export const useConciliaciones = () => {
  const { userProfile, hasRole } = useAuth();

  const [conciliaciones, setConciliaciones] = useState(
    initialConciliacionesState.conciliaciones
  );
  const [loading, setLoading] = useState(initialConciliacionesState.loading);
  const [error, setError] = useState(initialConciliacionesState.error);
  const [filtros, setFiltros] = useState(initialFiltrosState);
  const [vistaPrevia, setVistaPrevia] = useState(initialVistaPreviaState);
  const [semanas, setSemanas] = useState([]);
  const [obras, setObras] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  const queries = useConciliacionesQueries();
  const helpers = useConciliacionesHelpers();
  const generar = useConciliacionesGenerar(queries, helpers, userProfile);

  const {
    sindicatos,
    loading: loadingSindicatos,
    loadSindicatos,
    clearSindicatos,
  } = useSindicatos();

  // Memoizar valores estables
  const isAdmin = useMemo(() => hasRole("Administrador"), [hasRole]);
  const idPersona = userProfile?.id_persona;
  const idSindicato = userProfile?.id_sindicato;

  /**
   * Cargar semanas - SIN dependencias de callbacks
   */
  const loadSemanas = useCallback(async () => {
    if (!idPersona) return;

    setLoadingCatalogos(true);

    // ✅ Para Admin: usar el sindicato seleccionado en filtros
    // ✅ Para no-Admin: usar su sindicato asignado
    const sindicatoFiltro = isAdmin
      ? filtros.sindicatoSeleccionado
      : idSindicato;

    const resultado =
      await queries.fetchSemanasConValesVerificados(sindicatoFiltro);

    setSemanas(resultado.data);
    setLoadingCatalogos(false);
  }, [idPersona, isAdmin, idSindicato, filtros.sindicatoSeleccionado, queries]);

  /**
   * Cargar obras - SIN dependencias de callbacks
   */
  const loadObras = useCallback(
    async (semana) => {
      if (!semana || !idPersona) return;

      setLoadingCatalogos(true);
      const sindicatoFiltro = isAdmin
        ? filtros.sindicatoSeleccionado
        : idSindicato;

      const resultado = await queries.fetchObrasConValesVerificados(
        semana,
        sindicatoFiltro
      );

      setObras(resultado.data);
      setLoadingCatalogos(false);
    },
    [idPersona, isAdmin, idSindicato, filtros.sindicatoSeleccionado, queries]
  );

  /**
   * Cargar vista previa
   */
  const cargarVistaPrevia = useCallback(async () => {
    if (!filtros.semanaSeleccionada || !filtros.obraSeleccionada) {
      setError("Debe seleccionar semana y obra");
      return;
    }

    try {
      setVistaPrevia((prev) => ({ ...prev, loading: true, error: null }));

      const sindicatoFiltro = isAdmin
        ? filtros.sindicatoSeleccionado
        : idSindicato;

      const resultado = await queries.fetchValesVerificadosRenta(
        filtros,
        sindicatoFiltro
      );

      if (!resultado.success) throw new Error(resultado.error);

      const validacion = helpers.validarValesDisponibles(resultado.data);

      if (!validacion.valid) throw new Error(validacion.error);

      const gruposPorPlacas = helpers.agruparValesPorPlacas(resultado.data);

      const totales = helpers.calcularTotalesGenerales(gruposPorPlacas);

      setVistaPrevia({
        valesAgrupados: gruposPorPlacas,
        totalesGenerales: totales,
        valesOriginales: resultado.data,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("[useConciliaciones] Error en cargarVistaPrevia:", error);
      setVistaPrevia((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, [filtros, isAdmin, idSindicato, queries, helpers]);

  /**
   * Actualizar filtros
   */
  const updateFiltros = useCallback((nuevosFiltros) => {
    setFiltros((prev) => ({
      ...prev,
      ...nuevosFiltros,
    }));

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
    setSemanas([]); // ← NUEVO: Limpiar semanas también
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
      clearFiltros();
      await loadSemanas();
    }

    return resultado;
  }, [vistaPrevia, filtros, generar, clearFiltros, loadSemanas]);

  /**
   * Cargar historial
   */
  const loadHistorial = useCallback(async () => {
    if (!idPersona) return;

    try {
      setLoading(true);
      setError(null);

      const sindicatoFiltro = isAdmin ? null : idSindicato;

      const resultado = await queries.fetchConciliacionesGeneradas(
        { tipo_conciliacion: "renta" },
        sindicatoFiltro
      );

      if (!resultado.success) throw new Error(resultado.error);

      setConciliaciones(resultado.data);
    } catch (error) {
      console.error("[useConciliaciones] Error en loadHistorial:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [idPersona, isAdmin, idSindicato, queries]);

  /**
   * Obtener conciliación existente
   */
  const obtenerConciliacion = useCallback(
    async (idConciliacion) => {
      return await generar.obtenerConciliacionExistente(idConciliacion);
    },
    [generar]
  );

  // Cargar sindicatos SOLO cuando cambia idPersona o isAdmin
  useEffect(() => {
    if (idPersona && isAdmin) {
      loadSindicatos();
    } else if (!isAdmin) {
      clearSindicatos();
    }
  }, [idPersona, isAdmin]);

  // ✅ CORREGIDO: Cargar semanas cuando cambia idPersona O sindicatoSeleccionado
  useEffect(() => {
    if (idPersona) {
      loadSemanas();
    }
  }, [
    idPersona,
    filtros.sindicatoSeleccionado, // ← NUEVO: Recargar cuando cambie el sindicato
  ]);

  // Cargar obras SOLO cuando cambia la semana
  useEffect(() => {
    if (filtros.semanaSeleccionada) {
      loadObras(filtros.semanaSeleccionada);
    }
  }, [filtros.semanaSeleccionada?.numero, filtros.semanaSeleccionada?.año]);

  return {
    conciliaciones,
    semanas,
    obras,
    sindicatos,
    loading,
    loadingCatalogos: loadingCatalogos || loadingSindicatos,
    error,
    filtros,
    updateFiltros,
    clearFiltros,
    vistaPrevia,
    cargarVistaPrevia,
    generarConciliacion,
    obtenerConciliacion,
    loadHistorial,
    helpers,
  };
};
