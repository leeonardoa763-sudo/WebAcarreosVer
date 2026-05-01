/**
 * src/components/dashboard/GraficaTopBancos.jsx
 *
 * Ranking list with progress bars for top bancos de material
 * Dependencias: CSS BEM ranking-list
 * Usado en: Dashboard.jsx
 */

const GraficaTopBancos = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <h3 className="chart-card__title">Top Bancos</h3>
            <p className="chart-card__subtitle">Por volumen M³</p>
          </div>
        </div>
        <div className="chart-card__empty">Sin datos</div>
      </div>
    );
  }

  const maxM3 = Math.max(...data.map((d) => d.m3Total));

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">Top Bancos</h3>
          <p className="chart-card__subtitle">Por volumen M³</p>
        </div>
      </div>
      <div className="chart-card__body">
        <ul className="ranking-list">
          {data.map((item, idx) => (
            <li key={item.banco} className="ranking-list__item">
              <div className="ranking-list__rank" style={{ background: "var(--db-blue)" }}>
                {idx + 1}
              </div>
              <div className="ranking-list__name">{item.banco}</div>
              <div className="ranking-list__count">{item.m3Total} m³</div>
              <div className="ranking-list__bar-track">
                <div
                  className="ranking-list__bar-fill"
                  style={{
                    width: `${(item.m3Total / maxM3) * 100}%`,
                    background: "linear-gradient(90deg, #004e89 0%, #0066bb 100%)",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default GraficaTopBancos;
