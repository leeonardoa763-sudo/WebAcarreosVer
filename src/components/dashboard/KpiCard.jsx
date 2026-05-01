/**
 * src/components/dashboard/KpiCard.jsx
 *
 * Animated KPI metric card with trend indicator
 * Dependencias: lucide-react, CSS custom properties
 * Usado en: Dashboard.jsx
 */

import { useLayoutEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const KpiCard = ({ title, value, unit, icon: Icon, color, comparativa }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useLayoutEffect(() => {
    let animationId;
    let currentValue = 0;
    const target = value || 0;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      currentValue = Math.floor(target * progress);
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [value]);

  const hasTrend = comparativa && typeof comparativa.pct === "number";
  const isPositive = comparativa?.sube;

  return (
    <div className="kpi-card">
      <div
        className="kpi-card__icon-wrap"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {Icon && <Icon />}
      </div>

      <div className="kpi-card__label">{title}</div>

      <div className="kpi-card__value">
        {displayValue.toLocaleString("es-MX")}
      </div>

      {unit && <div className="kpi-card__unit">{unit}</div>}

      {hasTrend && (
        <div
          className={`kpi-card__trend kpi-card__trend--${
            isPositive ? "up" : "down"
          }`}
        >
          {isPositive ? (
            <TrendingUp size={12} />
          ) : (
            <TrendingDown size={12} />
          )}
          <span>{Math.abs(comparativa.pct)}%</span>
        </div>
      )}
    </div>
  );
};

export default KpiCard;
