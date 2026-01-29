/**
 * src/hooks/useNotifications.js
 *
 * Hook para manejar notificaciones en tiempo real
 *
 * Funcionalidades:
 * - Escuchar nuevos vales creados (Supabase Realtime)
 * - Obtener notificaciones del usuario actual
 * - Marcar notificaciones como leídas
 * - Contador de notificaciones sin leer
 * - Navegación al vale específico
 *
 * Dependencias: supabase, useAuth
 * Usado en: NotificationBell.jsx
 */

// 1. React y hooks
import { useState, useEffect, useCallback } from "react";

// 2. Config
import { supabase } from "../config/supabase";

// 3. Hooks personalizados
import { useAuth } from "./useAuth";

export const useNotifications = () => {
  // Estados
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noLeidas, setNoLeidas] = useState(0);

  // Usuario actual
  const { userProfile } = useAuth();

  /**
   * Obtener notificaciones del usuario actual
   */
  const fetchNotificaciones = useCallback(async () => {
    if (!userProfile?.id_persona) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("notificaciones")
        .select(
          `
          id_notificacion,
          leida,
          fecha_creacion,
          vales!inner (
            id_vale,
            folio,
            tipo_vale,
            fecha_creacion,
            obras!inner (
              id_obra,
              obra,
              cc
            )
          )
        `,
        )
        .eq("id_usuario", userProfile.id_persona)
        .order("fecha_creacion", { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotificaciones(data || []);

      // Contar no leídas
      const countNoLeidas = data?.filter((n) => !n.leida).length || 0;
      setNoLeidas(countNoLeidas);
    } catch (error) {
      console.error("Error al obtener notificaciones:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id_persona]);

  /**
   * Marcar una notificación como leída
   */
  const marcarComoLeida = async (idNotificacion) => {
    try {
      const { error } = await supabase
        .from("notificaciones")
        .update({ leida: true })
        .eq("id_notificacion", idNotificacion);

      if (error) throw error;

      // Actualizar estado local
      setNotificaciones((prev) =>
        prev.map((n) =>
          n.id_notificacion === idNotificacion ? { ...n, leida: true } : n,
        ),
      );

      // Decrementar contador
      setNoLeidas((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error al marcar como leída:", error);
    }
  };

  /**
   * Marcar todas como leídas
   */
  const marcarTodasComoLeidas = async () => {
    if (!userProfile?.id_persona) return;

    try {
      const { error } = await supabase
        .from("notificaciones")
        .update({ leida: true })
        .eq("id_usuario", userProfile.id_persona)
        .eq("leida", false);

      if (error) throw error;

      // Actualizar estado local
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNoLeidas(0);
    } catch (error) {
      console.error("Error al marcar todas como leídas:", error);
    }
  };

  /**
   * Suscripción a nuevos vales en tiempo real
   */
  useEffect(() => {
    if (!userProfile?.id_persona) return;

    // Cargar notificaciones iniciales
    fetchNotificaciones();

    // Suscribirse a cambios en la tabla vales
    const channel = supabase
      .channel("nuevos-vales")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vales",
        },
        async (payload) => {
          console.log("Nuevo vale detectado:", payload.new);

          // Crear notificación para el usuario actual
          const { error } = await supabase.from("notificaciones").insert({
            id_vale: payload.new.id_vale,
            id_usuario: userProfile.id_persona,
            leida: false,
          });

          if (error) {
            console.error("Error al crear notificación:", error);
            return;
          }

          // Recargar notificaciones
          fetchNotificaciones();
        },
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id_persona, fetchNotificaciones]);

  /**
   * Suscripción a cambios en notificaciones
   */
  useEffect(() => {
    if (!userProfile?.id_persona) return;

    const channel = supabase
      .channel("notificaciones-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notificaciones",
          filter: `id_usuario=eq.${userProfile.id_persona}`,
        },
        () => {
          // Recargar cuando hay cambios
          fetchNotificaciones();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id_persona, fetchNotificaciones]);

  return {
    notificaciones,
    loading,
    error,
    noLeidas,
    marcarComoLeida,
    marcarTodasComoLeidas,
    refetch: fetchNotificaciones,
  };
};
