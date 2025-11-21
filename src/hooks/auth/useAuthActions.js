/**
 * src/hooks/auth/useAuthActions.js
 *
 * Acciones de autenticación (login, logout)
 *
 * Funcionalidades:
 * - Iniciar sesión (signIn)
 * - Cerrar sesión (signOut)
 * - Manejo de errores de autenticación
 *
 * Usado en: useAuth.jsx
 */

// 1. Config
import { supabase } from "../../config/supabase";

/**
 * Hook para acciones de autenticación
 */
export const useAuthActions = (fetchUserProfile) => {
  /**
   * Iniciar sesión
   */
  const signIn = async (email, password) => {
    try {
      // Autenticar con Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) throw authError;

      // Obtener perfil completo
      const profile = await fetchUserProfile(authData.user.id);

      return { success: true, user: authData.user, profile };
    } catch (error) {
      console.error("Error en signIn:", error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Cerrar sesión
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Redirigir inmediatamente a login
      window.location.href = "/login";
    } catch (error) {
      console.error("Error en signOut:", error);
      // Forzar redirección incluso si hay error
      window.location.href = "/login";
    }
  };

  return {
    signIn,
    signOut,
  };
};
