/**
 * src/hooks/useAutorizacion.js
 *
 * Hook de datos para la pestaña "Autorizar Vales" (control del Administrador,
 * independiente de la verificación del sindicato). Fetch server-side por
 * rango de fechas + filtros client-side + selección en lote para autorizar
 * varios vales a la vez, más desautorizar uno por uno.
 *
 * Dependencias: config/supabase.js, hooks/useAuth.jsx
 * Usado en: pages/AutorizarVales.jsx
 */

// 1. React
import { useState, useEffect, useMemo, useCallback } from "react";

// 2. Config
import { supabase } from "../config/supabase";

// 3. Hooks personalizados
import { useAuth } from "./useAuth";

// 4. Utils
import { formatearFolio } from "../utils/formatters";

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getDefaultFechaInicio = () => {
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  return formatDate(hace30Dias);
};

// fecha_creacion es timestamptz en UTC. Un substring(0, 10) ingenuo toma el
// día calendario en UTC, no en México (UTC-6): un vale creado entre 18:00 y
// 23:59 hora local cae en el día UTC siguiente y se "escapa" al filtrar o
// mostrar por rango de fechas. Se convierte siempre a la fecha calendario de
// America/Mexico_City antes de comparar.
const formatterFechaMx = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
});
const getFechaLocalMx = (isoTimestamp) =>
  isoTimestamp ? formatterFechaMx.format(new Date(isoTimestamp)) : undefined;

// Fecha efectiva de un vale para filtrar por rango/semana/mes: usa
// fecha_programada si existe (vales "programados" se crean un día antes de
// operar — es_programado), si no cae a fecha_creacion. Mismo criterio que
// useValesFilters.js.
const getFechaEfectiva = (vale) =>
  vale.fecha_programada ?? getFechaLocalMx(vale.fecha_creacion);

const SELECT_AUTORIZACION = `
  *,
  obras:id_obra (
    id_obra, obra, cc,
    empresas:id_empresa (empresa, sufijo, logo)
  ),
  operadores:id_operador (
    id_operador, id_sindicato, nombre_completo,
    sindicatos:id_sindicato (id_sindicato, sindicato)
  ),
  vehiculos:id_vehiculo (id_vehiculo, placas, capacidad_m3),
  persona:id_persona_creador (nombre, primer_apellido, segundo_apellido),
  persona_autorizador:id_persona_autorizador (nombre, primer_apellido, segundo_apellido),
  persona_completador:id_persona_completador (nombre, primer_apellido, segundo_apellido),
  persona_verificador:id_persona_verificador (nombre, primer_apellido, segundo_apellido),
  tickets_material (id_ticket, numero_ticket, folio_ticket, fecha_impresion),
  tickets_descarga (
    numero_ticket, id_material_ticket,
    material_ticket:id_material_ticket (material)
  ),
  vale_material_detalles (
    id_detalle_material, capacidad_m3, distancia_km, cantidad_pedida_m3,
    peso_ton, volumen_real_m3, precio_m3, costo_total,
    folio_banco, requisicion, notas_adicionales,
    tarifa_primer_km, tarifa_subsecuente,
    material:id_material (
      id_material, material,
      tipo_de_material:id_tipo_de_material (id_tipo_de_material, tipo_de_material)
    ),
    bancos:id_banco (id_banco, banco),
    vale_material_viajes (
      id_viaje, numero_viaje, hora_registro, peso_ton, volumen_m3,
      precio_m3, costo_viaje, folio_vale_fisico,
      id_banco_override, distancia_km_override, precio_m3_override, costo_viaje_override,
      bancos_override:id_banco_override (id_banco, banco)
    )
  ),
  vale_renta_detalle (
    id_vale_renta_detalle, capacidad_m3, hora_inicio, hora_fin,
    total_horas, total_dias, costo_total, numero_viajes,
    notas_adicionales, es_renta_por_dia,
    material:id_material (id_material, material),
    precios_renta:id_precios_renta (costo_hr, costo_dia),
    vale_renta_viajes (id_viaje, numero_viaje, hora_registro)
  ),
  solicitudes_desverificacion (
    id_solicitud, estado, motivo_solicitud, motivo_respuesta,
    fecha_solicitud, fecha_respuesta, id_sindicato_requerido,
    sindicatos:id_sindicato_requerido (sindicato),
    persona_solicitante:id_persona_solicitante (nombre, primer_apellido),
    persona_respondedor:id_persona_respondedor (nombre, primer_apellido)
  )
`;

