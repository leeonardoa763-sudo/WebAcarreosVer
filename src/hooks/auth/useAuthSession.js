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
      const queryStartTime = Date.now();

      const { data, error } = await supabase
        .from("persona")
        .select(
          `
          *,
          roles:id_role (
            id_roles,
            role
          ),
          persona_obra (
            id,
            obra_id,
            obras:obra_id (
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
          )
        `
        )
        .eq("auth_user_id", authUserId)
        .single();

      // Si tiene obras asignadas, extraer todos los IDs de obras
      if (data && data.persona_obra && data.persona_obra.length > 0) {
        // Guardar la primera obra como principal (para compatibilidad)
        data.obras = data.persona_obra[0].obras;
        data.id_current_obra = data.persona_obra[0].obra_id;
        // Guardar TODOS los IDs de obras asignadas para filtrado múltiple
        data.id_obras_asignadas = data.persona_obra.map(po => po.obra_id);
      }

      const queryEndTime = Date.now();

      if (error) {
        console.error("   ❌ Error en query:");
        console.error("      Código:", error.code);
        console.error("      Mensaje:", error.message);
        console.error("      Details:", error.details);
        console.error("      Hint:", error.hint);

        if (error.code === "PGRST116") {
          console.error("\n   💡 DIAGNÓSTICO:");
          console.error("      - No existe registro en tabla persona");
          console.error("      - auth_user_id buscado:", authUserId);
          console.error(
            "      - Verificar: SELECT * FROM persona WHERE auth_user_id =",
            authUserId
          );
        } else if (error.code === "42501") {
          console.error("\n   💡 DIAGNÓSTICO:");
          console.error("      - Error de permisos RLS");
          console.error("      - Verificar políticas de tabla persona");
        }

        throw error;
      }

      // Validar que el rol esté permitido para acceso web

      if (!data || !ROLES_PERMITIDOS.includes(data.roles?.role)) {
        console.error("   ❌ Rol no permitido");
        throw new Error("No tiene permisos para acceder al sistema web");
      }

      return data;
    } catch (error) {
      console.error("❌ Error en fetchUserProfile:", error);
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
        console.error("   ❌ Error al obtener sesión:", sessionError);
        return { session: null, profile: null };
      }

      if (!session) {
        return { session: null, profile: null };
      }

      // Si hay sesión válida, obtener el perfil
      if (session?.user) {
        try {
          const profile = await fetchUserProfile(session.user.id);
          console.log("   ✅ checkSession completado con éxito\n");
          return { session, profile };
        } catch (profileError) {
          console.error("   ❌ Error al obtener perfil:", profileError);

          // Si falla el perfil por permisos, cerrar sesión
          if (profileError.message.includes("permisos")) {
            console.log("   🔓 Cerrando sesión por falta de permisos...");
            await supabase.auth.signOut();
          }

          return { session: null, profile: null };
        }
      }

      return { session: null, profile: null };
    } catch (error) {
      console.error("❌ Error general en checkSession:", error);
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
      if (event === "SIGNED_IN" && session?.user) {
        // NO llamar fetchUserProfile aquí - lo maneja signIn directamente

        onAuthChange(event, session, null); // Pasa null como profile
      } else if (event === "SIGNED_OUT") {
        onAuthChange(event, null, null);
      } else if (event === "TOKEN_REFRESHED") {
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
