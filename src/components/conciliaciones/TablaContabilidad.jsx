/**
 * src/components/conciliaciones/TablaContabilidad.jsx
 *
 * Tabla de conciliaciones para contabilidad con soporte de renta y material.
 * Incluye buscador, sub-tabs, badges de estado y botón de pago para admin.
 *
 * Dependencias: useContabilidad, ModalPagarConciliacion, ModalVistaPreviewConciliacion
 * Usado en: Conciliaciones.jsx
 */

import { useEffect, useState } from 'react';
import { Eye, DollarSign, Loader2, Edit2, CheckCircle2 } from 'lucide-react';
import { colors } from '../../config/colors';
import { useAuth } from '../../hooks/useAuth';
import { useContabilidad } from '../../hooks/conciliaciones/useContabilidad';
import ModalPagarConciliacion from './ModalPagarConciliacion';
import ModalVistaPreviewConciliacion from '../dashboard/ModalVistaPreviewConciliacion';
import '../../styles/contabilidad.css';

const TablaContabilidad = () => {
  const { userProfile } = useAuth();
  const esAdmin = userProfile?.roles?.role === 'Administrador';
  const { fetchConciliacionesContabilidad } = useContabilidad();

  const [subTabActivo, setSubTabActivo] = useState('renta');
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [buscador, setBuscador] = useState('');

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

  const datosFiltrodos = datos.filter((c) => {
    const busqueda = buscador.toLowerCase();
    return (
      c.folio?.toLowerCase().includes(busqueda) ||
      c.obras?.empresa?.toLowerCase().includes(busqueda) ||
      c.obras?.obra?.toLowerCase().includes(busqueda)
    );
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

  const formatearMes = (fecha) => {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    } catch {
      return '—';
    }
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
          placeholder="Buscar por folio, empresa u obra..."
          value={buscador}
          onChange={(e) => setBuscador(e.target.value)}
        />
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
            </thead>
            <tbody>
              {datosFiltrodos.map((conciliacion) => {
                const empresa = conciliacion.obras?.empresas?.empresa || '—';
                const mes = formatearMes(conciliacion.fecha_inicio);
                const semana = conciliacion.numero_semana;
                const material =
                  subTabActivo === 'renta'
                    ? 'Renta de material'
                    : conciliacion.nombreMaterial || '—';
                const volumen =
                  subTabActivo === 'renta'
                    ? `${conciliacion.total_dias ?? 0} días`
                    : `${(conciliacion.totalVolumenM3 ?? 0).toFixed(2)} m³`;
                const importeSinIva = (conciliacion.subtotal ?? 0).toLocaleString(
                  'es-MX',
                  { style: 'currency', currency: 'MXN' }
                );
                const importeTotal = (conciliacion.total_final ?? 0).toLocaleString(
                  'es-MX',
                  { style: 'currency', currency: 'MXN' }
                );
                const estado = conciliacion.estado || 'generada';

                const puedeSerPagada = esAdmin && estado !== 'pagada';
                const puedeSerEditada = esAdmin && estado === 'pagada';

                return (
                  <tr key={conciliacion.id_conciliacion} className="ctb-fila">
                    <td className="ctb-codigo">{conciliacion.folio}</td>
                    <td>{empresa}</td>
                    <td>{mes}</td>
                    <td className="ctb-semana">{semana}</td>
                    <td>{material}</td>
                    <td className="ctb-volumen">{volumen}</td>
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
                    <td className="ctb-factura">{conciliacion.numero_factura || '—'}</td>
                    <td className="ctb-oc">{conciliacion.numero_orden_compra || '—'}</td>
                    <td className="ctb-proveedor">{conciliacion.nombre_proveedor || '—'}</td>
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
