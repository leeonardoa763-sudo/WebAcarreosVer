/**
 * src/components/vales/editar/ModalEditarVale.jsx
 *
 * Modal contenedor para la edición de viajes de un vale de material tipo 1, 2 y 3.
 * Se abre desde ValeCardMaterial. Solo visible para Administrador.
 *
 * Responsabilidades:
 * - Recibe id_detalle_material y dispara la carga de datos
 * - Muestra estado loading / error / éxito
 * - Contiene TablaEditarViajes
 * - Maneja el botón "Guardar cambios" y "Descartar"
 *
 * Dependencias: useEditarValeViajes, TablaEditarViajes, useAuth, lucide-react
 * Usado en: ValeCardMaterial.jsx
 */

// 1. React y hooks
import { useEffect } from "react";

// 2. Icons
import {
  X,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Loader,
  PenLine,
} from "lucide-react";

// 3. Config
import { colors } from "../../../config/colors";

// 4. Hooks personalizados
import { useAuth } from "../../../hooks/useAuth";
import { useEditarValeViajes } from "../../../hooks/editar-vale/useEditarValeViajes";

// 5. Componentes
import TablaEditarViajes from "./TablaEditarViajes";

// 6. Estilos
import "../../../styles/modal-editar-vale.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Retorna el subtítulo descriptivo según el tipo de material.
 */
const getSubtituloTipo = (tipoMaterial, folioVale) => {
  if (folioVale) return `Folio: ${folioVale}`;
  if (tipoMaterial === 1) return "Tipo 1 — Materiales Pétreos";
  if (tipoMaterial === 2) return "Tipo 2 — Base Asfáltica";
  if (tipoMaterial === 3) return "Tipo 3 — Producto de Corte / Tepetate";
  return "Material";
};

// ─── Componente ───────────────────────────────────────────────────────────────

const ModalEditarVale = ({
  // id del detalle a editar (vale_material_detalles)
  idDetalleM,
  // folio del vale padre — solo para mostrar en el header
  folioVale,
  // callback cuando el modal se cierra (para refrescar el card padre)
  onCerrar,
  // callback adicional cuando se guardan cambios exitosamente
  onGuardadoExitoso,
}) => {
  const { userProfile } = useAuth();

  const {
    detalle,
    viajes,
    pesoEspecifico,
    tipoMaterial,
    bancos,
    loading,
    guardando,
    error,
    mensajeExito,
    hayCambiosPendientes,
    viajesAEliminar,
    viajesNuevos,
    cargarDetalle,
    editarCampoViaje,
    editarDistanciaDetalle,
    agregarViaje,
    eliminarViaje,
    cancelarEliminacion,
    guardarCambios,
    descartarCambios,
    calcularTotalesDetalle,
  } = useEditarValeViajes();

  // Cargar datos al montar
  useEffect(() => {
    if (idDetalleM) {
      cargarDetalle(idDetalleM);
    }
  }, [idDetalleM, cargarDetalle]);

  // Notificar al padre cuando el guardado es exitoso
  useEffect(() => {
    if (mensajeExito && onGuardadoExitoso) {
      onGuardadoExitoso();
    }
  }, [mensajeExito, onGuardadoExitoso]);

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleGuardar = async () => {
    if (!userProfile?.id_persona) return;
    await guardarCambios(userProfile.id_persona);
  };

  const handleDescartar = () => {
    if (hayCambiosPendientes) {
      const confirmar = window.confirm(
        "¿Descartar todos los cambios? Esta acción no se puede deshacer.",
      );
      if (!confirmar) return;
    }
    descartarCambios();
  };

  const handleCerrar = () => {
    if (hayCambiosPendientes) {
      const confirmar = window.confirm(
        "¿Cerrar sin guardar? Los cambios pendientes se perderán.",
      );
      if (!confirmar) return;
    }
    onCerrar();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="mev__overlay"
      onClick={(e) => e.target === e.currentTarget && handleCerrar()}
    >
      <div className="mev__panel">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mev__header">
          <div className="mev__header-izq">
            <div className="mev__header-icono">
              <PenLine size={18} />
            </div>
            <div>
              <h2 className="mev__titulo">Editar viajes del vale</h2>
              <p className="mev__subtitulo">
                {getSubtituloTipo(tipoMaterial, folioVale)}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="mev__btn-cerrar"
            onClick={handleCerrar}
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Mensajes de estado ───────────────────────────────────────── */}
        {error && (
          <div className="mev__alerta mev__alerta--error">
            <AlertCircle size={16} />
            <div>
              <strong>Error al guardar</strong>
              <pre className="mev__error-detalle">{error}</pre>
            </div>
          </div>
        )}

        {mensajeExito && (
          <div className="mev__alerta mev__alerta--exito">
            <CheckCircle size={16} />
            <span>{mensajeExito}</span>
          </div>
        )}

        {/* Indicador de cambios pendientes */}
        {hayCambiosPendientes && !error && !mensajeExito && (
          <div className="mev__alerta mev__alerta--pendiente">
            <AlertCircle size={16} />
            <span>
              Tienes cambios sin guardar.
              {viajesNuevos.size > 0 &&
                ` ${viajesNuevos.size} viaje(s) nuevo(s).`}
              {viajesAEliminar.size > 0 &&
                ` ${viajesAEliminar.size} viaje(s) por eliminar.`}
            </span>
          </div>
        )}

        {/* ── Cuerpo — tabla de viajes ─────────────────────────────────── */}
        <div className="mev__cuerpo">
          <TablaEditarViajes
            detalle={detalle}
            viajes={viajes}
            pesoEspecifico={pesoEspecifico}
            tipoMaterial={tipoMaterial}
            bancos={bancos}
            viajesAEliminar={viajesAEliminar}
            viajesNuevos={viajesNuevos}
            loading={loading}
            onEditarCampoViaje={editarCampoViaje}
            onEditarDistanciaDetalle={editarDistanciaDetalle}
            onAgregarViaje={agregarViaje}
            onEliminarViaje={eliminarViaje}
            onCancelarEliminacion={cancelarEliminacion}
            calcularTotalesDetalle={calcularTotalesDetalle}
          />
        </div>

        {/* ── Footer con acciones ──────────────────────────────────────── */}
        <div className="mev__footer">
          <button
            type="button"
            className="mev__btn mev__btn--secundario"
            onClick={handleDescartar}
            disabled={guardando || !hayCambiosPendientes}
          >
            <RotateCcw size={15} />
            Descartar cambios
          </button>

          <div className="mev__footer-der">
            <button
              type="button"
              className="mev__btn mev__btn--cancelar"
              onClick={handleCerrar}
              disabled={guardando}
            >
              Cerrar
            </button>

            <button
              type="button"
              className="mev__btn mev__btn--guardar"
              onClick={handleGuardar}
              disabled={guardando || !hayCambiosPendientes}
            >
              {guardando ? (
                <>
                  <Loader size={15} className="mev__spinner" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={15} />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalEditarVale;
