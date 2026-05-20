/**
 * src/hooks/useMvStats.js
 *
 * Consulta las vistas materializadas mv_stats_material y mv_stats_renta
 * para estadísticas históricas mensuales por obra y material.
 * Dependencias: supabase
 * Usado en: Dashboard.jsx (pestañas Materiales y Renta)
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../config/supabase";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export const useMvStats = ({ año, idObra }) => {
  const [rawMaterial, setRawMaterial] = useState([]);
  const [rawRenta, setRawRenta] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let qMaterial = supabase
        .from("mv_stats_material")
        .select("*")
        .gte("mes", `${año}-01-01`)
        .lte("mes", `${año}-12-31`);

      let qRenta = supabase
        .from("mv_stats_renta")
        .select("*")
        .gte("mes", `${año}-01-01`)
        .lte("mes", `${año}-12-31`);

      if (idObra) {
        qMaterial = qMaterial.eq("id_obra", idObra);
        qRenta = qRenta.eq("id_obra", idObra);
      }

      const [resMaterial, resRenta] = await Promise.all([qMaterial, qRenta]);

      if (resMaterial.error) throw resMaterial.error;
      if (resRenta.error) throw resRenta.error;

      setRawMaterial(resMaterial.data || []);
      setRawRenta(resRenta.data || []);
    } catch (err) {
      console.error("Error en useMvStats:", err);
      setError(err.message || "Error al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  }, [año, idObra]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // --- Agregaciones de material ---

  // Por nombre de material: totales acumulados del año
  const statsMaterial = (() => {
    const mapa = {};
    rawMaterial.forEach((row) => {
      const nombre = row.nombre_material || "Sin material";
      if (!mapa[nombre]) {
        mapa[nombre] = {
          nombre_material: nombre,
          id_material: row.id_material,
          m3_total: 0,
          costo_total: 0,
          total_vales: 0,
          total_viajes: 0,
        };
      }
      mapa[nombre].m3_total += parseFloat(row.m3_total) || 0;
      mapa[nombre].costo_total += parseFloat(row.costo_total) || 0;
      mapa[nombre].total_vales += parseInt(row.total_vales) || 0;
      mapa[nombre].total_viajes += parseInt(row.total_viajes) || 0;
    });

    return Object.values(mapa)
      .map((item) => ({
        ...item,
        m3_total: Math.round(item.m3_total * 100) / 100,
        costo_total: Math.round(item.costo_total * 100) / 100,
        importe_iva: Math.round(item.costo_total * 1.16 * 100) / 100,
      }))
      .sort((a, b) => b.m3_total - a.m3_total);
  })();

  // KPIs de material (totales del año)
  const kpisMaterial = (() => {
    const totalM3 = statsMaterial.reduce((s, r) => s + r.m3_total, 0);
    const totalVales = statsMaterial.reduce((s, r) => s + r.total_vales, 0);
    const totalViajes = statsMaterial.reduce((s, r) => s + r.total_viajes, 0);
    const subtotal = statsMaterial.reduce((s, r) => s + r.costo_total, 0);
    return {
      totalM3: Math.round(totalM3 * 100) / 100,
      totalVales,
      totalViajes,
      importeIva: Math.round(subtotal * 1.16 * 100) / 100,
    };
  })();

  // Por mes con cada material como key → para BarChart apilado
  // statsMaterialPorMes: { mes, [nombre]: m3_total }
  // statsMaterialPorMesImporte: { mes, [nombre]: importe_iva }
  const { statsMaterialPorMes, statsMaterialPorMesImporte } = (() => {
    const bucketsM3 = Array.from({ length: 12 }, (_, i) => ({ mes: MESES[i], mesNum: i + 1 }));
    const bucketsImp = Array.from({ length: 12 }, (_, i) => ({ mes: MESES[i], mesNum: i + 1 }));

    rawMaterial.forEach((row) => {
      const mesDate = new Date(row.mes + "T12:00:00");
      const mesIdx = mesDate.getMonth();
      const nombre = row.nombre_material || "Sin material";
      const m3 = parseFloat(row.m3_total) || 0;
      const costo = parseFloat(row.costo_total) || 0;

      if (!bucketsM3[mesIdx][nombre]) bucketsM3[mesIdx][nombre] = 0;
      bucketsM3[mesIdx][nombre] += m3;

      if (!bucketsImp[mesIdx][nombre]) bucketsImp[mesIdx][nombre] = 0;
      bucketsImp[mesIdx][nombre] += costo * 1.16;
    });

    const round = (buckets) =>
      buckets.map((b) => {
        const out = { mes: b.mes, mesNum: b.mesNum };
        Object.keys(b).forEach((k) => {
          if (k !== "mes" && k !== "mesNum") out[k] = Math.round(b[k] * 100) / 100;
        });
        return out;
      });

    return {
      statsMaterialPorMes: round(bucketsM3),
      statsMaterialPorMesImporte: round(bucketsImp),
    };
  })();

  // Lista de materiales distintos (para las barras del stack)
  const materialesDistintos = [...new Set(rawMaterial.map((r) => r.nombre_material || "Sin material"))];

  // --- Agregaciones de renta ---

  // Por mes
  const statsRenta = (() => {
    const mapa = {};
    rawRenta.forEach((row) => {
      const mesDate = new Date(row.mes + "T12:00:00");
      const mesIdx = mesDate.getMonth();
      const mesLabel = MESES[mesIdx];
      if (!mapa[mesIdx]) {
        mapa[mesIdx] = {
          mes: mesLabel,
          mesNum: mesIdx + 1,
          total_vales: 0,
          total_horas: 0,
          total_dias: 0,
          costo_total: 0,
        };
      }
      mapa[mesIdx].total_vales += parseInt(row.total_vales) || 0;
      mapa[mesIdx].total_horas += parseFloat(row.total_horas) || 0;
      mapa[mesIdx].total_dias += parseFloat(row.total_dias) || 0;
      mapa[mesIdx].costo_total += parseFloat(row.costo_total) || 0;
    });

    return Array.from({ length: 12 }, (_, i) => {
      const item = mapa[i] || {
        mes: MESES[i],
        mesNum: i + 1,
        total_vales: 0,
        total_horas: 0,
        total_dias: 0,
        costo_total: 0,
      };
      return {
        ...item,
        total_horas: Math.round(item.total_horas * 100) / 100,
        total_dias: Math.round(item.total_dias * 100) / 100,
        costo_total: Math.round(item.costo_total * 100) / 100,
        importe_iva: Math.round(item.costo_total * 1.16 * 100) / 100,
      };
    });
  })();

  // KPIs de renta (totales del año)
  const kpisRenta = (() => {
    const totalVales = statsRenta.reduce((s, r) => s + r.total_vales, 0);
    const totalHoras = statsRenta.reduce((s, r) => s + r.total_horas, 0);
    const totalDias = statsRenta.reduce((s, r) => s + r.total_dias, 0);
    const subtotal = statsRenta.reduce((s, r) => s + r.costo_total, 0);
    return {
      totalVales,
      totalHoras: Math.round(totalHoras * 100) / 100,
      totalDias: Math.round(totalDias * 100) / 100,
      importeIva: Math.round(subtotal * 1.16 * 100) / 100,
    };
  })();

  return {
    statsMaterial,
    statsMaterialPorMes,
    statsMaterialPorMesImporte,
    materialesDistintos,
    kpisMaterial,
    statsRenta,
    kpisRenta,
    loading,
    error,
    refresh: fetchStats,
  };
};
