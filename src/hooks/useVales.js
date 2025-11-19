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

// 3. Módulos de vales
import {
  initialValesState,
  initialFiltersState,
  initialPaginationState,
  initialCatalogosState,
} from "./vales/useValesState";
import { useValesQueries } from "./vales/useValesQueries";
import { useValesFilters } from "./vales/useValesFilters";
import { useValesPagination } from "./vales/useValesPagination";
import { useValesHelpers } from "./vales/useValesHelpers";

export const useVales = () => {
  const { userProfile } = useAuth();

  // Estados principales
  const [vales, setVales] = useState(initialValesState.vales);
  const [loading, setLoading] = useState(initialValesState.loading);
  const [error, setError] = useState(initialValesState.error);

  // Estados de filtros
  const [filters, setFilters] = useState(initialFiltersState);

  // Estados de paginación
  const [pagination, setPagination] = useState(initialPaginationState);

  // Estados de catálogos
  const [obras, setObras] = useState(initialCatalogosState.obras);
  const [loadingCatalogos, setLoadingCatalogos] = useState(
    initialCatalogosState.loadingCatalogos
  );

  // Hooks de módulos
  const { buildBaseQuery, fetchObras, fetchValeById, fetchValeByFolio } =
    useValesQueries();
  const { applyFilters, hasActiveFilters } = useValesFilters();
  const { calculateRange, updatePaginationState } = useValesPagination();
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
   * Obtener vales con filtros y paginación
   */
  const fetchVales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Construir query base

      let query = buildBaseQuery();

      // Aplicar paginación
      const { from, to } = calculateRange(
        pagination.currentPage,
        pagination.pageSize
      );

      query = query
        .order("fecha_creacion", { ascending: false })
        .range(from, to);

      // Ejecutar query

      const { data, error, count } = await query;

      if (error) throw error;

      // Aplicar filtros en el cliente

      const filteredData = applyFilters(data || [], filters);

      setVales(filteredData);

      // Actualizar paginación

      setPagination((prev) => {
        const newState = updatePaginationState(prev, count);

        return newState;
      });

      console.log("✅ fetchVales - FIN exitoso");
    } catch (error) {
      console.error("❌ Error en fetchVales:", error);
      setError("No se pudieron cargar los vales");
    } finally {
      setLoading(false);
    }
  }, [
    buildBaseQuery,
    calculateRange,
    applyFilters,
    updatePaginationState,
    filters.searchTerm,
    filters.id_obra,
    filters.tipo_vale,
    filters.estado,
    filters.fecha_inicio,
    filters.fecha_fin,
    pagination.currentPage,
    pagination.pageSize,
  ]);

  /**
   * Actualizar filtros
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };

      return updated;
    });

    // Reset a primera página cuando cambian filtros
    setPagination((prev) => {
      const updated = { ...prev, currentPage: 1 };

      return updated;
    });
  }, []);

  /**
   * Limpiar filtros
   */
  const clearFilters = useCallback(() => {
    setFilters(initialFiltersState);
    setPagination((prev) => ({
      ...prev,
      currentPage: 1,
    }));
  }, []);

  /**
   * Cambiar página
   */
  const goToPage = useCallback(
    (page) => {
      if (page >= 1 && page <= pagination.totalPages) {
        setPagination((prev) => ({
          ...prev,
          currentPage: page,
        }));
      }
    },
    [pagination.totalPages]
  );

  /**
   * Efecto para cargar catálogos al montar
   */
  useEffect(() => {
    loadObras();
  }, [loadObras]);

  /**
   * Efecto para cargar vales cuando cambian filtros o paginación
   *
   * IMPORTANTE: NO incluir fetchVales en las dependencias
   * para evitar bucles infinitos
   */
  useEffect(() => {
    if (userProfile?.id_persona) {
      fetchVales();
    } else {
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.searchTerm,
    filters.id_obra,
    filters.tipo_vale,
    filters.estado,
    filters.fecha_inicio,
    filters.fecha_fin,
    pagination.currentPage,
    pagination.pageSize,
    userProfile?.id_persona,
    // ❌ NO incluir fetchVales aquí - causa bucle infinito
  ]);

  return {
    // Datos
    vales,
    obras,
    loading,
    loadingCatalogos,
    error,

    // Filtros
    filters,
    updateFilters,
    clearFilters,

    // Paginación
    pagination,
    goToPage,

    // Funciones
    fetchVales,
    fetchValeById,
    fetchValeByFolio,
    calcularPrecioTotal,

    // Helpers
    hasFilters: hasActiveFilters(filters),
  };
};
