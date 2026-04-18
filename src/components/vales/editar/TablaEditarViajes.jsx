/**
 * src/components/vales/editar/TablaEditarViajes.jsx
 *
 * Tabla editable de viajes internos para vales de material tipo 1, 2 y 3.
 *
 * Tipo 1 y 2: edición de toneladas, folio físico y distancia del detalle.
 *             Recálculo automático de m3 y costo.
 * Tipo 3:     edición de volumen_m3 directo, banco override, distancia override
 *             por viaje. Recálculo automático de precio_m3_override y costo.
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

// ─── Sub-componente: fila tipo 1 y 2 ─────────────────────────────────────────

const FilaViajeT1T2 = ({
  viaje,
  marcadoEliminar,
  esNuevo,
  onEditarCampo,
  onEliminar,
  onCancelarEliminacion,
  pesoEspecifico,
}) => {
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

      {/* Volumen m3 — calculado automático */}
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

      {/* Precio m3 — solo lectura */}
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

// ─── Sub-componente: fila tipo 3 (Tepetate / Producto de Corte) ──────────────

const FilaViajeT3 = ({
  viaje,
  marcadoEliminar,
  esNuevo,
  onEditarCampo,
  onEliminar,
  onCancelarEliminacion,
  bancos,
  detalle,
}) => {
  const [editando, setEditando] = useState(esNuevo);
  const estaDeshabilitado = marcadoEliminar;

  const claseFila = marcadoEliminar
    ? "tev__fila tev__fila--eliminar"
    : esNuevo
      ? "tev__fila tev__fila--nueva"
      : editando
        ? "tev__fila tev__fila--editando"
        : "tev__fila";

  // Precio y costo efectivos: usar override si existe
  const precioEfectivo = viaje.precio_m3_override ?? viaje.precio_m3;
  const costoEfectivo = viaje.costo_viaje_override ?? viaje.costo_viaje;
  const tieneOverride = viaje.id_banco_override || viaje.distancia_km_override;

  return (
    <tr className={claseFila}>
      {/* Número de viaje */}
      <td className="tev__td tev__td--centro">
        <span className="tev__numero-viaje">#{viaje.numero_viaje}</span>
        {esNuevo && <span className="tev__badge tev__badge--nuevo">Nuevo</span>}
        {marcadoEliminar && (
          <span className="tev__badge tev__badge--eliminar">Por eliminar</span>
        )}
        {tieneOverride && !marcadoEliminar && (
          <span
            className="tev__badge tev__badge--override"
            title="Banco o distancia diferente al detalle"
          >
            Override
          </span>
        )}
      </td>

      {/* Volumen m3 — editable directo para tipo 3 */}
      <td className="tev__td">
        {editando && !estaDeshabilitado ? (
          <div className="tev__input-group">
            <input
              type="number"
              className="tev__input tev__input--numero tev__input--destacado"
              value={viaje.volumen_m3 ?? ""}
              onChange={(e) =>
                onEditarCampo(viaje.id_viaje, "volumen_m3", e.target.value)
              }
              placeholder="0.000"
              step="0.001"
              min="0"
            />
            <span className="tev__input-suffix">m³</span>
          </div>
        ) : (
          <span
            className="tev__valor tev__valor--editable"
            onClick={() => !estaDeshabilitado && setEditando(true)}
            title="Clic para editar"
          >
            {fmt3(viaje.volumen_m3)} m³
            {!estaDeshabilitado && (
              <Edit3 size={11} className="tev__icono-editar" />
            )}
          </span>
        )}
      </td>

      {/* Banco override — selector, opcional */}
      <td className="tev__td">
        {editando && !estaDeshabilitado ? (
          <select
            className="tev__select"
            value={viaje.id_banco_override ?? ""}
            onChange={(e) =>
              onEditarCampo(
                viaje.id_viaje,
                "id_banco_override",
                e.target.value ? Number(e.target.value) : null,
              )
            }
          >
            <option value="">
              {detalle?.bancos?.banco ?? "— Sin override —"}
            </option>
            {bancos.map((b) => (
              <option key={b.id_banco} value={b.id_banco}>
                {b.banco}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`tev__valor ${tieneOverride ? "tev__valor--override" : ""}`}
            onClick={() => !estaDeshabilitado && setEditando(true)}
            title={
              tieneOverride
                ? "Banco diferente al del detalle"
                : "Banco del detalle"
            }
          >
            {viaje.bancos_override?.banco ?? detalle?.bancos?.banco ?? "—"}
            {viaje.id_banco_override && (
              <span className="tev__override-indicator">*</span>
            )}
          </span>
        )}
      </td>

      {/* Distancia override — opcional */}
      <td className="tev__td">
        {editando && !estaDeshabilitado ? (
          <div className="tev__input-group">
            <input
              type="number"
              className="tev__input tev__input--numero"
              value={viaje.distancia_km_override ?? ""}
              onChange={(e) =>
                onEditarCampo(
                  viaje.id_viaje,
                  "distancia_km_override",
                  e.target.value,
                )
              }
              placeholder={fmt2(detalle?.distancia_km)}
              step="0.5"
              min="0"
            />
            <span className="tev__input-suffix">km</span>
          </div>
        ) : (
          <span
            className={`tev__valor ${viaje.distancia_km_override ? "tev__valor--override" : ""}`}
            onClick={() => !estaDeshabilitado && setEditando(true)}
            title={
              viaje.distancia_km_override
                ? "Distancia diferente a la del detalle"
                : "Distancia del detalle"
            }
          >
            {viaje.distancia_km_override
              ? `${fmt2(viaje.distancia_km_override)} km`
              : `${fmt2(detalle?.distancia_km)} km`}
            {viaje.distancia_km_override && (
              <span className="tev__override-indicator">*</span>
            )}
          </span>
        )}
      </td>

      {/* Precio m3 efectivo — solo lectura */}
      <td className="tev__td tev__td--calculado">
        <span
          className={`tev__valor ${viaje.precio_m3_override ? "tev__valor--override" : ""}`}
        >
          {fmtMoneda(precioEfectivo)}
        </span>
        {viaje.precio_m3_override && (
          <span className="tev__sub tev__sub--override">
            Base: {fmtMoneda(viaje.precio_m3)}
          </span>
        )}
      </td>

      {/* Costo efectivo — calculado */}
      <td className="tev__td tev__td--costo">
        <span
          className={`tev__costo ${viaje.costo_viaje_override != null ? "tev__costo--override" : ""}`}
        >
          {fmtMoneda(costoEfectivo)}
        </span>
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
  tipoMaterial,
  bancos,
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
  // Estado local para edición de distancia del detalle (tipo 1 y 2)
  const [editandoDistancia, setEditandoDistancia] = useState(false);
  const [distanciaInput, setDistanciaInput] = useState("");

  const esTipo3 = tipoMaterial === 3;

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
  const viajesVisibles = viajes;

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

          {/* Banco del detalle — siempre visible */}
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

          {/* Distancia del detalle — editable solo en tipo 1 y 2 */}
          <div className="tev__info-item">
            <span className="tev__info-label">Distancia</span>
            {!esTipo3 && editandoDistancia ? (
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
                className={`tev__info-valor ${!esTipo3 ? "tev__info-valor--editable" : ""}`}
                onClick={!esTipo3 ? handleIniciarEditarDistancia : undefined}
                title={!esTipo3 ? "Clic para editar distancia" : undefined}
              >
                {fmt2(detalle.distancia_km)} km
                {!esTipo3 && <Edit3 size={11} className="tev__icono-editar" />}
              </span>
            )}
          </div>

          <div className="tev__info-item">
            <span className="tev__info-label">Precio/m³</span>
            <span className="tev__info-valor tev__info-valor--precio">
              {fmtMoneda(detalle.precio_m3)}
            </span>
          </div>

          {/* Peso específico — solo tipo 1 y 2 */}
          {!esTipo3 && pesoEspecifico && (
            <div className="tev__info-item">
              <span className="tev__info-label">Peso específico</span>
              <span className="tev__info-valor">
                {Number(pesoEspecifico).toFixed(2)} t/m³
              </span>
            </div>
          )}
        </div>

        {/* Aviso contextual según tipo */}
        <div className="tev__aviso-distancia">
          <Info size={13} />
          {esTipo3 ? (
            <span>
              Tipo 3: edita el volumen m³ por viaje. Banco y distancia son
              opcionales — se usan para calcular un precio diferente al del
              detalle.
            </span>
          ) : (
            <span>
              Editar la distancia recalcula el precio/m³ y el costo de todos los
              viajes.
            </span>
          )}
        </div>
      </div>

      {/* ── Tabla de viajes ───────────────────────────────────────────── */}
      <div className="tev__tabla-wrapper">
        <table className="tev__tabla">
          <thead>
            {esTipo3 ? (
              <tr className="tev__thead-fila">
                <th className="tev__th tev__th--angosto">Viaje</th>
                <th className="tev__th">Volumen m³</th>
                <th className="tev__th">Banco</th>
                <th className="tev__th">Distancia</th>
                <th className="tev__th tev__th--calculado">
                  Precio/m³
                  <span className="tev__th-sub">calculado</span>
                </th>
                <th className="tev__th tev__th--costo">Costo</th>
                <th className="tev__th tev__th--acciones">Acciones</th>
              </tr>
            ) : (
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
            )}
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
            ) : esTipo3 ? (
              viajesVisibles.map((viaje) => (
                <FilaViajeT3
                  key={viaje.id_viaje}
                  viaje={viaje}
                  marcadoEliminar={viajesAEliminar.has(viaje.id_viaje)}
                  esNuevo={viajesNuevos.has(viaje.id_viaje)}
                  onEditarCampo={onEditarCampoViaje}
                  onEliminar={onEliminarViaje}
                  onCancelarEliminacion={onCancelarEliminacion}
                  bancos={bancos}
                  detalle={detalle}
                />
              ))
            ) : (
              viajesVisibles.map((viaje) => (
                <FilaViajeT1T2
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
                {esTipo3 ? (
                  <>
                    {/* Tipo 3: mostrar volumen total, sin peso */}
                    <td className="tev__totales-valor">
                      {fmt3(totales.volumen_real_m3)} m³
                    </td>
                    <td />
                    <td />
                  </>
                ) : (
                  <>
                    {/* Tipo 1 y 2: mostrar peso y volumen */}
                    <td className="tev__totales-valor">
                      {fmt2(totales.peso_ton)} ton
                    </td>
                    <td className="tev__totales-valor">
                      {fmt3(totales.volumen_real_m3)} m³
                    </td>
                    <td />
                  </>
                )}
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
