/**
 * src/components/dashboard/GraficaEficienciaViajes.jsx
 *
 * Dual-axis chart: trips per hour + efficiency
 * Dependencias: recharts
 * Usado en: Dashboard.jsx
 */

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const GraficaEficienciaViajes = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <h3 className="chart-card__title">Eficiencia Viajes</h3>
            <p className="chart-card__subtitle">Actividad por hora del día</p>
          </div>
        </div>
        <div className="chart-card__empty">Sin viajes registrados</div>
      </div>
    );
  }

  const maxViajes = Math.max(...data.map((d) => d.viajes));
  const horaMaxViajes = data.reduce((prev, current) =>
    current.viajes > prev.viajes ? current : prev
  );

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    return (
      <div
        style={{
          background: "rgba(15, 25, 35, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "12px",
          borderRadius: "8px",
          color: "white",
          fontSize: "11px",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>{item.label}</p>
        <p style={{ margin: "4px 0 0 0", color: "#ff6b35" }}>
          Viajes: {item.viajes}
        </p>
        <p style={{ margin: "2px 0 0 0", color: "#1a936f" }}>
          M³: {item.m3Total}
        </p>
        <p style={{ margin: "2px 0 0 0", color: "#f59e0b" }}>
          Eficiencia: {item.eficiencia} m³/viaje
        </p>
      </div>
    );
  };

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">Eficiencia Viajes</h3>
          <p className="chart-card__subtitle">Actividad por hora del día</p>
        </div>
      </div>
      <div className="chart-card__body">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              stroke="rgba(240, 244, 248, 0.55)"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              yAxisId="left"
              stroke="rgba(240, 244, 248, 0.55)"
              style={{ fontSize: "12px" }}
              label={{ value: "Viajes", angle: -90, position: "insideLeft" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="rgba(240, 244, 248, 0.55)"
              style={{ fontSize: "12px" }}
              label={{ value: "Eficiencia (m³/viaje)", angle: 90, position: "insideRight" }}
            />
            <Tooltip content={<CustomTooltip />} />
            {horaMaxViajes.viajes > 0 && (
              <ReferenceLine
                yAxisId="left"
                y={horaMaxViajes.viajes}
                stroke="rgba(255, 107, 53, 0.3)"
                strokeDasharray="5 5"
                label={{
                  value: `Hora pico: ${horaMaxViajes.label}`,
                  position: "right",
                  fill: "rgba(240, 244, 248, 0.55)",
                  fontSize: 11,
                }}
              />
            )}
            <Bar yAxisId="left" dataKey="viajes" fill="#ff6b35" opacity={0.7} radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="eficiencia"
              stroke="#1a936f"
              strokeWidth={2}
              dot={{ fill: "#1a936f", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GraficaEficienciaViajes;
