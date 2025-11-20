/**
 * src/hooks/conciliaciones/useConciliacionesGenerar.js
 *
 * Lógica para generar y guardar conciliaciones
 *
 * Funcionalidades:
 * - Generar conciliación en BD
 * - Regenerar conciliación existente (sin nuevo folio)
 * - Validaciones previas a guardado
 *
 * Usado en: useConciliaciones.js
 */

// 1. React y hooks
import { useCallback } from "react";

// 2. Config
import { supabase } from "../../config/supabase";

/**
 * Hook para lógica de generación de conciliaciones
 */
export const useConciliacionesGenerar = (queries, helpers, userProfile) => {
  /**
   * Generar nueva conciliación (crea registro en BD)
   */
  const generarNuevaConciliacion = useCallback(
    async (vales, totales, filtros) => {
      try {
        // Validar vales
        const validacion = helpers.validarValesDisponibles(vales);
        if (!validacion.valid) {
          return { success: false, error: validacion.error };
        }

        // Obtener datos del sindicato
        const idSindicato = userProfile.id_sindicato;

        const { data: sindicatoData } = await supabase
          .from("sindicatos")
          .select("nombre_completo, nombre_firma_conciliacion")
          .eq("id_sindicato", idSindicato)
          .single();

        // Preparar datos
        const dataConciliacion = helpers.prepararDatosConciliacion(
          vales,
          totales,
          filtros,
          userProfile.id_sindicato,
          userProfile.id_persona
        );

        // Extraer IDs de vales
        const idsVales = vales.map((v) => v.id_vale);

        // Guardar en BD
        const resultado = await queries.guardarConciliacion(
          dataConciliacion,
          idsVales
        );

        if (!resultado.success) {
          throw new Error(resultado.error);
        }

        return {
          success: true,
          data: resultado.data,
          message: `Conciliación ${resultado.data.folio} generada correctamente`,
        };
      } catch (error) {
        console.error("Error en generarNuevaConciliacion:", error);
        return {
          success: false,
          error: error.message || "Error al generar conciliación",
        };
      }
    },
    [queries, helpers, userProfile]
  );

  /**
   * Obtener datos de conciliación existente para regenerar PDF/Excel
   * (No crea nuevo registro, solo obtiene datos)
   */
  const obtenerConciliacionExistente = useCallback(
    async (idConciliacion) => {
      try {
        const resultado =
          await queries.fetchConciliacionConVales(idConciliacion);

        if (!resultado.success) {
          throw new Error(resultado.error);
        }

        // Agrupar vales por placas
        const gruposPorPlacas = helpers.agruparValesPorPlacas(
          resultado.data.vales
        );

        return {
          success: true,
          data: {
            conciliacion: resultado.data,
            gruposPorPlacas,
          },
        };
      } catch (error) {
        console.error("Error en obtenerConciliacionExistente:", error);
        return {
          success: false,
          error: error.message || "Error al obtener conciliación",
        };
      }
    },
    [queries, helpers]
  );

  return {
    generarNuevaConciliacion,
    obtenerConciliacionExistente,
  };
};
