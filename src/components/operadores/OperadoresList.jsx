/**
 * src/components/operadores/OperadoresList.jsx
 *
 * Lista de vales agrupados por empresa, en tabla plana ordenada por fecha.
 *
 * Estructura:
 * - Empresa (header colapsable con totales)
 * - Tabla de todos sus vales ordenados por fecha descendente
 * - Clic en encabezado de columna ordena asc/desc
 * - Dropdown de filtro por valores únicos en cada columna
 * - Clic en fila expande ValeCard completo inline
 *
 * Dependencias: ValeCard
 * Usado en: pages/Operadores.jsx
 */

// 1. React y hooks
import React, { useState, useMemo, useRef, useEffect } from "react";

// 2. Icons
import {
  ChevronDown,
  ChevronRight,
  Building2,
  ChevronsUpDown,
  ChevronUp,
  Filter,
} from "lucide-react";

// 3. Componentes
import ValeCard from "../vales/ValeCard";

// ─── Constantes ───────────────────────────────────────────────────────────────

const COLUMNAS_MATERIAL = [
  { key: "fecha", label: "Fecha" },
  { key: "folio", label: "Folio" },
  { key: "placas", label: "Placas" },
  { key: "obra", label: "Obra" },
  { key: "operador", label: "Operador" },
  { key: "estado", label: "Estado" },
  { key: "material", label: "Material" },
  { key: "m3", label: "M³", numeric: true },
];

const COLUMNAS_RENTA = [
  { key: "fecha", label: "Fecha" },
  { key: "folio", label: "Folio" },
  { key: "placas", label: "Placas" },
  { key: "obra", label: "Obra" },
  { key: "operador", label: "Operador" },
  { key: "estado", label: "Estado" },
  { key: "dias", label: "Días", numeric: true },
  { key: "horas", label: "Hrs", numeric: true },
];

// ─── Helpers de extracción de valor por columna ───────────────────────────────

const extraerValor = (vale, key, tipoVale) => {
  switch (key) {
    case "fecha":
      return vale.fecha_programada || vale.fecha_creacion || "";
    case "folio":
      return String(vale.folio || "");
    case "placas":
      return vale._placas || "";
    case "obra":
      return vale.obras?.obra || "";
    case "operador":
      return vale.operadores?.nombre_completo || "";
    case "estado":
      return vale.estado || "";
    case "material":
      return vale.vale_material_detalles?.[0]?.material?.material || "";
    case "m3":
      return (vale.vale_material_detalles || []).reduce((sum, d) => {
        const esTipo3 = d.material?.tipo_de_material?.id_tipo_de_material === 3;
        return (
          sum +
          Number(
            esTipo3
              ? d.cantidad_pedida_m3 || d.volumen_real_m3 || 0
              : d.volumen_real_m3 || d.cantidad_pedida_m3 || 0,
          )
        );
      }, 0);
    case "dias":
      return (vale.vale_renta_detalle || []).reduce(
        (sum, d) => sum + Number(d.total_dias || 0),
        0,
      );
    case "horas":
      return (vale.vale_renta_detalle || []).reduce(
        (sum, d) => sum + Number(d.total_horas || 0),
        0,
      );
    default:
      return "";
  }
};

// ─── Componente DropdownFiltro ─────────────────────────────────────────────────

const DropdownFiltro = ({ opciones, valorActivo, onSeleccionar, onCerrar }) => {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onCerrar();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onCerrar]);

  // Estilo base para romper herencia de la tabla
  const estiloOpcion = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "6px 10px",
    minHeight: "30px", // <-- garantiza altura mínima por opción
    background: "transparent",
    border: "none",
    borderRadius: "5px",
    fontSize: "12px",
    lineHeight: "1.4", // <-- evita que el texto se comprima
    color: "#374151",
    cursor: "pointer",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flexShrink: 0, // <-- evita que flex comprima las opciones
  };
  const estiloActivo = {
    ...estiloOpcion,
    background: "#eff6ff",
    color: "#2563eb",
    fontWeight: "600",
  };

  return (
    <div
      className="col-filter__dropdown"
      ref={ref}
      style={{ background: "#ffffff" }}
    >
      <button
        type="button"
        style={!valorActivo ? estiloActivo : estiloOpcion}
        onClick={() => onSeleccionar(null)}
      >
        Todos
      </button>
      {opciones.map((op) => (
        <button
          key={op}
          type="button"
          style={valorActivo === op ? estiloActivo : estiloOpcion}
          onClick={() => onSeleccionar(op)}
        >
          {op || "—"}
        </button>
      ))}
    </div>
  );
};

