/**
 * src/hooks/vales/useCancelarVale.js
 *
 * Hook para cancelar un vale desde la vista de administrador.
 * Solo puede cancelar vales en estado 'emitido' o 'en_proceso'.
 *
 * Dependencias: config/supabase.js
 * Usado en: components/vales/ModalCancelarVale.jsx
 */

// 1. React
import { useState } from "react";

// 2. Config
import { supabase } from "../../config/supabase";

const ESTADOS_CANCELABLES = ["emitido", "en_proceso"];

export const useCancelarVale = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Cancela un vale actualizando estado, motivo y fecha de cancelación.
   * Devuelve { success: true } o { success: false }.
   */
  const cancelarVale = async (idVale, estadoActual, motivoCancelacion) => {
    if (!ESTADOS_CANCELABLES.includes(estadoActual)) {
      setError("Solo se pueden cancelar vales en estado 'emitido' o 'en proceso'.");
      return { success: false };
    }

    if (!motivoCancelacion?.trim()) {
      setError("El motivo de cancelación es obligatorio.");
      return { success: false };
    }

    try {
      setLoading(true);
      setError(null);

      const { error: err } = await supabase
        .from("vales")
        .update({
          estado: "cancelado",
          motivo_cancelacion: motivoCancelacion.trim(),
          fecha_cancelacion: new Date().toISOString(),
        })
        .eq("id_vale", idVale);

      if (err) throw err;

      return { success: true };
    } catch (err) {
      console.error("Error al cancelar vale:", err);
      setError(err.message || "Error al cancelar el vale");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { cancelarVale, loading, error, setError };
};
