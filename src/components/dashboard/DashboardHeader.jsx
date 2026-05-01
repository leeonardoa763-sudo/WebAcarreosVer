/**
 * src/components/dashboard/DashboardHeader.jsx
 *
 * Dashboard header with title, date, and refresh button
 * Dependencias: lucide-react, useAuth
 * Usado en: Dashboard.jsx
 */

import { RefreshCw } from "lucide-react";

const DashboardHeader = ({ userProfile, lastUpdated, loading, onRefresh }) => {
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Buenos días";
    if (hours < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const formatLastUpdated = (date) => {
    if (!date) return null;
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    return `Actualizado hoy a las ${hours}:${mins}`;
  };

  const userName = userProfile
    ? `${userProfile.nombre} ${userProfile.primer_apellido}`
    : "Usuario";

  return (
    <div className="dashboard__header">
      <div className="dashboard__header-content">
        <h1 className="dashboard__title">Centro de Control</h1>
        <p className="dashboard__subtitle">
          {getGreeting()}, {userName} • Logística de construcción
        </p>
      </div>

      <div className="dashboard__header-actions">
        <div className="dashboard__last-updated">
          {formatLastUpdated(lastUpdated)}
        </div>
        <button
          className={`dashboard__refresh-btn ${loading ? "spinning" : ""}`}
          onClick={onRefresh}
          disabled={loading}
          title="Actualizar datos"
        >
          <RefreshCw size={16} />
          <span>Actualizar</span>
        </button>
      </div>
    </div>
  );
};

export default DashboardHeader;
