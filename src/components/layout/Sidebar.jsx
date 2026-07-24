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
  FileSpreadsheet,
  FileCheck,
  History,
  BookOpen,
  LayoutList,
  BarChart3,
} from "lucide-react";

// 3. Hooks personalizados
import { useAuth } from "../../hooks/useAuth";

const Sidebar = () => {
  const { userProfile } = useAuth();
  const rol = userProfile?.roles?.role;

  // Flags de roles para controlar visibilidad
  const esAdministrador = rol === "Administrador";
  const esFinanzas = rol === "Finanzas";
  const esSindicato = rol === "Sindicato";
  const esGerencia = rol === "Gerencia";
  const esResidente = rol === "Residente";

  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        {/* Estadísticas Globales - Administrador, Gerencia y Residente */}
        {(esAdministrador || esGerencia || esResidente) && (
          <NavLink
            to="/estadisticas"
            className={({ isActive }) =>
              isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
            }
          >
            <BarChart3 className="sidebar__icon" size={20} />
            <span className="sidebar__text">Estadísticas</span>
          </NavLink>
        )}

        {/* Dashboard Unificado - todos los roles */}
        <NavLink
          to="/dashboard-unificado"
          className={({ isActive }) =>
            isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
          }
        >
          <LayoutList className="sidebar__icon" size={20} />
          <span className="sidebar__text">Vales</span>
        </NavLink>


        {/* Verificar Vales - Administrador y Sindicato (NO Residente) */}
        {(esAdministrador || esSindicato) && !esResidente && (
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

        {/* Conciliaciones (generar) - Administrador y Sindicato (NO Residente) */}
        {(esAdministrador || esSindicato) && !esResidente && (
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

        {/* Historial de Conciliaciones - Administrador y Sindicato (NO Residente) */}
        {(esAdministrador || esSindicato) && !esResidente && (
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

        {/* Contabilidad - Administrador y Finanzas (NO Residente) */}
        {(esAdministrador || esFinanzas) && !esResidente && (
          <NavLink
            to="/contabilidad"
            className={({ isActive }) =>
              isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
            }
          >
            <BookOpen className="sidebar__icon" size={20} />
            <span className="sidebar__text">Contabilidad</span>
          </NavLink>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
