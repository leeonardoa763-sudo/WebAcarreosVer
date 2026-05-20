/**
 * src/hooks/useDashboardAnalytics.js
 *
 * Hook para obtener métricas y analytics del dashboard con filtros completos
 *
 * Funcionalidades:
 * - Filtros: período (hoy/ayer/semana/mes/año), empresa, sindicato, banco, obra, tipo_vale
 * - Métricas generales con comparativa vs período anterior (% cambio)
 * - Distribución por estado, tipo, empresa, sindicato
 * - Top obras, materiales, bancos
 * - Eficiencia de viajes por hora del día
 * - Tendencia temporal según el período
 *
 * Arquitectura de filtros:
 * - período / año / trimestre → re-query a Supabase (cambia el rango de fechas)
 * - empresa / sindicato / banco / obra / material / tipoVale → filtrado client-side instantáneo
 *
 * Dependencias: supabase, useAuth
 * Usado en: Dashboard.jsx
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "./useAuth";

export const useDashboardAnalytics = () => {
  const { userProfile } = useAuth();

  // ─── Filter state ───────────────────────────────────────────────────────────
  const [periodo, setPeriodo] = useState("semana");
  const [año, setAño] = useState(new Date().getFullYear());
  const [trimestre, setTrimestre] = useState(null);
  // Client-side filters (no Supabase re-query)
  const [idEmpresa, setIdEmpresa] = useState(null);
  const [idSindicato, setIdSindicato] = useState(null);
  const [idBanco, setIdBanco] = useState(null);
  const [idObra, setIdObra] = useState(null);
  const [idMaterial, setIdMaterial] = useState(null);
  const [tipoVale, setTipoVale] = useState(null);

  // ─── Raw data from Supabase (source of truth) ──────────────────────────────
  const [rawVales, setRawVales] = useState([]);
  const [rawValesPrev, setRawValesPrev] = useState([]);

  // ─── Computed analytics data ────────────────────────────────────────────────
  const [metricas, setMetricas] = useState({
    totalVales: 0,
    totalM3: 0,
    totalHoras: 0,
    valorTotal: 0,
    valorConIVA: 0,
  });
  const [comparativa, setComparativa] = useState(null);
  const [distribucionEstados, setDistribucionEstados] = useState([]);
  const [distribucionTipo, setDistribucionTipo] = useState([]);
  const [distribucionEmpresas, setDistribucionEmpresas] = useState([]);
  const [topObras, setTopObras] = useState([]);
  const [topMateriales, setTopMateriales] = useState([]);
  const [topBancos, setTopBancos] = useState([]);
  const [eficienciaViajes, setEficienciaViajes] = useState([]);
  const [tendencia, setTendencia] = useState([]);

  // ─── Catalog data for filter dropdowns ─────────────────────────────────────
  const [catalogos, setCatalogos] = useState({
    obras: [],
    empresas: [],
    sindicatos: [],
    bancos: [],
    materiales: [],
  });
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  // ─── Request states ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ─── Helper: Calculate date ranges ─────────────────────────────────────────
  const calcularRangos = useCallback((periodoVal, añoVal, trimestreVal) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (trimestreVal && añoVal) {
      const mesInicio = (trimestreVal - 1) * 3;
      const mesFin = mesInicio + 2;
      const inicio = new Date(añoVal, mesInicio, 1);
      const fin = new Date(añoVal, mesFin + 1, 0, 23, 59, 59);
      const prevInicio = new Date(añoVal - 1, mesInicio, 1);
      const prevFin = new Date(añoVal - 1, mesFin + 1, 0, 23, 59, 59);
      return { inicio, fin, prevInicio, prevFin };
    }

    switch (periodoVal) {
      case "hoy": {
        const inicio = new Date(today);
        const fin = new Date(today.getTime() + 86400000);
        const prevInicio = new Date(today.getTime() - 86400000);
        const prevFin = new Date(today);
        return { inicio, fin, prevInicio, prevFin };
      }
      case "ayer": {
        const ayer = new Date(today.getTime() - 86400000);
        const inicio = new Date(ayer);
        const fin = new Date(today);
        const prevInicio = new Date(ayer.getTime() - 86400000);
        const prevFin = new Date(ayer);
        return { inicio, fin, prevInicio, prevFin };
      }
      case "semana": {
        const semanaInicio = new Date(today.getTime() - 7 * 86400000);
        const inicio = new Date(semanaInicio);
        const fin = new Date(today.getTime() + 86400000);
        const prevInicio = new Date(semanaInicio.getTime() - 7 * 86400000);
        const prevFin = new Date(semanaInicio);
        return { inicio, fin, prevInicio, prevFin };
      }
      case "mes": {
        const mesInicio = new Date(today.getTime() - 30 * 86400000);
        const inicio = new Date(mesInicio);
        const fin = new Date(today.getTime() + 86400000);
        const prevInicio = new Date(mesInicio.getTime() - 30 * 86400000);
        const prevFin = new Date(mesInicio);
        return { inicio, fin, prevInicio, prevFin };
      }
      case "año": {
        const inicio = new Date(Date.UTC(añoVal, 0, 1, 0, 0, 0));
        const fin = new Date(Date.UTC(añoVal, 11, 31, 23, 59, 59));
        const prevInicio = new Date(Date.UTC(añoVal - 1, 0, 1, 0, 0, 0));
        const prevFin = new Date(Date.UTC(añoVal - 1, 11, 31, 23, 59, 59));
        return { inicio, fin, prevInicio, prevFin };
      }
      default:
        return null;
    }
  }, []);

  // ─── Apply client-side filters ───────────────────────────────────────────────
  const applyClientFilters = useCallback((data, filtros) => {
    let filtered = [...data];

    // Excluir obra de prueba (ID 14) y empresa de prueba (ID 4)
    filtered = filtered.filter(
      (v) => Number(v.id_obra) !== 14 && Number(v.id_empresa) !== 4
    );

    if (filtros.idEmpresa) {
      filtered = filtered.filter((v) => Number(v.id_empresa) === Number(filtros.idEmpresa));
    }
    if (filtros.idSindicato) {
      filtered = filtered.filter(
        (v) => Number(v.operadores?.id_sindicato) === Number(filtros.idSindicato)
      );
    }
    if (filtros.idObra) {
      filtered = filtered.filter((v) => Number(v.id_obra) === Number(filtros.idObra));
    }
    if (filtros.tipoVale) {
      filtered = filtered.filter((v) => v.tipo_vale === filtros.tipoVale);
    }
    if (filtros.idBanco) {
      filtered = filtered.filter((v) =>
        v.vale_material_detalles?.some((d) => Number(d.id_banco) === Number(filtros.idBanco))
      );
    }
    if (filtros.idMaterial) {
      filtered = filtered.filter((v) =>
        v.vale_material_detalles?.some(
          (d) => Number(d.material?.id_material) === Number(filtros.idMaterial)
        )
      );
    }

    return filtered;
  }, []);

  // ─── Aggregation functions ───────────────────────────────────────────────────
  const calcularMetricas = useCallback((vales) => {
    const totalVales = vales.length;
    let totalM3 = 0;
    let totalHoras = 0;
    let valorTotal = 0;

    vales.forEach((vale) => {
      vale.vale_material_detalles?.forEach((detalle) => {
        const volumen = parseFloat(detalle.volumen_real_m3 || detalle.cantidad_pedida_m3) || 0;
        totalM3 += volumen;
        const costo = parseFloat(detalle.costo_total || 0);
        if (!isNaN(costo)) valorTotal += costo;
      });

      vale.vale_renta_detalle?.forEach((renta) => {
        const dias = parseFloat(renta.total_dias) || 0;
        const horas = parseFloat(renta.total_horas) || 0;
        totalHoras += dias > 0 ? dias * 8 : horas;
        const costo = parseFloat(renta.costo_total || 0);
        if (!isNaN(costo)) valorTotal += costo;
      });
    });

    const subtotal = Math.round(valorTotal * 100) / 100;
    return {
      totalVales,
      totalM3: Math.round(totalM3 * 100) / 100,
      totalHoras: Math.round(totalHoras * 100) / 100,
      valorTotal: subtotal,
      valorConIVA: Math.round(subtotal * 1.16 * 100) / 100,
    };
  }, []);

  const calcularComparativa = useCallback((actual, anterior) => {
    if (!anterior || Object.keys(anterior).length === 0) return null;
    const calcPct = (a, b) => {
      if (b === 0 || b === null) return a === 0 ? 0 : 100;
      return Math.round(((a - b) / b) * 100);
    };
    return {
      totalVales: { valor: actual.totalVales - anterior.totalVales, pct: calcPct(actual.totalVales, anterior.totalVales), sube: actual.totalVales >= anterior.totalVales },
      totalM3: { valor: Math.round((actual.totalM3 - anterior.totalM3) * 100) / 100, pct: calcPct(actual.totalM3, anterior.totalM3), sube: actual.totalM3 >= anterior.totalM3 },
      totalHoras: { valor: Math.round((actual.totalHoras - anterior.totalHoras) * 100) / 100, pct: calcPct(actual.totalHoras, anterior.totalHoras), sube: actual.totalHoras >= anterior.totalHoras },
      valorTotal: { valor: Math.round((actual.valorTotal - anterior.valorTotal) * 100) / 100, pct: calcPct(actual.valorTotal, anterior.valorTotal), sube: actual.valorTotal >= anterior.valorTotal },
      valorConIVA: { valor: Math.round((actual.valorConIVA - anterior.valorConIVA) * 100) / 100, pct: calcPct(actual.valorConIVA, anterior.valorConIVA), sube: actual.valorConIVA >= anterior.valorConIVA },
    };
  }, []);

  const calcularDistribucionEstados = useCallback((vales) => {
    const estados = {};
    vales.forEach((v) => {
      const estado = v.estado || "sin_estado";
      if (!estados[estado]) estados[estado] = { cantidad: 0, m3Total: 0 };
      estados[estado].cantidad++;
      v.vale_material_detalles?.forEach((d) => {
        estados[estado].m3Total += parseFloat(d.volumen_real_m3 || d.cantidad_pedida_m3) || 0;
      });
    });
    const colorMap = {
      emitido: "rgba(59, 130, 246, 0.8)",
      verificado: "rgba(26, 147, 111, 0.8)",
      conciliado: "rgba(34, 197, 94, 0.8)",
      pagado: "rgba(34, 197, 94, 0.8)",
      en_proceso: "rgba(245, 158, 11, 0.8)",
      cancelado: "rgba(239, 68, 68, 0.8)",
      borrador: "rgba(107, 114, 128, 0.8)",
    };
    return Object.entries(estados)
      .map(([estado, data]) => ({
        estado,
        label: estado.charAt(0).toUpperCase() + estado.slice(1),
        cantidad: data.cantidad,
        m3Total: Math.round(data.m3Total * 100) / 100,
        color: colorMap[estado] || "rgba(156, 163, 175, 0.8)",
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, []);

  const calcularDistribucionTipo = useCallback((vales) => {
    const tipos = { material: 0, renta: 0 };
    vales.forEach((v) => {
      if (v.tipo_vale === "material") tipos.material++;
      else if (v.tipo_vale === "renta") tipos.renta++;
    });
    const total = tipos.material + tipos.renta || 1;
    return [
      { tipo: "Material", cantidad: tipos.material, porcentaje: Math.round((tipos.material / total) * 100) },
      { tipo: "Renta", cantidad: tipos.renta, porcentaje: Math.round((tipos.renta / total) * 100) },
    ];
  }, []);

  const calcularDistribucionEmpresas = useCallback((vales) => {
    const empresas = {};
    vales.forEach((v) => {
      const nombre = v.empresas?.empresa || "Sin empresa";
      if (!empresas[nombre]) empresas[nombre] = { cantidad: 0, m3Total: 0 };
      empresas[nombre].cantidad++;
      v.vale_material_detalles?.forEach((d) => {
        empresas[nombre].m3Total += parseFloat(d.volumen_real_m3 || d.cantidad_pedida_m3) || 0;
      });
    });
    return Object.entries(empresas)
      .map(([empresa, data]) => ({ empresa, cantidad: data.cantidad, m3Total: Math.round(data.m3Total * 100) / 100 }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6);
  }, []);

  const calcularTopObras = useCallback((vales) => {
    const obras = {};
    vales.forEach((v) => {
      const nombre = v.obras?.obra || "Sin obra";
      obras[nombre] = (obras[nombre] || 0) + 1;
    });
    return Object.entries(obras)
      .map(([obra, cantidad]) => ({ obra, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, []);

  const calcularTopMateriales = useCallback((vales) => {
    const materiales = {};
    vales.forEach((v) => {
      v.vale_material_detalles?.forEach((d) => {
        const nombre = d.material?.material || "Sin material";
        materiales[nombre] = (materiales[nombre] || 0) + (parseFloat(d.volumen_real_m3 || d.cantidad_pedida_m3) || 0);
      });
    });
    return Object.entries(materiales)
      .map(([material, m3Total]) => ({ material, m3Total: Math.round(m3Total * 100) / 100 }))
      .sort((a, b) => b.m3Total - a.m3Total)
      .slice(0, 5);
  }, []);

  const calcularTopBancos = useCallback((vales) => {
    const bancos = {};
    vales.forEach((v) => {
      v.vale_material_detalles?.forEach((d) => {
        const nombre = d.bancos?.banco || "Sin banco";
        bancos[nombre] = (bancos[nombre] || 0) + (parseFloat(d.volumen_real_m3 || d.cantidad_pedida_m3) || 0);
      });
    });
    return Object.entries(bancos)
      .map(([banco, m3Total]) => ({ banco, m3Total: Math.round(m3Total * 100) / 100 }))
      .sort((a, b) => b.m3Total - a.m3Total)
      .slice(0, 5);
  }, []);

  const calcularEficienciaViajes = useCallback((vales) => {
    const horas = {};
    for (let h = 0; h < 24; h++) horas[h] = { viajes: 0, m3Total: 0 };
    vales.forEach((v) => {
      v.vale_material_detalles?.forEach((d) => {
        d.vale_material_viajes?.forEach((viaje) => {
          if (viaje.hora_registro) {
            const hora = new Date(viaje.hora_registro).getUTCHours();
            horas[hora].viajes++;
            horas[hora].m3Total += parseFloat(viaje.volumen_m3 || 0);
          }
        });
      });
    });
    return Object.entries(horas).map(([h, data]) => ({
      hora: parseInt(h),
      label: `${String(h).padStart(2, "0")}:00`,
      viajes: data.viajes,
      m3Total: Math.round(data.m3Total * 100) / 100,
      eficiencia: data.viajes > 0 ? Math.round((data.m3Total / data.viajes) * 100) / 100 : 0,
    }));
  }, []);

  const calcularTendencia = useCallback((vales, periodoVal) => {
    const grupos = {};
    vales.forEach((v) => {
      const fecha = new Date(v.fecha_creacion);
      let label;
      if (periodoVal === "hoy" || periodoVal === "ayer") {
        const h = fecha.getUTCHours();
        label = ["00-05", "06-11", "12-17", "18-23"][Math.floor(h / 6)];
      } else if (periodoVal === "semana") {
        label = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][fecha.getUTCDay()];
      } else {
        label = `S${Math.ceil(fecha.getUTCDate() / 7)}`;
      }
      if (!grupos[label]) grupos[label] = { cantidad: 0, m3Total: 0 };
      grupos[label].cantidad++;
      v.vale_material_detalles?.forEach((d) => {
        grupos[label].m3Total += parseFloat(d.volumen_real_m3 || d.cantidad_pedida_m3) || 0;
      });
    });
    const orden = periodoVal === "semana" ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] : null;
    let resultado = Object.entries(grupos).map(([label, data]) => ({
      label,
      cantidad: data.cantidad,
      m3Total: Math.round(data.m3Total * 100) / 100,
    }));
    if (orden) resultado = resultado.sort((a, b) => orden.indexOf(a.label) - orden.indexOf(b.label));
    return resultado;
  }, []);

  // ─── Fetch catalogs (once on mount) ─────────────────────────────────────────
  const fetchCatalogos = useCallback(async () => {
    try {
      setLoadingCatalogos(true);
      const [obraRes, empresaRes, sindicatoRes, bancoRes, materialRes] = await Promise.all([
        supabase.from("obras").select("id_obra, obra").order("obra"),
        supabase.from("empresas").select("id_empresa, empresa").order("empresa"),
        supabase.from("sindicatos").select("id_sindicato, sindicato").order("sindicato"),
        supabase.from("bancos").select("id_banco, banco").order("banco"),
        supabase.from("material").select("id_material, material").order("material"),
      ]);
      setCatalogos({
        obras: obraRes.data || [],
        empresas: empresaRes.data || [],
        sindicatos: sindicatoRes.data || [],
        bancos: bancoRes.data || [],
        materiales: materialRes.data || [],
      });
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
    } finally {
      setLoadingCatalogos(false);
    }
  }, []);

  // ─── Fetch raw data from Supabase (only when date range changes) ─────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const rangos = calcularRangos(periodo, año, trimestre);
      if (!rangos) throw new Error("Período inválido");

      const baseSelect = `
        id_vale, folio, tipo_vale, estado, fecha_creacion,
        id_obra, id_empresa,
        obras:id_obra (id_obra, obra),
        empresas:id_empresa (id_empresa, empresa),
        operadores:id_operador (id_operador, id_sindicato,
          sindicatos:id_sindicato (id_sindicato, sindicato)),
        vale_material_detalles (
          id_detalle_material, volumen_real_m3, cantidad_pedida_m3, costo_total, id_banco,
          bancos:id_banco (id_banco, banco),
          material:id_material (id_material, material),
          vale_material_viajes (id_viaje, hora_registro, volumen_m3)
        ),
        vale_renta_detalle (total_horas, total_dias, costo_total)
      `;

      const [resCurrent, resPrev] = await Promise.all([
        supabase.from("vales").select(baseSelect)
          .gte("fecha_creacion", rangos.inicio.toISOString())
          .lte("fecha_creacion", rangos.fin.toISOString())
          .limit(10000),
        supabase.from("vales").select(baseSelect)
          .gte("fecha_creacion", rangos.prevInicio.toISOString())
          .lte("fecha_creacion", rangos.prevFin.toISOString())
          .limit(10000),
      ]);

      if (resCurrent.error) throw resCurrent.error;
      if (resPrev.error) throw resPrev.error;

      setRawVales(resCurrent.data || []);
      setRawValesPrev(resPrev.data || []);
      setLastUpdated(new Date());
      setHasLoaded(true);
    } catch (err) {
      console.error("Error en fetchData:", err);
      setError(err.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [periodo, año, trimestre, calcularRangos]);

  // ─── Compute analytics (client-side, instant) ───────────────────────────────
  // Runs whenever raw data OR client-side filters change
  useEffect(() => {
    const filtros = { idEmpresa, idSindicato, idBanco, idObra, idMaterial, tipoVale };
    const valesFiltered = applyClientFilters(rawVales, filtros);
    const valesFilteredPrev = applyClientFilters(rawValesPrev, filtros);

    const metricasActual = calcularMetricas(valesFiltered);
    const metricasAnterior = calcularMetricas(valesFilteredPrev);

    setMetricas(metricasActual);
    setComparativa(calcularComparativa(metricasActual, metricasAnterior));
    setDistribucionEstados(calcularDistribucionEstados(valesFiltered));
    setDistribucionTipo(calcularDistribucionTipo(valesFiltered));
    setDistribucionEmpresas(calcularDistribucionEmpresas(valesFiltered));
    setTopObras(calcularTopObras(valesFiltered));
    setTopMateriales(calcularTopMateriales(valesFiltered));
    setTopBancos(calcularTopBancos(valesFiltered));
    setEficienciaViajes(calcularEficienciaViajes(valesFiltered));
    setTendencia(calcularTendencia(valesFiltered, periodo));
  }, [
    rawVales, rawValesPrev,
    idEmpresa, idSindicato, idBanco, idObra, idMaterial, tipoVale,
    periodo,
    applyClientFilters, calcularMetricas, calcularComparativa,
    calcularDistribucionEstados, calcularDistribucionTipo, calcularDistribucionEmpresas,
    calcularTopObras, calcularTopMateriales, calcularTopBancos,
    calcularEficienciaViajes, calcularTendencia,
  ]);

  // ─── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCatalogos();
  }, [fetchCatalogos]);

  useEffect(() => {
    if (userProfile) fetchData();
  }, [userProfile?.id_persona, fetchData]);

  // ─── Reset ────────────────────────────────────────────────────────────────────
  const resetFiltros = useCallback(() => {
    setPeriodo("semana");
    setAño(new Date().getFullYear());
    setTrimestre(null);
    setIdEmpresa(null);
    setIdSindicato(null);
    setIdBanco(null);
    setIdObra(null);
    setIdMaterial(null);
    setTipoVale(null);
  }, []);

  return {
    filtros: { periodo, año, trimestre, idEmpresa, idSindicato, idBanco, idObra, idMaterial, tipoVale },
    setPeriodo,
    setAño,
    setTrimestre,
    setIdEmpresa,
    setIdSindicato,
    setIdBanco,
    setIdObra,
    setIdMaterial,
    setTipoVale,
    resetFiltros,

    catalogos,
    loadingCatalogos,

    metricas,
    comparativa,
    distribucionEstados,
    distribucionTipo,
    distribucionEmpresas,
    topObras,
    topMateriales,
    topBancos,
    eficienciaViajes,
    tendencia,

    loading,
    hasLoaded,
    error,
    lastUpdated,
    refresh: fetchData,
  };
};
