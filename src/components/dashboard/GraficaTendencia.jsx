/**
 * src/components/dashboard/GraficaTendencia.jsx
 *
 * Area+Line chart showing trend over time
 * Dependencias: recharts
 * Usado en: Dashboard.jsx
 */

import { useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const GraficaTendencia = ({ data, periodo }) => {
  const [metric, setMetric] = useState("cantidad");

  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <h3 className="chart-card__title">Tendencia</h3>
            <p className="chart-card__subtitle">Actividad por período</p>
          </div>
        </div>
        <div className="chart-card__empty">Sin datos</div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div
        style={{
          background: "rgba(15, 25, 35, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "12px",
          borderRadius: "8px",
          color: "white",
          fontSize: "12px",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>{data.label}</p>
        <p style={{ margin: "4px 0 0 0", color: "#ff6b35" }}>
          Vales: {data.cantidad}
        </p>
        <p style={{ margin: "2px 0 0 0", color: "#1a936f" }}>
          M³: {data.m3Total}
        </p>
      </div>
    );
  };

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">Tendencia</h3>
          <p className="chart-card__subtitle">Actividad por período</p>
        </div>
        <div className="chart-card__controls">
          <button
            className={`chart-card__toggle ${
              metric === "cantidad" ? "chart-card__toggle--active" : ""
            }`}
            onClick={() => setMetric("cantidad")}
          >
            Vales
          </button>
          <button
            className={`chart-card__toggle ${
              metric === "m3Total" ? "chart-card__toggle--active" : ""
            }`}
            onClick={() => setMetric("m3Total")}
          >
            M³
          </button>
        </div>
      </div>
      <div className="chart-card__body">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="colorTendencia" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff6b35" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              stroke="rgba(240, 244, 248, 0.55)"
              style={{ fontSize: "12px" }}
              label={{ value: "Período", position: "insideBottomRight", offset: -5, style: { fontSize: "12px", fill: "rgba(240, 244, 248, 0.7)" } }}
            />
            <YAxis
              stroke="rgba(240, 244, 248, 0.55)"
              style={{ fontSize: "12px" }}
              label={{ value: metric === "cantidad" ? "Cantidad de Vales" : "Material (m³)", angle: -90, position: "insideLeft", style: { fontSize: "12px", fill: "rgba(240, 244, 248, 0.7)" } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={metric}
              fill="url(#colorTendencia)"
              stroke="#ff6b35"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey={metric}
              stroke="#ff6b35"
              strokeWidth={2}
              dot={{ fill: "#ff6b35", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GraficaTendencia;
