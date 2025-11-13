/**
 * src/components/auth/ProtectedRoute.jsx
 *
 * Componente para proteger rutas que requieren autenticación
 *
 * Funcionalidades:
 * - Verificar si el usuario está autenticado
 * - Redireccionar a login si no hay sesión
 * - Mostrar loading mientras verifica sesión
 * - Botón de cerrar sesión si tarda más de 5 segundos
 * - Validar roles específicos si se requiere
 *
 * Usado en: App.jsx para envolver rutas protegidas
 */

// 1. React y hooks
import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";

// 2. Hooks personalizados
import { useAuth } from "../../hooks/useAuth";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, userProfile, loading, error, signOut } = useAuth();
  const [showTimeout, setShowTimeout] = useState(false);
  const navigate = useNavigate();

  // Función para cerrar sesión y empezar de cero
  const handleForceLogout = async () => {
    try {
      // Limpiar localStorage completamente
      localStorage.clear();

      // Cerrar sesión en Supabase
      await signOut();

      // Recargar la página para limpiar todo el estado
      window.location.href = "/login";
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Forzar recarga incluso si hay error
      window.location.href = "/login";
    }
  };

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
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <p style={{ margin: "0 0 8px 0" }}>
              La verificación está tomando más tiempo del esperado
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#004E89",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Reintentar
              </button>

              <button
                onClick={handleForceLogout}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#DC2626",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Cerrar Sesión
              </button>
            </div>

            <p
              style={{
                fontSize: "12px",
                color: "#7F8C8D",
                margin: "8px 0 0 0",
                maxWidth: "300px",
              }}
            >
              Si el problema persiste, intenta cerrar sesión y volver a iniciar
            </p>
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
