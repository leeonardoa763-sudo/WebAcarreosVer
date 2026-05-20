/**
 * src/components/dashboard/TablaRentaMensual.jsx
 *
 * Tabla mensual de renta con datos de mv_stats_renta.
 * Columnas: Mes | Vales | Horas | Días | Importe + IVA
 * Dependencias: ninguna externa
 * Usado en: Dashboard.jsx (pestaña Renta)
 */

const fmt = (n) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

const fmtNum = (n, dec = 1) =>
  n.toLocaleString("es-MX", { maximumFractionDigits: dec });

const TablaRentaMensual = ({ data, año }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <h3 className="chart-card__title">Resumen Mensual de Renta</h3>
            <p className="chart-card__subtitle">Año {año}</p>
          </div>
        </div>
        <div className="chart-card__empty">Sin datos para el período seleccionado</div>
      </div>
    );
  }

  const mesesConDatos = data.filter((r) => r.total_vales > 0);

  const totales = {
    total_vales: data.reduce((s, r) => s + r.total_vales, 0),
    total_horas: data.reduce((s, r) => s + r.total_horas, 0),
    total_dias: data.reduce((s, r) => s + r.total_dias, 0),
    importe_iva: data.reduce((s, r) => s + r.importe_iva, 0),
  };

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">Resumen Mensual de Renta</h3>
          <p className="chart-card__subtitle">Año {año} · {mesesConDatos.length} meses con actividad</p>
        </div>
      </div>
      <div className="chart-card__body" style={{ overflowX: "auto" }}>
        <table className="mv-table">
          <thead>
            <tr>
              <th className="mv-table__th" style={{ textAlign: "left" }}>Mes</th>
              <th className="mv-table__th">Vales</th>
              <th className="mv-table__th">Horas</th>
              <th className="mv-table__th">Días</th>
              <th className="mv-table__th">Importe + IVA</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.mes}
                className={[
                  i % 2 === 0 ? "mv-table__row--even" : "",
                  row.total_vales === 0 ? "mv-table__row--empty" : "",
                ]
                  .join(" ")
                  .trim()}
              >
                <td className="mv-table__td mv-table__td--name">{row.mes}</td>
                <td className="mv-table__td mv-table__td--num">
                  {row.total_vales === 0 ? "—" : row.total_vales.toLocaleString("es-MX")}
                </td>
                <td className="mv-table__td mv-table__td--num">
                  {row.total_horas === 0 ? "—" : `${fmtNum(row.total_horas)} h`}
                </td>
                <td className="mv-table__td mv-table__td--num">
                  {row.total_dias === 0 ? "—" : `${fmtNum(row.total_dias)} d`}
                </td>
                <td className="mv-table__td mv-table__td--money">
                  {row.importe_iva === 0 ? "—" : fmt(row.importe_iva)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="mv-table__totals">
              <td className="mv-table__td mv-table__td--name">Total</td>
              <td className="mv-table__td mv-table__td--num">{totales.total_vales.toLocaleString("es-MX")}</td>
              <td className="mv-table__td mv-table__td--num">{fmtNum(totales.total_horas)} h</td>
              <td className="mv-table__td mv-table__td--num">{fmtNum(totales.total_dias)} d</td>
              <td className="mv-table__td mv-table__td--money">{fmt(totales.importe_iva)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default TablaRentaMensual;
