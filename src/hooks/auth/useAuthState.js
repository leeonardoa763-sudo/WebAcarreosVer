/**
 * src/hooks/auth/useAuthState.js
 *
 * Manejo de estados y contexto de autenticación
 *
 * Funcionalidades:
 * - Context de autenticación
 * - Estados globales (user, userProfile, loading, error)
 * - Provider wrapper
 *
 * Usado en: useAuth.jsx
 */

// 1. React y hooks
import { createContext, useContext } from "react";

// Crear contexto de autenticación
export const AuthContext = createContext({});

/**
 * Hook para usar el contexto de autenticación
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext debe usarse dentro de AuthProvider");
  }
  return context;
};

/**
 * Estructura de estados iniciales
 */
export const initialAuthState = {
  user: null,
  userProfile: null,
  loading: true,
  error: null,
};

/**
 * Roles permitidos para acceso web
 */
export const ROLES_PERMITIDOS = ["Administrador", "Finanzas", "Sindicato"];
