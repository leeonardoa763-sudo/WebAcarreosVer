/**
 * src/hooks/dashboard/useConciliacionesDashboard.js
 *
 * Hook wrapper para Dashboard que reutiliza hooks existentes
 * y agrega paginación, búsqueda y agrupación
 *
 * Funcionalidades:
 * - Reutiliza useConciliaciones y useConciliacionesMaterial
 * - Agrega paginación client-side
 * - Agrega búsqueda por folio
 * - Agrupa por semana
 *
 * Usado en: SeccionConciliaciones.jsx
 */

// 1. React y hooks
import { useState, useEffect, useMemo, useCallback } from "react";

// 2. Hooks personalizados
import { useConciliaciones } from "../useConciliaciones";
import { useConciliacionesMaterial } from "../useConciliacionesMaterial";

export const useConciliacionesDashboard = () => {
  // Hooks existentes
  const rentaHook = useConciliaciones();
  const materialHook = useConciliacionesMaterial();

  // Estados locales
  const [tipoActivo, setTipoActivo] = useState("renta");
  const [folioSearch, setFolioSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Seleccionar hook activo
  const hookActivo = tipoActivo === "renta" ? rentaHook : materialHook;

  /**
   * Cargar historial al montar o cambiar tipo
   */
  useEffect(() => {
    hookActivo.loadHistorial?.();
  }, [tipoActivo]);

  /**
   * Filtrar por folio (client-side)
   */
  const conciliacionesFiltradas = useMemo(() => {
    if (!hookActivo.conciliaciones) return [];

    if (!folioSearch.trim()) {
      return hookActivo.conciliaciones;
    }

    return hookActivo.conciliaciones.filter((conc) =>
      conc.folio.toLowerCase().includes(folioSearch.toLowerCase())
    );
  }, [hookActivo.conciliaciones, folioSearch]);

  /**
   * Aplicar paginación (client-side)
   */
  const conciliacionesPaginadas = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return conciliacionesFiltradas.slice(startIndex, endIndex);
  }, [conciliacionesFiltradas, currentPage]);

  /**
   * Calcular total de páginas
   */
  const totalPages = useMemo(() => {
    return Math.ceil(conciliacionesFiltradas.length / pageSize);
  }, [conciliacionesFiltradas.length]);

  /**
   * Agrupar conciliaciones paginadas por semana
   */
  const conciliacionesAgrupadas = useMemo(() => {
    const grupos = {};

    conciliacionesPaginadas.forEach((conc) => {
      const key = `${conc.año}-${conc.numero_semana}`;

      if (!grupos[key]) {
        grupos[key] = {
          año: conc.año,
          numeroSemana: conc.numero_semana,
          fechaInicio: conc.fecha_inicio,
          fechaFin: conc.fecha_fin,
          conciliaciones: [],
        };
      }

      grupos[key].conciliaciones.push(conc);
    });

    return Object.values(grupos).sort((a, b) => {
      if (a.año !== b.año) return b.año - a.año;
      return b.numeroSemana - a.numeroSemana;
    });
  }, [conciliacionesPaginadas]);

  /**
   * Cambiar tipo de conciliación
   */
  const cambiarTipo = useCallback((nuevoTipo) => {
    setTipoActivo(nuevoTipo);
    setCurrentPage(1);
    setFolioSearch("");
  }, []);

  /**
   * Buscar por folio
   */
  const buscarPorFolio = useCallback((folio) => {
    setFolioSearch(folio);
    setCurrentPage(1);
  }, []);

  /**
   * Ir a página específica
   */
  const irAPagina = useCallback(
    (pagina) => {
      if (pagina >= 1 && pagina <= totalPages) {
        setCurrentPage(pagina);
      }
    },
    [totalPages]
  );

  return {
    // Datos
    conciliaciones: conciliacionesPaginadas,
    conciliacionesAgrupadas,
    loading: hookActivo.loading,
    error: hookActivo.error,

    // Filtros
    tipoActivo,
    folioSearch,
    cambiarTipo,
    buscarPorFolio,

    // Paginación
    currentPage,
    totalPages,
    totalCount: conciliacionesFiltradas.length,
    pageSize,
    irAPagina,
  };
};
