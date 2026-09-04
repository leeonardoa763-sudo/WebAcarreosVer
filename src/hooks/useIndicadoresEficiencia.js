/**
 * src/hooks/useIndicadoresEficiencia.js
 *
 * Los 3 indicadores de eficiencia y oportunidad de Estadísticas Globales
 * (índice de posición, flete evitado por flota propia, jornada de renta no
 * aprovechada) que antes solo existían en un Excel manual (`analisis-kpis/`)
 * y nunca llegaron al sistema.
 *
 * `valesReporteFiltrados` se recibe ya calculado (misma fuente que el resto
 * del reporte PDF, useEstadisticasGlobales) — no se vuelve a pedir vales.
 * Lo que sí es propio de este hook, con su propia carga perezosa
 * (garantizarIndicadoresEficiencia): precios_material completo (todas las
 * tarifas, no solo CTM).
 *
 * Constante de negocio confirmada con Bruno (2026-09-03): meta_viajes_dia_renta=7.
 *
 * Dependencias: config/supabase, utils/cotizarFlete,
 * SINDICATO_TARIFAS_REPORTE de hooks/useEstadisticasGlobales
 * Usado en: pages/EstadisticasGlobales.jsx (también alimenta el reporte PDF,
 * ver utils/exportarReporteEstadisticas.js — indicadoresEficienciaCargados
 * gatea cuándo esos 5 arreglos ya reflejan precios_material)
 */

import { useState, useCallback, useMemo } from "react";
import { supabase } from "../config/supabase";
import { cotizarFleteM3 } from "../utils/cotizarFlete";
import { SINDICATO_TARIFAS_REPORTE, matchesFiltro } from "./useEstadisticasGlobales";

// Flota propia: tarifa intencional de $1/km (esos vales no se cobran a precio
// de mercado). Ver memoria de negocio — GRUPO GEEM, no CATEM/CITRACON/PRUEBAS.
const SINDICATO_FLOTA_PROPIA = "GRUPO GEEM";

const META_VIAJES_DIA_RENTA = 7;
const MESES_MINIMOS_TENDENCIA = 3;
const UMBRAL_BANCO_DOMINANTE_PCT = 70;

const esSindicato = (nombre, buscado) => (nombre || "").toUpperCase().includes(buscado);

// Día calendario en horario de México (para agrupar viajes por jornada real).
const diaMexico = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }) : null;

