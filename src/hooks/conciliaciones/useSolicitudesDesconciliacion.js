/**
 * src/hooks/conciliaciones/useSolicitudesDesconciliacion.js
 *
 * Hook para solicitar (Admin) y responder (Sindicato) la reversión de una
 * conciliación. Llama los RPCs solicitar_desconciliacion y
 * responder_desconciliacion — la identidad se resuelve en BD con auth.uid().
 * Al aprobarse, los vales vuelven a 'verificado' y la conciliación se borra
 * (queda una foto en solicitudes_desconciliacion.snapshot_conciliacion).
 *
 * Dependencias: config/supabase.js
 * Usado en: components/conciliaciones/ModalSolicitudDesconciliacion.jsx
 */

import { useState } from "react";
import { supabase } from "../../config/supabase";

export const useSolicitudesDesconciliacion = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const crearSolicitud = async (idConciliacion, motivo) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        "solicitar_desconciliacion",
        {
          p_id_conciliacion: idConciliacion,
          p_motivo: motivo.trim(),
        },
      );

      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error(data?.error || "Error al crear solicitud");

      return { success: true, sindicato_nombre: data.sindicato_nombre };
    } catch (err) {
      setError(err.message || "Error al solicitar deshacer la conciliación");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const responderSolicitud = async (idSolicitud, aprobado, motivoRespuesta = "") => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        "responder_desconciliacion",
        {
          p_id_solicitud: idSolicitud,
          p_aprobado: aprobado,
          p_motivo_respuesta: motivoRespuesta.trim() || null,
        },
      );

      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error(data?.error || "Error al responder solicitud");

      return { success: true, valesRevertidos: data.vales_revertidos };
    } catch (err) {
      setError(err.message || "Error al responder solicitud");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { crearSolicitud, responderSolicitud, loading, error, setError };
};
