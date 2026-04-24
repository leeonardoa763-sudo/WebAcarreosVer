/**
 * src/components/vales/ValeCardMaterial.jsx
 *
 * Tarjeta compacta de vale de MATERIAL con desplegable
 *
 * Funcionalidades:
 * - Vista compacta: folio, fecha, estado
 * - Desplegable: información completa del vale de material
 * - Tipo 1 y 2 (Pétreo / Base Asfáltica): volumen_real_m3, peso, banco, requisición, viajes físicos
 * - Tipo 3 (Producto de Corte): volumen_real_m3, capacidad, viajes con banco/distancia override
 * - Botón de editar viajes (solo Administrador, tipos 1/2/3, vales no conciliados ni verificados)
 * - Botón de cancelar vale (solo Administrador, estados emitido/en_proceso)
 *
 * Usado en: ValeCard.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Building2,
  User,
  Truck,
  Package,
  UserCheck,
  Receipt,
  XCircle,
  Pencil,
} from "lucide-react";

// 3. Utils
import {
  formatearFechaHora,
  getBadgeEstado,
  formatearVolumen,
  formatearPeso,
  formatearDistancia,
  formatearFolio,
  formatearMoneda,
  getNombreCompleto,
  formatearHora,
} from "../../utils/formatters";

// 4. Hooks personalizados
import { useAuth } from "../../hooks/useAuth";

// 5. Componentes
import ModalEditarVale from "./editar/ModalEditarVale";
import ModalCancelarVale from "./ModalCancelarVale";

const ESTADOS_CANCELABLES = ["emitido", "en_proceso"];

const ValeCardMaterial = ({ vale, empresaColor, onValeActualizado }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const badgeEstado = getBadgeEstado(vale.estado);
  const { fecha, hora } = formatearFechaHora(vale.fecha_creacion);

  // Auth y permisos
  const { userProfile } = useAuth();
  const esAdministrador = userProfile?.roles?.role === "Administrador";

  // Estado del modal de edición
  const [modalEditar, setModalEditar] = useState({
    abierto: false,
    idDetalle: null,
  });

  // Estado del modal de cancelación
  const [modalCancelar, setModalCancelar] = useState(false);

  // El vale es editable si es admin y no está conciliado ni verificado
  const valeEditable =
    esAdministrador &&
    vale.estado !== "conciliado" &&
    vale.estado !== "verificado";

  // El vale es cancelable si es admin y está en estado emitido o en_proceso
  const valeCancelable =
    esAdministrador && ESTADOS_CANCELABLES.includes(vale.estado);

  const abrirModalEditar = (e, idDetalle) => {
    e.stopPropagation();
    setModalEditar({ abierto: true, idDetalle });
  };

  const cerrarModalEditar = () => {
    setModalEditar({ abierto: false, idDetalle: null });
  };

  /**
   * Calcular costo total del vale sumando todos los detalles
   */
  const calcularCostoTotal = () => {
    return vale.vale_material_detalles.reduce((sum, detalle) => {
      const idTipo = detalle.material?.tipo_de_material?.id_tipo_de_material;
      const esTipo3Det = idTipo === 3;

      if (esTipo3Det) {
        // Recalcular desde viajes para reflejar overrides correctamente
        const costoViajes = (detalle.vale_material_viajes || []).reduce(
          (s, v) => s + Number(v.costo_viaje_override ?? v.costo_viaje ?? 0),
          0,
        );
        return sum + costoViajes;
      }

      return sum + Number(detalle.costo_total || 0);
    }, 0);
  };

  /**
   * Obtener el costo efectivo de un viaje tipo 3.
   * Usa costo_viaje_override si existe, si no costo_viaje.
   */
  const getCostoEfectivo = (viaje) =>
    viaje.costo_viaje_override != null
      ? Number(viaje.costo_viaje_override)
      : Number(viaje.costo_viaje || 0);

  const fmtRegistrador = (persona) => {
    if (!persona) return null;
    return `${persona.nombre || ""} ${persona.primer_apellido || ""}`.trim() || null;
  };

  const fmtTarifaTooltip = (viaje) => {
    const parts = [];
    if (viaje.tarifa_primer_km != null)
      parts.push(`1er km: ${formatearMoneda(viaje.tarifa_primer_km)}/m³`);
    if (viaje.tarifa_subsecuente != null)
      parts.push(`Subsec.: ${formatearMoneda(viaje.tarifa_subsecuente)}/m³`);
    return parts.join("\n") || undefined;
  };

  return (
    <div className="vale-card-compact">
      {/* Vista compacta */}
      <div
        className="vale-card-compact__header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ borderLeft: `4px solid ${empresaColor}` }}
      >
        <div className="vale-card-compact__main">
          <div className="vale-card-compact__folio">
            <FileText size={16} aria-hidden="true" />
            <span>{formatearFolio(vale.folio)}</span>
          </div>

          <div className="vale-card-compact__info">
            <span className="vale-card-compact__fecha">{fecha}</span>
            <span
              className="vale-card-compact__estado"
              style={{
                color: badgeEstado.color,
                backgroundColor: badgeEstado.background,
              }}
            >
              {badgeEstado.label}
            </span>
          </div>
        </div>

        {/* Botón cancelar — solo Administrador, estados cancelables */}
        {valeCancelable && (
          <button
            type="button"
            className="vale-card__btn-cancelar"
            onClick={(e) => {
              e.stopPropagation();
              setModalCancelar(true);
            }}
            title="Cancelar este vale"
          >
            <XCircle size={12} aria-hidden="true" />
            Cancelar
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="vale-card-compact__toggle"
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? "Contraer" : "Expandir"} detalles del vale ${formatearFolio(vale.folio)}`}
          aria-controls={`vale-details-${vale.id_vale}`}
          type="button"
        >
          {isExpanded ? (
            <ChevronUp size={20} aria-hidden="true" />
          ) : (
            <ChevronDown size={20} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Detalles expandidos */}
      {isExpanded && (
        <div
          id={`vale-details-${vale.id_vale}`}
          className="vale-card-compact__body"
          role="region"
          aria-label={`Detalles completos del vale ${formatearFolio(vale.folio)}`}
        >
          {/* Información general */}
          <div className="vale-card__info-general">
            {/* Obra */}
            <div className="vale-card__info-row-expanded">
              <Building2
                size={16}
                className="vale-card__icon"
                aria-hidden="true"
              />
              <div>
                <span className="vale-card__label">Obra:</span>
                <span className="vale-card__value">
                  {vale.obras?.obra || "N/A"}
                </span>
                <span className="vale-card__sub-value">
                  CC: {vale.obras?.cc || "N/A"} |{" "}
                  {vale.obras?.empresas?.empresa || "N/A"}
                </span>
              </div>
            </div>

            {/* Fecha de creación */}
            <div className="vale-card__info-row-expanded">
              <Calendar
                size={16}
                className="vale-card__icon"
                aria-hidden="true"
              />
              <div>
                <span className="vale-card__label">Fecha de Creación:</span>
                <span className="vale-card__value">
                  {fecha} a las {hora}
                </span>
              </div>
            </div>

            {/* Residente */}
            <div className="vale-card__info-row-expanded">
              <UserCheck
                size={16}
                className="vale-card__icon"
                aria-hidden="true"
              />
              <div>
                <span className="vale-card__label">Residente:</span>
                <span className="vale-card__value">
                  {getNombreCompleto(vale.persona)}
                </span>
              </div>
            </div>

            {/* Operador */}
            {vale.operadores && (
              <div className="vale-card__info-row-expanded">
                <User
                  size={16}
                  className="vale-card__icon"
                  aria-hidden="true"
                />
                <div>
                  <span className="vale-card__label">Operador:</span>
                  <span className="vale-card__value">
                    {vale.operadores.nombre_completo}
                  </span>
                  {vale.operadores.sindicatos && (
                    <span className="vale-card__sub-value">
                      Sindicato: {vale.operadores.sindicatos.sindicato}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Placas */}
            {vale.vehiculos && (
              <div className="vale-card__info-row-expanded">
                <Truck
                  size={16}
                  className="vale-card__icon"
                  aria-hidden="true"
                />
                <div>
                  <span className="vale-card__label">Placas:</span>
                  <span className="vale-card__value">
                    {vale.vehiculos.placas}
                  </span>
                </div>
              </div>
            )}

            {/* Fecha de verificación */}
            {vale.fecha_verificacion && (
              <div className="vale-card__info-row-expanded">
                <Calendar
                  size={16}
                  className="vale-card__icon"
                  style={{ color: "#004E89" }}
                  aria-hidden="true"
                />
                <div>
                  <span
                    className="vale-card__label"
                    style={{ color: "#004E89" }}
                  >
                    Fecha de Verificación:
                  </span>
                  <span
                    className="vale-card__value"
                    style={{ color: "#004E89" }}
                  >
                    {formatearFechaHora(vale.fecha_verificacion).fecha} a las{" "}
                    {formatearFechaHora(vale.fecha_verificacion).hora}
                  </span>
                </div>
              </div>
            )}

            {/* Fecha de completado */}
            {vale.fecha_completado && (
              <div className="vale-card__info-row-expanded">
                <Calendar
                  size={16}
                  className="vale-card__icon"
                  style={{ color: "#10B981" }}
                  aria-hidden="true"
                />
                <div>
                  <span
                    className="vale-card__label"
                    style={{ color: "#10B981" }}
                  >
                    Fecha de Completado:
                  </span>
                  <span
                    className="vale-card__value"
                    style={{ color: "#10B981" }}
                  >
                    {formatearFechaHora(vale.fecha_completado).fecha} a las{" "}
                    {formatearFechaHora(vale.fecha_completado).hora}
                  </span>
                </div>
              </div>
            )}

            {/* Fecha de cancelación */}
            {vale.fecha_cancelacion && (
              <div className="vale-card__info-row-expanded">
                <XCircle
                  size={16}
                  className="vale-card__icon"
                  style={{ color: "#DC2626" }}
                  aria-hidden="true"
                />
                <div>
                  <span
                    className="vale-card__label"
                    style={{ color: "#DC2626" }}
                  >
                    Fecha de Cancelación:
                  </span>
                  <span
                    className="vale-card__value"
                    style={{ color: "#DC2626" }}
                  >
                    {formatearFechaHora(vale.fecha_cancelacion).fecha} a las{" "}
                    {formatearFechaHora(vale.fecha_cancelacion).hora}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Motivo de cancelación */}
          {vale.estado === "cancelado" && vale.motivo_cancelacion && (
            <div className="vale-card__cancelacion-motivo">
              <span className="vale-card__cancelacion-label">
                Motivo de cancelación:
              </span>
              <p className="vale-card__cancelacion-texto">
                {vale.motivo_cancelacion}
              </p>
            </div>
          )}

          {/* Detalles de MATERIAL */}
          <div className="vale-card__detalles-section">
            <h4 className="vale-card__section-title">
              <Package size={16} aria-hidden="true" />
              Detalles de Material
            </h4>

            {!vale.vale_material_detalles?.length ? (
              <p className="vale-card__no-data">Sin detalles de material</p>
            ) : (
              vale.vale_material_detalles.map((detalle, index) => {
                const idTipo =
                  detalle.material?.tipo_de_material?.id_tipo_de_material;
                const esTipo3 = idTipo === 3;

                const volumen = Number(detalle.volumen_real_m3 || 0);
                const precioM3 = Number(detalle.precio_m3 || 0);
                // Para tipo 3: recalcular desde viajes para reflejar overrides correctamente
                const viajesDetalleTemp = esTipo3
                  ? detalle.vale_material_viajes || []
                  : [];

                const costoTotal = esTipo3
                  ? viajesDetalleTemp.reduce(
                      (sum, v) =>
                        sum +
                        Number(v.costo_viaje_override ?? v.costo_viaje ?? 0),
                      0,
                    )
                  : Number(detalle.costo_total || 0);

                // Solo tipo 1 y 2 muestran peso
                const pesoTon = esTipo3 ? 0 : Number(detalle.peso_ton || 0);

                // Viajes desde vale_material_viajes (todos los tipos)
                const viajesDetalle = detalle.vale_material_viajes || [];

                return (
                  <div
                    key={detalle.id_detalle_material}
                    className="vale-card__detalle-material"
                  >
                    <div className="vale-card__detalle-header">
                      <span className="vale-card__detalle-number">
                        #{index + 1}
                      </span>
                      <span className="vale-card__detalle-material-name">
                        {detalle.material?.material || "N/A"}
                      </span>

                      {/* Botón editar viajes — tipos 1, 2 y 3, solo Administrador */}
                      {valeEditable && (
                        <button
                          type="button"
                          className="vale-card__btn-editar vale-card__btn-editar--detalle"
                          onClick={(e) =>
                            abrirModalEditar(e, detalle.id_detalle_material)
                          }
                          title="Editar viajes de este detalle"
                        >
                          <Pencil size={11} />
                          Editar viajes
                        </button>
                      )}
                    </div>

                    <div className="vale-card__detalle-grid">
                      {/* Tipo de material */}
                      <div className="vale-card__detalle-item-small">
                        <span className="vale-card__detalle-label">Tipo:</span>
                        <span className="vale-card__detalle-value">
                          {detalle.material?.tipo_de_material
                            ?.tipo_de_material || "N/A"}
                        </span>
                      </div>

                      {/* Banco: solo tipo 1 y 2 */}
                      {!esTipo3 && (
                        <div className="vale-card__detalle-item-small">
                          <span className="vale-card__detalle-label">
                            Banco:
                          </span>
                          <span className="vale-card__detalle-value">
                            {detalle.bancos?.banco || "N/A"}
                          </span>
                        </div>
                      )}

                      {/* Capacidad */}
                      <div className="vale-card__detalle-item-small">
                        <span className="vale-card__detalle-label">
                          Capacidad:
                        </span>
                        <span className="vale-card__detalle-value">
                          {formatearVolumen(detalle.capacidad_m3 || 0)}
                        </span>
                      </div>

                      {/* Distancia */}
                      <div className="vale-card__detalle-item-small">
                        <span className="vale-card__detalle-label">
                          Distancia:
                        </span>
                        <span className="vale-card__detalle-value">
                          {formatearDistancia(detalle.distancia_km || 0)}
                        </span>
                      </div>

                      {/* Viajes registrados — todos los tipos */}
                      {viajesDetalle.length > 0 && (
                        <div className="vale-card__detalle-item-small">
                          <span className="vale-card__detalle-label">
                            Viajes:
                          </span>
                          <span className="vale-card__detalle-value">
                            {viajesDetalle.length}
                          </span>
                        </div>
                      )}

                      {/* M³ Reales */}
                      <div className="vale-card__detalle-item-small">
                        <span className="vale-card__detalle-label">
                          M³ Reales:
                        </span>
                        <span className="vale-card__detalle-value highlight">
                          {volumen > 0
                            ? formatearVolumen(volumen)
                            : "Pendiente"}
                        </span>
                      </div>

                      {/* Requisición: solo tipo 1 y 2 */}
                      {!esTipo3 && (
                        <div className="vale-card__detalle-item-small">
                          <span className="vale-card__detalle-label">
                            Requisición:
                          </span>
                          <span className="vale-card__detalle-value">
                            {detalle.requisicion || "N/A"}
                          </span>
                        </div>
                      )}

                      {/* Precio/M³ */}
                      <div className="vale-card__detalle-item-small">
                        <span className="vale-card__detalle-label">
                          Precio/M³:
                        </span>
                        <span className="vale-card__detalle-value">
                          {precioM3 > 0
                            ? formatearMoneda(precioM3)
                            : "Pendiente"}
                        </span>
                      </div>

                      {/* Peso: solo tipo 1 y 2 con valor */}
                      {!esTipo3 && pesoTon > 0 && (
                        <div className="vale-card__detalle-item-small">
                          <span className="vale-card__detalle-label">
                            Peso:
                          </span>
                          <span className="vale-card__detalle-value">
                            {formatearPeso(pesoTon)}
                          </span>
                        </div>
                      )}

                      {/* Importe */}
                      <div className="vale-card__detalle-item-small full-width">
                        <span className="vale-card__detalle-label">
                          Importe:
                        </span>
                        <span className="vale-card__detalle-value cost">
                          {costoTotal > 0
                            ? formatearMoneda(costoTotal)
                            : "Pendiente"}
                        </span>
                      </div>
                    </div>

                    {detalle.notas_adicionales && (
                      <div className="vale-card__notas">
                        <span className="vale-card__detalle-label">Notas:</span>
                        <p className="vale-card__notas-text">
                          {detalle.notas_adicionales}
                        </p>
                      </div>
                    )}

                    {/* ── Desglose de viajes tipo 3 ─────────────────────── */}
                    {esTipo3 && viajesDetalle.length > 0 && (
                      <div className="vale-card__viajes-desglose vale-card__viajes-desglose--material">
                        <h5 className="vale-card__viajes-title">
                          <Receipt size={13} aria-hidden="true" />
                          Registro de Viajes ({viajesDetalle.length})
                        </h5>

                        {/* Header tipo 3: viaje, banco, distancia, m3, precio, costo */}
                        <div className="vale-card__viajes-tabla-header vale-card__viajes-tabla-header--tipo3">
                          <span>Viaje</span>
                          <span>Banco</span>
                          <span>Dist.</span>
                          <span>M³</span>
                          <span>Precio/m³</span>
                          <span>Costo</span>
                        </div>

                        <div className="vale-card__viajes-lista">
                          {[...viajesDetalle]
                            .sort((a, b) => a.numero_viaje - b.numero_viaje)
                            .map((viaje) => {
                              const tieneOverride =
                                viaje.id_banco_override ||
                                viaje.distancia_km_override;
                              const bancoNombre =
                                viaje.bancos_override?.banco ||
                                detalle.bancos?.banco ||
                                "—";
                              const distancia =
                                viaje.distancia_km_override ??
                                detalle.distancia_km;
                              const costoEfectivo = getCostoEfectivo(viaje);
                              const precioEfectivo =
                                viaje.precio_m3_override ?? viaje.precio_m3;
                              const registrador = fmtRegistrador(
                                viaje.persona_registro,
                              );

                              return (
                                <div
                                  key={viaje.id_viaje}
                                  className={`vale-card__viaje-item vale-card__viaje-item--tipo3 ${tieneOverride ? "vale-card__viaje-item--override" : ""}`}
                                >
                                  <span className="vale-card__viaje-numero">
                                    <span>
                                      #{viaje.numero_viaje}
                                      {tieneOverride && (
                                        <span
                                          className="vale-card__override-dot"
                                          title="Banco o distancia diferente al detalle"
                                        >
                                          *
                                        </span>
                                      )}
                                    </span>
                                    {registrador && (
                                      <span
                                        className="vale-card__viaje-registrador"
                                        title={`Registrado por ${registrador}`}
                                      >
                                        {registrador}
                                      </span>
                                    )}
                                  </span>
                                  <span className="vale-card__viaje-banco">
                                    {bancoNombre}
                                  </span>
                                  <span className="vale-card__viaje-distancia">
                                    {distancia != null
                                      ? `${Number(distancia).toFixed(1)} km`
                                      : "—"}
                                  </span>
                                  <span className="vale-card__viaje-m3">
                                    {viaje.volumen_m3
                                      ? formatearVolumen(
                                          Number(viaje.volumen_m3),
                                        )
                                      : "—"}
                                  </span>
                                  <span
                                    className="vale-card__viaje-precio"
                                    title={fmtTarifaTooltip(viaje)}
                                  >
                                    {precioEfectivo != null
                                      ? formatearMoneda(Number(precioEfectivo))
                                      : "—"}
                                  </span>
                                  <span className="vale-card__viaje-costo">
                                    {costoEfectivo > 0
                                      ? formatearMoneda(costoEfectivo)
                                      : "—"}
                                  </span>
                                </div>
                              );
                            })}
                        </div>

                        {/* Totales tipo 3 */}
                        <div className="vale-card__viajes-totales">
                          <span className="vale-card__viajes-totales-label">
                            Subtotal viajes:
                          </span>
                          <span className="vale-card__viajes-totales-ton">
                            {viajesDetalle
                              .reduce(
                                (s, v) => s + Number(v.volumen_m3 || 0),
                                0,
                              )
                              .toFixed(3)}{" "}
                            m³
                          </span>
                          <span className="vale-card__viajes-totales-costo">
                            {formatearMoneda(
                              viajesDetalle.reduce(
                                (s, v) => s + getCostoEfectivo(v),
                                0,
                              ),
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* ── Desglose de viajes tipo 1 y 2 ────────────────── */}
                    {!esTipo3 && viajesDetalle.length > 0 && (
                      <div className="vale-card__viajes-desglose vale-card__viajes-desglose--material">
                        <h5 className="vale-card__viajes-title">
                          <Receipt size={13} aria-hidden="true" />
                          Registro de Viajes ({viajesDetalle.length})
                        </h5>

                        <div className="vale-card__viajes-tabla-header">
                          <span>Viaje</span>
                          <span>Hora</span>
                          <span>Folio</span>
                          <span>Ton</span>
                          <span>M³</span>
                          <span>Precio/m³</span>
                          <span>Costo</span>
                        </div>

                        <div className="vale-card__viajes-lista">
                          {[...viajesDetalle]
                            .sort((a, b) => a.numero_viaje - b.numero_viaje)
                            .map((viaje) => {
                              const registrador = fmtRegistrador(
                                viaje.persona_registro,
                              );
                              return (
                                <div
                                  key={viaje.id_viaje}
                                  className="vale-card__viaje-item vale-card__viaje-item--material"
                                >
                                  <span className="vale-card__viaje-numero">
                                    #{viaje.numero_viaje}
                                    {registrador && (
                                      <span
                                        className="vale-card__viaje-registrador"
                                        title={`Registrado por ${registrador}`}
                                      >
                                        {registrador}
                                      </span>
                                    )}
                                  </span>
                                  <span className="vale-card__viaje-hora">
                                    {viaje.hora_registro
                                      ? formatearHora(viaje.hora_registro)
                                      : "—"}
                                  </span>
                                  <span className="vale-card__viaje-folio">
                                    {viaje.folio_vale_fisico || "—"}
                                  </span>
                                  <span className="vale-card__viaje-ton">
                                    {viaje.peso_ton
                                      ? `${Number(viaje.peso_ton).toFixed(2)} ton`
                                      : "—"}
                                  </span>
                                  <span className="vale-card__viaje-m3">
                                    {viaje.volumen_m3
                                      ? formatearVolumen(
                                          Number(viaje.volumen_m3),
                                        )
                                      : "—"}
                                  </span>
                                  <span
                                    className="vale-card__viaje-precio"
                                    title={fmtTarifaTooltip(viaje)}
                                  >
                                    {viaje.precio_m3
                                      ? formatearMoneda(Number(viaje.precio_m3))
                                      : "—"}
                                  </span>
                                  <span className="vale-card__viaje-costo">
                                    {viaje.costo_viaje
                                      ? formatearMoneda(
                                          Number(viaje.costo_viaje),
                                        )
                                      : "—"}
                                  </span>
                                </div>
                              );
                            })}
                        </div>

                        <div className="vale-card__viajes-totales">
                          <span className="vale-card__viajes-totales-label">
                            Subtotal viajes:
                          </span>
                          <span className="vale-card__viajes-totales-ton">
                            {viajesDetalle
                              .reduce((s, v) => s + Number(v.peso_ton || 0), 0)
                              .toFixed(2)}{" "}
                            ton
                          </span>
                          <span className="vale-card__viajes-totales-costo">
                            {formatearMoneda(
                              viajesDetalle.reduce(
                                (s, v) => s + Number(v.costo_viaje || 0),
                                0,
                              ),
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Total General del Vale */}
            {vale.vale_material_detalles?.length > 0 && (
              <div className="vale-card__total">
                <span className="vale-card__total-label">Total del Vale:</span>
                <span className="vale-card__total-value cost">
                  {formatearMoneda(calcularCostoTotal())}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de edición de viajes */}
      {modalEditar.abierto && modalEditar.idDetalle && (
        <ModalEditarVale
          idDetalleM={modalEditar.idDetalle}
          folioVale={vale.folio}
          onCerrar={cerrarModalEditar}
          onGuardadoExitoso={cerrarModalEditar}
        />
      )}

      {/* Modal de cancelación */}
      {modalCancelar && (
        <ModalCancelarVale
          vale={vale}
          onCerrar={() => setModalCancelar(false)}
          onCanceladoExitoso={() => {
            setModalCancelar(false);
            onValeActualizado?.();
          }}
        />
      )}
    </div>
  );
};

export default ValeCardMaterial;
