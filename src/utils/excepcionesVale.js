/**
 * src/utils/excepcionesVale.js
 *
 * Lectura de las excepciones que la app movil registra en un vale de material:
 * viajes capturados antes del tiempo minimo entre viajes ("apresurados") y
 * viajes sin foto de evidencia. En ambos casos la app exige un motivo, y este
 * modulo traduce lo guardado en BD al mismo texto que ve el checador.
 *
 * Tambien incluye "viaje de ajuste" (es_viaje_ajuste), que a diferencia de las
 * anteriores NO viene de la app — la marca el Administrador desde el modal de
 * edicion web (Tipo 2 sin fila en vale_material_viajes) cuando una carga es el
 * sobrante de un camion y se le paga la capacidad, no el volumen real. Se
 * incluye en este mismo aviso porque es igual de relevante para quien revisa
 * el vale: algo fuera de lo normal que necesita explicacion visible.
 *
 * Espejo de la parte de presentacion de appAcarreos/src/utils/tiempoEntreViajes.js.
 * Los CODIGOS deben quedar identicos a los de la app — son lo que se guarda en
 * BD y lo que permite agrupar despues. Las etiquetas dicen lo mismo pero aqui van
 * acentuadas: el codigo de la app no usa acentos y en la web se leerian como
 * errores de dedo. Si se agrega un motivo en la app, agregarlo aqui tambien.
 * El calculo del umbral NO se replica aqui — es exclusivo de la app.
 *
 * Las excepciones viven en dos niveles:
 *   - vale_material_viajes  → tipos 1 y 3, un registro por viaje
 *   - vale_material_detalles / vale_renta_detalle → solo foto_omitida, porque el
 *     tipo 2 (base asfaltica) y la renta no generan filas de viaje
 *   - es_viaje_ajuste vive solo en vale_material_detalles (Tipo 2)
 *
 * Dependencias: ninguna
 * Usado en: AvisoExcepciones.jsx, ListaViajesMaterial.jsx, ModalValeDetalle.jsx
 */

/** Codigo del motivo libre. Debe coincidir con CODIGO_MOTIVO_OTRO de la app. */
export const CODIGO_MOTIVO_OTRO = "otro";

/** Motivos para registrar un viaje antes del tiempo minimo. */
export const MOTIVOS_ANTICIPADO = [
  { codigo: "captura_tardia", label: "Se está capturando después, no en campo" },
  {
    codigo: "viaje_final",
    label: "Viaje final, el camión ya no regresa a la obra",
  },
  { codigo: "viaje_corto", label: "El recorrido fue más rápido de lo normal" },
  { codigo: "sin_senal", label: "No hubo señal al momento del viaje" },
  { codigo: "error_ticket", label: "Se corrige un viaje mal registrado" },
  { codigo: "otro", label: "Otro (especificar)" },
];

/** Motivos para no tomar la foto de evidencia. */
export const MOTIVOS_SIN_FOTO = [
  { codigo: "captura_tardia", label: "Se está capturando después, no en campo" },
  {
    codigo: "viaje_final",
    label: "Viaje final, el camión ya no regresa a la obra",
  },
  { codigo: "camion_retirado", label: "El camión ya se retiró" },
  { codigo: "camara_falla", label: "La cámara no funciona o no hay permiso" },
  { codigo: "sin_visibilidad", label: "Sin visibilidad (noche, lluvia)" },
  { codigo: "otro", label: "Otro (especificar)" },
];

/**
 * Traduce el codigo guardado en BD a su etiqueta legible.
 * Devuelve el codigo tal cual si no esta en la lista — un motivo de una version
 * anterior de la app sigue siendo mas util que un guion.
 */
export const etiquetaMotivo = (motivos, codigo) => {
  if (!codigo) return "Sin especificar";
  return motivos.find((m) => m.codigo === codigo)?.label ?? codigo;
};

/**
 * Normaliza una excepcion de registro anticipado a la forma que consume la UI.
 */
const mapAnticipado = (viaje) => ({
  clave: `ap-${viaje.id_viaje}`,
  numeroViaje: viaje.numero_viaje ?? null,
  minutosFaltantes:
    viaje.minutos_faltantes_anticipado != null
      ? Number(viaje.minutos_faltantes_anticipado)
      : null,
  minutosMinimos:
    viaje.minutos_minimos_calculados != null
      ? Number(viaje.minutos_minimos_calculados)
      : null,
  codigo: viaje.motivo_anticipado_codigo || null,
  motivo: etiquetaMotivo(MOTIVOS_ANTICIPADO, viaje.motivo_anticipado_codigo),
  motivoTexto: viaje.motivo_anticipado_texto || null,
});

/**
 * Normaliza una excepcion de foto omitida. Sirve tanto para una fila de viaje
 * como para un detalle (tipo 2 y renta), que llega sin numero de viaje.
 */
const mapSinFoto = (origen, clave, numeroViaje = null) => ({
  clave,
  numeroViaje,
  codigo: origen.motivo_sin_foto_codigo || null,
  motivo: etiquetaMotivo(MOTIVOS_SIN_FOTO, origen.motivo_sin_foto_codigo),
  motivoTexto: origen.motivo_sin_foto_texto || null,
});

/**
 * Normaliza un viaje de ajuste (Tipo 2, es_viaje_ajuste): no tiene
 * codigo/motivo como las excepciones de la app, siempre es el mismo hecho —
 * se cobro la capacidad del camion, no el volumen real entregado.
 */
