/**
 * src/components/auth/ProtectedRoute.jsx
 * 
 * Componente para proteger rutas que requieren autenticación
 * 
 * Funcionalidades:
 * - Verificar si el usuario está autenticado
 * - Redireccionar a login si no hay sesión
 * - Mostrar loading mientras verifica sesión
 * - Validar roles específicos si se requiere
 * 
 * Usado en: App.jsx para envolver rutas protegidas
 */

// 1. React y hooks
import { Navigate } from 'react-router-dom';

// 2. Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, userProfile, loading } = useAuth();

  // Mostrar loading mientras verifica la sesión
  if (loading) {
    return (
      <div className="protected-route-loading">
        <div className="loading-spinner"></div>
        <p>Verificando sesión...</p>
      </div>
    );
  }

  // Si no hay usuario autenticado, redireccionar a login
  if (!user || !userProfile) {
    return <Navigate to="/login" replace />;
  }

  // Si se requiere un rol específico, validar
  if (requiredRole && userProfile.roles?.role !== requiredRole) {
    return (
      <div className="protected-route-error">
        <h2>Acceso Denegado</h2>
        <p>No tienes permisos para acceder a esta sección.</p>
      </div>
    );
  }

  // Usuario autenticado y con permisos correctos
  return children;
};

export default ProtectedRoute;