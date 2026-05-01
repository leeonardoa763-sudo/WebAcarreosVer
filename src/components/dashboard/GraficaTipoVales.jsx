/**
 * src/components/dashboard/GraficaTipoVales.jsx
 *
 * Split bar visualization: Material vs Renta
 * Dependencias: CSS BEM
 * Usado en: Dashboard.jsx
 */

const GraficaTipoVales = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <h3 className="chart-card__title">Distribución Tipo</h3>
            <p className="chart-card__subtitle">Material vs Renta</p>
          </div>
        </div>
        <div className="chart-card__empty">Sin datos</div>
      </div>
    );
  }

  const [material, renta] = data;

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">Distribución Tipo</h3>
          <p className="chart-card__subtitle">Material vs Renta</p>
        </div>
      </div>
      <div className="chart-card__body">
        <div className="tipo-split">
          <div className="tipo-split__block tipo-split__block--material">
            <div className="tipo-split__label">Material</div>
            <div className="tipo-split__value">{material.cantidad}</div>
            <div className="tipo-split__pct">{material.porcentaje}%</div>
          </div>
          <div className="tipo-split__block tipo-split__block--renta">
            <div className="tipo-split__label">Renta</div>
            <div className="tipo-split__value">{renta.cantidad}</div>
            <div className="tipo-split__pct">{renta.porcentaje}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraficaTipoVales;
