/**
 * src/components/dashboard/CardEstadosDetallado.jsx
 *
 * Card detallada que muestra tabla con distribución exacta de vales por estado
 * Útil para diagnosticar problemas de conteo
 * Dependencias: none
 * Usado en: Dashboard.jsx
 */

const CardEstadosDetallado = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card__header">
          <h3 className="chart-card__title">Desglose por Estado</h3>
          <p className="chart-card__subtitle">Vales detallados por estado</p>
        </div>
        <div className="chart-card__empty">Sin datos</div>
      </div>
    );
  }

  const totalVales = data.reduce((sum, item) => sum + item.cantidad, 0);
  const totalM3 = data.reduce((sum, item) => sum + item.m3Total, 0);

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h3 className="chart-card__title">Desglose por Estado</h3>
        <p className="chart-card__subtitle">
          {totalVales.toLocaleString("es-MX")} vales • {Math.round(totalM3).toLocaleString("es-MX")} m³
        </p>
      </div>
      <div className="chart-card__body">
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <th
                  style={{
                    padding: "8px 4px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "rgba(240, 244, 248, 0.7)",
                  }}
                >
                  Estado
                </th>
                <th
                  style={{
                    padding: "8px 4px",
                    textAlign: "right",
                    fontWeight: 600,
                    color: "rgba(240, 244, 248, 0.7)",
                  }}
                >
                  Vales
                </th>
                <th
                  style={{
                    padding: "8px 4px",
                    textAlign: "right",
                    fontWeight: 600,
                    color: "rgba(240, 244, 248, 0.7)",
                  }}
                >
                  m³ Total
                </th>
                <th
                  style={{
                    padding: "8px 4px",
                    textAlign: "right",
                    fontWeight: 600,
                    color: "rgba(240, 244, 248, 0.7)",
                  }}
                >
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr
                  key={item.estado}
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    background: "rgba(255, 255, 255, 0.01)",
                  }}
                >
                  <td style={{ padding: "8px 4px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          width: "10px",
                          height: "10px",
                          background: item.color,
                          borderRadius: "2px",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 500 }}>{item.label}</span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "8px 4px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: item.color,
                    }}
                  >
                    {item.cantidad.toLocaleString("es-MX")}
                  </td>
                  <td
                    style={{
                      padding: "8px 4px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: item.color,
                    }}
                  >
                    {Math.round(item.m3Total).toLocaleString("es-MX")} m³
                  </td>
                  <td
                    style={{
                      padding: "8px 4px",
                      textAlign: "right",
                      color: "rgba(240, 244, 248, 0.6)",
                    }}
                  >
                    {Math.round((item.m3Total / totalM3) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CardEstadosDetallado;
