/**
 * src/hooks/useVerificarConciliacion.js
 *
 * Hook para la verificación de conciliaciones vía QR (solo Administrador).
 * El folio ya viene de la URL pública (/conciliacion/:folio) — no hay
 * extracción de PDF/OCR/QR aquí, a diferencia de useVerificacion.js (vales).
 *
 * Dependencias: supabase, useAuth
 * Usado en: VerificarConciliacionAccion.jsx
 */

// 1. React y hooks
import { useState, useCallback } from "react";

// 2. Config
import { supabase } from "../config/supabase";

// 3. Hooks personalizados
import { useAuth } from "./useAuth";

export const useVerificarConciliacion = () => {
  const { userProfile } = useAuth();

  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState(null);

  const verificarConciliacion = useCallback(
    async (folio) => {
      try {
        setVerificando(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc(
          "verificar_conciliacion",
          {
            p_folio: folio,
            p_id_persona_verificador: userProfile.id_persona,
          }
        );

        if (rpcError) throw rpcError;
        if (!data.success) throw new Error(data.error);

        return { success: true };
      } catch (error) {
        console.error("Error en verificarConciliacion:", error);
        setError(error.message);
        return { success: false, error: error.message };
      } finally {
        setVerificando(false);
      }
    },
    [userProfile]
  );

  return {
    verificando,
    error,
    verificarConciliacion,
  };
};
