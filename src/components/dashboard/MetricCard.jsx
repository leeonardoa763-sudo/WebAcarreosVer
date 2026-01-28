/**
 * src/components/dashboard/MetricCard.jsx
 *
 * Card de métrica con diseño mejorado
 *
 * Muestra:
 * - Icono grande con color de fondo
 * - Título de la métrica
 * - Valor principal (número grande)
 * - Subtítulo opcional
 *
 * Dependencias: lucide-react
 * Usado en: Dashboard.jsx
 */

// 1. React
import React from "react";

const MetricCard = ({ title, value, subtitle, Icon, color, bgColor }) => {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "24px",
        display: "flex",
        alignItems: "center",
        gap: "20px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        transition: "all 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.12)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Icono con fondo coloreado */}
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "16px",
          background: bgColor || `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {Icon && <Icon size={36} color={color} strokeWidth={2.5} />}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: 600,
            color: "#7f8c8d",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {title}
        </p>

        <p
          style={{
            margin: "8px 0 0 0",
            fontSize: "36px",
            fontWeight: 700,
            color: "#2c3e50",
            lineHeight: 1,
          }}
        >
          {value?.toLocaleString("es-MX")}
        </p>

        {subtitle && (
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: "13px",
              color: "#95a5a6",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
