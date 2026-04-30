/**
 * src/components/vales/ModalSolicitudDesver.jsx
 *
 * Modal para crear y responder solicitudes de desverificación de vales.
 * Modo 'crear': Admin llena motivo y envía solicitud
 * Modo 'responder': Sindicato aprueba o rechaza la solicitud
 *
 * Dependencias: hooks/useAuth.jsx, hooks/vales/useSolicitudesDesver.js, lucide-react
 * Usado en: components/vales/ModalValeDetalle.jsx
 */

import { useState } from "react";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { useSolicitudesDesver } from "../../hooks/vales/useSolicitudesDesver";
import "../../styles/ModalSolicitudDesver.css";

const ModalSolicitudDesver = ({
  vale,
  solicitud,
  modo,
  onCerrar,
  onExitoso,
}) => {
  const { crearSolicitud, responderSolicitud, loading, error, setError } =
    useSolicitudesDesver();

  const [motivo, setMotivo] = useState("");
  const [motivoRespuesta, setMotivoRespuesta] = useState("");

  const sindicatoNombre =
    vale?.operadores?.sindicatos?.sindicato || "No disponible";

  const handleSubmitCrear = async (e) => {
    e.preventDefault();
    setError(null);

    if (!motivo.trim()) {
      setError("Por favor ingresa un motivo");
      return;
    }

    const resultado = await crearSolicitud(vale.id_vale, motivo);

    if (resultado.success) {
      onExitoso({ aprobado: false });
    }
  };

  const handleAprobar = async (e) => {
    e.preventDefault();
    setError(null);

    const resultado = await responderSolicitud(
      solicitud.id_solicitud,
      true,
      motivoRespuesta,
    );

    if (resultado.success) {
      onExitoso({ aprobado: true });
    }
  };

  const handleRechazar = async (e) => {
    e.preventDefault();
    setError(null);

    const resultado = await responderSolicitud(
      solicitud.id_solicitud,
      false,
      motivoRespuesta,
    );

    if (resultado.success) {
      onExitoso({ aprobado: false });
    }
  };

  return (
    <div
      className="msd__overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div className="msd__panel">
        <div className="msd__header">
          <div className="msd__header-left">
            <RotateCcw
              size={16}
              className={
                modo === "responder"
                  ? "msd__header-icon msd__header-icon--responder"
                  : "msd__header-icon"
              }
            />
            <h2 className="msd__titulo">
              {modo === "crear"
                ? "Solicitar desverificación"
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

        <form onSubmit={modo === "crear" ? handleSubmitCrear : undefined}>
          <div className="msd__body">
            {modo === "crear" ? (
              <>
                <div className="msd__info-grid">
                  <div className="msd__info-fila">
                    <span className="msd__info-label">Folio</span>
                    <span className="msd__info-valor">{vale.folio}</span>
                  </div>
                  <div className="msd__info-fila">
                    <span className="msd__info-label">Sindicato</span>
                    <span className="msd__info-valor">{sindicatoNombre}</span>
                  </div>
                </div>

                {solicitud?.estado === "rechazada" && (
                  <div className="msd__motivo-solicitante">
                    <div className="msd__motivo-label">
                      Motivo del rechazo anterior
                    </div>
                    <p className="msd__motivo-texto">
                      {solicitud.motivo_respuesta ||
                        "Sin motivo especificado"}
                    </p>
                  </div>
                )}

                <div className="msd__advertencia">
                  <AlertTriangle size={16} />
                  <p>
                    Si se aprueba esta solicitud, el vale volverá al estado
                    "emitido" y podrá ser editado nuevamente.
                  </p>
                </div>

                <div className="msd__campo">
                  <label htmlFor="motivo-crear" className="msd__label">
                    Motivo de la desverificación
                  </label>
                  <textarea
                    id="motivo-crear"
                    className="msd__textarea"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Explica por qué necesitas desverificar este vale..."
                    disabled={loading}
                  />
                  <span className="msd__contador">
                    {motivo.length} caracteres
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="msd__info-grid">
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
                      {new Date(
                        solicitud?.fecha_solicitud,
                      ).toLocaleDateString("es-MX")}
                    </span>
                  </div>
                </div>

                <div className="msd__motivo-solicitante">
                  <div className="msd__motivo-label">
                    Motivo de la solicitud
                  </div>
                  <p className="msd__motivo-texto">
                    {solicitud?.motivo_solicitud}
                  </p>
                </div>

                <div className="msd__advertencia">
                  <AlertTriangle size={16} />
                  <p>
                    Si apruebas, el vale será revertido al estado "emitido" y
                    podrá ser editado nuevamente. Esta acción es irreversible.
                  </p>
                </div>

                <div className="msd__campo">
                  <label htmlFor="motivo-respuesta" className="msd__label">
                    Motivo de tu respuesta{" "}
                    <span className="msd__label--opcional">(opcional)</span>
                  </label>
                  <textarea
                    id="motivo-respuesta"
                    className="msd__textarea"
                    value={motivoRespuesta}
                    onChange={(e) => setMotivoRespuesta(e.target.value)}
                    placeholder="Ejemplo: si rechazas, explica por qué..."
                    disabled={loading}
                  />
                  <span className="msd__contador">
                    {motivoRespuesta.length} caracteres
                  </span>
                </div>
              </>
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
                    onClick={handleRechazar}
                    disabled={loading}
                  >
                    {loading ? "Procesando..." : "Rechazar"}
                  </button>
                  <button
                    type="button"
                    className="msd__btn msd__btn--aprobar"
                    onClick={handleAprobar}
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

export default ModalSolicitudDesver;
