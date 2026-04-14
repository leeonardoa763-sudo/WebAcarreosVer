/**
 * src/components/visualizar-vale/DetallesRenta.jsx
 *
 * Muestra los datos del detalle de un vale de renta en la página pública
 * Incluye horas, días, precios (si tiene permiso) y registro de viajes
 *
 * Dependencias: formatters, lucide-react
 * Usado en: VisualizarVale.jsx
 */

// 1. React
import React from "react";

// 2. Icons
import { Clock } from "lucide-react";

// 3. Utils
import {
  formatearMoneda,
  formatearVolumen,
  formatearHora,
} from "../../utils/formatters";

const DetallesRenta = ({ detalle, mostrarPrecios }) => {
  // Detectar renta por día si total_dias > 0
  const totalDias = Number(detalle.total_dias || 0);
  const esRentaPorDia = totalDias > 0;

  // Viajes ordenados por numero_viaje
  const viajesOrdenados = [...(detalle.vale_renta_viajes || [])].sort(
    (a, b) => a.numero_viaje - b.numero_viaje,
  );

  return (
    <div className="vale-section">
      <h3 className="section-title">SERVICIO DE RENTA</h3>

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

      {/* Registro de viajes individuales */}
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
            {/* Encabezados */}
            <div className="viajes-renta__fila viajes-renta__fila--header">
              <span>#</span>
              <span>Hora de registro</span>
              <span>Registrado por</span>
            </div>

            {/* Filas */}
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
                  <span className="viajes-renta__persona">
                    {nombreRegistrador}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetallesRenta;
