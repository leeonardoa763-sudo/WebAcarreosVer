/**
 * src/components/layout/Layout.jsx
 * 
 * Layout principal con Navbar y Sidebar
 */

import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './../../styles/layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <Navbar />
      <div className="layout__container">
        <Sidebar />
        <main className="layout__content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;