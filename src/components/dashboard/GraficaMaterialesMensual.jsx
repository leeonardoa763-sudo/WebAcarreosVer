/**
 * src/components/dashboard/GraficaMaterialesMensual.jsx
 *
 * BarChart apilado por mes. Toggle entre M³ e Importe + IVA.
 * Datos: dataPorMes (m3) y dataPorMesImporte (importe con IVA) de useMvStats.
 * Dependencias: recharts
 * Usado en: Dashboard.jsx (pestaña Materiales)
 */

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const PALETA = [
  "#ff6b35", "#004e89", "#1a936f", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ef4444", "#84cc16", "#ec4899", "#14b8a6",
  "#f97316", "#6366f1",
];

const fmtM3 = (v) => `${Number(v).toLocaleString("es-MX", { maximumFractionDigits: 1 })} m³`;
const fmtMXN = (v) =>
  `$${Math.round(Number(v)).toLocaleString("es-MX")}`;

const GraficaMaterialesMensual = ({ dataPorMes, dataPorMesImporte, materiales, año }) => {
  const [metrica, setMetrica] = useState("m3");

  const dataActiva = metrica === "m3" ? dataPorMes : dataPorMesImporte;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const total = payload.reduce((s, p) => s + (p.value || 0), 0);
    const fmt = metrica === "m3" ? fmtM3 : fmtMXN;
    return (
      <div
        style={{
          background: "rgba(15,25,35,0.92)",
          border: "1px solid rgba(255,255,255,0.12)",
          padding: "10px 14px",
          borderRadius: "8px",
          color: "white",
          fontSize: "12px",
          minWidth: "180px",
        }}
      >
        <p style={{ margin: "0 0 6px 0", fontWeight: 600 }}>{label}</p>
        {payload
          .filter((p) => (p.value || 0) > 0)
          .sort((a, b) => b.value - a.value)
          .map((p) => (
            <p key={p.name} style={{ margin: "2px 0", color: p.fill }}>
              {p.name}: {fmt(p.value)}
            </p>
          ))}
        <p style={{ margin: "6px 0 0 0", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "4px", fontWeight: 600 }}>
          Total: {fmt(total)}
        </p>
      </div>
    );
  };

  const hayDatos = dataPorMes && dataPorMes.some((mes) =>
    materiales.some((m) => (mes[m] || 0) > 0)
  );

  if (!hayDatos) {
    return (
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <h3 className="chart-card__title">Distribución Mensual</h3>
            <p className="chart-card__subtitle">Año {año}</p>
          </div>
        </div>
        <div className="chart-card__empty">Sin datos para el período seleccionado</div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">Distribución Mensual por Material</h3>
          <p className="chart-card__subtitle">Barras apiladas · Año {año}</p>
        </div>
        <div className="chart-card__controls">
          <button
            className={`chart-card__toggle ${metrica === "m3" ? "chart-card__toggle--active" : ""}`}
            onClick={() => setMetrica("m3")}
          >
            M³
          </button>
          <button
            className={`chart-card__toggle ${metrica === "importe" ? "chart-card__toggle--active" : ""}`}
            onClick={() => setMetrica("importe")}
          >
            Importe + IVA
          </button>
        </div>
      </div>
      <div className="chart-card__body">
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={dataActiva} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="mes"
              stroke="rgba(30,40,60,0.4)"
              style={{ fontSize: "12px" }}
              tick={{ fill: "var(--db-text-muted)" }}
            />
            <YAxis
              stroke="rgba(30,40,60,0.4)"
              style={{ fontSize: "11px" }}
              tickFormatter={(v) =>
                metrica === "m3"
                  ? `${v.toLocaleString("es-MX")} m³`
                  : `$${(v / 1000).toFixed(0)}k`
              }
              tick={{ fill: "var(--db-text-muted)" }}
              width={72}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
            {materiales.map((nombre, idx) => (
              <Bar
                key={nombre}
                dataKey={nombre}
                stackId="stack"
                fill={PALETA[idx % PALETA.length]}
                radius={idx === materiales.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GraficaMaterialesMensual;
