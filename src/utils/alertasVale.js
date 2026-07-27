/**
 * src/utils/alertasVale.js
 *
 * Configuración compartida para mostrar las alertas de vales calculadas en
 * useAutorizacion.js (icono, etiqueta corta, nivel de severidad).
 * Dependencias: lucide-react
 * Usado en: pages/AutorizarVales.jsx, components/vales/ModalValeDetalle.jsx
 */

// 3. Third party
import { AlertTriangle, TrendingDown, Clock, Copy, FileWarning, AlertCircle } from "lucide-react";

// tipo (ver detectarAlertasIntraVale / construirAlertasCruzadas en useAutorizacion.js)
// -> icono, etiqueta corta para badges, nivel ("warn" | "alerta") para color.
export const ALERTA_CONFIG = {
  pocos_viajes: { icono: TrendingDown, label: "Viajes", nivel: "warn" },
  tiempos: { icono: Clock, label: "Tiempos", nivel: "alerta" },
  cantidad_duplicada: { icono: Copy, label: "Cantidad", nivel: "warn" },
  remision_duplicada: { icono: FileWarning, label: "Remisión", nivel: "alerta" },
  vale_duplicado: { icono: AlertTriangle, label: "Duplicado", nivel: "alerta" },
};

export const getAlertaConfig = (tipo) =>
  ALERTA_CONFIG[tipo] ?? { icono: AlertCircle, label: tipo, nivel: "warn" };
