/**
 * src/components/dashboard/GraficaDistribucionObras.jsx
 *
 * Gráfica de barras horizontales mostrando top 5 obras
 *
 * Muestra:
 * - Top 5 obras con más vales emitidos
 * - Barras horizontales coloreadas
 * - Cantidad de vales por obra
 *
 * Dependencias: recharts
 * Usado en: Dashboard.jsx
 */

// 1. React
import React from "react";

// 2. Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// 3. Config
import { colors } from "../../config/colors";

const GraficaDistribucionObras = ({ data }) => {
  // Paleta de colores para las barras
  const COLORES = [
    colors.primary, // Naranja principal
    colors.secondary, // Azul
    "#1A936F", // Verde
    "#F59E0B", // Amarillo
    "#8B5CF6", // Morado
  ];

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "white",
            padding: "12px 16px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            border: `2px solid ${payload[0].fill}`,
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
            {payload[0].payload.obra}
          </p>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "18px",
              fontWeight: 700,
              color: payload[0].fill,
            }}
          >
            {payload[0].value} vales
          </p>
        </div>
      );
    }
    return null;
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
      <div style={{ marginBottom: "24px" }}>
        <h3
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: 700,
            color: "#2c3e50",
          }}
        >
          Top 5 Obras
        </h3>
        <p
          style={{
            margin: "4px 0 0 0",
            fontSize: "14px",
            color: "#7f8c8d",
          }}
        >
          Obras con mayor volumen de vales
        </p>
      </div>

      {/* Gráfica */}
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e0e0e0"
              horizontal={false}
            />

            <XAxis
              type="number"
              tick={{ fill: "#7f8c8d", fontSize: 12 }}
              axisLine={{ stroke: "#e0e0e0" }}
              allowDecimals={false}
            />

            <YAxis
              type="category"
              dataKey="obra"
              tick={{ fill: "#7f8c8d", fontSize: 12 }}
              axisLine={{ stroke: "#e0e0e0" }}
              width={150}
            />

            <Tooltip content={<CustomTooltip />} />

            <Bar dataKey="cantidad" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORES[index % COLORES.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div
          style={{
            height: "300px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#7f8c8d",
          }}
        >
          No hay datos de obras
        </div>
      )}
    </div>
  );
};

export default GraficaDistribucionObras;
