/**
 * src/hooks/vales/useSolicitudesDesver.js
 *
 * Hook para crear y responder solicitudes de desverificación de vales.
 * Llama los RPCs: solicitar_desverificacion y responder_desverificacion.
 * Dependencias: config/supabase.js, hooks/useAuth.jsx
 * Usado en: components/vales/ModalSolicitudDesver.jsx
 */

import { useState } from "react";
import { supabase } from "../../config/supabase";
import { useAuth } from "../useAuth";

export const useSolicitudesDesver = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const crearSolicitud = async (idVale, motivo) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        "solicitar_desverificacion",
        {
          p_id_vale: idVale,
          p_id_persona_solicitante: userProfile.id_persona,
          p_motivo: motivo.trim(),
        },
      );

      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error(data?.error || "Error al crear solicitud");

      return {
        success: true,
        id_solicitud: data.id_solicitud,
        sindicato_nombre: data.sindicato_nombre,
      };
    } catch (err) {
      setError(err.message || "Error al solicitar desverificación");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const responderSolicitud = async (
    idSolicitud,
    aprobado,
    motivoRespuesta = "",
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        "responder_desverificacion",
        {
          p_id_solicitud: idSolicitud,
          p_id_persona_respondedor: userProfile.id_persona,
          p_aprobado: aprobado,
          p_motivo_respuesta: motivoRespuesta.trim() || null,
        },
      );

      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error(data?.error || "Error al responder solicitud");

      return { success: true };
    } catch (err) {
      setError(err.message || "Error al responder solicitud");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { crearSolicitud, responderSolicitud, loading, error, setError };
};