// ── Índice de posición de la obra ───────────────────────────────────
// Σ(m³ × distancia_km) ÷ Σm³ por obra. Misma resolución banco/distancia por
// viaje que el resto del reporte (viaje.*_override ?? detalle.*).
//
// Además del número agregado, arma tres cosas para que la tabla explique el
// número en vez de solo mostrarlo:
// - `bancos`: cuánto pesa cada banco en el índice (no solo en el volumen) —
//   un banco puede traer poco m³ y aun así dominar el índice si está lejos.
//   `dominante` marca al banco que por sí solo explica >70% del índice.
// - `materiales`: precio de flete promedio ponderado por m³ (no un promedio
//   simple de tarifas) — un banco con más volumen pesa más que uno caro con
//   pocos m³. Es precio de FLETE (lo que vive en el sistema), no precio de
//   material — ese se paga aparte, por tonelada, fuera del sistema.
// - `tendenciaMensual`: solo con ≥3 meses de historia; si no, se omite.
const calcularIndicePosicionObra = (valesMaterial) => {
  const obraMap = {};

  valesMaterial.forEach((vale) => {
    const obraId = vale.id_obra;
    if (!obraId) return;

    (vale.vale_material_detalles || []).forEach((det) => {
      const materialNombre = det.material?.material || "Sin clasificar";
      const bancoDetalle = det.bancos?.banco || "Sin banco";
      const viajes = det.vale_material_viajes || [];
      const registros = viajes.length > 0
        ? viajes.map((v) => ({
            m3: Number(v.volumen_m3 ?? 0),
            distanciaKm: Number(v.distancia_km_override ?? det.distancia_km ?? 0),
            banco: v.bancos_override?.banco ?? bancoDetalle,
            precioM3: Number(v.precio_m3_override ?? v.precio_m3 ?? det.precio_m3 ?? 0),
            mesKey: v.hora_registro ? v.hora_registro.substring(0, 7) : null,
          }))
        : [{
            m3: Number(det.volumen_real_m3 ?? 0),
            distanciaKm: Number(det.distancia_km ?? 0),
            banco: bancoDetalle,
            precioM3: Number(det.precio_m3 ?? 0),
            mesKey: vale.fecha_creacion ? vale.fecha_creacion.substring(0, 7) : null,
          }];

      if (!obraMap[obraId]) {
        obraMap[obraId] = {
          obra: vale.obras?.obra || "Sin obra",
          cc: vale.obras?.cc ?? null,
          empresa: vale.obras?.empresas?.empresa || null,
          sumaM3PorKm: 0,
          m3Total: 0,
          bancos: {},
          materiales: {},
          meses: {},
        };
      }
      const o = obraMap[obraId];

      registros.forEach(({ m3, distanciaKm, banco, precioM3, mesKey }) => {
        if (m3 <= 0) return;
        o.sumaM3PorKm += m3 * distanciaKm;
        o.m3Total += m3;

        if (distanciaKm > 0) {
          if (!o.bancos[banco]) o.bancos[banco] = { banco, m3: 0, sumaM3PorKm: 0, viajes: 0 };
          o.bancos[banco].m3 += m3;
          o.bancos[banco].sumaM3PorKm += m3 * distanciaKm;
          o.bancos[banco].viajes += 1;

          if (mesKey) {
            if (!o.meses[mesKey]) o.meses[mesKey] = { sumaM3PorKm: 0, m3: 0 };
            o.meses[mesKey].sumaM3PorKm += m3 * distanciaKm;
            o.meses[mesKey].m3 += m3;
          }
        }

        if (precioM3 > 0) {
          if (!o.materiales[materialNombre]) {
            o.materiales[materialNombre] = {
              material: materialNombre, m3: 0, sumaCosto: 0,
              precioMin: precioM3, precioMax: precioM3,
            };
          }
          const mat = o.materiales[materialNombre];
          mat.m3 += m3;
          mat.sumaCosto += m3 * precioM3;
          mat.precioMin = Math.min(mat.precioMin, precioM3);
          mat.precioMax = Math.max(mat.precioMax, precioM3);
        }
      });
    });
  });

  const conIndice = Object.values(obraMap)
    .map((o) => {
      if (o.m3Total <= 0) return null;
      const indicePosicion = o.sumaM3PorKm / o.m3Total;

      const bancos = Object.values(o.bancos)
        .map((b) => ({
          banco: b.banco,
          m3: b.m3,
          pctVol: (b.m3 / o.m3Total) * 100,
          distanciaKm: b.m3 > 0 ? b.sumaM3PorKm / b.m3 : 0,
          viajes: b.viajes,
          aportaIndice: o.sumaM3PorKm > 0 ? (b.sumaM3PorKm / o.sumaM3PorKm) * 100 : 0,
        }))
        .sort((a, b) => b.m3 - a.m3)
        .map((b) => ({ ...b, dominante: b.aportaIndice >= UMBRAL_BANCO_DOMINANTE_PCT }));

      const distancias = bancos.map((b) => b.distanciaKm).filter((d) => d > 0);
      const distanciaMinKm = distancias.length > 0 ? Math.min(...distancias) : null;
      const distanciaMaxKm = distancias.length > 0 ? Math.max(...distancias) : null;
      const bancoDominante = bancos.find((b) => b.dominante) || null;

      const materiales = Object.values(o.materiales)
        .map((m) => ({
          material: m.material,
          m3: m.m3,
          precioFleteM3: m.m3 > 0 ? m.sumaCosto / m.m3 : null,
          precioMin: m.precioMin,
          precioMax: m.precioMax,
        }))
        .sort((a, b) => b.m3 - a.m3);

      const mesesOrdenados = Object.keys(o.meses).sort();
      const tendenciaMensual = mesesOrdenados.length >= MESES_MINIMOS_TENDENCIA
        ? mesesOrdenados
            .map((mes) => ({
              mes,
              indice: o.meses[mes].m3 > 0 ? o.meses[mes].sumaM3PorKm / o.meses[mes].m3 : null,
            }))
            .filter((p) => p.indice != null)
        : null;

      return {
        obra: o.obra, cc: o.cc, empresa: o.empresa,
        m3Total: o.m3Total, indicePosicion,
        distanciaMinKm, distanciaMaxKm, bancoDominante,
        bancos, materiales, tendenciaMensual,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.indicePosicion - a.indicePosicion);

  // Nivel relativo a las demás obras del filtro actual (no hay un corte fijo
  // en km porque la distancia "normal" varía demasiado por región/obra):
  // se dividen en tercios por posición — el tercio más alejado es "alto", el
  // más cercano "bajo". Con 1-2 obras no hay suficiente base para tercios.
  const n = conIndice.length;
  return conIndice.map((o, idx) => ({
    ...o,
    nivel: n <= 2 ? null : idx < n / 3 ? "alto" : idx < (2 * n) / 3 ? "medio" : "bajo",
  }));
};

// ── Flete evitado por flota propia (GRUPO GEEM) ─────────────────────
// Revalúa los viajes de la flota propia a la tarifa real de CTM para el
// mismo material+distancia. La tarifa de $1/km que trae el vale de GEEM es
// solo un valor técnico para poder cargarlo en la app — no se resta nada
// contra ella: el "ahorro" es el valor completo a tarifa de sindicato.
// Agrupado por obra, con el desglose banco/material y viajes a Planta de
// Asfaltos aparte (varios camiones de GEEM van fijos ahí).
const calcularFleteEvitadoFlotaPropia = (valesMaterial, preciosMaterialTodos) => {
  const tarifaCTM = (tipoMaterialId) =>
    preciosMaterialTodos.find(
      (t) => t.id_tipo_de_material === tipoMaterialId && esSindicato(t.sindicatos?.sindicato, SINDICATO_TARIFAS_REPORTE)
    ) || null;

  const obraMap = {};

  valesMaterial.forEach((vale) => {
    const obraId = vale.id_obra;
    if (!obraId) return;

    (vale.vale_material_detalles || []).forEach((det) => {
      const esGeem = esSindicato(det.sindicatos?.sindicato, SINDICATO_FLOTA_PROPIA);
      const materialNombre = det.material?.material || "Sin clasificar";
      const tipoMaterialId = det.material?.tipo_de_material?.id_tipo_de_material ?? null;
      const bancoDetalle = det.bancos?.banco || "Sin banco";
      const esPlanta = det.es_planta_asfaltos ?? false;
      const viajes = det.vale_material_viajes || [];
      const registros = viajes.length > 0
        ? viajes.map((v) => ({
            m3: Number(v.volumen_m3 ?? 0),
            distanciaKm: Number(v.distancia_km_override ?? det.distancia_km ?? 0),
            banco: v.bancos_override?.banco ?? bancoDetalle,
            mesKey: v.hora_registro ? v.hora_registro.substring(0, 7) : null,
          }))
        : [{
            m3: Number(det.volumen_real_m3 ?? 0),
            distanciaKm: Number(det.distancia_km ?? 0),
            banco: bancoDetalle,
            mesKey: vale.fecha_creacion ? vale.fecha_creacion.substring(0, 7) : null,
          }];

      if (!obraMap[obraId]) {
        obraMap[obraId] = {
          obra: vale.obras?.obra || "Sin obra",
          cc: vale.obras?.cc ?? null,
          empresa: vale.obras?.empresas?.empresa || null,
          m3TotalObra: 0,
          m3Geem: 0,
          viajesGeem: 0,
          viajesGeemPlanta: 0,
          valorTotalSindicato: 0,
          rutas: {},
          meses: {},
          camionesGeem: new Set(),
        };
      }
      const o = obraMap[obraId];

      registros.forEach(({ m3, distanciaKm, banco, mesKey }) => {
        if (m3 <= 0) return;
        o.m3TotalObra += m3;
        if (!esGeem) return;

        o.m3Geem += m3;
        o.viajesGeem += 1;
        if (esPlanta) o.viajesGeemPlanta += 1;
        if (mesKey) o.meses[mesKey] = (o.meses[mesKey] || 0) + 1;
        if (vale.id_vehiculo) o.camionesGeem.add(vale.id_vehiculo);

        const tarifa = tarifaCTM(tipoMaterialId);
        const valorSindicatoM3 = tarifa ? cotizarFleteM3(distanciaKm, tarifa) : null;
        const valorSindicato = valorSindicatoM3 != null ? valorSindicatoM3 * m3 : 0;
        o.valorTotalSindicato += valorSindicato;

        const rutaKey = `${banco}::${materialNombre}`;
        if (!o.rutas[rutaKey]) {
          o.rutas[rutaKey] = { banco, material: materialNombre, m3: 0, sumaM3PorKm: 0, viajes: 0, valorSindicato: 0 };
        }
        const r = o.rutas[rutaKey];
        r.m3 += m3;
        r.sumaM3PorKm += m3 * distanciaKm;
        r.viajes += 1;
        r.valorSindicato += valorSindicato;
      });
    });
  });

  return Object.values(obraMap)
    .filter((o) => o.m3Geem > 0)
    .map((o) => ({
      obra: o.obra, cc: o.cc, empresa: o.empresa,
      m3Geem: o.m3Geem,
      pctVolumenObra: o.m3TotalObra > 0 ? (o.m3Geem / o.m3TotalObra) * 100 : null,
      viajesGeem: o.viajesGeem,
      viajesGeemPlanta: o.viajesGeemPlanta,
      pctPlanta: o.viajesGeem > 0 ? (o.viajesGeemPlanta / o.viajesGeem) * 100 : 0,
      camionesGeemDistintos: o.camionesGeem.size,
      valorTotalSindicato: o.valorTotalSindicato,
      rutas: Object.values(o.rutas)
        .map((r) => ({
          banco: r.banco, material: r.material, m3: r.m3, viajes: r.viajes,
          distanciaKm: r.m3 > 0 ? r.sumaM3PorKm / r.m3 : 0,
          valorSindicato: r.valorSindicato,
        }))
        .sort((a, b) => b.valorSindicato - a.valorSindicato),
      viajesPorMes: Object.keys(o.meses).sort().map((mes) => ({ mes, viajes: o.meses[mes] })),
    }))
    .sort((a, b) => b.valorTotalSindicato - a.valorTotalSindicato);
};

// ── Camiones activos por día (todas las placas, sindicato + GEEM) ────
// Referencia de demanda diaria de flete en la obra — no filtra por
// sindicato, cuenta toda la flota (propia y rentada) que trabajó ahí cada
// día. Un día se cuenta por la fecha del viaje (hora_registro); si el
// detalle no tiene viajes capturados (Tipo 2) se usa fecha_creacion del vale.
const calcularCamionesPorDia = (valesMaterial) => {
  const obraMap = {};

  valesMaterial.forEach((vale) => {
    const obraId = vale.id_obra;
    if (!obraId || !vale.id_vehiculo) return;

    const dias = new Set();
    (vale.vale_material_detalles || []).forEach((det) => {
      (det.vale_material_viajes || []).forEach((v) => {
        const dia = diaMexico(v.hora_registro);
        if (dia) dias.add(dia);
      });
    });
    if (dias.size === 0) {
      const dia = diaMexico(vale.fecha_creacion);
      if (dia) dias.add(dia);
    }
    if (dias.size === 0) return;

    if (!obraMap[obraId]) {
      obraMap[obraId] = {
        obra: vale.obras?.obra || "Sin obra",
        cc: vale.obras?.cc ?? null,
        empresa: vale.obras?.empresas?.empresa || null,
        diasMap: {},
      };
    }
    const o = obraMap[obraId];
    dias.forEach((dia) => {
      if (!o.diasMap[dia]) o.diasMap[dia] = new Set();
      o.diasMap[dia].add(vale.id_vehiculo);
    });
  });

  return Object.values(obraMap)
    .map((o) => {
      const conteos = Object.values(o.diasMap).map((set) => set.size);
      if (conteos.length === 0) return null;
      return {
        obra: o.obra, cc: o.cc, empresa: o.empresa,
        diasConActividad: conteos.length,
        promedioCamionesDia: conteos.reduce((s, c) => s + c, 0) / conteos.length,
        maxCamionesDia: Math.max(...conteos),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.promedioCamionesDia - a.promedioCamionesDia);
};

// ── Top camioneros por obra ("¿y si esta placa fuera propia?") ──────
// Solo placas de sindicato (excluye GEEM, que ya es flota propia). El
// importe pagado a la placa top es, aproximadamente, el ahorro de haberla
// tenido como camión propio — misma idea que el flete evitado de GEEM, en
// sentido inverso.
const calcularTopCamionerosPorObra = (valesMaterial) => {
  const obraMap = {};

  valesMaterial.forEach((vale) => {
    const obraId = vale.id_obra;
    if (!obraId || !vale.id_vehiculo) return;

    (vale.vale_material_detalles || []).forEach((det) => {
      if (esSindicato(det.sindicatos?.sindicato, SINDICATO_FLOTA_PROPIA)) return;
      const viajes = det.vale_material_viajes || [];
      const registros = viajes.length > 0
        ? viajes.map((v) => ({
            m3: Number(v.volumen_m3 ?? 0),
            importe: Number(
              v.costo_viaje_override ?? v.costo_viaje ??
                Number(v.volumen_m3 ?? 0) * Number(v.precio_m3_override ?? v.precio_m3 ?? det.precio_m3 ?? 0)
            ),
            dia: diaMexico(v.hora_registro),
          }))
        : [{
            m3: Number(det.volumen_real_m3 ?? 0),
            importe: Number(det.costo_total ?? 0),
            dia: diaMexico(vale.fecha_creacion),
          }];

      if (!obraMap[obraId]) {
        obraMap[obraId] = {
          obra: vale.obras?.obra || "Sin obra",
          cc: vale.obras?.cc ?? null,
          empresa: vale.obras?.empresas?.empresa || null,
          placas: {},
        };
      }
      const o = obraMap[obraId];
      const key = vale.id_vehiculo;
      if (!o.placas[key]) {
        o.placas[key] = {
          placas: vale.vehiculos?.placas || "Sin placa",
          operador: vale.operadores?.nombre_completo || "Sin operador",
          viajes: 0, m3: 0, importe: 0, dias: new Set(),
        };
      }
      const p = o.placas[key];
      registros.forEach(({ m3, importe, dia }) => {
        if (m3 <= 0) return;
        p.viajes += 1;
        p.m3 += m3;
        p.importe += importe;
        if (dia) p.dias.add(dia);
      });
    });
  });

  return Object.values(obraMap)
    .map((o) => {
      const placas = Object.values(o.placas)
        .map((p) => ({
          placas: p.placas, operador: p.operador,
          viajes: p.viajes, m3: p.m3, importe: p.importe,
          viajesPorDia: p.dias.size > 0 ? p.viajes / p.dias.size : null,
        }))
        .filter((p) => p.viajes > 0)
        .sort((a, b) => b.viajes - a.viajes);

      if (placas.length === 0) return null;

      const conViajesPorDia = placas.filter((p) => p.viajesPorDia != null);
      const promedioViajesPorDiaObra = conViajesPorDia.length > 0
        ? conViajesPorDia.reduce((s, p) => s + p.viajesPorDia, 0) / conViajesPorDia.length
        : null;
      // Promedio sobre TODAS las placas (no solo el top 5) — referencia de
      // "camión promedio" para comparar contra el top de forma directa.
      const promedioImportePorCamion = placas.reduce((s, p) => s + p.importe, 0) / placas.length;

      return {
        obra: o.obra, cc: o.cc, empresa: o.empresa,
        top: placas.slice(0, 5),
        totalPlacas: placas.length,
        promedioViajesPorDiaObra,
        promedioImportePorCamion,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.top[0]?.viajes || 0) - (a.top[0]?.viajes || 0));
};

// ── Jornada de renta no aprovechada ── por espectros de eficiencia ──
// Versión anterior: (meta − viajes/día) × precio-por-viaje × días. Se
// descartó porque `precio-por-viaje` sale de dividir el costo del vale entre
// sus propios viajes — con 1 solo viaje ese "precio" ya es el costo del día
// completo, y multiplicarlo por los viajes que "faltaron" podía reportar más
// dinero desaprovechado que lo que el vale costó en total (imposible).
//
// Ahora, en vez de estimar un $ de desperdicio, cada vale_renta_detalle se
// clasifica por su propio ritmo real (viajes ÷ días) en un espectro fijo de
// eficiencia (confirmado con Bruno): 1-3 viajes/día es desperdicio franco —
// se suma el costo COMPLETO de esos vales (no una fracción), porque es dinero
// pagado por un equipo casi parado. 4-6 es poca eficiencia (se señala, no se
// cuenta como desperdicio). 7-9 y 10+ son los dos escalones de buen uso.
// Por obra, se reporta cuántos vales y cuánto se pagó en cada espectro.
// Los cortes de 3 y 6 quedan uno y cuatro viajes por debajo de la meta; el
// de 9 la deja un tramo por encima — la meta en sí (7) cae dentro de "Buena
// Eficiencia", no en el escalón "Ideal".
const RANGOS_EFICIENCIA_RENTA = [
  { key: "desperdiciado", label: "Desperdiciado", rango: "1-3 viajes/día", max: META_VIAJES_DIA_RENTA - 4 },
  { key: "pocaEficiencia", label: "Poca Eficiencia", rango: "4-6 viajes/día", max: META_VIAJES_DIA_RENTA - 1 },
  { key: "buenaEficiencia", label: "Buena Eficiencia", rango: "7-9 viajes/día", max: META_VIAJES_DIA_RENTA + 2 },
  { key: "ideal", label: "Ideal", rango: "10+ viajes/día", max: Infinity },
];

const clasificarRangoRenta = (viajesPorDia) => {
  const rango = RANGOS_EFICIENCIA_RENTA.find((r) => viajesPorDia <= r.max);
  return rango?.key ?? "ideal";
};

const calcularRentaNoAprovechada = (valesRenta) => {
  const porObra = {};

  valesRenta.forEach((vale) => {
    const obraId = vale.id_obra;
    if (!obraId) return;

    (vale.vale_renta_detalle || []).forEach((det) => {
      const totalDias = Number(det.total_dias || 0);
      if (totalDias <= 0) return;
      const viajes = det.vale_renta_viajes?.length > 0 ? det.vale_renta_viajes.length : (det.numero_viajes || 1);
      if (viajes <= 0) return;

      const viajesPorDiaReal = viajes / totalDias;
      const importe = Number(det.costo_total || 0);
      const rangoKey = clasificarRangoRenta(viajesPorDiaReal);
      const materialNombre = det.material?.material || "Sin clasificar";

      if (!porObra[obraId]) {
        porObra[obraId] = {
          obra: vale.obras?.obra || "Sin obra", cc: vale.obras?.cc ?? null, empresa: vale.obras?.empresas?.empresa || null,
          totalVales: 0, totalImporte: 0,
          rangos: Object.fromEntries(RANGOS_EFICIENCIA_RENTA.map((r) => [r.key, { count: 0, importe: 0, vales: [] }])),
        };
      }
      const o = porObra[obraId];
      o.totalVales += 1;
      o.totalImporte += importe;

      const r = o.rangos[rangoKey];
      r.count += 1;
      r.importe += importe;
      r.vales.push({
        folio: vale.folio || null,
        idVale: vale.id_vale,
        equipo: materialNombre,
        viajesPorDiaReal,
        totalDias,
        importe,
        nota: det.notas_adicionales || null,
      });
    });
  });

  return Object.values(porObra)
    .map((o) => ({
      obra: o.obra, cc: o.cc, empresa: o.empresa,
      totalVales: o.totalVales,
      totalImporte: o.totalImporte,
      totalDesperdiciado: o.rangos.desperdiciado.importe,
      rangos: RANGOS_EFICIENCIA_RENTA.map((def) => {
        const r = o.rangos[def.key];
        return {
          key: def.key,
          label: def.label,
          rango: def.rango,
          count: r.count,
          pctVales: o.totalVales > 0 ? (r.count / o.totalVales) * 100 : 0,
          importe: r.importe,
          valesConNota: r.vales.filter((v) => v.nota),
        };
      }),
    }))
    .filter((o) => o.totalVales > 0)
    .sort((a, b) => b.totalDesperdiciado - a.totalDesperdiciado);
};

export const useIndicadoresEficiencia = (valesReporteFiltrados, filtroTipoMaterial = [], modoTipoMaterial = "incluir") => {
  const [preciosMaterialTodos, setPreciosMaterialTodos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [cargado, setCargado] = useState(false);

  // Cada consulta se resuelve por separado: un rol sin permiso de lectura en
  // una sola tabla no debe tumbar el resto de los indicadores.
  const fetchIndicadoresEficiencia = useCallback(async () => {
    const segura = async (query, nombre) => {
      const { data, error } = await query;
      if (error) {
        console.error(`Error consultando ${nombre}:`, error.message);
        return [];
      }
      return data || [];
    };

    try {
      setCargando(true);
      const preciosMat = await segura(
        supabase.from("precios_material").select(`
          id_precios_material, id_tipo_de_material, id_sindicato,
          numero_de_intervalos, primer_km, km_sub_int1, limite_int1, km_sub_int2, limite_int2,
          sindicatos:id_sindicato (id_sindicato, sindicato)
        `),
        "precios_material"
      );

      setPreciosMaterialTodos(preciosMat);
      setCargado(true);
    } finally {
      setCargando(false);
    }
  }, []);

  const garantizarIndicadoresEficiencia = useCallback(() => {
    if (cargado || cargando) return Promise.resolve();
    return fetchIndicadoresEficiencia();
  }, [cargado, cargando, fetchIndicadoresEficiencia]);

  // Filtro global de "Tipo de Material" (1 Pétreos / 2 Asfálticos / 3 Corte),
  // propio de esta pestaña. Vive a nivel detalle, no de vale — un vale puede
  // traer detalles de tipos distintos — así que se recorta el arreglo de
  // detalles en vez de descartar el vale completo.
  const valesMaterial = useMemo(() => {
    const soloMaterial = valesReporteFiltrados.filter((v) => v.tipo_vale === "material");
    if (!filtroTipoMaterial || filtroTipoMaterial.length === 0) return soloMaterial;
    return soloMaterial
      .map((vale) => {
        const detalles = (vale.vale_material_detalles || []).filter((det) =>
          matchesFiltro(filtroTipoMaterial, det.material?.tipo_de_material?.id_tipo_de_material, modoTipoMaterial)
        );
        return detalles.length > 0 ? { ...vale, vale_material_detalles: detalles } : null;
      })
      .filter(Boolean);
  }, [valesReporteFiltrados, filtroTipoMaterial, modoTipoMaterial]);
  const valesRenta = useMemo(
    () => valesReporteFiltrados.filter((v) => v.tipo_vale === "renta"),
    [valesReporteFiltrados]
  );

  const indicePosicionObra = useMemo(
    () => calcularIndicePosicionObra(valesMaterial),
    [valesMaterial]
  );

  const fleteEvitadoFlotaPropia = useMemo(
    () => calcularFleteEvitadoFlotaPropia(valesMaterial, preciosMaterialTodos),
    [valesMaterial, preciosMaterialTodos]
  );

  const camionesPorDia = useMemo(
    () => calcularCamionesPorDia(valesMaterial),
    [valesMaterial]
  );

  const topCamionerosPorObra = useMemo(
    () => calcularTopCamionerosPorObra(valesMaterial),
    [valesMaterial]
  );

  const rentaNoAprovechada = useMemo(
    () => calcularRentaNoAprovechada(valesRenta),
    [valesRenta]
  );

  return {
    indicePosicionObra,
    fleteEvitadoFlotaPropia,
    camionesPorDia,
    topCamionerosPorObra,
    rentaNoAprovechada,
    cargandoIndicadoresEficiencia: cargando,
    indicadoresEficienciaCargados: cargado,
    garantizarIndicadoresEficiencia,
  };
};
