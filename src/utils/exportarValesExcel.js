/**
 * src/utils/exportarValesExcel.js
 *
 * Export a Excel de la pestaña Vales, normalizado en hojas: cada hoja es una
 * tabla con un solo nivel de detalle, unidas por el folio del vale.
 *
 *   Vales            1 fila por vale          PK  Folio
 *   Material         1 fila por detalle       FK  Folio  ·  PK  Folio + Detalle
 *   Renta            1 fila por detalle       FK  Folio
 *   Viajes material  1 fila por viaje         FK  Folio + Detalle
 *   Viajes renta     1 fila por viaje         FK  Folio
 *
 * Se separan porque una sola tabla obliga a dejar en blanco todo lo que no
 * aplica: las columnas de renta vacías en las filas de material, las de
 * material vacías en las de renta, y los totales del vale vacíos en todas menos
 * la primera. Cada hoja aquí está llena.
 *
 * Lo que sí se repite en todas las hojas son los datos de identificación del
 * vale (folio, tipo, estado, empresa, CC, obra, fecha, operador, placas,
 * sindicato) y, en las hojas de viajes, los del detalle del que cuelgan
 * (material, tipo de material, banco pedido / equipo rentado). Son columnas
 * llenas en cada fila, así que no reintroducen huecos, y evitan tener que
 * cruzar a mano contra la hoja Vales para filtrar por obra o por sindicato.
 *
 * Cada hoja suma por su cuenta el total del vale: el importe de la hoja Vales,
 * el de Material por detalle y el de Viajes material por viaje dan la misma
 * cifra. La excepción es un vale de corte cuyos viajes nunca se registraron
 * (solo se imprimieron tickets): ahí la cantidad solo existe en Material.
 *
 * Dependencias: exportToExcel.js, excelFechas.js
 * Usado en: pages/DashboardUnificado.jsx
 */

// 1. Utils
import { exportMultipleSheetsToExcel } from "./exportToExcel";
import { fechaExcel, horaExcel, FMT_FECHA, FMT_HORA } from "./excelFechas";
import {
  motivoLegibleDe,
  MOTIVOS_ANTICIPADO,
  MOTIVOS_SIN_FOTO,
} from "./excepcionesVale";

// ─── Constantes ─────────────────────────────────────────────────────────────

const FMT_MONEDA = "#,##0.00";

const ETIQUETAS_TIPO = {
  petreos: "Pétreos",
  asfaltico: "Asfáltico",
  corte: "Corte",
  renta: "Renta",
};

const ETIQUETAS_ESTADO = {
  emitido: "Emitido",
  en_proceso: "En proceso",
  verificado: "Verificado",
  conciliado: "Conciliado",
  cancelado: "Cancelado",
};

const VACIO = "—";

// ─── Helpers ────────────────────────────────────────────────────────────────

// Celda numérica o vacía. Un 0 legítimo (0 toneladas capturadas) se conserva;
// null/undefined se van como "" para que Excel no los lea como cero.
const num = (valor) => {
  if (valor === null || valor === undefined || valor === "") return "";
  const n = Number(valor);
  return Number.isNaN(n) ? "" : n;
};

const texto = (valor) =>
  valor === null || valor === undefined || valor === "" ? VACIO : valor;

const siNo = (valor) => (valor ? "Sí" : "No");

