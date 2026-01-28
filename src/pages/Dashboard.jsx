/**
 * src/pages/Dashboard.jsx
 *
 * Vista principal del dashboard administrativo (MEJORADA)
 *
 * Muestra:
 * - Métricas principales en cards (Total vales, M³, Horas, Valor total)
 * - Gráfica de tendencia mensual con indicador de incremento/decremento
 * - Distribución por obras (top 5)
 * - Distribución por tipo (Material vs Renta)
 * - Top 5 materiales más solicitados
 * - Sección de conciliaciones recientes
 *
 * Acceso: Solo ADMINISTRADOR, FINANZAS, SINDICATO
 */

// 1. React y hooks
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// 2. Icons
import { FileText, Truck, Clock, DollarSign, RefreshCw } from "lucide-react";

// 3. Config
import { colors } from "../config/colors";

// 4. Hooks personalizados
import { useAuth } from "../hooks/useAuth";
import { useDashboardAnalytics } from "../hooks/useDashboardAnalytics";

// 5. Componentes
import MetricCard from "../components/dashboard/MetricCard";
import GraficaTendenciaMensual from "../components/dashboard/GraficaTendenciaMensual";
import GraficaDistribucionObras from "../components/dashboard/GraficaDistribucionObras";
import GraficaTipoVales from "../components/dashboard/GraficaTipoVales";
import GraficaTopMateriales from "../components/dashboard/GraficaTopMateriales";
import SeccionConciliaciones from "../components/dashboard/SeccionConciliaciones";

// 6. Estilos
import "../styles/dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  // Hook de analytics
  const {
    metricas,
    tendenciaMensual,
    distribucionObras,
    distribucionTipo,
    topMateriales,
    periodoTendencia,
    obrasDisponibles,
    obraSeleccionadaMateriales,
    loading,
    error,
    refresh,
    cambiarPeriodo,
    cambiarObraMateriales,
  } = useDashboardAnalytics();

  const [refreshing, setRefreshing] = useState(false);

  /**
   * Refrescar datos del dashboard
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button
          onClick={handleRefresh}
          style={{
            marginTop: "16px",
            padding: "12px 24px",
            background: colors.primary,
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header con botón de refresh */}
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Dashboard</h1>
          <p className="dashboard__subtitle">
            Bienvenido, {userProfile?.nombre}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            padding: "10px 20px",
            background: refreshing ? "#e0e0e0" : "white",
            border: `2px solid ${colors.primary}`,
            borderRadius: "8px",
            cursor: refreshing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: colors.primary,
            fontWeight: 600,
            fontSize: "14px",
            transition: "all 0.2s ease",
          }}
        >
          <RefreshCw
            size={18}
            style={{
              animation: refreshing ? "spin 1s linear infinite" : "none",
            }}
          />
          Actualizar
        </button>
      </div>

      {/* ========================================
          SECCIÓN 1: MÉTRICAS PRINCIPALES
      ======================================== */}
      <div className="dashboard__metrics-grid">
        <MetricCard
          title="Total Vales"
          value={metricas.totalVales}
          subtitle="Todos los tiempos"
          Icon={FileText}
          color={colors.primary}
        />

        <MetricCard
          title="M³ Totales"
          value={metricas.totalM3}
          subtitle="Material transportado"
          Icon={Truck}
          color={colors.secondary}
        />

        <MetricCard
          title="Horas Renta"
          value={metricas.totalHoras}
          subtitle="Total de horas trabajadas"
          Icon={Clock}
          color="#1A936F"
        />

        <MetricCard
          title="Valor Total"
          value={`$${(metricas.valorTotal / 1000).toFixed(1)}K`}
          subtitle="MXN en vales emitidos"
          Icon={DollarSign}
          color="#F59E0B"
        />
      </div>

      {/* ========================================
          SECCIÓN 2: GRÁFICA DE TENDENCIA
      ======================================== */}
      <div style={{ marginTop: "32px" }}>
        <GraficaTendenciaMensual
          data={tendenciaMensual}
          periodo={periodoTendencia}
          onCambioPeriodo={cambiarPeriodo}
        />
      </div>

      {/* ========================================
          SECCIÓN 3: DISTRIBUCIONES
      ======================================== */}
      <div
        style={{
          marginTop: "32px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Distribución por obras */}
        <GraficaDistribucionObras data={distribucionObras} />

        {/* Distribución por tipo */}
        <GraficaTipoVales data={distribucionTipo} />
      </div>

      {/* ========================================
          SECCIÓN 4: TOP MATERIALES
      ======================================== */}
      <div style={{ marginTop: "32px" }}>
        <GraficaTopMateriales
          data={topMateriales}
          obras={obrasDisponibles}
          obraSeleccionada={obraSeleccionadaMateriales}
          onCambioObra={cambiarObraMateriales}
        />
      </div>

      {/* ========================================
          SECCIÓN 5: CONCILIACIONES RECIENTES
      ======================================== */}
      <div style={{ marginTop: "32px" }}>
        <SeccionConciliaciones />
      </div>
    </div>
  );
};

export default Dashboard;
