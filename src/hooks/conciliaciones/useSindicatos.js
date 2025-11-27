/**
 * src/hooks/conciliaciones/useSindicatos.js
 *
 * Hook para cargar catálogo de sindicatos
 *
 * PROPÓSITO:
 * - Cargar todos los sindicatos disponibles
 * - Solo se ejecuta para usuarios Admin
 * - Proporciona estado de loading y error
 *
 * USADO EN:
 * - useConciliaciones.js
 */

import { useState, useCallback } from "react";
import { supabase } from "../../config/supabase";

export const useSindicatos = () => {
  const [sindicatos, setSindicatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Carga todos los sindicatos ordenados alfabéticamente
   */
  const loadSindicatos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("sindicatos")
        .select("id_sindicato, sindicato, nombre_completo")
        .order("sindicato", { ascending: true });

      if (supabaseError) {
        console.error("[useSindicatos] Error en query:", supabaseError);
        throw supabaseError;
      }

      setSindicatos(data || []);

      return {
        success: true,
        data: data || [],
      };
    } catch (err) {
      console.error("[useSindicatos] Error cargando sindicatos:", err.message);
      setError(err.message);

      return {
        success: false,
        error: err.message,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Limpia el estado de sindicatos
   */
  const clearSindicatos = useCallback(() => {
    setSindicatos([]);
    setError(null);
  }, []);

  return {
    sindicatos,
    loading,
    error,
    loadSindicatos,
    clearSindicatos,
  };
};
