/**
 * src/components/visualizar-vale/DetallesRenta.jsx
 *
 * Muestra los datos del detalle de un vale de renta en la página pública.
 * Incluye foto de evidencia (full-width), horas/días, precios y tabla de viajes.
 *
 * Dependencias: formatters, lucide-react, visualizar-vale.css
 * Usado en: VisualizarVale.jsx
 */

// 1. React
import { useState } from "react";

// 2. Icons
import { Clock, MapPin, Expand, ImageOff, X } from "lucide-react";

// 3. Utils
import {
  formatearMoneda,
  formatearVolumen,
  formatearHora,
} from "../../utils/formatters";
import {
  buildTicketsMaterialMap,
  materialDeViaje,
} from "../../utils/rentaMaterial";

const DetallesRenta = ({ detalle, ticketsDescarga, mostrarPrecios }) => {
  const [fotoModal, setFotoModal] = useState(false);

  const ticketsMaterialMap = buildTicketsMaterialMap(ticketsDescarga);

  const totalDias = Number(detalle.total_dias || 0);
  const esRentaPorDia = totalDias > 0;

  const tieneFoto = Boolean(detalle.foto_evidencia_url);
  const tieneGeo = detalle.latitud_completado && detalle.longitud_completado;

  const getDistanciaBadge = (metros) => {
    if (metros === null || metros === undefined) return null;
    if (metros <= 500) return { label: `${metros} m de la obra`, clase: "distancia-badge--cerca" };
    if (metros <= 2000) return { label: `${(metros / 1000).toFixed(1)} km de la obra`, clase: "distancia-badge--media" };
    return { label: `${(metros / 1000).toFixed(1)} km de la obra`, clase: "distancia-badge--lejos" };
  };

  const distanciaBadge = getDistanciaBadge(detalle.distancia_obra_metros);

  const viajesOrdenados = [...(detalle.vale_renta_viajes || [])].sort(
    (a, b) => a.numero_viaje - b.numero_viaje,
  );

  return (
    <div className="vale-section">
      <h3 className="section-title">SERVICIO DE RENTA</h3>

      {/* Foto de evidencia full-width */}
      {tieneFoto ? (
        <div
          className="viaje-item__foto-full"
          style={{ marginBottom: 12, borderRadius: 8 }}
          onClick={() => setFotoModal(true)}
        >
          <img
            src={detalle.foto_evidencia_url}
            alt="Evidencia de renta"
            className="viaje-item__foto-img"
          />
          <button
            className="viaje-item__foto-btn"
            onClick={(e) => { e.stopPropagation(); setFotoModal(true); }}
            aria-label="Ver foto completa"
          >
            <Expand size={13} />
            Ampliar
          </button>
          {tieneGeo && (
            <a
              href={`https://www.google.com/maps?q=${detalle.latitud_completado},${detalle.longitud_completado}`}
              target="_blank"
              rel="noopener noreferrer"
              className="viaje-item__foto-geo"
              onClick={(e) => e.stopPropagation()}
            >
              <MapPin size={12} />
              Ver en mapa
            </a>
          )}
          {distanciaBadge && (
            <span
              className={`distancia-badge ${distanciaBadge.clase}`}
              style={{ position: "absolute", top: 8, right: 8 }}
            >
              <MapPin size={10} />
              {distanciaBadge.label}
            </span>
          )}
        </div>
      ) : (
        <div className="viaje-item__foto-empty" style={{ marginBottom: 12, borderRadius: 8 }}>
          <ImageOff size={20} />
          <span>Sin foto de evidencia</span>
          {tieneGeo && (
            <a
              href={`https://www.google.com/maps?q=${detalle.latitud_completado},${detalle.longitud_completado}`}
              target="_blank"
              rel="noopener noreferrer"
              className="viaje-item__mapa-link"
            >
              <MapPin size={12} />
              Ver ubicación
            </a>
          )}
        </div>
      )}

      {/* Datos del servicio */}
      <div className="info-full">
        <span className="info-label">Material Movido:</span>
        <span className="info-value">
          {detalle.material?.material || "N/A"}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Capacidad:</span>
        <span className="info-value">
          {formatearVolumen(detalle.capacidad_m3)}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Núm. Viajes:</span>
        <span className="info-value">{detalle.numero_viajes || 1}</span>
      </div>

      <div className="divider-thin"></div>

      <div className="info-row">
        <span className="info-label">Hora Inicio:</span>
        <span className="info-value">
          {detalle.hora_inicio ? formatearHora(detalle.hora_inicio) : "N/A"}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Hora Fin:</span>
        <span className="info-value">
          {esRentaPorDia
            ? "Día completo"
            : detalle.hora_fin
              ? formatearHora(detalle.hora_fin)
              : "Pendiente"}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Total Horas:</span>
        <span className="info-value">
          {esRentaPorDia ? "N/A" : `${detalle.total_horas || 0} hrs`}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Total Días:</span>
        <span className="info-value">
          {esRentaPorDia
            ? totalDias === 0.5
              ? "0.5 días (medio día)"
              : `${totalDias} ${totalDias === 1 ? "día" : "días"}`
            : "N/A"}
        </span>
      </div>

      {/* Precios: solo si tiene permiso */}
      {mostrarPrecios && (
        <>
          <div className="divider-thin"></div>

          {detalle.precios_renta?.costo_hr && (
            <div className="info-row">
              <span className="info-label">Tarifa/Hora:</span>
              <span className="info-value">
                {formatearMoneda(detalle.precios_renta.costo_hr)}
              </span>
            </div>
          )}

          {detalle.precios_renta?.costo_dia && (
            <div className="info-row">
              <span className="info-label">Tarifa/Día:</span>
              <span className="info-value">
                {formatearMoneda(detalle.precios_renta.costo_dia)}
              </span>
            </div>
          )}

          {detalle.costo_total && (
            <div className="info-row info-row-total">
              <span className="info-label">Costo Total:</span>
              <span className="info-value">
                {formatearMoneda(detalle.costo_total)} MXN
              </span>
            </div>
          )}
        </>
      )}

      {detalle.notas_adicionales && (
        <div className="info-full" style={{ marginTop: "8px" }}>
          <span className="info-label">Notas:</span>
          <span className="info-value">{detalle.notas_adicionales}</span>
        </div>
      )}

      {/* Tabla de viajes */}
      {viajesOrdenados.length > 0 && (
        <div className="viajes-renta">
          <div className="viajes-renta__header">
            <Clock size={14} />
            <span>Registro de viajes</span>
            <span className="viajes-renta__count">
              {viajesOrdenados.length}
            </span>
          </div>

          <div className="viajes-renta__tabla">
            <div className="viajes-renta__fila viajes-renta__fila--header">
              <span>#</span>
              <span>Hora de registro</span>
              <span>Material</span>
              <span>Registrado por</span>
            </div>

            {viajesOrdenados.map((viaje) => {
              const registrador = viaje.persona_registro;
              const nombreRegistrador = registrador
                ? `${registrador.nombre} ${registrador.primer_apellido}`
                : "N/A";

              return (
                <div key={viaje.id_viaje} className="viajes-renta__fila">
                  <span className="viajes-renta__num">
                    {viaje.numero_viaje}
                  </span>
                  <span className="viajes-renta__hora">
                    {formatearHora(viaje.hora_registro)}
                  </span>
                  <span className="viajes-renta__material">
                    {materialDeViaje(
                      ticketsMaterialMap,
                      viaje,
                      detalle.material?.material,
                    )}
                  </span>
                  <span className="viajes-renta__persona">
                    {nombreRegistrador}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal foto ampliada */}
      {fotoModal && (
        <div
          className="foto-modal-overlay"
          onClick={() => setFotoModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Foto de evidencia ampliada"
        >
          <div className="foto-modal-contenido" onClick={(e) => e.stopPropagation()}>
            <button
              className="foto-modal-cerrar"
              onClick={() => setFotoModal(false)}
              aria-label="Cerrar foto"
            >
              <X size={20} />
            </button>
            <div className="foto-modal-titulo">Evidencia de renta</div>
            <img
              src={detalle.foto_evidencia_url}
              alt="Evidencia de renta"
              className="foto-modal-imagen"
            />
            {distanciaBadge && (
              <div className={`foto-modal-distancia ${distanciaBadge.clase}`}>
                <MapPin size={14} />
                {distanciaBadge.label}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetallesRenta;
