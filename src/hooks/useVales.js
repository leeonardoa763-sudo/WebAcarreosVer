/**
 * src/hooks/useVales.js
 *
 * Hook personalizado para manejo de vales
 *
 * Funcionalidades:
 * - Consulta de vales con relaciones (obras, materiales, operadores, vehículos)
 * - Filtros: obra, tipo_vale, estado, rango de fechas
 * - Búsqueda: folio, operador, placas
 * - Paginación
 * - Control de permisos por rol (respeta RLS)
 * - Cálculo de totales y estadísticas
 *
 * Usado en: Vales.jsx, Conciliaciones.jsx
 */

// 1. React y hooks
import { useState, useEffect, useCallback } from "react";

// 2. Config
import { supabase } from "../config/supabase";

// 3. Hooks personalizados
import { useAuth } from "./useAuth";

export const useVales = () => {
  const { userProfile, canViewAllVales } = useAuth();

  // Estados principales
  const [vales, setVales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de filtros
  const [filters, setFilters] = useState({
    searchTerm: "", // Búsqueda por folio, operador o placas
    id_obra: null,
    tipo_vale: null, // 'material' o 'renta'
    estado: null, // 'borrador', 'emitido', 'verificado', 'pagado'
    fecha_inicio: null,
    fecha_fin: null,
  });

  // Estados de paginación
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  });

  // Catálogos para filtros
  const [obras, setObras] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  /**
   * Obtener catálogo de obras
   */
  const fetchObras = async () => {
    try {
      let query = supabase
        .from("obras")
        .select(
          `
          id_obra,
          obra,
          cc,
          empresas:id_empresa (
            empresa,
            sufijo
          )
        `
        )
        .order("obra", { ascending: true });

      // RLS maneja el filtrado automáticamente
      // ADMINISTRADOR/FINANZAS: ven todas las obras
      // Otros roles: solo su obra actual

      const { data, error } = await query;

      if (error) throw error;
      setObras(data || []);
    } catch (error) {
      console.error("Error en fetchObras:", error);
    } finally {
      setLoadingCatalogos(false);
    }
  };

  /**
   * Construir query base con relaciones
   */
  const buildBaseQuery = () => {
    return supabase.from("vales").select(
      `
        *,
        obras:id_obra (
          id_obra,
          obra,
          cc,
          empresas:id_empresa (
            empresa,
            sufijo,
            logo
          )
        ),
        operadores:id_operador (
          id_operador,
          nombre_completo,
          sindicatos:id_sindicato (
            sindicato
          )
        ),
        vehiculos:id_vehiculo (
          id_vehiculo,
          placas
        ),
        persona:id_persona_creador (
          nombre,
          primer_apellido,
          segundo_apellido
        ),
        vale_material_detalles (
          id_detalle_material,
          capacidad_m3,
          distancia_km,
          cantidad_pedida_m3,
          peso_ton,
          material:id_material (
            material,
            tipo_de_material:id_tipo_de_material (
              tipo_de_material
            )
          ),
          bancos:id_banco (
            banco
          )
        ),
        vale_renta_detalle (
          id_vale_renta_detalle,
          capacidad_m3,
          hora_inicio,
          hora_fin,
          total_horas,
          total_dias,
          costo_total,
          numero_viajes,
          material:id_material (
            material
          ),
          precios_renta:id_precios_renta (
            costo_hr,
            costo_dia
          )
        )
      `,
      { count: "exact" }
    );
  };

  /**
   * Aplicar filtros a la query
   */
  const applyFilters = (query) => {
    // Filtro por obra
    if (filters.id_obra) {
      query = query.eq("id_obra", filters.id_obra);
    }

    // Filtro por tipo de vale
    if (filters.tipo_vale) {
      query = query.eq("tipo_vale", filters.tipo_vale);
    }

    // Filtro por estado
    if (filters.estado) {
      query = query.eq("estado", filters.estado);
    }

    // Filtro por rango de fechas
    if (filters.fecha_inicio) {
      query = query.gte("fecha_creacion", filters.fecha_inicio);
    }

    if (filters.fecha_fin) {
      // Agregar un día para incluir todo el día final
      const fechaFinAjustada = new Date(filters.fecha_fin);
      fechaFinAjustada.setDate(fechaFinAjustada.getDate() + 1);
      query = query.lt("fecha_creacion", fechaFinAjustada.toISOString());
    }

    // Búsqueda por término (folio, operador, placas)
    if (filters.searchTerm) {
      // Nota: Supabase no soporta OR en el mismo nivel con .select()
      // Por lo tanto, filtraremos en cliente después de obtener resultados
      // o usaremos .or() si está disponible
      const searchUpper = filters.searchTerm.toUpperCase();
      query = query.or(`folio.ilike.%${searchUpper}%`);
    }

    return query;
  };

  /**
   * Obtener vales con filtros y paginación
   */
  const fetchVales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Construir query base
      let query = buildBaseQuery();

      // Aplicar filtros
      query = applyFilters(query);

      // RLS filtra automáticamente según el rol del usuario
      // ADMINISTRADOR/FINANZAS: ven todas las obras
      // SINDICATO: filtrado por sindicato en RLS
      // No agregamos filtros adicionales aquí

      // Aplicar paginación
      const from = (pagination.currentPage - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;

      query = query
        .order("fecha_creacion", { ascending: false })
        .range(from, to);

      // Ejecutar query
      const { data, error, count } = await query;

      //   console.log("=== DEBUG VALES ===");
      //   console.log("User profile:", userProfile);
      //   console.log("Role:", userProfile?.roles?.role);
      //   console.log("Can view all:", canViewAllVales());
      //   console.log("Vales encontrados:", count);
      //   console.log("Filtros aplicados:", filters);
      //   console.log("==================");

      if (error) throw error;

      // Filtrar adicional en cliente si hay búsqueda de operador/placas
      let filteredData = data || [];
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredData = filteredData.filter((vale) => {
          const folio = vale.folio?.toLowerCase() || "";
          const operador =
            vale.operadores?.nombre_completo?.toLowerCase() || "";
          const placas = vale.vehiculos?.placas?.toLowerCase() || "";

          return (
            folio.includes(searchLower) ||
            operador.includes(searchLower) ||
            placas.includes(searchLower)
          );
        });
      }

      setVales(filteredData);

      // Actualizar paginación
      setPagination((prev) => ({
        ...prev,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / prev.pageSize),
      }));
    } catch (error) {
      console.error("Error en fetchVales:", error);
      setError("No se pudieron cargar los vales");
    } finally {
      setLoading(false);
    }
  }, [
    filters,
    pagination.currentPage,
    pagination.pageSize,
    userProfile,
    canViewAllVales,
  ]);

  /**
   * Obtener un vale específico por ID
   */
  const fetchValeById = async (id_vale) => {
    try {
      const { data, error } = await supabase
        .from("vales")
        .select(
          `
          *,
          obras:id_obra (
            id_obra,
            obra,
            cc,
            empresas:id_empresa (
              empresa,
              sufijo,
              logo
            )
          ),
          operadores:id_operador (
            id_operador,
            nombre_completo,
            sindicatos:id_sindicato (
              sindicato
            )
          ),
          vehiculos:id_vehiculo (
            id_vehiculo,
            placas
          ),
          persona:id_persona_creador (
            nombre,
            primer_apellido,
            segundo_apellido
          ),
          vale_material_detalles (
            id_detalle_material,
            capacidad_m3,
            distancia_km,
            cantidad_pedida_m3,
            peso_ton,
            material:id_material (
              material,
              tipo_de_material:id_tipo_de_material (
                tipo_de_material
              )
            ),
            bancos:id_banco (
              banco
            )
          ),
          vale_renta_detalle (
            id_vale_renta_detalle,
            capacidad_m3,
            hora_inicio,
            hora_fin,
            total_horas,
            total_dias,
            costo_total,
            numero_viajes,
            material:id_material (
              material
            ),
            precios_renta:id_precios_renta (
              costo_hr,
              costo_dia
            )
          )
        `
        )
        .eq("id_vale", id_vale)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error en fetchValeById:", error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Obtener vale por folio (para verificación pública)
   */
  const fetchValeByFolio = async (folio) => {
    try {
      const { data, error } = await supabase
        .from("vales")
        .select(
          `
          *,
          obras:id_obra (
            id_obra,
            obra,
            cc,
            empresas:id_empresa (
              empresa,
              sufijo,
              logo
            )
          ),
          operadores:id_operador (
            id_operador,
            nombre_completo
          ),
          vehiculos:id_vehiculo (
            id_vehiculo,
            placas
          ),
          vale_material_detalles (
            capacidad_m3,
            distancia_km,
            cantidad_pedida_m3,
            peso_ton,
            material:id_material (
              material
            ),
            bancos:id_banco (
              banco
            )
          ),
          vale_renta_detalle (
            capacidad_m3,
            hora_inicio,
            hora_fin,
            total_horas,
            total_dias,
            costo_total,
            numero_viajes,
            material:id_material (
              material
            )
          )
        `
        )
        .eq("folio", folio)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error en fetchValeByFolio:", error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Actualizar filtros
   */
  const updateFilters = (newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
    // Reset a primera página cuando cambian filtros
    setPagination((prev) => ({
      ...prev,
      currentPage: 1,
    }));
  };

  /**
   * Limpiar filtros
   */
  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      id_obra: null,
      tipo_vale: null,
      estado: null,
      fecha_inicio: null,
      fecha_fin: null,
    });
    setPagination((prev) => ({
      ...prev,
      currentPage: 1,
    }));
  };

  /**
   * Cambiar página
   */
  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination((prev) => ({
        ...prev,
        currentPage: page,
      }));
    }
  };

  /**
   * Calcular precio total de un vale
   */
  const calcularPrecioTotal = (vale) => {
    if (!vale) return 0;

    if (vale.tipo_vale === "material") {
      // Sumar todos los detalles de material
      return (
        vale.vale_material_detalles?.reduce((total, detalle) => {
          // Aquí se calcularía el precio según la lógica de negocio
          // Por ahora retornamos 0 hasta implementar cálculo completo
          return total + 0;
        }, 0) || 0
      );
    } else if (vale.tipo_vale === "renta") {
      // Sumar todos los detalles de renta
      return (
        vale.vale_renta_detalle?.reduce((total, detalle) => {
          return total + (detalle.costo_total || 0);
        }, 0) || 0
      );
    }

    return 0;
  };

  /**
   * Efecto para cargar catálogos al montar
   */
  useEffect(() => {
    fetchObras();
  }, []);

  /**
   * Efecto para cargar vales cuando cambian filtros o paginación
   */
  useEffect(() => {
    if (userProfile) {
      fetchVales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters,
    pagination.currentPage,
    pagination.pageSize,
    userProfile?.id_persona,
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
    hasFilters:
      filters.searchTerm ||
      filters.id_obra ||
      filters.tipo_vale ||
      filters.estado ||
      filters.fecha_inicio ||
      filters.fecha_fin,
  };
};