const getMaterialVale = (vale) => {
  if (vale.tipo_vale === "renta") {
    return vale.vale_renta_detalle?.[0]?.material?.material ?? "—";
  }
  return vale.vale_material_detalles?.[0]?.material?.material ?? "—";
};

// "Tipo" = clasificación real del material (Materiales Pétreos / Base Asfáltica /
// Tepetate-Corte, según tipo_de_material en catálogo) o "Renta" para vales de renta.
// No confundir con vale.tipo_vale (solo distingue material vs. renta a nivel BD).
const getTipoValeLabel = (vale) => {
  if (vale.tipo_vale === "renta") return "Renta";
  return (
    vale.vale_material_detalles?.[0]?.material?.tipo_de_material?.tipo_de_material ??
    "Material"
  );
};

// Volumen solo aplica a vales de material — vale_material_detalles.volumen_real_m3
// ya viene calculado con el criterio correcto por tipo (Tipos 1/2 vía viajes,
// Tipo 3 vía ticket — ver CLAUDE.md). Renta no tiene concepto de volumen.
const getVolumenVale = (vale) => {
  if (vale.tipo_vale === "renta") return null;
  return (vale.vale_material_detalles ?? []).reduce(
    (sum, det) => sum + Number(det.volumen_real_m3 || 0),
    0,
  );
};

// Folios de remisión: folio_vale_fisico por viaje (Tipos 1/2), con fallback a
// folio_banco del detalle si el viaje no lo tiene; más folio_ticket de
// tickets_material (Tipo 3 — corte). Mismo criterio que el export de
// DashboardUnificado.jsx.
const getFoliosRemision = (vale) => {
  const folios = new Set();
  for (const det of vale.vale_material_detalles ?? []) {
    const foliosViaje = (det.vale_material_viajes ?? [])
      .map((v) => v.folio_vale_fisico)
      .filter(Boolean);
    if (foliosViaje.length > 0) {
      foliosViaje.forEach((f) => folios.add(f));
    } else if (det.folio_banco) {
      folios.add(det.folio_banco);
    }
  }
  for (const ticket of vale.tickets_material ?? []) {
    if (ticket.folio_ticket) folios.add(ticket.folio_ticket);
  }
  return [...folios];
};

const calcularKpisAutorizacion = (lista) => {
  let pendientes = 0;
  let autorizados = 0;
  let verificados = 0;
  let conAlertas = 0;
  let totalM3 = 0;
  let totalToneladas = 0;
  let importeTotal = 0;

  for (const v of lista) {
    if (v.autorizado) autorizados++;
    else pendientes++;
    if (v.verificado_por_sindicato) verificados++;
    if ((v._alertas?.length ?? 0) > 0) conAlertas++;

    if (v.tipo_vale === "renta") {
      importeTotal += Number(v.vale_renta_detalle?.[0]?.costo_total || 0);
    } else {
      for (const det of v.vale_material_detalles ?? []) {
        totalM3 += Number(det.volumen_real_m3 || 0);
        totalToneladas += Number(det.peso_ton || 0);
        importeTotal += Number(det.costo_total || 0);
      }
    }
  }

  return {
    total: lista.length,
    pendientes,
    autorizados,
    verificados,
    conAlertas,
    totalM3,
    totalToneladas,
    importeTotal,
  };
};

// ── Alertas / banderas de atención ──────────────────────────────────────────
// Heurísticas 100% en cliente (sin queries extra) para que el Administrador
// detecte vales que ameritan revisión sin tener que abrirlos uno por uno. El
// sistema no captura ubicación GPS, así que "incongruencia" se aproxima con
// lo que sí existe: horas de registro, distancia banco↔obra declarada y
// remisiones/pesos repetidos.

// Velocidad promedio asumida para un viaje redondo (ida cargado + vuelta
// vacío) en obra. Un viaje registrado con menos tiempo del físicamente
// posible para la distancia declarada es indicio de doble captura o de que
// el operador no completó el recorrido entre un registro y el siguiente.
const VELOCIDAD_PROMEDIO_KMH = 25;
const minutosMinimosViaje = (distanciaKm) => {
  const km = Number(distanciaKm);
  if (!km || km <= 0) return 0;
  return ((km * 2) / VELOCIDAD_PROMEDIO_KMH) * 60;
};

