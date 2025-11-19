/**
 * src/hooks/vales/useValesPagination.js
 *
 * Lógica de paginación para vales
 *
 * Funcionalidades:
 * - Calcular rangos de paginación
 * - Actualizar estado de paginación
 * - Navegación entre páginas
 * - Cálculo de total de páginas
 *
 * Usado en: useVales.js
 */

/**
 * Hook para lógica de paginación
 */
export const useValesPagination = () => {
  /**
   * Calcular rango de paginación para Supabase
   * @param {number} currentPage - Página actual
   * @param {number} pageSize - Tamaño de página
   * @returns {object} Objeto con from y to para .range()
   */
  const calculateRange = (currentPage, pageSize) => {
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;
    return { from, to };
  };

  /**
   * Calcular total de páginas
   * @param {number} totalCount - Total de registros
   * @param {number} pageSize - Tamaño de página
   * @returns {number} Total de páginas
   */
  const calculateTotalPages = (totalCount, pageSize) => {
    return Math.ceil(totalCount / pageSize);
  };

  /**
   * Actualizar estado de paginación con nuevo count
   * @param {object} pagination - Estado actual de paginación
   * @param {number} count - Nuevo total count
   * @returns {object} Nuevo estado de paginación
   */
  const updatePaginationState = (pagination, count) => {
    return {
      ...pagination,
      totalCount: count || 0,
      totalPages: calculateTotalPages(count || 0, pagination.pageSize),
    };
  };

  /**
   * Validar que el número de página sea válido
   * @param {number} page - Página a validar
   * @param {number} totalPages - Total de páginas
   * @returns {boolean} True si es válida
   */
  const isValidPage = (page, totalPages) => {
    return page >= 1 && page <= totalPages;
  };

  /**
   * Obtener información de paginación para mostrar al usuario
   * @param {object} pagination - Estado de paginación
   * @returns {object} Info formateada
   */
  const getPaginationInfo = (pagination) => {
    const start = (pagination.currentPage - 1) * pagination.pageSize + 1;
    const end = Math.min(
      pagination.currentPage * pagination.pageSize,
      pagination.totalCount
    );

    return {
      start,
      end,
      total: pagination.totalCount,
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      hasNext: pagination.currentPage < pagination.totalPages,
      hasPrevious: pagination.currentPage > 1,
    };
  };

  return {
    calculateRange,
    calculateTotalPages,
    updatePaginationState,
    isValidPage,
    getPaginationInfo,
  };
};
