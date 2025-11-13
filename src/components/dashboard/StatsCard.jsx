/**
 * src/components/dashboard/StatsCard.jsx
 *
 * Tarjeta de estadística individual
 * Muestra un ícono, título y valor numérico
 */

const StatsCard = ({ title, value, Icon, color }) => {
  return (
    <div className="stats-card">
      <div
        className="stats-card__icon"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={24} style={{ color: color }} />
      </div>

      <div className="stats-card__content">
        <p className="stats-card__title">{title}</p>
        <h3 className="stats-card__value">{value}</h3>
      </div>
    </div>
  );
};

export default StatsCard;
