/**
 * src/utils/interpretacionIndicadores.js
 *
 * Texto interpretativo (qué significa un indicador y qué hacer si sale alto
 * o bajo) para los indicadores de eficiencia/oportunidad de Estadísticas
 * Globales. Vive en un solo lugar para que la página en vivo y el PDF digan
 * exactamente lo mismo, sin duplicar el texto.
 *
 * Dependencias: ninguna
 * Usado en: pages/EstadisticasGlobales.jsx, utils/exportarReporteEstadisticas.js
 */

// ── Índice de Posición de la Obra ───────────────────────────────────
// No tiene un corte alto/bajo universal (las distancias varían mucho por
// región/obra) — "Alto"/"Medio"/"Bajo" se calculan dividiendo en tercios las
// obras del periodo/filtro actual (ver nivel en useIndicadoresEficiencia.js),
// no un número fijo de km.
export const INDICE_POSICION_OBRA = {
  titulo: "Índice de Posición de la Obra",
  descripcion:
    "Distancia promedio a los bancos usados, ponderada por m³ entregados. " +
    "Entre más alto, más lejos está la obra de sus fuentes de material. " +
    "\"Alto/Medio/Bajo\" es relativo a las demás obras de este filtro (tercio " +
    "más alejado / intermedio / más cercano) — no hay un corte fijo en km " +
    "porque la distancia normal varía mucho por región. El desglose por " +
    "banco explica de dónde sale el número; el desglose por material muestra " +
    "el precio de FLETE promedio ponderado por m³ (no el precio del " +
    "material — ese se paga por tonelada, fuera del sistema).",
  nota:
    "Las obras con nivel Alto tienen un flete estructuralmente caro sin " +
    "importar qué tan bien se elija el banco — vale la pena revisar si hay " +
    "bancos más cercanos aún no usados, o negociar tarifa especial por " +
    "volumen si es una obra de largo plazo. Las de nivel Bajo no tienen el " +
    "flete como su principal driver de costo.",
  notaBancoDominante:
    "Un solo banco explica más del 70% del índice de esta obra — el número " +
    "no refleja un promedio real entre varias fuentes, sino sobre todo la " +
    "distancia de ese banco. Revisa si conviene reducir su uso a favor de " +
    "los bancos más cercanos ya usados en la misma obra.",
};

// ── Flete Evitado por Flota Propia (GRUPO GEEM) ─────────────────────
// La tarifa de $1/km que trae el vale de GEEM en el sistema es un valor
// técnico (para poder cargar el vale), no un costo real — GEEM no se cobra.
// Por eso el "ahorro" no es una resta contra ese $1/km: es el valor completo
// que hubiera costado pagarle a CTM por esos mismos viajes.
export const FLETE_EVITADO_FLOTA_PROPIA = {
  titulo: "Flete Evitado por Flota Propia",
  descripcion:
    "Revalúa los viajes de GRUPO GEEM (flota propia) a la tarifa de CTM en " +
    "esa misma ruta y material — ese valor completo es lo que se hubiera " +
    "pagado al sindicato de no tener flota propia ahí.",
  nota:
    "Las rutas con más valor son donde la flota propia está mejor asignada " +
    "— si la demanda ahí es estable, vale la pena evaluar ampliar la flota " +
    "propia. Las rutas con poco valor (viajes cortos) dejan un ahorro " +
    "marginal: mejor reasignar esos camiones a rutas más largas y dejar las " +
    "cortas al sindicato.",
};

// ── ¿Se justifica comprar un camión? (parte del mismo indicador) ────
// Dos tablas de apoyo, solo material (sin renta): cuántos camiones trabajan
// a la vez en la obra (demanda diaria real) y qué tanto se hubiera ahorrado
// si la placa más activa pagada a sindicato hubiera sido un camión propio.
export const VIABILIDAD_FLOTA_PROPIA = {
  titulo: "¿Se Justifica Comprar un Camión?",
  descripcionCamiones:
    "Camiones (placas distintas) activos por día en la obra, contando toda " +
    "la flota que trabajó ahí — propia y de sindicato. Da una referencia de " +
    "cuánta demanda diaria de flete hay, sin importar de quién es el camión.",
  descripcionTopCamioneros:
    "Las placas de sindicato (no GEEM) con más viajes en la obra. El importe " +
    "pagado a la placa top es, aproximadamente, lo que se hubiera ahorrado " +
    "si ese camión hubiera sido propio en vez de rentado vía sindicato — " +
    "misma idea que el flete evitado de GEEM, en sentido inverso.",
  nota:
    "El camión top no es representativo del camión promedio de la obra — " +
    "compáralo contra el promedio antes de proyectar el ahorro a otro " +
    "camión hipotético. Si el promedio de camiones/día ya se acerca al " +
    "máximo, es señal de que casi todos los días hay trabajo de sobra para " +
    "un camión propio adicional.",
};

// ── Jornada de Renta No Aprovechada ──────────────────────────────────
export const RENTA_NO_APROVECHADA = {
  titulo: "Jornada de Renta No Aprovechada",
  descripcion:
    "Cada vale de renta se clasifica por su propio ritmo real (viajes ÷ días) " +
    "en un espectro de eficiencia frente a la meta de 7 viajes/día: 1-3 " +
    "(Desperdiciado — se suma el costo completo del vale), 4-6 (Poca " +
    "Eficiencia), 7-9 (Buena Eficiencia) y 10+ (Ideal). Agrupado por obra, " +
    "con el número de vales, el % que representa cada espectro y cuánto se " +
    "pagó en cada uno.",
  nota:
    "Revisa los vales en \"Desperdiciado\": si tenían suficiente material para " +
    "mover ese día, o si conviene reducir a medio turno o menos equipos " +
    "rentados en esa obra.",
};
