/**
 * src/components/layout/Navbar.jsx
 *
 * Barra de navegación superior
 * Muestra logo, nombre usuario, notificaciones y botón logout
 *
 * Dependencias: useAuth, NotificationBell, colors, supabase
 * Usado en: Layout.jsx
 */

// 1. React y hooks
import { useNavigate } from "react-router-dom";

// 2. Componentes
import NotificationBell from "./NotificationBell";

// 3. Hooks personalizados
import { useAuth } from "../../hooks/useAuth";

// 4. Config
import { colors } from "../../config/colors";
import { supabase } from "../../config/supabase";

const Navbar = () => {
  const { userProfile, getFullName } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <nav className="navbar">
      <div className="navbar__left">
        <img src="/logo.png" alt="Logo" className="navbar__logo" />
        <h2 className="navbar__title">Sistema de Vales</h2>
      </div>

      <div className="navbar__right">
        {/* Campanita de notificaciones */}
        <NotificationBell />

        {/* Info del usuario */}
        <div className="navbar__user">
          <span className="navbar__user-name">{getFullName()}</span>
          <span className="navbar__user-role">{userProfile?.roles?.role}</span>
        </div>

        {/* Botón de cerrar sesión */}
        <button
          onClick={handleLogout}
          className="navbar__logout"
          style={{ backgroundColor: colors.primary }}
        >
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
