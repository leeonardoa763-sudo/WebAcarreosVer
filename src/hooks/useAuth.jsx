/**
 * src/hooks/useAuth.jsx
 *
 * Hook principal de autenticación (orquestador)
 *
 * Funcionalidades:
 * - Exporta contexto y provider
 * - Integra todos los módulos de auth
 * - Gestiona estados globales
 * - Expone API unificada
 *
 * Usado en: App.jsx, LoginForm.jsx, ProtectedRoute.jsx, Navbar.jsx
 */

// 1. React y hooks
import { useState, useEffect, useRef } from "react";

// 2. Módulos de autenticación
import {
  AuthContext,
  useAuthContext,
  initialAuthState,
} from "./auth/useAuthState";
import { useAuthSession } from "./auth/useAuthSession";
import { useAuthActions } from "./auth/useAuthActions";
import { useAuthHelpers } from "./auth/useAuthHelpers";

/**
 * Hook para usar el contexto de autenticación
 * Este es el hook que se exporta para uso en componentes
 */
export const useAuth = () => {
  return useAuthContext();
};

/**
 * Provider de autenticación
 * Orquesta todos los módulos y expone la API completa
 */
export const AuthProvider = ({ children }) => {
  // Estados principales
  const [user, setUser] = useState(initialAuthState.user);
  const [userProfile, setUserProfile] = useState(initialAuthState.userProfile);
  const [loading, setLoading] = useState(initialAuthState.loading);
  const [error, setError] = useState(initialAuthState.error);

  // Flag para evitar race condition entre signIn y listener
  const isSigningIn = useRef(false);

  // Hooks de módulos
  const { checkSession, fetchUserProfile, setupAuthListener } =
    useAuthSession();
  const { signIn: originalSignIn, signOut } = useAuthActions(fetchUserProfile);
  const { hasRole, canViewAllVales, getFullName } = useAuthHelpers(userProfile);

  /**
   * Wrapper de signIn que previene race condition
   */
  const signIn = async (email, password) => {
    isSigningIn.current = true;
    setLoading(true);

    try {
      const result = await originalSignIn(email, password);

      if (result.success) {
        setUser(result.user);
        setUserProfile(result.profile);
        setError(null);
        setLoading(false);
      } else {
        console.log("❌ signIn falló:", result.error);
        setError(result.error);
        setLoading(false);
      }

      return result;
    } catch (error) {
      console.error("💥 Error inesperado en signIn wrapper:", error);
      setLoading(false);
      return { success: false, error: error.message };
    } finally {
      // Reactivar listener después de 500ms
      setTimeout(() => {
        isSigningIn.current = false;
      }, 500);
    }
  };

  /**
   * Callback para manejar cambios de autenticación
   */
  const handleAuthChange = (event, session, profile, errorMsg = null) => {
    // Ignorar TODOS los eventos si estamos en proceso de signIn manual
    if (isSigningIn.current) {
      return;
    }

    if (errorMsg) {
      console.log("   ❌ Error:", errorMsg);
      setError(errorMsg);
      setUser(null);
      setUserProfile(null);
      setLoading(false);
    } else if (event === "SIGNED_IN") {
      // Si viene del listener (profile=null), ignorar porque signIn manual lo manejará
      if (!profile) {
        return;
      }
      console.log("   ✅ Usuario autenticado vía listener con perfil");
      setUser(session.user);
      setUserProfile(profile);
      setError(null);
      setLoading(false);
    } else if (event === "SIGNED_OUT") {
      setUser(null);
      setUserProfile(null);
      setError(null);
      setLoading(false);
    } else if (event === "TOKEN_REFRESHED") {
    }
  };

  /**
   * Verificar sesión al cargar la app
   * Sin dependencias para evitar bucle infinito
   */
  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const initializeAuth = async () => {
      try {
        // Timeout de seguridad (5 segundos máximo)
        timeoutId = setTimeout(() => {
          if (mounted) {
            setLoading(false);
          }
        }, 5000);

        const { session, profile } = await checkSession();

        // Limpiar timeout si la verificación terminó
        clearTimeout(timeoutId);

        if (mounted) {
          if (session && profile) {
            console.log("✅ Sesión existente encontrada");
            setUser(session.user);
            setUserProfile(profile);
          } else {
          }
          setLoading(false);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("❌ Error en initializeAuth:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Configurar listener de cambios
    const subscription = setupAuthListener(handleAuthChange);

    // Cleanup
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []); // Sin dependencias - solo ejecuta al montar

  // Valor del contexto
  const value = {
    // Estados
    user,
    userProfile,
    loading,
    error,
    isAuthenticated: !!user,

    // Acciones
    signIn,
    signOut,

    // Helpers
    hasRole,
    canViewAllVales,
    getFullName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
