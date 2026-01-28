/**
 * src/components/dashboard/GraficaTopMateriales.jsx
 *
 * Gráfica de barras verticales mostrando top 5 materiales
 *
 * Muestra:
 * - Top 5 materiales más solicitados
 * - Barras verticales con gradiente
 * - Cantidad de veces solicitado cada material
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

const GraficaTopMateriales = ({
  data,
  obras,
  obraSeleccionada,
  onCambioObra,
}) => {
  // Paleta de colores para las barras
  const COLORES = [
    colors.primary,
    colors.secondary,
    "#1A936F",
    "#F59E0B",
    "#8B5CF6",
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
              maxWidth: "200px",
            }}
          >
            {payload[0].payload.material}
          </p>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "18px",
              fontWeight: 700,
              color: payload[0].fill,
            }}
          >
            {payload[0].value.toLocaleString("es-MX", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            M³
          </p>
        </div>
      );
    }
    return null;
  };

  // Truncar nombre de material si es muy largo
  const truncarTexto = (texto, maxLength = 15) => {
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + "...";
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 700,
                color: "#2c3e50",
              }}
            >
              Top 5 Materiales
            </h3>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "14px",
                color: "#7f8c8d",
              }}
            >
              Materiales con mayor volumen (M³)
            </p>
          </div>

          {/* Selector de obra */}
          {obras && obras.length > 1 && (
            <select
              value={obraSeleccionada || ""}
              onChange={(e) =>
                onCambioObra(e.target.value ? parseInt(e.target.value) : null)
              }
              style={{
                padding: "8px 16px",
                border: `2px solid ${colors.primary}`,
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                color: colors.primary,
                background: "white",
                cursor: "pointer",
                outline: "none",
                minWidth: "200px",
              }}
            >
              <option value="">Todas las obras</option>
              {obras.map((obra) => (
                <option key={obra.id_obra} value={obra.id_obra}>
                  {obra.obra}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Gráfica */}
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e0e0e0"
              vertical={false}
            />

            <XAxis
              dataKey="material"
              tick={{ fill: "#7f8c8d", fontSize: 11 }}
              axisLine={{ stroke: "#e0e0e0" }}
              angle={-15}
              textAnchor="end"
              height={60}
              tickFormatter={(value) => truncarTexto(value, 12)}
            />

            <YAxis
              tick={{ fill: "#7f8c8d", fontSize: 12 }}
              axisLine={{ stroke: "#e0e0e0" }}
              allowDecimals={false}
            />

            <Tooltip content={<CustomTooltip />} />

            <Bar dataKey="m3Total" radius={[8, 8, 0, 0]}>
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
          No hay datos de materiales
        </div>
      )}
    </div>
  );
};

export default GraficaTopMateriales;
