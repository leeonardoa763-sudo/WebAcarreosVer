/**
 * src/hooks/useConciliacionesMaterial.js
 *
 * Hook principal para conciliaciones de material
 *
 * Funcionalidades:
 * - Orquesta queries, helpers y generación
 * - Gestiona estados de filtros y vista previa
 * - Maneja catálogos (semanas, obras)
 * - Genera conciliaciones en BD
 *
 * Usado en: Conciliaciones.jsx
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./useAuth";

import {
  initialConciliacionesState,
  initialFiltrosState,
  initialVistaPreviaState,
} from "./conciliaciones/useConciliacionesState";
import { useConciliacionesMaterialQueries } from "./conciliaciones/useConciliacionesMaterialQueries";
import { useConciliacionesMaterialHelpers } from "./conciliaciones/useConciliacionesMaterialHelpers";
import { useConciliacionesQueries } from "./conciliaciones/useConciliacionesQueries";
import { useSindicatos } from "./conciliaciones/useSindicatos";

export const useConciliacionesMaterial = () => {
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
  const [materiales, setMateriales] = useState([]); // 👈 NUEVO
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  const queriesMaterial = useConciliacionesMaterialQueries();
  const helpers = useConciliacionesMaterialHelpers();
  const queriesGenerales = useConciliacionesQueries();

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
   * Cargar semanas con vales de material verificados
   */
  const loadSemanas = useCallback(async () => {
    if (!idPersona) return;
    console.log("📞 [useConciliacionesMaterial] loadSemanas LLAMADO", {
      idPersona,
      sindicatoSeleccionado: filtros.sindicatoSeleccionado,
      timestamp: new Date().toISOString(),
    });

    console.log("[useConciliacionesMaterial] loadSemanas - Inicio");
    setLoadingCatalogos(true);

    const sindicatoFiltro = isAdmin
      ? filtros.sindicatoSeleccionado
      : idSindicato;

    const resultado =
      await queriesMaterial.fetchSemanasConValesMaterial(sindicatoFiltro);

    setSemanas(resultado.data);
    setLoadingCatalogos(false);

    console.log(
      "[useConciliacionesMaterial] Semanas cargadas:",
      resultado.data.length
    );
  }, [
    idPersona,
    isAdmin,
    idSindicato,
    filtros.sindicatoSeleccionado,
    queriesMaterial,
  ]);

  /**
   * Cargar obras con vales de material verificados
   */
  const loadObras = useCallback(
    async (semana) => {
      if (!semana || !idPersona) return;

      console.log("[useConciliacionesMaterial] loadObras - Inicio");
      setLoadingCatalogos(true);

      const sindicatoFiltro = isAdmin
        ? filtros.sindicatoSeleccionado
        : idSindicato;

      const resultado = await queriesMaterial.fetchObrasConValesMaterial(
        semana,
        sindicatoFiltro
      );

      setObras(resultado.data);
      setLoadingCatalogos(false);

      console.log(
        "[useConciliacionesMaterial] Obras cargadas:",
        resultado.data.length
      );
    },
    [
      idPersona,
      isAdmin,
      idSindicato,
      filtros.sindicatoSeleccionado,
      queriesMaterial,
    ]
  );

  /**
   * Cargar materiales con vales verificados de material
   */
  const loadMateriales = useCallback(
    async (semana, idObra) => {
      if (!semana || !idObra || !idPersona) return;

      console.log("[useConciliacionesMaterial] loadMateriales - Inicio");
      setLoadingCatalogos(true);

      const sindicatoFiltro = isAdmin
        ? filtros.sindicatoSeleccionado
        : idSindicato;

      const resultado = await queriesMaterial.fetchMaterialesConVales(
        semana,
        idObra,
        sindicatoFiltro
      );

      setMateriales(resultado.data);
      setLoadingCatalogos(false);

      console.log(
        "[useConciliacionesMaterial] Materiales cargados:",
        resultado.data.length
      );
    },
    [
      idPersona,
      isAdmin,
      idSindicato,
      queriesMaterial,
      filtros.sindicatoSeleccionado,
    ]
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
      console.log("[useConciliacionesMaterial] cargarVistaPrevia - Inicio");
      setVistaPrevia((prev) => ({ ...prev, loading: true, error: null }));

      const sindicatoFiltro = isAdmin
        ? filtros.sindicatoSeleccionado
        : idSindicato;

      const resultado = await queriesMaterial.fetchValesVerificadosMaterial(
        filtros,
        sindicatoFiltro
      );

      if (!resultado.success) throw new Error(resultado.error);

      console.log(
        "[useConciliacionesMaterial] Vales obtenidos:",
        resultado.data.length
      );

      const validacion = helpers.validarValesDisponibles(resultado.data);

      if (!validacion.valid) throw new Error(validacion.error);

      const gruposPorPlacas = helpers.agruparValesPorPlacas(resultado.data);

      const totales = helpers.calcularTotalesGenerales(gruposPorPlacas);

      console.log(
        "[useConciliacionesMaterial] Grupos creados:",
        Object.keys(gruposPorPlacas).length
      );
      console.log("[useConciliacionesMaterial] Totales:", totales);

      setVistaPrevia({
        valesAgrupados: gruposPorPlacas,
        totalesGenerales: totales,
        valesOriginales: resultado.data,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error(
        "[useConciliacionesMaterial] Error en cargarVistaPrevia:",
        error
      );
      setVistaPrevia((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, [filtros, isAdmin, idSindicato, queriesMaterial, helpers]);

  /**
   * Actualizar filtros
   */
  const updateFiltros = useCallback((nuevosFiltros) => {
    console.log(
      "[useConciliacionesMaterial] updateFiltros - Nuevos filtros:",
      nuevosFiltros
    );

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
    console.log("[useConciliacionesMaterial] clearFiltros");
    setFiltros(initialFiltrosState);
    setVistaPrevia(initialVistaPreviaState);
    setObras([]);
    setSemanas([]);
    setMateriales([]); // 👈 NUEVO
  }, []);

  /**
   * Generar conciliación de material
   */
  const generarConciliacion = useCallback(async () => {
    if (!vistaPrevia.valesOriginales.length) {
      return {
        success: false,
        error: "No hay vales para generar conciliación",
      };
    }

    try {
      console.log("[useConciliacionesMaterial] generarConciliacion - Inicio");

      // Preparar datos
      const dataConciliacion = helpers.prepararDatosConciliacion(
        vistaPrevia.valesOriginales,
        vistaPrevia.totalesGenerales,
        filtros,
        idSindicato,
        idPersona
      );

      // Extraer IDs de vales
      const idsVales = vistaPrevia.valesOriginales.map((v) => v.id_vale);

      console.log(
        "[useConciliacionesMaterial] Guardando conciliación con",
        idsVales.length,
        "vales"
      );

      // Guardar en BD
      const resultado = await queriesGenerales.guardarConciliacion(
        dataConciliacion,
        idsVales
      );

      if (!resultado.success) {
        throw new Error(resultado.error);
      }

      console.log(
        "[useConciliacionesMaterial] Conciliación guardada:",
        resultado.data.folio
      );

      // Limpiar estados
      clearFiltros();
      await loadSemanas();

      return {
        success: true,
        data: resultado.data,
        message: `Conciliación ${resultado.data.folio} generada correctamente`,
      };
    } catch (error) {
      console.error(
        "[useConciliacionesMaterial] Error en generarConciliacion:",
        error
      );
      return {
        success: false,
        error: error.message || "Error al generar conciliación",
      };
    }
  }, [
    vistaPrevia,
    filtros,
    idSindicato,
    idPersona,
    helpers,
    queriesGenerales,
    clearFiltros,
    loadSemanas,
  ]);

  /**
   * Cargar historial de conciliaciones de material
   */
  const loadHistorial = useCallback(async () => {
    if (!idPersona) return;

    try {
      console.log("[useConciliacionesMaterial] loadHistorial - Inicio");
      setLoading(true);
      setError(null);

      const sindicatoFiltro = isAdmin ? null : idSindicato;

      const resultado = await queriesGenerales.fetchConciliacionesGeneradas(
        { tipo_conciliacion: "material" },
        sindicatoFiltro
      );

      if (!resultado.success) throw new Error(resultado.error);

      setConciliaciones(resultado.data);

      console.log(
        "[useConciliacionesMaterial] Conciliaciones cargadas:",
        resultado.data.length
      );
    } catch (error) {
      console.error(
        "[useConciliacionesMaterial] Error en loadHistorial:",
        error
      );
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [idPersona, isAdmin, idSindicato, queriesGenerales]);

  // Cargar obras SOLO cuando cambia la semana
  useEffect(() => {
    if (filtros.semanaSeleccionada) {
      loadObras(filtros.semanaSeleccionada);
    }
  }, [filtros.semanaSeleccionada?.numero, filtros.semanaSeleccionada?.año]); // ✅ REMOVIDO: loadObras

  // Cargar semanas cuando cambia idPersona O sindicatoSeleccionado
  useEffect(() => {
    console.log("🔄 [useConciliacionesMaterial] useEffect SEMANAS ejecutado", {
      idPersona,
      sindicatoSeleccionado: filtros.sindicatoSeleccionado,
      timestamp: new Date().toISOString(),
    });

    if (idPersona) {
      loadSemanas();
    }
  }, [
    idPersona,
    filtros.sindicatoSeleccionado,
    // NO incluir loadSemanas aquí
  ]);

  // Cargar obras SOLO cuando cambia la semana
  useEffect(() => {
    if (filtros.semanaSeleccionada) {
      loadObras(filtros.semanaSeleccionada);
    }
  }, [
    filtros.semanaSeleccionada?.numero,
    filtros.semanaSeleccionada?.año,
    // NO incluir loadObras aquí
  ]);

  // Cargar materiales SOLO cuando cambia la obra
  useEffect(() => {
    if (filtros.semanaSeleccionada && filtros.obraSeleccionada) {
      loadMateriales(filtros.semanaSeleccionada, filtros.obraSeleccionada);
    } else {
      setMateriales([]); // Limpiar materiales si no hay obra seleccionada
    }
  }, [
    filtros.semanaSeleccionada?.numero,
    filtros.semanaSeleccionada?.año,
    filtros.obraSeleccionada,
  ]);

  return {
    conciliaciones,
    semanas,
    obras,
    materiales,
    sindicatos,
    loading,
    loadingCatalogos: loadingCatalogos || loadingSindicatos,
    error,
    filtros,
    updateFiltros,
    clearFiltros,
    vistaPrevia,
    loadSemanas,
    cargarVistaPrevia,
    generarConciliacion,
    loadHistorial,
    helpers,
  };
};
