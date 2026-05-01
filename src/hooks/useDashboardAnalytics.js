/**
 * src/hooks/useDashboardAnalytics.js
 *
 * Hook para obtener métricas y analytics del dashboard con filtros completos
 *
 * Funcionalidades:
 * - Filtros: período (hoy/ayer/semana/mes), empresa, sindicato, banco, obra, tipo_vale
 * - Métricas generales con comparativa vs período anterior (% cambio)
 * - Distribución por estado, tipo, empresa, sindicato
 * - Top obras, materiales, bancos
 * - Eficiencia de viajes por hora del día
 * - Tendencia temporal según el período
 *
 * Dependencias: supabase, useAuth
 * Usado en: Dashboard.jsx
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "./useAuth";

export const useDashboardAnalytics = () => {
  const { userProfile, canViewAllVales } = useAuth();

  // Filter state
  const [periodo, setPeriodo] = useState("semana");
  const [año, setAño] = useState(new Date().getFullYear());
  const [trimestre, setTrimestre] = useState(null);
  const [idEmpresa, setIdEmpresa] = useState(null);
  const [idSindicato, setIdSindicato] = useState(null);
  const [idBanco, setIdBanco] = useState(null);
  const [idObra, setIdObra] = useState(null);
  const [tipoVale, setTipoVale] = useState(null);

  // Raw data (memoized source of truth)
  const rawValesRef = useRef([]);
  const rawValesPrevRef = useRef([]);

  // Computed analytics data
  const [metricas, setMetricas] = useState({
    totalVales: 0,
    totalM3: 0,
    totalHoras: 0,
    valorTotal: 0,
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

  // Catalog data for filter dropdowns
  const [catalogos, setCatalogos] = useState({
    obras: [],
    empresas: [],
    sindicatos: [],
    bancos: [],
  });
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  // Request states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Helper: Calculate date ranges
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
        const inicio = new Date(añoVal, 0, 1);
        const fin = new Date(añoVal, 11, 31, 23, 59, 59);
        const prevInicio = new Date(añoVal - 1, 0, 1);
        const prevFin = new Date(añoVal - 1, 11, 31, 23, 59, 59);
        return { inicio, fin, prevInicio, prevFin };
      }
      default:
        return null;
    }
  }, []);

  // Apply client-side filters
  const applyClientFilters = useCallback(
    (data, filtros) => {
      let filtered = [...data];

      // Excluir automáticamente obra de prueba (ID 14) y empresa de prueba (ID 4)
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

      return filtered;
    },
    []
  );

  // Calculate metrics from vales
  const calcularMetricas = useCallback((vales) => {
    const totalVales = vales.length;
    let totalM3 = 0;
    let totalHoras = 0;
    let valorTotal = 0;

    vales.forEach((vale) => {
      // Material
      vale.vale_material_detalles?.forEach((detalle) => {
        const volumen = detalle.volumen_real_m3 || detalle.cantidad_pedida_m3 || 0;
        totalM3 += parseFloat(volumen) || 0;
        valorTotal += parseFloat(detalle.costo_total) || 0;
      });

      // Renta
      vale.vale_renta_detalle?.forEach((renta) => {
        const dias = parseFloat(renta.total_dias) || 0;
        const horas = parseFloat(renta.total_horas) || 0;
        totalHoras += dias > 0 ? dias * 8 : horas;
        valorTotal += parseFloat(renta.costo_total) || 0;
      });
    });

    return {
      totalVales,
      totalM3: Math.round(totalM3 * 100) / 100,
      totalHoras: Math.round(totalHoras * 100) / 100,
      valorTotal: Math.round(valorTotal * 100) / 100,
    };
  }, []);

  // Calculate comparison
  const calcularComparativa = useCallback((actual, anterior) => {
    if (!anterior || Object.keys(anterior).length === 0) return null;

    const calcPct = (a, b) => {
      if (b === 0 || b === null) return a === 0 ? 0 : 100;
      const pct = ((a - b) / b) * 100;
      return Math.round(pct);
    };

    return {
      totalVales: {
        valor: actual.totalVales - anterior.totalVales,
        pct: calcPct(actual.totalVales, anterior.totalVales),
        sube: actual.totalVales >= anterior.totalVales,
      },
      totalM3: {
        valor: Math.round((actual.totalM3 - anterior.totalM3) * 100) / 100,
        pct: calcPct(actual.totalM3, anterior.totalM3),
        sube: actual.totalM3 >= anterior.totalM3,
      },
      totalHoras: {
        valor: Math.round((actual.totalHoras - anterior.totalHoras) * 100) / 100,
        pct: calcPct(actual.totalHoras, anterior.totalHoras),
        sube: actual.totalHoras >= anterior.totalHoras,
      },
      valorTotal: {
        valor: Math.round((actual.valorTotal - anterior.valorTotal) * 100) / 100,
        pct: calcPct(actual.valorTotal, anterior.valorTotal),
        sube: actual.valorTotal >= anterior.valorTotal,
      },
    };
  }, []);

  // Aggregations
  const calcularDistribucionEstados = useCallback((vales) => {
    const estados = {};
    vales.forEach((v) => {
      const estado = v.estado || "sin_estado";
      estados[estado] = (estados[estado] || 0) + 1;
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
      .map(([estado, cantidad]) => ({
        estado,
        label: estado.charAt(0).toUpperCase() + estado.slice(1),
        cantidad,
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
      if (!empresas[nombre]) {
        empresas[nombre] = { cantidad: 0, m3Total: 0 };
      }
      empresas[nombre].cantidad++;
      v.vale_material_detalles?.forEach((d) => {
        empresas[nombre].m3Total += parseFloat(d.volumen_real_m3 || d.cantidad_pedida_m3 || 0);
      });
    });

    return Object.entries(empresas)
      .map(([empresa, data]) => ({
        empresa,
        cantidad: data.cantidad,
        m3Total: Math.round(data.m3Total * 100) / 100,
      }))
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
        const vol = parseFloat(d.volumen_real_m3 || d.cantidad_pedida_m3 || 0);
        materiales[nombre] = (materiales[nombre] || 0) + vol;
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
        const vol = parseFloat(d.volumen_real_m3 || d.cantidad_pedida_m3 || 0);
        bancos[nombre] = (bancos[nombre] || 0) + vol;
      });
    });

    return Object.entries(bancos)
      .map(([banco, m3Total]) => ({ banco, m3Total: Math.round(m3Total * 100) / 100 }))
      .sort((a, b) => b.m3Total - a.m3Total)
      .slice(0, 5);
  }, []);

  const calcularEficienciaViajes = useCallback((vales) => {
    const horas = {};
    for (let h = 0; h < 24; h++) {
      horas[h] = { viajes: 0, m3Total: 0 };
    }

    vales.forEach((v) => {
      v.vale_material_detalles?.forEach((d) => {
        d.vale_material_viajes?.forEach((viaje) => {
          if (viaje.hora_registro) {
            const fecha = new Date(viaje.hora_registro);
            const hora = fecha.getUTCHours();
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
        const bloque = Math.floor(h / 6);
        const labels = ["00-05", "06-11", "12-17", "18-23"];
        label = labels[bloque];
      } else if (periodoVal === "semana") {
        const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        label = dias[fecha.getUTCDay()];
      } else {
        const semana = Math.ceil(fecha.getUTCDate() / 7);
        label = `S${semana}`;
      }

      if (!grupos[label]) {
        grupos[label] = { cantidad: 0, m3Total: 0 };
      }
      grupos[label].cantidad++;
      v.vale_material_detalles?.forEach((d) => {
        grupos[label].m3Total += parseFloat(d.volumen_real_m3 || d.cantidad_pedida_m3 || 0);
      });
    });

    const orden = periodoVal === "semana" ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] : null;
    let resultado = Object.entries(grupos).map(([label, data]) => ({
      label,
      cantidad: data.cantidad,
      m3Total: Math.round(data.m3Total * 100) / 100,
    }));

    if (orden) {
      resultado = resultado.sort((a, b) => orden.indexOf(a.label) - orden.indexOf(b.label));
    }

    return resultado;
  }, []);

  // Fetch catalogs (once on mount)
  const fetchCatalogos = useCallback(async () => {
    try {
      setLoadingCatalogos(true);
      const [obraRes, empresaRes, sindicatoRes, bancoRes] = await Promise.all([
        supabase.from("obras").select("id_obra, obra").order("obra"),
        supabase.from("empresas").select("id_empresa, empresa").order("empresa"),
        supabase.from("sindicatos").select("id_sindicato, sindicato").order("sindicato"),
        supabase.from("bancos").select("id_banco, banco").order("banco"),
      ]);

      setCatalogos({
        obras: obraRes.data || [],
        empresas: empresaRes.data || [],
        sindicatos: sindicatoRes.data || [],
        bancos: bancoRes.data || [],
      });
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
    } finally {
      setLoadingCatalogos(false);
    }
  }, []);

  // Main fetch for current + previous period
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const rangos = calcularRangos(periodo, año, trimestre);
      if (!rangos) throw new Error("Invalid period");

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

      // Fetch current period
      let queryCurrent = supabase.from("vales").select(baseSelect);
      if (!canViewAllVales() && userProfile?.id_current_obra) {
        queryCurrent = queryCurrent.eq("id_obra", userProfile.id_current_obra);
      }
      queryCurrent = queryCurrent
        .gte("fecha_creacion", rangos.inicio.toISOString())
        .lte("fecha_creacion", rangos.fin.toISOString());

      // Fetch previous period
      let queryPrev = supabase.from("vales").select(baseSelect);
      if (!canViewAllVales() && userProfile?.id_current_obra) {
        queryPrev = queryPrev.eq("id_obra", userProfile.id_current_obra);
      }
      queryPrev = queryPrev
        .gte("fecha_creacion", rangos.prevInicio.toISOString())
        .lte("fecha_creacion", rangos.prevFin.toISOString());

      const [resCurrent, resPrev] = await Promise.all([queryCurrent, queryPrev]);

      if (resCurrent.error) throw resCurrent.error;
      if (resPrev.error) throw resPrev.error;

      const valesCurrent = resCurrent.data || [];
      const valesPrev = resPrev.data || [];

      // Apply client filters
      const filtros = { idEmpresa, idSindicato, idBanco, idObra, tipoVale };
      const valesFiltered = applyClientFilters(valesCurrent, filtros);
      const valesFilteredPrev = applyClientFilters(valesPrev, filtros);

      // Store raw data
      rawValesRef.current = valesFiltered;
      rawValesPrevRef.current = valesFilteredPrev;

      // Calculate all metrics
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
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error en fetchAllData:", err);
      setError(err.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [
    periodo,
    año,
    trimestre,
    idEmpresa,
    idSindicato,
    idBanco,
    idObra,
    tipoVale,
    userProfile?.id_current_obra,
    canViewAllVales,
    calcularRangos,
    applyClientFilters,
    calcularMetricas,
    calcularComparativa,
    calcularDistribucionEstados,
    calcularDistribucionTipo,
    calcularDistribucionEmpresas,
    calcularTopObras,
    calcularTopMateriales,
    calcularTopBancos,
    calcularEficienciaViajes,
    calcularTendencia,
  ]);

  // Load catalogs on mount
  useEffect(() => {
    fetchCatalogos();
  }, [fetchCatalogos]);

  // Load data when filters change
  useEffect(() => {
    if (userProfile) {
      fetchAllData();
    }
  }, [userProfile?.id_persona, fetchAllData]);

  const resetFiltros = useCallback(() => {
    setPeriodo("semana");
    setAño(new Date().getFullYear());
    setTrimestre(null);
    setIdEmpresa(null);
    setIdSindicato(null);
    setIdBanco(null);
    setIdObra(null);
    setTipoVale(null);
  }, []);

  return {
    // Filter state + setters
    filtros: { periodo, año, trimestre, idEmpresa, idSindicato, idBanco, idObra, tipoVale },
    setPeriodo,
    setAño,
    setTrimestre,
    setIdEmpresa,
    setIdSindicato,
    setIdBanco,
    setIdObra,
    setTipoVale,
    resetFiltros,

    // Catalog data
    catalogos,
    loadingCatalogos,

    // Analytics data
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

    // Status
    loading,
    error,
    lastUpdated,
    refresh: fetchAllData,
  };
};