// Igual que getFoliosRemision pero sin deduplicar y con el número de viaje/
// ticket asociado a cada folio — necesario para señalar exactamente qué
// viaje quedó duplicado, no solo que "hay una remisión repetida".
const getRemisionesConViaje = (vale) => {
  const items = [];
  for (const det of vale.vale_material_detalles ?? []) {
    const viajesConFolio = (det.vale_material_viajes ?? []).filter((v) => v.folio_vale_fisico);
    if (viajesConFolio.length > 0) {
      viajesConFolio.forEach((v) => items.push({ folio: v.folio_vale_fisico, numeroViaje: v.numero_viaje }));
    } else if (det.folio_banco) {
      items.push({ folio: det.folio_banco, numeroViaje: null });
    }
  }
  for (const ticket of vale.tickets_material ?? []) {
    if (ticket.folio_ticket) items.push({ folio: ticket.folio_ticket, numeroViaje: ticket.numero_ticket });
  }
  return items;
};

const getFoliosRemisionCrudo = (vale) => getRemisionesConViaje(vale).map((r) => r.folio);

// Alertas que solo dependen de los datos del propio vale.
const detectarAlertasIntraVale = (vale) => {
  const alertas = [];

  // 1. Renta: menos viajes registrados de los declarados al crear el vale.
  for (const det of vale.vale_renta_detalle ?? []) {
    const declarados = Number(det.numero_viajes || 0);
    const registrados = (det.vale_renta_viajes ?? []).length;
    if (declarados > 0 && registrados < declarados) {
      alertas.push({
        tipo: "pocos_viajes",
        texto: `Renta: ${registrados} de ${declarados} viajes declarados registrados`,
      });
    }
  }

  // 2. Material: volumen real muy por debajo de lo pedido — posibles viajes
  // sin registrar.
  for (const det of vale.vale_material_detalles ?? []) {
    const pedido = Number(det.cantidad_pedida_m3 || 0);
    const real = Number(det.volumen_real_m3 || 0);
    if (pedido > 0 && real > 0 && real < pedido * 0.6) {
      alertas.push({
        tipo: "pocos_viajes",
        texto: `Volumen registrado (${real.toFixed(1)} m³) muy por debajo de lo pedido (${pedido.toFixed(1)} m³)`,
      });
    }
  }

  // Viajes de material con hora + distancia, ordenados cronológicamente —
  // se reutilizan para los chequeos de tiempos y de peso duplicado.
  const viajes = [];
  for (const det of vale.vale_material_detalles ?? []) {
    for (const v of det.vale_material_viajes ?? []) {
      if (v.hora_registro) {
        viajes.push({
          hora: new Date(v.hora_registro).getTime(),
          distanciaKm: v.distancia_km_override ?? det.distancia_km,
          peso: v.peso_ton,
          numero: v.numero_viaje,
        });
      }
    }
  }
  viajes.sort((a, b) => a.hora - b.hora);

  // 3. Tiempos entre viajes incongruentes con la distancia banco↔obra.
  for (let i = 1; i < viajes.length; i++) {
    const gapMin = (viajes[i].hora - viajes[i - 1].hora) / 60000;
    const minimoEsperado = minutosMinimosViaje(viajes[i].distanciaKm);
    if (minimoEsperado > 0 && gapMin >= 0 && gapMin < minimoEsperado * 0.4) {
      alertas.push({
        tipo: "tiempos",
        texto: `Viajes ${viajes[i - 1].numero ?? "?"} y ${viajes[i].numero ?? "?"} registrados con solo ${gapMin.toFixed(0)} min de diferencia (esperado ~${minimoEsperado.toFixed(0)} min para la distancia declarada)`,
      });
      break;
    }
  }

  // 4. Mismo peso exacto repetido entre viajes del vale (posible copiar/pegar).
  const pesosVistos = new Map(); // peso (fijo a 3 decimales) -> primer numero_viaje visto
  for (const v of viajes) {
    const peso = Number(v.peso);
    if (!peso) continue;
    const key = peso.toFixed(3);
    if (pesosVistos.has(key)) {
      const primero = pesosVistos.get(key);
      alertas.push({
        tipo: "cantidad_duplicada",
        texto: `Peso de ${key} ton idéntico entre el viaje #${primero ?? "?"} y el viaje #${v.numero ?? "?"} — revisar si uno se capturó por error`,
      });
      break;
    }
    pesosVistos.set(key, v.numero);
  }

  // 5. Remisión repetida dentro del mismo vale (mismo folio en dos viajes/tickets).
  const remisiones = getRemisionesConViaje(vale);
  const foliosVistos = new Map(); // folio -> primer numero_viaje/ticket visto
  for (const r of remisiones) {
    if (foliosVistos.has(r.folio)) {
      const primero = foliosVistos.get(r.folio);
      const refPrimero = primero != null ? ` (viaje #${primero})` : "";
      const refActual = r.numeroViaje != null ? ` (viaje #${r.numeroViaje})` : "";
      alertas.push({
        tipo: "remision_duplicada",
        texto: `La remisión ${r.folio} está capturada dos veces en este vale${refPrimero}${refActual}`,
      });
      break;
    }
    foliosVistos.set(r.folio, r.numeroViaje);
  }

  return alertas;
};

