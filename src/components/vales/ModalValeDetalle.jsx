/**
 * src/components/vales/ModalValeDetalle.jsx
 *
 * Modal centrado para ver el detalle completo de un vale (material o renta).
 * Reemplaza el desplegable inline de ValeCardMaterial y ValeCardRenta.
 *
 * Dependencias: formatters.js, useAuth.jsx, ModalEditarVale, ModalEditarValeRenta, ModalCancelarVale
 * Usado en: ValeCardMaterial.jsx, ValeCardRenta.jsx
 */

// 1. React y hooks
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

// 2. Icons
import {
  X,
  FileText,
  Calendar,
  Building2,
  User,
  Truck,
  Package,
  Clock,
  UserCheck,
  MapPin,
  Receipt,
  ClipboardList,
  XCircle,
  Pencil,
  RotateCcw,
  RefreshCw,
  ExternalLink,
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
  formatearDuracion,
} from "../../utils/formatters";
import { buildTicketsMaterialMap, materialDeViaje } from "../../utils/rentaMaterial";

// 4. Config / Hooks
import { supabase } from "../../config/supabase";
import { useAuth } from "../../hooks/useAuth";

// 5. Componentes
import ModalEditarVale from "./editar/ModalEditarVale";
import ModalEditarValeRenta from "./editar/ModalEditarValeRenta";
import ModalCancelarVale from "./ModalCancelarVale";
import ModalSolicitudDesver from "./ModalSolicitudDesver";

// 7. Estilos
import "../../styles/modal-vale-detalle.css";
import "../../styles/ModalSolicitudDesver.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatearFechaCorta = (fechaISO) => {
  if (!fechaISO) return "N/A";
  const date = new Date(fechaISO + (fechaISO.includes("T") ? "" : "T00:00:00"));
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ESTADOS_CANCELABLES = ["emitido", "en_proceso"];

// ─── Sub-componentes internos ─────────────────────────────────────────────────

const InfoRow = ({ icon: Icon, label, value, subValue, color }) => (
  <div className="vdm__info-row">
    <Icon size={15} className="vdm__info-icon" style={color ? { color } : undefined} aria-hidden="true" />
    <div className="vdm__info-content">
      <span className="vdm__info-label" style={color ? { color } : undefined}>{label}</span>
      <span className="vdm__info-value" style={color ? { color } : undefined}>{value}</span>
      {subValue && <span className="vdm__info-sub">{subValue}</span>}
    </div>
  </div>
);

// ─── Detalle Material ─────────────────────────────────────────────────────────

