/**
 * src/hooks/useVales.js
 *
 * Hook principal de manejo de vales (orquestador)
 *
 * Funcionalidades:
 * - Integra todos los módulos de vales
 * - Gestiona estados globales
 * - Expone API unificada
 * - Maneja carga de datos
 *
 * Usado en: Vales.jsx, Conciliaciones.jsx
 */

// 1. React y hooks
import { useState, useEffect, useCallback } from "react";

// 2. Hooks personalizados
import { useAuth } from "./useAuth";

// 2.5. Config
import { supabase } from "../config/supabase";

// 3. Módulos de vales
import {
  initialValesState,
  initialFiltersState,
  initialCatalogosState,
} from "./vales/useValesState";
import { useValesQueries } from "./vales/useValesQueries";
import { useValesFilters } from "./vales/useValesFilters";
import { useValesHelpers } from "./vales/useValesHelpers";

export const useVales = () => {
  const { userProfile } = useAuth();

  // Estados principales
  const [vales, setVales] = useState(initialValesState.vales);
  const [loading, setLoading] = useState(initialValesState.loading);
  const [error, setError] = useState(initialValesState.error);

  // Estados de filtros
  const [filters, setFilters] = useState(initialFiltersState);

  // Estados de catálogos
  const [obras, setObras] = useState(initialCatalogosState.obras);
  const [materiales, setMateriales] = useState(
    initialCatalogosState.materiales
  );
  const [sindicatos, setSindicatos] = useState(
    initialCatalogosState.sindicatos
  );
  const [loadingCatalogos, setLoadingCatalogos] = useState(
    initialCatalogosState.loadingCatalogos
  );

  // Hooks de módulos
  const { buildBaseQuery, fetchObras, fetchValeById, fetchValeByFolio } =
    useValesQueries();
  const { applyFilters, hasActiveFilters } = useValesFilters();
  const { calcularPrecioTotal } = useValesHelpers();

  /**
   * Cargar catálogo de obras
   */
  const loadObras = useCallback(async () => {
    setLoadingCatalogos(true);
    const result = await fetchObras();
    setObras(result.data);
    setLoadingCatalogos(false);
  }, [fetchObras]);

  /**
   * Cargar catálogo de materiales
   */
  const loadMateriales = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("material")
        .select("id_material, material, id_tipo_de_material")
        .order("material");

      if (error) throw error;
      setMateriales(data || []);
    } catch (error) {
      console.error("Error al cargar materiales:", error);
      setMateriales([]);
    }
  }, []);

  /**
   * Cargar catálogo de sindicatos
   */
  const loadSindicatos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("sindicatos")
        .select("id_sindicato, sindicato")
        .order("sindicato");

      if (error) throw error;
      setSindicatos(data || []);
    } catch (error) {
      console.error("Error al cargar sindicatos:", error);
      setSindicatos([]);
    }
  }, []);

  /**
   * Obtener vales con filtros (sin paginación)
   */
  const fetchVales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Construir query base
      let query = buildBaseQuery();

      // Ordenar por fecha
      query = query.order("fecha_creacion", { ascending: false });

      // Ejecutar query
      const { data, error } = await query;

      if (error) throw error;

      // Aplicar filtros en el cliente
      const filteredData = applyFilters(data || [], filters);

      setVales(filteredData);
    } catch (error) {
      console.error("❌ Error en fetchVales:", error);
      setError("No se pudieron cargar los vales");
    } finally {
      setLoading(false);
    }
  }, [
    buildBaseQuery,
    applyFilters,
    filters.searchTerm,
    filters.id_obra,
    filters.id_material,
    filters.id_sindicato,
    filters.estado,
    filters.fecha_inicio,
    filters.fecha_fin,
  ]);

  /**
   * Actualizar filtros
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      return updated;
    });
  }, []);

  /**
   * Limpiar filtros
   */
  const clearFilters = useCallback(() => {
    setFilters(initialFiltersState);
  }, []);

  /**
   * Efecto para cargar catálogos al montar
   */
  useEffect(() => {
    loadObras();
    loadMateriales();
    loadSindicatos(); // ← AGREGAR
  }, [loadObras, loadMateriales, loadSindicatos]); // ← AGREGAR loadSindicatos

  /**
   * Efecto para cargar vales cuando cambian filtros
   */
  useEffect(() => {
    if (userProfile?.id_persona) {
      fetchVales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.searchTerm,
    filters.id_obra,
    filters.id_material,
    filters.id_sindicato,
    filters.estado,
    filters.fecha_inicio,
    filters.fecha_fin,
    userProfile?.id_persona,
  ]);

  return {
    // Datos
    vales,
    obras,
    materiales,
    sindicatos,
    loading,
    loadingCatalogos,
    error,

    // Filtros
    filters,
    updateFilters,
    clearFilters,

    // Funciones
    fetchVales,
    fetchValeById,
    fetchValeByFolio,
    calcularPrecioTotal,

    // Helpers
    hasFilters: hasActiveFilters(filters),
  };
};
