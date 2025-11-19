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
  const fetchObras = useCallback(async () => {
    try {
      setLoadingCatalogos(true);

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

      const { data, error } = await query;
      if (error) throw error;
      setObras(data || []);
    } catch (error) {
      console.error("Error en fetchObras:", error);
    } finally {
      setLoadingCatalogos(false);
    }
  }, []);

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
          volumen_real_m3,
          precio_m3,
          costo_total,
          folio_banco,
          notas_adicionales,
          material:id_material (
            id_material,
            material,
            tipo_de_material:id_tipo_de_material (
              id_tipo_de_material,
              tipo_de_material
            )
          ),
          bancos:id_banco (
            id_banco,
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
          notas_adicionales,
          material:id_material (
            id_material,
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
   * Obtener vales con filtros y paginación
   */
  const fetchVales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Construir query base
      let query = buildBaseQuery();

      // Aplicar paginación
      const from = (pagination.currentPage - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;

      query = query
        .order("fecha_creacion", { ascending: false })
        .range(from, to);

      // Ejecutar query
      const { data, error, count } = await query;

      if (error) throw error;

      // FILTRAR TODO EN CLIENTE
      let filteredData = data || [];

      // 1. Filtro por obra
      if (filters.id_obra) {
        filteredData = filteredData.filter(
          (vale) => vale.id_obra === filters.id_obra
        );
      }

      // 2. Filtro por tipo de vale
      if (filters.tipo_vale) {
        filteredData = filteredData.filter(
          (vale) => vale.tipo_vale === filters.tipo_vale
        );
      }

      // 3. Filtro por estado
      if (filters.estado) {
        filteredData = filteredData.filter(
          (vale) => vale.estado === filters.estado
        );
      }

      // 4. Filtro por fecha inicio
      if (filters.fecha_inicio) {
        const fechaInicio = new Date(filters.fecha_inicio);
        filteredData = filteredData.filter((vale) => {
          const fechaVale = new Date(vale.fecha_creacion);
          return fechaVale >= fechaInicio;
        });
      }

      // 5. Filtro por fecha fin
      if (filters.fecha_fin) {
        const fechaFin = new Date(filters.fecha_fin);
        fechaFin.setDate(fechaFin.getDate() + 1); // Incluir todo el día
        filteredData = filteredData.filter((vale) => {
          const fechaVale = new Date(vale.fecha_creacion);
          return fechaVale < fechaFin;
        });
      }

      // 6. Filtro por búsqueda (folio, operador, placas, materiales)
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredData = filteredData.filter((vale) => {
          const folio = vale.folio?.toLowerCase() || "";
          const operador =
            vale.operadores?.nombre_completo?.toLowerCase() || "";
          const placas = vale.vehiculos?.placas?.toLowerCase() || "";

          // Buscar también en materiales
          let enMateriales = false;
          if (vale.tipo_vale === "material" && vale.vale_material_detalles) {
            enMateriales = vale.vale_material_detalles.some(
              (detalle) =>
                detalle.material?.material
                  ?.toLowerCase()
                  .includes(searchLower) ||
                detalle.bancos?.banco?.toLowerCase().includes(searchLower)
            );
          }

          // Buscar también en renta
          let enRenta = false;
          if (vale.tipo_vale === "renta" && vale.vale_renta_detalle) {
            enRenta = vale.vale_renta_detalle.some((detalle) =>
              detalle.material?.material?.toLowerCase().includes(searchLower)
            );
          }

          return (
            folio.includes(searchLower) ||
            operador.includes(searchLower) ||
            placas.includes(searchLower) ||
            enMateriales ||
            enRenta
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
            volumen_real_m3,
            precio_m3,
            costo_total,
            folio_banco,
            notas_adicionales,
            material:id_material (
              id_material,
              material,
              tipo_de_material:id_tipo_de_material (
                id_tipo_de_material,
                tipo_de_material
              )
            ),
            bancos:id_banco (
              id_banco,
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
            notas_adicionales,
            material:id_material (
              id_material,
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
            volumen_real_m3,
            precio_m3,
            costo_total,
            material:id_material (
              id_material,
              material,
              tipo_de_material:id_tipo_de_material (
                id_tipo_de_material,
                tipo_de_material
              )
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
      return (
        vale.vale_material_detalles?.reduce((total, detalle) => {
          return total + Number(detalle.costo_total || 0);
        }, 0) || 0
      );
    } else if (vale.tipo_vale === "renta") {
      return (
        vale.vale_renta_detalle?.reduce((total, detalle) => {
          return total + Number(detalle.costo_total || 0);
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
  }, [fetchObras]);

  /**
   * Efecto para cargar vales cuando cambian filtros o paginación
   */
  useEffect(() => {
    if (userProfile?.id_persona) {
      fetchVales();
    }
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
