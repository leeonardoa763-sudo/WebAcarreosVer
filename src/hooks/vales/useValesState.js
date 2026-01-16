/**
 * src/hooks/vales/useValesState.js
 *
 * Manejo de estados y catálogos de vales
 *
 * Funcionalidades:
 * - Estados principales (vales, loading, error)
 * - Estados de filtros
 * - Estados de paginación
 * - Catálogos (obras, materiales)
 *
 * Usado en: useVales.js
 */

/**
 * Estados iniciales de vales
 */
export const initialValesState = {
  vales: [],
  loading: true,
  error: null,
};

/**
 * Estados iniciales de filtros
 */
export const initialFiltersState = {
  searchTerm: "", // Búsqueda por folio, operador o placas
  id_obra: null,
  id_material: null, // ID del material a filtrar
  id_sindicato: null,
  estado: null, // 'borrador', 'emitido', 'verificado', 'pagado'
  fecha_inicio: null,
  fecha_fin: null,
};

/**
 * Estados iniciales de paginación
 */
export const initialPaginationState = {
  currentPage: 1,
  pageSize: 20,
  totalCount: 0,
  totalPages: 0,
};

/**
 * Estados iniciales de catálogos
 */
export const initialCatalogosState = {
  obras: [],
  materiales: [],
  sindicatos: [],
  loadingCatalogos: true,
};

/**
 * Estados de vale disponibles
 */
export const ESTADOS_VALE = [
  { value: "borrador", label: "Borrador" },
  { value: "en_proceso", label: "En Proceso" },
  { value: "emitido", label: "Emitido" },
  { value: "verificado", label: "Verificado" },
  { value: "pagado", label: "Pagado" },
];

/**
 * Tipos de vale
 */
export const TIPOS_VALE = [
  { value: "material", label: "Material" },
  { value: "renta", label: "Renta" },
];
