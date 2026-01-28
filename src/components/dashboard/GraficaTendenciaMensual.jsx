/**
 * src/components/dashboard/GraficaTendenciaMensual.jsx
 *
 * Gráfica de línea con puntos mostrando tendencia de vales por mes
 *
 * Muestra:
 * - Últimos 6 meses de vales emitidos
 * - Línea de tendencia con puntos
 * - Indicador visual de incremento/decremento
 *
 * Dependencias: recharts
 * Usado en: Dashboard.jsx
 */

// 1. React
import React from "react";

// 2. Recharts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";

// 3. Icons
import { TrendingUp, TrendingDown } from "lucide-react";

// 4. Config
import { colors } from "../../config/colors";

const GraficaTendenciaMensual = ({ data, periodo, onCambioPeriodo }) => {
  // Calcular tendencia (comparar primer mes vs último mes)
  const calcularTendencia = () => {
    if (!data || data.length < 2) return null;

    const primerMes = data[0].cantidad;
    const ultimoMes = data[data.length - 1].cantidad;
    const cambio = ((ultimoMes - primerMes) / primerMes) * 100;

    return {
      porcentaje: Math.abs(Math.round(cambio)),
      esPositivo: cambio >= 0,
    };
  };

  const tendencia = calcularTendencia();

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
            border: `2px solid ${colors.primary}`,
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
            {payload[0].payload.periodo}
          </p>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "18px",
              fontWeight: 700,
              color: colors.primary,
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
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
            Tendencia de Vales
          </h3>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "14px",
              color: "#7f8c8d",
            }}
          >
            {periodo === "semana" ? "Últimas 8 semanas" : "Últimos 6 meses"}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {/* Selector de período */}
          <div
            style={{
              display: "flex",
              background: "#f0f0f0",
              borderRadius: "8px",
              padding: "4px",
            }}
          >
            <button
              onClick={() => onCambioPeriodo("semana")}
              style={{
                padding: "6px 16px",
                border: "none",
                borderRadius: "6px",
                background: periodo === "semana" ? "white" : "transparent",
                color: periodo === "semana" ? colors.primary : "#7f8c8d",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow:
                  periodo === "semana" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Semanal
            </button>
            <button
              onClick={() => onCambioPeriodo("mes")}
              style={{
                padding: "6px 16px",
                border: "none",
                borderRadius: "6px",
                background: periodo === "mes" ? "white" : "transparent",
                color: periodo === "mes" ? colors.primary : "#7f8c8d",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow:
                  periodo === "mes" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Mensual
            </button>
          </div>

          {/* Indicador de tendencia */}
          {tendencia && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "20px",
                background: tendencia.esPositivo
                  ? "rgba(26, 147, 111, 0.1)"
                  : "rgba(231, 76, 60, 0.1)",
              }}
            >
              {tendencia.esPositivo ? (
                <TrendingUp size={20} color="#1A936F" />
              ) : (
                <TrendingDown size={20} color="#E74C3C" />
              )}
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: tendencia.esPositivo ? "#1A936F" : "#E74C3C",
                }}
              >
                {tendencia.esPositivo ? "+" : "-"}
                {tendencia.porcentaje}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Gráfica */}
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorVales" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={colors.primary}
                  stopOpacity={0.2}
                />
                <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

            <XAxis
              dataKey="periodo"
              tick={{ fill: "#7f8c8d", fontSize: 12 }}
              axisLine={{ stroke: "#e0e0e0" }}
            />

            <YAxis
              tick={{ fill: "#7f8c8d", fontSize: 12 }}
              axisLine={{ stroke: "#e0e0e0" }}
              allowDecimals={false}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Área de relleno */}
            <Area
              type="monotone"
              dataKey="cantidad"
              stroke="none"
              fillOpacity={1}
              fill="url(#colorVales)"
            />

            {/* Línea principal */}
            <Line
              type="monotone"
              dataKey="cantidad"
              stroke={colors.primary}
              strokeWidth={3}
              dot={{
                fill: "white",
                stroke: colors.primary,
                strokeWidth: 3,
                r: 6,
              }}
              activeDot={{
                fill: colors.primary,
                stroke: "white",
                strokeWidth: 3,
                r: 8,
              }}
            />
          </ComposedChart>
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
          No hay datos suficientes para mostrar tendencia
        </div>
      )}
    </div>
  );
};

export default GraficaTendenciaMensual;