// Alertas que requieren comparar un vale contra los DEMÁS del listado
// actualmente cargado: la misma remisión usada en más de un vale, o un vale
// que luce idéntico a otro (mismo operador + obra + fecha + material) —
// posible doble captura del mismo trabajo. Cada alerta incluye
// `relacionados` (id_vale + folio del otro vale) para que la UI pueda decir
// exactamente CON CUÁL vale se está comparando, no solo "hay un duplicado".
const construirAlertasCruzadas = (lista) => {
  const porRemision = new Map(); // folio -> [{ idVale, folio }] (uno por vale distinto)
  const porFirma = new Map(); // firma operador|obra|fecha|material|tipo -> [{ idVale, folio }]

  for (const v of lista) {
    for (const f of new Set(getFoliosRemisionCrudo(v))) {
      if (!porRemision.has(f)) porRemision.set(f, []);
      porRemision.get(f).push({ idVale: v.id_vale, folio: v.folio });
    }
    if (v.id_operador && v.id_obra && v._fecha) {
      const firma = `${v.id_operador}|${v.id_obra}|${v._fecha}|${v._material}|${v.tipo_vale}`;
      if (!porFirma.has(firma)) porFirma.set(firma, []);
      porFirma.get(firma).push({ idVale: v.id_vale, folio: v.folio });
    }
  }

  const resultado = new Map();
  const agregar = (idVale, alerta) => {
    if (!resultado.has(idVale)) resultado.set(idVale, []);
    resultado.get(idVale).push(alerta);
  };

  // Todas las ocurrencias distintas al propio id_vale (una por vale, aunque
  // ese vale repita el folio internamente más de una vez).
  const otrosVales = (ocurrencias, idVale) => {
    const vistos = new Set([idVale]);
    const otros = [];
    for (const o of ocurrencias) {
      if (!vistos.has(o.idVale)) {
        vistos.add(o.idVale);
        otros.push(o);
      }
    }
    return otros;
  };

  for (const [folio, ocurrencias] of porRemision) {
    const idsUnicos = new Set(ocurrencias.map((o) => o.idVale));
    if (idsUnicos.size <= 1) continue;
    for (const idVale of idsUnicos) {
      const otros = otrosVales(ocurrencias, idVale);
      if (otros.length === 0) continue;
      const extra = otros.length > 1 ? ` y ${otros.length - 1} vale(s) más` : "";
      agregar(idVale, {
        tipo: "remision_duplicada",
        texto: `La remisión ${folio} también está capturada en el vale ${formatearFolio(otros[0].folio)}${extra}`,
        relacionados: otros,
      });
    }
  }

  for (const ocurrencias of porFirma.values()) {
    const idsUnicos = new Set(ocurrencias.map((o) => o.idVale));
    if (idsUnicos.size <= 1) continue;
    for (const idVale of idsUnicos) {
      const otros = otrosVales(ocurrencias, idVale);
      if (otros.length === 0) continue;
      const extra = otros.length > 1 ? ` y ${otros.length - 1} vale(s) más` : "";
      agregar(idVale, {
        tipo: "vale_duplicado",
        texto: `Mismo operador, obra, material y fecha que el vale ${formatearFolio(otros[0].folio)}${extra} — revisar posible doble captura`,
        relacionados: otros,
      });
    }
  }

  return resultado;
};