const mapAjuste = (detalle, i) => ({
  clave: `aj-det-${detalle.id_detalle_material ?? i}`,
  capacidad: detalle.capacidad_m3 != null ? Number(detalle.capacidad_m3) : null,
  volumenReal:
    detalle.volumen_real_m3 != null ? Number(detalle.volumen_real_m3) : null,
});

/**
 * Recolecta todas las excepciones de un vale, de los dos niveles.
 *
 * Tolera vales que llegan sin viajes cargados o sin las columnas nuevas (vales
 * anteriores al 2026-08-04, o un select que aun no las pide): en ese caso
 * devuelve los arreglos vacios en vez de fallar.
 *
 * @param {object} vale fila de vales con detalles anidados
 * @returns {{ anticipados: Array, sinFoto: Array, ajustes: Array, total: number }}
 */
export const recolectarExcepciones = (vale) => {
  const anticipados = [];
  const sinFoto = [];
  const ajustes = [];

  if (!vale) return { anticipados, sinFoto, ajustes, total: 0 };

  // Las claves llevan el indice del detalle porque no todos los select piden
  // id_detalle_material / id_vale_renta_detalle, y sin el la clave colisionaria
  // entre dos detalles del mismo vale.
  (vale.vale_material_detalles ?? []).forEach((detalle, i) => {
    (detalle.vale_material_viajes ?? []).forEach((viaje) => {
      if (viaje.registro_anticipado) anticipados.push(mapAnticipado(viaje));
      if (viaje.foto_omitida) {
        sinFoto.push(
          mapSinFoto(viaje, `sf-${viaje.id_viaje}`, viaje.numero_viaje ?? null),
        );
      }
    });

    // Nivel detalle: tipo 2 (base asfaltica) no tiene fila de viaje.
    if (detalle.foto_omitida) {
      sinFoto.push(mapSinFoto(detalle, `sf-det-${i}`));
    }
    if (detalle.es_viaje_ajuste) {
      ajustes.push(mapAjuste(detalle, i));
    }
  });

  (vale.vale_renta_detalle ?? []).forEach((detalle, i) => {
    if (detalle.foto_omitida) {
      sinFoto.push(mapSinFoto(detalle, `sf-renta-${i}`));
    }
  });

  anticipados.sort((a, b) => (a.numeroViaje ?? 0) - (b.numeroViaje ?? 0));
  sinFoto.sort((a, b) => (a.numeroViaje ?? 0) - (b.numeroViaje ?? 0));

  return {
    anticipados,
    sinFoto,
    ajustes,
    total: anticipados.length + sinFoto.length + ajustes.length,
  };
};

/** Prefijo de la linea: "Viaje 3" o "Vale" cuando la excepcion es del detalle. */
const prefijo = (exc) =>
  exc.numeroViaje != null ? `Viaje ${exc.numeroViaje}` : "Vale";

/**
 * Motivo legible a partir de lo que hay en BD. Con el codigo "otro" la etiqueta
 * del catalogo es "Otro (especificar)" — texto de formulario, inutil en un
 * reporte — asi que manda lo que el checador escribio. Con cualquier otro
 * codigo el texto libre es un complemento y va entre parentesis.
 *
 * @param {Array} motivos MOTIVOS_ANTICIPADO o MOTIVOS_SIN_FOTO
 * @param {string|null} codigo motivo_*_codigo
 * @param {string|null} textoLibre motivo_*_texto
 * @returns {string|null} null si no hay ni codigo ni texto
 */
export const motivoLegibleDe = (motivos, codigo, textoLibre) => {
  if (!codigo && !textoLibre) return null;
  return componerMotivo(etiquetaMotivo(motivos, codigo), codigo, textoLibre);
};

/** Une la etiqueta del catalogo con el texto libre. La etiqueta ya viene resuelta. */
const componerMotivo = (etiqueta, codigo, textoLibre) => {
  if (codigo === CODIGO_MOTIVO_OTRO && textoLibre) return textoLibre;
  return `${etiqueta}${textoLibre ? ` (${textoLibre})` : ""}`;
};

const motivoLegible = (exc) =>
  componerMotivo(exc.motivo, exc.codigo, exc.motivoTexto);

/**
 * Linea completa de un registro apresurado.
 * Ej: "Viaje 3: registro apresurado, 12 min antes de los 41 min normales —
 *      El recorrido fue mas rapido de lo normal"
 */
export const textoAnticipado = (exc) => {
  const minutos =
    exc.minutosFaltantes != null
      ? `, ${exc.minutosFaltantes} min antes de los ${exc.minutosMinimos ?? "?"} min normales`
      : "";
  return `${prefijo(exc)}: registro apresurado${minutos} — ${motivoLegible(exc)}`;
};

/** Linea completa de un viaje sin foto de evidencia. */
export const textoSinFoto = (exc) =>
  `${prefijo(exc)}: sin foto de evidencia — ${motivoLegible(exc)}`;

/**
 * Linea completa de un viaje de ajuste (Tipo 2).
 * Ej: "Vale: viaje de ajuste — se cobró la capacidad del camión (17.000 m³),
 *      no el volumen real entregado (2.500 m³)"
 */
export const textoAjuste = (exc) => {
  const capacidad = exc.capacidad != null ? `${exc.capacidad.toFixed(3)} m³` : "la capacidad del camión";
  const volumen = exc.volumenReal != null ? `${exc.volumenReal.toFixed(3)} m³` : "el volumen real";
  return `Vale: viaje de ajuste — se cobró ${capacidad}, no ${volumen} entregado`;
};
