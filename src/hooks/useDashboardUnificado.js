/**
 * src/hooks/useDashboardUnificado.js
 *
 * Hook de datos para el Dashboard Unificado de vales.
 * Fetch server-side por rango de fechas (hasta 5000 filas).
 * KPIs derivados de los datos cargados — sin vistas materializadas.
 * Filtros client-side: tipo, CC (multi), sindicato (multi), búsqueda.
 *
 * Dependencias: supabase, dateUtils
 * Usado en: pages/DashboardUnificado.jsx
 */

// 1. React
import { useState, useEffect, useMemo, useCallback } from "react";

// 2. Config
import { supabase } from "../config/supabase";

// 3. Utils
import { calcularSemanaISO } from "../utils/dateUtils";

const POR_PAGINA = 25;

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getHoy = () => formatDate(new Date());

const getTipoVale = (vale) => {
  if (vale.tipo_vale === "renta") return "renta";
  const idTipo =
    vale.vale_material_detalles?.[0]?.material?.tipo_de_material
      ?.id_tipo_de_material;
  if (idTipo === 2) return "asfaltico";
  if (idTipo === 3) return "corte";
  return "petreos";
};

const getCantidadVale = (vale) => {
  if (vale.tipo_vale === "renta") {
    const d = vale.vale_renta_detalle?.[0];
    if (!d) return null;
    // Muestra días si el flag está activo O si total_dias > 0 (cubre medio día con flag incorrecto)
    if (d.es_renta_por_dia || Number(d.total_dias) > 0) {
      return { valor: d.total_dias, unidad: "días" };
    }
    return { valor: d.total_horas, unidad: "hrs" };
  }
  const m3 = vale.vale_material_detalles?.reduce(
    (sum, det) => sum + (det.volumen_real_m3 || 0),
    0,
  );
  return { valor: m3, unidad: "m³" };
};

const getMaterialVale = (vale) => {
  if (vale.tipo_vale === "renta") {
    return vale.vale_renta_detalle?.[0]?.material?.material ?? "—";
  }
  return vale.vale_material_detalles?.[0]?.material?.material ?? "—";
};

const calcularKpisDeVales = (lista) => {
  let totalRenta = 0, totalM3 = 0, totalViajes = 0, importeTotal = 0;
  let totalHoras = 0, totalDias = 0, pendientes = 0;
  const m3PorMaterial = {};

  for (const vale of lista) {
    if (vale._tipo === "renta") {
      totalRenta++;
      const d = vale.vale_renta_detalle?.[0];
      if (d) {
        totalHoras   += Number(d.total_horas || 0);
        totalDias    += Number(d.total_dias  || 0);
        importeTotal += Number(d.costo_total || 0);
      }
    } else {
      for (const det of vale.vale_material_detalles ?? []) {
        const vol     = Number(det.volumen_real_m3 || 0);
        totalM3      += vol;
        importeTotal += Number(det.costo_total || 0);
        totalViajes  += det.vale_material_viajes?.length ?? 0;
        const nombre = det.material?.material ?? "Sin material";
        m3PorMaterial[nombre] = (m3PorMaterial[nombre] || 0) + vol;
      }
    }
    if (vale.estado === "emitido") pendientes++;
  }

  const partes = [];
  if (totalDias  > 0) partes.push(`${totalDias}d`);
  if (totalHoras > 0) partes.push(`${Number(totalHoras).toFixed(1)}h`);

  const m3PorMaterialOrdenado = Object.entries(m3PorMaterial)
    .map(([material, m3]) => ({ material, m3 }))
    .sort((a, b) => b.m3 - a.m3);

  return {
    totalVales:  lista.length,
    totalRenta,
    totalM3,
    m3PorMaterial: m3PorMaterialOrdenado,
    totalViajes,
    importeTotal,
    tiempoRenta: partes.length > 0 ? partes.join(" · ") : "—",
    pendientes,
  };
};

