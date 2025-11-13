/**
 * src/components/layout/Sidebar.jsx
 * 
 * Menú lateral de navegación
 */

// 1. React y hooks
import { NavLink } from 'react-router-dom';

// 2. Icons
import { LayoutDashboard, FileText, FileSpreadsheet } from 'lucide-react';

// 3. Config
import { colors } from '../../config/colors';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => 
            isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
          }
        >
          <LayoutDashboard className="sidebar__icon" size={20} />
          <span className="sidebar__text">Dashboard</span>
        </NavLink>

        <NavLink 
          to="/vales" 
          className={({ isActive }) => 
            isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
          }
        >
          <FileText className="sidebar__icon" size={20} />
          <span className="sidebar__text">Vales</span>
        </NavLink>

        <NavLink 
          to="/conciliaciones" 
          className={({ isActive }) => 
            isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
          }
        >
          <FileSpreadsheet className="sidebar__icon" size={20} />
          <span className="sidebar__text">Conciliaciones</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;