export const useAutorizacion = () => {
  const { userProfile } = useAuth();

  const [vales, setVales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fechaInicio, setFechaInicio] = useState(getDefaultFechaInicio());
  const [fechaFin, setFechaFin] = useState(formatDate(new Date()));

  const [filtroCCs, setFiltroCCs] = useState([]);
  const [filtroSindicatos, setFiltroSindicatos] = useState([]);
  const [filtroMateriales, setFiltroMateriales] = useState([]);
  const [filtroTiposVale, setFiltroTiposVale] = useState([]);
  const [estadoAutorizacion, setEstadoAutorizacion] = useState("pendientes"); // pendientes | autorizados | todos
  const [busqueda, setBusqueda] = useState("");
  const [soloAlertas, setSoloAlertas] = useState(false);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [autorizando, setAutorizando] = useState(false);
  const [desautorizando, setDesautorizando] = useState(false);

  const fetchVales = useCallback(async (inicio, fin) => {
    try {
      setLoading(true);
      setError(null);

      // .range(0, 4999) evita el límite default de 1000 filas de PostgREST.
      // Los vales conciliados se excluyen: los conciliados antes de que
      // existiera esta autorización nunca se autorizarán retroactivamente y
      // solo ensucian los filtros (ver CLAUDE.md 2026-07-24).
      // Offset -06:00 explícito: sin él, Postgres interpreta el timestamp
      // como UTC y el rango queda desfasado 6h respecto al día calendario
      // de México (ver getFechaLocalMx).
      const { data, error: err } = await supabase
        .from("vales")
        .select(SELECT_AUTORIZACION)
        .gte("fecha_creacion", inicio + "T00:00:00-06:00")
        .lte("fecha_creacion", fin + "T23:59:59-06:00")
        .neq("estado", "cancelado")
        .neq("estado", "conciliado")
        .order("fecha_creacion", { ascending: false })
        .range(0, 4999);

      if (err) throw err;
      setVales(data ?? []);
    } catch (err) {
      console.error("Error en useAutorizacion:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVales(fechaInicio, fechaFin);
  }, [fechaInicio, fechaFin, fetchVales]);

  const refetch = useCallback(() => {
    fetchVales(fechaInicio, fechaFin);
  }, [fetchVales, fechaInicio, fechaFin]);

  const valesEnriquecidos = useMemo(
    () =>
      vales.map((v) => ({
        ...v,
        _material: getMaterialVale(v),
        _foliosRemision: getFoliosRemision(v),
        _fecha: getFechaEfectiva(v),
        _tipoVale: getTipoValeLabel(v),
        _volumen: getVolumenVale(v),
      })),
    [vales],
  );

  // Filtra por fecha efectiva (programada > creación) en vez de confiar
  // ciegamente en el rango ya acotado por el fetch: protege el caso de un
  // vale "programado" cuya fecha_creacion cae dentro del rango pero cuya
  // fecha_programada (la que se muestra en la columna Fecha) cae fuera, o
  // viceversa. Ver getFechaEfectiva.
  const valesEnRango = useMemo(
    () =>
      valesEnriquecidos.filter(
        (v) => v._fecha && v._fecha >= fechaInicio && v._fecha <= fechaFin,
      ),
    [valesEnriquecidos, fechaInicio, fechaFin],
  );

  // Alertas: las cruzadas (remisión repetida entre vales, vale duplicado)
  // necesitan comparar contra todo el rango cargado, no solo lo filtrado —
  // por eso se calculan aquí y no dentro de valesFiltrados.
  const alertasCruzadasPorVale = useMemo(
    () => construirAlertasCruzadas(valesEnRango),
    [valesEnRango],
  );

  const valesConAlertas = useMemo(
    () =>
      valesEnRango.map((v) => ({
        ...v,
        _alertas: [
          ...detectarAlertasIntraVale(v),
          ...(alertasCruzadasPorVale.get(v.id_vale) ?? []),
        ],
      })),
    [valesEnRango, alertasCruzadasPorVale],
  );

  const valesFiltrados = useMemo(() => {
    let lista = valesConAlertas;

    if (soloAlertas) {
      lista = lista.filter((v) => (v._alertas?.length ?? 0) > 0);
    }
    if (estadoAutorizacion === "pendientes") {
      lista = lista.filter((v) => !v.autorizado);
    } else if (estadoAutorizacion === "autorizados") {
      lista = lista.filter((v) => v.autorizado);
    }
    if (filtroCCs.length > 0) {
      lista = lista.filter((v) => {
        const key = v.obras ? `${v.obras.cc} · ${v.obras.obra}` : null;
        return key && filtroCCs.includes(key);
      });
    }
    if (filtroSindicatos.length > 0) {
      lista = lista.filter((v) =>
        filtroSindicatos.includes(v.operadores?.sindicatos?.sindicato),
      );
    }
    if (filtroMateriales.length > 0) {
      lista = lista.filter((v) => filtroMateriales.includes(v._material));
    }
    if (filtroTiposVale.length > 0) {
      lista = lista.filter((v) => filtroTiposVale.includes(v._tipoVale));
    }
    if (busqueda.trim()) {
      const term = busqueda.toLowerCase();
      lista = lista.filter(
        (v) =>
          v.folio?.toLowerCase().includes(term) ||
          v.obras?.obra?.toLowerCase().includes(term) ||
          v.operadores?.nombre_completo?.toLowerCase().includes(term) ||
          v._material?.toLowerCase().includes(term) ||
          v.vehiculos?.placas?.toLowerCase().includes(term) ||
          v._foliosRemision?.some((f) => f.toLowerCase().includes(term)),
      );
    }

    return lista;
  }, [
    valesConAlertas,
    soloAlertas,
    estadoAutorizacion,
    filtroCCs,
    filtroSindicatos,
    filtroMateriales,
    filtroTiposVale,
    busqueda,
  ]);

  // KPIs globales (todo el rango, ignora filtros de CC/sindicato/material/
  // búsqueda/tab) vs. filtrados (respetan todo lo anterior). El toggle entre
  // ambos lo dispara aplicarKpis/resetearKpis desde el botón "Aplicar".
  const [usarKpisLocales, setUsarKpisLocales] = useState(false);

  const kpisGlobales = useMemo(
    () => calcularKpisAutorizacion(valesConAlertas),
    [valesConAlertas],
  );
  const kpisFiltrados = useMemo(
    () => calcularKpisAutorizacion(valesFiltrados),
    [valesFiltrados],
  );

  const aplicarKpis = useCallback(() => setUsarKpisLocales(true), []);
  const resetearKpis = useCallback(() => setUsarKpisLocales(false), []);

  const opciones = useMemo(() => {
    const ccs = [
      ...new Set(
        valesEnRango
          .map((v) => (v.obras ? `${v.obras.cc} · ${v.obras.obra}` : null))
          .filter(Boolean),
      ),
    ].sort();
    const sindicatos = [
      ...new Set(
        valesEnRango
          .map((v) => v.operadores?.sindicatos?.sindicato)
          .filter(Boolean),
      ),
    ].sort();
    const materiales = [
      ...new Set(
        valesEnRango.map((v) => v._material).filter((m) => m && m !== "—"),
      ),
    ].sort();
    const tiposVale = [...new Set(valesEnRango.map((v) => v._tipoVale))].sort();
    return { ccs, sindicatos, materiales, tiposVale };
  }, [valesEnRango]);

  // ── Selección en lote ───────────────────────────────────────────────────

  const esSeleccionable = (vale) =>
    !vale.autorizado && vale.estado !== "cancelado" && vale.estado !== "conciliado";

  const toggleSelect = useCallback((idVale) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idVale)) next.delete(idVale);
      else next.add(idVale);
      return next;
    });
  }, []);

  const selectAllPendientesVisibles = useCallback(() => {
    const seleccionables = valesFiltrados.filter(esSeleccionable).map((v) => v.id_vale);
    setSelectedIds((prev) => {
      const todosSeleccionados = seleccionables.every((id) => prev.has(id));
      return todosSeleccionados ? new Set() : new Set(seleccionables);
    });
  }, [valesFiltrados]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ── Autorizar / desautorizar ────────────────────────────────────────────

  const autorizarBatch = useCallback(
    async (idsVales) => {
      setAutorizando(true);
      const resultado = { autorizados: [], errores: [] };

      for (const idVale of idsVales) {
        try {
          const { data, error: rpcError } = await supabase.rpc("autorizar_vale", {
            p_id_vale: idVale,
            p_id_persona_autorizador: userProfile.id_persona,
          });

          if (rpcError) throw rpcError;
          if (!data?.success) throw new Error(data?.error || "Error al autorizar");

          await supabase.from("vale_accesos").insert({
            id_vale: idVale,
            id_persona: userProfile.id_persona,
            tipo_accion: "autorizacion_admin",
            user_agent: navigator.userAgent,
          });

          resultado.autorizados.push(idVale);
        } catch (err) {
          resultado.errores.push({ idVale, error: err.message });
        }
      }

      setAutorizando(false);
      clearSelection();
      await refetch();
      return resultado;
    },
    [userProfile, clearSelection, refetch],
  );

  const desautorizarVale = useCallback(
    async (idVale, motivo) => {
      try {
        setDesautorizando(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc("desautorizar_vale", {
          p_id_vale: idVale,
          p_id_persona_autorizador: userProfile.id_persona,
          p_motivo: motivo?.trim() || null,
        });

        if (rpcError) throw rpcError;
        if (!data?.success) throw new Error(data?.error || "Error al desautorizar");

        await supabase.from("vale_accesos").insert({
          id_vale: idVale,
          id_persona: userProfile.id_persona,
          tipo_accion: "desautorizacion_admin",
          user_agent: navigator.userAgent,
        });

        await refetch();
        return { success: true };
      } catch (err) {
        setError(err.message || "Error al desautorizar el vale");
        return { success: false, error: err.message };
      } finally {
        setDesautorizando(false);
      }
    },
    [userProfile, refetch],
  );

  return {
    valesFiltrados,
    // Todos los vales del rango cargado (sin filtros de tab/CC/etc.), con
    // _alertas ya calculadas — permite resolver por id_vale el vale al que
    // apunta una alerta cruzada (remisión/vale duplicado) aunque esté fuera
    // de los filtros activos.
    todosVales: valesConAlertas,
    loading,
    error,
    opciones,
    kpis: usarKpisLocales ? kpisFiltrados : kpisGlobales,
    kpisDesdeFiltros: usarKpisLocales,
    aplicarKpis,
    resetearKpis,
    filtros: {
      fechaInicio,
      fechaFin,
      filtroCCs,
      filtroSindicatos,
      filtroMateriales,
      filtroTiposVale,
      estadoAutorizacion,
      busqueda,
      soloAlertas,
    },
    cambiarSoloAlertas: setSoloAlertas,
    cambiarRango: (inicio, fin) => {
      setFechaInicio(inicio);
      setFechaFin(fin);
      clearSelection();
    },
    // weekStr = "2026-W25"
    cambiarSemana: (weekStr) => {
      if (!weekStr) return;
      const [yearStr, wStr] = weekStr.split("-W");
      const year = parseInt(yearStr);
      const week = parseInt(wStr);
      const jan4 = new Date(year, 0, 4);
      const jan4Day = jan4.getDay() || 7;
      const primerLunes = new Date(jan4);
      primerLunes.setDate(jan4.getDate() - (jan4Day - 1));
      const weekStart = new Date(primerLunes);
      weekStart.setDate(primerLunes.getDate() + (week - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      setFechaInicio(formatDate(weekStart));
      setFechaFin(formatDate(weekEnd));
      clearSelection();
    },
    // monthStr = "2026-06"
    cambiarMes: (monthStr) => {
      if (!monthStr) return;
      const [yearStr, mStr] = monthStr.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(mStr);
      setFechaInicio(`${yearStr}-${String(month).padStart(2, "0")}-01`);
      setFechaFin(formatDate(new Date(year, month, 0)));
      clearSelection();
    },
    cambiarCCs: setFiltroCCs,
    cambiarSindicatos: setFiltroSindicatos,
    cambiarMateriales: setFiltroMateriales,
    cambiarTiposVale: setFiltroTiposVale,
    cambiarEstadoAutorizacion: (valor) => {
      setEstadoAutorizacion(valor);
      clearSelection();
    },
    cambiarBusqueda: setBusqueda,
    refetch,
    selectedIds,
    esSeleccionable,
    toggleSelect,
    selectAllPendientesVisibles,
    clearSelection,
    autorizarBatch,
    autorizando,
    desautorizarVale,
    desautorizando,
  };
};