export const useDashboardUnificado = () => {
  const hoy = getHoy();

  const [todosLosVales, setTodosLosVales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMasDatos, setHasMasDatos] = useState(false);

  // Filtros server-side (rango de fechas)
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [periodoActivo, setPeriodoActivo] = useState("hoy");
  const [mostrarCancelados, setMostrarCancelados] = useState(false);

  // Filtros client-side
  const [tipoActivo, setTipoActivo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [filtroCCs, setFiltroCCs] = useState([]);
  const [filtroSindicatos, setFiltroSindicatos] = useState([]);
  const [filtroEstados, setFiltroEstados] = useState([]);
  const [filtroMateriales, setFiltroMateriales] = useState([]);

  const [usarKpisLocales, setUsarKpisLocales] = useState(false);

  const [pagina, setPagina] = useState(1);

  const fetchVales = useCallback(async (inicio, fin, cancelados = false) => {
    try {
      setLoading(true);
      setError(null);

      // .range(0, 4999) rompe el límite default de 1000 filas de PostgREST.
      // Si el proyecto Supabase tiene max_rows < 5000 aumentarlo en
      // Settings → API → Max rows.
      const { data, count, error: err } = await supabase
        .from("vales")
        .select(
          `
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
          tickets_material (id_ticket, numero_ticket, folio_ticket, fecha_impresion),
          vale_material_detalles (
            id_detalle_material, capacidad_m3, distancia_km, cantidad_pedida_m3,
            peso_ton, volumen_real_m3, precio_m3, costo_total,
            folio_banco, requisicion, notas_adicionales,
            material:id_material (
              id_material, material,
              tipo_de_material:id_tipo_de_material (id_tipo_de_material, tipo_de_material)
            ),
            bancos:id_banco (id_banco, banco),
            vale_material_viajes (id_viaje, folio_vale_fisico)
          ),
          vale_renta_detalle (
            id_vale_renta_detalle, capacidad_m3, hora_inicio, hora_fin,
            total_horas, total_dias, costo_total, numero_viajes,
            notas_adicionales, es_renta_por_dia,
            material:id_material (id_material, material),
            precios_renta:id_precios_renta (costo_hr, costo_dia)
          ),
          solicitudes_desverificacion (
            id_solicitud, estado, motivo_solicitud, motivo_respuesta,
            fecha_solicitud, fecha_respuesta, id_sindicato_requerido,
            sindicatos:id_sindicato_requerido (sindicato),
            persona_solicitante:id_persona_solicitante (nombre, primer_apellido)
          )
        `,
          { count: "exact" },
        )
        .gte("fecha_creacion", inicio + "T00:00:00")
        .lte("fecha_creacion", fin + "T23:59:59")
        [cancelados ? "eq" : "neq"]("estado", "cancelado")
        .order("fecha_creacion", { ascending: false })
        .range(0, 4999);

      if (err) throw err;
      const payload = data ?? [];
      setHasMasDatos((count ?? 0) > payload.length);
      setTodosLosVales(payload);
    } catch (err) {
      console.error("Error en useDashboardUnificado:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVales(fechaInicio, fechaFin, mostrarCancelados);
  }, [fechaInicio, fechaFin, mostrarCancelados, fetchVales]);

  const valesEnriquecidos = useMemo(
    () =>
      todosLosVales.map((v) => ({
        ...v,
        _tipo: getTipoVale(v),
        _cantidad: getCantidadVale(v),
        _material: getMaterialVale(v),
      })),
    [todosLosVales],
  );

  const valesFiltrados = useMemo(() => {
    let lista = valesEnriquecidos;

    if (tipoActivo !== "todos") {
      lista = lista.filter((v) => v._tipo === tipoActivo);
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
    if (filtroEstados.length > 0) {
      lista = lista.filter((v) => filtroEstados.includes(v.estado));
    }
    if (filtroMateriales.length > 0) {
      lista = lista.filter((v) => filtroMateriales.includes(v._material));
    }
    if (busqueda.trim()) {
      const term = busqueda.toLowerCase();
      lista = lista.filter(
        (v) =>
          v.folio?.toLowerCase().includes(term) ||
          v.obras?.obra?.toLowerCase().includes(term) ||
          v.operadores?.nombre_completo?.toLowerCase().includes(term) ||
          v._material?.toLowerCase().includes(term) ||
          v.vehiculos?.placas?.toLowerCase().includes(term),
      );
    }

    return lista;
  }, [valesEnriquecidos, tipoActivo, filtroCCs, filtroSindicatos, filtroEstados, filtroMateriales, busqueda]);

  const kpisGlobales = useMemo(
    () => calcularKpisDeVales(valesEnriquecidos),
    [valesEnriquecidos],
  );

  const kpisLocales = useMemo(
    () => calcularKpisDeVales(valesFiltrados),
    [valesFiltrados],
  );

  const totalPaginas = Math.max(1, Math.ceil(valesFiltrados.length / POR_PAGINA));
  const valesPagina = valesFiltrados.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA,
  );

  // Opciones únicas para los dropdowns, derivadas de todos los vales cargados
  const opciones = useMemo(() => {
    const ccs = [
      ...new Set(
        valesEnriquecidos
          .map((v) => v.obras ? `${v.obras.cc} · ${v.obras.obra}` : null)
          .filter(Boolean),
      ),
    ].sort();
    const sindicatos = [
      ...new Set(
        valesEnriquecidos
          .map((v) => v.operadores?.sindicatos?.sindicato)
          .filter(Boolean),
      ),
    ].sort();
    const materiales = [
      ...new Set(
        valesEnriquecidos
          .map((v) => v._material)
          .filter((m) => m && m !== "—"),
      ),
    ].sort();
    return { ccs, sindicatos, materiales };
  }, [valesEnriquecidos]);


  // ── Handlers ─────────────────────────────────────────────────────────────

  const cambiarPeriodo = useCallback((periodo) => {
    setPeriodoActivo(periodo);
    setPagina(1);
    setUsarKpisLocales(false);
    const ahora = new Date();

    if (periodo === "hoy") {
      const f = formatDate(ahora);
      setFechaInicio(f);
      setFechaFin(f);
    } else if (periodo === "ayer") {
      const ayer = new Date(ahora);
      ayer.setDate(ahora.getDate() - 1);
      const f = formatDate(ayer);
      setFechaInicio(f);
      setFechaFin(f);
    } else if (periodo === "semana") {
      const semana = calcularSemanaISO(ahora);
      setFechaInicio(semana.fechaInicio);
      setFechaFin(semana.fechaFin);
    } else if (periodo === "mes") {
      const y = ahora.getFullYear();
      const mo = ahora.getMonth();
      const inicio = `${y}-${String(mo + 1).padStart(2, "0")}-01`;
      const fin = formatDate(new Date(y, mo + 1, 0));
      setFechaInicio(inicio);
      setFechaFin(fin);
    }
  }, []);

  // weekStr = "2026-W25"
  const cambiarSemana = useCallback((weekStr) => {
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
    setPeriodoActivo("semana-custom");
    setPagina(1);
    setUsarKpisLocales(false);
  }, []);

  // monthStr = "2026-06"
  const cambiarMes = useCallback((monthStr) => {
    if (!monthStr) return;
    const [yearStr, mStr] = monthStr.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(mStr);
    const inicio = `${yearStr}-${String(month).padStart(2, "0")}-01`;
    const fin = formatDate(new Date(year, month, 0));
    setFechaInicio(inicio);
    setFechaFin(fin);
    setPeriodoActivo("mes-custom");
    setPagina(1);
    setUsarKpisLocales(false);
  }, []);

  const cambiarTipo = useCallback((tipo) => {
    setTipoActivo(tipo);
    setPagina(1);
  }, []);

  const cambiarBusqueda = useCallback((texto) => {
    setBusqueda(texto);
    setPagina(1);
  }, []);

  const cambiarRango = useCallback((inicio, fin) => {
    setFechaInicio(inicio);
    setFechaFin(fin);
    setPeriodoActivo("rango");
    setPagina(1);
    setUsarKpisLocales(false);
  }, []);

  const cambiarCCs = useCallback((arr) => {
    setFiltroCCs(arr);
    setPagina(1);
  }, []);

  const cambiarSindicatos = useCallback((arr) => {
    setFiltroSindicatos(arr);
    setPagina(1);
  }, []);

  const toggleCancelados = useCallback(() => {
    setMostrarCancelados((prev) => !prev);
    setPagina(1);
    setUsarKpisLocales(false);
  }, []);

  const cambiarEstados = useCallback((arr) => {
    setFiltroEstados(arr);
    setPagina(1);
  }, []);

  const cambiarMateriales = useCallback((arr) => {
    setFiltroMateriales(arr);
    setPagina(1);
  }, []);

  const aplicarKpis = useCallback(() => {
    setUsarKpisLocales(true);
  }, []);

  const resetearKpis = useCallback(() => {
    setUsarKpisLocales(false);
  }, []);

  return {
    valesPagina,
    valesFiltrados,
    loading,
    error,
    hasMasDatos,
    totalCargados: todosLosVales.length,
    filtros: {
      fechaInicio,
      fechaFin,
      periodoActivo,
      tipoActivo,
      busqueda,
      filtroCCs,
      filtroSindicatos,
      filtroEstados,
      filtroMateriales,
    },
    opciones,
    pagina,
    totalPaginas,
    totalFiltrados: valesFiltrados.length,
    setPagina,
    cambiarPeriodo,
    cambiarTipo,
    cambiarBusqueda,
    cambiarRango,
    cambiarCCs,
    cambiarSindicatos,
    cambiarEstados,
    cambiarMateriales,
    cambiarSemana,
    cambiarMes,
    refetch: () => {
      fetchVales(fechaInicio, fechaFin, mostrarCancelados);
      setUsarKpisLocales(false);
    },
    mostrarCancelados,
    toggleCancelados,
    kpis: usarKpisLocales ? kpisLocales : kpisGlobales,
    kpisDesdeLocales: usarKpisLocales,
    aplicarKpis,
    resetearKpis,
  };
};
