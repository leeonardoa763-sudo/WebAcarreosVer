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
   * Agrupar conciliaciones por MES y luego por SEMANA
   * Incluye cálculo de totales por semana y por mes
   */
  const conciliacionesAgrupadas = useMemo(() => {
    const meses = {};

    const nombresMeses = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    // Iterar sobre TODAS las conciliaciones filtradas
    conciliacionesFiltradas.forEach((conc) => {
      const keyMes = `${conc.año}-${String(conc.fecha_inicio).substring(5, 7)}`;
      const keySemana = `${conc.año}-${conc.numero_semana}`;
      const mesNumero = parseInt(String(conc.fecha_inicio).substring(5, 7));

      // Crear grupo de mes si no existe
      if (!meses[keyMes]) {
        meses[keyMes] = {
          mes: mesNumero,
          año: conc.año,
          mesNombre: nombresMeses[mesNumero - 1],
          semanas: {},
          totalMes: 0, // ← NUEVO: Total del mes
        };
      }

      // Crear grupo de semana dentro del mes si no existe
      if (!meses[keyMes].semanas[keySemana]) {
        meses[keyMes].semanas[keySemana] = {
          año: conc.año,
          numeroSemana: conc.numero_semana,
          fechaInicio: conc.fecha_inicio,
          fechaFin: conc.fecha_fin,
          conciliaciones: [],
          totalSemana: 0, // ← NUEVO: Total de la semana
        };
      }

      // Agregar conciliación a la semana
      meses[keyMes].semanas[keySemana].conciliaciones.push(conc);

      // ← NUEVO: Sumar al total de la semana
      meses[keyMes].semanas[keySemana].totalSemana += conc.total_final || 0;

      // ← NUEVO: Sumar al total del mes
      meses[keyMes].totalMes += conc.total_final || 0;
    });

    // Convertir a array y ordenar
    return Object.entries(meses)
      .map(([keyMes, mes]) => ({
        keyMes,
        ...mes,
        semanas: Object.values(mes.semanas).sort((a, b) => {
          if (a.año !== b.año) return b.año - a.año;
          return b.numeroSemana - a.numeroSemana;
        }),
      }))
      .sort((a, b) => {
        if (a.año !== b.año) return b.año - a.año;
        return b.mes - a.mes;
      });
  }, [conciliacionesFiltradas]);

  /**
   * Cambiar tipo de conciliación
   */
  const cambiarTipo = useCallback((nuevoTipo) => {
    setTipoActivo(nuevoTipo);
    setFolioSearch("");
  }, []);

  /**
   * Buscar por folio
   */
  const buscarPorFolio = useCallback((folio) => {
    setFolioSearch(folio);
  }, []);

  return {
    // Datos
    conciliacionesAgrupadas, // Ya no se necesita 'conciliaciones'
    loading: hookActivo.loading,
    error: hookActivo.error,

    // Filtros
    tipoActivo,
    folioSearch,
    cambiarTipo,
    buscarPorFolio,

    // Info para UI
    totalCount: conciliacionesFiltradas.length,
  };
};
