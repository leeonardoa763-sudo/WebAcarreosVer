/**
 * src/hooks/vales/useValesFilters.js
 *
 * Lógica de filtros para vales
 *
 * Funcionalidades:
 * - Aplicar filtros en el cliente
 * - Filtro por obra, tipo, estado, fechas
 * - Búsqueda por folio, operador, placas, materiales
 * - Validación de filtros
 *
 * Usado en: useVales.js
 */

/**
 * Hook para lógica de filtros
 */
export const useValesFilters = () => {
  /**
   * Aplicar filtros a los datos de vales
   * Se ejecuta en el cliente después de obtener datos de Supabase
   */
  const applyFilters = (data, filters) => {
    let filteredData = [...data];

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
      filteredData = applySearchFilter(filteredData, filters.searchTerm);
    }

    return filteredData;
  };

  /**
   * Aplicar filtro de búsqueda por término
   * Busca en: folio, operador, placas, materiales, bancos
   */
  const applySearchFilter = (data, searchTerm) => {
    const searchLower = searchTerm.toLowerCase();

    return data.filter((vale) => {
      // Búsqueda en campos principales
      const folio = vale.folio?.toLowerCase() || "";
      const operador = vale.operadores?.nombre_completo?.toLowerCase() || "";
      const placas = vale.vehiculos?.placas?.toLowerCase() || "";

      // Búsqueda en materiales (tipo material)
      let enMateriales = false;
      if (vale.tipo_vale === "material" && vale.vale_material_detalles) {
        enMateriales = vale.vale_material_detalles.some(
          (detalle) =>
            detalle.material?.material?.toLowerCase().includes(searchLower) ||
            detalle.bancos?.banco?.toLowerCase().includes(searchLower)
        );
      }

      // Búsqueda en renta
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
  };

  /**
   * Verificar si hay filtros activos
   */
  const hasActiveFilters = (filters) => {
    return (
      filters.searchTerm ||
      filters.id_obra ||
      filters.tipo_vale ||
      filters.estado ||
      filters.fecha_inicio ||
      filters.fecha_fin
    );
  };

  /**
   * Validar rango de fechas
   */
  const validateDateRange = (fecha_inicio, fecha_fin) => {
    if (!fecha_inicio || !fecha_fin) return { valid: true };

    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);

    if (inicio > fin) {
      return {
        valid: false,
        error: "La fecha de inicio no puede ser posterior a la fecha fin",
      };
    }

    return { valid: true };
  };

  return {
    applyFilters,
    applySearchFilter,
    hasActiveFilters,
    validateDateRange,
  };
};
