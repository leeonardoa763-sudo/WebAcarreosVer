/**
 * src/pages/Dashboard.jsx
 *
 * Dashboard principal con pestañas: Resumen / Materiales / Renta
 * Solo accesible para Administrador
 * Dependencias: useDashboardAnalytics, useMvStats, todos los componentes dashboard
 * Usado en: App.jsx, ruta /dashboard
 */

import { useEffect, useState } from "react";
import {
  FileText,
  Truck,
  Clock,
  DollarSign,
  Receipt,
  BarChart2,
  Package,
  TrendingUp,
} from "lucide-react";

import { colors } from "../config/colors";
import { useAuth } from "../hooks/useAuth";
import { useDashboardAnalytics } from "../hooks/useDashboardAnalytics";
import { useMvStats } from "../hooks/useMvStats";

import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardFilters from "../components/dashboard/DashboardFilters";
import DashboardSkeleton from "../components/dashboard/DashboardSkeleton";
import KpiCard from "../components/dashboard/KpiCard";
import GraficaTendencia from "../components/dashboard/GraficaTendencia";
import GraficaEstados from "../components/dashboard/GraficaEstados";
import CardEstadosDetallado from "../components/dashboard/CardEstadosDetallado";
import GraficaTipoVales from "../components/dashboard/GraficaTipoVales";
import GraficaTopObras from "../components/dashboard/GraficaTopObras";
import GraficaEmpresas from "../components/dashboard/GraficaEmpresas";
import GraficaTopMateriales from "../components/dashboard/GraficaTopMateriales";
import GraficaTopBancos from "../components/dashboard/GraficaTopBancos";
import GraficaEficienciaViajes from "../components/dashboard/GraficaEficienciaViajes";
import TablaMateriales from "../components/dashboard/TablaMateriales";
import GraficaMaterialesMensual from "../components/dashboard/GraficaMaterialesMensual";
import TablaRentaMensual from "../components/dashboard/TablaRentaMensual";

import "../styles/dashboard.css";

const TABS = [
  { id: "resumen", label: "Resumen", icon: BarChart2 },
  { id: "materiales", label: "Materiales", icon: Package },
  { id: "renta", label: "Renta", icon: TrendingUp },
];

const SectionHeader = ({ title, subtitle }) => (
  <div className="dashboard__section-header">
    <h2 className="dashboard__section-title">{title}</h2>
    {subtitle && <p className="dashboard__section-subtitle">{subtitle}</p>}
  </div>
);

