/**
 * src/utils/alertasVale.js
 *
 * Configuración compartida para mostrar las alertas de vales calculadas en
 * useAutorizacion.js (icono, etiqueta corta, nivel de severidad).
 * Dependencias: lucide-react
 * Usado en: pages/AutorizarVales.jsx, components/vales/ModalValeDetalle.jsx
 */

// 3. Third party
import {
  AlertTriangle,
  TrendingDown,
  Clock,
  Copy,
  FileWarning,
  AlertCircle,
  Timer,
  CameraOff,
} from "lucide-react";

// tipo (ver detectarAlertasIntraVale / construirAlertasCruzadas en useAutorizacion.js)
// -> icono, etiqueta corta para badges, nivel ("warn" | "alerta") para color.
export const ALERTA_CONFIG = {
  pocos_viajes: { icono: TrendingDown, label: "Viajes", nivel: "warn" },
  tiempos: { icono: Clock, label: "Tiempos", nivel: "alerta" },
  cantidad_duplicada: { icono: Copy, label: "Cantidad", nivel: "warn" },
  remision_duplicada: { icono: FileWarning, label: "Remisión", nivel: "alerta" },
  vale_duplicado: { icono: AlertTriangle, label: "Duplicado", nivel: "alerta" },
  // Excepciones que la app declara con motivo (no son inferencias de la web):
  // el checador registro el viaje antes del tiempo minimo, u omitio la foto.
  registro_anticipado: { icono: Timer, label: "Apresurado", nivel: "alerta" },
  sin_foto: { icono: CameraOff, label: "Sin foto", nivel: "warn" },
};

export const getAlertaConfig = (tipo) =>
  ALERTA_CONFIG[tipo] ?? { icono: AlertCircle, label: tipo, nivel: "warn" };
