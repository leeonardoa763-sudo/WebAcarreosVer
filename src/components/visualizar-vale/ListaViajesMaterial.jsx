/**
 * src/components/visualizar-vale/ListaViajesMaterial.jsx
 *
 * Lista de viajes registrados para un vale de material en la página pública
 * Muestra foto de evidencia, badge de distancia a la obra y datos de cada viaje
 * Incluye modal de foto ampliada
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
   * Calcular badge de proximidad a la obra según distancia en metros
   */
  const getDistanciaBadge = (metros) => {
    if (metros === null || metros === undefined) return null;
    if (metros <= 500)
      return {
        label: `${metros} m de la obra`,
        clase: "distancia-badge--cerca",
      };
    if (metros <= 2000)
      return {
        label: `${(metros / 1000).toFixed(1)} km de la obra`,
        clase: "distancia-badge--media",
      };
    return {
      label: `${(metros / 1000).toFixed(1)} km de la obra`,
      clase: "distancia-badge--lejos",
    };
  };

  return (
    <>
      <div className="divider"></div>

      <div className="vale-section">
        <h3 className="section-title">
          VIAJES REGISTRADOS
          <span className="viajes-count-badge">{detalles.length}</span>
        </h3>

        <div className="viajes-lista">
          {detalles.map((detalle, idx) => {
            const distanciaBadge = getDistanciaBadge(
              detalle.distancia_obra_metros,
            );
            const tieneGeo =
              detalle.latitud_completado && detalle.longitud_completado;
            const tieneFoto = Boolean(detalle.foto_evidencia_url);

            return (
              <div key={detalle.id_viaje ?? idx} className="viaje-item">
                {/* Cabecera del viaje */}
                <div className="viaje-item__header">
                  <div className="viaje-item__numero">
                    <span className="viaje-item__numero-label">Viaje</span>
                    <span className="viaje-item__numero-valor">
                      {detalle.numero_viaje ?? idx + 1}
                    </span>
                    {detalles.length > 1 && (
                      <span className="viaje-item__numero-total">
                        / {detalles.length}
                      </span>
                    )}
                  </div>

                  <div className="viaje-item__header-badges">
                    {distanciaBadge && (
                      <span
                        className={`distancia-badge ${distanciaBadge.clase}`}
                      >
                        <MapPin size={11} />
                        {distanciaBadge.label}
                      </span>
                    )}
                    {detalle.material?.tipo_de_material?.tipo_de_material && (
                      <span className="tipo-material-badge">
                        {detalle.material.tipo_de_material.tipo_de_material}
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
                          alt={`Evidencia viaje ${idx + 1}`}
                          className="viaje-item__foto"
                          onClick={() =>
                            setFotoModal({
                              url: detalle.foto_evidencia_url,
                              indice: idx,
                              distanciaBadge,
                            })
                          }
                        />
                        <button
                          className="viaje-item__foto-btn"
                          onClick={() =>
                            setFotoModal({
                              url: detalle.foto_evidencia_url,
                              indice: idx,
                              distanciaBadge,
                            })
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

                    {/* Link a mapa si tiene coordenadas */}
                    {tieneGeo && (
                      <a
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

                    {/* Banco */}
                    {detalle.bancos?.banco && (
                      <div className="viaje-item__dato">
                        <span className="viaje-item__dato-label">Banco</span>
                        <span className="viaje-item__dato-valor">
                          {detalle.bancos.banco}
                        </span>
                      </div>
                    )}

                    {/* Capacidad (siempre del detalle padre) */}
                    <div className="viaje-item__dato">
                      <span className="viaje-item__dato-label">Capacidad</span>
                      <span className="viaje-item__dato-valor">
                        {formatearVolumen(detalle.capacidad_m3)}
                      </span>
                    </div>

                    {/* Distancia de trayecto */}
                    <div className="viaje-item__dato">
                      <span className="viaje-item__dato-label">
                        Dist. trayecto
                      </span>
                      <span className="viaje-item__dato-valor">
                        {detalle.distancia_km || 0} km
                      </span>
                    </div>

                    {/* Hora de llegada (hora_registro del viaje) */}
                    {detalle.hora_registro && (
                      <div className="viaje-item__dato">
                        <span className="viaje-item__dato-label">
                          <Clock
                            size={10}
                            style={{ display: "inline", marginRight: 2 }}
                          />
                          Llegada
                        </span>
                        <span className="viaje-item__dato-valor">
                          {formatearHora(detalle.hora_registro)}
                        </span>
                      </div>
                    )}

                    <div className="viaje-item__separador" />

                    {/* Volumen real */}
                    {detalle.volumen_real_m3 && (
                      <div className="viaje-item__dato">
                        <span className="viaje-item__dato-label">
                          Vol. Real
                        </span>
                        <span className="viaje-item__dato-valor viaje-item__dato-valor--highlight">
                          {formatearVolumen(detalle.volumen_real_m3)}
                        </span>
                      </div>
                    )}

                    {/* Peso */}
                    {detalle.peso_ton && (
                      <div className="viaje-item__dato">
                        <span className="viaje-item__dato-label">Peso</span>
                        <span className="viaje-item__dato-valor">
                          {formatearPeso(detalle.peso_ton)}
                        </span>
                      </div>
                    )}

                    {/* Folio banco */}
                    {detalle.folio_banco && (
                      <div className="viaje-item__dato">
                        <span className="viaje-item__dato-label">
                          Folio banco
                        </span>
                        <span className="viaje-item__dato-valor">
                          {detalle.folio_banco}
                        </span>
                      </div>
                    )}

                    {/* Importe: solo si tiene permiso */}
                    {mostrarPrecios && detalle.costo_total && (
                      <>
                        <div className="viaje-item__separador" />
                        <div className="viaje-item__dato viaje-item__dato--costo">
                          <span className="viaje-item__dato-label">
                            Importe
                          </span>
                          <span className="viaje-item__dato-valor viaje-item__dato-valor--costo">
                            {formatearMoneda(detalle.costo_total)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Notas del viaje */}
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
              <div
                className={`foto-modal-distancia ${fotoModal.distanciaBadge.clase}`}
              >
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