// ─── Componente TablaEmpresa ───────────────────────────────────────────────────
// Tabla con estado propio de sort y filtros, aislado por empresa.

const TablaEmpresa = ({ valesPlanos, tipoVale, helpers, colorEmpresa }) => {
  const columnas = tipoVale === "material" ? COLUMNAS_MATERIAL : COLUMNAS_RENTA;

  // Sort: { key, dir } — dir: "asc" | "desc"
  const [sort, setSort] = useState({ key: "fecha", dir: "desc" });

  // Filtros activos: { [key]: valor | null }
  const [filtros, setFiltros] = useState({});

  // Dropdown abierto: key de columna o null
  const [dropdownAbierto, setDropdownAbierto] = useState(null);

  // Vales expandidos
  const [valesExpandidos, setValesExpandidos] = useState(new Set());

  // Calcular valores únicos por columna para los dropdowns
  const opcionesPorColumna = useMemo(() => {
    const resultado = {};
    columnas.forEach(({ key, numeric }) => {
      if (numeric) return; // No se filtra en columnas numéricas
      const valores = [
        ...new Set(
          valesPlanos.map((v) => String(extraerValor(v, key, tipoVale))),
        ),
      ].sort();
      resultado[key] = valores;
    });
    return resultado;
  }, [valesPlanos, tipoVale]);

  // Aplicar filtros + sort
  const valesProcesados = useMemo(() => {
    let resultado = [...valesPlanos];

    // Filtrar
    Object.entries(filtros).forEach(([key, valor]) => {
      if (!valor) return;
      resultado = resultado.filter(
        (v) => String(extraerValor(v, key, tipoVale)) === valor,
      );
    });

    // Ordenar
    resultado.sort((a, b) => {
      const col = columnas.find((c) => c.key === sort.key);
      const valA = extraerValor(a, sort.key, tipoVale);
      const valB = extraerValor(b, sort.key, tipoVale);

      let comparacion;
      if (col?.numeric) {
        comparacion = Number(valA) - Number(valB);
      } else {
        comparacion = String(valA).localeCompare(String(valB));
      }

      return sort.dir === "asc" ? comparacion : -comparacion;
    });

    return resultado;
  }, [valesPlanos, filtros, sort]);

  const handleClickColumna = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  const handleAbrirDropdown = (e, key) => {
    e.stopPropagation();
    setDropdownAbierto((prev) => (prev === key ? null : key));
  };

  const handleSeleccionarFiltro = (key, valor) => {
    setFiltros((prev) => ({ ...prev, [key]: valor }));
    setDropdownAbierto(null);
  };

  const toggleVale = (idVale) => {
    setValesExpandidos((prev) => {
      const nuevo = new Set(prev);
      nuevo.has(idVale) ? nuevo.delete(idVale) : nuevo.add(idVale);
      return nuevo;
    });
  };

  const filtrosActivos = Object.values(filtros).some(Boolean);

  if (valesPlanos.length === 0) {
    return <p className="operadores-table__empty">Sin vales registrados</p>;
  }

  return (
    <>
      {/* Indicador de filtros activos */}
      {filtrosActivos && (
        <div className="operadores-table__filtros-activos">
          <Filter size={13} />
          <span>
            Mostrando {valesProcesados.length} de {valesPlanos.length} vales
          </span>
          <button
            type="button"
            className="operadores-table__filtros-limpiar"
            onClick={() => setFiltros({})}
          >
            Limpiar filtros
          </button>
        </div>
      )}

      <table className="operadores-table">
        <thead>
          <tr>
            {columnas.map(({ key, label, numeric }) => {
              const esSortActivo = sort.key === key;
              const filtroActivo = !!filtros[key];
              const tieneDropdown = !numeric;

              return (
                <th
                  key={key}
                  className={`operadores-table__th ${numeric ? "operadores-table__col-num" : ""} ${esSortActivo ? "operadores-table__th--sorted" : ""} ${filtroActivo ? "operadores-table__th--filtered" : ""}`}
                >
                  <div className="operadores-table__th-inner">
                    {/* Botón de sort */}
                    <button
                      type="button"
                      className="operadores-table__sort-btn"
                      onClick={() => handleClickColumna(key)}
                      title={`Ordenar por ${label}`}
                    >
                      <span>{label}</span>
                      <span className="operadores-table__sort-icon">
                        {esSortActivo ? (
                          sort.dir === "asc" ? (
                            <ChevronUp size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          )
                        ) : (
                          <ChevronsUpDown size={13} />
                        )}
                      </span>
                    </button>

                    {/* Botón de filtro (solo columnas no numéricas) */}
                    {tieneDropdown && (
                      <div className="col-filter__wrapper">
                        <button
                          type="button"
                          className={`col-filter__trigger ${filtroActivo ? "col-filter__trigger--active" : ""}`}
                          onClick={(e) => handleAbrirDropdown(e, key)}
                          title={`Filtrar por ${label}`}
                        >
                          <Filter size={11} />
                        </button>

                        {dropdownAbierto === key && (
                          <DropdownFiltro
                            opciones={opcionesPorColumna[key] || []}
                            valorActivo={filtros[key] || null}
                            onSeleccionar={(valor) =>
                              handleSeleccionarFiltro(key, valor)
                            }
                            onCerrar={() => setDropdownAbierto(null)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {valesProcesados.map((vale) => {
            const expandido = valesExpandidos.has(vale.id_vale);
            const fechaRaw = vale.fecha_programada || vale.fecha_creacion || "";
            const fechaStr = fechaRaw
              ? fechaRaw.substring(0, 10).split("-").reverse().join("/")
              : "—";
            const colorEstado = helpers.obtenerColorEstado(vale.estado);
            const etiquetaEstado = helpers.obtenerEtiquetaEstado(vale.estado);
            const nombreMaterial =
              tipoVale === "material"
                ? vale.vale_material_detalles?.[0]?.material?.material || "—"
                : null;

            const totalM3 =
              tipoVale === "material"
                ? Number(extraerValor(vale, "m3", tipoVale).toFixed(2))
                : null;
            const totalDias =
              tipoVale === "renta"
                ? Number(extraerValor(vale, "dias", tipoVale).toFixed(2))
                : null;
            const totalHoras =
              tipoVale === "renta"
                ? Number(extraerValor(vale, "horas", tipoVale).toFixed(2))
                : null;

            return (
              <React.Fragment key={vale.id_vale}>
                <tr
                  className={`operadores-table__row ${expandido ? "operadores-table__row--expanded" : ""}`}
                  onClick={() => toggleVale(vale.id_vale)}
                  aria-expanded={expandido}
                >
                  <td className="operadores-table__fecha">{fechaStr}</td>
                  <td className="operadores-table__folio">{vale.folio}</td>
                  <td className="operadores-table__placas">{vale._placas}</td>
                  <td className="operadores-table__obra">
                    {vale.obras?.obra || "—"}
                  </td>
                  <td className="operadores-table__operador">
                    {vale.operadores?.nombre_completo || "—"}
                  </td>
                  <td>
                    <span
                      className="operadores-table__estado-badge"
                      style={{ color: colorEstado, borderColor: colorEstado }}
                    >
                      {etiquetaEstado}
                    </span>
                  </td>

                  {tipoVale === "material" && (
                    <td className="operadores-table__obra">{nombreMaterial}</td>
                  )}

                  {tipoVale === "material" ? (
                    <td className="operadores-table__col-num">
                      {totalM3 > 0 ? helpers.formatearNumero(totalM3) : "—"}
                    </td>
                  ) : (
                    <>
                      <td className="operadores-table__col-num">
                        {totalDias > 0
                          ? helpers.formatearNumero(totalDias)
                          : "—"}
                      </td>
                      <td className="operadores-table__col-num">
                        {totalHoras > 0
                          ? helpers.formatearNumero(totalHoras)
                          : "—"}
                      </td>
                    </>
                  )}
                </tr>

                {expandido && (
                  <tr className="operadores-table__row-card">
                    <td
                      colSpan={columnas.length}
                      className="operadores-table__card-cell"
                    >
                      <ValeCard vale={vale} empresaColor={colorEmpresa} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

// ─── Componente principal ──────────────────────────────────────────────────────

const OperadoresList = ({
  datos,
  tipoVale,
  toggleGrupo,
  estaColapsado,
  helpers,
}) => {
  const hayDatos = useMemo(() => datos && datos.length > 0, [datos]);

  const aplanarValesEmpresa = (empresa) => {
    const vales = [];
    empresa.vehiculos.forEach((vehiculo) => {
      vehiculo.porEstado.forEach((estadoGrupo) => {
        estadoGrupo.vales.forEach((vale) => {
          vales.push({ ...vale, _placas: vehiculo.placas });
        });
      });
    });
    return vales;
  };

  if (!hayDatos) {
    return (
      <div className="operadores-list-empty">
        <p>No hay datos para mostrar</p>
      </div>
    );
  }

  return (
    <div className="operadores-list">
      {datos.map((empresa) => {
        const empresaId = `empresa-${empresa.id_empresa}`;
        const empresaColapsada = estaColapsado(empresaId);
        const colorEmpresa = helpers.obtenerColorEmpresa(
          empresa.nombre_empresa,
        );
        const valesPlanos = aplanarValesEmpresa(empresa);

        return (
          <div key={empresa.id_empresa} className="empresa-group">
            {/* Header de empresa */}
            <button
              type="button"
              className="empresa-group__header"
              onClick={() => toggleGrupo(empresaId)}
              style={{ borderLeftColor: colorEmpresa, borderLeftWidth: "4px" }}
              aria-expanded={!empresaColapsada}
              aria-controls={`empresa-content-${empresa.id_empresa}`}
            >
              <div className="empresa-group__header-left">
                {empresaColapsada ? (
                  <ChevronRight size={20} aria-hidden="true" />
                ) : (
                  <ChevronDown size={20} aria-hidden="true" />
                )}
                <Building2
                  size={20}
                  aria-hidden="true"
                  style={{ color: colorEmpresa }}
                />
                <span className="empresa-group__nombre">
                  {empresa.nombre_empresa}
                </span>
              </div>

              <div className="empresa-group__header-right">
                <span className="empresa-group__stat">
                  {empresa.totalVehiculos}{" "}
                  {empresa.totalVehiculos === 1 ? "vehículo" : "vehículos"}
                </span>
                <span className="empresa-group__stat">
                  {empresa.totalViajes}{" "}
                  {empresa.totalViajes === 1 ? "viaje" : "viajes"}
                </span>
                {tipoVale === "material" ? (
                  <span className="empresa-group__stat empresa-group__stat--primary">
                    {helpers.formatearNumero(empresa.totalM3)} m³
                  </span>
                ) : (
                  <>
                    <span className="empresa-group__stat">
                      {helpers.formatearNumero(empresa.totalDias)} días
                    </span>
                    <span className="empresa-group__stat empresa-group__stat--primary">
                      {helpers.formatearNumero(empresa.totalHoras)} hrs
                    </span>
                  </>
                )}
              </div>
            </button>

            {/* Tabla de vales */}
            {!empresaColapsada && (
              <div
                id={`empresa-content-${empresa.id_empresa}`}
                className="empresa-group__content"
              >
                <TablaEmpresa
                  valesPlanos={valesPlanos}
                  tipoVale={tipoVale}
                  helpers={helpers}
                  colorEmpresa={colorEmpresa}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OperadoresList;
