/**
 * src/hooks/operadores/useOperadoresState.js
 *
 * Manejo de estados para la página de Operadores
 *
 * Estados:
 * - Pestaña activa (Material/Renta)
 * - Datos agrupados por empresa → placas → estado
 * - Grupos colapsados/expandidos
 * - Loading y errores
 * - Filtros aplicados
 *
 * Usado en: useOperadores.js
 */

// 1. React y hooks
import { useState } from "react";

export const useOperadoresState = () => {
  // Estado de pestaña activa
  const [pestañaActiva, setPestañaActiva] = useState("material");

  // Datos agrupados
  const [datosAgrupados, setDatosAgrupados] = useState({
    material: [],
    renta: [],
  });

  // Estados de carga y error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Grupos colapsados (Set de IDs)
  // Formato: "empresa-{id_empresa}", "placas-{placas}", "estado-{placas}-{estado}"
  const [gruposColapsados, setGruposColapsados] = useState(new Set());

  // Filtros aplicados
  const [filtros, setFiltros] = useState({
    fecha_inicio: null,
    fecha_fin: null,
    id_empresa: null,
    id_obra: null,
    id_sindicato: null,
    searchTerm: "", // Para buscar por placas
  });

  // Resumen general (totales)
  const [resumenGeneral, setResumenGeneral] = useState({
    material: {
      totalEmpresas: 0,
      totalVehiculos: 0,
      totalViajes: 0,
      totalM3: 0,
    },
    renta: {
      totalEmpresas: 0,
      totalVehiculos: 0,
      totalViajes: 0,
      totalDias: 0,
      totalHoras: 0,
    },
  });

  /**
   * Cambiar pestaña activa
   */
  const cambiarPestaña = (pestaña) => {
    if (pestaña === "material" || pestaña === "renta") {
      setPestañaActiva(pestaña);
    }
  };

  /**
   * Toggle colapsar/expandir grupo
   */
  const toggleGrupo = (grupoId) => {
    setGruposColapsados((prev) => {
      const nuevoSet = new Set(prev);
      if (nuevoSet.has(grupoId)) {
        nuevoSet.delete(grupoId);
      } else {
        nuevoSet.add(grupoId);
      }
      return nuevoSet;
    });
  };

  /**
   * Verificar si un grupo está colapsado
   */
  const estaColapsado = (grupoId) => {
    return gruposColapsados.has(grupoId);
  };

  /**
   * Expandir todos los grupos
   */
  const expandirTodos = () => {
    setGruposColapsados(new Set());
  };

  /**
   * Colapsar todos los grupos
   */
  const colapsarTodos = () => {
    const todosLosGrupos = new Set();

    const datos = datosAgrupados[pestañaActiva];

    datos.forEach((empresa) => {
      todosLosGrupos.add(`empresa-${empresa.id_empresa}`);

      empresa.vehiculos?.forEach((vehiculo) => {
        todosLosGrupos.add(`placas-${vehiculo.placas}`);

        Object.keys(vehiculo.porEstado || {}).forEach((estado) => {
          todosLosGrupos.add(`estado-${vehiculo.placas}-${estado}`);
        });
      });
    });

    setGruposColapsados(todosLosGrupos);
  };

  /**
   * Actualizar filtros
   */
  const actualizarFiltros = (nuevosFiltros) => {
    setFiltros((prev) => ({
      ...prev,
      ...nuevosFiltros,
    }));
  };

  /**
   * Limpiar filtros
   */
  const limpiarFiltros = () => {
    setFiltros({
      fecha_inicio: null,
      fecha_fin: null,
      id_empresa: null,
      id_obra: null,
      id_sindicato: null,
      searchTerm: "",
    });
  };

  /**
   * Verificar si hay filtros activos
   */
  const hayFiltrosActivos = () => {
    return (
      filtros.fecha_inicio ||
      filtros.fecha_fin ||
      filtros.id_empresa ||
      filtros.id_obra ||
      filtros.id_sindicato ||
      filtros.searchTerm
    );
  };

  return {
    // Estados
    pestañaActiva,
    datosAgrupados,
    loading,
    error,
    gruposColapsados,
    filtros,
    resumenGeneral,

    // Setters
    setPestañaActiva,
    setDatosAgrupados,
    setLoading,
    setError,
    setGruposColapsados,
    setFiltros,
    setResumenGeneral,

    // Funciones de pestaña
    cambiarPestaña,

    // Funciones de grupos
    toggleGrupo,
    estaColapsado,
    expandirTodos,
    colapsarTodos,

    // Funciones de filtros
    actualizarFiltros,
    limpiarFiltros,
    hayFiltrosActivos,
  };
};
