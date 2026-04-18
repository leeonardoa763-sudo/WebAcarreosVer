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
    initialConciliacionesState.conciliaciones,
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

    setLoadingCatalogos(true);

    const sindicatoFiltro = isAdmin
      ? filtros.sindicatoSeleccionado
      : idSindicato;

    const resultado =
      await queriesMaterial.fetchSemanasConValesMaterial(sindicatoFiltro);

    setSemanas(resultado.data);
    setLoadingCatalogos(false);
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
      if (!semana || !idPersona) {
        console.log("⚠️ NO SE EJECUTA: Falta semana o idPersona");
        console.log("════════════════════════════════════════════\n");
        return;
      }

      setLoadingCatalogos(true);

      const sindicatoFiltro = isAdmin
        ? filtros.sindicatoSeleccionado
        : idSindicato;

      const resultado =
        await queriesMaterial.fetchObrasConValesMaterial(semana);

      if (!resultado.success) {
        console.log("❌ ERROR:", resultado.error);
      }

      if (resultado.data?.length === 0) {
        console.log("⚠️⚠️⚠️ NO SE ENCONTRARON OBRAS ⚠️⚠️⚠️");
      }

      setObras(resultado.data);
      setLoadingCatalogos(false);
    },
    [
      idPersona,
      isAdmin,
      idSindicato,
      filtros.sindicatoSeleccionado,
      queriesMaterial,
    ],
  );

  /**
   * Cargar materiales con vales verificados de material
   */
  const loadMateriales = useCallback(
    async (semana, idObra) => {
      if (!semana || !idObra || !idPersona) return;

      setLoadingCatalogos(true);

      const sindicatoFiltro = isAdmin
        ? filtros.sindicatoSeleccionado
        : idSindicato;

      const resultado = await queriesMaterial.fetchMaterialesConVales(
        semana,
        idObra,
        sindicatoFiltro,
      );

      setMateriales(resultado.data);
      setLoadingCatalogos(false);
    },
    [
      idPersona,
      isAdmin,
      idSindicato,
      queriesMaterial,
      filtros.sindicatoSeleccionado,
    ],
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

      const sindicatoFiltro = isAdmin
        ? filtros.sindicatoSeleccionado
        : idSindicato;

      const resultado = await queriesMaterial.fetchValesVerificadosMaterial(
        filtros,
        sindicatoFiltro,
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
      console.error(
        "[useConciliacionesMaterial] Error en cargarVistaPrevia:",
        error,
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
    setSemanas([]);
    setMateriales([]);
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
      // --- LOGS DIAGNÓSTICO ---
      console.log("[generarConciliacion] idSindicato:", idSindicato);
      console.log("[generarConciliacion] idPersona:", idPersona);
      console.log(
        "[generarConciliacion] filtros.sindicatoSeleccionado:",
        filtros.sindicatoSeleccionado,
      );
      console.log(
        "[generarConciliacion] primer vale - operador:",
        vistaPrevia.valesOriginales[0]?.operadores,
      );
      console.log(
        "[generarConciliacion] primer vale - viajes detalle:",
        vistaPrevia.valesOriginales[0]?.vale_material_detalles?.[0]
          ?.vale_material_viajes,
      );
      // --- FIN LOGS ---
      // Preparar datos
      const dataConciliacion = helpers.prepararDatosConciliacion(
        vistaPrevia.valesOriginales,
        vistaPrevia.totalesGenerales,
        filtros,
        idSindicato,
        idPersona,
      );

      // Extraer IDs de vales
      const idsVales = vistaPrevia.valesOriginales.map((v) => v.id_vale);

      // Guardar en BD
      const resultado = await queriesGenerales.guardarConciliacion(
        dataConciliacion,
        idsVales,
      );

      if (!resultado.success) {
        throw new Error(resultado.error);
      }

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
        error,
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
   * Cargar historial de conciliaciones de material SIN vales
   */
  const loadHistorial = useCallback(async () => {
    if (!idPersona) return;

    try {
      setLoading(true);
      setError(null);

      const sindicatoFiltro = isAdmin ? null : idSindicato;

      // ← CAMBIO: Usar fetchConciliacionesSinVales en vez de fetchConciliacionesGeneradas
      const resultado = await queriesGenerales.fetchConciliacionesSinVales(
        { tipo_conciliacion: "material" },
        sindicatoFiltro,
      );

      if (!resultado.success) throw new Error(resultado.error);

      setConciliaciones(resultado.data);
    } catch (error) {
      console.error(
        "[useConciliacionesMaterial] Error en loadHistorial:",
        error,
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
