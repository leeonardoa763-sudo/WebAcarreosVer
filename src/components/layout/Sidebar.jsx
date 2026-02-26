/**
 * src/components/layout/Sidebar.jsx
 *
 * Menú lateral de navegación con visibilidad por roles
 *
 * Dependencias: useAuth, react-router-dom, lucide-react
 * Usado en: Layout.jsx
 */

// 1. React Router
import { NavLink } from "react-router-dom";

// 2. Icons
import {
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  FileCheck,
  Truck,
  History,
} from "lucide-react";

// 3. Hooks personalizados
import { useAuth } from "../../hooks/useAuth";

const Sidebar = () => {
  const { userProfile } = useAuth();
  const rol = userProfile?.roles?.role;

  // Flags de roles para controlar visibilidad
  const esAdministrador = rol === "Administrador";
  const esSindicato = rol === "Sindicato";

  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        {/* Dashboard - solo Administrador */}
        {esAdministrador && (
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
            }
          >
            <LayoutDashboard className="sidebar__icon" size={20} />
            <span className="sidebar__text">Dashboard</span>
          </NavLink>
        )}

        {/* Vales - todos los roles */}
        <NavLink
          to="/vales"
          className={({ isActive }) =>
            isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
          }
        >
          <FileText className="sidebar__icon" size={20} />
          <span className="sidebar__text">Vales</span>
        </NavLink>

        {/* Operadores - solo Administrador */}
        {esAdministrador && (
          <NavLink
            to="/operadores"
            className={({ isActive }) =>
              isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
            }
          >
            <Truck className="sidebar__icon" size={20} />
            <span className="sidebar__text">Operadores</span>
          </NavLink>
        )}

        {/* Verificar Vales - Administrador y Sindicato */}
        {(esAdministrador || esSindicato) && (
          <NavLink
            to="/verificar-vales"
            className={({ isActive }) =>
              isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
            }
          >
            <FileCheck className="sidebar__icon" size={20} />
            <span className="sidebar__text">Verificar Vales</span>
          </NavLink>
        )}

        {/* Conciliaciones (generar) - Administrador y Sindicato */}
        {(esAdministrador || esSindicato) && (
          <NavLink
            to="/conciliaciones"
            className={({ isActive }) =>
              isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
            }
          >
            <FileSpreadsheet className="sidebar__icon" size={20} />
            <span className="sidebar__text">Conciliaciones</span>
          </NavLink>
        )}

        {/* Historial de Conciliaciones - Administrador y Sindicato */}
        {(esAdministrador || esSindicato) && (
          <NavLink
            to="/historial-conciliaciones"
            className={({ isActive }) =>
              isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
            }
          >
            <History className="sidebar__icon" size={20} />
            <span className="sidebar__text">Historial</span>
          </NavLink>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
