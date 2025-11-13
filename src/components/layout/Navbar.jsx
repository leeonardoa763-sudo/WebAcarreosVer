/**
 * src/components/layout/Navbar.jsx
 * 
 * Barra de navegación superior
 * Muestra logo, nombre usuario y botón logout
 */

// 1. React y hooks
import { useNavigate } from 'react-router-dom';

// 2. Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// 3. Config
import { colors } from '../../config/colors';

const Navbar = () => {
  const { userProfile, getFullName, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar__left">
        <img src="/logo.png" alt="Logo" className="navbar__logo" />
        <h2 className="navbar__title">Sistema de Vales</h2>
      </div>

      <div className="navbar__right">
        <div className="navbar__user">
          <span className="navbar__user-name">{getFullName()}</span>
          <span className="navbar__user-role">{userProfile?.roles?.role}</span>
        </div>
        
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