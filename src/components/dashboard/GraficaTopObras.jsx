/**
 * src/components/dashboard/GraficaTopObras.jsx
 *
 * Ranking list with progress bars for top obras
 * Dependencias: CSS BEM ranking-list
 * Usado en: Dashboard.jsx
 */

const GraficaTopObras = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <h3 className="chart-card__title">Top Obras</h3>
            <p className="chart-card__subtitle">Por cantidad de vales</p>
          </div>
        </div>
        <div className="chart-card__empty">Sin datos</div>
      </div>
    );
  }

  const maxCantidad = Math.max(...data.map((d) => d.cantidad));

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">Top Obras</h3>
          <p className="chart-card__subtitle">Por cantidad de vales</p>
        </div>
      </div>
      <div className="chart-card__body">
        <ul className="ranking-list">
          {data.map((item, idx) => (
            <li key={item.obra} className="ranking-list__item">
              <div className="ranking-list__rank">{idx + 1}</div>
              <div className="ranking-list__name">{item.obra}</div>
              <div className="ranking-list__count">{item.cantidad}</div>
              <div className="ranking-list__bar-track">
                <div
                  className="ranking-list__bar-fill"
                  style={{ width: `${(item.cantidad / maxCantidad) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default GraficaTopObras;
