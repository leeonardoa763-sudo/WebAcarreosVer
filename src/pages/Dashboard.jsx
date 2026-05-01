/**
 * src/pages/Dashboard.jsx
 *
 * Dashboard principal con filtros completos y analytics avanzados
 * Solo accesible para Administrador
 * Dependencias: useDashboardAnalytics, todos los componentes dashboard
 * Usado en: App.jsx, ruta /dashboard
 */

import { useEffect } from "react";
import { FileText, Truck, Clock, DollarSign } from "lucide-react";

import { colors } from "../config/colors";
import { useAuth } from "../hooks/useAuth";
import { useDashboardAnalytics } from "../hooks/useDashboardAnalytics";

import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardFilters from "../components/dashboard/DashboardFilters";
import DashboardSkeleton from "../components/dashboard/DashboardSkeleton";
import KpiCard from "../components/dashboard/KpiCard";
import GraficaTendencia from "../components/dashboard/GraficaTendencia";
import GraficaEstados from "../components/dashboard/GraficaEstados";
import GraficaTipoVales from "../components/dashboard/GraficaTipoVales";
import GraficaTopObras from "../components/dashboard/GraficaTopObras";
import GraficaEmpresas from "../components/dashboard/GraficaEmpresas";
import GraficaTopMateriales from "../components/dashboard/GraficaTopMateriales";
import GraficaTopBancos from "../components/dashboard/GraficaTopBancos";
import GraficaEficienciaViajes from "../components/dashboard/GraficaEficienciaViajes";

import "../styles/dashboard.css";

const Dashboard = () => {
  const { userProfile } = useAuth();
  const {
    filtros,
    setPeriodo,
    setAño,
    setTrimestre,
    setIdEmpresa,
    setIdSindicato,
    setIdBanco,
    setIdObra,
    setIdMaterial,
    setTipoVale,
    resetFiltros,
    catalogos,
    loadingCatalogos,
    metricas,
    comparativa,
    distribucionEstados,
    distribucionTipo,
    distribucionEmpresas,
    topObras,
    topMateriales,
    topBancos,
    eficienciaViajes,
    tendencia,
    loading,
    error,
    lastUpdated,
    refresh,
  } = useDashboardAnalytics();

  // Dark theme toggle on mount
  useEffect(() => {
    document.body.classList.add("dashboard-page");
    return () => document.body.classList.remove("dashboard-page");
  }, []);

  // Error state
  if (error && loading) {
    return (
      <div className="dashboard">
        <div style={{textAlign: "center", padding: "40px", color: "var(--db-text-muted)"}}>
          <p>{error}</p>
          <button
            onClick={refresh}
            style={{
              marginTop: "16px",
              padding: "10px 20px",
              background: "var(--db-orange)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Skeleton loading on first load only
  if (loading) {
    return (
      <div className="dashboard">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <DashboardHeader
        userProfile={userProfile}
        lastUpdated={lastUpdated}
        loading={loading}
        onRefresh={refresh}
      />

      {/* Filters */}
      <DashboardFilters
        filtros={filtros}
        catalogos={catalogos}
        onChangePeriodo={setPeriodo}
        onChangeAño={setAño}
        onChangeTrimestre={setTrimestre}
        onChangeEmpresa={setIdEmpresa}
        onChangeSindicato={setIdSindicato}
        onChangeBanco={setIdBanco}
        onChangeObra={setIdObra}
        onChangeMaterial={setIdMaterial}
        onChangeTipo={setTipoVale}
        onReset={resetFiltros}
      />

      {/* KPI Cards Grid */}
      <div className="dashboard__kpi-grid">
        <KpiCard
          title="Total Vales"
          value={metricas.totalVales}
          unit="vales"
          icon={FileText}
          color={colors.primary}
          comparativa={comparativa?.totalVales}
        />
        <KpiCard
          title="Volumen"
          value={metricas.totalM3}
          unit="m³"
          icon={Truck}
          color={colors.accent}
          comparativa={comparativa?.totalM3}
        />
        <KpiCard
          title="Horas Renta"
          value={metricas.totalHoras}
          unit="hrs"
          icon={Clock}
          color={colors.secondary}
          comparativa={comparativa?.totalHoras}
        />
        <KpiCard
          title="Valor Total"
          value={`$${metricas.valorTotal.toLocaleString("es-MX")}`}
          unit="MXN"
          icon={DollarSign}
          color="#f59e0b"
          comparativa={comparativa?.valorTotal}
        />
      </div>

      {/* Tendencia + Estados */}
      <div className="dashboard__charts-row">
        <GraficaTendencia data={tendencia} periodo={filtros.periodo} />
        <GraficaEstados data={distribucionEstados} />
      </div>

      {/* Empresas + Tipo + Top Obras */}
      <div className="dashboard__charts-row-3">
        <GraficaEmpresas data={distribucionEmpresas} />
        <GraficaTipoVales data={distribucionTipo} />
        <GraficaTopObras data={topObras} />
      </div>

      {/* Top Materiales + Top Bancos + Eficiencia */}
      <div className="dashboard__charts-row-eficiencia">
        <GraficaTopMateriales data={topMateriales} />
        <GraficaTopBancos data={topBancos} />
        <GraficaEficienciaViajes data={eficienciaViajes} />
      </div>
    </div>
  );
};

export default Dashboard;
