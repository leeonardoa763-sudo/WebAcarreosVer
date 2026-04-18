/**
 * src/components/visualizar-vale/LoginModal.jsx
 *
 * Modal de inicio de sesión para la página pública de visualización de vales
 * Permite a usuarios autenticados ver precios según su rol
 *
 * Dependencias: useAuth, colors, lucide-react
 * Usado en: VisualizarVale.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import { LogIn, Eye, EyeOff, Loader2 } from "lucide-react";

// 3. Config
import { colors } from "../../config/colors";

// 4. Hooks personalizados
import { useAuth } from "../../hooks/useAuth";

const LoginModal = ({ onClose }) => {
  const { signIn } = useAuth();

  // Estados del formulario
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  /**
   * Manejar submit del formulario de login
   */
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoginLoading(true);
      setLoginError(null);

      const { error } = await signIn(loginEmail, loginPassword);

      if (error) {
        setLoginError(error.message || "Credenciales inválidas");
        return;
      }

      // Login exitoso: cerrar modal
      onClose();
    } catch (error) {
      console.error("[LoginModal] Error en login:", error);
      setLoginError("Error al iniciar sesión. Intenta nuevamente.");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="modal-header">
          <h3>Iniciar Sesión</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="login-form">
          {loginError && (
            <div className="login-error">
              <span>{loginError}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-input">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={loginLoading}
            style={{ backgroundColor: colors.primary }}
          >
            {loginLoading ? (
              <>
                <Loader2 size={20} className="spinner" />
                Iniciando...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Iniciar Sesión
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
