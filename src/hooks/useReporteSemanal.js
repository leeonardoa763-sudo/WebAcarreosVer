/**
 * src/hooks/useReporteSemanal.js
 *
 * Reporte operativo de una semana (lunes a domingo, ISO 8601 — ver
 * utils/dateUtils.js): mismos KPIs y gráficas que useReporteDiario.js
 * (materiales de la semana, renta por equipo, pipas de agua, flota propia,
 * desglose por obra con presupuesto y eficiencia operativa), con
 * comparativa vs. la semana anterior, más un bloque compacto de
 * `indicadoresSemana` — versión resumida a nivel compañía (sin desglose por
 * obra, para que quepa en una imagen digerible) de 3 de los indicadores de
 * "Análisis Avanzado" de EstadisticasGlobales.jsx: índice de posición
 * promedio ponderado por m³, flete evitado por flota propia (GRUPO GEEM,
 * revaluado a tarifa real de sindicato CTM) y renta no aprovechada (importe
 * pagado en equipos con ritmo de "Poca Eficiencia", 1-3 viajes/día).
 *
 * La eficiencia operativa reemplaza "hora pico"/distribución horaria (poco
 * útil en una ventana de 7 días) por distribución de viajes por día
 * calendario de la semana y "día más activo" — mismo criterio de resto
 * (tiempo promedio entre viajes, m³ promedio por viaje, vehículo top).
 *
 * El día efectivo de un vale (obtenerFechaEfectiva) y la excepción de pipas
 * de agua (agrupadas por fecha_creacion, no por fecha_completado) siguen el
 * mismo criterio que useReporteDiario.js — ver comentarios ahí.
 *
 * Dependencias: supabase, utils/cotizarFlete, utils/dateUtils
 * (calcularSemanaISO), utils/rentaMaterial, SINDICATO_TARIFAS_REPORTE de
 * hooks/useEstadisticasGlobales
 * Usado en: ReporteSemanal.jsx
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../config/supabase";
import { cotizarFleteM3 } from "../utils/cotizarFlete";
import { calcularSemanaISO } from "../utils/dateUtils";
import { SINDICATO_TARIFAS_REPORTE } from "./useEstadisticasGlobales";
import { materialLabelDetalle } from "../utils/rentaMaterial";

// ── Helpers de fecha ──────────────────────────────────────────────────
export const formatFechaLocal = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Día calendario (YYYY-MM-DD) en horario de México, para agrupar por día de
// la semana sin drift de zona horaria (mismo truco que el resto del repo:
// derivar el día en México y reconstruir a mediodía antes de leer getDay()).
const diaMexico = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }) : null;

const calcularRango = (fechaRef) => {
  const semana = calcularSemanaISO(fechaRef);
  const inicioSeleccionado = new Date(`${semana.fechaInicio}T00:00:00`);
  const finSeleccionado = new Date(new Date(`${semana.fechaFin}T00:00:00`).getTime() + 86400000);
  const inicioAnterior = new Date(inicioSeleccionado.getTime() - 7 * 86400000);
  return { semana, inicioAnterior, inicioSeleccionado, finSeleccionado };
};

// Fecha efectiva de un vale para el reporte — mismo criterio y misma
// prioridad que useReporteDiario.js: fecha_completado (real) →
// fecha_programada (planeado, aún no cerrado) → fecha_creacion (fallback).
const obtenerFechaEfectiva = (vale) => {
  if (vale.fecha_completado) return new Date(vale.fecha_completado);
  if (vale.fecha_programada) return new Date(`${vale.fecha_programada}T12:00:00`);
  return new Date(vale.fecha_creacion);
};

// Excluye obra/empresa de prueba (ID 14 / ID 4), mismo criterio que useDashboardAnalytics
const esValeReal = (v) => Number(v.id_obra) !== 14 && Number(v.id_empresa) !== 4;

const round2 = (n) => Math.round(n * 100) / 100;

const coincideSindicato = (nombre, buscado) => (nombre || "").toUpperCase().includes(buscado);

const SINDICATO_FLOTA_PROPIA = "GRUPO GEEM";
const esFlotaPropia = (sindicato) => coincideSindicato(sindicato, SINDICATO_FLOTA_PROPIA);

// ── Registros de material de un vale (mismo criterio que useReporteDiario) ──
const expandirRegistrosMaterial = (vale) => {
  const registros = [];

  (vale.vale_material_detalles || []).forEach((det) => {
    const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;
    const material = det.material?.material || "Sin clasificar";
    const idMaterial = det.id_material ?? null;
    const esGeem = esFlotaPropia(det.sindicatos?.sindicato);
    const esPlanta = det.es_planta_asfaltos ?? false;
    const distanciaKmDetalle = Number(det.distancia_km || 0);

    if (tipoId === 3) {
      const tickets = vale.tickets_material?.length || 0;
      registros.push({
        material,
        idMaterial,
        tipoId,
        m3: Number(det.volumen_real_m3 || det.cantidad_pedida_m3 || 0),
        importe: Number(det.costo_total || 0),
        viajes: tickets > 0 ? tickets : 1,
        distanciaKm: distanciaKmDetalle,
        esGeem,
        esPlanta,
        tuvoActividad: tickets > 0,
      });
    } else {
      const viajes = det.vale_material_viajes || [];
      if (viajes.length > 0) {
        viajes.forEach((viaje) => {
          const vol = Number(viaje.volumen_m3 || 0);
          registros.push({
            material,
            idMaterial,
            tipoId,
            m3: vol,
            importe:
              viaje.costo_viaje_override != null
                ? Number(viaje.costo_viaje_override)
                : viaje.precio_m3_override != null
                ? Number(viaje.precio_m3_override) * vol
                : Number(det.precio_m3 || 0) * vol,
            viajes: 1,
            distanciaKm: Number(viaje.distancia_km_override ?? distanciaKmDetalle),
            esGeem,
            esPlanta,
            tuvoActividad: true,
            horaRegistro: viaje.hora_registro || null,
          });
        });
      } else {
        registros.push({
          material,
          idMaterial,
          tipoId,
          m3: Number(det.volumen_real_m3 || det.cantidad_pedida_m3 || 0),
          importe: Number(det.costo_total || 0),
          viajes: 1,
          distanciaKm: distanciaKmDetalle,
          esGeem,
          esPlanta,
          tuvoActividad: true,
        });
      }
    }
  });

  return registros;
};

const calcularVolumenYCosto = (vale) => {
  let m3 = 0;
  let importe = 0;
  let viajesCount = 0;
  let tuvoActividad = false;

  expandirRegistrosMaterial(vale).forEach((r) => {
    m3 += r.m3;
    if (!r.esGeem) importe += r.importe;
    viajesCount += r.viajes;
    if (r.tuvoActividad) tuvoActividad = true;
  });

  (vale.vale_renta_detalle || []).forEach((det) => {
    const viajesRenta = det.vale_renta_viajes?.length > 0 ? det.vale_renta_viajes.length : (det.numero_viajes || 0);
    importe += Number(det.costo_total || 0);
    viajesCount += viajesRenta;
    if (viajesRenta > 0) tuvoActividad = true;
  });

  return { m3, importe, viajesCount, tuvoActividad };
};

// ── KPIs de la semana ──────────────────────────────────────────────────
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

  const subtotal = round2(importeTotal);
  return {
    vehiculosActivos: vehiculosActivos.size,
    materialM3: round2(materialM3),
    totalViajes,
    importeTotal: subtotal,
    importeConIva: round2(subtotal * 1.16),
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
      valor: round2(actual[k] - anterior[k]),
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
        obraId,
        obra: vale.obras?.obra || "Sin obra",
        cc: vale.obras?.cc ?? null,
        empresa: vale.empresas?.empresa || null,
        matMap: {},
      };
    }

    expandirRegistrosMaterial(vale).forEach((r) => {
      if (!obraMap[obraId].matMap[r.material]) {
        obraMap[obraId].matMap[r.material] = {
          material: r.material,
          idMaterial: r.idMaterial,
          m3Total: 0,
          importe: 0,
          viajes: 0,
          m3Planta: 0,
          viajesPlanta: 0,
        };
      }
      const s = obraMap[obraId].matMap[r.material];
      s.m3Total += r.m3;
      if (!r.esGeem) s.importe += r.importe;
      s.viajes += r.viajes;
      if (r.esPlanta) {
        s.m3Planta += r.m3;
        s.viajesPlanta += r.viajes;
      }
    });
  });

  return Object.values(obraMap)
    .map(({ obraId, obra, cc, empresa, matMap }) => {
      const materiales = Object.values(matMap)
        .filter((m) => m.m3Total > 0 || m.importe > 0)
        .map((m) => ({ ...m, m3Total: round2(m.m3Total), importe: round2(m.importe), m3Planta: round2(m.m3Planta) }))
        .sort((a, b) => b.m3Total - a.m3Total);
      const subtotal = materiales.reduce(
        (acc, m) => ({
          m3Total: acc.m3Total + m.m3Total,
          importe: acc.importe + m.importe,
          viajes: acc.viajes + m.viajes,
        }),
        { m3Total: 0, importe: 0, viajes: 0 }
      );
      return { obraId, obra, cc, empresa, materiales, subtotal };
    })
    .filter((o) => o.materiales.length > 0)
    .sort((a, b) => b.subtotal.m3Total - a.subtotal.m3Total);
};

// ── Materiales de la semana (compañía completa, sin agrupar por obra) ───
const calcularMaterialesSemana = (vales) => {
  const matMap = {};

  vales.forEach((vale) => {
    expandirRegistrosMaterial(vale).forEach((r) => {
      if (!matMap[r.material]) matMap[r.material] = { material: r.material, m3Total: 0, importe: 0, viajes: 0 };
      const s = matMap[r.material];
      s.m3Total += r.m3;
      if (!r.esGeem) s.importe += r.importe;
      s.viajes += r.viajes;
    });
  });

  return Object.values(matMap)
    .filter((m) => m.m3Total > 0 || m.importe > 0)
    .map((m) => ({ ...m, m3Total: round2(m.m3Total), importe: round2(m.importe) }))
    .sort((a, b) => b.m3Total - a.m3Total);
};

// ── Flota propia (GRUPO GEEM) de la semana ──────────────────────────────
const calcularFlotaPropia = (vales, preciosMaterialTodos) => {
  const tarifaCTM = (tipoMaterialId) =>
    preciosMaterialTodos.find(
      (t) => t.id_tipo_de_material === tipoMaterialId && coincideSindicato(t.sindicatos?.sindicato, SINDICATO_TARIFAS_REPORTE)
    ) || null;

  let viajesGeem = 0;
  let valorAhorrado = 0;
  let viajesPlanta = 0;
  const materialesPlanta = {};

  vales.forEach((vale) => {
    expandirRegistrosMaterial(vale).forEach((r) => {
      if (!r.esGeem) return;
      viajesGeem += r.viajes;

      if (r.m3 > 0) {
        const tarifa = tarifaCTM(r.tipoId);
        const valorM3 = tarifa ? cotizarFleteM3(r.distanciaKm, tarifa) : null;
        if (valorM3 != null) valorAhorrado += valorM3 * r.m3;
      }

      if (r.esPlanta) {
        viajesPlanta += r.viajes;
        if (!materialesPlanta[r.material]) materialesPlanta[r.material] = { material: r.material, m3: 0, viajes: 0 };
        materialesPlanta[r.material].m3 += r.m3;
        materialesPlanta[r.material].viajes += r.viajes;
      }
    });
  });

  return {
    viajesGeem,
    valorAhorrado: round2(valorAhorrado),
    viajesPlanta,
    materialesPlanta: Object.values(materialesPlanta)
      .map((m) => ({ ...m, m3: round2(m.m3) }))
      .sort((a, b) => b.m3 - a.m3),
  };
};

// ── Pipas de agua de la semana ──────────────────────────────────────────
// Igual que useReporteDiario.js: agrupadas por fecha_creacion, no por
// fecha_completado (evita inflar la semana en que por fin se cierra una pipa
// que quedó "en_proceso" varios días).
const calcularPipasDeLaSemana = (vales) => {
  let vales_ = 0;
  let totalViajes = 0;
  let capacidadSuma = 0;
  let capacidadCount = 0;

  vales.forEach((vale) => {
    const rentaDetalles = vale.vale_renta_detalle || [];
    if (rentaDetalles.length === 0) return;

    vales_ += 1;
    rentaDetalles.forEach((det) => {
      totalViajes += det.vale_renta_viajes?.length > 0
        ? det.vale_renta_viajes.length
        : (det.numero_viajes || 0);
      if (vale.vehiculos?.capacidad_m3 != null) {
        capacidadSuma += Number(vale.vehiculos.capacidad_m3);
        capacidadCount += 1;
      }
    });
  });

  const capacidadPromedio = capacidadCount > 0 ? capacidadSuma / capacidadCount : null;
  return {
    vales: vales_,
    totalViajes,
    capacidadPromedio: capacidadPromedio != null ? round2(capacidadPromedio) : null,
    volumenAprox: capacidadPromedio != null ? round2(totalViajes * capacidadPromedio) : null,
  };
};

// ── Renta de la semana por tipo de equipo (compañía completa, sin pipas) ──
const META_VIAJES_DIA_RENTA = 7;
const RANGOS_EFICIENCIA_RENTA = [
  { key: "desperdiciado", label: "Poca Eficiencia", max: META_VIAJES_DIA_RENTA - 4 },
  { key: "pocaEficiencia", label: "Eficiencia Media", max: META_VIAJES_DIA_RENTA - 1 },
  { key: "buenaEficiencia", label: "Buena Eficiencia", max: META_VIAJES_DIA_RENTA + 2 },
  { key: "ideal", label: "Muy Buena Eficiencia", max: Infinity },
];
const clasificarRangoRenta = (viajesPorDia) => {
  if (viajesPorDia == null) return null;
  const rango = RANGOS_EFICIENCIA_RENTA.find((r) => viajesPorDia <= r.max);
  return rango?.key ?? "ideal";
};

const calcularRentaPorEquipo = (vales) => {
  const equipoMap = {};

  vales.forEach((vale) => {
    if (vale.es_pipa_agua) return;
    (vale.vale_renta_detalle || []).forEach((det) => {
      const labelDetalle = materialLabelDetalle(det);
      const equipo = labelDetalle === "—" ? "Sin clasificar" : labelDetalle;
      if (!equipoMap[equipo]) {
        equipoMap[equipo] = { equipo, importe: 0, horas: 0, dias: 0, viajes: 0 };
      }
      const viajes = det.vale_renta_viajes?.length > 0 ? det.vale_renta_viajes.length : (det.numero_viajes || 0);
      equipoMap[equipo].importe += Number(det.costo_total || 0);
      equipoMap[equipo].horas += Number(det.total_horas || 0);
      equipoMap[equipo].dias += Number(det.total_dias || 0);
      equipoMap[equipo].viajes += viajes;
    });
  });

  return Object.values(equipoMap)
    .filter((e) => e.importe > 0 || e.horas > 0 || e.dias > 0)
    .map((e) => {
      const viajesPorDia = e.dias > 0 ? e.viajes / e.dias : null;
      return {
        ...e,
        importe: round2(e.importe),
        horas: round2(e.horas),
        dias: round2(e.dias),
        viajesPorDia: viajesPorDia != null ? round2(viajesPorDia) : null,
        nivelEficiencia: clasificarRangoRenta(viajesPorDia),
      };
    })
    .sort((a, b) => b.importe - a.importe);
};

// ── Desglose por renta (agrupado por obra, con CC, sin pipas) ────────────
const calcularDesgloseRenta = (vales) => {
  const obraMap = {};

  vales.forEach((vale) => {
    if (vale.es_pipa_agua) return;
    const rentaDetalles = vale.vale_renta_detalle || [];
    const obraId = vale.obras?.id_obra;
    if (!obraId || rentaDetalles.length === 0) return;

    if (!obraMap[obraId]) {
      obraMap[obraId] = {
        obraId,
        obra: vale.obras?.obra || "Sin obra",
        cc: vale.obras?.cc ?? null,
        empresa: vale.obras?.empresas?.empresa || null,
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
    .filter((o) => o.horas > 0 || o.dias > 0 || o.importe > 0)
    .map((o) => ({ ...o, horas: round2(o.horas), dias: round2(o.dias), importe: round2(o.importe) }))
    .sort((a, b) => b.importe - a.importe);
};

// ── Indicadores de eficiencia de la semana (versión compañía completa) ──
// Réplica compacta (sin desglose por obra) de 3 de los 4 indicadores de
// useIndicadoresEficiencia.js — pensada para caber en 3 tarjetas dentro de
// una imagen, no para reemplazar el detalle por obra de Estadísticas
// Globales. Viabilidad de flota (camiones/día + top camioneros) se deja
// fuera a propósito para no saturar el reporte semanal.
const calcularIndicadoresSemana = (vales, preciosMaterialTodos) => {
  // Índice de posición: Σ(m³ × distancia_km) ÷ Σm³, compañía completa.
  let sumaM3PorKm = 0;
  let m3TotalIndice = 0;
  vales.forEach((vale) => {
    (vale.vale_material_detalles || []).forEach((det) => {
      const viajes = det.vale_material_viajes || [];
      const registros = viajes.length > 0
        ? viajes.map((v) => ({ m3: Number(v.volumen_m3 ?? 0), distanciaKm: Number(v.distancia_km_override ?? det.distancia_km ?? 0) }))
        : [{ m3: Number(det.volumen_real_m3 ?? 0), distanciaKm: Number(det.distancia_km ?? 0) }];
      registros.forEach(({ m3, distanciaKm }) => {
        if (m3 <= 0 || distanciaKm <= 0) return;
        sumaM3PorKm += m3 * distanciaKm;
        m3TotalIndice += m3;
      });
    });
  });
  const indicePosicionPromedio = m3TotalIndice > 0 ? sumaM3PorKm / m3TotalIndice : null;

  // Flete evitado por flota propia (GRUPO GEEM), revaluado a tarifa CTM.
  const tarifaCTM = (tipoMaterialId) =>
    preciosMaterialTodos.find(
      (t) => t.id_tipo_de_material === tipoMaterialId && coincideSindicato(t.sindicatos?.sindicato, SINDICATO_TARIFAS_REPORTE)
    ) || null;
  let fleteEvitadoTotal = 0;
  let viajesGeemTotal = 0;
  vales.forEach((vale) => {
    expandirRegistrosMaterial(vale).forEach((r) => {
      if (!r.esGeem) return;
      viajesGeemTotal += r.viajes;
      if (r.m3 <= 0) return;
      const tarifa = tarifaCTM(r.tipoId);
      const valorM3 = tarifa ? cotizarFleteM3(r.distanciaKm, tarifa) : null;
      if (valorM3 != null) fleteEvitadoTotal += valorM3 * r.m3;
    });
  });

  // Renta no aprovechada: importe pagado en vale_renta_detalle cuyo ritmo
  // real (viajes ÷ días) cae en el espectro "Poca Eficiencia".
  let totalImporteRenta = 0;
  let totalValesRenta = 0;
  let rentaDesperdiciadaTotal = 0;
  let valesPocaEficiencia = 0;
  vales.forEach((vale) => {
    if (vale.es_pipa_agua) return;
    (vale.vale_renta_detalle || []).forEach((det) => {
      const totalDias = Number(det.total_dias || 0);
      if (totalDias <= 0) return;
      const viajes = det.vale_renta_viajes?.length > 0 ? det.vale_renta_viajes.length : (det.numero_viajes || 1);
      if (viajes <= 0) return;
      const importe = Number(det.costo_total || 0);
      totalImporteRenta += importe;
      totalValesRenta += 1;
      if (clasificarRangoRenta(viajes / totalDias) === "desperdiciado") {
        rentaDesperdiciadaTotal += importe;
        valesPocaEficiencia += 1;
      }
    });
  });

  return {
    indicePosicionPromedio: indicePosicionPromedio != null ? round2(indicePosicionPromedio) : null,
    fleteEvitadoTotal: round2(fleteEvitadoTotal),
    viajesGeemTotal,
    rentaDesperdiciadaTotal: round2(rentaDesperdiciadaTotal),
    totalImporteRentaSemana: round2(totalImporteRenta),
    pctPocaEficienciaRenta: totalValesRenta > 0 ? Math.round((valesPocaEficiencia / totalValesRenta) * 100) : null,
  };
};

// ── Eficiencia operativa de la semana ────────────────────────────────────
// A diferencia de useReporteDiario.js (distribución por hora del día), aquí
// se distribuye por día calendario de la semana — más útil en una ventana
// de 7 días — y "día más activo" reemplaza a "hora pico".
const DIAS_SEMANA_LABEL = { 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb", 0: "Dom" };

const calcularEficiencia = (vales, fechaInicioSemana) => {
  const viajesConHora = [];

  vales.forEach((vale) => {
    const idVehiculo = vale.vehiculos?.id_vehiculo;
    const placas = vale.vehiculos?.placas || "Sin placas";
    (vale.vale_material_detalles || []).forEach((det) => {
      const material = det.material?.material || "Sin clasificar";
      const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;
      const viajes = det.vale_material_viajes || [];
      viajes.forEach((viaje) => {
        if (!viaje.hora_registro) return;
        viajesConHora.push({
          hora: new Date(viaje.hora_registro),
          idVehiculo,
          placas,
          m3: Number(viaje.volumen_m3 || 0),
          obra: vale.obras?.obra || "Sin obra",
          material,
        });
      });
      if (tipoId === 2 && viajes.length === 0) {
        const tieneDatos = det.volumen_real_m3 != null || det.costo_total != null;
        const tsVale = vale.fecha_completado ?? vale.fecha_creacion;
        if (tieneDatos && tsVale) {
          viajesConHora.push({
            hora: new Date(tsVale),
            idVehiculo,
            placas,
            m3: Number(det.volumen_real_m3 || det.cantidad_pedida_m3 || 0),
            obra: vale.obras?.obra || "Sin obra",
            material,
          });
        }
      }
    });
  });

  // Distribución de viajes por día calendario de la semana (Lun→Dom),
  // desglosada por material para colorear/leyendar igual que la del día.
  const materialesDistintos = [...new Set(viajesConHora.map((x) => x.material))].sort();
  const diasMap = {};
  const inicio = new Date(`${fechaInicioSemana}T00:00:00`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicio.getTime() + i * 86400000);
    const key = formatFechaLocal(d);
    diasMap[key] = { fecha: key, label: `${DIAS_SEMANA_LABEL[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}` };
    materialesDistintos.forEach((m) => { diasMap[key][m] = 0; });
  }
  viajesConHora.forEach((x) => {
    const key = diaMexico(x.hora.toISOString());
    if (!diasMap[key]) return;
    diasMap[key][x.material] = (diasMap[key][x.material] || 0) + 1;
  });
  // `total` por día (suma de todos los materiales) — se usa tanto para
  // encontrar el día pico como para la etiqueta de total sobre cada barra.
  const distribucionDiaria = Object.values(diasMap).map((row) => ({
    ...row,
    total: materialesDistintos.reduce((s, m) => s + (row[m] || 0), 0),
  }));
  const diaPico = distribucionDiaria.reduce(
    (max, row) => (row.total > max.viajes ? { viajes: row.total, label: row.label } : max),
    { viajes: 0, label: "—" }
  );

  // Tiempo promedio entre viajes consecutivos, por vehículo, en toda la semana
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
    ? { placas: vehiculoTopRaw.placas, m3Total: round2(vehiculoTopRaw.m3Total), viajes: vehiculoTopRaw.viajes }
    : null;

  const totalM3Material = viajesConHora.reduce((acc, x) => acc + x.m3, 0);
  const m3PromedioPorViaje = viajesConHora.length > 0 ? round2(totalM3Material / viajesConHora.length) : 0;

  return {
    distribucionDiaria,
    materialesDistintos,
    diaPico: diaPico.viajes > 0 ? diaPico : null,
    tiempoPromedioEntreViajesMin,
    m3PromedioPorViaje,
    vehiculoTop,
  };
};

// ── Hook principal ────────────────────────────────────────────────────
export const useReporteSemanal = () => {
  const [fechaRef, setFechaRef] = useState(() => formatFechaLocal(new Date()));
  const [rawVales, setRawVales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [preciosMaterialTodos, setPreciosMaterialTodos] = useState([]);
  useEffect(() => {
    let activo = true;
    supabase
      .from("precios_material")
      .select(`
        id_precios_material, id_tipo_de_material, id_sindicato,
        numero_de_intervalos, primer_km, km_sub_int1, limite_int1, km_sub_int2, limite_int2,
        sindicatos:id_sindicato (id_sindicato, sindicato)
      `)
      .then(({ data, error: err }) => {
        if (!activo) return;
        if (err) {
          console.error("Error al cargar precios_material en useReporteSemanal:", err.message);
          return;
        }
        setPreciosMaterialTodos(data || []);
      });
    return () => { activo = false; };
  }, []);

  const [presupuestosMaterial, setPresupuestosMaterial] = useState([]);
  useEffect(() => {
    let activo = true;
    supabase
      .from("presupuesto_material_obra")
      .select("id_obra, id_material, m3_consumidos, m3_presupuestados")
      .then(({ data, error: err }) => {
        if (!activo) return;
        if (err) {
          console.error("Error al cargar presupuesto_material_obra en useReporteSemanal:", err.message);
          return;
        }
        setPresupuestosMaterial(data || []);
      });
    return () => { activo = false; };
  }, []);

  const acumuladoMaterialMap = useMemo(() => {
    const map = {};
    presupuestosMaterial.forEach((p) => {
      map[`${p.id_obra}::${p.id_material}`] = {
        consumido: Number(p.m3_consumidos || 0),
        presupuestado: p.m3_presupuestados != null ? Number(p.m3_presupuestados) : null,
      };
    });
    return map;
  }, [presupuestosMaterial]);

  const [presupuestosRenta, setPresupuestosRenta] = useState([]);
  useEffect(() => {
    let activo = true;
    supabase
      .from("presupuesto_renta_obra")
      .select("id_obra, monto_consumido, monto_presupuestado")
      .then(({ data, error: err }) => {
        if (!activo) return;
        if (err) {
          console.error("Error al cargar presupuesto_renta_obra en useReporteSemanal:", err.message);
          return;
        }
        setPresupuestosRenta(data || []);
      });
    return () => { activo = false; };
  }, []);

  const presupuestoRentaMap = useMemo(() => {
    const map = {};
    presupuestosRenta.forEach((p) => {
      map[p.id_obra] = {
        consumido: Number(p.monto_consumido || 0),
        presupuestado: p.monto_presupuestado != null ? Number(p.monto_presupuestado) : null,
      };
    });
    return map;
  }, [presupuestosRenta]);

  const rango = useMemo(() => calcularRango(fechaRef), [fechaRef]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { inicioAnterior, finSeleccionado } = calcularRango(fechaRef);
      const programadaInicio = formatFechaLocal(inicioAnterior);
      const programadaFin = formatFechaLocal(finSeleccionado);

      const { data, error: err } = await supabase
        .from("vales")
        .select(`
          id_vale, folio, tipo_vale, estado, fecha_creacion, fecha_completado, fecha_programada, id_obra, id_empresa, es_pipa_agua,
          obras:id_obra (id_obra, obra, cc),
          empresas:id_empresa (id_empresa, empresa),
          vehiculos:id_vehiculo (id_vehiculo, placas, capacidad_m3),
          tickets_material (id_ticket, fecha_impresion),
          vale_material_detalles (
            id_detalle_material, volumen_real_m3, cantidad_pedida_m3, costo_total, precio_m3, id_material,
            id_sindicato, es_planta_asfaltos, distancia_km,
            sindicatos:id_sindicato (id_sindicato, sindicato),
            material:id_material (id_material, material, tipo_de_material:id_tipo_de_material (id_tipo_de_material, tipo_de_material)),
            vale_material_viajes (
              id_viaje, hora_registro, volumen_m3, precio_m3, costo_viaje,
              precio_m3_override, costo_viaje_override, distancia_km_override
            )
          ),
          vale_renta_detalle (
            total_horas, total_dias, numero_viajes, costo_total, id_material,
            material:id_material (id_material, material),
            id_categoria_planeada,
            categoria_planeada:id_categoria_planeada (id_categoria_material_renta, categoria),
            vale_renta_viajes (id_viaje, hora_registro)
          )
        `)
        .or(
          `and(fecha_creacion.gte.${inicioAnterior.toISOString()},fecha_creacion.lt.${finSeleccionado.toISOString()}),` +
            `and(fecha_programada.gte.${programadaInicio},fecha_programada.lt.${programadaFin}),` +
            `and(fecha_completado.gte.${inicioAnterior.toISOString()},fecha_completado.lt.${finSeleccionado.toISOString()})`
        )
        .limit(10000);

      if (err) throw err;
      setRawVales(data || []);
    } catch (err) {
      console.error("Error en useReporteSemanal.fetchData:", err);
      setError(err.message || "Error al cargar el reporte semanal");
    } finally {
      setLoading(false);
    }
  }, [fechaRef]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const valesSemana = useMemo(() => {
    const { inicioSeleccionado, finSeleccionado } = rango;
    return rawVales.filter((v) => {
      if (!esValeReal(v) || !v.fecha_creacion) return false;
      const t = obtenerFechaEfectiva(v).getTime();
      return t >= inicioSeleccionado.getTime() && t < finSeleccionado.getTime();
    });
  }, [rawVales, rango]);

  const valesSemanaAnterior = useMemo(() => {
    const { inicioAnterior, inicioSeleccionado } = rango;
    return rawVales.filter((v) => {
      if (!esValeReal(v) || !v.fecha_creacion) return false;
      const t = obtenerFechaEfectiva(v).getTime();
      return t >= inicioAnterior.getTime() && t < inicioSeleccionado.getTime();
    });
  }, [rawVales, rango]);

  const valesSemanaPipas = useMemo(() => {
    const { inicioSeleccionado, finSeleccionado } = rango;
    return rawVales.filter((v) => {
      if (!esValeReal(v) || !v.es_pipa_agua || !v.fecha_creacion) return false;
      const t = new Date(v.fecha_creacion).getTime();
      return t >= inicioSeleccionado.getTime() && t < finSeleccionado.getTime();
    });
  }, [rawVales, rango]);

  const kpis = useMemo(() => calcularKpis(valesSemana), [valesSemana]);
  const kpisAnterior = useMemo(() => calcularKpis(valesSemanaAnterior), [valesSemanaAnterior]);
  const comparativa = useMemo(() => calcularComparativa(kpis, kpisAnterior), [kpis, kpisAnterior]);
  const materialesSemana = useMemo(() => calcularMaterialesSemana(valesSemana), [valesSemana]);
  const rentaPorEquipo = useMemo(() => calcularRentaPorEquipo(valesSemana), [valesSemana]);
  const pipasDeLaSemana = useMemo(() => calcularPipasDeLaSemana(valesSemanaPipas), [valesSemanaPipas]);
  const flotaPropia = useMemo(
    () => calcularFlotaPropia(valesSemana, preciosMaterialTodos),
    [valesSemana, preciosMaterialTodos]
  );
  const indicadoresSemana = useMemo(
    () => calcularIndicadoresSemana(valesSemana, preciosMaterialTodos),
    [valesSemana, preciosMaterialTodos]
  );
  const desgloseMaterialSinAcumulado = useMemo(() => calcularDesgloseMaterial(valesSemana), [valesSemana]);
  const desgloseMaterial = useMemo(
    () =>
      desgloseMaterialSinAcumulado.map((o) => ({
        ...o,
        materiales: o.materiales.map((m) => {
          const registro = m.idMaterial != null ? acumuladoMaterialMap[`${o.obraId}::${m.idMaterial}`] : null;
          const presupuestado = registro?.presupuestado;
          const pctPresupuestoUsado =
            presupuestado != null && presupuestado > 0
              ? Math.round((registro.consumido / presupuestado) * 100)
              : null;
          return { ...m, acumuladoM3: registro?.consumido ?? null, pctPresupuestoUsado };
        }),
      })),
    [desgloseMaterialSinAcumulado, acumuladoMaterialMap]
  );
  const desgloseRentaSinPresupuesto = useMemo(() => calcularDesgloseRenta(valesSemana), [valesSemana]);
  const desgloseRenta = useMemo(
    () =>
      desgloseRentaSinPresupuesto.map((o) => {
        const registro = presupuestoRentaMap[o.obraId];
        const presupuestado = registro?.presupuestado;
        const pctPresupuestoUsado =
          presupuestado != null && presupuestado > 0
            ? Math.round((registro.consumido / presupuestado) * 100)
            : null;
        return { ...o, pctPresupuestoUsado };
      }),
    [desgloseRentaSinPresupuesto, presupuestoRentaMap]
  );
  const eficiencia = useMemo(
    () => calcularEficiencia(valesSemana, rango.semana.fechaInicio),
    [valesSemana, rango.semana.fechaInicio]
  );

  const resumenPorObra = useMemo(() => {
    const map = {};
    const clave = (o) => `${o.obra}__${o.cc}`;
    desgloseMaterial.forEach((o) => {
      map[clave(o)] ??= { obra: o.obra, cc: o.cc, empresa: o.empresa, importeMaterial: 0, importeRenta: 0, m3Total: 0, horasRenta: 0 };
      map[clave(o)].importeMaterial += o.subtotal.importe;
      map[clave(o)].m3Total += o.subtotal.m3Total;
    });
    desgloseRenta.forEach((o) => {
      map[clave(o)] ??= { obra: o.obra, cc: o.cc, empresa: o.empresa, importeMaterial: 0, importeRenta: 0, m3Total: 0, horasRenta: 0 };
      map[clave(o)].importeRenta += o.importe;
      map[clave(o)].horasRenta += o.horas;
    });
    return Object.values(map)
      .map((o) => ({ ...o, importeTotal: o.importeMaterial + o.importeRenta }))
      .sort((a, b) => b.importeTotal - a.importeTotal);
  }, [desgloseMaterial, desgloseRenta]);

  return {
    semana: rango.semana,
    fechaRef,
    setFechaRef,
    loading,
    error,
    kpis,
    comparativa,
    materialesSemana,
    rentaPorEquipo,
    pipasDeLaSemana,
    flotaPropia,
    indicadoresSemana,
    desgloseMaterial,
    desgloseRenta,
    resumenPorObra,
    eficiencia,
    refresh: fetchData,
  };
};
