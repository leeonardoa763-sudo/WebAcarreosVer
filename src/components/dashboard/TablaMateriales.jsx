/**
 * src/components/dashboard/TablaMateriales.jsx
 *
 * Tabla resumen por material con datos de mv_stats_material.
 * Columnas: Material | M³ Total | Vales | Viajes | Importe + IVA
 * Soporta ordenamiento por columna y muestra fila de totales.
 * Dependencias: lucide-react
 * Usado en: Dashboard.jsx (pestaña Materiales)
 */

import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const fmt = (n) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

const fmtNum = (n, dec = 2) => n.toLocaleString("es-MX", { maximumFractionDigits: dec });

const TablaMateriales = ({ data, año }) => {
  const [sortCol, setSortCol] = useState("m3_total");
  const [sortDir, setSortDir] = useState("desc");

  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <h3 className="chart-card__title">Resumen por Material</h3>
            <p className="chart-card__subtitle">Año {año}</p>
          </div>
        </div>
        <div className="chart-card__empty">Sin datos para el período seleccionado</div>
      </div>
    );
  }

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const sorted = [...data].sort((a, b) => {
    const va = a[sortCol];
    const vb = b[sortCol];
    if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === "asc" ? va - vb : vb - va;
  });

  const totales = {
    m3_total: data.reduce((s, r) => s + r.m3_total, 0),
    total_vales: data.reduce((s, r) => s + r.total_vales, 0),
    total_viajes: data.reduce((s, r) => s + r.total_viajes, 0),
    importe_iva: data.reduce((s, r) => s + r.importe_iva, 0),
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ArrowUpDown size={13} style={{ opacity: 0.4 }} />;
    return sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
  };

  const TH = ({ col, children, align = "right" }) => (
    <th
      className="mv-table__th mv-table__sortable"
      style={{ textAlign: align, cursor: "pointer" }}
      onClick={() => handleSort(col)}
    >
      <span className="mv-table__th-inner">
        {children}
        <SortIcon col={col} />
      </span>
    </th>
  );

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">Resumen por Material</h3>
          <p className="chart-card__subtitle">Acumulado año {año} · {data.length} materiales</p>
        </div>
      </div>
      <div className="chart-card__body" style={{ overflowX: "auto" }}>
        <table className="mv-table">
          <thead>
            <tr>
              <TH col="nombre_material" align="left">Material</TH>
              <TH col="m3_total">M³ Total</TH>
              <TH col="total_vales">Vales</TH>
              <TH col="total_viajes">Viajes</TH>
              <TH col="importe_iva">Importe + IVA</TH>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.nombre_material} className={i % 2 === 0 ? "mv-table__row--even" : ""}>
                <td className="mv-table__td mv-table__td--name">{row.nombre_material}</td>
                <td className="mv-table__td mv-table__td--num">{fmtNum(row.m3_total)} m³</td>
                <td className="mv-table__td mv-table__td--num">{row.total_vales.toLocaleString("es-MX")}</td>
                <td className="mv-table__td mv-table__td--num">{row.total_viajes.toLocaleString("es-MX")}</td>
                <td className="mv-table__td mv-table__td--money">{fmt(row.importe_iva)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="mv-table__totals">
              <td className="mv-table__td mv-table__td--name">Total</td>
              <td className="mv-table__td mv-table__td--num">{fmtNum(totales.m3_total)} m³</td>
              <td className="mv-table__td mv-table__td--num">{totales.total_vales.toLocaleString("es-MX")}</td>
              <td className="mv-table__td mv-table__td--num">{totales.total_viajes.toLocaleString("es-MX")}</td>
              <td className="mv-table__td mv-table__td--money">{fmt(totales.importe_iva)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default TablaMateriales;
