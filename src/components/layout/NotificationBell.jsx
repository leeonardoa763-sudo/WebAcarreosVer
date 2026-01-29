/**
 * src/components/layout/NotificationBell.jsx
 *
 * Campanita de notificaciones con dropdown
 *
 * Funcionalidades:
 * - Mostrar badge con contador de notificaciones sin leer
 * - Dropdown con lista de notificaciones
 * - Click en notificación -> navegar al vale
 * - Marcar como leída al hacer click
 * - Marcar todas como leídas
 * - Tiempo relativo (hace X minutos)
 *
 * Dependencias: useNotifications, react-router-dom, lucide-react
 * Usado en: Navbar.jsx
 */

// 1. React y hooks
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 2. Icons
import { Bell, FileText, X, Check } from "lucide-react";

// 3. Hooks personalizados
import { useNotifications } from "../../hooks/useNotifications";

// 4. Config
import { colors } from "../../config/colors";

// 5. Estilos
import "../../styles/notifications.css";

const NotificationBell = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Estados
  const [isOpen, setIsOpen] = useState(false);

  // Hook de notificaciones
  const {
    notificaciones,
    loading,
    noLeidas,
    marcarComoLeida,
    marcarTodasComoLeidas,
  } = useNotifications();

  /**
   * Cerrar dropdown al hacer click fuera
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Manejar click en una notificación
   */
  const handleNotificationClick = async (notificacion) => {
    // Marcar como leída
    if (!notificacion.leida) {
      await marcarComoLeida(notificacion.id_notificacion);
    }

    // Cerrar dropdown
    setIsOpen(false);

    // Navegar al vale
    navigate(`/vales?folio=${notificacion.vales.folio}`);
  };

  /**
   * Formatear tiempo relativo
   */
  const formatearTiempoRelativo = (fecha) => {
    const ahora = new Date();
    const fechaNotif = new Date(fecha);
    const diffMs = ahora - fechaNotif;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} hrs`;
    if (diffDias === 1) return "Ayer";
    return `Hace ${diffDias} días`;
  };

  /**
   * Obtener color según tipo de vale
   */
  const getColorTipoVale = (tipo) => {
    return tipo === "material" ? colors.primary : colors.secondary;
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      {/* Botón de campanita */}
      <button
        className="notification-bell__button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        {noLeidas > 0 && (
          <span className="notification-bell__badge">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="notification-dropdown">
          {/* Header */}
          <div className="notification-dropdown__header">
            <h3 className="notification-dropdown__title">
              Notificaciones
              {noLeidas > 0 && (
                <span className="notification-dropdown__count">{noLeidas}</span>
              )}
            </h3>

            {noLeidas > 0 && (
              <button
                className="notification-dropdown__mark-all"
                onClick={marcarTodasComoLeidas}
                title="Marcar todas como leídas"
              >
                <Check size={16} />
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="notification-dropdown__list">
            {loading ? (
              <div className="notification-dropdown__loading">Cargando...</div>
            ) : notificaciones.length === 0 ? (
              <div className="notification-dropdown__empty">
                <Bell size={32} style={{ color: "#9CA3AF" }} />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              notificaciones.map((notif) => (
                <div
                  key={notif.id_notificacion}
                  className={`notification-item ${
                    !notif.leida ? "notification-item--unread" : ""
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  {/* Icono */}
                  <div
                    className="notification-item__icon"
                    style={{
                      backgroundColor: getColorTipoVale(notif.vales.tipo_vale),
                    }}
                  >
                    <FileText size={18} />
                  </div>

                  {/* Contenido */}
                  <div className="notification-item__content">
                    <div className="notification-item__header">
                      <span className="notification-item__folio">
                        {notif.vales.folio}
                      </span>
                      <span
                        className="notification-item__tipo"
                        style={{
                          color: getColorTipoVale(notif.vales.tipo_vale),
                        }}
                      >
                        {notif.vales.tipo_vale === "material"
                          ? "Material"
                          : "Renta"}
                      </span>
                    </div>

                    <p className="notification-item__obra">
                      {notif.vales.obras.obra}
                    </p>

                    <span className="notification-item__time">
                      {formatearTiempoRelativo(notif.fecha_creacion)}
                    </span>
                  </div>

                  {/* Indicador de no leída */}
                  {!notif.leida && <div className="notification-item__dot" />}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div className="notification-dropdown__footer">
              <button
                className="notification-dropdown__view-all"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/vales");
                }}
              >
                Ver todos los vales
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
