/**
 * src/components/dashboard/GraficaEstados.jsx
 *
 * Donut chart showing distribution by vale estado
 * Dependencias: recharts
 * Usado en: Dashboard.jsx
 */

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const GraficaEstados = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <h3 className="chart-card__title">Estado Vales</h3>
            <p className="chart-card__subtitle">Distribución por estado</p>
          </div>
        </div>
        <div className="chart-card__empty">Sin datos</div>
      </div>
    );
  }

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
        <p style={{ margin: 0, fontWeight: 600 }}>{item.label}</p>
        <p style={{ margin: "2px 0 0 0 " }}>{item.cantidad} vales</p>
      </div>
    );
  };

  const total = data.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">Estado Vales</h3>
          <p className="chart-card__subtitle">Distribución por estado</p>
        </div>
      </div>
      <div className="chart-card__body">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={2}
              dataKey="cantidad"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            marginTop: "16px",
            fontSize: "11px",
          }}
        >
          {data.map((item) => (
            <div
              key={item.estado}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px",
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: "4px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  background: item.color,
                  borderRadius: "2px",
                }}
              />
              <div>
                <div style={{ fontWeight: 500 }}>{item.label}</div>
                <div style={{ color: "rgba(240, 244, 248, 0.55)" }}>
                  {item.cantidad} ({Math.round((item.cantidad / total) * 100)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GraficaEstados;
