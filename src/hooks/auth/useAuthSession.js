/**
 * src/hooks/auth/useAuthSession.js
 *
 * Manejo de sesión y verificación de usuario
 *
 * Funcionalidades:
 * - Verificar sesión actual
 * - Obtener perfil de usuario
 * - Validar roles permitidos
 * - Suscribirse a cambios de auth
 *
 * Usado en: useAuth.jsx
 */

// 1. Config
import { supabase } from "../../config/supabase";

// 2. Estados
import { ROLES_PERMITIDOS } from "./useAuthState";

/**
 * Hook para manejo de sesión
 */
export const useAuthSession = () => {
  /**
   * Obtener perfil completo del usuario con relaciones
   */
  const fetchUserProfile = async (authUserId) => {
    try {
      const { data, error } = await supabase
        .from("persona")
        .select(
          `
          *,
          roles:id_role (
            id_roles,
            role
          ),
          obras:id_current_obra (
            id_obra,
            obra,
            cc,
            empresas:id_empresa (
              id_empresa,
              empresa,
              sufijo,
              logo
            )
          )
        `
        )
        .eq("auth_user_id", authUserId)
        .single();

      if (error) throw error;

      // Validar que el rol esté permitido para acceso web
      if (!data || !ROLES_PERMITIDOS.includes(data.roles?.role)) {
        throw new Error("No tiene permisos para acceder al sistema web");
      }

      return data;
    } catch (error) {
      console.error("Error en fetchUserProfile:", error);
      throw error;
    }
  };

  /**
   * Verificar sesión actual
   */
  const checkSession = async () => {
    try {
      // Obtener sesión actual
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error al obtener sesión:", sessionError);
        return { session: null, profile: null };
      }

      // Si hay sesión válida, obtener el perfil
      if (session?.user) {
        try {
          const profile = await fetchUserProfile(session.user.id);
          return { session, profile };
        } catch (profileError) {
          console.error("Error al obtener perfil:", profileError);

          // Si falla el perfil por permisos, cerrar sesión
          if (profileError.message.includes("permisos")) {
            await supabase.auth.signOut();
          }

          return { session: null, profile: null };
        }
      }

      return { session: null, profile: null };
    } catch (error) {
      console.error("Error general en checkSession:", error);
      return { session: null, profile: null };
    }
  };

  /**
   * Configurar listener de cambios de autenticación
   */
  const setupAuthListener = (onAuthChange) => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      if (event === "SIGNED_IN" && session?.user) {
        try {
          const profile = await fetchUserProfile(session.user.id);
          onAuthChange(event, session, profile);
        } catch (error) {
          console.error("Error al obtener perfil en auth change:", error);
          onAuthChange(event, null, null, error.message);
        }
      } else if (event === "SIGNED_OUT") {
        onAuthChange(event, null, null);
      } else if (event === "TOKEN_REFRESHED") {
        console.log("Token refrescado correctamente");
      }
    });

    return subscription;
  };

  return {
    checkSession,
    fetchUserProfile,
    setupAuthListener,
  };
};
