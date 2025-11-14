/**
 * src/hooks/useAuth.js
 *
 * Hook personalizado para manejar autenticación y perfil de usuario
 *
 * Funcionalidades:
 * - Inicio de sesión con email/password
 * - Validación de roles permitidos (ADMINISTRADOR, FINANZAS, SINDICATO)
 * - Obtención de perfil completo con relaciones
 * - Cierre de sesión
 * - Persistencia de sesión
 *
 * Usado en: LoginForm.jsx, ProtectedRoute.jsx, Navbar.jsx
 */

// 1. React y hooks
import { useState, useEffect, createContext, useContext } from "react";

// 2. Config
import { supabase } from "../config/supabase";

// Crear contexto de autenticación
const AuthContext = createContext({});

// Hook para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
};

// Provider de autenticación
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Roles permitidos para acceso web
  const ROLES_PERMITIDOS = ["Administrador", "Finanzas", "Sindicato"];

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
   * Iniciar sesión
   */
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      // Autenticar con Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) throw authError;

      // Obtener perfil completo
      const profile = await fetchUserProfile(authData.user.id);

      setUser(authData.user);
      setUserProfile(profile);

      return { success: true, user: authData.user, profile };
    } catch (error) {
      console.error("Error en signIn:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cerrar sesión
   */
  const signOut = async () => {
    try {
      // No mostrar loading en signOut para evitar bloqueo visual
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setUserProfile(null);

      // Redirigir inmediatamente a login
      window.location.href = "/login";
    } catch (error) {
      console.error("Error en signOut:", error);
      // Forzar redirección incluso si hay error
      window.location.href = "/login";
    }
  };

  /**
   * Verificar si el usuario tiene un rol específico
   */
  const hasRole = (role) => {
    return userProfile?.roles?.role === role;
  };

  /**
   * Verificar si el usuario puede ver todos los vales
   */
  const canViewAllVales = () => {
    const role = userProfile?.roles?.role;
    return role === "Administrador" || role === "Finanzas";
  };

  /**
   * Obtener nombre completo del usuario
   */
  const getFullName = () => {
    if (!userProfile) return "";
    const { nombre, primer_apellido, segundo_apellido } = userProfile;
    return `${nombre} ${primer_apellido || ""} ${segundo_apellido || ""}`.trim();
  };

  /**
   * Verificar sesión al cargar la app
   */
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        // Obtener sesión actual
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        // Si hay error al obtener la sesión, simplemente marcar como no cargando
        if (sessionError) {
          console.error("Error al obtener sesión:", sessionError);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        // Si hay sesión válida, obtener el perfil
        if (session?.user && mounted) {
          try {
            const profile = await fetchUserProfile(session.user.id);
            if (mounted) {
              setUser(session.user);
              setUserProfile(profile);
            }
          } catch (profileError) {
            console.error("Error al obtener perfil:", profileError);
            // Si falla el perfil pero hay sesión, limpiar todo
            if (mounted) {
              setUser(null);
              setUserProfile(null);
              // Solo hacer signOut si el error es de permisos
              if (profileError.message.includes("permisos")) {
                await supabase.auth.signOut();
              }
            }
          }
        }
      } catch (error) {
        console.error("Error general en checkSession:", error);
        // No cerrar sesión automáticamente en caso de error de red
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    // Suscribirse a cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      if (event === "SIGNED_IN" && session?.user) {
        try {
          const profile = await fetchUserProfile(session.user.id);
          if (mounted) {
            setUser(session.user);
            setUserProfile(profile);
          }
        } catch (error) {
          console.error("Error al obtener perfil en auth change:", error);
          if (mounted) {
            setError(error.message);
          }
        }
      } else if (event === "SIGNED_OUT") {
        if (mounted) {
          setUser(null);
          setUserProfile(null);
        }
      } else if (event === "TOKEN_REFRESHED") {
        console.log("Token refrescado correctamente");
      }
    });

    // Cleanup
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    error,
    signIn,
    signOut,
    hasRole,
    canViewAllVales,
    getFullName,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
