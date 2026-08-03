/**
 * src/hooks/useReporteDiario.js
 *
 * Reporte operativo de un día específico: KPIs, comparativa vs. día anterior,
 * desglose por material y por renta (agrupado por obra, con su CC) y
 * métricas de eficiencia (tiempos entre viajes, hora pico, rendimiento por
 * vehículo).
 *
 * Dependencias: supabase
 * Usado en: ModalReporteDiario.jsx
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../config/supabase";

// ── Helpers de fecha ──────────────────────────────────────────────────
const formatFechaLocal = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const calcularRango = (fechaStr) => {
  const [y, m, d] = fechaStr.split("-").map(Number);
  const inicioSeleccionado = new Date(y, m - 1, d);
  const finSeleccionado = new Date(inicioSeleccionado.getTime() + 86400000);
  const inicioAnterior = new Date(inicioSeleccionado.getTime() - 86400000);
  return { inicioAnterior, inicioSeleccionado, finSeleccionado };
};

// Excluye obra/empresa de prueba (ID 14 / ID 4), mismo criterio que useDashboardAnalytics
const esValeReal = (v) => Number(v.id_obra) !== 14 && Number(v.id_empresa) !== 4;

// ── Volumen/costo/actividad de un vale (compartido entre KPIs y desglose) ──
const calcularVolumenYCosto = (vale) => {
  let m3 = 0;
  let importe = 0;
  let viajesCount = 0;
  let tuvoActividad = false;

  (vale.vale_material_detalles || []).forEach((det) => {
    const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;

    if (tipoId === 3) {
      // Tipo 3 (Tepetate/Corte): volumen medido, viajes = tickets físicos
      const tickets = vale.tickets_material?.length || 0;
      m3 += Number(det.volumen_real_m3 || det.cantidad_pedida_m3 || 0);
      importe += Number(det.costo_total || 0);
      viajesCount += tickets > 0 ? tickets : 1;
      if (tickets > 0) tuvoActividad = true;
    } else {
      const viajes = det.vale_material_viajes || [];
      if (viajes.length > 0) {
        // Tipo 1 (Pétreos): volumen y costo por viaje individual
        viajes.forEach((viaje) => {
          const vol = Number(viaje.volumen_m3 || 0);
          m3 += vol;
          viajesCount += 1;
          // Prioridad de costo por viaje: override directo → precio_m3 override × vol → precio_m3 del detalle × vol
          importe +=
            viaje.costo_viaje_override != null
              ? Number(viaje.costo_viaje_override)
              : viaje.precio_m3_override != null
              ? Number(viaje.precio_m3_override) * vol
              : Number(det.precio_m3 || 0) * vol;
          tuvoActividad = true;
        });
      } else {
        // Tipo 2 (Base Asfáltica): el volumen se captura directo en el
        // detalle, sin filas individuales en vale_material_viajes — mismo
        // criterio que tablaObraMaterialAcumulado en useEstadisticasGlobales.js
        m3 += Number(det.volumen_real_m3 || det.cantidad_pedida_m3 || 0);
        importe += Number(det.costo_total || 0);
        viajesCount += 1;
        tuvoActividad = true;
      }
    }
  });

  (vale.vale_renta_detalle || []).forEach((det) => {
    const viajesRenta = det.vale_renta_viajes || [];
    importe += Number(det.costo_total || 0);
    viajesCount += viajesRenta.length;
    if (viajesRenta.length > 0) tuvoActividad = true;
  });

  return { m3, importe, viajesCount, tuvoActividad };
};

// ── KPIs del día ───────────────────────────────────────────────────────
const calcularKpis = (vales) => {
  const vehiculosActivos = new Set();
  let materialM3 = 0;
  let totalViajes = 0;
  let importeTotal = 0;

  vales.forEach((vale) => {
    const { m3, importe, viajesCount, tuvoActividad } = calcularVolumenYCosto(vale);
    materialM3 += m3;
    importeTotal += importe;
    totalViajes += viajesCount;

    const idVehiculo = vale.vehiculos?.id_vehiculo;
    if (tuvoActividad && idVehiculo != null) vehiculosActivos.add(idVehiculo);
  });

  const subtotal = Math.round(importeTotal * 100) / 100;
  return {
    vehiculosActivos: vehiculosActivos.size,
    materialM3: Math.round(materialM3 * 100) / 100,
    totalViajes,
    importeTotal: subtotal,
    importeConIva: Math.round(subtotal * 1.16 * 100) / 100,
  };
};

const calcularComparativa = (actual, anterior) => {
  const calcPct = (a, b) => {
    if (!b) return a > 0 ? 100 : 0;
    return Math.round(((a - b) / b) * 100);
  };
  const campos = ["vehiculosActivos", "materialM3", "totalViajes", "importeConIva"];
  const resultado = {};
  campos.forEach((k) => {
    resultado[k] = {
      valor: Math.round((actual[k] - anterior[k]) * 100) / 100,
      pct: calcPct(actual[k], anterior[k]),
      sube: actual[k] >= anterior[k],
    };
  });
  return resultado;
};

// ── Desglose por material (agrupado por obra, con CC) ───────────────────
const calcularDesgloseMaterial = (vales) => {
  const obraMap = {};

  vales.forEach((vale) => {
    const obraId = vale.obras?.id_obra;
    if (!obraId || !vale.vale_material_detalles?.length) return;

    if (!obraMap[obraId]) {
      obraMap[obraId] = {
        obra: vale.obras?.obra || "Sin obra",
        cc: vale.obras?.cc ?? null,
        empresa: vale.empresas?.empresa || null,
        matMap: {},
      };
    }

    vale.vale_material_detalles.forEach((det) => {
      const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;
      const nombreMat = det.material?.material || "Sin clasificar";

      if (!obraMap[obraId].matMap[nombreMat]) {
        obraMap[obraId].matMap[nombreMat] = { material: nombreMat, m3Total: 0, importe: 0, viajes: 0 };
      }
      const s = obraMap[obraId].matMap[nombreMat];

      if (tipoId === 3) {
        const tickets = vale.tickets_material?.length || 0;
        s.m3Total += Number(det.volumen_real_m3 || det.cantidad_pedida_m3 || 0);
        s.importe += Number(det.costo_total || 0);
        s.viajes += tickets > 0 ? tickets : 1;
      } else {
        const viajes = det.vale_material_viajes || [];
        if (viajes.length > 0) {
          viajes.forEach((viaje) => {
            const vol = Number(viaje.volumen_m3 || 0);
            s.m3Total += vol;
            s.importe +=
              viaje.costo_viaje_override != null
                ? Number(viaje.costo_viaje_override)
                : viaje.precio_m3_override != null
                ? Number(viaje.precio_m3_override) * vol
                : Number(det.precio_m3 || 0) * vol;
            s.viajes += 1;
          });
        } else {
          // Tipo 2 (Base Asfáltica): el volumen se captura directo en el
          // detalle, sin filas individuales en vale_material_viajes
          s.m3Total += Number(det.volumen_real_m3 || det.cantidad_pedida_m3 || 0);
          s.importe += Number(det.costo_total || 0);
          s.viajes += 1;
        }
      }
    });
  });

  return Object.values(obraMap)
    .map(({ obra, cc, empresa, matMap }) => {
      const materiales = Object.values(matMap)
        // Descarta materiales sin actividad real ese día (detalle del vale
        // existe pero no se registró ningún viaje/ticket con volumen o costo)
        .filter((m) => m.m3Total > 0 || m.importe > 0)
        .map((m) => ({
          ...m,
          m3Total: Math.round(m.m3Total * 100) / 100,
          importe: Math.round(m.importe * 100) / 100,
        }))
        .sort((a, b) => b.m3Total - a.m3Total);
      const subtotal = materiales.reduce(
        (acc, m) => ({
          m3Total: acc.m3Total + m.m3Total,
          importe: acc.importe + m.importe,
          viajes: acc.viajes + m.viajes,
        }),
        { m3Total: 0, importe: 0, viajes: 0 }
      );
      return { obra, cc, empresa, materiales, subtotal };
    })
    .filter((o) => o.materiales.length > 0)
    .sort((a, b) => b.subtotal.m3Total - a.subtotal.m3Total);
};

// ── Desglose por renta (agrupado por obra, con CC) ───────────────────────
const calcularDesgloseRenta = (vales) => {
  const obraMap = {};

  vales.forEach((vale) => {
    const rentaDetalles = vale.vale_renta_detalle || [];
    const obraId = vale.obras?.id_obra;
    if (!obraId || rentaDetalles.length === 0) return;

    if (!obraMap[obraId]) {
      obraMap[obraId] = {
        obra: vale.obras?.obra || "Sin obra",
        cc: vale.obras?.cc ?? null,
        empresa: vale.empresas?.empresa || null,
        vales: 0,
        horas: 0,
        dias: 0,
        importe: 0,
      };
    }

    obraMap[obraId].vales += 1;
    rentaDetalles.forEach((det) => {
      obraMap[obraId].horas += Number(det.total_horas || 0);
      obraMap[obraId].dias += Number(det.total_dias || 0);
      obraMap[obraId].importe += Number(det.costo_total || 0);
    });
  });

  return Object.values(obraMap)
    // Descarta obras sin actividad real ese día (vale con detalle de renta
    // pero sin horas, días ni costo registrado)
    .filter((o) => o.horas > 0 || o.dias > 0 || o.importe > 0)
    .map((o) => ({
      ...o,
      horas: Math.round(o.horas * 100) / 100,
      dias: Math.round(o.dias * 100) / 100,
      importe: Math.round(o.importe * 100) / 100,
    }))
    .sort((a, b) => b.importe - a.importe);
};

// ── Eficiencia operativa ─────────────────────────────────────────────────
const calcularEficiencia = (vales) => {
  const viajesConHora = [];

  vales.forEach((vale) => {
    const idVehiculo = vale.vehiculos?.id_vehiculo;
    const placas = vale.vehiculos?.placas || "Sin placas";
    (vale.vale_material_detalles || []).forEach((det) => {
      (det.vale_material_viajes || []).forEach((viaje) => {
        if (!viaje.hora_registro) return;
        viajesConHora.push({
          hora: new Date(viaje.hora_registro),
          idVehiculo,
          placas,
          m3: Number(viaje.volumen_m3 || 0),
          obra: vale.obras?.obra || "Sin obra",
        });
      });
    });
  });

  // Distribución de viajes por hora del día (hora local)
  const horas = {};
  for (let h = 0; h < 24; h++) horas[h] = 0;
  viajesConHora.forEach((x) => { horas[x.hora.getHours()] += 1; });
  const distribucionHoraria = Object.entries(horas).map(([h, cantidad]) => ({
    hora: parseInt(h),
    label: `${String(h).padStart(2, "0")}:00`,
    viajes: cantidad,
  }));
  const horaPico = distribucionHoraria.reduce(
    (max, h) => (h.viajes > max.viajes ? h : max),
    { viajes: 0, label: "—" }
  );

  // Tiempo promedio entre viajes consecutivos, por vehículo
  const porVehiculo = {};
  viajesConHora.forEach((x) => {
    if (x.idVehiculo == null) return;
    if (!porVehiculo[x.idVehiculo]) {
      porVehiculo[x.idVehiculo] = { placas: x.placas, horas: [], m3Total: 0, viajes: 0 };
    }
    porVehiculo[x.idVehiculo].horas.push(x.hora.getTime());
    porVehiculo[x.idVehiculo].m3Total += x.m3;
    porVehiculo[x.idVehiculo].viajes += 1;
  });

  let sumaDeltasMs = 0;
  let countDeltas = 0;
  Object.values(porVehiculo).forEach((veh) => {
    const horasOrdenadas = [...veh.horas].sort((a, b) => a - b);
    for (let i = 1; i < horasOrdenadas.length; i++) {
      sumaDeltasMs += horasOrdenadas[i] - horasOrdenadas[i - 1];
      countDeltas += 1;
    }
  });
  const tiempoPromedioEntreViajesMin =
    countDeltas > 0 ? Math.round((sumaDeltasMs / countDeltas / 60000) * 10) / 10 : null;

  const vehiculoTopRaw = Object.values(porVehiculo).sort((a, b) => b.m3Total - a.m3Total)[0] || null;
  const vehiculoTop = vehiculoTopRaw
    ? { placas: vehiculoTopRaw.placas, m3Total: Math.round(vehiculoTopRaw.m3Total * 100) / 100, viajes: vehiculoTopRaw.viajes }
    : null;

  const porObraM3 = {};
  viajesConHora.forEach((x) => { porObraM3[x.obra] = (porObraM3[x.obra] || 0) + x.m3; });
  const obraTopEntry = Object.entries(porObraM3).sort((a, b) => b[1] - a[1])[0];
  const obraTop = obraTopEntry ? { obra: obraTopEntry[0], m3Total: Math.round(obraTopEntry[1] * 100) / 100 } : null;

  const totalM3Material = viajesConHora.reduce((acc, x) => acc + x.m3, 0);
  const m3PromedioPorViaje =
    viajesConHora.length > 0 ? Math.round((totalM3Material / viajesConHora.length) * 100) / 100 : 0;

  return {
    distribucionHoraria,
    horaPico: horaPico.viajes > 0 ? horaPico : null,
    tiempoPromedioEntreViajesMin,
    m3PromedioPorViaje,
    vehiculoTop,
    obraTop,
  };
};

// ── Hook principal ────────────────────────────────────────────────────
export const useReporteDiario = () => {
  const [fecha, setFecha] = useState(() => formatFechaLocal(new Date()));
  const [rawVales, setRawVales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const rango = useMemo(() => calcularRango(fecha), [fecha]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { inicioAnterior, finSeleccionado } = calcularRango(fecha);

      const { data, error: err } = await supabase
        .from("vales")
        .select(`
          id_vale, folio, tipo_vale, estado, fecha_creacion, id_obra, id_empresa,
          obras:id_obra (id_obra, obra, cc),
          empresas:id_empresa (id_empresa, empresa),
          vehiculos:id_vehiculo (id_vehiculo, placas),
          tickets_material (id_ticket, fecha_impresion),
          vale_material_detalles (
            id_detalle_material, volumen_real_m3, cantidad_pedida_m3, costo_total, precio_m3, id_material,
            material:id_material (id_material, material, tipo_de_material:id_tipo_de_material (id_tipo_de_material, tipo_de_material)),
            vale_material_viajes (id_viaje, hora_registro, volumen_m3, precio_m3, costo_viaje, precio_m3_override, costo_viaje_override)
          ),
          vale_renta_detalle (total_horas, total_dias, costo_total, vale_renta_viajes (id_viaje, hora_registro))
        `)
        .gte("fecha_creacion", inicioAnterior.toISOString())
        .lte("fecha_creacion", finSeleccionado.toISOString())
        .limit(10000);

      if (err) throw err;
      setRawVales(data || []);
    } catch (err) {
      console.error("Error en useReporteDiario.fetchData:", err);
      setError(err.message || "Error al cargar el reporte diario");
    } finally {
      setLoading(false);
    }
  }, [fecha]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const valesDia = useMemo(() => {
    const { inicioSeleccionado, finSeleccionado } = rango;
    return rawVales.filter((v) => {
      if (!esValeReal(v) || !v.fecha_creacion) return false;
      const t = new Date(v.fecha_creacion).getTime();
      return t >= inicioSeleccionado.getTime() && t < finSeleccionado.getTime();
    });
  }, [rawVales, rango]);

  const valesDiaAnterior = useMemo(() => {
    const { inicioAnterior, inicioSeleccionado } = rango;
    return rawVales.filter((v) => {
      if (!esValeReal(v) || !v.fecha_creacion) return false;
      const t = new Date(v.fecha_creacion).getTime();
      return t >= inicioAnterior.getTime() && t < inicioSeleccionado.getTime();
    });
  }, [rawVales, rango]);

  const kpis = useMemo(() => calcularKpis(valesDia), [valesDia]);
  const kpisAnterior = useMemo(() => calcularKpis(valesDiaAnterior), [valesDiaAnterior]);
  const comparativa = useMemo(() => calcularComparativa(kpis, kpisAnterior), [kpis, kpisAnterior]);
  const desgloseMaterial = useMemo(() => calcularDesgloseMaterial(valesDia), [valesDia]);
  const desgloseRenta = useMemo(() => calcularDesgloseRenta(valesDia), [valesDia]);
  const eficiencia = useMemo(() => calcularEficiencia(valesDia), [valesDia]);

  return {
    fecha,
    setFecha,
    loading,
    error,
    kpis,
    comparativa,
    desgloseMaterial,
    desgloseRenta,
    eficiencia,
    refresh: fetchData,
  };
};
