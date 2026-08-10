/**
 * src/components/conciliaciones/TablaContabilidad.jsx
 *
 * Tabla de conciliaciones para contabilidad con soporte de renta y material.
 * Incluye buscador, sub-tabs, badges de estado y botón de pago para admin.
 *
 * Dependencias: useContabilidad, ModalPagarConciliacion, ModalVistaPreviewConciliacion
 * Usado en: Conciliaciones.jsx
 */

import { useEffect, useMemo, useState } from 'react';
import { Eye, DollarSign, Loader2, Edit2, CheckCircle2, X } from 'lucide-react';
import { colors } from '../../config/colors';
import { useAuth } from '../../hooks/useAuth';
import { useContabilidad } from '../../hooks/conciliaciones/useContabilidad';
import ModalPagarConciliacion from './ModalPagarConciliacion';
import ModalVistaPreviewConciliacion from '../dashboard/ModalVistaPreviewConciliacion';
import '../../styles/contabilidad.css';

const FILTROS_INICIALES = {
  empresa: '',
  mes: '',
  semana: '',
  material: '',
  estado: '',
  factura: '',
  oc: '',
  proveedor: '',
};

const TablaContabilidad = () => {
  const { userProfile } = useAuth();
  const esAdmin = userProfile?.roles?.role === 'Administrador';
  const { fetchConciliacionesContabilidad } = useContabilidad();

  const [subTabActivo, setSubTabActivo] = useState('renta');
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [buscador, setBuscador] = useState('');
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);

  const [conciliacionSeleccionada, setConciliacionSeleccionada] = useState(null);
  const [modalVistaPrevia, setModalVistaPrevia] = useState(false);

  const [conciliacionPago, setConciliacionPago] = useState(null);
  const [modalPago, setModalPago] = useState(false);

  const [conciliacionEdicion, setConciliacionEdicion] = useState(null);
  const [modalEdicion, setModalEdicion] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setError(null);
      const result = await fetchConciliacionesContabilidad(subTabActivo);

      if (result.success) {
        setDatos(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };

    cargarDatos();
  }, [subTabActivo, fetchConciliacionesContabilidad]);

  useEffect(() => {
    setBuscador('');
    setFiltros(FILTROS_INICIALES);
  }, [subTabActivo]);

  const formatearMes = (fecha) => {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  // Filas con campos ya resueltos para mostrar y filtrar (evita recalcular en cada render)
  const filasBase = useMemo(() => {
    return datos.map((c) => {
      const empresa = c.obras?.empresas?.empresa || '—';
      const mes = formatearMes(c.fecha_inicio);
      const material =
        subTabActivo === 'renta' ? 'Renta de material' : c.nombreMaterial || '—';
      const volumenTexto =
        subTabActivo === 'renta'
          ? `${c.total_dias ?? 0} días`
          : `${(c.totalVolumenM3 ?? 0).toFixed(2)} m³`;
      const estado = c.estado || 'generada';

      return {
        ...c,
        _empresa: empresa,
        _mes: mes,
        _semana: c.numero_semana,
        _material: material,
        _volumenTexto: volumenTexto,
        _estado: estado,
        _factura: c.numero_factura || '',
        _oc: c.numero_orden_compra || '',
        _proveedor: c.nombre_proveedor || '',
      };
    });
  }, [datos, subTabActivo]);

  // Opciones únicas para los selects de filtro por columna
  const opcionesFiltro = useMemo(() => {
    const unicos = (valores) =>
      Array.from(new Set(valores.filter((v) => v !== undefined && v !== null && v !== '')))
        .sort((a, b) => String(a).localeCompare(String(b), 'es'));

    return {
      empresas: unicos(filasBase.map((f) => f._empresa)),
      meses: unicos(filasBase.map((f) => f._mes)),
      semanas: unicos(filasBase.map((f) => f._semana)).sort((a, b) => a - b),
      materiales: unicos(filasBase.map((f) => f._material)),
      estados: unicos(filasBase.map((f) => f._estado)),
    };
  }, [filasBase]);

  const hayFiltrosActivos =
    buscador !== '' || Object.values(filtros).some((v) => v !== '');

  const handleFiltroChange = (campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleLimpiarFiltros = () => {
    setBuscador('');
    setFiltros(FILTROS_INICIALES);
  };

  const datosFiltrodos = filasBase.filter((c) => {
    const busqueda = buscador.toLowerCase();
    const coincideBusqueda =
      !busqueda ||
      c.folio?.toLowerCase().includes(busqueda) ||
      c._empresa.toLowerCase().includes(busqueda) ||
      c.obras?.obra?.toLowerCase().includes(busqueda) ||
      c._factura.toLowerCase().includes(busqueda) ||
      c._oc.toLowerCase().includes(busqueda);

    const coincideColumnas =
      (!filtros.empresa || c._empresa === filtros.empresa) &&
      (!filtros.mes || c._mes === filtros.mes) &&
      (!filtros.semana || String(c._semana) === filtros.semana) &&
      (!filtros.material || c._material === filtros.material) &&
      (!filtros.estado || c._estado === filtros.estado) &&
      (!filtros.factura || c._factura.toLowerCase().includes(filtros.factura.toLowerCase())) &&
      (!filtros.oc || c._oc.toLowerCase().includes(filtros.oc.toLowerCase())) &&
      (!filtros.proveedor ||
        c._proveedor.toLowerCase().includes(filtros.proveedor.toLowerCase()));

    return coincideBusqueda && coincideColumnas;
  });

  const getEstadoBadge = (estado) => {
    const estadoLower = estado?.toLowerCase() || '';
    let bgColor = '#e5e7eb';
    let textColor = '#374151';

    if (estadoLower === 'pagada') {
      bgColor = '#d1fae5';
      textColor = '#047857';
    } else if (estadoLower === 'conciliada') {
      bgColor = '#dbeafe';
      textColor = '#1e40af';
    } else if (estadoLower === 'generada') {
      bgColor = '#f3e8ff';
      textColor = '#7c3aed';
    }

    return (
      <span
        className="ctb-badge"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {estado?.charAt(0).toUpperCase() + estado?.slice(1).toLowerCase()}
      </span>
    );
  };

  const handleAbrirVistaPrevia = (conciliacion) => {
    setConciliacionSeleccionada(conciliacion);
    setModalVistaPrevia(true);
  };

  const handleAbrirModalPago = (conciliacion) => {
    setConciliacionPago(conciliacion);
    setModalPago(true);
  };

  const handleAbrirModalEdicion = (conciliacion) => {
    setConciliacionEdicion(conciliacion);
    setModalEdicion(true);
  };

  const handlePagada = (idConciliacion, datoPago = {}) => {
    setDatos((prev) =>
      prev.map((c) =>
        c.id_conciliacion === idConciliacion
          ? {
              ...c,
              estado: 'pagada',
              numero_factura: datoPago.numero_factura || c.numero_factura,
              numero_orden_compra: datoPago.numero_orden_compra || c.numero_orden_compra,
              nombre_proveedor: datoPago.nombre_proveedor || c.nombre_proveedor,
            }
          : c
      )
    );
  };

  const handleEditada = (idConciliacion, datoEdicion = {}) => {
    setDatos((prev) =>
      prev.map((c) =>
        c.id_conciliacion === idConciliacion
          ? {
              ...c,
              numero_factura: datoEdicion.numero_factura || c.numero_factura,
              numero_orden_compra: datoEdicion.numero_orden_compra || c.numero_orden_compra,
              nombre_proveedor: datoEdicion.nombre_proveedor || c.nombre_proveedor,
            }
          : c
      )
    );
  };

  return (
    <div className="ctb-container">
      {/* Sub-tabs */}
      <div className="ctb-subtabs">
        <button
          className={`ctb-subtab ${subTabActivo === 'renta' ? 'ctb-subtab--active' : ''}`}
          onClick={() => setSubTabActivo('renta')}
          style={{
            backgroundColor: subTabActivo === 'renta' ? colors.secondary : 'transparent',
            color: subTabActivo === 'renta' ? 'white' : colors.textSecondary,
          }}
        >
          Renta
        </button>
        <button
          className={`ctb-subtab ${subTabActivo === 'material' ? 'ctb-subtab--active' : ''}`}
          onClick={() => setSubTabActivo('material')}
          style={{
            backgroundColor: subTabActivo === 'material' ? colors.primary : 'transparent',
            color: subTabActivo === 'material' ? 'white' : colors.textSecondary,
          }}
        >
          Material
        </button>
      </div>

      {/* Buscador */}
      <div className="ctb-buscador">
        <input
          type="text"
          className="ctb-input-busqueda"
          placeholder="Buscar por folio, empresa, obra, factura u OC..."
          value={buscador}
          onChange={(e) => setBuscador(e.target.value)}
        />
        {hayFiltrosActivos && (
          <button
            type="button"
            className="ctb-btn-limpiar"
            onClick={handleLimpiarFiltros}
          >
            <X size={14} />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Error */}
      {error && <div className="ctb-error">{error}</div>}

      {/* Loading */}
      {loading && (
        <div className="ctb-loading">
          <Loader2 size={24} className="ctb-spinner" />
          <p>Cargando conciliaciones...</p>
        </div>
      )}

      {/* Tabla */}
      {!loading && datosFiltrodos.length > 0 && (
        <div className="ctb-tabla-container">
          <table className="ctb-tabla">
            <thead>
              <tr>
                <th>Código</th>
                <th>Empresa</th>
                <th>Mes</th>
                <th>Semana</th>
                <th>Material</th>
                <th>Vol</th>
                <th>Importe sin IVA</th>
                <th>Importe Total</th>
                <th>Estado</th>
                <th>Factura</th>
                <th>OC</th>
                <th>Proveedor</th>
                <th>Acciones</th>
              </tr>
              <tr className="ctb-fila-filtros">
                <th></th>
                <th>
                  <select
                    className="ctb-select-filtro"
                    value={filtros.empresa}
                    onChange={(e) => handleFiltroChange('empresa', e.target.value)}
                  >
                    <option value="">Todas</option>
                    {opcionesFiltro.empresas.map((valor) => (
                      <option key={valor} value={valor}>
                        {valor}
                      </option>
                    ))}
                  </select>
                </th>
                <th>
                  <select
                    className="ctb-select-filtro"
                    value={filtros.mes}
                    onChange={(e) => handleFiltroChange('mes', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {opcionesFiltro.meses.map((valor) => (
                      <option key={valor} value={valor}>
                        {valor}
                      </option>
                    ))}
                  </select>
                </th>
                <th>
                  <select
                    className="ctb-select-filtro"
                    value={filtros.semana}
                    onChange={(e) => handleFiltroChange('semana', e.target.value)}
                  >
                    <option value="">Todas</option>
                    {opcionesFiltro.semanas.map((valor) => (
                      <option key={valor} value={String(valor)}>
                        {valor}
                      </option>
                    ))}
                  </select>
                </th>
                <th>
                  <select
                    className="ctb-select-filtro"
                    value={filtros.material}
                    onChange={(e) => handleFiltroChange('material', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {opcionesFiltro.materiales.map((valor) => (
                      <option key={valor} value={valor}>
                        {valor}
                      </option>
                    ))}
                  </select>
                </th>
                <th></th>
                <th></th>
                <th></th>
                <th>
                  <select
                    className="ctb-select-filtro"
                    value={filtros.estado}
                    onChange={(e) => handleFiltroChange('estado', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {opcionesFiltro.estados.map((valor) => (
                      <option key={valor} value={valor}>
                        {valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </th>
                <th>
                  <input
                    type="text"
                    className="ctb-input-filtro"
                    placeholder="Filtrar..."
                    value={filtros.factura}
                    onChange={(e) => handleFiltroChange('factura', e.target.value)}
                  />
                </th>
                <th>
                  <input
                    type="text"
                    className="ctb-input-filtro"
                    placeholder="Filtrar..."
                    value={filtros.oc}
                    onChange={(e) => handleFiltroChange('oc', e.target.value)}
                  />
                </th>
                <th>
                  <input
                    type="text"
                    className="ctb-input-filtro"
                    placeholder="Filtrar..."
                    value={filtros.proveedor}
                    onChange={(e) => handleFiltroChange('proveedor', e.target.value)}
                  />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {datosFiltrodos.map((conciliacion) => {
                const importeSinIva = (conciliacion.subtotal ?? 0).toLocaleString(
                  'es-MX',
                  { style: 'currency', currency: 'MXN' }
                );
                const importeTotal = (conciliacion.total_final ?? 0).toLocaleString(
                  'es-MX',
                  { style: 'currency', currency: 'MXN' }
                );
                const estado = conciliacion._estado;

                const puedeSerPagada = esAdmin && estado !== 'pagada';
                const puedeSerEditada = esAdmin && estado === 'pagada';

                return (
                  <tr key={conciliacion.id_conciliacion} className="ctb-fila">
                    <td className="ctb-codigo">{conciliacion.folio}</td>
                    <td>{conciliacion._empresa}</td>
                    <td>{conciliacion._mes}</td>
                    <td className="ctb-semana">{conciliacion._semana}</td>
                    <td>{conciliacion._material}</td>
                    <td className="ctb-volumen">{conciliacion._volumenTexto}</td>
                    <td className="ctb-importe">{importeSinIva}</td>
                    <td className="ctb-importe-total">{importeTotal}</td>
                    <td>
                      {getEstadoBadge(estado)}
                      {conciliacion.verificado && (
                        <CheckCircle2
                          size={16}
                          color={colors.accent}
                          style={{ marginLeft: 6, verticalAlign: 'middle' }}
                          title="Verificada"
                        />
                      )}
                    </td>
                    <td className="ctb-factura">{conciliacion._factura || '—'}</td>
                    <td className="ctb-oc">{conciliacion._oc || '—'}</td>
                    <td className="ctb-proveedor">{conciliacion._proveedor || '—'}</td>
                    <td className="ctb-acciones">
                      <button
                        className="ctb-btn-icon"
                        title="Ver detalles"
                        onClick={() => handleAbrirVistaPrevia(conciliacion)}
                      >
                        <Eye size={18} />
                      </button>
                      {puedeSerPagada && (
                        <button
                          className="ctb-btn-icon ctb-btn-pagar"
                          title="Registrar pago"
                          onClick={() => handleAbrirModalPago(conciliacion)}
                        >
                          <DollarSign size={18} />
                        </button>
                      )}
                      {puedeSerEditada && (
                        <button
                          className="ctb-btn-icon ctb-btn-editar"
                          title="Editar pago"
                          onClick={() => handleAbrirModalEdicion(conciliacion)}
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sin datos */}
      {!loading && datosFiltrodos.length === 0 && (
        <div className="ctb-vacio">
          <p>
            {datos.length === 0
              ? 'No hay conciliaciones registradas'
              : 'No se encontraron resultados'}
          </p>
        </div>
      )}

      {/* Modal Vista Previa */}
      {modalVistaPrevia && conciliacionSeleccionada && (
        <ModalVistaPreviewConciliacion
          conciliacion={conciliacionSeleccionada}
          onCerrar={() => {
            setModalVistaPrevia(false);
            setConciliacionSeleccionada(null);
          }}
          tipo={subTabActivo}
        />
      )}

      {/* Modal Pagar */}
      <ModalPagarConciliacion
        isOpen={modalPago}
        onClose={() => {
          setModalPago(false);
          setConciliacionPago(null);
        }}
        conciliacion={conciliacionPago}
        onPagada={handlePagada}
      />

      {/* Modal Edición */}
      <ModalPagarConciliacion
        isOpen={modalEdicion}
        onClose={() => {
          setModalEdicion(false);
          setConciliacionEdicion(null);
        }}
        conciliacion={conciliacionEdicion}
        onPagada={handleEditada}
        esEdicion={true}
      />
    </div>
  );
};

export default TablaContabilidad;
