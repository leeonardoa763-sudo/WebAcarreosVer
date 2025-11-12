/**
 * src/components/auth/LoginForm.jsx
 * 
 * Componente de formulario de inicio de sesión
 * 
 * Funcionalidades:
 * - Input de email y password
 * - Validación básica de campos
 * - Manejo de errores de autenticación
 * - Redirección después de login exitoso
 * 
 * Usado en: Login.jsx
 */

// 1. React y hooks
import { useState } from 'react';

// 2. React Router
import { useNavigate } from 'react-router-dom';

// 3. Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// 4. Config
import { colors } from '../../config/colors';

const LoginForm = () => {
  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  // Hooks
  const { signIn, loading } = useAuth();
  const navigate = useNavigate();

  /**
   * Validar campos del formulario
   */
  const validateForm = () => {
    if (!email.trim()) {
      setLocalError('El email es requerido');
      return false;
    }

    if (!email.includes('@')) {
      setLocalError('Email inválido');
      return false;
    }

    if (!password) {
      setLocalError('La contraseña es requerida');
      return false;
    }

    return true;
  };

  /**
   * Manejar submit del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    // Validar campos
    if (!validateForm()) {
      return;
    }

    // Intentar iniciar sesión
    const result = await signIn(email, password);

    if (result.success) {
      // Redireccionar al dashboard
      navigate('/dashboard');
    } else {
      // Mostrar error amigable
      if (result.error.includes('Invalid login credentials')) {
        setLocalError('Email o contraseña incorrectos');
      } else if (result.error.includes('No tiene permisos')) {
        setLocalError('Tu cuenta no tiene acceso al sistema web. Contacta al administrador.');
      } else {
        setLocalError(result.error);
      }
    }
  };

  return (
    <div className="login-form">
      <div className="login-form__header">
        <h1 className="login-form__title">Sistema de Vales</h1>
        <p className="login-form__subtitle">Acceso Administrativo</p>
      </div>

      <form className="login-form__form" onSubmit={handleSubmit}>
        {/* Campo Email */}
        <div className="login-form__field">
          <label 
            htmlFor="email" 
            className="login-form__label"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            className="login-form__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            disabled={loading}
            autoComplete="email"
          />
        </div>

        {/* Campo Password */}
        <div className="login-form__field">
          <label 
            htmlFor="password" 
            className="login-form__label"
          >
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            className="login-form__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        {/* Mostrar error si existe */}
        {localError && (
          <div className="login-form__error">
            {localError}
          </div>
        )}

        {/* Botón de submit */}
        <button
          type="submit"
          className="login-form__button"
          disabled={loading}
          style={{ backgroundColor: loading ? colors.textSecondary : colors.primary }}
        >
          {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </button>
      </form>

      <div className="login-form__footer">
        <p className="login-form__footer-text">
          Acceso exclusivo para personal autorizado
        </p>
      </div>
    </div>
  );
};

export default LoginForm;