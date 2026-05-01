/**
 * src/components/dashboard/DashboardSkeleton.jsx
 *
 * Loading skeleton placeholder matching dashboard layout
 * Dependencias: CSS animations
 * Usado en: Dashboard.jsx
 */

const DashboardSkeleton = () => {
  return (
    <div className="dashboard-skeleton">
      {/* Header skeleton */}
      <div className="skeleton-block" style={{ height: "100px", marginBottom: "20px" }} />

      {/* Filters skeleton */}
      <div className="skeleton-block" style={{ height: "80px", marginBottom: "20px" }} />

      {/* KPI Grid */}
      <div className="skeleton-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-grid__item skeleton-block" />
        ))}
      </div>

      {/* Charts row 1 (Tendencia + Estados) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div className="skeleton-chart skeleton-block" />
        <div className="skeleton-chart skeleton-block" />
      </div>

      {/* Charts row 2 (Empresas + Tipo + Top Obras) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div className="skeleton-chart skeleton-block" />
        <div className="skeleton-chart skeleton-block" />
        <div className="skeleton-chart skeleton-block" />
      </div>

      {/* Charts row 3 (Top Materiales + Top Bancos + Eficiencia) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "20px" }}>
        <div className="skeleton-chart skeleton-block" />
        <div className="skeleton-chart skeleton-block" />
        <div className="skeleton-chart skeleton-block" />
      </div>
    </div>
  );
};

export default DashboardSkeleton;
