/**
 * src/components/vales/ValeCardRenta.jsx
 *
 * Tarjeta compacta de vale de RENTA — abre modal centrado al hacer clic.
 *
 * Funcionalidades:
 * - Vista compacta densa: folio, operador, placas, estado, fecha efectiva, costo total
 * - Clic en la tarjeta abre ModalValeDetalle (modal centrado)
 *
 * Dependencias: formatters.js, useAuth.jsx, ModalValeDetalle
 * Usado en: ValeCard.jsx
 */

// 1. React y hooks
import { useState, useCallback } from "react";

// 2. Icons
import { FileText } from "lucide-react";

// 3. Utils
import {
  formatearFechaHora,
  getBadgeEstado,
  formatearFolio,
  formatearMoneda,
} from "../../utils/formatters";

// 4. Componentes
import ModalValeDetalle from "./ModalValeDetalle";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const obtenerFechaEfectiva = (vale) => {
  const fechaRaw = vale.fecha_programada || vale.fecha_creacion;
  const { fecha } = formatearFechaHora(fechaRaw);
  return fecha;
};

// ─── Componente ───────────────────────────────────────────────────────────────

const ValeCardRenta = ({ vale, empresaColor, onValeActualizado }) => {
  const [modalAbierto, setModalAbierto] = useState(false);

  const badgeEstado = getBadgeEstado(vale.estado);
  const fechaHeader = obtenerFechaEfectiva(vale);

  const calcularCostoTotal = useCallback(() => {
    if (!vale.vale_renta_detalle?.length) return 0;
    return vale.vale_renta_detalle.reduce(
      (sum, d) => sum + Number(d.costo_total || 0),
      0,
    );
  }, [vale.vale_renta_detalle]);

  const handleCardClick = useCallback(() => {
    setModalAbierto(true);
  }, []);

  const handleCerrarModal = useCallback(() => {
    setModalAbierto(false);
  }, []);

  const costoTotal = calcularCostoTotal();

  const solicitudPendiente = vale.solicitudes_desverificacion?.find(
    (s) => s.estado === "pendiente"
  ) ?? null;

  return (
    <>
      <div
        className="vale-card-compact"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
        aria-label={`Ver detalle del vale ${formatearFolio(vale.folio)}`}
        style={{ borderLeft: `3px solid ${empresaColor || "#7F8C8D"}` }}
      >
        {/* Fila principal */}
        <div className="vale-card-compact__row">
          <div className="vale-card-compact__folio">
            <FileText size={13} aria-hidden="true" />
            <span>{formatearFolio(vale.folio)}</span>
          </div>

          <span
            className="vale-card-compact__estado"
            style={{ color: badgeEstado.color, backgroundColor: badgeEstado.background }}
          >
            {badgeEstado.label}
          </span>

          {solicitudPendiente && (
            <span
              className="vale-card-compact__desver-badge"
              title="Solicitud de desverificación pendiente"
            >
              Desver.
            </span>
          )}
        </div>

        {/* Fila secundaria: operador + placas + fecha + costo */}
        <div className="vale-card-compact__meta">
          <span className="vale-card-compact__operador">
            {vale.operadores?.nombre_completo || "Sin operador"}
          </span>
          {vale.vehiculos?.placas && (
            <span className="vale-card-compact__placas">{vale.vehiculos.placas}</span>
          )}
          <span className="vale-card-compact__fecha">{fechaHeader}</span>
          {costoTotal > 0 && (
            <span className="vale-card-compact__costo">{formatearMoneda(costoTotal)}</span>
          )}
        </div>

      </div>

      {modalAbierto && (
        <ModalValeDetalle
          vale={vale}
          onCerrar={handleCerrarModal}
          onValeActualizado={onValeActualizado}
        />
      )}
    </>
  );
};

export default ValeCardRenta;
