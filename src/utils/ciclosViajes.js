/**
 * src/utils/ciclosViajes.js
 *
 * Ciclo entre viajes de material (minutos entre dos viajes consecutivos del
 * mismo detalle) y la velocidad de recorrido que se deriva de él. Es la misma
 * regla que usa la app para calibrar el tiempo mínimo (vista
 * `ciclos_banco_obra`, appAcarreos/supabase/migrations/
 * 20260804_tiempo_dinamico_y_motivos.sql), replicada aquí para que el reporte
 * hable de los mismos "viajes normales" que la app:
 *   - los viajes se ordenan por numero_viaje dentro de un detalle;
 *   - un ciclo es válido entre 1 y 300 min (fuera de eso es otro turno u otro día);
 *   - se descarta el ciclo si CUALQUIERA de sus dos extremos es un registro
 *     apresurado: la hora de un viaje capturado tarde no dice cuándo ocurrió.
 * El ciclo se atribuye al banco del viaje que lo cierra (el más reciente).
 *
 * Velocidad: (2 × km) ÷ (ciclo − minutos de carga/descarga) — ida y vuelta
 * sobre el tiempo de recorrido, sin el tiempo parado. Mismo modelo de la
 * fórmula del umbral en la app (utils/tiempoEntreViajes.js).
 *
 * Dependencias: ninguna
 * Usado en: hooks/useEstadisticasGlobales.js, hooks/useIndicadoresEficiencia.js,
 * utils/exportarReporteEstadisticas.js
 */

export const CICLO_MIN_VALIDO = 1;
export const CICLO_MAX_VALIDO = 300;

// Espejo del DEFAULT de obras.minutos_carga_descarga en la app.
export const MINUTOS_CARGA_DESCARGA_DEFAULT = 19;

// Con menos ciclos que esto, un promedio (y sobre todo una velocidad derivada
// de él) es ruido: se muestra "—" en vez de un número engañoso.
export const CICLOS_MINIMOS_PROMEDIO = 5;

/**
 * Viajes de UN detalle ordenados por numero_viaje, cada uno con los minutos
 * del ciclo que cierra (o null si es el primero o el ciclo no es válido).
 *
 * @param {Array} viajes vale_material_viajes de un solo detalle
 * @returns {Array<{ viaje: object, ciclo: number|null }>}
 */
export const viajesConCiclo = (viajes) => {
  const ordenados = [...(viajes || [])].sort(
    (a, b) => (a.numero_viaje ?? 0) - (b.numero_viaje ?? 0)
  );
  return ordenados.map((viaje, i) => {
    const previo = i > 0 ? ordenados[i - 1] : null;
    if (!previo || !viaje.hora_registro || !previo.hora_registro) return { viaje, ciclo: null };
    if (viaje.registro_anticipado || previo.registro_anticipado) return { viaje, ciclo: null };
    const minutos = (new Date(viaje.hora_registro) - new Date(previo.hora_registro)) / 60000;
    const valido = minutos >= CICLO_MIN_VALIDO && minutos <= CICLO_MAX_VALIDO;
    return { viaje, ciclo: valido ? minutos : null };
  });
};

/** Acumulador vacío de ciclos (ver acumularCiclo / resumirCiclos). */
export const nuevoAcumCiclos = () => ({
  n: 0, sumaMin: 0,
  nConDistancia: 0, sumaMinConDistancia: 0, sumaKm: 0, sumaCarga: 0,
});

/** Suma un ciclo válido. Los sin distancia cuentan para el promedio de minutos, no para la velocidad. */
export const acumularCiclo = (acum, minutos, distanciaKm, minutosCarga) => {
  acum.n += 1;
  acum.sumaMin += minutos;
  if (distanciaKm > 0) {
    acum.nConDistancia += 1;
    acum.sumaMinConDistancia += minutos;
    acum.sumaKm += distanciaKm;
    acum.sumaCarga += minutosCarga;
  }
};

/**
 * @returns {{ nCiclos: number, cicloMinProm: number|null, velocidadKmh: number|null }}
 *   null cuando hay menos de CICLOS_MINIMOS_PROMEDIO ciclos, o cuando el
 *   promedio no supera el tiempo de carga/descarga (la velocidad no existe).
 */
export const resumirCiclos = (acum) => {
  const cicloMinProm = acum.n >= CICLOS_MINIMOS_PROMEDIO ? acum.sumaMin / acum.n : null;

  let velocidadKmh = null;
  if (acum.nConDistancia >= CICLOS_MINIMOS_PROMEDIO) {
    const kmProm = acum.sumaKm / acum.nConDistancia;
    const minRecorrido =
      acum.sumaMinConDistancia / acum.nConDistancia - acum.sumaCarga / acum.nConDistancia;
    if (minRecorrido > 0) velocidadKmh = (2 * kmProm) / (minRecorrido / 60);
  }
  return { nCiclos: acum.n, cicloMinProm, velocidadKmh };
};
