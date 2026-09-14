/**
 * src/hooks/useReporteDiario.js
 *
 * Reporte operativo de un día específico: KPIs, comparativa vs. día anterior,
 * materiales del día (materialesDelDia, m³/importe por tipo de material,
 * compañía completa) y renta del día (rentaPorEquipo, importe/viajes por
 * tipo de equipo, con clasificación de eficiencia por viajes/día — excluye
 * pipas de agua, ver pipasDelDia) para las gráficas del reporte, desglose
 * por material y por renta agrupado por obra (con su CC), cada material del
 * desglose trae también `acumuladoM3` — el m3_consumidos histórico de
 * presupuesto_material_obra para ese par obra/material — y `pctPresupuestoUsado`
 * (m3_consumidos ÷ m3_presupuestados), ambos null si no hay presupuesto
 * configurado; cada material del desglose también trae `viajesPlanta`/
 * `m3Planta` — cuánto de ese material (de cualquier sindicato, no solo
 * GEEM) se registró con es_planta_asfaltos, para la nota "→ Planta de
 * Asfaltos" en el chip; cada obra del desglose de renta trae su propio
 * `pctPresupuestoUsado` contra presupuesto_renta_obra (monto_consumido ÷
 * monto_presupuestado — a diferencia del de material, es un monto único por
 * obra, sin desglose por tipo de equipo) — ranking por obra (resumenPorObra, combina
 * material+renta por importe) para la vista secundaria "Obras del Día",
 * resumen de flota propia (flotaPropia: viajes GEEM, viajes a planta de
 * asfaltos con su desglose de material, y ahorro estimado a tarifa de
 * sindicato CTM), resumen de pipas de agua (pipasDelDia: viajes y capacidad
 * aproximada, separado de renta de equipo porque no consume su presupuesto
 * ni se mide igual) y métricas de eficiencia (tiempos entre viajes, hora
 * pico, distribución horaria por material, rendimiento por vehículo).
 *
 * El día de un vale es su fecha efectiva (obtenerFechaEfectiva):
 * fecha_completado si ya se cerró (fecha operacional real, sin importar
 * cuándo se planeó o se creó el registro — mismo criterio que
 * appAcarreos/useEstadisticasMaterialTendencia.js), si no fecha_programada
 * cuando fue planeado con anticipación (en_proceso, aún sin cerrar), y
 * fecha_creacion como último recurso. Así el reporte del día seleccionado
 * incluye tanto los vales planeados para ese día como los que se
 * completaron ese día aunque se hayan planeado para otro.
 *
 * EXCEPCIÓN — pipas de agua (pipasDelDia, ver valesDiaPipas): se agrupan por
 * fecha_creacion, no por obtenerFechaEfectiva. Una pipa puede quedar
 * "en_proceso" varios días (no hay hora por viaje capturada en la práctica,
 * numero_viajes es un total acumulado sin desglose por día); agruparla por
 * fecha_completado le suma TODOS sus viajes acumulados al día en que por fin
 * se cierra, inflando ese día con trabajo de días anteriores.
 *
 * Dependencias: supabase, utils/cotizarFlete, SINDICATO_TARIFAS_REPORTE de
 * hooks/useEstadisticasGlobales
 * Usado en: ReporteDiario.jsx
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../config/supabase";
import { cotizarFleteM3 } from "../utils/cotizarFlete";
import { SINDICATO_TARIFAS_REPORTE } from "./useEstadisticasGlobales";
import { materialLabelDetalle } from "../utils/rentaMaterial";

// ── Helpers de fecha ──────────────────────────────────────────────────
export const formatFechaLocal = (date) => {
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

// Fecha efectiva de un vale para el reporte, en orden de prioridad:
// 1. fecha_completado — la fecha operacional real (appAcarreos/schema.sql:
//    "fecha_creacion: NO usar para estadísticas — fecha_completado: USAR
//    para estadísticas"). Se graba cuando el checador cierra el vale y pasa
//    a estado 'emitido' (useViajesMaterial.js / ValeDetalleRenta.js), sin
//    importar qué día se planeó o se creó el registro.
// 2. fecha_programada — el vale fue planeado con anticipación (en_proceso)
//    pero aún no se completa: cuenta en el día para el que se planeó.
// 3. fecha_creacion — fallback para el resto (vale creado y completado el
//    mismo día, o sin ninguno de los dos campos anteriores).
const obtenerFechaEfectiva = (vale) => {
  if (vale.fecha_completado) return new Date(vale.fecha_completado);
  if (vale.fecha_programada) return new Date(`${vale.fecha_programada}T12:00:00`);
  return new Date(vale.fecha_creacion);
};

// Excluye obra/empresa de prueba (ID 14 / ID 4), mismo criterio que useDashboardAnalytics
const esValeReal = (v) => Number(v.id_obra) !== 14 && Number(v.id_empresa) !== 4;

const round2 = (n) => Math.round(n * 100) / 100;

const coincideSindicato = (nombre, buscado) => (nombre || "").toUpperCase().includes(buscado);

// Flota propia (GRUPO GEEM): mismo criterio que useEstadisticasGlobales.js —
// sus viajes sí cuentan en m³ y en el conteo de viajes (el material se movió
// de verdad), pero no en importe (no hay factura real, es transporte con
// camiones propios).
const SINDICATO_FLOTA_PROPIA = "GRUPO GEEM";
const esFlotaPropia = (sindicato) => coincideSindicato(sindicato, SINDICATO_FLOTA_PROPIA);

// ── Registros de material de un vale (compartido por KPIs, materiales del
// día, desglose por obra y flota propia) ─────────────────────────────────
// Un "registro" = una unidad de actividad real: un viaje (Tipo 1), un grupo
// de tickets físicos (Tipo 3, no se puede repartir m³/importe entre
// tickets individuales) o el detalle completo (Tipo 2, sin filas propias en
// vale_material_viajes). Centralizar esto evita que la exclusión de importe
// de flota propia (o el resto de reglas) se tenga que repetir y mantener
// igual en varios sitios.
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
      // Tipo 3 (Tepetate/Corte): volumen medido, viajes = tickets físicos
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
        // Tipo 1 (Pétreos): volumen y costo por viaje individual
        viajes.forEach((viaje) => {
          const vol = Number(viaje.volumen_m3 || 0);
          registros.push({
            material,
            idMaterial,
            tipoId,
            m3: vol,
            // Prioridad de costo por viaje: override directo → precio_m3 override × vol → precio_m3 del detalle × vol
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
          });
        });
      } else {
        // Tipo 2 (Base Asfáltica): el volumen se captura directo en el
        // detalle, sin filas individuales en vale_material_viajes
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

// ── Volumen/costo/actividad de un vale (compartido entre KPIs y desglose) ──
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
      // Nota de viajes a planta de asfaltos — es_planta_asfaltos es un sello
      // del detalle, independiente de si es flota propia (GEEM) o no; aquí
      // se marca para cualquier material/obra, a diferencia de flotaPropia
      // (calcularFlotaPropia) que solo lo desglosa para GEEM.
      if (r.esPlanta) {
        s.m3Planta += r.m3;
        s.viajesPlanta += r.viajes;
      }
    });
  });

  return Object.values(obraMap)
    .map(({ obraId, obra, cc, empresa, matMap }) => {
      const materiales = Object.values(matMap)
        // Descarta materiales sin actividad real ese día (detalle del vale
        // existe pero no se registró ningún viaje/ticket con volumen o costo)
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

// ── Materiales del día (compañía completa, sin agrupar por obra) ────────
// Responde directamente "cuánto moví de grava hoy": un solo mapa por
// nombre de material, para la gráfica principal del reporte.
const calcularMaterialesDelDia = (vales) => {
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

// ── Flota propia (GRUPO GEEM) del día ─────────────────────────────────────
// Sus viajes no traen factura (por eso se excluyen del importe en todo lo
// demás), pero siguen siendo actividad real de la operación. Además del
// conteo de viajes, revalúa cada uno a la tarifa real de sindicato CTM para
// el mismo material+distancia (mismo criterio que
// useIndicadoresEficiencia.calcularFleteEvitadoFlotaPropia): la tarifa
// técnica de $1/km que trae el vale de GEEM no es dinero real, el ahorro es
// el valor completo a tarifa de sindicato. También separa qué se llevó a
// planta de asfaltos y cuánto.
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

// ── Pipas de agua del día ──────────────────────────────────────────────
// `es_pipa_agua` es el sello de cabecera del vale — las pipas se cobran
// por hora/día igual que la renta de equipo pero no consumen su
// presupuesto (mismo criterio que tablaObraPipasAcumulado en
// useEstadisticasGlobales.js), así que viven aparte de rentaPorEquipo/
// desgloseRenta. No hay m³ medido: la capacidad aproximada sale de
// capacidad_m3 del vehículo (mismo criterio que renta de equipo).
// Recibe `valesDiaPipas` (ya filtrado por es_pipa_agua + fecha_creacion —
// ver comentario ahí sobre por qué es fecha_creacion y no fecha_completado).
const calcularPipasDelDia = (vales) => {
  let vales_ = 0;
  let totalViajes = 0;
  let capacidadSuma = 0;
  let capacidadCount = 0;

  vales.forEach((vale) => {
    const rentaDetalles = vale.vale_renta_detalle || [];
    if (rentaDetalles.length === 0) return;

    vales_ += 1;
    rentaDetalles.forEach((det) => {
      // numero_viajes es el conteo real: el checador lo declara al completar
      // el vale (no hay hora por viaje capturada para pipas en la práctica,
      // así que vale_renta_viajes casi siempre viene vacío). Fallback a 0
      // (no a numero_viajes) solo cuando ya hay viajes reales registrados en
      // vale_renta_viajes, para no contarlos dos veces.
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

// ── Renta del día por tipo de equipo (compañía completa, sin pipas) ──────
// Clasifica cada tipo de equipo por su ritmo del día (viajes ÷ días) en el
// mismo espectro de eficiencia que useIndicadoresEficiencia.calcularRentaNoAprovechada
// (constante de negocio confirmada con Bruno: meta_viajes_dia_renta = 7).
// Las claves internas se conservan por compatibilidad (desperdiciado/ideal),
// solo cambian las etiquetas mostradas.
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
    .map((o) => ({ ...o, horas: round2(o.horas), dias: round2(o.dias), importe: round2(o.importe) }))
    .sort((a, b) => b.importe - a.importe);
};

// ── Eficiencia operativa ─────────────────────────────────────────────────
const calcularEficiencia = (vales) => {
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
          tipoId,
        });
      });
      // Tipo 2 (Base Asfáltica): 1 vale = 1 viaje, sin filas en
      // vale_material_viajes — sin este caso, sus viajes nunca aparecían en
      // la distribución horaria. Se usa el timestamp del propio vale (fecha
      // operativa = fecha_completado, con fallback a fecha_creacion).
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
            tipoId,
          });
        }
      }
    });
  });

  // Distribución de viajes por hora del día (hora local), desglosada por
  // material para que la gráfica se pueda colorear/leyendar por tipo.
  const materialesDistintos = [...new Set(viajesConHora.map((x) => x.material))].sort();
  const horasMap = {};
  for (let h = 0; h < 24; h++) {
    horasMap[h] = { hora: h, label: `${String(h).padStart(2, "0")}:00` };
    materialesDistintos.forEach((m) => { horasMap[h][m] = 0; });
  }
  viajesConHora.forEach((x) => {
    const h = x.hora.getHours();
    horasMap[h][x.material] = (horasMap[h][x.material] || 0) + 1;
  });
  const distribucionHoraria = Object.values(horasMap);
  const horaPico = distribucionHoraria.reduce(
    (max, row) => {
      const total = materialesDistintos.reduce((s, m) => s + row[m], 0);
      return total > max.viajes ? { viajes: total, label: row.label } : max;
    },
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

  // "Promedio entre viajes" solo tiene sentido para material con viajes
  // seguidos del mismo camión (Tipo 1/3): el asfáltico (Tipo 2) es un evento
  // único por vale, sin secuencia que medir, y mezclarlo metía huecos de
  // varias horas al mismo promedio que los huecos de minutos entre viajes
  // reales (ver misma corrección en useReporteSemanal.js). `porVehiculo`
  // arriba sigue incluyendo todo (se usa para vehiculoTop por m3).
  const horasPorVehiculoSinAsfaltico = {};
  viajesConHora.forEach((x) => {
    if (x.idVehiculo == null || x.tipoId === 2) return;
    if (!horasPorVehiculoSinAsfaltico[x.idVehiculo]) horasPorVehiculoSinAsfaltico[x.idVehiculo] = [];
    horasPorVehiculoSinAsfaltico[x.idVehiculo].push(x.hora.getTime());
  });

  let sumaDeltasMs = 0;
  let countDeltas = 0;
  Object.values(horasPorVehiculoSinAsfaltico).forEach((horas) => {
    const horasOrdenadas = [...horas].sort((a, b) => a - b);
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

  const porObraM3 = {};
  viajesConHora.forEach((x) => { porObraM3[x.obra] = (porObraM3[x.obra] || 0) + x.m3; });
  const obraTopEntry = Object.entries(porObraM3).sort((a, b) => b[1] - a[1])[0];
  const obraTop = obraTopEntry ? { obra: obraTopEntry[0], m3Total: round2(obraTopEntry[1]) } : null;

  const totalM3Material = viajesConHora.reduce((acc, x) => acc + x.m3, 0);
  const m3PromedioPorViaje = viajesConHora.length > 0 ? round2(totalM3Material / viajesConHora.length) : 0;

  return {
    distribucionHoraria,
    materialesDistintos,
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

  // Tarifas de sindicato (todas, no solo CTM) — tabla de referencia chica,
  // independiente de la fecha seleccionada, se pide una sola vez.
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
          console.error("Error al cargar precios_material en useReporteDiario:", err.message);
          return;
        }
        setPreciosMaterialTodos(data || []);
      });
    return () => { activo = false; };
  }, []);

  // Acumulado histórico de presupuesto por obra/material (m3_consumidos ya es
  // el corte acumulado a la fecha, actualizado por trigger en BD — no depende
  // del día seleccionado), para mostrar contexto junto al material del día en
  // "Obras del Día". Igual que preciosMaterialTodos, se pide una sola vez.
  const [presupuestosMaterial, setPresupuestosMaterial] = useState([]);

  useEffect(() => {
    let activo = true;
    supabase
      .from("presupuesto_material_obra")
      .select("id_obra, id_material, m3_consumidos, m3_presupuestados")
      .then(({ data, error: err }) => {
        if (!activo) return;
        if (err) {
          console.error("Error al cargar presupuesto_material_obra en useReporteDiario:", err.message);
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

  // Presupuesto de renta por obra (a diferencia del de material, no se
  // desglosa por equipo — presupuesto_renta_obra es un monto único por obra,
  // mismo criterio que tablaObraRentaAcumulado en useEstadisticasGlobales.js).
  const [presupuestosRenta, setPresupuestosRenta] = useState([]);

  useEffect(() => {
    let activo = true;
    supabase
      .from("presupuesto_renta_obra")
      .select("id_obra, monto_consumido, monto_presupuestado")
      .then(({ data, error: err }) => {
        if (!activo) return;
        if (err) {
          console.error("Error al cargar presupuesto_renta_obra en useReporteDiario:", err.message);
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

  const rango = useMemo(() => calcularRango(fecha), [fecha]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { inicioAnterior, finSeleccionado } = calcularRango(fecha);
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
        // Trae vales por fecha_creacion (caso normal) O por fecha_programada
        // (vale planeado con anticipación, aún no completado) O por
        // fecha_completado (vale planeado para otro día pero cerrado en
        // este rango — ver obtenerFechaEfectiva, fecha_completado manda).
        // Sin las tres, un vale planeado el sábado y completado hoy no
        // tendría ningún campo de fecha en la ventana de "hoy" y se
        // perdería del reporte por completo.
        .or(
          `and(fecha_creacion.gte.${inicioAnterior.toISOString()},fecha_creacion.lt.${finSeleccionado.toISOString()}),` +
            `and(fecha_programada.gte.${programadaInicio},fecha_programada.lt.${programadaFin}),` +
            `and(fecha_completado.gte.${inicioAnterior.toISOString()},fecha_completado.lt.${finSeleccionado.toISOString()})`
        )
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
      const t = obtenerFechaEfectiva(v).getTime();
      return t >= inicioSeleccionado.getTime() && t < finSeleccionado.getTime();
    });
  }, [rawVales, rango]);

  const valesDiaAnterior = useMemo(() => {
    const { inicioAnterior, inicioSeleccionado } = rango;
    return rawVales.filter((v) => {
      if (!esValeReal(v) || !v.fecha_creacion) return false;
      const t = obtenerFechaEfectiva(v).getTime();
      return t >= inicioAnterior.getTime() && t < inicioSeleccionado.getTime();
    });
  }, [rawVales, rango]);

  // Pipas: por fecha_creacion, NO por obtenerFechaEfectiva (fecha_completado).
  // Una pipa se abre cuando el camión sale a repartir agua y puede quedar
  // "en_proceso" varios días antes de cerrarse (no hay vale_renta_viajes con
  // hora por viaje para pipas en la práctica — numero_viajes es un total
  // acumulado sin desglose por día). Si se agrupara por fecha_completado, el
  // día en que por fin se cierra una pipa de hace 3 días le suma TODOS sus
  // viajes acumulados al reporte de HOY, inflando el total. Agrupar por
  // fecha_creacion es la única atribución que no duplica ni desplaza viajes
  // entre días.
  const valesDiaPipas = useMemo(() => {
    const { inicioSeleccionado, finSeleccionado } = rango;
    return rawVales.filter((v) => {
      if (!esValeReal(v) || !v.es_pipa_agua || !v.fecha_creacion) return false;
      const t = new Date(v.fecha_creacion).getTime();
      return t >= inicioSeleccionado.getTime() && t < finSeleccionado.getTime();
    });
  }, [rawVales, rango]);

  const kpis = useMemo(() => calcularKpis(valesDia), [valesDia]);
  const kpisAnterior = useMemo(() => calcularKpis(valesDiaAnterior), [valesDiaAnterior]);
  const comparativa = useMemo(() => calcularComparativa(kpis, kpisAnterior), [kpis, kpisAnterior]);
  const materialesDelDia = useMemo(() => calcularMaterialesDelDia(valesDia), [valesDia]);
  const rentaPorEquipo = useMemo(() => calcularRentaPorEquipo(valesDia), [valesDia]);
  const pipasDelDia = useMemo(() => calcularPipasDelDia(valesDiaPipas), [valesDiaPipas]);
  const flotaPropia = useMemo(
    () => calcularFlotaPropia(valesDia, preciosMaterialTodos),
    [valesDia, preciosMaterialTodos]
  );
  const desgloseMaterialSinAcumulado = useMemo(() => calcularDesgloseMaterial(valesDia), [valesDia]);
  // Cruza cada material del desglose con su acumulado histórico de
  // presupuesto (obra + material) — contexto de "cuánto llevamos de esto en
  // la obra", no solo lo del día. También calcula qué % del presupuesto ya
  // se surtió (redondeado a entero, para caber en el chip sin ocupar más
  // espacio). Ambos se omiten cuando no hay presupuesto configurado para ese
  // par obra/material, o cuando m3_presupuestados es 0 (evita división entre
  // cero).
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
  const desgloseRentaSinPresupuesto = useMemo(() => calcularDesgloseRenta(valesDia), [valesDia]);
  // Mismo cruce que desgloseMaterial, pero contra presupuesto_renta_obra
  // (monto en $, por obra completa — no hay desglose por tipo de equipo).
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
  const eficiencia = useMemo(() => calcularEficiencia(valesDia), [valesDia]);

  // Ranking por obra para la vista visual (reemplaza las tablas de desglose):
  // combina material + renta con el importe como denominador común, ya que m³
  // y horas no son comparables entre sí. m3Total/horasRenta se conservan como
  // dato de apoyo (caption) bajo cada barra, no como criterio de orden.
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
    fecha,
    setFecha,
    loading,
    error,
    kpis,
    comparativa,
    materialesDelDia,
    rentaPorEquipo,
    pipasDelDia,
    flotaPropia,
    desgloseMaterial,
    desgloseRenta,
    resumenPorObra,
    eficiencia,
    refresh: fetchData,
  };
};
