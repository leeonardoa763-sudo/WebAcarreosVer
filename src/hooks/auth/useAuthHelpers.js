/**
 * src/hooks/auth/useAuthHelpers.js
 *
 * Funciones auxiliares de autenticación
 *
 * Funcionalidades:
 * - Verificar roles
 * - Verificar permisos de visualización
 * - Obtener nombre completo
 *
 * Usado en: useAuth.jsx
 */

/**
 * Hook para funciones auxiliares
 */
export const useAuthHelpers = (userProfile) => {
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

  return {
    hasRole,
    canViewAllVales,
    getFullName,
  };
};
