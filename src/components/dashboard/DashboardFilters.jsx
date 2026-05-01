/**
 * src/components/dashboard/DashboardFilters.jsx
 *
 * Filter bar with period selector and catalog filters
 * Dependencias: catalogos, filtros, onChange handlers
 * Usado en: Dashboard.jsx
 */

const DashboardFilters = ({
  filtros,
  catalogos,
  onChangePeriodo,
  onChangeAño,
  onChangeTrimestre,
  onChangeEmpresa,
  onChangeSindicato,
  onChangeBanco,
  onChangeObra,
  onChangeMaterial,
  onChangeTipo,
  onReset,
}) => {
  const activeFilterCount = [
    filtros.trimestre,
    filtros.idEmpresa,
    filtros.idSindicato,
    filtros.idBanco,
    filtros.idObra,
    filtros.idMaterial,
    filtros.tipoVale,
  ].filter(Boolean).length;

  const periods = [
    { value: "hoy", label: "Hoy" },
    { value: "ayer", label: "Ayer" },
    { value: "semana", label: "Semana" },
    { value: "mes", label: "Mensual" },
    { value: "año", label: "Anual" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="dashboard-filters">
      <div className="dashboard-filters__content">
        {/* Period pills */}
        <div className="dashboard-filters__periods">
          {periods.map((p) => (
            <button
              key={p.value}
              className={`dashboard-filters__pill ${
                filtros.periodo === p.value ? "dashboard-filters__pill--active" : ""
              }`}
              onClick={() => {
                onChangePeriodo(p.value);
                onChangeTrimestre(null);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Year and Trimester selectors */}
        <div className="dashboard-filters__date-selectors">
          <div className="dashboard-filters__select-group">
            <label className="dashboard-filters__select-label">Año</label>
            <select
              className="dashboard-filters__select"
              value={filtros.año || currentYear}
              onChange={(e) => onChangeAño(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="dashboard-filters__select-group">
            <label className="dashboard-filters__select-label">Trimestre</label>
            <select
              className="dashboard-filters__select"
              value={filtros.trimestre || ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                onChangeTrimestre(val);
              }}
            >
              <option value="">Ninguno</option>
              <option value="1">Q1 (Ene-Mar)</option>
              <option value="2">Q2 (Abr-Jun)</option>
              <option value="3">Q3 (Jul-Sep)</option>
              <option value="4">Q4 (Oct-Dic)</option>
            </select>
          </div>
        </div>

        {/* Filter selects */}
        <div className="dashboard-filters__selects">
          <div className="dashboard-filters__select-group">
            <label className="dashboard-filters__select-label">Empresa</label>
            <select
              className="dashboard-filters__select"
              value={filtros.idEmpresa || ""}
              onChange={(e) => onChangeEmpresa(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Todas</option>
              {catalogos.empresas?.map((e) => (
                <option key={e.id_empresa} value={e.id_empresa}>
                  {e.empresa}
                </option>
              ))}
            </select>
          </div>

          <div className="dashboard-filters__select-group">
            <label className="dashboard-filters__select-label">Sindicato</label>
            <select
              className="dashboard-filters__select"
              value={filtros.idSindicato || ""}
              onChange={(e) => onChangeSindicato(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Todos</option>
              {catalogos.sindicatos?.map((s) => (
                <option key={s.id_sindicato} value={s.id_sindicato}>
                  {s.sindicato}
                </option>
              ))}
            </select>
          </div>

          <div className="dashboard-filters__select-group">
            <label className="dashboard-filters__select-label">Banco Material</label>
            <select
              className="dashboard-filters__select"
              value={filtros.idBanco || ""}
              onChange={(e) => onChangeBanco(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Todos</option>
              {catalogos.bancos?.map((b) => (
                <option key={b.id_banco} value={b.id_banco}>
                  {b.banco}
                </option>
              ))}
            </select>
          </div>

          <div className="dashboard-filters__select-group">
            <label className="dashboard-filters__select-label">Material</label>
            <select
              className="dashboard-filters__select"
              value={filtros.idMaterial || ""}
              onChange={(e) => onChangeMaterial(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Todos</option>
              {catalogos.materiales?.map((m) => (
                <option key={m.id_material} value={m.id_material}>
                  {m.material}
                </option>
              ))}
            </select>
          </div>

          <div className="dashboard-filters__select-group">
            <label className="dashboard-filters__select-label">Obra</label>
            <select
              className="dashboard-filters__select"
              value={filtros.idObra || ""}
              onChange={(e) => onChangeObra(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Todas</option>
              {catalogos.obras?.map((o) => (
                <option key={o.id_obra} value={o.id_obra}>
                  {o.obra}
                </option>
              ))}
            </select>
          </div>

          <div className="dashboard-filters__select-group">
            <label className="dashboard-filters__select-label">Tipo Vale</label>
            <select
              className="dashboard-filters__select"
              value={filtros.tipoVale || ""}
              onChange={(e) => onChangeTipo(e.target.value || null)}
            >
              <option value="">Todos</option>
              <option value="material">Material</option>
              <option value="renta">Renta</option>
            </select>
          </div>

          {activeFilterCount > 0 && (
            <div className="dashboard-filters__actions">
              <div className="dashboard-filters__badge">
                <span>{activeFilterCount}</span>
              </div>
              <button className="dashboard-filters__reset" onClick={onReset}>
                Limpiar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
