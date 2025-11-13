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
 * - Timeout visual si tarda mucho
 *
 * Usado en: App.jsx para envolver rutas protegidas
 */

// 1. React y hooks
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";

// 2. Hooks personalizados
import { useAuth } from "../../hooks/useAuth";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, userProfile, loading, error } = useAuth();
  const [showTimeout, setShowTimeout] = useState(false);

  // Mostrar mensaje de timeout si tarda más de 5 segundos
  useEffect(() => {
    if (!loading) {
      setShowTimeout(false);
      return;
    }

    const timer = setTimeout(() => {
      if (loading) {
        setShowTimeout(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [loading]);

  // Mostrar loading mientras verifica la sesión
  if (loading) {
    return (
      <div className="protected-route-loading">
        <div className="loading-spinner"></div>
        <p>Verificando sesión...</p>

        {showTimeout && (
          <div
            style={{
              marginTop: "20px",
              textAlign: "center",
              color: "#F59E0B",
            }}
          >
            <p>La verificación está tomando más tiempo del esperado</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: "12px",
                padding: "10px 20px",
                backgroundColor: "#FF6B35",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    );
  }

  // Si hay un error y no hay usuario, mostrar error específico
  if (error && !user) {
    return (
      <div className="protected-route-error">
        <h2>Error de Autenticación</h2>
        <p>{error}</p>
        <button
          onClick={() => (window.location.href = "/login")}
          style={{
            marginTop: "20px",
            padding: "12px 24px",
            backgroundColor: "#FF6B35",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
          }}
        >
          Ir al Login
        </button>
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
        <p style={{ fontSize: "14px", color: "#7F8C8D", marginTop: "12px" }}>
          Tu rol actual: <strong>{userProfile.roles?.role}</strong>
          <br />
          Rol requerido: <strong>{requiredRole}</strong>
        </p>
      </div>
    );
  }

  // Usuario autenticado y con permisos correctos
  return children;
};

export default ProtectedRoute;
