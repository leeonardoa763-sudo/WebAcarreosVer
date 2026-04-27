/**
 * src/components/conciliaciones/ModalPagarConciliacion.jsx
 *
 * Modal para registrar pago de una conciliación.
 * Formulario con campos de factura, orden de compra y proveedor.
 *
 * Dependencias: useContabilidad
 * Usado en: TablaContabilidad.jsx
 */

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useContabilidad } from '../../hooks/conciliaciones/useContabilidad';
import '../../styles/modal-pagar-conciliacion.css';

const ModalPagarConciliacion = ({ isOpen, onClose, conciliacion, onPagada, esEdicion = false }) => {
  const { pagarConciliacion, editarConciliacionPagada } = useContabilidad();
  const [numeroFactura, setNumeroFactura] = useState('');
  const [numeroOrdenCompra, setNumeroOrdenCompra] = useState('');
  const [nombreProveedor, setNombreProveedor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && conciliacion && esEdicion) {
      setNumeroFactura(conciliacion.numero_factura || '');
      setNumeroOrdenCompra(conciliacion.numero_orden_compra || '');
      setNombreProveedor(conciliacion.nombre_proveedor || '');
    } else if (isOpen && !esEdicion) {
      setNumeroFactura('');
      setNumeroOrdenCompra('');
      setNombreProveedor('');
    }
  }, [isOpen, conciliacion, esEdicion]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!numeroFactura.trim() || !numeroOrdenCompra.trim() || !nombreProveedor.trim()) {
      setError('Todos los campos son requeridos');
      return;
    }

    setLoading(true);

    const datosPago = {
      numeroFactura: numeroFactura.trim(),
      numeroOrdenCompra: numeroOrdenCompra.trim(),
      nombreProveedor: nombreProveedor.trim(),
    };

    const result = esEdicion
      ? await editarConciliacionPagada(conciliacion.id_conciliacion, datosPago)
      : await pagarConciliacion(conciliacion.id_conciliacion, datosPago);

    if (result.success) {
      onPagada(conciliacion.id_conciliacion, {
        numero_factura: numeroFactura.trim(),
        numero_orden_compra: numeroOrdenCompra.trim(),
        nombre_proveedor: nombreProveedor.trim(),
      });
      handleClose();
    } else {
      setError(result.error || `Error al ${esEdicion ? 'editar' : 'guardar'} el pago`);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNumeroFactura('');
    setNumeroOrdenCompra('');
    setNombreProveedor('');
    setError(null);
    onClose();
  };

  if (!isOpen || !conciliacion) return null;

  return (
    <div className="mpc-overlay" onClick={handleClose}>
      <div className="mpc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mpc-header">
          <h2 className="mpc-title">{esEdicion ? 'Editar Pago' : 'Registrar Pago'}</h2>
          <button
            className="mpc-close-btn"
            onClick={handleClose}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mpc-content">
          <div className="mpc-info">
            <p>
              <strong>Folio:</strong> {conciliacion.folio}
            </p>
            <p>
              <strong>Semana:</strong> {conciliacion.numero_semana} | {conciliacion.año}
            </p>
          </div>

          {error && (
            <div className="mpc-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mpc-form">
            <div className="mpc-form-group">
              <label htmlFor="numeroFactura">Número de Factura *</label>
              <input
                id="numeroFactura"
                type="text"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                placeholder="Ej: FAC-2025-001"
                disabled={loading}
              />
            </div>

            <div className="mpc-form-group">
              <label htmlFor="numeroOrdenCompra">Número de Orden de Compra *</label>
              <input
                id="numeroOrdenCompra"
                type="text"
                value={numeroOrdenCompra}
                onChange={(e) => setNumeroOrdenCompra(e.target.value)}
                placeholder="Ej: OC-2025-001"
                disabled={loading}
              />
            </div>

            <div className="mpc-form-group">
              <label htmlFor="nombreProveedor">Nombre del Proveedor *</label>
              <input
                id="nombreProveedor"
                type="text"
                value={nombreProveedor}
                onChange={(e) => setNombreProveedor(e.target.value)}
                placeholder="Nombre del sindicato o proveedor"
                disabled={loading}
              />
            </div>

            <div className="mpc-footer">
              <button
                type="button"
                className="mpc-btn-cancel"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="mpc-btn-save"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="mpc-spinner" />
                    Guardando...
                  </>
                ) : esEdicion ? (
                  'Guardar Cambios'
                ) : (
                  'Registrar Pago'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalPagarConciliacion;