const nombrePersona = (persona) => {
  if (!persona) return VACIO;
  const nombre = [
    persona.nombre,
    persona.primer_apellido,
    persona.segundo_apellido,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  return nombre || VACIO;
};

const sumar = (lista, obtener) =>
  (lista ?? []).reduce((total, item) => total + (Number(obtener(item)) || 0), 0);

// Motivo declarado al omitir la foto de evidencia. Vive en tres tablas con las
// mismas columnas: vale_material_viajes, vale_material_detalles y
// vale_renta_detalle (ver excepcionesVale.js).
const motivoSinFoto = (origen) =>
  texto(
    motivoLegibleDe(
      MOTIVOS_SIN_FOTO,
      origen?.motivo_sin_foto_codigo,
      origen?.motivo_sin_foto_texto,
    ),
  );

// Motivo declarado al registrar un viaje antes del tiempo mínimo. Solo existe
// por viaje.
const motivoAnticipado = (viaje) =>
  texto(
    motivoLegibleDe(
      MOTIVOS_ANTICIPADO,
      viaje?.motivo_anticipado_codigo,
      viaje?.motivo_anticipado_texto,
    ),
  );

// Fecha efectiva del vale: la programada si existe (los vales programados se
// crean un día antes de operar), si no el día de creación. fecha_creacion es
// timestamptz — fechaExcel lo convierte al día calendario de México.
const getFechaEfectiva = (vale) => vale.fecha_programada ?? vale.fecha_creacion;

// Banco efectivo del viaje: el override manda. La app permite cambiar el banco
// viaje por viaje (ModalCambiarBanco → escribe *_override en vale_material_viajes)
// y recalcula distancia y precio con ese banco. Leer el banco del detalle sería
// reportar el banco con el que se creó el vale, no en el que se cargó.
const getBancoViaje = (viaje, detalle) =>
  viaje.bancos_override?.banco ?? detalle.bancos?.banco;

// Un vale puede estar en más de una conciliación (raro, pero posible): se
// concatenan para no perder ninguna referencia.
const getDatosConciliacion = (vale) => {
  const conciliaciones = (vale.conciliacion_vales ?? [])
    .map((cv) => cv.conciliaciones)
    .filter(Boolean);

  const unir = (campo) => {
    const valores = conciliaciones.map((c) => c[campo]).filter(Boolean);
    return valores.length > 0 ? [...new Set(valores)].join(", ") : VACIO;
  };

  return {
    folio: unir("folio"),
    ordenCompra: unir("numero_orden_compra"),
    factura: unir("numero_factura"),
    estado: unir("estado"),
  };
};

// Importe del vale: el de la renta o la suma de sus detalles de material.
const getImporteVale = (vale) => {
  if (vale.tipo_vale === "renta") {
    return num(vale.vale_renta_detalle?.[0]?.costo_total);
  }
  const detalles = vale.vale_material_detalles ?? [];
  return detalles.length > 0 ? sumar(detalles, (d) => d.costo_total) : "";
};

// Mismo criterio que getCantidadVale del hook: por día si el flag está activo
// O si total_dias > 0 (cubre el medio día con el flag mal puesto).
const esRentaPorDia = (detalle) =>
  detalle.es_renta_por_dia || Number(detalle.total_dias ?? 0) > 0;

// ─── Datos generales del vale (repetidos en todas las hojas) ────────────────

/**
 * Columnas de identificación del vale que abren todas las hojas. Se duplican a
 * propósito: sin ellas, filtrar los viajes de una obra o de un sindicato obliga
 * a cruzar folio por folio contra la hoja Vales.
 *
 * No incluye "Capacidad m³" ni "Banco": esos nombres ya los usan las hojas de
 * detalle con otro significado (la capacidad del detalle, el banco efectivo del
 * viaje) y repetirlos aquí colapsaría las dos columnas en una sola.
 */
const datosGeneralesVale = (vale) => ({
  Folio: texto(vale.folio),
  Tipo: ETIQUETAS_TIPO[vale._tipo] ?? texto(vale._tipo),
  Estado: ETIQUETAS_ESTADO[vale.estado] ?? texto(vale.estado),
  Empresa: texto(vale.obras?.empresas?.empresa ?? vale.obras?.empresas?.sufijo),
  CC: texto(vale.obras?.cc),
  Obra: texto(vale.obras?.obra),
  Fecha: fechaExcel(getFechaEfectiva(vale)),
  Operador: texto(vale.operadores?.nombre_completo),
  Placas: texto(vale.vehiculos?.placas),
  Sindicato: texto(vale.operadores?.sindicatos?.sindicato),
});

// Formato de las columnas generales; se mezcla en el de cada hoja.
const FORMATOS_GENERALES = {
  Fecha: FMT_FECHA,
};

// ─── Hoja "Vales" ───────────────────────────────────────────────────────────

const FORMATOS_VALES = {
  ...FORMATOS_GENERALES,
  "Fecha creación": FMT_FECHA,
  "Hora creación": FMT_HORA,
  "Fecha completado": FMT_FECHA,
  "Fecha verificación": FMT_FECHA,
  "Hora verificación": FMT_HORA,
  "Fecha autorización": FMT_FECHA,
  Importe: FMT_MONEDA,
};

const filaVale = (vale, viajesRegistrados) => {
  const conciliacion = getDatosConciliacion(vale);

  return {
    ...datosGeneralesVale(vale),
    "Capacidad m³": num(vale.vehiculos?.capacidad_m3),
    "Viajes registrados": viajesRegistrados,
    Importe: getImporteVale(vale),

    // ── Trazabilidad ──
    "Creó vale": nombrePersona(vale.persona),
    "Fecha creación": fechaExcel(vale.fecha_creacion),
    "Hora creación": horaExcel(vale.fecha_creacion),
    "Completó vale": nombrePersona(vale.persona_completador),
    "Fecha completado": fechaExcel(vale.fecha_completado),
    Verificado: siNo(vale.verificado_por_sindicato),
    "Verificó vale": nombrePersona(vale.persona_verificador),
    "Fecha verificación": fechaExcel(vale.fecha_verificacion),
    "Hora verificación": horaExcel(vale.fecha_verificacion),
    Autorizado: siNo(vale.autorizado),
    "Autorizó vale": nombrePersona(vale.persona_autorizador),
    "Fecha autorización": fechaExcel(vale.fecha_autorizacion),

    // ── Conciliación ──
    Conciliación: conciliacion.folio,
    "Orden de compra": conciliacion.ordenCompra,
    Factura: conciliacion.factura,
    "Estado conciliación": conciliacion.estado,

    "Motivo cancelación": texto(vale.motivo_cancelacion),
  };
};

// ─── Hoja "Material" ────────────────────────────────────────────────────────

const FORMATOS_MATERIAL = {
  ...FORMATOS_GENERALES,
  "Precio m³": FMT_MONEDA,
  Importe: FMT_MONEDA,
};

const filaDetalleMaterial = (vale, det, numeroDetalle) => ({
  ...datosGeneralesVale(vale),
  Detalle: numeroDetalle,
  Material: texto(det.material?.material),
  "Tipo material": texto(det.material?.tipo_de_material?.tipo_de_material),
  Banco: texto(det.bancos?.banco),
  "Planta asfaltos": siNo(det.es_planta_asfaltos),
  "Distancia km": num(det.distancia_km),
  "Capacidad m³": num(det.capacidad_m3),
  "Cantidad pedida m³": num(det.cantidad_pedida_m3),
  "m³": num(det.volumen_real_m3),
  Toneladas: num(det.peso_ton),
  "Precio m³": num(det.precio_m3),
  Importe: num(det.costo_total),
  "Folio banco": texto(det.folio_banco),
  Remisión: texto(det.folio_vale_fisico),
  Requisición: texto(det.requisicion),
  // Excepción a nivel detalle: el Tipo 2 y la renta no generan filas de viaje,
  // así que su foto omitida se declara aquí.
  "Foto omitida": siNo(det.foto_omitida),
  "Motivo sin foto": motivoSinFoto(det),
  "Notas adicionales": texto(det.notas_adicionales),
});

// ─── Hoja "Renta" ───────────────────────────────────────────────────────────

const FORMATOS_RENTA = {
  ...FORMATOS_GENERALES,
  "Costo/día": FMT_MONEDA,
  "Costo/hr": FMT_MONEDA,
  Importe: FMT_MONEDA,
  "Hora inicio": FMT_HORA,
  "Hora fin": FMT_HORA,
};

const filaDetalleRenta = (vale, det) => {
  const porDia = esRentaPorDia(det);

  return {
    ...datosGeneralesVale(vale),
    "Equipo / Material": texto(det.material?.material),
    Cobro: porDia ? "Por día" : "Por hora",
    Días: porDia ? num(det.total_dias) : "",
    Horas: porDia ? "" : num(det.total_horas),
    "Costo/día": porDia ? num(det.precios_renta?.costo_dia) : "",
    "Costo/hr": porDia ? "" : num(det.precios_renta?.costo_hr),
    Importe: num(det.costo_total),
    "Capacidad m³": num(det.capacidad_m3),
    "Viajes declarados": num(det.numero_viajes),
    "Turno nocturno": siNo(det.es_turno_nocturno),
    "Hora inicio": horaExcel(det.hora_inicio),
    "Hora fin": horaExcel(det.hora_fin),
    "Foto omitida": siNo(det.foto_omitida),
    "Motivo sin foto": motivoSinFoto(det),
    "Notas adicionales": texto(det.notas_adicionales),
  };
};

// ─── Hoja "Viajes material" ─────────────────────────────────────────────────

const FORMATOS_VIAJES_MATERIAL = {
  ...FORMATOS_GENERALES,
  "Fecha registro": FMT_FECHA,
  "Hora registro": FMT_HORA,
  "Precio m³": FMT_MONEDA,
  Importe: FMT_MONEDA,
};

// `det` es el detalle del que cuelga el viaje: sus datos se repiten en la fila
// para que la hoja se pueda filtrar por material o por banco pedido sin volver
// a la hoja Material.
const filaViajeMaterial = (vale, det, viaje) => ({
  ...datosGeneralesVale(vale),
  Detalle: viaje.detalle,
  Material: texto(det.material?.material),
  "Tipo material": texto(det.material?.tipo_de_material?.tipo_de_material),
  "Banco pedido": texto(det.bancos?.banco),
  Viaje: num(viaje.numero),
  Banco: texto(viaje.banco),
  "Cambio de banco": siNo(viaje.cambioDeBanco),
  "Distancia km": num(viaje.distanciaKm),
  "m³": num(viaje.m3),
  Toneladas: num(viaje.toneladas),
  "Precio m³": num(viaje.precioM3),
  Importe: num(viaje.importe),
  Remisión: texto(viaje.remision),
  Ticket: texto(viaje.ticket),
  "Fecha registro": fechaExcel(viaje.horaRegistro),
  "Hora registro": horaExcel(viaje.horaRegistro),
  "Registró viaje": nombrePersona(viaje.personaRegistro),
  // Excepciones que la app declaró con motivo al registrar el viaje. La web
  // solo las lee — el umbral lo calcula la app (ver excepcionesVale.js).
  "Registro anticipado": siNo(viaje.registroAnticipado),
  "Min. faltantes": num(viaje.minutosFaltantes),
  "Min. mínimos": num(viaje.minutosMinimos),
  "Motivo anticipado": viaje.motivoAnticipado ?? VACIO,
  "Foto omitida": siNo(viaje.fotoOmitida),
  "Motivo sin foto": viaje.motivoSinFoto ?? VACIO,
});

/**
 * Viajes de un detalle de material.
 *
 * `vale_material_viajes` manda en los tres tipos —incluido el Tipo 3, que es
 * justo donde la app permite cambiar de banco viaje por viaje. Los tickets solo
 * arman las filas cuando el vale de corte tiene tickets impresos pero ningún
 * viaje registrado; ahí el ticket es el único rastro del viaje y las cantidades
 * viven en la hoja Material, no por viaje.
 */
const filasViajesDeDetalle = (vale, det, numeroDetalle, tickets) => {
  const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;
  const viajes = [...(det.vale_material_viajes ?? [])].sort(
    (a, b) => (a.numero_viaje ?? 0) - (b.numero_viaje ?? 0),
  );

  if (viajes.length > 0) {
    return viajes.map((v) =>
      filaViajeMaterial(vale, det, {
        detalle: numeroDetalle,
        numero: v.numero_viaje,
        banco: getBancoViaje(v, det),
        cambioDeBanco: !!v.id_banco_override,
        distanciaKm: v.distancia_km_override ?? det.distancia_km,
        m3: v.volumen_m3,
        // Solo Tipos 1 y 2 pesan el viaje; el corte se mide en volumen.
        toneladas: v.peso_ton,
        precioM3: v.precio_m3_override ?? v.precio_m3 ?? det.precio_m3,
        importe: v.costo_viaje_override ?? v.costo_viaje,
        remision: v.folio_vale_fisico,
        ticket: tickets.get(v.numero_viaje)?.folio_ticket,
        horaRegistro: v.hora_registro,
        personaRegistro: v.persona_registro,
        registroAnticipado: v.registro_anticipado,
        minutosFaltantes: v.minutos_faltantes_anticipado,
        minutosMinimos: v.minutos_minimos_calculados,
        motivoAnticipado: motivoAnticipado(v),
        fotoOmitida: v.foto_omitida,
        motivoSinFoto: motivoSinFoto(v),
      }),
    );
  }

  if (tipoId === 3 && tickets.size > 0) {
    return [...tickets.values()]
      .sort((a, b) => (a.numero_ticket ?? 0) - (b.numero_ticket ?? 0))
      .map((ticket) =>
        filaViajeMaterial(vale, det, {
          detalle: numeroDetalle,
          numero: ticket.numero_ticket,
          banco: det.bancos?.banco,
          cambioDeBanco: false,
          distanciaKm: det.distancia_km,
          ticket: ticket.folio_ticket,
          horaRegistro: ticket.fecha_impresion,
          personaRegistro: ticket.persona_registro,
        }),
      );
  }

  // Tipo 2 (base asfáltica): 1 vale = 1 viaje, capturado en el propio detalle
  // sin fila en vale_material_viajes. Se emite igual para que el ledger de
  // viajes esté completo y el conteo del vale cuadre.
  if (tipoId === 2) {
    return [
      filaViajeMaterial(vale, det, {
        detalle: numeroDetalle,
        numero: 1,
        banco: det.bancos?.banco,
        cambioDeBanco: false,
        distanciaKm: det.distancia_km,
        m3: det.volumen_real_m3,
        toneladas: det.peso_ton,
        precioM3: det.precio_m3,
        importe: det.costo_total,
        remision: det.folio_vale_fisico,
        horaRegistro: vale.fecha_completado,
        personaRegistro: vale.persona_completador,
        // El Tipo 2 declara la foto omitida en el detalle, no en el viaje.
        fotoOmitida: det.foto_omitida,
        motivoSinFoto: motivoSinFoto(det),
      }),
    ];
  }

  // Vale de material sin viajes todavía: no se inventa una fila de viaje. El
  // vale ya aparece en las hojas Vales y Material.
  return [];
};

// ─── Hoja "Viajes renta" ────────────────────────────────────────────────────

const FORMATOS_VIAJES_RENTA = {
  ...FORMATOS_GENERALES,
  "Fecha registro": FMT_FECHA,
  "Hora registro": FMT_HORA,
};

/**
 * Viajes de renta. Un viaje deja hasta dos rastros: la fila de
 * `vale_renta_viajes` (hora y quién lo registró) y el ticket de descarga
 * (material y banco reales, que pueden variar viaje a viaje). Se cruzan por
 * número de viaje.
 *
 * Solo se listan los viajes con rastro. Cuántos se declararon al crear el vale
 * está en la hoja Renta ("Viajes declarados"): rellenar hasta ese número
 * generaría filas vacías que no corresponden a ningún viaje registrado.
 */
const filasViajesRenta = (vale) => {
  const det = vale.vale_renta_detalle?.[0];
  if (!det) return [];

  const materialPedido = det.material?.material;
  const porNumero = new Map();
  const obtener = (numero) => {
    if (!porNumero.has(numero)) porNumero.set(numero, { numero });
    return porNumero.get(numero);
  };

  for (const v of det.vale_renta_viajes ?? []) {
    const item = obtener(v.numero_viaje);
    item.horaRegistro = v.hora_registro;
    item.personaRegistro = v.persona_registro;
  }
  for (const t of vale.tickets_descarga ?? []) {
    const item = obtener(t.numero_ticket);
    item.material = t.material_ticket?.material;
    item.banco = t.banco_descarga;
    item.ticket = t.folio_ticket;
    if (!item.horaRegistro) item.horaRegistro = t.fecha_impresion;
    if (!item.personaRegistro) item.personaRegistro = t.persona_registro;
  }

  return [...porNumero.values()]
    .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
    .map((v) => ({
      ...datosGeneralesVale(vale),
      "Equipo rentado": texto(materialPedido),
      Cobro: esRentaPorDia(det) ? "Por día" : "Por hora",
      Viaje: num(v.numero),
      "Material descargado": texto(v.material ?? materialPedido),
      "Banco de descarga": texto(v.banco),
      Ticket: texto(v.ticket),
      "Fecha registro": fechaExcel(v.horaRegistro),
      "Hora registro": horaExcel(v.horaRegistro),
      "Registró viaje": nombrePersona(v.personaRegistro),
    }));
};

// ─── Hoja "Desverificaciones" ───────────────────────────────────────────────

const FORMATOS_DESVERIFICACIONES = {
  ...FORMATOS_GENERALES,
  "Fecha solicitud": FMT_FECHA,
  "Hora solicitud": FMT_HORA,
  "Fecha respuesta": FMT_FECHA,
};

/**
 * Solicitudes para revertir la verificación de un vale. Es su propia tabla
 * (`solicitudes_desverificacion`, varias por vale) y trae los dos motivos
 * escritos a mano del flujo: el de quien pide y el de quien responde.
 */
const filasDesverificaciones = (vale) =>
  (vale.solicitudes_desverificacion ?? []).map((s) => ({
    ...datosGeneralesVale(vale),
    "Estado solicitud": texto(s.estado),
    "Sindicato requerido": texto(s.sindicatos?.sindicato),
    Solicitó: nombrePersona(s.persona_solicitante),
    "Fecha solicitud": fechaExcel(s.fecha_solicitud),
    "Hora solicitud": horaExcel(s.fecha_solicitud),
    "Motivo solicitud": texto(s.motivo_solicitud),
    Respondió: nombrePersona(s.persona_respondedor),
    "Fecha respuesta": fechaExcel(s.fecha_respuesta),
    "Motivo respuesta": texto(s.motivo_respuesta),
  }));

// ─── API pública ────────────────────────────────────────────────────────────

/**
 * Arma las filas de cada hoja. Expuesto aparte del descargador para poder
 * inspeccionar el resultado sin generar el archivo.
 *
 * @param {Array} vales - vales enriquecidos por useDashboardUnificado
 * @returns {{vales: Array, material: Array, renta: Array,
 *            viajesMaterial: Array, viajesRenta: Array}}
 */
export const construirHojasVales = (vales) => {
  const hojas = {
    vales: [],
    material: [],
    renta: [],
    viajesMaterial: [],
    viajesRenta: [],
    desverificaciones: [],
  };

  for (const vale of vales ?? []) {
    let viajesDelVale = 0;
    hojas.desverificaciones.push(...filasDesverificaciones(vale));

    if (vale.tipo_vale === "renta") {
      const det = vale.vale_renta_detalle?.[0];
      if (det) hojas.renta.push(filaDetalleRenta(vale, det));

      const viajes = filasViajesRenta(vale);
      hojas.viajesRenta.push(...viajes);
      viajesDelVale = viajes.length;
    } else {
      // Los tickets físicos cuelgan del vale, no del detalle. En Tipo 3 se
      // imprime un ticket por viaje (ticket N ↔ viaje N).
      const tickets = new Map(
        (vale.tickets_material ?? []).map((t) => [t.numero_ticket, t]),
      );

      (vale.vale_material_detalles ?? []).forEach((det, indice) => {
        const numeroDetalle = indice + 1;
        hojas.material.push(filaDetalleMaterial(vale, det, numeroDetalle));

        // Los tickets se consumen una sola vez: un segundo detalle no debe
        // volver a emitir los mismos tickets como si fueran otros viajes.
        const viajes = filasViajesDeDetalle(
          vale,
          det,
          numeroDetalle,
          indice === 0 ? tickets : new Map(),
        );
        hojas.viajesMaterial.push(...viajes);
        viajesDelVale += viajes.length;
      });
    }

    hojas.vales.push(filaVale(vale, viajesDelVale));
  }

  return hojas;
};

/**
 * Exporta los vales a Excel, una hoja por nivel de detalle.
 *
 * @param {Array} vales - vales enriquecidos por useDashboardUnificado
 * @param {string} fileName - nombre del archivo (sin extensión)
 */
export const exportarValesExcel = (vales, fileName) => {
  const hojas = construirHojasVales(vales);

  exportMultipleSheetsToExcel(
    [
      { name: "Vales", data: hojas.vales, formatos: FORMATOS_VALES },
      { name: "Material", data: hojas.material, formatos: FORMATOS_MATERIAL },
      { name: "Renta", data: hojas.renta, formatos: FORMATOS_RENTA },
      {
        name: "Viajes material",
        data: hojas.viajesMaterial,
        formatos: FORMATOS_VIAJES_MATERIAL,
      },
      {
        name: "Viajes renta",
        data: hojas.viajesRenta,
        formatos: FORMATOS_VIAJES_RENTA,
      },
      {
        name: "Desverificaciones",
        data: hojas.desverificaciones,
        formatos: FORMATOS_DESVERIFICACIONES,
      },
    ].map((hoja) => ({ ...hoja, autoFiltro: true })),
    fileName,
  );
};
