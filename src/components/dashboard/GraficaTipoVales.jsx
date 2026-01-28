/**
 * src/components/dashboard/GraficaTipoVales.jsx
 *
 * Gráfica de pastel (pie chart) mostrando distribución Material vs Renta
 *
 * Muestra:
 * - Porcentaje de vales de material
 * - Porcentaje de vales de renta
 * - Cantidad total de cada tipo
 *
 * Dependencias: recharts
 * Usado en: Dashboard.jsx
 */

// 1. React
import React from "react";

// 2. Recharts
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

// 3. Icons
import { Package, Truck } from "lucide-react";

// 4. Config
import { colors } from "../../config/colors";

const GraficaTipoVales = ({ data }) => {
  // Colores para cada tipo
  const COLORES = {
    Material: colors.primary, // Naranja
    Renta: colors.secondary, // Azul
  };

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div
          style={{
            background: "white",
            padding: "12px 16px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            border: `2px solid ${COLORES[item.tipo]}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 600,
              color: "#2c3e50",
            }}
          >
            {item.tipo}
          </p>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "18px",
              fontWeight: 700,
              color: COLORES[item.tipo],
            }}
          >
            {item.cantidad} vales ({item.porcentaje}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Leyenda personalizada
  const CustomLegend = () => {
    if (!data || data.length === 0) return null;

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "24px",
          marginTop: "20px",
        }}
      >
        {data.map((item) => (
          <div
            key={item.tipo}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "4px",
                background: COLORES[item.tipo],
              }}
            />
            <div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#2c3e50",
                }}
              >
                {item.tipo}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#7f8c8d",
                }}
              >
                {item.cantidad} vales ({item.porcentaje}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h3
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: 700,
            color: "#2c3e50",
          }}
        >
          Distribución por Tipo
        </h3>
        <p
          style={{
            margin: "4px 0 0 0",
            fontSize: "14px",
            color: "#7f8c8d",
          }}
        >
          Material vs Renta
        </p>
      </div>

      {/* Gráfica */}
      {data && data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ porcentaje }) => `${porcentaje}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="cantidad"
              >
                {data.map((entry) => (
                  <Cell key={`cell-${entry.tipo}`} fill={COLORES[entry.tipo]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <CustomLegend />
        </>
      ) : (
        <div
          style={{
            height: "250px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#7f8c8d",
          }}
        >
          No hay datos de tipos de vales
        </div>
      )}
    </div>
  );
};

export default GraficaTipoVales;
