/**
 * src/pages/Login.jsx
 *
 * Página de inicio de sesión
 *
 * Layout simple con logo y formulario centrado
 * Redirección automática si ya hay sesión activa
 *
 * Acceso: Público (sin autenticación)
 */

// 1. React y hooks
import { useEffect } from "react";

// 2. React Router
import { useNavigate } from "react-router-dom";

// 3. Hooks personalizados
import { useAuth } from "../hooks/useAuth";

// 4. Componentes
import LoginForm from "../components/auth/LoginForm";

// 5. Estilos
import "../styles/auth.css";

const Login = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  // Redireccionar si ya está autenticado SOLO después de que termine el loading inicial
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Mostrar loading mientras verifica sesión inicial
  if (loading) {
    return (
      <div className="login-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Logo de la empresa */}
        <div className="login-logo">
          <img src="/logo.png" alt="Logo" className="login-logo__image" />
        </div>

        {/* Formulario de login */}
        <LoginForm />

        {/* Créditos del creador */}
        <div className="login-footer">
          <p className="login-footer__text">
            Desarrollado por{" "}
            <span className="login-footer__name">
              Ing. Leonardo Aguilar Saucedo
            </span>
          </p>
          <p className="login-footer__contact">Tel: 492 145 2396</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
