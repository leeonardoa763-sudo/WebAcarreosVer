/**
 * src/components/vales/editar/TablaEditarViajes.jsx
 *
 * Tabla editable de viajes internos para vales de material tipo 1.
 * Permite editar toneladas, folio físico y distancia del detalle.
 * Muestra recálculo automático de m3 y costo al editar.
 *
 * Dependencias: useEditarValeViajes, lucide-react, colors
 * Usado en: ModalEditarVale.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import {
  Plus,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Edit3,
  Info,
} from "lucide-react";

// 3. Config
import { colors } from "../../../config/colors";

// ─── Helpers de formato ───────────────────────────────────────────────────────

const fmt2 = (n) =>
  n !== null && n !== undefined && !isNaN(Number(n))
    ? Number(n).toFixed(2)
    : "—";

const fmt3 = (n) =>
  n !== null && n !== undefined && !isNaN(Number(n))
    ? Number(n).toFixed(3)
    : "—";

const fmtMoneda = (n) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(n));
};

// ─── Sub-componente: fila de un viaje ────────────────────────────────────────

const FilaViaje = ({
  viaje,
  marcadoEliminar,
  esNuevo,
  onEditarCampo,
  onEliminar,
  onCancelarEliminacion,
  pesoEspecifico,
}) => {
  // Controla si esta fila está en modo edición activa
  const [editando, setEditando] = useState(esNuevo);

  const estaDeshabilitado = marcadoEliminar;

  const claseFila = marcadoEliminar
    ? "tev__fila tev__fila--eliminar"
    : esNuevo
      ? "tev__fila tev__fila--nueva"
      : editando
        ? "tev__fila tev__fila--editando"
        : "tev__fila";

  return (
    <tr className={claseFila}>
      {/* Número de viaje */}
      <td className="tev__td tev__td--centro">
        <span className="tev__numero-viaje">#{viaje.numero_viaje}</span>
        {esNuevo && <span className="tev__badge tev__badge--nuevo">Nuevo</span>}
        {marcadoEliminar && (
          <span className="tev__badge tev__badge--eliminar">Por eliminar</span>
        )}
      </td>

      {/* Folio físico — siempre editable */}
      <td className="tev__td">
        <input
          type="text"
          className="tev__input tev__input--folio"
          value={viaje.folio_vale_fisico ?? ""}
          onChange={(e) =>
            onEditarCampo(viaje.id_viaje, "folio_vale_fisico", e.target.value)
          }
          placeholder="Ej. 331250"
          disabled={estaDeshabilitado}
          maxLength={30}
        />
      </td>

      {/* Toneladas — campo principal */}
      <td className="tev__td">
        {editando && !estaDeshabilitado ? (
          <input
            type="number"
            className="tev__input tev__input--numero tev__input--destacado"
            value={viaje.peso_ton ?? ""}
            onChange={(e) =>
              onEditarCampo(viaje.id_viaje, "peso_ton", e.target.value)
            }
            placeholder="0.000"
            step="0.001"
            min="0"
            disabled={estaDeshabilitado}
          />
        ) : (
          <span
            className="tev__valor tev__valor--editable"
            onClick={() => !estaDeshabilitado && setEditando(true)}
            title="Clic para editar"
          >
            {fmt2(viaje.peso_ton)} ton
            {!estaDeshabilitado && (
              <Edit3 size={11} className="tev__icono-editar" />
            )}
          </span>
        )}
      </td>

      {/* Volumen m3 — calculado automático, solo lectura */}
      <td className="tev__td tev__td--calculado">
        <span className="tev__valor tev__valor--calculado">
          {fmt3(viaje.volumen_m3)} m³
        </span>
        {pesoEspecifico && (
          <span className="tev__sub">
            pe: {Number(pesoEspecifico).toFixed(2)}
          </span>
        )}
      </td>

      {/* Precio m3 — solo lectura, puede cambiar si se edita distancia */}
      <td className="tev__td tev__td--calculado">
        <span className="tev__valor">{fmtMoneda(viaje.precio_m3)}</span>
      </td>

      {/* Costo del viaje — calculado */}
      <td className="tev__td tev__td--costo">
        <span className="tev__costo">{fmtMoneda(viaje.costo_viaje)}</span>
      </td>

      {/* Acciones */}
      <td className="tev__td tev__td--acciones">
        {!marcadoEliminar ? (
          <div className="tev__acciones">
            {!editando && !esNuevo && (
              <button
                type="button"
                className="tev__btn tev__btn--editar"
                onClick={() => setEditando(true)}
                title="Editar viaje"
              >
                <Edit3 size={14} />
              </button>
            )}
            {editando && !esNuevo && (
              <button
                type="button"
                className="tev__btn tev__btn--listo"
                onClick={() => setEditando(false)}
                title="Confirmar cambios"
              >
                Listo
              </button>
            )}
            <button
              type="button"
              className="tev__btn tev__btn--eliminar"
              onClick={() => onEliminar(viaje.id_viaje)}
              title="Eliminar viaje"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="tev__btn tev__btn--restaurar"
            onClick={() => onCancelarEliminacion(viaje.id_viaje)}
            title="Cancelar eliminación"
          >
            <RotateCcw size={14} />
            Restaurar
          </button>
        )}
      </td>
    </tr>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const TablaEditarViajes = ({
  detalle,
  viajes,
  pesoEspecifico,
  viajesAEliminar,
  viajesNuevos,
  loading,
  onEditarCampoViaje,
  onEditarDistanciaDetalle,
  onAgregarViaje,
  onEliminarViaje,
  onCancelarEliminacion,
  calcularTotalesDetalle,
}) => {
  // Estado local para edición de distancia
  const [editandoDistancia, setEditandoDistancia] = useState(false);
  const [distanciaInput, setDistanciaInput] = useState("");

  const handleIniciarEditarDistancia = () => {
    setDistanciaInput(String(detalle?.distancia_km ?? ""));
    setEditandoDistancia(true);
  };

  const handleConfirmarDistancia = () => {
    const valor = Number(distanciaInput);
    if (valor > 0) {
      onEditarDistanciaDetalle(valor);
    }
    setEditandoDistancia(false);
  };

  const handleCancelarDistancia = () => {
    setEditandoDistancia(false);
  };

  if (loading) {
    return (
      <div className="tev__loading">
        <div className="tev__spinner" />
        <span>Cargando viajes...</span>
      </div>
    );
  }

  if (!detalle) return null;

  const totales = calcularTotalesDetalle();
  const viajesVisibles = viajes.filter(
    (v) => !viajesAEliminar.has(v.id_viaje) || true,
  );

  return (
    <div className="tev__contenedor">
      {/* ── Cabecera del detalle ───────────────────────────────────────── */}
      <div className="tev__cabecera-detalle">
        <div className="tev__info-detalle">
          <div className="tev__info-item">
            <span className="tev__info-label">Material</span>
            <span className="tev__info-valor">
              {detalle.material?.material ?? "—"}
            </span>
          </div>
          <div className="tev__info-item">
            <span className="tev__info-label">Banco</span>
            <span className="tev__info-valor">
              {detalle.bancos?.banco ?? "—"}
            </span>
          </div>
          <div className="tev__info-item">
            <span className="tev__info-label">Capacidad</span>
            <span className="tev__info-valor">
              {fmt3(detalle.capacidad_m3)} m³
            </span>
          </div>

          {/* Distancia — editable */}
          <div className="tev__info-item">
            <span className="tev__info-label">Distancia</span>
            {editandoDistancia ? (
              <div className="tev__distancia-edit">
                <input
                  type="number"
                  className="tev__input tev__input--distancia"
                  value={distanciaInput}
                  onChange={(e) => setDistanciaInput(e.target.value)}
                  step="0.5"
                  min="1"
                  autoFocus
                />
                <span className="tev__input-suffix">km</span>
                <button
                  type="button"
                  className="tev__btn tev__btn--listo"
                  onClick={handleConfirmarDistancia}
                >
                  OK
                </button>
                <button
                  type="button"
                  className="tev__btn tev__btn--cancelar-sm"
                  onClick={handleCancelarDistancia}
                >
                  ✕
                </button>
              </div>
            ) : (
              <span
                className="tev__info-valor tev__info-valor--editable"
                onClick={handleIniciarEditarDistancia}
                title="Clic para editar distancia"
              >
                {fmt2(detalle.distancia_km)} km
                <Edit3 size={11} className="tev__icono-editar" />
              </span>
            )}
          </div>

          <div className="tev__info-item">
            <span className="tev__info-label">Precio/m³</span>
            <span className="tev__info-valor tev__info-valor--precio">
              {fmtMoneda(detalle.precio_m3)}
            </span>
          </div>

          {pesoEspecifico && (
            <div className="tev__info-item">
              <span className="tev__info-label">Peso específico</span>
              <span className="tev__info-valor">
                {Number(pesoEspecifico).toFixed(2)} t/m³
              </span>
            </div>
          )}
        </div>

        {/* Aviso si se edita distancia */}
        <div className="tev__aviso-distancia">
          <Info size={13} />
          <span>
            Editar la distancia recalcula el precio/m³ y el costo de todos los
            viajes.
          </span>
        </div>
      </div>

      {/* ── Tabla de viajes ───────────────────────────────────────────── */}
      <div className="tev__tabla-wrapper">
        <table className="tev__tabla">
          <thead>
            <tr className="tev__thead-fila">
              <th className="tev__th tev__th--angosto">Viaje</th>
              <th className="tev__th">Folio Físico</th>
              <th className="tev__th">Toneladas</th>
              <th className="tev__th tev__th--calculado">
                Volumen m³
                <span className="tev__th-sub">calculado</span>
              </th>
              <th className="tev__th tev__th--calculado">
                Precio/m³
                <span className="tev__th-sub">calculado</span>
              </th>
              <th className="tev__th tev__th--costo">Costo</th>
              <th className="tev__th tev__th--acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {viajesVisibles.length === 0 ? (
              <tr>
                <td colSpan={7} className="tev__sin-viajes">
                  <AlertTriangle size={18} />
                  <span>
                    No hay viajes registrados. Agrega uno con el botón de abajo.
                  </span>
                </td>
              </tr>
            ) : (
              viajesVisibles.map((viaje) => (
                <FilaViaje
                  key={viaje.id_viaje}
                  viaje={viaje}
                  marcadoEliminar={viajesAEliminar.has(viaje.id_viaje)}
                  esNuevo={viajesNuevos.has(viaje.id_viaje)}
                  onEditarCampo={onEditarCampoViaje}
                  onEliminar={onEliminarViaje}
                  onCancelarEliminacion={onCancelarEliminacion}
                  pesoEspecifico={pesoEspecifico}
                />
              ))
            )}
          </tbody>

          {/* Fila de totales */}
          {viajesVisibles.length > 0 && (
            <tfoot>
              <tr className="tev__totales-fila">
                <td colSpan={2} className="tev__totales-label">
                  Totales (
                  {
                    viajesVisibles.filter(
                      (v) => !viajesAEliminar.has(v.id_viaje),
                    ).length
                  }{" "}
                  viajes activos)
                </td>
                <td className="tev__totales-valor">
                  {fmt2(totales.peso_ton)} ton
                </td>
                <td className="tev__totales-valor">
                  {fmt3(totales.volumen_real_m3)} m³
                </td>
                <td />
                <td className="tev__totales-costo">
                  {fmtMoneda(totales.costo_total)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Botón agregar viaje ───────────────────────────────────────── */}
      <div className="tev__footer">
        <button
          type="button"
          className="tev__btn-agregar"
          onClick={onAgregarViaje}
        >
          <Plus size={16} />
          Agregar viaje
        </button>

        <span className="tev__footer-hint">
          Los cambios no se guardan hasta presionar "Guardar cambios"
        </span>
      </div>
    </div>
  );
};

export default TablaEditarViajes;
