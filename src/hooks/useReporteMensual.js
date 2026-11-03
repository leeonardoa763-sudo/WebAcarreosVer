/**
 * src/hooks/useReporteMensual.js
 *
 * Datos del Reporte Mensual corporativo (todas las obras): arma el objeto
 * `REPORTE` que consume reporte-mensual/comun.js — el mismo formato compacto
 * (filas como arreglos + catálogos indexados) que usó el prototipo
 * aprobado, para que el HTML exportado pese poco y se calcule todo en el
 * navegador (filtros de obra/empresa/material/banco sin volver a Supabase).
 *
 * Trae el mes elegido y el anterior (para las comparativas). El desglose
 * sale de TODOS los vales del mes (no solo conciliados, a diferencia de
 * Estadísticas Globales). Reglas de negocio:
 * - Fecha efectiva y exclusiones (obra/empresa de prueba, cancelados): mismo
 *   criterio que useReporteSemanal.js.
 * - Obra VENTA (id 9, CC 996): material almacenado que se vende a camiones
 *   ajenos — va aparte (`venta`), sin importe, no es flota propia ni entra
 *   en los totales de obras.
 * - GRUPO GEEM (flota propia): importe 0 y flete evitado = m³ × tarifa CTM
 *   por tipo de material y distancia (cotizarFleteM3).
 * - Etapa de conciliación del vale: 0 = sin conciliación ligada en
 *   conciliacion_vales, 1 = conciliación `generada`, 2 = `pagada` (con OC y
 *   factura).
 * - Renta: material/carga por viaje desde 2026-09-04; la etiqueta de equipo
 *   es materialLabelDetalle (material o categoría planeada) y la carga se
 *   cuenta de vale_renta_viajes.carga_porcentaje (100/75/50).
 *
 * Dependencias: supabase, utils/cotizarFlete, utils/rentaMaterial,
 * SINDICATO_TARIFAS_REPORTE de hooks/useEstadisticasGlobales
 * Usado en: ReporteMensual.jsx
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../config/supabase";
import { cotizarFleteM3 } from "../utils/cotizarFlete";
import { materialLabelDetalle } from "../utils/rentaMaterial";
import { SINDICATO_TARIFAS_REPORTE } from "./useEstadisticasGlobales";

const ID_OBRA_VENTA = 9;
const PAGINA = 1000;

const CAMPOS = {
  mat: ["obra", "material", "banco", "geem", "dia", "viajes", "m3", "importe", "fleteEvitado", "estadoConc", "folio"],
  renta: ["obra", "equipo", "dia", "dias", "horas", "viajes", "importe", "estadoConc", "folio", "pipa", "nota", "porDia", "nocturno", "cerrado", "carga"],
  venta: ["material", "banco", "dia", "m3", "folio", "placa"],
};

// ── Helpers de fecha ──────────────────────────────────────────────────
export const mesAnteriorDe = (mes) => {
  const [y, m] = mes.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};
const mesSiguienteDe = (mes) => {
  const [y, m] = mes.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};
const diasDelMes = (mes) => {
  const [y, m] = mes.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};
const etiquetaMes = (mes) => {
  const s = new Date(`${mes}-15T12:00:00`).toLocaleDateString("es-MX", { month: "long", year: "numeric" }).replace(" de ", " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Día calendario en México (YYYY-MM-DD) de la fecha efectiva del vale:
// fecha_completado (real) → fecha_programada → fecha_creacion.
const diaMexico = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const fechaEfectiva = (v) => {
  if (v.fecha_completado) return diaMexico(v.fecha_completado);
  if (v.fecha_programada) return v.fecha_programada;
  return diaMexico(v.fecha_creacion);
};

const esValeReal = (v) => Number(v.id_obra) !== 14 && Number(v.id_empresa) !== 4 && v.estado !== "cancelado";
const coincideSindicato = (nombre, buscado) => (nombre || "").toUpperCase().includes(buscado);
const esFlotaPropia = (sindicato) => coincideSindicato(sindicato, "GRUPO GEEM");
const round2 = (n) => Math.round(n * 100) / 100;

const estadoConciliacion = (vale) => {
  const estados = (vale.conciliacion_vales || []).map((cv) => cv.conciliaciones?.estado).filter(Boolean);
  if (estados.includes("pagada")) return 2;
  return estados.length ? 1 : 0;
};

// Catálogo indexado: devuelve la posición de `clave`, creándola con `crear()`.
const catalogo = () => {
  const lista = [];
  const pos = new Map();
  const idx = (clave, crear) => {
    if (!pos.has(clave)) { pos.set(clave, lista.length); lista.push(crear()); }
    return pos.get(clave);
  };
  return { lista, idx };
};

// Registros de material de un detalle, con banco y flete evitado. Mismo
// criterio de volumen/importe que expandirRegistrosMaterial de
// useReporteSemanal.js: el producto de corte (tipo 3) y los detalles sin
// viajes se toman del detalle; el resto, viaje por viaje (con overrides).
const registrosMaterial = (det, tarifaCTM) => {
  const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;
  const esGeem = esFlotaPropia(det.sindicatos?.sindicato);
  const viajes = det.vale_material_viajes || [];
  const kmDetalle = Number(det.distancia_km || 0);
  const bancoDetalle = det.bancos?.banco || "Sin banco";
  const evitado = (m3, km) => {
    if (!esGeem || m3 <= 0) return 0;
    const tarifa = tarifaCTM(tipoId);
    const valorM3 = tarifa ? cotizarFleteM3(km, tarifa) : null;
    return valorM3 != null ? valorM3 * m3 : 0;
  };

  if (tipoId === 3 || viajes.length === 0) {
    const m3 = Number(det.volumen_real_m3 || det.cantidad_pedida_m3 || 0);
    return [{
      esGeem,
      banco: viajes[0]?.bancos_override?.banco || bancoDetalle,
      m3,
      importe: esGeem ? 0 : Number(det.costo_total || 0),
      viajes: tipoId === 3 ? viajes.length : 1,
      evitado: evitado(m3, kmDetalle),
    }];
  }

  return viajes.map((v) => {
    const m3 = Number(v.volumen_m3 || 0);
    const importe =
      v.costo_viaje_override != null ? Number(v.costo_viaje_override)
        : v.precio_m3_override != null ? Number(v.precio_m3_override) * m3
          : Number(det.precio_m3 || 0) * m3;
    return {
      esGeem,
      banco: v.bancos_override?.banco || bancoDetalle,
      m3,
      importe: esGeem ? 0 : importe,
      viajes: 1,
      evitado: evitado(m3, Number(v.distancia_km_override ?? kmDetalle)),
    };
  });
};

// ── Construcción del objeto REPORTE ─────────────────────────────────────
const construirReporte = (vales, mes, precios) => {
  const mesAnt = mesAnteriorDe(mes);
  const tarifaCTM = (tipoId) =>
    precios.find((t) => t.id_tipo_de_material === tipoId && coincideSindicato(t.sindicatos?.sindicato, SINDICATO_TARIFAS_REPORTE)) || null;

  const obras = catalogo(), empresas = catalogo(), materiales = catalogo(), bancos = catalogo(), equipos = catalogo(), placas = catalogo();
  const periodos = { actual: { mat: new Map(), renta: [], venta: new Map() }, anterior: { mat: new Map(), renta: [], venta: new Map() } };

  const idxObra = (vale) => {
    const empresa = vale.empresas?.empresa || "Sin empresa";
    const iEmpresa = empresas.idx(empresa, () => empresa);
    return obras.idx(vale.id_obra, () => ({ id: vale.id_obra, obra: vale.obras?.obra || "Sin obra", cc: vale.obras?.cc ?? null, empresa, iEmpresa }));
  };
  const idxMaterial = (det) =>
    materiales.idx(det.id_material ?? "sin", () => ({ material: det.material?.material || "Sin clasificar", tipo: det.material?.tipo_de_material?.tipo_de_material || "Otros" }));
  // Acumula filas con la misma clave (vale + material + banco) para que el
  // HTML exportado no cargue una fila por viaje.
  const acumular = (mapa, clave, crear, sumar) => {
    if (!mapa.has(clave)) mapa.set(clave, crear());
    sumar(mapa.get(clave));
  };

  vales.forEach((vale) => {
    if (!esValeReal(vale) || !vale.fecha_creacion) return;
    const fecha = fechaEfectiva(vale);
    const p = fecha.startsWith(mes) ? periodos.actual : fecha.startsWith(mesAnt) ? periodos.anterior : null;
    if (!p) return;
    const dia = Number(fecha.slice(8, 10));
    const conc = estadoConciliacion(vale);
    const esVenta = Number(vale.id_obra) === ID_OBRA_VENTA;

    (vale.vale_material_detalles || []).forEach((det) => {
      const iMat = idxMaterial(det);
      registrosMaterial(det, tarifaCTM).forEach((r) => {
        const iBanco = bancos.idx(r.banco, () => r.banco);
        if (esVenta) {
          const placa = vale.vehiculos?.placas || "Sin placas";
          const iPlaca = placas.idx(placa, () => placa);
          acumular(p.venta, `${vale.folio}|${iMat}|${iBanco}`, () => [iMat, iBanco, dia, 0, vale.folio, iPlaca], (f) => { f[3] += r.m3; });
          return;
        }
        const iObra = idxObra(vale);
        acumular(p.mat, `${vale.folio}|${iMat}|${iBanco}|${r.esGeem}`, () => [iObra, iMat, iBanco, r.esGeem ? 1 : 0, dia, 0, 0, 0, 0, conc, vale.folio], (f) => {
          f[5] += r.viajes; f[6] += r.m3; f[7] += r.importe; f[8] += r.evitado;
        });
      });
    });

    (vale.vale_renta_detalle || []).forEach((det) => {
      const iObra = idxObra(vale);
      const etiqueta = materialLabelDetalle(det);
      const equipo = etiqueta === "—" ? "Sin clasificar" : etiqueta;
      const viajesRenta = det.vale_renta_viajes || [];
      const carga = [100, 75, 50].map((pct) => viajesRenta.filter((v) => v.carga_porcentaje === pct).length);
      const dias = Number(det.total_dias || 0), horas = Number(det.total_horas || 0);
      p.renta.push([
        iObra, equipos.idx(equipo, () => equipo), dia, round2(dias), round2(horas),
        viajesRenta.length > 0 ? viajesRenta.length : det.numero_viajes || 0,
        round2(Number(det.costo_total || 0)), conc, vale.folio, vale.es_pipa_agua ? 1 : 0,
        det.notas_adicionales?.trim() || null, det.es_renta_por_dia ? 1 : 0, det.es_turno_nocturno ? 1 : 0,
        dias > 0 || horas > 0 ? 1 : 0, carga,
      ]);
    });
  });

  const redondear = (filas, cols) => filas.map((f) => { cols.forEach((i) => (f[i] = round2(f[i]))); return f; });
  const salida = (p) => ({
    mat: redondear([...p.mat.values()], [6, 7, 8]),
    renta: p.renta,
    venta: redondear([...p.venta.values()], [3]),
  });

  return {
    mes,
    mesLabel: etiquetaMes(mes),
    anteriorLabel: etiquetaMes(mesAnt),
    diasMes: diasDelMes(mes),
    generado: new Date().toISOString(),
    obras: obras.lista,
    empresas: empresas.lista,
    materiales: materiales.lista,
    bancos: bancos.lista,
    equipos: equipos.lista,
    placas: placas.lista,
    campos: CAMPOS,
    actual: salida(periodos.actual),
    anterior: salida(periodos.anterior),
  };
};

// ── Hook principal ────────────────────────────────────────────────────
export const useReporteMensual = (mesInicial) => {
  const [mes, setMes] = useState(mesInicial);
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const desde = `${mesAnteriorDe(mes)}-01`;
      const hasta = `${mesSiguienteDe(mes)}-01`;
      // Margen de un día en los timestamps: el día efectivo se calcula en
      // hora de México y el filtro fino se hace en construirReporte.
      const desdeTs = new Date(new Date(`${desde}T00:00:00Z`).getTime() - 86400000).toISOString();
      const hastaTs = new Date(new Date(`${hasta}T00:00:00Z`).getTime() + 86400000).toISOString();

      const { data: precios, error: errPrecios } = await supabase
        .from("precios_material")
        .select(`
          id_precios_material, id_tipo_de_material, id_sindicato,
          numero_de_intervalos, primer_km, km_sub_int1, limite_int1, km_sub_int2, limite_int2,
          sindicatos:id_sindicato (id_sindicato, sindicato)
        `);
      if (errPrecios) throw errPrecios;

      // Paginado: dos meses de vales pueden pasar del tope de filas por
      // respuesta de PostgREST.
      const vales = [];
      for (let desdeFila = 0; ; desdeFila += PAGINA) {
        const { data, error: err } = await supabase
          .from("vales")
          .select(`
            id_vale, folio, estado, fecha_creacion, fecha_completado, fecha_programada, id_obra, id_empresa, es_pipa_agua,
            obras:id_obra (id_obra, obra, cc),
            empresas:id_empresa (id_empresa, empresa),
            vehiculos:id_vehiculo (id_vehiculo, placas),
            conciliacion_vales (conciliaciones:id_conciliacion (estado)),
            vale_material_detalles (
              volumen_real_m3, cantidad_pedida_m3, costo_total, precio_m3, id_material, distancia_km,
              sindicatos:id_sindicato (sindicato),
              bancos:id_banco (banco),
              material:id_material (id_material, material, tipo_de_material:id_tipo_de_material (id_tipo_de_material, tipo_de_material)),
              vale_material_viajes (
                volumen_m3, precio_m3_override, costo_viaje_override, distancia_km_override,
                bancos_override:id_banco_override (banco)
              )
            ),
            vale_renta_detalle (
              total_horas, total_dias, numero_viajes, costo_total, notas_adicionales, es_renta_por_dia, es_turno_nocturno,
              material:id_material (id_material, material),
              categoria_planeada:id_categoria_planeada (id_categoria_material_renta, categoria),
              vale_renta_viajes (id_viaje, carga_porcentaje)
            )
          `)
          .or(
            `and(fecha_creacion.gte.${desdeTs},fecha_creacion.lt.${hastaTs}),` +
              `and(fecha_programada.gte.${desde},fecha_programada.lt.${hasta}),` +
              `and(fecha_completado.gte.${desdeTs},fecha_completado.lt.${hastaTs})`
          )
          .order("id_vale")
          .range(desdeFila, desdeFila + PAGINA - 1);
        if (err) throw err;
        vales.push(...(data || []));
        if (!data || data.length < PAGINA) break;
      }

      setReporte(construirReporte(vales, mes, precios || []));
    } catch (err) {
      console.error("Error en useReporteMensual.fetchData:", err);
      setError(err.message || "Error al cargar el reporte mensual");
    } finally {
      setLoading(false);
    }
  }, [mes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { mes, setMes, reporte, loading, error, refresh: fetchData };
};
