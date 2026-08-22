/**
 * src/components/vales/editar/TablaEditarViajesRenta.jsx
 *
 * Tabla editable de viajes internos para vales de renta (vale_renta_viajes).
 * A diferencia de material, un viaje de renta solo tiene número y hora de
 * registro — el material movido por viaje vive en tickets_descarga (solo
 * lectura, se captura desde la app móvil) y no se edita aquí.
 *
 * Dependencias: horaMexico, lucide-react
 * Usado en: ModalEditarValeRenta.jsx
 */

// 2. Icons
import { Plus, Trash2, RotateCcw, AlertTriangle } from "lucide-react";

// 3. Utils
import {
  horaInputDesdeISO,
  isoDesdeHoraInput,
} from "../../../utils/horaMexico";

// ─── Helpers de formato ───────────────────────────────────────────────────────

const fmtRegistrador = (persona) => {
  if (!persona) return null;
  return `${persona.nombre || ""} ${persona.primer_apellido || ""}`.trim();
};

// ─── Componente principal ─────────────────────────────────────────────────────

const TablaEditarViajesRenta = ({
  viajes,
  viajesAEliminar,
  viajesNuevos,
  onEditarCampoViaje,
  onAgregarViaje,
  onEliminarViaje,
  onCancelarEliminacion,
}) => {
  return (
    <div className="tev__contenedor">
      <div className="tev__tabla-wrapper">
        <table className="tev__tabla">
          <thead>
            <tr className="tev__thead-fila">
              <th className="tev__th tev__th--angosto">Viaje</th>
              <th className="tev__th tev__th--hora">Hora</th>
              <th className="tev__th tev__th--acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {viajes.length === 0 ? (
              <tr>
                <td colSpan={3} className="tev__sin-viajes">
                  <AlertTriangle size={18} />
                  <span>
                    No hay viajes registrados. Agrega uno con el botón de abajo.
                  </span>
                </td>
              </tr>
            ) : (
              viajes.map((viaje) => {
                const marcadoEliminar = viajesAEliminar.has(viaje.id_viaje);
                const esNuevo = viajesNuevos.has(viaje.id_viaje);
                const registrador = fmtRegistrador(viaje.persona_registro);

                const claseFila = marcadoEliminar
                  ? "tev__fila tev__fila--eliminar"
                  : esNuevo
                    ? "tev__fila tev__fila--nueva"
                    : "tev__fila";

                return (
                  <tr key={viaje.id_viaje} className={claseFila}>
                    <td className="tev__td tev__td--centro">
                      <span className="tev__numero-viaje">
                        #{viaje.numero_viaje}
                      </span>
                      {registrador && !esNuevo && (
                        <span
                          className="tev__registrador"
                          title={`Registrado por ${registrador}`}
                        >
                          {registrador}
                        </span>
                      )}
                      {esNuevo && (
                        <span className="tev__badge tev__badge--nuevo">Nuevo</span>
                      )}
                      {marcadoEliminar && (
                        <span className="tev__badge tev__badge--eliminar">
                          Por eliminar
                        </span>
                      )}
                    </td>

                    <td className="tev__td">
                      <input
                        type="time"
                        className="tev__input tev__input--hora"
                        value={horaInputDesdeISO(viaje.hora_registro)}
                        onChange={(e) =>
                          onEditarCampoViaje(
                            viaje.id_viaje,
                            "hora_registro",
                            isoDesdeHoraInput(e.target.value, viaje.hora_registro),
                          )
                        }
                        disabled={marcadoEliminar}
                      />
                    </td>

                    <td className="tev__td tev__td--acciones">
                      {!marcadoEliminar ? (
                        <button
                          type="button"
                          className="tev__btn tev__btn--eliminar"
                          onClick={() => onEliminarViaje(viaje.id_viaje)}
                          title="Eliminar viaje"
                        >
                          <Trash2 size={14} />
                        </button>
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
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="tev__footer">
        <button type="button" className="tev__btn-agregar" onClick={onAgregarViaje}>
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

export default TablaEditarViajesRenta;
