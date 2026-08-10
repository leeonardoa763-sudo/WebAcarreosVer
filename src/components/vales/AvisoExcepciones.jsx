/**
 * src/components/vales/AvisoExcepciones.jsx
 *
 * Bloque ambar que lista los registros fuera de lo normal de un vale: viajes
 * capturados antes del tiempo minimo entre viajes y viajes sin foto de evidencia.
 * Replica el aviso que la app movil muestra al residente en el vale completado.
 *
 * Se lista el motivo y no solo un icono: quien revisa el vale dias despues
 * necesita reconstruir que paso sin preguntarle al checador.
 *
 * Devuelve null cuando no hay excepciones, para poder montarlo sin guard.
 *
 * Dependencias: excepcionesVale.js, lucide-react, aviso-excepciones.css
 * Usado en: ModalValeDetalle.jsx, ValePreview.jsx, BatchResults.jsx, VisualizarVale.jsx
 */

// 1. Icons
import { AlertTriangle } from "lucide-react";

// 2. Utils
import { textoAnticipado, textoSinFoto } from "../../utils/excepcionesVale";

// 3. Estilos
import "../../styles/aviso-excepciones.css";

const AvisoExcepciones = ({ excepciones, compacto = false }) => {
  if (!excepciones?.total) return null;

  const { anticipados, sinFoto, total } = excepciones;

  return (
    <div className={`aev ${compacto ? "aev--compacto" : ""}`}>
      <div className="aev__header">
        <AlertTriangle size={compacto ? 12 : 15} aria-hidden="true" />
        <span className="aev__titulo">
          {compacto
            ? `${total} ${total === 1 ? "registro" : "registros"} fuera de lo normal`
            : "Este vale tiene registros fuera de lo normal"}
        </span>
        {!compacto && <span className="aev__badge">{total}</span>}
      </div>

      <ul className="aev__lista">
        {anticipados.map((exc) => (
          <li key={exc.clave} className="aev__linea">
            {textoAnticipado(exc)}
          </li>
        ))}
        {sinFoto.map((exc) => (
          <li key={exc.clave} className="aev__linea">
            {textoSinFoto(exc)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AvisoExcepciones;
