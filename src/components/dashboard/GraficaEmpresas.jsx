/**
 * src/components/dashboard/GraficaEmpresas.jsx
 *
 * Horizontal bar chart for companies
 * Dependencias: recharts
 * Usado en: Dashboard.jsx
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const GraficaEmpresas = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <h3 className="chart-card__title">Por Empresa</h3>
            <p className="chart-card__subtitle">Distribución de vales</p>
          </div>
        </div>
        <div className="chart-card__empty">Sin datos</div>
      </div>
    );
  }

  const colors = [
    "#ff6b35",
    "#004e89",
    "#1a936f",
    "#f59e0b",
    "#8b5cf6",
    "#10b981",
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    return (
      <div
        style={{
          background: "rgba(15, 25, 35, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "8px 12px",
          borderRadius: "6px",
          color: "white",
          fontSize: "11px",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>{item.empresa}</p>
        <p style={{ margin: "2px 0 0 0" }}>{item.cantidad} vales</p>
        <p style={{ margin: "2px 0 0 0", color: "#1a936f" }}>{item.m3Total} m³</p>
      </div>
    );
  };

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">Por Empresa</h3>
          <p className="chart-card__subtitle">Distribución de vales</p>
        </div>
      </div>
      <div className="chart-card__body">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart layout="vertical" data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" />
            <XAxis type="number" stroke="rgba(240, 244, 248, 0.55)" style={{ fontSize: "12px" }} />
            <YAxis
              type="category"
              dataKey="empresa"
              width={120}
              stroke="rgba(240, 244, 248, 0.55)"
              style={{ fontSize: "10px" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="cantidad" fill="#ff6b35" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GraficaEmpresas;
