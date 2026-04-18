/**
 * src/components/visualizar-vale/ListaViajesMaterial.jsx
 *
 * Lista de viajes registrados para un vale de material en la página pública.
 * Aplana vale_material_viajes de todos los detalles y renderiza uno por uno.
 * Cada viaje hereda el contexto del detalle padre (foto, banco, capacidad, etc.)
 *
 * Dependencias: formatters, lucide-react, visualizar-vale.css
 * Usado en: VisualizarVale.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import { MapPin, Expand, ImageOff, X, Clock } from "lucide-react";

// 3. Utils
import {
  formatearMoneda,
  formatearVolumen,
  formatearPeso,
  formatearHora,
} from "../../utils/formatters";

const ListaViajesMaterial = ({ detalles, mostrarPrecios }) => {
  const [fotoModal, setFotoModal] = useState(null);

  /**
   * Aplanar todos los viajes de todos los detalles en una sola lista,
   * adjuntando el detalle padre a cada viaje para acceder a foto, banco, etc.
   *
   * Si un detalle no tiene viajes registrados aún, se incluye el detalle
   * como fallback (compatibilidad con vales incompletos).
   */
  const viajesAplanados = detalles.flatMap((detalle) => {
    const viajes = detalle.vale_material_viajes || [];

    // Sin viajes registrados: mostrar el detalle como fila de resumen
    if (viajes.length === 0) {
      return [{ ...detalle, _esFallback: true, _detallePadre: detalle }];
    }

    // Con viajes: uno por cada registro en vale_material_viajes
    return viajes.map((viaje) => ({
      ...viaje,
      _esFallback: false,
      _detallePadre: detalle,
    }));
  });

  /**
   * Calcular badge de proximidad a la obra según distancia en metros
   */
  const getDistanciaBadge = (metros) => {
    if (metros === null || metros === undefined) return null;
    if (metros <= 500)
      return { label: `${metros} m de la obra`, clase: "distancia-badge--cerca" };
    if (metros <= 2000)
      return { label: `${(metros / 1000).toFixed(1)} km de la obra`, clase: "distancia-badge--media" };
    return { label: `${(metros / 1000).toFixed(1)} km de la obra`, clase: "distancia-badge--lejos" };
  };

  /**
   * Resolver el banco efectivo de un viaje:
   * - Tipo 3 puede tener banco override por viaje
   * - Si no, usar el banco del detalle padre
   */
  const getBancoEfectivo = (viaje) => {
    if (viaje._esFallback) return viaje._detallePadre.bancos?.banco || null;
    return viaje.bancos_override?.banco || viaje._detallePadre.bancos?.banco || null;
  };

  /**
   * Resolver la distancia efectiva de un viaje:
   * - Tipo 3 puede tener distancia override por viaje
   * - Si no, usar la del detalle padre
   */
  const getDistanciaEfectiva = (viaje) => {
    if (viaje._esFallback) return viaje._detallePadre.distancia_km || 0;
    return viaje.distancia_km_override ?? viaje._detallePadre.distancia_km ?? 0;
  };

  /**
   * Resolver el costo efectivo de un viaje:
   * - Usa costo_viaje_override si existe (tipo 3 con override)
   * - Si no, usa costo_viaje normal
   * - Fallback: costo_total del detalle padre
   */
  const getCostoEfectivo = (viaje) => {
    if (viaje._esFallback) return viaje._detallePadre.costo_total || 0;
    return Number(viaje.costo_viaje_override ?? viaje.costo_viaje ?? 0);
  };

  return (
    <>
      <div className="divider"></div>

      <div className="vale-section">
        <h3 className="section-title">
          VIAJES REGISTRADOS
          {/* Contador correcto: total de viajes aplanados */}
          <span className="viajes-count-badge">{viajesAplanados.length}</span>
        </h3>

        <div className="viajes-lista">
          {viajesAplanados.map((viaje, idx) => {
            const detalle = viaje._detallePadre;
            const bancoEfectivo = getBancoEfectivo(viaje);
            const distanciaEfectiva = getDistanciaEfectiva(viaje);
            const costoEfectivo = getCostoEfectivo(viaje);

            // La foto y geo siempre vienen del detalle padre
            const distanciaBadge = getDistanciaBadge(detalle.distancia_obra_metros);
            const tieneGeo = detalle.latitud_completado && detalle.longitud_completado;
            const tieneFoto = Boolean(detalle.foto_evidencia_url);

            // Número de viaje: usar el del registro o idx+1 como fallback
            const numeroViaje = viaje._esFallback
              ? idx + 1
              : (viaje.numero_viaje ?? idx + 1);

            // Hora de llegada: del viaje individual
            const horaRegistro = viaje._esFallback
              ? null
              : viaje.hora_registro;

            // Volumen: del viaje individual (volumen_m3) o del detalle (volumen_real_m3)
            const volumenMostrar = viaje._esFallback
              ? detalle.volumen_real_m3
              : viaje.volumen_m3;

            // Peso: del viaje individual o del detalle
            const pesoMostrar = viaje._esFallback
              ? detalle.peso_ton
              : viaje.peso_ton;

            // Folio físico del viaje (tipo 1 y 2)
            const folioFisico = viaje._esFallback ? null : viaje.folio_vale_fisico;

            // Indicar si tiene override de banco o distancia (tipo 3)
            const tieneOverride = !viaje._esFallback &&
              (viaje.id_banco_override || viaje.distancia_km_override);

            return (
              <div key={viaje.id_viaje ?? idx} className="viaje-item">
                {/* Cabecera del viaje */}
                <div className="viaje-item__header">
                  <div className="viaje-item__numero">
                    <span className="viaje-item__numero-label">Viaje</span>
                    <span className="viaje-item__numero-valor">{numeroViaje}</span>
                    <span className="viaje-item__numero-total">
                      / {viajesAplanados.length}
                    </span>
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
                    {/* Badge visual cuando el viaje tiene banco/distancia diferente al vale */}
                    {tieneOverride && (
                      <span className="tipo-material-badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                        Override
                      </span>
                    )}
                  </div>
                </div>

                {/* Cuerpo: foto + datos */}
                <div className="viaje-item__body">
                  {/* Columna izquierda: foto de evidencia */}
                  <div className="viaje-item__foto-col">
                    {tieneFoto ? (
                      <div className="viaje-item__foto-wrapper">
                        <img
                          src={detalle.foto_evidencia_url}
                          alt={`Evidencia viaje ${numeroViaje}`}
                          className="viaje-item__foto"
                          onClick={() =>
                            setFotoModal({ url: detalle.foto_evidencia_url, indice: idx, distanciaBadge })
                          }
                        />
                        <button
                          className="viaje-item__foto-btn"
                          onClick={() =>
                            setFotoModal({ url: detalle.foto_evidencia_url, indice: idx, distanciaBadge })
                          }
                          aria-label="Ver foto completa"
                        >
                          <Expand size={13} />
                          Ampliar
                        </button>
                      </div>
                    ) : (
                      <div className="viaje-item__foto-placeholder">
                        <ImageOff size={24} />
                        <span>Sin foto</span>
                      </div>
                    )}

                    {tieneGeo && (
                      
                        href={`https://www.google.com/maps?q=${detalle.latitud_completado},${detalle.longitud_completado}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="viaje-item__mapa-link"
                      >
                        <MapPin size={12} />
                        Ver en mapa
                      </a>
                    )}
                  </div>

                  {/* Columna derecha: datos del viaje */}
                  <div className="viaje-item__datos">
                    {/* Material */}
                    <div className="viaje-item__dato">
                      <span className="viaje-item__dato-label">Material</span>
                      <span className="viaje-item__dato-valor">
                        {detalle.material?.material || "N/A"}
                      </span>
                    </div>

                    {/* Banco efectivo (puede ser override en tipo 3) */}
                    {bancoEfectivo && (
                      <div className="viaje-item__dato">
                        <span className="viaje-item__dato-label">Banco</span>
                        <span className="viaje-item__dato-valor">{bancoEfectivo}</span>
                      </div>
                    )}

                    {/* Capacidad del detalle padre */}
                    <div className="viaje-item__dato">
                      <span className="viaje-item__dato-label">Capacidad</span>
                      <span className="viaje-item__dato-valor">
                        {formatearVolumen(detalle.capacidad_m3)}
                      </span>
                    </div>

                    {/* Distancia efectiva (puede ser override en tipo 3) */}
                    <div className="viaje-item__dato">
                      <span className="viaje-item__dato-label">Dist. trayecto</span>
                      <span className="viaje-item__dato-valor">
                        {distanciaEfectiva} km
                      </span>
                    </div>

                    {/* Hora de llegada del viaje individual */}
                    {horaRegistro && (
                      <div className="viaje-item__dato">
                        <span className="viaje-item__dato-label">
                          <Clock size={10} style={{ display: "inline", marginRight: 2 }} />
                          Llegada
                        </span>
                        <span className="viaje-item__dato-valor">
                          {formatearHora(horaRegistro)}
                        </span>
                      </div>
                    )}

                    {/* Folio físico del viaje (tipo 1 y 2) */}
                    {folioFisico && (
                      <div className="viaje-item__dato">
                        <span className="viaje-item__dato-label">Folio físico</span>
                        <span className="viaje-item__dato-valor">{folioFisico}</span>
                      </div>
                    )}

                    <div className="viaje-item__separador" />

                    {/* Volumen del viaje */}
                    {volumenMostrar && (
                      <div className="viaje-item__dato">
                        <span className="viaje-item__dato-label">Vol. Real</span>
                        <span className="viaje-item__dato-valor viaje-item__dato-valor--highlight">
                          {formatearVolumen(volumenMostrar)}
                        </span>
                      </div>
                    )}

                    {/* Peso del viaje (tipo 1 y 2) */}
                    {pesoMostrar && (
                      <div className="viaje-item__dato">
                        <span className="viaje-item__dato-label">Peso</span>
                        <span className="viaje-item__dato-valor">
                          {formatearPeso(pesoMostrar)}
                        </span>
                      </div>
                    )}

                    {/* Folio banco del detalle padre */}
                    {detalle.folio_banco && (
                      <div className="viaje-item__dato">
                        <span className="viaje-item__dato-label">Folio banco</span>
                        <span className="viaje-item__dato-valor">{detalle.folio_banco}</span>
                      </div>
                    )}

                    {/* Importe del viaje individual */}
                    {mostrarPrecios && costoEfectivo > 0 && (
                      <>
                        <div className="viaje-item__separador" />
                        <div className="viaje-item__dato viaje-item__dato--costo">
                          <span className="viaje-item__dato-label">Importe</span>
                          <span className="viaje-item__dato-valor viaje-item__dato-valor--costo">
                            {formatearMoneda(costoEfectivo)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Notas del detalle padre */}
                {detalle.notas_adicionales && (
                  <div className="viaje-item__notas">
                    <span className="viaje-item__notas-label">Notas:</span>
                    <span className="viaje-item__notas-texto">
                      {detalle.notas_adicionales}
                    </span>
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
          <div
            className="foto-modal-contenido"
            onClick={(e) => e.stopPropagation()}
          >
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