const Dashboard = () => {
  const { userProfile } = useAuth();
  const [tabActiva, setTabActiva] = useState("resumen");

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
    hasLoaded,
    error,
    lastUpdated,
    refresh,
  } = useDashboardAnalytics();

  const {
    statsMaterial,
    statsMaterialPorMes,
    statsMaterialPorMesImporte,
    materialesDistintos,
    kpisMaterial,
    statsRenta,
    kpisRenta,
    loading: loadingMv,
    refresh: refreshMv,
  } = useMvStats({ año: filtros.año, idObra: filtros.idObra });

  useEffect(() => {
    document.body.classList.add("dashboard-page");
    return () => document.body.classList.remove("dashboard-page");
  }, []);

  const handleTabChange = (tabId) => setTabActiva(tabId);

  const handleRefreshAll = () => {
    refresh();
    refreshMv();
  };

  // Solo mostrar skeleton en la carga inicial (antes de tener cualquier dato)
  if (!hasLoaded && loading) {
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
        loading={loading || loadingMv}
        onRefresh={handleRefreshAll}
      />

      {/* Filters — siempre visibles, incluso durante recarga */}
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

      {/* Error tras carga inicial */}
      {error && (
        <div style={{ textAlign: "center", padding: "24px", color: "var(--db-text-muted)" }}>
          <p>{error}</p>
          <button
            onClick={handleRefreshAll}
            style={{
              marginTop: "12px",
              padding: "8px 18px",
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
      )}

      {/* Indicador de recarga (no tapa los filtros) */}
      {loading && hasLoaded && (
        <div className="dashboard__reloading-bar" />
      )}

      {/* Tab Navigation */}
      <nav className="dashboard__tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`dashboard__tab-btn ${tabActiva === id ? "dashboard__tab-btn--active" : ""}`}
            onClick={() => handleTabChange(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {/* ── PESTAÑA RESUMEN ── */}
      {tabActiva === "resumen" && (
        <div className="dashboard__tab-content">
          {/* KPI Grid — 5 tarjetas */}
          <div className="dashboard__kpi-grid dashboard__kpi-grid--5">
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
              title="Subtotal"
              value={metricas.valorTotal}
              unit="MXN"
              icon={DollarSign}
              color="#f59e0b"
              comparativa={comparativa?.valorTotal}
              isCurrency
            />
            <KpiCard
              title="Importe + IVA"
              value={metricas.valorConIVA}
              unit="MXN"
              icon={Receipt}
              color="#8b5cf6"
              comparativa={comparativa?.valorConIVA}
              isCurrency
            />
          </div>

          <SectionHeader title="Actividad General" subtitle="Tendencia y distribución por estado" />

          {/* Tendencia + Estados */}
          <div className="dashboard__charts-row">
            <GraficaTendencia data={tendencia} periodo={filtros.periodo} />
            <GraficaEstados data={distribucionEstados} />
          </div>

          {/* Estados Detallado */}
          <div className="dashboard__charts-row">
            <CardEstadosDetallado data={distribucionEstados} />
          </div>

          <SectionHeader title="Distribución" subtitle="Por empresa, tipo de vale y obras más activas" />

          {/* Empresas + Tipo + Top Obras */}
          <div className="dashboard__charts-row-3">
            <GraficaEmpresas data={distribucionEmpresas} />
            <GraficaTipoVales data={distribucionTipo} />
            <GraficaTopObras data={topObras} />
          </div>

          <SectionHeader title="Eficiencia Operativa" subtitle="Top materiales, bancos y distribución horaria de viajes" />

          {/* Top Materiales + Top Bancos + Eficiencia */}
          <div className="dashboard__charts-row-eficiencia">
            <GraficaTopMateriales data={topMateriales} />
            <GraficaTopBancos data={topBancos} />
            <GraficaEficienciaViajes data={eficienciaViajes} />
          </div>
        </div>
      )}

      {/* ── PESTAÑA MATERIALES ── */}
      {tabActiva === "materiales" && (
        <div className="dashboard__tab-content">
          {loadingMv ? (
            <div className="dashboard__mv-loading">Cargando estadísticas de materiales…</div>
          ) : (
            <>
              {/* KPIs de materiales (datos de MV) */}
              <div className="dashboard__kpi-grid dashboard__kpi-grid--4">
                <KpiCard
                  title="M³ Total"
                  value={kpisMaterial.totalM3}
                  unit="m³"
                  icon={Truck}
                  color={colors.accent}
                />
                <KpiCard
                  title="Total Vales"
                  value={kpisMaterial.totalVales}
                  unit="vales"
                  icon={FileText}
                  color={colors.primary}
                />
                <KpiCard
                  title="Total Viajes"
                  value={kpisMaterial.totalViajes}
                  unit="viajes"
                  icon={TrendingUp}
                  color={colors.secondary}
                />
                <KpiCard
                  title="Importe + IVA"
                  value={kpisMaterial.importeIva}
                  unit="MXN"
                  icon={Receipt}
                  color="#8b5cf6"
                  isCurrency
                />
              </div>

              <SectionHeader
                title={`Estadísticas de Material — ${filtros.año}`}
                subtitle="Datos de toda la obra seleccionada. Filtros activos: Año y Obra."
              />

              {/* Tabla resumen por material */}
              <TablaMateriales data={statsMaterial} año={filtros.año} />

              {/* Gráfica apilada mensual */}
              <GraficaMaterialesMensual
                dataPorMes={statsMaterialPorMes}
                dataPorMesImporte={statsMaterialPorMesImporte}
                materiales={materialesDistintos}
                año={filtros.año}
              />
            </>
          )}
        </div>
      )}

      {/* ── PESTAÑA RENTA ── */}
      {tabActiva === "renta" && (
        <div className="dashboard__tab-content">
          {loadingMv ? (
            <div className="dashboard__mv-loading">Cargando estadísticas de renta…</div>
          ) : (
            <>
              {/* KPIs de renta (datos de MV) */}
              <div className="dashboard__kpi-grid dashboard__kpi-grid--4">
                <KpiCard
                  title="Total Vales"
                  value={kpisRenta.totalVales}
                  unit="vales"
                  icon={FileText}
                  color={colors.primary}
                />
                <KpiCard
                  title="Total Horas"
                  value={kpisRenta.totalHoras}
                  unit="hrs"
                  icon={Clock}
                  color={colors.secondary}
                />
                <KpiCard
                  title="Total Días"
                  value={kpisRenta.totalDias}
                  unit="días"
                  icon={BarChart2}
                  color="#f59e0b"
                />
                <KpiCard
                  title="Importe + IVA"
                  value={kpisRenta.importeIva}
                  unit="MXN"
                  icon={Receipt}
                  color="#8b5cf6"
                  isCurrency
                />
              </div>

              <SectionHeader
                title={`Estadísticas de Renta — ${filtros.año}`}
                subtitle="Datos de toda la obra seleccionada. Filtros activos: Año y Obra."
              />

              {/* Tabla mensual de renta */}
              <TablaRentaMensual data={statsRenta} año={filtros.año} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
