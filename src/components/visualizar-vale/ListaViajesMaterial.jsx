/**
 * src/components/visualizar-vale/ListaViajesMaterial.jsx
 *
 * Lista de viajes registrados para un vale de material en la página pública.
 * Recibe vale_material_detalles con vale_material_viajes anidados y los aplana.
 * Cada viaje muestra: foto full-width, banco, material, remisión y grid de
 * datos numéricos. Tipo 3 (corte) no tiene vale_material_viajes — su remisión
 * sale de tickets_material (recibido aparte, a nivel vale).
 *
 * Dependencias: formatters, excepcionesVale, lucide-react, visualizar-vale.css
 * Usado en: VisualizarVale.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import { MapPin, Expand, ImageOff, X, Clock, Timer, CameraOff } from "lucide-react";

// 3. Utils
import {
  formatearMoneda,
  formatearVolumen,
  formatearPeso,
  formatearHora,
} from "../../utils/formatters";
import {
  etiquetaMotivo,
  MOTIVOS_ANTICIPADO,
  MOTIVOS_SIN_FOTO,
} from "../../utils/excepcionesVale";

const ListaViajesMaterial = ({
  detalles,
  mostrarPrecios,
  vehiculoCapacidad,
  ticketsMaterial = [],
}) => {
  const [fotoModal, setFotoModal] = useState(null);

  const viajesAplanados = detalles.flatMap((detalle) => {
    const viajes = detalle.vale_material_viajes || [];
    if (viajes.length === 0) {
      return [{ ...detalle, _esFallback: true, _detallePadre: detalle }];
    }
    return viajes.map((viaje) => ({
      ...viaje,
      _esFallback: false,
      _detallePadre: detalle,
    }));
  });

  const getDistanciaBadge = (metros) => {
    if (metros === null || metros === undefined) return null;
    if (metros <= 500) return { label: `${metros} m de la obra`, clase: "distancia-badge--cerca" };
    if (metros <= 2000) return { label: `${(metros / 1000).toFixed(1)} km de la obra`, clase: "distancia-badge--media" };
    return { label: `${(metros / 1000).toFixed(1)} km de la obra`, clase: "distancia-badge--lejos" };
  };

  const getBancoEfectivo = (viaje) => {
    if (viaje._esFallback) return viaje._detallePadre.bancos?.banco || null;
    return viaje.bancos_override?.banco || viaje._detallePadre.bancos?.banco || null;
  };

  const getDistanciaEfectiva = (viaje) => {
    if (viaje._esFallback) return viaje._detallePadre.distancia_km || 0;
    return viaje.distancia_km_override ?? viaje._detallePadre.distancia_km ?? 0;
  };

  const getCostoEfectivo = (viaje) => {
    if (viaje._esFallback) return viaje._detallePadre.costo_total || 0;
    return Number(viaje.costo_viaje_override ?? viaje.costo_viaje ?? 0);
  };

  return (
    <>
      <div className="divider" />

      <div className="vale-section">
        <h3 className="section-title">
          VIAJES REGISTRADOS
          <span className="viajes-count-badge">{viajesAplanados.length}</span>
        </h3>

        <div className="viajes-lista">
          {viajesAplanados.map((viaje, idx) => {
            const detalle = viaje._detallePadre;
            const bancoEfectivo = getBancoEfectivo(viaje);
            const distanciaEfectiva = getDistanciaEfectiva(viaje);
            const costoEfectivo = getCostoEfectivo(viaje);

            const fotoUrl = (!viaje._esFallback && viaje.foto_evidencia_url)
              ? viaje.foto_evidencia_url
              : detalle.foto_evidencia_url;
            const tieneFoto = Boolean(fotoUrl);

            const latEfectiva = (!viaje._esFallback && viaje.latitud_registro)
              ? viaje.latitud_registro
              : detalle.latitud_completado;
            const lngEfectiva = (!viaje._esFallback && viaje.longitud_registro)
              ? viaje.longitud_registro
              : detalle.longitud_completado;
            const tieneGeo = latEfectiva && lngEfectiva;

            const distanciaObra = (!viaje._esFallback && viaje.distancia_obra_metros != null)
              ? viaje.distancia_obra_metros
              : detalle.distancia_obra_metros;
            const distanciaBadge = getDistanciaBadge(distanciaObra);

            const capacidadMostrar = detalle.capacidad_m3 || vehiculoCapacidad;
            const numeroViaje = viaje._esFallback ? idx + 1 : (viaje.numero_viaje ?? idx + 1);
            const horaRegistro = viaje._esFallback ? null : viaje.hora_registro;
            const volumenMostrar = viaje._esFallback ? detalle.volumen_real_m3 : viaje.volumen_m3;
            const pesoMostrar = viaje._esFallback ? detalle.peso_ton : viaje.peso_ton;
            const idTipoDetalle =
              detalle.material?.tipo_de_material?.id_tipo_de_material;
            // Tipo 3 (corte) no registra vale_material_viajes — su remisión
            // son los tickets_material impresos para el vale completo
            const remisionTipo3 =
              idTipoDetalle === 3 && ticketsMaterial.length > 0
                ? ticketsMaterial
                    .map((t) => t.folio_ticket || t.numero_ticket)
                    .filter(Boolean)
                    .join(", ")
                : null;
            // viaje.folio_vale_fisico ya viene resuelto tanto en el viaje real
            // como en los objetos pre-aplanados de VisualizarConciliacion.jsx
            // (donde todo llega marcado _esFallback aunque sí sea un viaje real)
            const folioFisico = viaje.folio_vale_fisico || remisionTipo3;
            const tieneOverride = !viaje._esFallback && (viaje.id_banco_override || viaje.distancia_km_override);

            return (
              <div key={viaje.id_viaje ?? idx} className="viaje-item">
                {/* ── Header ── */}
                <div className="viaje-item__header">
                  <div className="viaje-item__numero">
                    <span className="viaje-item__numero-label">Viaje</span>
                    <span className="viaje-item__numero-valor">{numeroViaje}</span>
                    <span className="viaje-item__numero-total">/ {viajesAplanados.length}</span>
                  </div>
                  <div className="viaje-item__header-badges">
                    {distanciaBadge && (
                      <span className={`distancia-badge ${distanciaBadge.clase}`}>
                        <MapPin size={11} />
                        {distanciaBadge.label}
                      </span>
                    )}
                    {detalle.material?.tipo_de_material?.tipo_de_material && (
                      <span className="tipo-material-badge">
                        {detalle.material.tipo_de_material.tipo_de_material}
                      </span>
                    )}
                    {tieneOverride && (
                      <span className="tipo-material-badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                        Override
                      </span>
                    )}
                    {viaje.registro_anticipado && (
                      <span
                        className="excepcion-badge"
                        title={`Registrado antes del tiempo mínimo — ${etiquetaMotivo(MOTIVOS_ANTICIPADO, viaje.motivo_anticipado_codigo)}`}
                      >
                        <Timer size={11} />
                        Apresurado
                      </span>
                    )}
                    {viaje.foto_omitida && (
                      <span className="excepcion-badge">
                        <CameraOff size={11} />
                        Sin foto
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Foto de evidencia full-width ── */}
                {tieneFoto ? (
                  <div
                    className="viaje-item__foto-full"
                    onClick={() => setFotoModal({ url: fotoUrl, indice: idx, distanciaBadge })}
                  >
                    <img
                      src={fotoUrl}
                      alt={`Evidencia viaje ${numeroViaje}`}
                      className="viaje-item__foto-img"
                    />
                    <button
                      className="viaje-item__foto-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFotoModal({ url: fotoUrl, indice: idx, distanciaBadge });
                      }}
                      aria-label="Ver foto completa"
                    >
                      <Expand size={13} />
                      Ampliar
                    </button>
                    {tieneGeo && (
                      <a
                        href={`https://www.google.com/maps?q=${latEfectiva},${lngEfectiva}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="viaje-item__foto-geo"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MapPin size={12} />
                        Ver en mapa
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="viaje-item__foto-empty">
                    <ImageOff size={22} />
                    <span>Sin foto de evidencia</span>
                    {/* Si la omision fue declarada en la app, el motivo es
                        exactamente lo que este campo existe para responder */}
                    {viaje.foto_omitida && (
                      <span className="viaje-item__foto-motivo">
                        {etiquetaMotivo(MOTIVOS_SIN_FOTO, viaje.motivo_sin_foto_codigo)}
                        {viaje.motivo_sin_foto_texto
                          ? ` — ${viaje.motivo_sin_foto_texto}`
                          : ""}
                      </span>
                    )}
                    {tieneGeo && (
                      <a
                        href={`https://www.google.com/maps?q=${latEfectiva},${lngEfectiva}`}
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

                {/* ── Datos del viaje ── */}
                <div className="viaje-item__info">
                  {/* Filas full-width para texto */}
                  <div className="viaje-item__dato">
                    <span className="viaje-item__dato-label">Material</span>
                    <span className="viaje-item__dato-valor">{detalle.material?.material || "N/A"}</span>
                  </div>

                  {bancoEfectivo && (
                    <div className="viaje-item__dato">
                      <span className="viaje-item__dato-label">Banco</span>
                      <span className="viaje-item__dato-valor">{bancoEfectivo}</span>
                    </div>
                  )}

                  {folioFisico && (
                    <div className="viaje-item__dato">
                      <span className="viaje-item__dato-label">Remisión</span>
                      <span className="viaje-item__dato-valor">{folioFisico}</span>
                    </div>
                  )}

                  {detalle.folio_banco && (
                    <div className="viaje-item__dato">
                      <span className="viaje-item__dato-label">Folio banco</span>
                      <span className="viaje-item__dato-valor">{detalle.folio_banco}</span>
                    </div>
                  )}

                  <div className="viaje-item__separador" />

                  {/* Grid 2 columnas para valores numéricos */}
                  <div className="viaje-item__grid">
                    {capacidadMostrar && (
                      <div className="viaje-item__cell">
                        <span className="viaje-item__cell-label">Capacidad</span>
                        <span className="viaje-item__cell-valor">{formatearVolumen(capacidadMostrar)}</span>
                      </div>
                    )}

                    <div className="viaje-item__cell">
                      <span className="viaje-item__cell-label">Dist. trayecto</span>
                      <span className="viaje-item__cell-valor">{distanciaEfectiva} km</span>
                    </div>

                    {volumenMostrar != null && (
                      <div className="viaje-item__cell">
                        <span className="viaje-item__cell-label">Vol. Real</span>
                        <span className="viaje-item__cell-valor viaje-item__cell-valor--highlight">
                          {formatearVolumen(volumenMostrar)}
                        </span>
                      </div>
                    )}

                    {pesoMostrar != null && (
                      <div className="viaje-item__cell">
                        <span className="viaje-item__cell-label">Peso</span>
                        <span className="viaje-item__cell-valor">{formatearPeso(pesoMostrar)}</span>
                      </div>
                    )}

                    {horaRegistro && (
                      <div className="viaje-item__cell">
                        <span className="viaje-item__cell-label">
                          <Clock size={9} style={{ display: "inline", marginRight: 2 }} />
                          Hora llegada
                        </span>
                        <span className="viaje-item__cell-valor">{formatearHora(horaRegistro)}</span>
                      </div>
                    )}
                  </div>

                  {/* Importe del viaje */}
                  {mostrarPrecios && costoEfectivo > 0 && (
                    <div className="viaje-item__costo">
                      <span className="viaje-item__costo-label">Importe viaje</span>
                      <span className="viaje-item__costo-valor">{formatearMoneda(costoEfectivo)}</span>
                    </div>
                  )}
                </div>

                {/* Notas del detalle padre */}
                {detalle.notas_adicionales && (
                  <div className="viaje-item__notas">
                    <span className="viaje-item__notas-label">Notas:</span>
                    <span className="viaje-item__notas-texto">{detalle.notas_adicionales}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal foto ampliada */}
      {fotoModal && (
        <div
          className="foto-modal-overlay"
          onClick={() => setFotoModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Foto de evidencia ampliada"
        >
          <div className="foto-modal-contenido" onClick={(e) => e.stopPropagation()}>
            <button
              className="foto-modal-cerrar"
              onClick={() => setFotoModal(null)}
              aria-label="Cerrar foto"
            >
              <X size={20} />
            </button>
            <div className="foto-modal-titulo">
              Evidencia — Viaje {fotoModal.indice + 1}
            </div>
            <img
              src={fotoModal.url}
              alt={`Evidencia viaje ${fotoModal.indice + 1}`}
              className="foto-modal-imagen"
            />
            {fotoModal.distanciaBadge && (
              <div className={`foto-modal-distancia ${fotoModal.distanciaBadge.clase}`}>
                <MapPin size={14} />
                {fotoModal.distanciaBadge.label}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ListaViajesMaterial;
