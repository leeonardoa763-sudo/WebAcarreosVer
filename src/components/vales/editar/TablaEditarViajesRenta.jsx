/**
 * src/components/vales/editar/TablaEditarViajesRenta.jsx
 *
 * Tabla editable de viajes internos para vales de renta (vale_renta_viajes).
 * Pipas de agua (esPipaAgua): solo número y hora — el material movido por
 * viaje vive en tickets_descarga (solo lectura, se captura desde la app) y no
 * se edita aquí. Renta normal (esPipaAgua=false): además de hora, cada viaje
 * declara su propio material (agrupado por categoría), carga aproximada y
 * banco de descarga — mismos 3 campos que captura el checador en la app.
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

// ─── Constantes ─────────────────────────────────────────────────────────────

const OPCIONES_CARGA = [50, 75, 100];

// ─── Helpers de formato ───────────────────────────────────────────────────────

const fmtRegistrador = (persona) => {
  if (!persona) return null;
  return `${persona.nombre || ""} ${persona.primer_apellido || ""}`.trim();
};

// Agrupa el catálogo de materiales por categoría de renta, para <optgroup>.
const agruparMaterialesPorCategoria = (materiales) => {
  const grupos = new Map();
  for (const mat of materiales) {
    const categoria = mat.categoria_material_renta?.categoria || "Otros";
    const orden = mat.categoria_material_renta?.orden ?? 999;
    if (!grupos.has(categoria)) grupos.set(categoria, { orden, materiales: [] });
    grupos.get(categoria).materiales.push(mat);
  }
  return [...grupos.entries()].sort((a, b) => a[1].orden - b[1].orden);
};

// ─── Componente principal ─────────────────────────────────────────────────────

const TablaEditarViajesRenta = ({
  viajes,
  viajesAEliminar,
  viajesNuevos,
  esPipaAgua,
  materiales = [],
  bancosSugeridos = [],
  onEditarCampoViaje,
  onAgregarViaje,
  onEliminarViaje,
  onCancelarEliminacion,
}) => {
  const gruposMaterial = esPipaAgua ? [] : agruparMaterialesPorCategoria(materiales);
  const totalColumnas = esPipaAgua ? 3 : 6;

  return (
    <div className="tev__contenedor">
      <div className="tev__tabla-wrapper">
        <table className="tev__tabla">
          <thead>
            <tr className="tev__thead-fila">
              <th className="tev__th tev__th--angosto">Viaje</th>
              <th className="tev__th tev__th--hora">Hora</th>
              {!esPipaAgua && (
                <>
                  <th className="tev__th">Material</th>
                  <th className="tev__th tev__th--angosto">Carga</th>
                  <th className="tev__th">Banco de descarga</th>
                </>
              )}
              <th className="tev__th tev__th--acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {viajes.length === 0 ? (
              <tr>
                <td colSpan={totalColumnas} className="tev__sin-viajes">
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

                    {!esPipaAgua && (
                      <>
                        <td className="tev__td">
                          <select
                            className="tev__input"
                            value={viaje.id_material || ""}
                            onChange={(e) =>
                              onEditarCampoViaje(
                                viaje.id_viaje,
                                "id_material",
                                e.target.value ? Number(e.target.value) : null,
                              )
                            }
                            disabled={marcadoEliminar}
                            aria-label={`Material del viaje ${viaje.numero_viaje}`}
                          >
                            <option value="">Sin especificar</option>
                            {gruposMaterial.map(([categoria, grupo]) => (
                              <optgroup key={categoria} label={categoria}>
                                {grupo.materiales.map((mat) => (
                                  <option key={mat.id_material} value={mat.id_material}>
                                    {mat.material}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </td>

                        <td className="tev__td tev__td--centro">
                          <select
                            className="tev__input"
                            value={viaje.carga_porcentaje || ""}
                            onChange={(e) =>
                              onEditarCampoViaje(
                                viaje.id_viaje,
                                "carga_porcentaje",
                                e.target.value ? Number(e.target.value) : null,
                              )
                            }
                            disabled={marcadoEliminar}
                            aria-label={`Carga del viaje ${viaje.numero_viaje}`}
                          >
                            <option value="">—</option>
                            {OPCIONES_CARGA.map((pct) => (
                              <option key={pct} value={pct}>
                                {pct}%
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="tev__td">
                          <input
                            type="text"
                            className="tev__input"
                            list={`bancos-sugeridos-${viaje.id_viaje}`}
                            value={viaje.banco_descarga || ""}
                            onChange={(e) =>
                              onEditarCampoViaje(
                                viaje.id_viaje,
                                "banco_descarga",
                                e.target.value,
                              )
                            }
                            disabled={marcadoEliminar}
                            placeholder="Banco de descarga"
                            aria-label={`Banco de descarga del viaje ${viaje.numero_viaje}`}
                          />
                          <datalist id={`bancos-sugeridos-${viaje.id_viaje}`}>
                            {bancosSugeridos.map((banco) => (
                              <option key={banco} value={banco} />
                            ))}
                          </datalist>
                        </td>
                      </>
                    )}

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