const DetalleMaterial = ({ vale, valeEditable, onAbrirEditar, pesosEspecificos }) => {
  const getCostoEfectivo = (viaje) =>
    viaje.costo_viaje_override != null
      ? Number(viaje.costo_viaje_override)
      : Number(viaje.costo_viaje || 0);

  const fmtTarifaTooltip = (viaje) => {
    const parts = [];
    if (viaje.tarifa_primer_km != null)
      parts.push(`1er km: ${formatearMoneda(viaje.tarifa_primer_km)}/m³`);
    if (viaje.tarifa_subsecuente != null)
      parts.push(`Subsec.: ${formatearMoneda(viaje.tarifa_subsecuente)}/m³`);
    return parts.join("\n") || undefined;
  };

  const fmtRegistrador = (persona) => {
    if (!persona) return null;
    return `${persona.nombre || ""} ${persona.primer_apellido || ""}`.trim() || null;
  };

  const calcularCostoTotal = () =>
    vale.vale_material_detalles.reduce((sum, detalle) => {
      const idTipo = detalle.material?.tipo_de_material?.id_tipo_de_material;
      if (idTipo === 3) {
        const sumViajes = (detalle.vale_material_viajes || []).reduce(
          (s, v) => s + Number(v.costo_viaje_override ?? v.costo_viaje ?? 0),
          0,
        );
        if (sumViajes > 0) return sum + sumViajes;
        const costoDetalle = Number(detalle.costo_total || 0);
        if (costoDetalle > 0) return sum + costoDetalle;
        return sum + Number(detalle.volumen_real_m3 || 0) * Number(detalle.precio_m3 || 0);
      }
      return sum + Number(detalle.costo_total || 0);
    }, 0);

  return (
    <div className="vdm__detalles-section">
      <h4 className="vdm__section-title">
        <Package size={15} aria-hidden="true" />
        Detalles de Material
      </h4>

      {!vale.vale_material_detalles?.length ? (
        <p className="vdm__no-data">Sin detalles de material</p>
      ) : (
        vale.vale_material_detalles.map((detalle, index) => {
          const idTipo = detalle.material?.tipo_de_material?.id_tipo_de_material;
          const esTipo3 = idTipo === 3;
          const volumen = Number(detalle.volumen_real_m3 || 0);
          const precioM3 = Number(detalle.precio_m3 || 0);
          const viajesDetalle = detalle.vale_material_viajes || [];
          const pesoTon = esTipo3 ? 0 : Number(detalle.peso_ton || 0);
          const costoTotal = esTipo3
            ? (() => {
                const sumViajes = viajesDetalle.reduce((s, v) => s + Number(v.costo_viaje_override ?? v.costo_viaje ?? 0), 0);
                if (sumViajes > 0) return sumViajes;
                const costoDetalle = Number(detalle.costo_total || 0);
                if (costoDetalle > 0) return costoDetalle;
                return volumen * precioM3;
              })()
            : Number(detalle.costo_total || 0);

          const pesoEspecifico =
            !esTipo3 && detalle.bancos?.id_banco && detalle.material?.id_material
              ? pesosEspecificos?.get(`${detalle.bancos.id_banco}-${detalle.material.id_material}`)
              : null;

          const primerViaje = viajesDetalle[0];
          // Tipo 2 (Base Asfáltica) no tiene fila en vale_material_viajes: la tarifa vive en el detalle.
          const tarifaPrimerKmRaw = primerViaje?.tarifa_primer_km ?? detalle.tarifa_primer_km;
          const tarifaSubsecRaw = primerViaje?.tarifa_subsecuente ?? detalle.tarifa_subsecuente;
          const tarifaPrimerKm = tarifaPrimerKmRaw != null ? Number(tarifaPrimerKmRaw) : null;
          const tarifaSubsec = tarifaSubsecRaw != null ? Number(tarifaSubsecRaw) : null;

          // Tipo 2 (Base Asfáltica): siempre 1 vale = 1 viaje. El viaje se
          // captura directo en el detalle, sin fila en vale_material_viajes.
          const esTipo2SinViajes =
            idTipo === 2 &&
            viajesDetalle.length === 0 &&
            (volumen > 0 || costoTotal > 0 || pesoTon > 0);
          const numViajesEfectivo =
            viajesDetalle.length > 0 ? viajesDetalle.length : esTipo2SinViajes ? 1 : 0;

          return (
            <div key={detalle.id_detalle_material} className="vdm__detalle-item">
              <div className="vdm__detalle-header">
                <span className="vdm__detalle-num">#{index + 1}</span>
                <span className="vdm__detalle-nombre">
                  {detalle.material?.material || "N/A"}
                </span>
                {valeEditable && (
                  <button
                    type="button"
                    className="vdm__btn-editar"
                    onClick={() => onAbrirEditar(detalle.id_detalle_material)}
                    title="Editar viajes de este detalle"
                  >
                    <Pencil size={11} />
                    Editar viajes
                  </button>
                )}
              </div>

              <div className="vdm__detalle-grid">
                <div className="vdm__detalle-cell">
                  <span className="vdm__cell-label">Tipo:</span>
                  <span className="vdm__cell-value">{detalle.material?.tipo_de_material?.tipo_de_material || "N/A"}</span>
                </div>
                {!esTipo3 && (
                  <div className="vdm__detalle-cell">
                    <span className="vdm__cell-label">Banco:</span>
                    <span className="vdm__cell-value">{detalle.bancos?.banco || "N/A"}</span>
                  </div>
                )}
                <div className="vdm__detalle-cell">
                  <span className="vdm__cell-label">Capacidad:</span>
                  <span className="vdm__cell-value">{vale.vehiculos?.capacidad_m3 > 0 ? formatearVolumen(vale.vehiculos.capacidad_m3) : "—"}</span>
                </div>
                <div className="vdm__detalle-cell">
                  <span className="vdm__cell-label">Distancia:</span>
                  <span className="vdm__cell-value">{formatearDistancia(detalle.distancia_km || 0)}</span>
                </div>
                {tarifaPrimerKm != null && (
                  <div className="vdm__detalle-cell">
                    <span className="vdm__cell-label">Tarifa 1er km:</span>
                    <span className="vdm__cell-value">{formatearMoneda(tarifaPrimerKm)}/m³</span>
                  </div>
                )}
                {tarifaSubsec != null && (
                  <div className="vdm__detalle-cell">
                    <span className="vdm__cell-label">Tarifa subsec.:</span>
                    <span className="vdm__cell-value">{formatearMoneda(tarifaSubsec)}/m³</span>
                  </div>
                )}
                {numViajesEfectivo > 0 && (
                  <div className="vdm__detalle-cell">
                    <span className="vdm__cell-label">Viajes:</span>
                    <span className="vdm__cell-value">{numViajesEfectivo}</span>
                  </div>
                )}
                <div className="vdm__detalle-cell">
                  <span className="vdm__cell-label">M³ Reales:</span>
                  <span className="vdm__cell-value vdm__cell-value--highlight">
                    {volumen > 0 ? formatearVolumen(volumen) : "Pendiente"}
                  </span>
                </div>
                {!esTipo3 && (
                  <div className="vdm__detalle-cell">
                    <span className="vdm__cell-label">Requisición:</span>
                    <span className="vdm__cell-value">{detalle.requisicion || "N/A"}</span>
                  </div>
                )}
                <div className="vdm__detalle-cell">
                  <span className="vdm__cell-label">Precio/M³:</span>
                  <span className="vdm__cell-value">{precioM3 > 0 ? formatearMoneda(precioM3) : "Pendiente"}</span>
                </div>
                {!esTipo3 && pesoTon > 0 && (
                  <div className="vdm__detalle-cell">
                    <span className="vdm__cell-label">Peso:</span>
                    <span className="vdm__cell-value">{formatearPeso(pesoTon)}</span>
                  </div>
                )}
                {pesoEspecifico != null && (
                  <div className="vdm__detalle-cell">
                    <span className="vdm__cell-label">Peso Específico:</span>
                    <span className="vdm__cell-value">{Number(pesoEspecifico).toFixed(3)} ton/m³</span>
                  </div>
                )}
                <div className="vdm__detalle-cell vdm__detalle-cell--full">
                  <span className="vdm__cell-label">Importe:</span>
                  <span className="vdm__cell-value vdm__cell-value--cost">
                    {costoTotal > 0 ? formatearMoneda(costoTotal) : "Pendiente"}
                  </span>
                </div>
              </div>

              {detalle.notas_adicionales && (
                <div className="vdm__notas">
                  <span className="vdm__cell-label">Notas:</span>
                  <p className="vdm__notas-texto">{detalle.notas_adicionales}</p>
                </div>
              )}

              {/* Viajes tipo 3 */}
              {esTipo3 && viajesDetalle.length > 0 && (
                <div className="vdm__viajes">
                  <h5 className="vdm__viajes-title">
                    <Receipt size={12} aria-hidden="true" />
                    Registro de Viajes ({viajesDetalle.length})
                  </h5>
                  <div className="vdm__viajes-tabla-header vdm__viajes-tabla-header--tipo3">
                    <span>Viaje</span><span>Hora</span><span>Banco</span><span>Dist.</span>
                    <span>M³</span><span>Precio/m³</span><span>Costo</span>
                  </div>
                  <div className="vdm__viajes-lista">
                    {[...viajesDetalle].sort((a, b) => a.numero_viaje - b.numero_viaje).map((viaje) => {
                      const tieneOverride = viaje.id_banco_override || viaje.distancia_km_override;
                      const bancoNombre = viaje.bancos_override?.banco || detalle.bancos?.banco || "—";
                      const distancia = viaje.distancia_km_override ?? detalle.distancia_km;
                      // Para tipo 3: precio y volumen por viaje vienen del override o del detalle padre
                      const precioEfectivo = viaje.precio_m3_override ?? viaje.precio_m3 ?? detalle.precio_m3;
                      const volumenEfectivo = viaje.volumen_m3 != null ? Number(viaje.volumen_m3) : Number(detalle.capacidad_m3 || 0);
                      const costoEfectivo = getCostoEfectivo(viaje) || (volumenEfectivo > 0 && precioEfectivo > 0 ? volumenEfectivo * Number(precioEfectivo) : 0);
                      const registrador = fmtRegistrador(viaje.persona_registro);
                      return (
                        <div key={viaje.id_viaje} className={`vdm__viaje-row vdm__viaje-row--tipo3 ${tieneOverride ? "vdm__viaje-row--override" : ""}`}>
                          <span className="vdm__viaje-num">
                            #{viaje.numero_viaje}
                            {tieneOverride && <span className="vdm__override-dot" title="Banco o distancia diferente al detalle">*</span>}
                            {registrador && <span className="vdm__viaje-reg" title={`Registrado por ${registrador}`}>{registrador}</span>}
                          </span>
                          <span>{viaje.hora_registro ? formatearHora(viaje.hora_registro) : "—"}</span>
                          <span>{bancoNombre}</span>
                          <span>{distancia != null ? `${Number(distancia).toFixed(1)} km` : "—"}</span>
                          <span>{volumenEfectivo > 0 ? formatearVolumen(volumenEfectivo) : "—"}</span>
                          <span title={fmtTarifaTooltip(viaje)}>{precioEfectivo != null ? formatearMoneda(Number(precioEfectivo)) : "—"}</span>
                          <span>{costoEfectivo > 0 ? formatearMoneda(costoEfectivo) : "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="vdm__viajes-totales">
                    <span className="vdm__viajes-totales-label">Subtotal viajes:</span>
                    <span>{viajesDetalle.reduce((s, v) => s + (v.volumen_m3 != null ? Number(v.volumen_m3) : Number(detalle.capacidad_m3 || 0)), 0).toFixed(3)} m³</span>
                    <span className="vdm__viajes-totales-costo">
                      {formatearMoneda(viajesDetalle.reduce((s, v) => {
                        const c = getCostoEfectivo(v);
                        if (c > 0) return s + c;
                        const vol = v.volumen_m3 != null ? Number(v.volumen_m3) : Number(detalle.capacidad_m3 || 0);
                        const precio = v.precio_m3_override ?? v.precio_m3 ?? detalle.precio_m3;
                        return s + vol * Number(precio || 0);
                      }, 0))}
                    </span>
                  </div>
                </div>
              )}

              {/* Viajes tipo 1 y 2 */}
              {!esTipo3 && numViajesEfectivo > 0 && (
                <div className="vdm__viajes">
                  <h5 className="vdm__viajes-title">
                    <Receipt size={12} aria-hidden="true" />
                    Registro de Viajes ({numViajesEfectivo})
                  </h5>
                  <div className="vdm__viajes-tabla-header">
                    <span>Viaje</span><span>Hora</span><span>Folio</span>
                    <span>Ton</span><span>M³</span><span>Precio/m³</span><span>Costo</span>
                  </div>
                  <div className="vdm__viajes-lista">
                    {esTipo2SinViajes ? (
                      <div className="vdm__viaje-row vdm__viaje-row--material">
                        <span className="vdm__viaje-num">#1</span>
                        <span>
                          {vale.fecha_completado
                            ? formatearHora(vale.fecha_completado)
                            : vale.fecha_creacion
                              ? formatearHora(vale.fecha_creacion)
                              : "—"}
                        </span>
                        <span>{detalle.folio_vale_fisico || "—"}</span>
                        <span>{pesoTon ? `${pesoTon.toFixed(2)} ton` : "—"}</span>
                        <span>{volumen ? formatearVolumen(volumen) : "—"}</span>
                        <span title={fmtTarifaTooltip(detalle)}>{precioM3 ? formatearMoneda(precioM3) : "—"}</span>
                        <span>{costoTotal ? formatearMoneda(costoTotal) : "—"}</span>
                      </div>
                    ) : (
                      [...viajesDetalle].sort((a, b) => a.numero_viaje - b.numero_viaje).map((viaje) => {
                        const registrador = fmtRegistrador(viaje.persona_registro);
                        return (
                          <div key={viaje.id_viaje} className="vdm__viaje-row vdm__viaje-row--material">
                            <span className="vdm__viaje-num">
                              #{viaje.numero_viaje}
                              {registrador && <span className="vdm__viaje-reg" title={`Registrado por ${registrador}`}>{registrador}</span>}
                            </span>
                            <span>{viaje.hora_registro ? formatearHora(viaje.hora_registro) : "—"}</span>
                            <span>{viaje.folio_vale_fisico || "—"}</span>
                            <span>{viaje.peso_ton ? `${Number(viaje.peso_ton).toFixed(2)} ton` : "—"}</span>
                            <span>{viaje.volumen_m3 ? formatearVolumen(Number(viaje.volumen_m3)) : "—"}</span>
                            <span title={fmtTarifaTooltip(viaje)}>{viaje.precio_m3 ? formatearMoneda(Number(viaje.precio_m3)) : "—"}</span>
                            <span>{viaje.costo_viaje ? formatearMoneda(Number(viaje.costo_viaje)) : "—"}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="vdm__viajes-totales">
                    <span className="vdm__viajes-totales-label">Subtotal viajes:</span>
                    <span>
                      {esTipo2SinViajes
                        ? pesoTon.toFixed(2)
                        : viajesDetalle.reduce((s, v) => s + Number(v.peso_ton || 0), 0).toFixed(2)}{" "}
                      ton
                    </span>
                    <span className="vdm__viajes-totales-costo">
                      {formatearMoneda(
                        esTipo2SinViajes
                          ? costoTotal
                          : viajesDetalle.reduce((s, v) => s + Number(v.costo_viaje || 0), 0),
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {vale.vale_material_detalles?.length > 0 && (
        <div className="vdm__total">
          <span className="vdm__total-label">Total del Vale:</span>
          <span className="vdm__total-valor">{formatearMoneda(calcularCostoTotal())}</span>
        </div>
      )}
    </div>
  );
};

// ─── Detalle Renta ────────────────────────────────────────────────────────────

const DetalleRenta = ({ vale, valeEditable, onAbrirEditar }) => {
  const ticketsMaterialMap = buildTicketsMaterialMap(vale.tickets_descarga);

  const formatHora = (horaISO) => {
    if (!horaISO) return null;
    return new Date(horaISO).toLocaleTimeString("es-MX", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  const calcularCostoTotal = () =>
    vale.vale_renta_detalle.reduce((sum, d) => sum + Number(d.costo_total || 0), 0);

  return (
    <div className="vdm__detalles-section">
      <h4 className="vdm__section-title">
        <Clock size={15} aria-hidden="true" />
        Detalles de Renta
      </h4>

      {vale.vale_renta_detalle?.[0]?.sindicatos?.sindicato && (
        <div className="vdm__sindicato-badge">
          Sindicato: {vale.vale_renta_detalle[0].sindicatos.sindicato}
        </div>
      )}

      {!vale.vale_renta_detalle?.length ? (
        <p className="vdm__no-data">Sin detalles de renta</p>
      ) : (
        vale.vale_renta_detalle.map((detalle, index) => {
          const costoTotal = Number(detalle.costo_total || 0);
          const totalHoras = Number(detalle.total_horas || 0);
          const totalDias = Number(detalle.total_dias || 0);
          const costoHr = Number(detalle.precios_renta?.costo_hr || 0);
          const costoDia = Number(detalle.precios_renta?.costo_dia || 0);
          const esRentaPorDia = totalDias > 0;
          const viajesOrdenados = [...(detalle.vale_renta_viajes || [])].sort((a, b) => a.numero_viaje - b.numero_viaje);

          return (
            <div key={detalle.id_vale_renta_detalle} className="vdm__detalle-item">
              <div className="vdm__detalle-header">
                <span className="vdm__detalle-num">#{index + 1}</span>
                <span className="vdm__detalle-nombre">{detalle.material?.material || "N/A"}</span>
                {valeEditable && (
                  <button
                    type="button"
                    className="vdm__btn-editar"
                    onClick={() => onAbrirEditar(detalle.id_vale_renta_detalle)}
                    title="Editar tipo de renta"
                  >
                    <Pencil size={11} />
                    Editar tipo
                  </button>
                )}
              </div>

              <div className="vdm__detalle-grid">
                <div className="vdm__detalle-cell">
                  <span className="vdm__cell-label">Capacidad:</span>
                  <span className="vdm__cell-value">{vale.vehiculos?.capacidad_m3 > 0 ? formatearVolumen(vale.vehiculos.capacidad_m3) : "—"}</span>
                </div>
                <div className="vdm__detalle-cell">
                  <span className="vdm__cell-label">Núm. Viajes:</span>
                  <span className="vdm__cell-value">{detalle.numero_viajes || 0}</span>
                </div>
                {detalle.hora_inicio && (
                  <div className="vdm__detalle-cell">
                    <span className="vdm__cell-label">Hora Inicio:</span>
                    <span className="vdm__cell-value">{formatHora(detalle.hora_inicio)}</span>
                  </div>
                )}
                {detalle.hora_fin ? (
                  <div className="vdm__detalle-cell">
                    <span className="vdm__cell-label">Hora Fin:</span>
                    <span className="vdm__cell-value">{formatHora(detalle.hora_fin)}</span>
                  </div>
                ) : esRentaPorDia ? (
                  <div className="vdm__detalle-cell">
                    <span className="vdm__cell-label">Hora Fin:</span>
                    <span className="vdm__cell-value">{totalDias === 0.5 ? "Medio día" : "Día completo"}</span>
                  </div>
                ) : null}
                {esRentaPorDia ? (
                  <>
                    <div className="vdm__detalle-cell">
                      <span className="vdm__cell-label">Total Días:</span>
                      <span className="vdm__cell-value vdm__cell-value--highlight">
                        {totalDias > 0 ? `${totalDias} ${totalDias === 1 ? "día" : "días"}` : "Pendiente"}
                      </span>
                    </div>
                    <div className="vdm__detalle-cell">
                      <span className="vdm__cell-label">Tarifa/Día:</span>
                      <span className="vdm__cell-value">{costoDia > 0 ? formatearMoneda(costoDia) : "N/A"}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="vdm__detalle-cell">
                      <span className="vdm__cell-label">Total Horas:</span>
                      <span className="vdm__cell-value vdm__cell-value--highlight">
                        {totalHoras > 0 ? formatearDuracion(totalHoras) : "Pendiente"}
                      </span>
                    </div>
                    <div className="vdm__detalle-cell">
                      <span className="vdm__cell-label">Tarifa/Hora:</span>
                      <span className="vdm__cell-value">{costoHr > 0 ? formatearMoneda(costoHr) : "N/A"}</span>
                    </div>
                  </>
                )}
                <div className="vdm__detalle-cell vdm__detalle-cell--full">
                  <span className="vdm__cell-label">Costo Total:</span>
                  <span className="vdm__cell-value vdm__cell-value--cost">
                    {costoTotal > 0 ? formatearMoneda(costoTotal) : "Pendiente"}
                  </span>
                </div>
              </div>

              {viajesOrdenados.length > 0 && (
                <div className="vdm__viajes vdm__viajes--renta">
                  <h5 className="vdm__viajes-title">
                    <MapPin size={12} aria-hidden="true" />
                    Registro de Viajes
                  </h5>
                  <div className="vdm__viajes-lista vdm__viajes-lista--renta">
                    <div className="vdm__viaje-row vdm__viaje-row--renta vdm__viaje-row--header">
                      <span>#</span>
                      <span>Hora</span>
                      <span>Material movido</span>
                      <span>Registrado por</span>
                    </div>
                    {viajesOrdenados.map((viaje) => {
                      const persona = viaje.persona_registro;
                      const nombrePersona = persona
                        ? `${persona.nombre} ${persona.primer_apellido}`
                        : "—";
                      return (
                        <div key={viaje.id_viaje} className="vdm__viaje-row vdm__viaje-row--renta">
                          <span>{viaje.numero_viaje}</span>
                          <span>{formatHora(viaje.hora_registro)}</span>
                          <span>{materialDeViaje(ticketsMaterialMap, viaje, detalle.material?.material)}</span>
                          <span>{nombrePersona}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {detalle.notas_adicionales && (
                <div className="vdm__notas">
                  <span className="vdm__cell-label">Notas:</span>
                  <p className="vdm__notas-texto">{detalle.notas_adicionales}</p>
                </div>
              )}
            </div>
          );
        })
      )}

      {vale.vale_renta_detalle?.length > 0 && (
        <div className="vdm__total">
          <span className="vdm__total-label">Costo Total del Vale:</span>
          <span className="vdm__total-valor">{formatearMoneda(calcularCostoTotal())}</span>
        </div>
      )}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const ModalValeDetalle = ({ vale, onCerrar, onValeActualizado }) => {
  const { userProfile } = useAuth();
  const esAdministrador = userProfile?.roles?.role === "Administrador";
  const esSindicato = userProfile?.roles?.role === "Sindicato";
  const idSindicatoUsuario = userProfile?.id_sindicato;

  const badgeEstado = getBadgeEstado(vale.estado);
  const { fecha, hora } = formatearFechaHora(vale.fecha_creacion);

  const tieneFechaProgramada =
    vale.fecha_programada &&
    vale.fecha_programada !== vale.fecha_creacion?.split("T")[0];

  const valeEditable =
    esAdministrador &&
    vale.estado !== "conciliado" &&
    vale.estado !== "verificado";

  const valeCancelable =
    esAdministrador && ESTADOS_CANCELABLES.includes(vale.estado);

  // Solicitudes de desverificación
  const solicitudPendiente = vale.solicitudes_desverificacion?.find(
    (s) => s.estado === "pendiente"
  ) ?? null;

  const solicitudRechazada = vale.solicitudes_desverificacion
    ?.filter((s) => s.estado === "rechazada")
    .sort((a, b) => new Date(b.fecha_respuesta) - new Date(a.fecha_respuesta))[0] ?? null;

  const puedeCrearSolicitud =
    esAdministrador &&
    vale.estado === "verificado" &&
    !solicitudPendiente;

  const puedeResponder =
    esSindicato &&
    !!solicitudPendiente &&
    Number(solicitudPendiente.id_sindicato_requerido) === Number(idSindicatoUsuario);

  // Conciliación — carga diferida solo cuando el vale está conciliado
  const [datosConciliacion, setDatosConciliacion] = useState(null);

  useEffect(() => {
    if (vale.estado !== "conciliado") return;
    const fetchConciliacion = async () => {
      try {
        const { data, error } = await supabase
          .from("conciliacion_vales")
          .select(
            "conciliaciones:id_conciliacion (folio, fecha_generacion, numero_orden_compra, numero_factura)",
          )
          .eq("id_vale", vale.id_vale)
          .limit(1)
          .single();
        if (error) return;
        if (data?.conciliaciones) setDatosConciliacion(data.conciliaciones);
      } catch {
        // No bloquear el render si falla
      }
    };
    fetchConciliacion();
  }, [vale.id_vale, vale.estado]);

  // Viajes — carga diferida (el vale llega sin viajes desde el dashboard)
  const [valeConViajes, setValeConViajes] = useState(vale);
  const [loadingViajes, setLoadingViajes] = useState(false);

  useEffect(() => {
    // Solo omitir el fetch si los viajes ya vienen con los campos completos
    // (el Dashboard solo pide folio_vale_fisico, no volumen_m3 ni costo_viaje).
    const yaCargaronMat = vale.vale_material_detalles?.some((d) => {
      const viajes = d.vale_material_viajes;
      return Array.isArray(viajes) &&
        (viajes.length === 0 || "volumen_m3" in viajes[0]);
    });
    const yaCargaronRent = vale.vale_renta_detalle?.some(
      (d) => d.vale_renta_viajes !== undefined,
    );
    if (yaCargaronMat || yaCargaronRent) {
      setValeConViajes(vale);
      return;
    }

    const cargarViajes = async () => {
      setLoadingViajes(true);
      try {
        if (vale.tipo_vale === "material") {
          const ids = (vale.vale_material_detalles ?? []).map(
            (d) => d.id_detalle_material,
          );
          if (ids.length === 0) return;

          const { data, error } = await supabase
            .from("vale_material_viajes")
            .select(`
              id_viaje, id_detalle_material, numero_viaje, hora_registro,
              peso_ton, volumen_m3, precio_m3, costo_viaje, folio_vale_fisico,
              tarifa_primer_km, tarifa_subsecuente,
              id_banco_override, distancia_km_override,
              precio_m3_override, costo_viaje_override,
              bancos_override:id_banco_override (id_banco, banco),
              persona_registro:id_persona_registro (nombre, primer_apellido)
            `)
            .in("id_detalle_material", ids);

          if (error) throw error;

          const porDetalle = new Map();
          (data ?? []).forEach((v) => {
            if (!porDetalle.has(v.id_detalle_material))
              porDetalle.set(v.id_detalle_material, []);
            porDetalle.get(v.id_detalle_material).push(v);
          });

          setValeConViajes({
            ...vale,
            vale_material_detalles: vale.vale_material_detalles?.map((det) => ({
              ...det,
              vale_material_viajes: porDetalle.get(det.id_detalle_material) ?? [],
            })),
          });
        } else {
          const ids = (vale.vale_renta_detalle ?? []).map(
            (d) => d.id_vale_renta_detalle,
          );
          if (ids.length === 0) return;

          const [viajesRes, ticketsRes] = await Promise.all([
            supabase
              .from("vale_renta_viajes")
              .select(`
                id_viaje, id_vale_renta_detalle, numero_viaje, hora_registro,
                persona_registro:id_persona_registro (nombre, primer_apellido)
              `)
              .in("id_vale_renta_detalle", ids),
            supabase
              .from("tickets_descarga")
              .select(`
                numero_ticket, id_material_ticket,
                material_ticket:id_material_ticket (material)
              `)
              .eq("id_vale", vale.id_vale),
          ]);

          if (viajesRes.error) throw viajesRes.error;
          if (ticketsRes.error) throw ticketsRes.error;

          const porDetalle = new Map();
          (viajesRes.data ?? []).forEach((v) => {
            if (!porDetalle.has(v.id_vale_renta_detalle))
              porDetalle.set(v.id_vale_renta_detalle, []);
            porDetalle.get(v.id_vale_renta_detalle).push(v);
          });

          setValeConViajes({
            ...vale,
            tickets_descarga: ticketsRes.data ?? [],
            vale_renta_detalle: vale.vale_renta_detalle?.map((det) => ({
              ...det,
              vale_renta_viajes: porDetalle.get(det.id_vale_renta_detalle) ?? [],
            })),
          });
        }
      } catch (err) {
        console.error("Error cargando viajes:", err);
        setValeConViajes(vale);
      } finally {
        setLoadingViajes(false);
      }
    };

    cargarViajes();
  }, [vale.id_vale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Peso específico (banco + material) — Tipos 1 y 2, se define fuera del vale
  const [pesosEspecificos, setPesosEspecificos] = useState(new Map());

  useEffect(() => {
    if (vale.tipo_vale !== "material") return;

    const pares = (vale.vale_material_detalles ?? [])
      .filter((d) => d.material?.tipo_de_material?.id_tipo_de_material !== 3)
      .map((d) => ({ id_banco: d.bancos?.id_banco, id_material: d.material?.id_material }))
      .filter((p) => p.id_banco && p.id_material);

    if (pares.length === 0) return;

    const fetchPesos = async () => {
      const idsBanco = [...new Set(pares.map((p) => p.id_banco))];
      const idsMaterial = [...new Set(pares.map((p) => p.id_material))];
      const { data, error } = await supabase
        .from("peso_especifico")
        .select("id_banco, id_material, peso_especifico")
        .in("id_banco", idsBanco)
        .in("id_material", idsMaterial);

      if (error) return;

      const mapa = new Map();
      (data ?? []).forEach((row) => {
        mapa.set(`${row.id_banco}-${row.id_material}`, row.peso_especifico);
      });
      setPesosEspecificos(mapa);
    };

    fetchPesos();
  }, [vale.id_vale, vale.tipo_vale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Modales anidados
  const [modalEditar, setModalEditar] = useState({ abierto: false, idDetalle: null });
  const [modalCancelar, setModalCancelar] = useState(false);
  const [modalSolicitud, setModalSolicitud] = useState(false);

  const abrirEditar = useCallback((idDetalle) => {
    setModalEditar({ abierto: true, idDetalle });
  }, []);

  const cerrarEditar = useCallback(() => {
    setModalEditar({ abierto: false, idDetalle: null });
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !modalEditar.abierto && !modalCancelar && !modalSolicitud) {
        onCerrar();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCerrar, modalEditar.abierto, modalCancelar, modalSolicitud]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onCerrar();
  }, [onCerrar]);

  return createPortal(
    <div
      className="vdm__overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle del vale ${formatearFolio(vale.folio)}`}
      onClick={handleOverlayClick}
    >
      <div className="vdm__panel">
        {/* Header */}
        <div className="vdm__header">
          <div className="vdm__header-info">
            <div className="vdm__header-folio">
              <FileText size={16} aria-hidden="true" />
              <span>{formatearFolio(vale.folio)}</span>
            </div>
            <span
              className="vdm__header-estado"
              style={{ color: badgeEstado.color, backgroundColor: badgeEstado.background }}
            >
              {badgeEstado.label}
            </span>
          </div>
          <div className="vdm__header-acciones">
            <button
              type="button"
              className="vdm__btn-soporte"
              onClick={() => window.open(`/vale/${vale.folio}`, "_blank", "noopener,noreferrer")}
              title="Ver soporte de fotos"
            >
              <ExternalLink size={13} />
              Soporte
            </button>
            {vale.estado === "conciliado" && datosConciliacion?.folio && (
              <button
                type="button"
                className="vdm__btn-conciliacion"
                onClick={() => window.open(`/conciliacion/${datosConciliacion.folio}`, "_blank", "noopener,noreferrer")}
                title={`Ver conciliación ${datosConciliacion.folio}`}
              >
                <ExternalLink size={13} />
                Ver conciliación
              </button>
            )}
            {puedeCrearSolicitud && (
              <button
                type="button"
                className="vdm__btn-desver"
                onClick={() => setModalSolicitud(true)}
                title="Solicitar desverificación de este vale"
              >
                <RotateCcw size={13} />
                Solicitar desver.
              </button>
            )}
            {esAdministrador && solicitudPendiente && (
              <span className="vdm__badge-solicitud vdm__badge-solicitud--pendiente">
                Desver. pendiente
              </span>
            )}
            {esAdministrador && !solicitudPendiente && solicitudRechazada && (
              <button
                type="button"
                className="vdm__badge-solicitud vdm__badge-solicitud--rechazada"
                onClick={() => setModalSolicitud(true)}
                title="Ver detalles del rechazo"
              >
                Desver. rechazada
              </button>
            )}
            {valeCancelable && (
              <button
                type="button"
                className="vdm__btn-cancelar"
                onClick={() => setModalCancelar(true)}
                title="Cancelar este vale"
              >
                <XCircle size={13} />
                Cancelar
              </button>
            )}
            <button
              type="button"
              className="vdm__btn-cerrar"
              onClick={onCerrar}
              aria-label="Cerrar detalle del vale"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="vdm__body">
          {/* Info general */}
          <div className="vdm__info-general">
            {/* ── Quién / dónde ── */}
            <InfoRow icon={Building2} label="Obra" value={vale.obras?.obra || "N/A"}
              subValue={`CC: ${vale.obras?.cc || "N/A"} | ${vale.obras?.empresas?.empresa || "N/A"}`} />
            <InfoRow icon={UserCheck} label="Residente" value={getNombreCompleto(vale.persona)} />
            {vale.operadores && (
              <InfoRow icon={User} label="Operador" value={vale.operadores.nombre_completo}
                subValue={vale.operadores.sindicatos ? `Sindicato: ${vale.operadores.sindicatos.sindicato}` : null} />
            )}
            {vale.vehiculos && (
              <InfoRow icon={Truck} label="Placas" value={vale.vehiculos.placas} />
            )}

            {/* ── Timeline operacional ── */}
            <InfoRow icon={Calendar} label="Fecha de Creación" value={`${fecha} a las ${hora}`} />
            {tieneFechaProgramada && (
              <InfoRow icon={Calendar} label="Fecha de Emisión"
                value={formatearFechaCorta(vale.fecha_programada)}
                subValue="Vale planeado con anticipación" color="#8B5CF6" />
            )}
            {vale.fecha_completado && (
              <InfoRow icon={Calendar} label="Fecha de Completado"
                value={`${formatearFechaHora(vale.fecha_completado).fecha} a las ${formatearFechaHora(vale.fecha_completado).hora}`}
                color="#10B981" />
            )}
            {vale.fecha_verificacion && (
              <InfoRow icon={Calendar} label="Fecha de Verificación"
                value={`${formatearFechaHora(vale.fecha_verificacion).fecha} a las ${formatearFechaHora(vale.fecha_verificacion).hora}`}
                color="#004E89" />
            )}
            {datosConciliacion?.fecha_generacion && (
              <InfoRow icon={Receipt} label="Fecha de Conciliación"
                value={`${formatearFechaHora(datosConciliacion.fecha_generacion).fecha} a las ${formatearFechaHora(datosConciliacion.fecha_generacion).hora}`}
                subValue={datosConciliacion.folio}
                color="#065f46" />
            )}
            {vale.estado === "conciliado" && (
              <>
                <InfoRow icon={ClipboardList} label="Orden de Compra"
                  value={datosConciliacion?.numero_orden_compra || "Pendiente"}
                  color={datosConciliacion?.numero_orden_compra ? undefined : "#94a3b8"} />
                <InfoRow icon={Receipt} label="Factura"
                  value={datosConciliacion?.numero_factura || "Pendiente"}
                  color={datosConciliacion?.numero_factura ? undefined : "#94a3b8"} />
              </>
            )}
            {vale.fecha_cancelacion && (
              <InfoRow icon={XCircle} label="Fecha de Cancelación"
                value={`${formatearFechaHora(vale.fecha_cancelacion).fecha} a las ${formatearFechaHora(vale.fecha_cancelacion).hora}`}
                color="#DC2626" />
            )}
          </div>

          {vale.estado === "cancelado" && vale.motivo_cancelacion && (
            <div className="vdm__cancelacion-motivo">
              <span className="vdm__cancelacion-label">Motivo de cancelación:</span>
              <p className="vdm__cancelacion-texto">{vale.motivo_cancelacion}</p>
            </div>
          )}

          {puedeResponder && (
            <div className="vdm__solicitud-card vdm__solicitud-card--pendiente">
              <div className="vdm__solicitud-header">
                <RotateCcw size={14} />
                <span>Solicitud de desverificación pendiente</span>
              </div>
              <p className="vdm__solicitud-motivo">{solicitudPendiente.motivo_solicitud}</p>
              <div className="vdm__solicitud-meta">
                Solicitado: {new Date(solicitudPendiente.fecha_solicitud).toLocaleDateString("es-MX")}
              </div>
              <div className="vdm__solicitud-acciones">
                <button
                  type="button"
                  className="vdm__btn-responder"
                  onClick={() => setModalSolicitud(true)}
                >
                  Responder solicitud
                </button>
              </div>
            </div>
          )}

          {/* Detalles según tipo */}
          {loadingViajes && (
            <div className="vdm__viajes-cargando">
              <RefreshCw size={13} className="vdm__spin-sm" />
              Cargando viajes…
            </div>
          )}
          {valeConViajes.tipo_vale === "material" ? (
            <DetalleMaterial
              vale={valeConViajes}
              valeEditable={valeEditable}
              onAbrirEditar={abrirEditar}
              pesosEspecificos={pesosEspecificos}
            />
          ) : (
            <DetalleRenta vale={valeConViajes} valeEditable={valeEditable} onAbrirEditar={abrirEditar} />
          )}
        </div>
      </div>

      {/* Modales anidados */}
      {modalEditar.abierto && modalEditar.idDetalle && vale.tipo_vale === "material" && (
        <ModalEditarVale
          idDetalleM={modalEditar.idDetalle}
          folioVale={vale.folio}
          onCerrar={cerrarEditar}
          onGuardadoExitoso={cerrarEditar}
        />
      )}
      {modalEditar.abierto && modalEditar.idDetalle && vale.tipo_vale === "renta" && (
        <ModalEditarValeRenta
          idValeRentaDetalle={modalEditar.idDetalle}
          folioVale={vale.folio}
          onCerrar={cerrarEditar}
          onGuardadoExitoso={cerrarEditar}
        />
      )}
      {modalCancelar && (
        <ModalCancelarVale
          vale={vale}
          onCerrar={() => setModalCancelar(false)}
          onCanceladoExitoso={() => {
            setModalCancelar(false);
            onCerrar();
            onValeActualizado?.();
          }}
        />
      )}
      {modalSolicitud && (
        <ModalSolicitudDesver
          vale={vale}
          solicitud={puedeResponder ? solicitudPendiente : (solicitudRechazada ?? null)}
          modo={puedeResponder ? "responder" : "crear"}
          onCerrar={() => setModalSolicitud(false)}
          onExitoso={({ aprobado }) => {
            setModalSolicitud(false);
            onValeActualizado?.();
            if (aprobado) onCerrar();
          }}
        />
      )}
    </div>,
    document.body
  );
};

export default ModalValeDetalle;
