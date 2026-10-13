/**
 * src/components/conciliaciones/ModalSolicitudDesconciliacion.jsx
 *
 * Modal para solicitar y responder la reversión de una conciliación.
 * Modo 'crear': Admin llena el motivo y envía la solicitud al sindicato
 * Modo 'responder': Sindicato aprueba o rechaza
 *
 * Reutiliza los estilos msd__ de ModalSolicitudDesver (mismo flujo, misma UI).
 *
 * Dependencias: hooks/conciliaciones/useSolicitudesDesconciliacion.js, lucide-react
 * Usado en: components/dashboard/ModalVistaPreviewConciliacion.jsx
 */

import { useState } from "react";
import { AlertTriangle, Undo2, X } from "lucide-react";
import { useSolicitudesDesconciliacion } from "../../hooks/conciliaciones/useSolicitudesDesconciliacion";
import "../../styles/ModalSolicitudDesver.css";

const MOTIVO_MINIMO = 10;

const ModalSolicitudDesconciliacion = ({
  conciliacion,
  solicitud,
  modo,
  onCerrar,
  onExitoso,
}) => {
  const { crearSolicitud, responderSolicitud, loading, error, setError } =
    useSolicitudesDesconciliacion();

  const [motivo, setMotivo] = useState("");
  const [motivoRespuesta, setMotivoRespuesta] = useState("");

  const sindicatoNombre = conciliacion?.sindicatos?.sindicato || "No disponible";

  const handleSubmitCrear = async (e) => {
    e.preventDefault();
    setError(null);

    if (motivo.trim().length < MOTIVO_MINIMO) {
      setError(`El motivo debe tener al menos ${MOTIVO_MINIMO} caracteres`);
      return;
    }

    const resultado = await crearSolicitud(conciliacion.id_conciliacion, motivo);
    if (resultado.success) onExitoso({ aprobado: false });
  };

  const handleResponder = async (aprobado) => {
    setError(null);
    const resultado = await responderSolicitud(
      solicitud.id_solicitud,
      aprobado,
      motivoRespuesta,
    );
    if (resultado.success) onExitoso({ aprobado });
  };

  return (
    <div
      className="msd__overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && !loading && onCerrar()}
    >
      <div className="msd__panel">
        <div className="msd__header">
          <div className="msd__header-left">
            <Undo2
              size={16}
              className={
                modo === "responder"
                  ? "msd__header-icon msd__header-icon--responder"
                  : "msd__header-icon"
              }
            />
            <h2 className="msd__titulo">
              {modo === "crear"
                ? "Solicitar deshacer conciliación"
                : "Responder solicitud"}
            </h2>
          </div>
          <button
            type="button"
            className="msd__cerrar"
            onClick={onCerrar}
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={modo === "crear" ? handleSubmitCrear : (e) => e.preventDefault()}>
          <div className="msd__body">
            <div className="msd__info-grid">
              <div className="msd__info-fila">
                <span className="msd__info-label">Folio</span>
                <span className="msd__info-valor">{conciliacion.folio}</span>
              </div>
              <div className="msd__info-fila">
                <span className="msd__info-label">Obra</span>
                <span className="msd__info-valor">{conciliacion.obras?.obra}</span>
              </div>
              <div className="msd__info-fila">
                <span className="msd__info-label">Total</span>
                <span className="msd__info-valor">
                  $
                  {Number(conciliacion.total_final || 0).toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              {modo === "crear" ? (
                <div className="msd__info-fila">
                  <span className="msd__info-label">Aprueba</span>
                  <span className="msd__info-valor">{sindicatoNombre}</span>
                </div>
              ) : (
                <>
                  <div className="msd__info-fila">
                    <span className="msd__info-label">Solicitado por</span>
                    <span className="msd__info-valor">
                      {solicitud?.persona_solicitante?.nombre}{" "}
                      {solicitud?.persona_solicitante?.primer_apellido}
                    </span>
                  </div>
                  <div className="msd__info-fila">
                    <span className="msd__info-label">Fecha</span>
                    <span className="msd__info-valor">
                      {new Date(solicitud?.fecha_solicitud).toLocaleDateString("es-MX")}
                    </span>
                  </div>
                </>
              )}
            </div>

            {modo === "crear" && solicitud?.estado === "rechazada" && (
              <div className="msd__motivo-solicitante">
                <div className="msd__motivo-label">Motivo del rechazo anterior</div>
                <p className="msd__motivo-texto">
                  {solicitud.motivo_respuesta || "Sin motivo especificado"}
                </p>
              </div>
            )}

            {modo === "responder" && (
              <div className="msd__motivo-solicitante">
                <div className="msd__motivo-label">Motivo de la solicitud</div>
                <p className="msd__motivo-texto">{solicitud?.motivo_solicitud}</p>
              </div>
            )}

            <div className="msd__advertencia">
              <AlertTriangle size={16} />
              <p>
                {modo === "crear" ? "Si el sindicato aprueba" : "Si apruebas"}, la
                conciliación {conciliacion.folio} se elimina y sus vales regresan a
                "verificado" para poder conciliarse de nuevo. El folio no se
                reutiliza. Esta acción es irreversible.
              </p>
            </div>

            {modo === "crear" ? (
              <div className="msd__campo">
                <label htmlFor="motivo-desconciliar" className="msd__label">
                  Motivo
                </label>
                <textarea
                  id="motivo-desconciliar"
                  className="msd__textarea"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Explica qué error tiene la conciliación..."
                  disabled={loading}
                />
                <span className="msd__contador">{motivo.length} caracteres</span>
              </div>
            ) : (
              <div className="msd__campo">
                <label htmlFor="motivo-respuesta-desc" className="msd__label">
                  Motivo de tu respuesta{" "}
                  <span className="msd__label--opcional">(opcional)</span>
                </label>
                <textarea
                  id="motivo-respuesta-desc"
                  className="msd__textarea"
                  value={motivoRespuesta}
                  onChange={(e) => setMotivoRespuesta(e.target.value)}
                  placeholder="Ejemplo: si rechazas, explica por qué..."
                  disabled={loading}
                />
              </div>
            )}

            {error && <p className="msd__error">{error}</p>}

            <div className="msd__acciones">
              {modo === "crear" ? (
                <>
                  <button
                    type="button"
                    className="msd__btn msd__btn--secundario"
                    onClick={onCerrar}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="msd__btn msd__btn--enviar"
                    disabled={loading}
                  >
                    {loading ? "Enviando..." : "Enviar solicitud"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="msd__btn msd__btn--secundario"
                    onClick={onCerrar}
                    disabled={loading}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    className="msd__btn msd__btn--rechazar"
                    onClick={() => handleResponder(false)}
                    disabled={loading}
                  >
                    {loading ? "Procesando..." : "Rechazar"}
                  </button>
                  <button
                    type="button"
                    className="msd__btn msd__btn--aprobar"
                    onClick={() => handleResponder(true)}
                    disabled={loading}
                  >
                    {loading ? "Procesando..." : "Aprobar"}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalSolicitudDesconciliacion;
