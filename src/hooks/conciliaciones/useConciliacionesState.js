/**
 * src/hooks/conciliaciones/useConciliacionesState.js
 *
 * Estados iniciales y constantes para conciliaciones
 *
 * Usado en: useConciliaciones.js
 */

/**
 * Estados iniciales de conciliaciones
 */
export const initialConciliacionesState = {
  conciliaciones: [],
  loading: true,
  error: null,
};

/**
 * Estados iniciales de filtros
 */
export const initialFiltrosState = {
  semanaSeleccionada: null, // { numero, año, fechaInicio, fechaFin }
  obraSeleccionada: null, // id_obra
  sindicatoSeleccionado: null, // id_sindicato (solo para Admin)
};

/**
 * Estados iniciales de vista previa
 */
export const initialVistaPreviaState = {
  valesAgrupados: {}, // Agrupados por placas
  totalesGenerales: null, // { subtotal, iva, total, totalDias, totalHoras }
  valesOriginales: [], // Array original de vales
  loading: false,
  error: null,
};

/**
 * Estados de conciliación
 */
export const ESTADOS_CONCILIACION = [
  { value: "generada", label: "Generada" },
  { value: "enviada", label: "Enviada" },
  { value: "pagada", label: "Pagada" },
  { value: "cancelada", label: "Cancelada" },
];

/**
 * Tipos de conciliación
 */
export const TIPOS_CONCILIACION = [
  { value: "renta", label: "Renta de Maquinaria" },
  { value: "material", label: "Material" },
];
