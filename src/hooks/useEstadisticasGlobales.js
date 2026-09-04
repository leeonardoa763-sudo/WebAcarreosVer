/**
 * src/hooks/useEstadisticasGlobales.js
 *
 * Estadísticas globales con filtros reactivos por mes, semana, obra, empresa,
 * sindicato, material y banco. Expone series de tiempo para gráfica.
 * Incluye además un desglose por obra en tiempo real (directo de `vales`,
 * sin pasar por conciliaciones) con filtro "Hoy", para el bloque
 * "Desglose por Obra" de la página.
 *
 * Dependencias: supabase
 * Usado en: EstadisticasGlobales.jsx
 */

// 1. React
import { useState, useCallback, useMemo } from "react";

// 2. Hooks personalizados
import { useAuth } from "./useAuth";

// 3. Config
import { supabase } from "../config/supabase";

// ── Helper: semana del año ──────────────────────────────────────────
const getWeekKey = (fechaStr) => {
  if (!fechaStr) return null;
  const d = new Date(fechaStr);
  const year = d.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor((d - startOfYear) / 86400000);
  const week = Math.floor(dayOfYear / 7) + 1;
  return `${year}-S${String(week).padStart(2, "0")}`;
};

// ── Helper: coincidencia con filtro multi-selección (arreglo vacío = todos) ──
// modo "excluir" invierte la coincidencia (NOT IN en vez de IN). Con arreglo
// vacío nunca filtra, sin importar el modo (excluir nada equivale a no filtrar).
export const matchesFiltro = (filtroArr, value, modo = "incluir") => {
  if (!filtroArr || filtroArr.length === 0) return true;
  const coincide = filtroArr.some((v) => String(v) === String(value));
  return modo === "excluir" ? !coincide : coincide;
};

// ── Orden y nombre de los tipos de material (ver CLAUDE.md, "Tipos de material") ──
export const ORDEN_TIPOS_MATERIAL = [1, 2, 3];
export const NOMBRE_TIPO_FALLBACK = { 1: "Materiales Pétreos", 2: "Base Asfáltica", 3: "Tepetate / Corte" };

// ── Ahorro vs. proceso anterior en papel ─────────────────────────────
// Ticket térmico impreso en campo (reemplaza el talonario físico). Costo
// derivado de una compra real: 3 cajas de rollos térmicos × $200 = $600,
// para los vales de "149 Desnivel" (id_obra 16) y "146 Lat del Desnivel"
// (id_obra 15) — 2838 vales no cancelados de esas 2 obras a la fecha de
// este cálculo. vales.impresiones_ticket confirma 1 ticket por vale
// (encabezado), no por viaje dentro del vale.
const COSTO_TICKET_TERMICO = 600 / 2838; // ≈ $0.2114 por vale
const COSTO_VALE_VIEJO_MATERIAL = 2; // $ por viaje (talonario de papel)
const COSTO_VALE_VIEJO_RENTA = 2; // $ por vale de renta (talonario de papel)
const COSTO_CONCILIACION_VIEJA = 1; // $ por copia de conciliación en papel

// ── Helper: comparación de fecha (YYYY-MM-DD, zona CDMX) contra rango ──────
const fechaEnRango = (fechaStr, desde, hasta) => {
  if (!fechaStr) return false;
  if (!desde && !hasta) return true;
  const fechaDia = new Date(fechaStr).toLocaleDateString("en-CA", {
    timeZone: "America/Mexico_City",
  });
  if (desde && fechaDia < desde) return false;
  if (hasta && fechaDia > hasta) return false;
  return true;
};

// ── Agregación de material por obra desde vales reales (tabla `vales`) ──────
// Compartida por las tablas del reporte PDF. Respeta filtro material/banco a
// nivel detalle. Tipo 3 (corte) toma volumen_real_m3 y cuenta tickets; el resto
// suma volumen de vale_material_viajes, y si no hay viajes (Tipo 2 asfáltico)
// usa volumen_real_m3. Solo cuenta volumen REAL capturado — un vale sin
// captura aún (recién emitido) suma 0, igual que en el Excel exportado.
const agregarObraMaterialReal = (valesMaterial, filtroMaterial, filtroBanco, modoMaterial = "incluir", modoBanco = "incluir") => {
  const obraMap = {};
  valesMaterial.forEach((vale) => {
    const obraId = vale.obras?.id_obra;
    if (!obraId) return;

    if (!obraMap[obraId]) {
      obraMap[obraId] = {
        obra: vale.obras?.obra || "Sin obra",
        cc: vale.obras?.cc ?? null,
        empresa: vale.obras?.empresas?.empresa || null,
        matMap: {},
      };
    }

    (vale.vale_material_detalles || []).forEach((det) => {
      const nombreMat = det.material?.material || "Sin clasificar";
      const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;
      const tipoNombre = det.material?.tipo_de_material?.tipo_de_material || null;

      if (!matchesFiltro(filtroMaterial, nombreMat, modoMaterial)) return;
      if (!matchesFiltro(filtroBanco, det.id_banco, modoBanco)) return;

      if (!obraMap[obraId].matMap[nombreMat]) {
        obraMap[obraId].matMap[nombreMat] = {
          material: nombreMat, tipoId: tipoId ?? null, tipoNombre, m3Total: 0, valesIds: new Set(), totalViajes: 0, importeIVA: 0,
        };
      }
      const s = obraMap[obraId].matMap[nombreMat];
      s.valesIds.add(vale.id_vale);
      // Flota propia (GRUPO GEEM): sí cuenta en m³/viajes/vales, pero su
      // costo_total es el $1/km técnico ficticio — no se suma como dinero.
      if (!esFlotaPropia(det.sindicatos?.sindicato)) {
        s.importeIVA += Number(det.costo_total || 0) * 1.16;
      }

      if (tipoId === 3) {
        s.m3Total += Number(det.volumen_real_m3 || 0);
        s.totalViajes += vale.tickets_material?.length || 0;
      } else {
        const viajes = det.vale_material_viajes || [];
        if (viajes.length > 0) {
          viajes.forEach((v) => { s.m3Total += Number(v.volumen_m3 || 0); });
          s.totalViajes += viajes.length;
        } else {
          // Tipo 2 (Base/Carpeta Asfáltica): 1 vale = 1 viaje capturado directo
          // en el detalle, sin filas en vale_material_viajes → usar volumen_real_m3.
          s.m3Total += Number(det.volumen_real_m3 || 0);
          s.totalViajes += (det.volumen_real_m3 != null || det.costo_total != null) ? 1 : 0;
        }
      }
    });
  });

  return Object.values(obraMap)
    .map(({ obra, cc, empresa, matMap }) => {
      const materiales = Object.values(matMap)
        .map((s) => ({ ...s, valesCount: s.valesIds.size }))
        .sort((a, b) => b.m3Total - a.m3Total);
      const subtotal = materiales.reduce(
        (acc, m) => ({
          m3Total:     acc.m3Total     + m.m3Total,
          valesCount:  acc.valesCount  + m.valesCount,
          totalViajes: acc.totalViajes + m.totalViajes,
          importeIVA:  acc.importeIVA  + m.importeIVA,
        }),
        { m3Total: 0, valesCount: 0, totalViajes: 0, importeIVA: 0 }
      );
      return { obra, cc, empresa, materiales, subtotal };
    })
    .sort((a, b) => b.subtotal.m3Total - a.subtotal.m3Total);
};

// ── Sindicato cuyas tarifas se reportan en "Tarifas por KM por Banco" ───────
// Las demás (p.ej. datos de prueba como "GRUPO GEEM") se omiten de esa tabla
// a petición explícita — el resto de la sección (m³, viajes, importe por
// banco/material) no se ve afectado, solo el desglose de tarifas.
export const SINDICATO_TARIFAS_REPORTE = "CTM";

// Flota propia: sus vales sí cuentan en m³/viajes/vales de cualquier
// desglose (transportan material real), pero su `costo_total` es un precio
// técnico ficticio de $1/km para poder cargarlo en la app — nunca un importe
// real pagado. Se excluye de cualquier SUMA EN PESOS de "todo el material"
// (Volumen Acumulado, Desglose en Tiempo Real); su valor real a tarifa de
// mercado ya se calcula aparte en "Flete Evitado" (useIndicadoresEficiencia).
const SINDICATO_FLOTA_PROPIA = "GRUPO GEEM";
const esFlotaPropia = (sindicato) => (sindicato || "").toUpperCase().includes(SINDICATO_FLOTA_PROPIA);

// ── Agregación de material por banco desde vales reales (tabla `vales`) ─────
// Igual que agregarObraMaterialReal pero agrupando tipo de material → banco →
// material (desglose de qué materiales salieron de cada banco) en vez de
// obra → material. Banco/distancia/precio/costo se resuelven por viaje con el
// patrón viaje.*_override ?? viaje.* ?? detalle.* (ver calcularTotalesPorBanco.js
// y CLAUDE.md raíz, "El banco se puede cambiar por viaje"). A diferencia de
// calcularTotalesPorBanco.js (limitado a Tipo 1/2 de una sola conciliación),
// aquí se incluyen los 3 tipos y todo el periodo filtrado del reporte.
const agregarBancoMaterialReal = (valesMaterial, filtroMaterial, filtroBanco, modoMaterial = "incluir", modoBanco = "incluir") => {
  const tipoMap = {};

  valesMaterial.forEach((vale) => {
    (vale.vale_material_detalles || []).forEach((det) => {
      const nombreMat = det.material?.material || "Sin clasificar";
      const tipoId = det.material?.tipo_de_material?.id_tipo_de_material ?? null;
      const tipoNombre = det.material?.tipo_de_material?.tipo_de_material || NOMBRE_TIPO_FALLBACK[tipoId] || "Sin clasificar";
      const esSindicatoTarifas = (det.sindicatos?.sindicato || "")
        .toUpperCase()
        .includes(SINDICATO_TARIFAS_REPORTE);
      // Flota propia (GRUPO GEEM): sus viajes sí cuentan en m³/viajes, pero su
      // costo es el $1/km técnico ficticio — no se suma como dinero real.
      const esFlota = esFlotaPropia(det.sindicatos?.sindicato);

      if (!matchesFiltro(filtroMaterial, nombreMat, modoMaterial)) return;
      if (!matchesFiltro(filtroBanco, det.id_banco, modoBanco)) return;

      if (!tipoMap[tipoId]) {
        tipoMap[tipoId] = { tipoId, tipoNombre, bancoMap: {} };
      }

      const viajes = det.vale_material_viajes || [];
      const registros = viajes.length > 0
        ? viajes.map((v) => ({
            banco: v.bancos_override?.banco ?? det.bancos?.banco ?? "Sin banco",
            m3: Number(v.volumen_m3 ?? 0),
            distanciaKm: Number(v.distancia_km_override ?? det.distancia_km ?? 0),
            importe: esFlota ? 0 : Number(
              v.costo_viaje_override ??
                v.costo_viaje ??
                Number(v.volumen_m3 ?? 0) * Number(v.precio_m3_override ?? v.precio_m3 ?? det.precio_m3 ?? 0)
            ) * 1.16,
            // Tarifa realmente usada: la de obra gana sobre la del sindicato
            // (mutuamente excluyentes, ver CLAUDE.md "Tarifas por obra") — el
            // viaje manda sobre el detalle, igual que banco/distancia/precio.
            tarifa: v.precios_material ?? v.precios_material_obra ?? det.precios_material ?? det.precios_material_obra ?? null,
          }))
        : [{
            banco: det.bancos?.banco ?? "Sin banco",
            m3: Number(det.volumen_real_m3 ?? 0),
            distanciaKm: Number(det.distancia_km ?? 0),
            importe: esFlota ? 0 : Number(det.costo_total ?? 0) * 1.16,
            tarifa: det.precios_material ?? det.precios_material_obra ?? null,
          }];

      registros.forEach(({ banco, m3, distanciaKm, importe, tarifa }) => {
        const bMap = tipoMap[tipoId].bancoMap;
        if (!bMap[banco]) {
          bMap[banco] = {
            banco, viajes: 0, m3Total: 0, importeIVA: 0, sumaDistancias: 0,
            tarifasMap: new Map(), materialMap: {},
          };
        }
        bMap[banco].viajes += 1;
        bMap[banco].m3Total += m3;
        bMap[banco].importeIVA += importe;
        bMap[banco].sumaDistancias += distanciaKm;
        // Clave prefijada porque id_precios_material e id_precios_material_obra
        // son PKs de tablas distintas — el mismo número en ambas no es la misma fila.
        if (esSindicatoTarifas && tarifa?.id_precios_material != null) {
          bMap[banco].tarifasMap.set(`m-${tarifa.id_precios_material}`, tarifa);
        } else if (esSindicatoTarifas && tarifa?.id_precios_material_obra != null) {
          bMap[banco].tarifasMap.set(`o-${tarifa.id_precios_material_obra}`, tarifa);
        }

        const mMap = bMap[banco].materialMap;
        if (!mMap[nombreMat]) {
          mMap[nombreMat] = { material: nombreMat, viajes: 0, m3Total: 0, importeIVA: 0, sumaDistancias: 0 };
        }
        mMap[nombreMat].viajes += 1;
        mMap[nombreMat].m3Total += m3;
        mMap[nombreMat].importeIVA += importe;
        mMap[nombreMat].sumaDistancias += distanciaKm;
      });
    });
  });

  return Object.values(tipoMap)
    .map(({ tipoId, tipoNombre, bancoMap }) => {
      const bancos = Object.values(bancoMap)
        .map(({ materialMap, tarifasMap, ...b }) => ({
          ...b,
          distanciaKmProm: b.viajes > 0 ? b.sumaDistancias / b.viajes : 0,
          precioM3Prom: b.m3Total > 0 ? b.importeIVA / 1.16 / b.m3Total : 0,
          // Tarifas (precios_material) realmente usadas en viajes de sindicato
          // CTM en este banco — puede haber más de una si surte varios
          // materiales o si la tarifa cambió dentro del periodo del reporte.
          tarifas: Array.from(tarifasMap.values()),
          materiales: Object.values(materialMap)
            .map((m) => ({
              ...m,
              distanciaKmProm: m.viajes > 0 ? m.sumaDistancias / m.viajes : 0,
              precioM3Prom: m.m3Total > 0 ? m.importeIVA / 1.16 / m.m3Total : 0,
            }))
            .sort((a, c) => c.m3Total - a.m3Total),
        }))
        .sort((a, b) => b.m3Total - a.m3Total);
      const subtotal = bancos.reduce(
        (acc, b) => ({
          viajes: acc.viajes + b.viajes,
          m3Total: acc.m3Total + b.m3Total,
          importeIVA: acc.importeIVA + b.importeIVA,
        }),
        { viajes: 0, m3Total: 0, importeIVA: 0 }
      );
      return { tipoId, tipoNombre, bancos, subtotal };
    })
    .sort((a, b) => {
      const ia = a.tipoId != null ? ORDEN_TIPOS_MATERIAL.indexOf(a.tipoId) : -1;
      const ib = b.tipoId != null ? ORDEN_TIPOS_MATERIAL.indexOf(b.tipoId) : -1;
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
};

// ── Agregación de renta por obra desde vales reales (tabla `vales`) ─────────
// Importe SIN IVA ni retención (esas solo existen a nivel conciliación).
const agregarObraRentaReal = (valesRenta) => {
  const obraMap = {};
  valesRenta.forEach((vale) => {
    const obraId = vale.id_obra;
    if (!obraId) return;
    if (!obraMap[obraId]) {
      obraMap[obraId] = {
        obra: vale.obras?.obra || "Sin obra",
        cc: vale.obras?.cc ?? null,
        empresa: vale.obras?.empresas?.empresa || null,
        vales: 0, totalViajes: 0, totalDias: 0, totalHoras: 0, subtotalSinIva: 0,
      };
    }
    const o = obraMap[obraId];
    o.vales += 1;
    (vale.vale_renta_detalle || []).forEach((det) => {
      o.totalViajes += det.vale_renta_viajes?.length > 0
        ? det.vale_renta_viajes.length
        : (det.numero_viajes || 1);
      o.totalDias  += Number(det.total_dias  || 0);
      o.totalHoras += Number(det.total_horas || 0);
      o.subtotalSinIva += Number(det.costo_total || 0);
    });
  });
  return Object.values(obraMap).sort((a, b) => b.subtotalSinIva - a.subtotalSinIva);
};

// ── Precio por viaje / m³ aprox. de renta a partir de capacidad del vehículo ──
// No existe m³ ni costo por viaje capturado en BD para renta, se deriva de
// capacidad_m3 (vehículo) × viajes (mismo criterio que tablaViajesRentaPorEquipo).
const derivarPrecioRenta = ({ capacidadSuma, capacidadCount, importeTotal, viajes }) => {
  const capacidadPromedio = capacidadCount > 0 ? capacidadSuma / capacidadCount : null;
  const precioPorViaje = viajes > 0 ? importeTotal / viajes : null;
  return {
    capacidadPromedio,
    precioPorViaje,
    precioAproxM3: precioPorViaje != null && capacidadPromedio ? precioPorViaje / capacidadPromedio : null,
  };
};

export const useEstadisticasGlobales = () => {
  // Detectar perfil de usuario
  const { userProfile } = useAuth();
  const esResidente = userProfile?.roles?.role === "Residente";
  // Usar TODAS las obras asignadas al residente
  const idObrasAsignadas = userProfile?.id_obras_asignadas || [];

  // 1. Estados base
  // Carga perezosa: nada se pide al montar la página — cada dominio se marca
  // "cargado" la primera vez que alguna sección que lo necesita se despliega
  // (ver garantizarEstadisticas/garantizarTiempoReal/garantizarPresupuestos).
  const [loading, setLoading] = useState(false);
  const [estadisticasCargadas, setEstadisticasCargadas] = useState(false);
  const [error, setError] = useState(null);
  const [rawConciliaciones, setRawConciliaciones] = useState([]);
  const [rawVales, setRawVales] = useState([]);
  const [valeAConciliacion, setValeAConciliacion] = useState({});
  const [rawValesRenta, setRawValesRenta] = useState([]);
  const [valeRentaAConciliacion, setValeRentaAConciliacion] = useState({});

  // Estados de presupuesto
  const [presupuestosMaterial, setPresupuestosMaterial] = useState([]);
  const [presupuestosRenta,    setPresupuestosRenta]    = useState([]);
  const [loadingPresupuestos,  setLoadingPresupuestos]  = useState(false);
  const [presupuestosCargados, setPresupuestosCargados] = useState(false);

  // Estados del desglose por obra en tiempo real (directo de vales, sin conciliaciones)
  const [rawValesTiempoReal, setRawValesTiempoReal] = useState([]);
  const [loadingTiempoReal,  setLoadingTiempoReal]  = useState(false);
  const [tiempoRealCargado,  setTiempoRealCargado]  = useState(false);
  const [errorTiempoReal,    setErrorTiempoReal]    = useState(null);
  // Periodo local de esta sección: "hoy" (default) | "ayer" | "semana" | "rango"
  const [periodoTiempoReal, setPeriodoTiempoReal] = useState("hoy");
  const [semanaTiempoReal,  setSemanaTiempoReal]  = useState(() => getWeekKey(new Date().toISOString()));
  const [rangoTiempoRealDesde, setRangoTiempoRealDesde] = useState(null);
  const [rangoTiempoRealHasta, setRangoTiempoRealHasta] = useState(null);

  // Rango de fechas opcional para "Volumen Acumulado" (histórico por defecto)
  const [rangoAcumuladoDesde, setRangoAcumuladoDesde] = useState(null);
  const [rangoAcumuladoHasta, setRangoAcumuladoHasta] = useState(null);

  // 2. Estado de filtros
  const [filtros, setFiltrosState] = useState({
    mes: [],
    semana: [],
    idObra: [],
    idEmpresa: [],
    idSindicato: [],
    material: [],
    idBanco: [],
    idTipoMaterial: [],
  });

  // 2b. Modo por categoría: "incluir" (IN, por defecto) o "excluir" (NOT IN)
  const [modosFiltro, setModosFiltro] = useState({
    mes: "incluir",
    semana: "incluir",
    idObra: "incluir",
    idEmpresa: "incluir",
    idSindicato: "incluir",
    material: "incluir",
    idBanco: "incluir",
    idTipoMaterial: "incluir",
  });

  // 3. Fetch principal
  const fetchEstadisticas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Validación: Residente debe tener obras asignadas
      if (esResidente && (!idObrasAsignadas || idObrasAsignadas.length === 0)) {
        setError("No tienes obras asignadas. Contacta al administrador.");
        setLoading(false);
        return;
      }

      // Query A: todas las conciliaciones
      let queryConc = supabase
        .from("conciliaciones")
        .select(
          "id_conciliacion, tipo_conciliacion, total_final, total_horas, total_dias, fecha_generacion, folio, id_obra, id_empresa, id_sindicato, obras:id_obra (id_obra, obra, cc), sindicatos:id_sindicato (sindicato), empresas:id_empresa (empresa)"
        )
        .neq("id_obra", 14)
        .neq("id_empresa", 4);

      // Filtro por obras si es residente
      if (esResidente && idObrasAsignadas.length > 0) {
        queryConc = queryConc.in("id_obra", idObrasAsignadas);
      }

      const { data: conciliaciones, error: errorConc } = await queryConc;
      if (errorConc) throw errorConc;

      setRawConciliaciones(conciliaciones || []);

      // Mapa conciliación completa (compartido por material y renta)
      const concMap = {};
      (conciliaciones || []).forEach((c) => { concMap[c.id_conciliacion] = c; });

      // ── Vales de material ────────────────────────────────────────────
      const concMaterialIds = (conciliaciones || [])
        .filter((c) => c.tipo_conciliacion === "material")
        .map((c) => c.id_conciliacion);

      if (concMaterialIds.length > 0) {
        // Query B: vales ligados a conciliaciones de material
        const { data: cvData, error: errorCv } = await supabase
          .from("conciliacion_vales")
          .select("id_vale, id_conciliacion")
          .in("id_conciliacion", concMaterialIds);

        if (errorCv) throw errorCv;

        const valeConc = {};
        (cvData || []).forEach((cv) => { valeConc[cv.id_vale] = concMap[cv.id_conciliacion]; });
        setValeAConciliacion(valeConc);

        const valeIds = [...new Set((cvData || []).map((cv) => cv.id_vale))];

        if (valeIds.length > 0) {
          // Query C: vales con todos los campos para filtros y agregación
          const { data: vales, error: errorVales } = await supabase
            .from("vales")
            .select(`
              id_vale, id_obra, id_empresa, id_operador, id_persona_creador, id_persona_verificador, id_vehiculo,
              obras:id_obra (id_obra, obra, cc, empresas:id_empresa (id_empresa, empresa)),
              operadores:id_operador (id_operador, id_sindicato, nombre_completo, sindicatos:id_sindicato (id_sindicato, sindicato)),
              vehiculos:id_vehiculo (id_vehiculo, placas),
              persona_creador:id_persona_creador (nombre, primer_apellido),
              persona_verificador:id_persona_verificador (nombre, primer_apellido),
              vale_material_detalles (
                id_detalle_material, volumen_real_m3, costo_total, id_banco, id_sindicato,
                bancos:id_banco (id_banco, banco),
                sindicatos:id_sindicato (id_sindicato, sindicato),
                material:id_material (
                  id_material, material,
                  tipo_de_material:id_tipo_de_material (id_tipo_de_material, tipo_de_material)
                ),
                vale_material_viajes (
                  id_viaje, volumen_m3, hora_registro, id_persona_registro,
                  persona_registro:id_persona_registro (nombre, primer_apellido)
                )
              ),
              tickets_material (id_ticket)
            `)
            .in("id_vale", valeIds);

          if (errorVales) throw errorVales;
          setRawVales(vales || []);
        } else {
          setRawVales([]);
        }
      } else {
        setRawVales([]);
        setValeAConciliacion({});
      }

      // ── Vales de renta ─────────────────────────────────────────────────
      const concRentaIds = (conciliaciones || [])
        .filter((c) => c.tipo_conciliacion === "renta")
        .map((c) => c.id_conciliacion);

      if (concRentaIds.length > 0) {
        const { data: cvRentaData, error: errorCvRenta } = await supabase
          .from("conciliacion_vales")
          .select("id_vale, id_conciliacion")
          .in("id_conciliacion", concRentaIds);

        if (errorCvRenta) throw errorCvRenta;

        const rentaConc = {};
        (cvRentaData || []).forEach((cv) => { rentaConc[cv.id_vale] = concMap[cv.id_conciliacion]; });
        setValeRentaAConciliacion(rentaConc);

        const rentaValeIds = [...new Set((cvRentaData || []).map((cv) => cv.id_vale))];

        if (rentaValeIds.length > 0) {
          const { data: rentaVales, error: errorRentaVales } = await supabase
            .from("vales")
            .select(`
              id_vale, id_obra, id_empresa,
              obras:id_obra (id_obra, obra, cc, empresas:id_empresa (id_empresa, empresa)),
              vehiculos:id_vehiculo (id_vehiculo, capacidad_m3),
              vale_renta_detalle (
                id_vale_renta_detalle, hora_inicio, total_horas, total_dias, numero_viajes, costo_total,
                material:id_material (id_material, material),
                vale_renta_viajes (id_viaje, hora_registro)
              )
            `)
            .in("id_vale", rentaValeIds);

          if (errorRentaVales) throw errorRentaVales;
          setRawValesRenta(rentaVales || []);
        } else {
          setRawValesRenta([]);
        }
      } else {
        setRawValesRenta([]);
        setValeRentaAConciliacion({});
      }

      setEstadisticasCargadas(true);
    } catch (err) {
      console.error("Error en fetchEstadisticas:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [esResidente, idObrasAsignadas]);

  // 4. Carga perezosa: solo dispara la consulta la primera vez que alguna
  // sección que la necesita se despliega. Ignora llamadas repetidas mientras
  // ya está cargada o en curso.
  const garantizarEstadisticas = useCallback(() => {
    if (estadisticasCargadas || loading) return Promise.resolve();
    return fetchEstadisticas();
  }, [estadisticasCargadas, loading, fetchEstadisticas]);

  // 5. Fetch presupuestos (independiente de conciliaciones)
  const fetchPresupuestos = useCallback(async () => {
    try {
      setLoadingPresupuestos(true);
      let queryPresupuestoMat = supabase
        .from("presupuesto_material_obra")
        .select(`
          id, id_obra, id_material, m3_presupuestados, m3_consumidos,
          obras:id_obra (id_obra, obra, cc, empresas:id_empresa (id_empresa, empresa)),
          material:id_material (
            id_material, material,
            tipo_de_material:id_tipo_de_material (id_tipo_de_material, tipo_de_material)
          )
        `)
        .eq("activo", true)
        .neq("id_obra", 14);

      let queryPresupuestoRenta = supabase
        .from("presupuesto_renta_obra")
        .select(`
          id, id_obra, monto_presupuestado, monto_consumido,
          obras:id_obra (id_obra, obra, cc, empresas:id_empresa (id_empresa, empresa))
        `)
        .eq("activo", true)
        .neq("id_obra", 14);

      // Filtro por obras si es residente
      if (esResidente && idObrasAsignadas.length > 0) {
        queryPresupuestoMat = queryPresupuestoMat.in("id_obra", idObrasAsignadas);
        queryPresupuestoRenta = queryPresupuestoRenta.in("id_obra", idObrasAsignadas);
      }

      const [{ data: pMat, error: eMat }, { data: pRenta, error: eRenta }] =
        await Promise.all([
          queryPresupuestoMat,
          queryPresupuestoRenta,
        ]);
      if (eMat) throw eMat;
      if (eRenta) throw eRenta;
      setPresupuestosMaterial(pMat || []);
      setPresupuestosRenta(pRenta || []);
      setPresupuestosCargados(true);
    } catch (err) {
      console.error("Error en fetchPresupuestos:", err);
    } finally {
      setLoadingPresupuestos(false);
    }
  }, [esResidente, idObrasAsignadas]);

  const garantizarPresupuestos = useCallback(() => {
    if (presupuestosCargados || loadingPresupuestos) return Promise.resolve();
    return fetchPresupuestos();
  }, [presupuestosCargados, loadingPresupuestos, fetchPresupuestos]);

  // ── Fetch independiente: vales en tiempo real para "Desglose por Obra" ──
  // No pasa por conciliaciones/conciliacion_vales. Incluye vales aún no
  // conciliados. Aislado de fetchEstadisticas: un fallo aquí no debe afectar
  // KPIs, gráficas ni tops (que siguen siendo 100% conciliaciones).
  const fetchValesTiempoReal = useCallback(async () => {
    try {
      setLoadingTiempoReal(true);
      setErrorTiempoReal(null);

      let queryValesTR = supabase
        .from("vales")
        .select(`
          id_vale, folio, tipo_vale, estado, fecha_creacion, id_obra, id_empresa, id_vehiculo,
          obras:id_obra (id_obra, obra, cc, empresas:id_empresa (id_empresa, empresa)),
          vehiculos:id_vehiculo (id_vehiculo, placas, capacidad_m3),
          operadores:id_operador (id_operador, id_sindicato, nombre_completo),
          vale_material_detalles (
            id_detalle_material, volumen_real_m3, costo_total, id_banco,
            distancia_km, precio_m3, id_precios_material, id_precios_material_obra, id_sindicato,
            foto_omitida, es_planta_asfaltos,
            bancos:id_banco (id_banco, banco),
            sindicatos:id_sindicato (id_sindicato, sindicato),
            material:id_material (
              id_material, material,
              tipo_de_material:id_tipo_de_material (id_tipo_de_material, tipo_de_material)
            ),
            precios_material:id_precios_material (
              id_precios_material, numero_de_intervalos,
              primer_km, km_sub_int1, limite_int1, km_sub_int2, limite_int2
            ),
            precios_material_obra:id_precios_material_obra (
              id_precios_material_obra, numero_de_intervalos,
              primer_km, km_sub_int1, limite_int1, km_sub_int2, limite_int2
            ),
            vale_material_viajes (
              id_viaje, hora_registro, volumen_m3,
              precio_m3, costo_viaje, id_precios_material, id_precios_material_obra,
              id_banco_override, distancia_km_override,
              precio_m3_override, costo_viaje_override,
              registro_anticipado, motivo_anticipado_codigo, foto_omitida,
              bancos_override:id_banco_override (id_banco, banco),
              precios_material:id_precios_material (
                id_precios_material, numero_de_intervalos,
                primer_km, km_sub_int1, limite_int1, km_sub_int2, limite_int2
              ),
              precios_material_obra:id_precios_material_obra (
                id_precios_material_obra, numero_de_intervalos,
                primer_km, km_sub_int1, limite_int1, km_sub_int2, limite_int2
              )
            )
          ),
          tickets_material (id_ticket),
          vale_renta_detalle (
            id_vale_renta_detalle, total_dias, total_horas, numero_viajes, costo_total, capacidad_m3,
            notas_adicionales,
            material:id_material (
              id_material, material,
              tipo_de_material:id_tipo_de_material (id_tipo_de_material, tipo_de_material)
            ),
            vale_renta_viajes (id_viaje)
          )
        `)
        .neq("id_obra", 14)
        .neq("id_empresa", 4)
        .not("estado", "in", "(borrador,cancelado)");

      // Filtro por obras si es residente
      if (esResidente && idObrasAsignadas.length > 0) {
        queryValesTR = queryValesTR.in("id_obra", idObrasAsignadas);
      }

      const { data, error } = await queryValesTR.limit(20000);

      if (error) throw error;
      setRawValesTiempoReal(data || []);
      setTiempoRealCargado(true);
    } catch (err) {
      console.error("Error en fetchValesTiempoReal:", err);
      setErrorTiempoReal(err.message);
      setRawValesTiempoReal([]);
    } finally {
      setLoadingTiempoReal(false);
    }
  }, [esResidente, idObrasAsignadas]);

  const garantizarTiempoReal = useCallback(() => {
    if (tiempoRealCargado || loadingTiempoReal) return Promise.resolve();
    return fetchValesTiempoReal();
  }, [tiempoRealCargado, loadingTiempoReal, fetchValesTiempoReal]);

  const seleccionarPeriodoTiempoReal = useCallback((periodo) => {
    setPeriodoTiempoReal(periodo);
  }, []);

  const seleccionarSemanaTiempoReal = useCallback((semanaKey) => {
    setSemanaTiempoReal(semanaKey);
    setPeriodoTiempoReal("semana");
  }, []);

  // ── Opciones de semana disponibles para el selector de "Desglose por Obra — Hoy" ──
  const opcionesSemanasTiempoReal = useMemo(() => {
    const set = new Set();
    rawValesTiempoReal.forEach((v) => {
      const key = getWeekKey(v.fecha_creacion);
      if (key) set.add(key);
    });
    if (!set.has(semanaTiempoReal)) set.add(semanaTiempoReal);
    return [...set].sort().reverse();
  }, [rawValesTiempoReal, semanaTiempoReal]);

  // ── Opciones de filtros (derivadas) ────────────────────────────────
  const opcionesMeses = useMemo(() => {
    const set = new Set();
    rawConciliaciones.forEach((c) => {
      if (c.fecha_generacion) set.add(c.fecha_generacion.substring(0, 7));
    });
    return [...set].sort().reverse();
  }, [rawConciliaciones]);

  const opcionesSemanas = useMemo(() => {
    const set = new Set();
    rawConciliaciones.forEach((c) => {
      const key = getWeekKey(c.fecha_generacion);
      if (key) set.add(key);
    });
    return [...set].sort().reverse();
  }, [rawConciliaciones]);

  const opcionesObras = useMemo(() => {
    const map = {};
    rawVales.forEach((v) => {
      if (v.obras) map[v.obras.id_obra] = { obra: v.obras.obra, cc: v.obras.cc ?? null };
    });
    return Object.entries(map)
      .map(([id, { obra, cc }]) => ({
        id,
        nombre: cc != null ? `CC ${cc} · ${obra}` : obra,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true }));
  }, [rawVales]);

  // ── Conciliaciones por obra, agrupadas por tipo de material y, dentro de
  // cada tipo, por material puntual (para la lista de vínculos de la
  // sección de Ahorro del PDF) — todo el histórico, sin filtro de
  // mes/semana (igual que Material vs Tiempo/Tendencias, ver línea ~1246),
  // porque la idea es listar "todas las conciliaciones de la obra".
  // Material sale de `rawVales`/`valeAConciliacion` (solo vales de material
  // que sí pertenecen a una conciliación); renta sale directo de
  // `rawConciliaciones` y no tiene material, va en su propio grupo "Renta"
  // sin subdivisión. Forma: { [obraId]: { obraNombre, grupos: { [tipoNombre]:
  // { [materialNombre]: [{folio, fecha, numero}] } } } }. ─────────────────
  const conciliacionesPorObraTipo = useMemo(() => {
    const resultado = {};
    const addItem = (obraId, obraNombre, tipoNombre, materialNombre, folio, fecha) => {
      if (!obraId || !folio) return;
      if (!resultado[obraId]) resultado[obraId] = { obraNombre, grupos: {} };
      if (!resultado[obraId].grupos[tipoNombre]) resultado[obraId].grupos[tipoNombre] = {};
      const materialKey = materialNombre || tipoNombre;
      if (!resultado[obraId].grupos[tipoNombre][materialKey]) resultado[obraId].grupos[tipoNombre][materialKey] = [];
      resultado[obraId].grupos[tipoNombre][materialKey].push({ folio, fecha });
    };

    // Material: agrupar por conciliación los pares (tipo, material) que toca.
    const paresPorConciliacion = {};
    rawVales.forEach((vale) => {
      const conc = valeAConciliacion[vale.id_vale];
      if (!conc || conc.tipo_conciliacion !== "material") return;
      if (!paresPorConciliacion[conc.id_conciliacion]) {
        paresPorConciliacion[conc.id_conciliacion] = { conc, pares: new Set() };
      }
      (vale.vale_material_detalles || []).forEach((det) => {
        const tipoNombre = det.material?.tipo_de_material?.tipo_de_material;
        const materialNombre = det.material?.material;
        if (tipoNombre && materialNombre) {
          paresPorConciliacion[conc.id_conciliacion].pares.add(`${tipoNombre} ${materialNombre}`);
        }
      });
    });
    Object.values(paresPorConciliacion).forEach(({ conc, pares }) => {
      pares.forEach((par) => {
        const [tipoNombre, materialNombre] = par.split(" ");
        addItem(conc.id_obra, conc.obras?.obra || "Sin obra", tipoNombre, materialNombre, conc.folio, conc.fecha_generacion);
      });
    });

    // Renta: sin material, un solo grupo "Renta" sin subdivisión.
    rawConciliaciones
      .filter((c) => c.tipo_conciliacion === "renta")
      .forEach((c) => addItem(c.id_obra, c.obras?.obra || "Sin obra", "Renta", null, c.folio, c.fecha_generacion));

    // Ordenar cada lista de material por fecha y numerar (el número es el
    // que se muestra/enlaza en el PDF, reinicia en 1 por cada material).
    Object.values(resultado).forEach((obraBlock) => {
      Object.values(obraBlock.grupos).forEach((materialesMap) => {
        Object.values(materialesMap).forEach((lista) => {
          lista.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
          lista.forEach((item, i) => { item.numero = i + 1; });
        });
      });
    });

    return resultado;
  }, [rawVales, valeAConciliacion, rawConciliaciones]);

  const opcionesEmpresas = useMemo(() => {
    const map = {};
    rawVales.forEach((v) => {
      if (v.obras?.empresas) map[v.obras.empresas.id_empresa] = v.obras.empresas.empresa;
    });
    return Object.entries(map).map(([id, nombre]) => ({ id, nombre }));
  }, [rawVales]);

  const opcionesSindicatos = useMemo(() => {
    const map = {};
    rawVales.forEach((v) => {
      if (v.operadores?.sindicatos) {
        map[v.operadores.sindicatos.id_sindicato] = v.operadores.sindicatos.sindicato;
      }
    });
    return Object.entries(map)
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [rawVales]);

  const opcionesMateriales = useMemo(() => {
    const set = new Set();
    rawVales.forEach((v) => {
      (v.vale_material_detalles || []).forEach((d) => {
        if (d.material?.material) set.add(d.material.material);
      });
    });
    return [...set].sort();
  }, [rawVales]);

  const opcionesBancos = useMemo(() => {
    const map = {};
    rawVales.forEach((v) => {
      (v.vale_material_detalles || []).forEach((d) => {
        if (d.bancos) map[d.bancos.id_banco] = d.bancos.banco;
      });
    });
    return Object.entries(map)
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [rawVales]);

  const opcionesTipoMaterial = useMemo(() => {
    const map = {};
    rawVales.forEach((v) => {
      (v.vale_material_detalles || []).forEach((d) => {
        const tipoId = d.material?.tipo_de_material?.id_tipo_de_material;
        if (tipoId == null) return;
        map[tipoId] = d.material.tipo_de_material.tipo_de_material || NOMBRE_TIPO_FALLBACK[tipoId] || "Sin clasificar";
      });
    });
    return Object.entries(map)
      .map(([id, nombre]) => ({ id: Number(id), nombre }))
      .sort((a, b) => {
        const ia = ORDEN_TIPOS_MATERIAL.indexOf(a.id);
        const ib = ORDEN_TIPOS_MATERIAL.indexOf(b.id);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
  }, [rawVales]);

  // ── Vales filtrados (nivel vale: mes, semana, obra, empresa, sindicato) ──
  const valesFiltrados = useMemo(() => {
    return rawVales.filter((vale) => {
      if (vale.id_obra === 14 || Number(vale.id_empresa) === 4) return false;
      const conc = valeAConciliacion[vale.id_vale];

      if (!matchesFiltro(filtros.mes, conc?.fecha_generacion?.substring(0, 7), modosFiltro.mes)) return false;
      if (!matchesFiltro(filtros.semana, getWeekKey(conc?.fecha_generacion), modosFiltro.semana)) return false;
      if (!matchesFiltro(filtros.idObra, vale.id_obra, modosFiltro.idObra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa, modosFiltro.idEmpresa)) return false;
      if (!matchesFiltro(filtros.idSindicato, vale.operadores?.id_sindicato, modosFiltro.idSindicato)) return false;

      return true;
    });
  }, [rawVales, filtros, modosFiltro, valeAConciliacion]);

  // ── Función de agregación (reutilizable) ───────────────────────────
  const agregarPorMaterial = useCallback((vales, filtroMaterial, filtroBanco, modoMaterial = "incluir", modoBanco = "incluir") => {
    const stats = {};
    vales.forEach((vale) => {
      (vale.vale_material_detalles || []).forEach((det) => {
        const nombre = det.material?.material || "Sin clasificar";
        const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;

        if (!matchesFiltro(filtroMaterial, nombre, modoMaterial)) return;
        if (!matchesFiltro(filtroBanco, det.id_banco, modoBanco)) return;

        if (!stats[nombre]) {
          stats[nombre] = { material: nombre, m3Total: 0, valesIds: new Set(), totalViajes: 0, importeIVA: 0 };
        }
        const s = stats[nombre];
        s.valesIds.add(vale.id_vale);
        // Flota propia (GRUPO GEEM): sí cuenta en m³/viajes/vales, pero su
        // costo_total es el $1/km técnico ficticio — no se suma como dinero.
        if (!esFlotaPropia(det.sindicatos?.sindicato)) {
          s.importeIVA += Number(det.costo_total || 0) * 1.16;
        }

        if (tipoId === 3) {
          s.m3Total += Number(det.volumen_real_m3 || 0);
          s.totalViajes += vale.tickets_material?.length || 0;
        } else {
          const viajes = det.vale_material_viajes || [];
          if (viajes.length > 0) {
            viajes.forEach((v) => { s.m3Total += Number(v.volumen_m3 || 0); });
            s.totalViajes += viajes.length;
          } else {
            // Tipo 2 (Base/Carpeta Asfáltica): 1 vale = 1 viaje capturado directo
            // en el detalle, sin filas en vale_material_viajes → usar volumen_real_m3.
            s.m3Total += Number(det.volumen_real_m3 || 0);
            s.totalViajes += (det.volumen_real_m3 != null || det.costo_total != null) ? 1 : 0;
          }
        }
      });
    });
    return Object.values(stats)
      .map((s) => ({ ...s, valesCount: s.valesIds.size }))
      .sort((a, b) => b.m3Total - a.m3Total);
  }, []);

  // ── Tabla material filtrada ─────────────────────────────────────────
  const tablaMaterial = useMemo(
    () => agregarPorMaterial(valesFiltrados, filtros.material, filtros.idBanco, modosFiltro.material, modosFiltro.idBanco),
    [valesFiltrados, filtros.material, filtros.idBanco, modosFiltro.material, modosFiltro.idBanco, agregarPorMaterial]
  );

  // ── Resumen KPIs ────────────────────────────────────────────────────
  const resumen = useMemo(() => {
    let concsFiltradas = rawConciliaciones.filter((c) => c.id_obra !== 14 && Number(c.id_empresa) !== 4);
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.mes, c.fecha_generacion?.substring(0, 7), modosFiltro.mes));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.semana, getWeekKey(c.fecha_generacion), modosFiltro.semana));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idObra, c.id_obra, modosFiltro.idObra));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idEmpresa, c.id_empresa, modosFiltro.idEmpresa));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idSindicato, c.id_sindicato, modosFiltro.idSindicato));

    let totalHorasRenta = 0;
    let totalDiasRenta = 0;
    concsFiltradas.forEach((c) => {
      if (c.tipo_conciliacion === "renta") {
        totalHorasRenta += Number(c.total_horas || 0);
        totalDiasRenta += Number(c.total_dias || 0);
      }
    });

    // Importe siempre desde datos filtrados de material
    const totalImporte = tablaMaterial.reduce((sum, r) => sum + r.importeIVA, 0) ||
      concsFiltradas.reduce((sum, c) => sum + Number(c.total_final || 0), 0);

    return {
      totalImporte,
      totalHorasRenta,
      totalDiasRenta,
      totalConciliaciones: concsFiltradas.length,
    };
  }, [
    rawConciliaciones,
    filtros.mes,
    filtros.semana,
    filtros.idObra,
    filtros.idEmpresa,
    filtros.idSindicato,
    modosFiltro.mes,
    modosFiltro.semana,
    modosFiltro.idObra,
    modosFiltro.idEmpresa,
    modosFiltro.idSindicato,
    tablaMaterial,
  ]);

  // ── Conciliaciones por mes (para la sección de Ahorro del PDF) ──────
  // Mismo criterio de filtrado que `resumen.totalConciliaciones` — respeta
  // mes/semana/obra/empresa/sindicato.
  const serieConciliacionesPorMes = useMemo(() => {
    let concsFiltradas = rawConciliaciones.filter((c) => c.id_obra !== 14 && Number(c.id_empresa) !== 4);
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.mes, c.fecha_generacion?.substring(0, 7), modosFiltro.mes));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.semana, getWeekKey(c.fecha_generacion), modosFiltro.semana));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idObra, c.id_obra, modosFiltro.idObra));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idEmpresa, c.id_empresa, modosFiltro.idEmpresa));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idSindicato, c.id_sindicato, modosFiltro.idSindicato));

    const porMes = {};
    concsFiltradas.forEach((c) => {
      if (!c.fecha_generacion) return;
      const mes = c.fecha_generacion.substring(0, 7);
      porMes[mes] = (porMes[mes] || 0) + 1;
    });

    const meses = Object.keys(porMes).sort();
    if (meses.length === 0) return { data: [] };

    // Rellenar meses sin conciliaciones entre el primero y el último.
    const [anioIni, mesIni] = meses[0].split("-").map(Number);
    const [anioFin, mesFin] = meses[meses.length - 1].split("-").map(Number);
    const data = [];
    let y = anioIni, m = mesIni;
    while (y < anioFin || (y === anioFin && m <= mesFin)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      data.push({ mes: key, conciliaciones: porMes[key] || 0 });
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    return { data };
  }, [rawConciliaciones, filtros, modosFiltro]);

  // ── Última conciliación ─────────────────────────────────────────────
  const ultimaConciliacion = useMemo(() => {
    return rawConciliaciones.reduce(
      (ultima, c) =>
        !ultima || new Date(c.fecha_generacion) > new Date(ultima.fecha_generacion) ? c : ultima,
      null
    );
  }, [rawConciliaciones]);

  // ── Series de tiempo (gráfica) ─ respeta filtros excepto mes/semana ─
  const seriesTiempo = useMemo(() => {
    const valesSinTiempo = rawVales.filter((vale) => {
      if (!matchesFiltro(filtros.idObra, vale.id_obra, modosFiltro.idObra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa, modosFiltro.idEmpresa)) return false;
      if (!matchesFiltro(filtros.idSindicato, vale.operadores?.id_sindicato, modosFiltro.idSindicato)) return false;
      return true;
    });

    const byMesMat = {};
    const totalPorMat = {};
    const tipoPorMat = {};

    valesSinTiempo.forEach((vale) => {
      const conc = valeAConciliacion[vale.id_vale];
      if (!conc?.fecha_generacion) return;
      const mes = conc.fecha_generacion.substring(0, 7);

      (vale.vale_material_detalles || []).forEach((det) => {
        const mat = det.material?.material || "Sin clasificar";
        const tipoId = det.material?.tipo_de_material?.id_tipo_de_material ?? null;
        const tipoNombre = det.material?.tipo_de_material?.tipo_de_material || null;

        if (!matchesFiltro(filtros.material, mat, modosFiltro.material)) return;
        if (!matchesFiltro(filtros.idBanco, det.id_banco, modosFiltro.idBanco)) return;

        if (!tipoPorMat[mat]) tipoPorMat[mat] = { tipoId, tipoNombre };

        let m3 = 0;
        let viajes = 0;
        if (tipoId === 3) {
          m3 = Number(det.volumen_real_m3 || 0);
          viajes = vale.tickets_material?.length || 0;
        } else {
          const vjs = det.vale_material_viajes || [];
          if (vjs.length > 0) {
            vjs.forEach((v) => { m3 += Number(v.volumen_m3 || 0); });
            viajes = vjs.length;
          } else {
            // Tipo 2 (Base/Carpeta Asfáltica): 1 vale = 1 viaje capturado
            // directo en el detalle, sin filas en vale_material_viajes.
            m3 = Number(det.volumen_real_m3 || 0);
            viajes = (det.volumen_real_m3 != null || det.costo_total != null) ? 1 : 0;
          }
        }

        if (!byMesMat[mes]) byMesMat[mes] = {};
        if (!byMesMat[mes][mat]) byMesMat[mes][mat] = { m3: 0, viajes: 0 };
        byMesMat[mes][mat].m3 += m3;
        byMesMat[mes][mat].viajes += viajes;

        if (!totalPorMat[mat]) totalPorMat[mat] = 0;
        totalPorMat[mat] += m3;
      });
    });

    const mesesConDatos = Object.keys(byMesMat).sort();
    // Todos los materiales con movimiento, sin recorte por volumen — un
    // top global por m³ dejaba fuera categorías de menor volumen (p.ej.
    // Base Asfáltica) frente a Materiales Pétreos aunque tuvieran actividad.
    // Se agrupan por tipo (1 Pétreos, 2 Base Asfáltica, 3 Tepetate/Corte) y,
    // dentro de cada tipo, por volumen descendente.
    const materialesOrdenados = Object.entries(totalPorMat)
      .sort((a, b) => {
        const tipoA = tipoPorMat[a[0]]?.tipoId ?? null;
        const tipoB = tipoPorMat[b[0]]?.tipoId ?? null;
        const rankA = tipoA != null ? ORDEN_TIPOS_MATERIAL.indexOf(tipoA) : -1;
        const rankB = tipoB != null ? ORDEN_TIPOS_MATERIAL.indexOf(tipoB) : -1;
        const ordenA = rankA === -1 ? 99 : rankA;
        const ordenB = rankB === -1 ? 99 : rankB;
        if (ordenA !== ordenB) return ordenA - ordenB;
        return b[1] - a[1];
      })
      .map(([mat]) => mat);

    // Agrupa la lista ya ordenada por tipo, para que el PDF pueda dibujar un
    // encabezado por tipo (los materiales del mismo tipo quedan contiguos
    // gracias al orden de arriba).
    const gruposTipoMateriales = [];
    materialesOrdenados.forEach((mat) => {
      const info = tipoPorMat[mat] || {};
      const tipoId = info.tipoId ?? null;
      const tipoNombre = info.tipoNombre || NOMBRE_TIPO_FALLBACK[tipoId] || "Sin clasificar";
      const ultimo = gruposTipoMateriales[gruposTipoMateriales.length - 1];
      if (ultimo && ultimo.tipoId === tipoId) {
        ultimo.materiales.push(mat);
      } else {
        gruposTipoMateriales.push({ tipoId, tipoNombre, materiales: [mat] });
      }
    });

    // Rellena los meses sin movimiento con 0 entre el primero y el último con
    // datos, para que el eje X refleje huecos reales en vez de mostrarlos
    // como si fueran consecutivos (ej. abr-may-jul se veía seguido sin jun).
    const meses = [];
    if (mesesConDatos.length > 0) {
      const [y0, m0] = mesesConDatos[0].split("-").map(Number);
      const [y1, m1] = mesesConDatos[mesesConDatos.length - 1].split("-").map(Number);
      let y = y0, m = m0;
      while (y < y1 || (y === y1 && m <= m1)) {
        meses.push(`${y}-${String(m).padStart(2, "0")}`);
        m += 1;
        if (m > 12) { m = 1; y += 1; }
      }
    }

    const data = meses.map((mes) => {
      const row = { mes };
      materialesOrdenados.forEach((mat) => {
        row[mat] = Math.round((byMesMat[mes]?.[mat]?.m3 || 0) * 100) / 100;
      });
      return row;
    });

    const dataViajes = meses.map((mes) => {
      const row = { mes };
      materialesOrdenados.forEach((mat) => {
        row[mat] = byMesMat[mes]?.[mat]?.viajes || 0;
      });
      return row;
    });

    return { data, dataViajes, materiales: materialesOrdenados, gruposTipoMateriales };
  }, [rawVales, filtros, modosFiltro, valeAConciliacion]);

  // ── Helper: nombre completo de persona ─────────────────────────────
  const nombrePersona = (p) => p ? `${p.nombre || ""} ${p.primer_apellido || ""}`.trim() : "Sin nombre";

  // ── Helper: filtra detalles por material/banco activos ─────────────
  const detsFiltrados = useCallback((detalles) =>
    (detalles || []).filter((det) => {
      if (!matchesFiltro(filtros.material, det.material?.material, modosFiltro.material)) return false;
      if (!matchesFiltro(filtros.idBanco, det.id_banco, modosFiltro.idBanco)) return false;
      return true;
    }), [filtros.material, filtros.idBanco, modosFiltro.material, modosFiltro.idBanco]);

  // ── Top Residentes (creadores de vales) ────────────────────────────
  const topResidentes = useMemo(() => {
    const map = {};
    valesFiltrados.forEach((vale) => {
      const dets = detsFiltrados(vale.vale_material_detalles);
      if (dets.length === 0) return;
      const nombre = nombrePersona(vale.persona_creador);
      if (!map[nombre]) map[nombre] = { nombre, vales: 0, m3Total: 0 };
      map[nombre].vales += 1;
      dets.forEach((det) => {
        const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;
        if (tipoId === 3) {
          map[nombre].m3Total += Number(det.volumen_real_m3 || 0);
        } else {
          const viajes = det.vale_material_viajes || [];
          if (viajes.length > 0) {
            viajes.forEach((v) => { map[nombre].m3Total += Number(v.volumen_m3 || 0); });
          } else {
            // Tipo 2 (Base/Carpeta Asfáltica): volumen directo en el detalle.
            map[nombre].m3Total += Number(det.volumen_real_m3 || 0);
          }
        }
      });
    });
    return Object.values(map).sort((a, b) => b.vales - a.vales).slice(0, 10);
  }, [valesFiltrados, detsFiltrados]);

  // ── Top Checadores (registran viajes) ─────────────────────────────
  const topChecadores = useMemo(() => {
    const map = {};
    valesFiltrados.forEach((vale) => {
      detsFiltrados(vale.vale_material_detalles).forEach((det) => {
        (det.vale_material_viajes || []).forEach((viaje) => {
          const nombre = nombrePersona(viaje.persona_registro);
          if (!map[nombre]) map[nombre] = { nombre, viajes: 0, m3Total: 0 };
          map[nombre].viajes += 1;
          map[nombre].m3Total += Number(viaje.volumen_m3 || 0);
        });
      });
    });
    return Object.values(map).sort((a, b) => b.viajes - a.viajes).slice(0, 10);
  }, [valesFiltrados, detsFiltrados]);

  // ── Top Placas con operador ────────────────────────────────────────
  const topPlacas = useMemo(() => {
    const map = {};
    valesFiltrados.forEach((vale) => {
      const dets = detsFiltrados(vale.vale_material_detalles);
      if (dets.length === 0) return;
      const placas = vale.vehiculos?.placas;
      if (!placas) return;
      const operador = vale.operadores?.nombre_completo || "Sin operador";
      if (!map[placas]) map[placas] = { placas, operador, vales: 0, viajes: 0, m3Total: 0 };
      map[placas].vales += 1;
      dets.forEach((det) => {
        const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;
        if (tipoId === 3) {
          map[placas].viajes += vale.tickets_material?.length || 0;
          map[placas].m3Total += Number(det.volumen_real_m3 || 0);
        } else {
          const viajes = det.vale_material_viajes || [];
          if (viajes.length > 0) {
            map[placas].viajes += viajes.length;
            viajes.forEach((v) => { map[placas].m3Total += Number(v.volumen_m3 || 0); });
          } else {
            // Tipo 2 (Base/Carpeta Asfáltica): 1 vale = 1 viaje capturado
            // directo en el detalle, sin filas en vale_material_viajes.
            map[placas].viajes += (det.volumen_real_m3 != null || det.costo_total != null) ? 1 : 0;
            map[placas].m3Total += Number(det.volumen_real_m3 || 0);
          }
        }
      });
    });
    return Object.values(map).sort((a, b) => b.viajes - a.viajes).slice(0, 10);
  }, [valesFiltrados, detsFiltrados]);

  // ── Horas pico (distribución 0-23) ────────────────────────────────
  const horasPico = useMemo(() => {
    const counts = Array.from({ length: 24 }, (_, h) => ({ hora: h, viajes: 0, label: `${String(h).padStart(2, "0")}:00` }));
    valesFiltrados.forEach((vale) => {
      detsFiltrados(vale.vale_material_detalles).forEach((det) => {
        (det.vale_material_viajes || []).forEach((viaje) => {
          if (!viaje.hora_registro) return;
          const horaNum = Number(
            new Date(viaje.hora_registro).toLocaleString("es-MX", {
              timeZone: "America/Mexico_City",
              hour: "numeric",
              hour12: false,
            }).replace(/[^0-9]/g, "").slice(0, 2)
          );
          if (horaNum >= 0 && horaNum < 24) counts[horaNum].viajes += 1;
        });
      });
    });
    return counts;
  }, [valesFiltrados, detsFiltrados]);

  // ── Distribución viajes por vale ───────────────────────────────────
  const viajesPorVale = useMemo(() => {
    const buckets = { "1": 0, "2": 0, "3-4": 0, "5-6": 0, "7-10": 0, "11+": 0 };
    valesFiltrados.forEach((vale) => {
      const dets = detsFiltrados(vale.vale_material_detalles);
      if (dets.length === 0) return;
      let total = 0;
      dets.forEach((det) => {
        const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;
        total += tipoId === 3 ? (vale.tickets_material?.length || 0) : (det.vale_material_viajes?.length || 0);
      });
      if (total === 0) return;
      if (total === 1) buckets["1"] += 1;
      else if (total === 2) buckets["2"] += 1;
      else if (total <= 4) buckets["3-4"] += 1;
      else if (total <= 6) buckets["5-6"] += 1;
      else if (total <= 10) buckets["7-10"] += 1;
      else buckets["11+"] += 1;
    });
    return Object.entries(buckets).map(([rango, count]) => ({ rango, count }));
  }, [valesFiltrados, detsFiltrados]);

  // ── Rendimiento por material (usa tablaMaterial que ya filtra) ──────
  const rendimientoPorMaterial = useMemo(() => {
    return tablaMaterial
      .filter((r) => r.m3Total > 0 && r.totalViajes > 0)
      .map((r) => ({
        material: r.material.length > 18 ? r.material.slice(0, 16) + "…" : r.material,
        materialFull: r.material,
        m3PorViaje: Math.round((r.m3Total / r.totalViajes) * 100) / 100,
        viajesPorVale: r.valesCount > 0 ? Math.round((r.totalViajes / r.valesCount) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.m3PorViaje - a.m3PorViaje);
  }, [tablaMaterial]);

  // ── Tabla material agrupada por obra → materiales ──────────────────
  const tablaObraMaterial = useMemo(() => {
    const obraMap = {};

    valesFiltrados.forEach((vale) => {
      const obraId = vale.obras?.id_obra;
      if (!obraId) return;
      const obraNombre = vale.obras?.obra || "Sin obra";

      if (!obraMap[obraId]) {
        obraMap[obraId] = {
          obra: obraNombre,
          cc: vale.obras?.cc ?? null,
          empresa: vale.obras?.empresas?.empresa || null,
          matMap: {},
        };
      }

      (vale.vale_material_detalles || []).forEach((det) => {
        const nombreMat = det.material?.material || "Sin clasificar";
        const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;

        if (!matchesFiltro(filtros.material, nombreMat, modosFiltro.material)) return;
        if (!matchesFiltro(filtros.idBanco, det.id_banco, modosFiltro.idBanco)) return;

        if (!obraMap[obraId].matMap[nombreMat]) {
          obraMap[obraId].matMap[nombreMat] = {
            material: nombreMat, m3Total: 0, valesIds: new Set(), totalViajes: 0, importeIVA: 0,
          };
        }
        const s = obraMap[obraId].matMap[nombreMat];
        s.valesIds.add(vale.id_vale);
        // Flota propia (GRUPO GEEM): sí cuenta en m³/viajes/vales, pero su
        // costo_total es el $1/km técnico ficticio — no se suma como dinero.
        if (!esFlotaPropia(det.sindicatos?.sindicato)) {
          s.importeIVA += Number(det.costo_total || 0) * 1.16;
        }

        if (tipoId === 3) {
          s.m3Total  += Number(det.volumen_real_m3 || 0);
          s.totalViajes += vale.tickets_material?.length || 0;
        } else {
          const viajes = det.vale_material_viajes || [];
          if (viajes.length > 0) {
            viajes.forEach((v) => { s.m3Total += Number(v.volumen_m3 || 0); });
            s.totalViajes += viajes.length;
          } else {
            // Tipo 2 (Base/Carpeta Asfáltica): 1 vale = 1 viaje capturado directo
            // en el detalle, sin filas en vale_material_viajes → usar volumen_real_m3.
            s.m3Total += Number(det.volumen_real_m3 || 0);
            s.totalViajes += (det.volumen_real_m3 != null || det.costo_total != null) ? 1 : 0;
          }
        }
      });
    });

    return Object.entries(obraMap)
      .map(([, { obra, cc, empresa, matMap }]) => {
        const materiales = Object.values(matMap)
          .map((s) => ({ ...s, valesCount: s.valesIds.size }))
          .sort((a, b) => b.m3Total - a.m3Total);

        const subtotal = materiales.reduce(
          (acc, m) => ({
            m3Total:     acc.m3Total     + m.m3Total,
            valesCount:  acc.valesCount  + m.valesCount,
            totalViajes: acc.totalViajes + m.totalViajes,
            importeIVA:  acc.importeIVA  + m.importeIVA,
          }),
          { m3Total: 0, valesCount: 0, totalViajes: 0, importeIVA: 0 }
        );

        return { obra, cc, empresa, materiales, subtotal };
      })
      .sort((a, b) => b.subtotal.m3Total - a.subtotal.m3Total);
  }, [valesFiltrados, filtros.material, filtros.idBanco, modosFiltro.material, modosFiltro.idBanco]);

  // ── Desglose por obra en TIEMPO REAL (directo de vales, sin conciliaciones) ──
  // Usa fecha_creacion del vale (no fecha_generacion de conciliación). El periodo
  // (Hoy / Ayer / Semana) es local a esta sección, independiente de los chips
  // mes/semana de conciliaciones. Los demás chips (obra/empresa/sindicato/
  // material/banco) sí se comparten con el resto de la página.
  const valesTiempoRealFiltrados = useMemo(() => {
    const hoyStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    const ayerStr = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

    return rawValesTiempoReal.filter((vale) => {
      if (!vale.fecha_creacion) return false;
      const fechaValeStr = new Date(vale.fecha_creacion)
        .toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

      if (periodoTiempoReal === "hoy" && fechaValeStr !== hoyStr) return false;
      if (periodoTiempoReal === "ayer" && fechaValeStr !== ayerStr) return false;
      if (periodoTiempoReal === "semana" && getWeekKey(vale.fecha_creacion) !== semanaTiempoReal) return false;
      if (periodoTiempoReal === "rango" && !fechaEnRango(vale.fecha_creacion, rangoTiempoRealDesde, rangoTiempoRealHasta)) return false;

      if (!matchesFiltro(filtros.idObra, vale.id_obra, modosFiltro.idObra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa, modosFiltro.idEmpresa)) return false;
      if (!matchesFiltro(filtros.idSindicato, vale.operadores?.id_sindicato, modosFiltro.idSindicato)) return false;
      return true;
    });
  }, [rawValesTiempoReal, filtros, modosFiltro, periodoTiempoReal, semanaTiempoReal, rangoTiempoRealDesde, rangoTiempoRealHasta]);

  const valesTiempoRealMaterial = useMemo(
    () => valesTiempoRealFiltrados.filter((v) => v.tipo_vale === "material"),
    [valesTiempoRealFiltrados]
  );

  const valesTiempoRealRenta = useMemo(
    () => valesTiempoRealFiltrados.filter((v) => v.tipo_vale === "renta"),
    [valesTiempoRealFiltrados]
  );

  // ── Tabla material agrupada por obra (tiempo real) ──────────────────
  // Duplica intencionalmente la lógica de tablaObraMaterial: así no se toca
  // ninguna línea del código existente que alimenta KPIs/gráficas/PDF.
  const tablaObraMaterialTiempoReal = useMemo(() => {
    const obraMap = {};
    valesTiempoRealMaterial.forEach((vale) => {
      const obraId = vale.obras?.id_obra;
      if (!obraId) return;
      const obraNombre = vale.obras?.obra || "Sin obra";

      if (!obraMap[obraId]) {
        obraMap[obraId] = {
          obra: obraNombre,
          cc: vale.obras?.cc ?? null,
          empresa: vale.obras?.empresas?.empresa || null,
          matMap: {},
        };
      }

      (vale.vale_material_detalles || []).forEach((det) => {
        const nombreMat = det.material?.material || "Sin clasificar";
        const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;

        if (!matchesFiltro(filtros.material, nombreMat, modosFiltro.material)) return;
        if (!matchesFiltro(filtros.idBanco, det.id_banco, modosFiltro.idBanco)) return;

        if (!obraMap[obraId].matMap[nombreMat]) {
          obraMap[obraId].matMap[nombreMat] = {
            material: nombreMat, m3Total: 0, valesIds: new Set(), totalViajes: 0, importeIVA: 0,
          };
        }
        const s = obraMap[obraId].matMap[nombreMat];
        s.valesIds.add(vale.id_vale);
        // Flota propia (GRUPO GEEM): sí cuenta en m³/viajes/vales, pero su
        // costo_total es el $1/km técnico ficticio — no se suma como dinero.
        if (!esFlotaPropia(det.sindicatos?.sindicato)) {
          s.importeIVA += Number(det.costo_total || 0) * 1.16;
        }

        if (tipoId === 3) {
          s.m3Total += Number(det.volumen_real_m3 || 0);
          s.totalViajes += vale.tickets_material?.length || 0;
        } else {
          const viajes = det.vale_material_viajes || [];
          if (viajes.length > 0) {
            viajes.forEach((v) => { s.m3Total += Number(v.volumen_m3 || 0); });
            s.totalViajes += viajes.length;
          } else {
            // Tipo 2 (Base/Carpeta Asfáltica): 1 vale = 1 viaje capturado directo
            // en el detalle, sin filas en vale_material_viajes → usar volumen_real_m3.
            s.m3Total += Number(det.volumen_real_m3 || 0);
            s.totalViajes += (det.volumen_real_m3 != null || det.costo_total != null) ? 1 : 0;
          }
        }
      });
    });

    return Object.entries(obraMap)
      .map(([, { obra, cc, empresa, matMap }]) => {
        const materiales = Object.values(matMap)
          .map((s) => ({ ...s, valesCount: s.valesIds.size }))
          .sort((a, b) => b.m3Total - a.m3Total);

        const subtotal = materiales.reduce(
          (acc, m) => ({
            m3Total:     acc.m3Total     + m.m3Total,
            valesCount:  acc.valesCount  + m.valesCount,
            totalViajes: acc.totalViajes + m.totalViajes,
            importeIVA:  acc.importeIVA  + m.importeIVA,
          }),
          { m3Total: 0, valesCount: 0, totalViajes: 0, importeIVA: 0 }
        );

        return { obra, cc, empresa, materiales, subtotal };
      })
      .sort((a, b) => b.subtotal.m3Total - a.subtotal.m3Total);
  }, [valesTiempoRealMaterial, filtros.material, filtros.idBanco, modosFiltro.material, modosFiltro.idBanco]);

  // ── Tabla renta agrupada por obra (tiempo real) ─────────────────────
  // Importe SIN IVA ni retención: la retención 4% solo se calcula a nivel
  // conciliación, no existe como propiedad de un vale individual.
  const tablaObraRentaTiempoReal = useMemo(() => {
    const obraMap = {};
    valesTiempoRealRenta.forEach((vale) => {
      const obraId = vale.id_obra;
      if (!obraId) return;
      if (!obraMap[obraId]) {
        obraMap[obraId] = {
          obra: vale.obras?.obra || "Sin obra",
          cc: vale.obras?.cc ?? null,
          empresa: vale.obras?.empresas?.empresa || null,
          vales: 0, totalViajes: 0, totalDias: 0, totalHoras: 0, subtotalSinIva: 0,
          capacidadSuma: 0, capacidadCount: 0,
        };
      }
      const o = obraMap[obraId];
      o.vales += 1;
      (vale.vale_renta_detalle || []).forEach((det) => {
        o.totalViajes += det.vale_renta_viajes?.length > 0
          ? det.vale_renta_viajes.length
          : (det.numero_viajes || 1);
        o.totalDias  += Number(det.total_dias  || 0);
        o.totalHoras += Number(det.total_horas || 0);
        o.subtotalSinIva += Number(det.costo_total || 0);
        if (vale.vehiculos?.capacidad_m3 != null) {
          o.capacidadSuma += Number(vale.vehiculos.capacidad_m3);
          o.capacidadCount += 1;
        }
      });
    });
    return Object.values(obraMap)
      .map((row) => ({
        ...row,
        ...derivarPrecioRenta({
          capacidadSuma: row.capacidadSuma,
          capacidadCount: row.capacidadCount,
          importeTotal: row.subtotalSinIva,
          viajes: row.totalViajes,
        }),
      }))
      .sort((a, b) => b.subtotalSinIva - a.subtotalSinIva);
  }, [valesTiempoRealRenta]);

  // ── Vales acumulados (histórico total, sin filtro de periodo) ───────
  // Mismo origen que valesTiempoRealMaterial/Renta (rawValesTiempoReal ya
  // excluye borrador/cancelado y datos de prueba a nivel de query), pero
  // sin el filtro Hoy/Ayer/Semana — para el bloque "Volumen Acumulado por Obra".
  const valesAcumuladoMaterial = useMemo(
    () => rawValesTiempoReal.filter((vale) => {
      if (vale.tipo_vale !== "material") return false;
      if (!fechaEnRango(vale.fecha_creacion, rangoAcumuladoDesde, rangoAcumuladoHasta)) return false;
      if (!matchesFiltro(filtros.idObra, vale.id_obra, modosFiltro.idObra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa, modosFiltro.idEmpresa)) return false;
      if (!matchesFiltro(filtros.idSindicato, vale.operadores?.id_sindicato, modosFiltro.idSindicato)) return false;
      return true;
    }),
    [rawValesTiempoReal, filtros, modosFiltro, rangoAcumuladoDesde, rangoAcumuladoHasta]
  );

  const valesAcumuladoRenta = useMemo(
    () => rawValesTiempoReal.filter((vale) => {
      if (vale.tipo_vale !== "renta") return false;
      if (!fechaEnRango(vale.fecha_creacion, rangoAcumuladoDesde, rangoAcumuladoHasta)) return false;
      if (!matchesFiltro(filtros.idObra, vale.id_obra, modosFiltro.idObra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa, modosFiltro.idEmpresa)) return false;
      if (!matchesFiltro(filtros.idSindicato, vale.operadores?.id_sindicato, modosFiltro.idSindicato)) return false;
      return true;
    }),
    [rawValesTiempoReal, filtros, modosFiltro, rangoAcumuladoDesde, rangoAcumuladoHasta]
  );

  // ── Mapa: id_conciliacion (renta) → total de viajes ─────────────────
  const viajesPorConciliacionRenta = useMemo(() => {
    const map = {};
    rawValesRenta.forEach((vale) => {
      const conc = valeRentaAConciliacion[vale.id_vale];
      if (!conc) return;
      let viajes = 0;
      (vale.vale_renta_detalle || []).forEach((det) => {
        viajes += det.vale_renta_viajes?.length > 0
          ? det.vale_renta_viajes.length
          : (det.numero_viajes || 1);
      });
      map[conc.id_conciliacion] = (map[conc.id_conciliacion] || 0) + viajes;
    });
    return map;
  }, [rawValesRenta, valeRentaAConciliacion]);

  // ── Mapa: id_conciliacion (renta) → suma/conteo de capacidad_m3 del vehículo ──
  const capacidadPorConciliacionRenta = useMemo(() => {
    const map = {};
    rawValesRenta.forEach((vale) => {
      const conc = valeRentaAConciliacion[vale.id_vale];
      if (!conc) return;
      if (!map[conc.id_conciliacion]) map[conc.id_conciliacion] = { capacidadSuma: 0, capacidadCount: 0 };
      const m = map[conc.id_conciliacion];
      (vale.vale_renta_detalle || []).forEach(() => {
        if (vale.vehiculos?.capacidad_m3 != null) {
          m.capacidadSuma += Number(vale.vehiculos.capacidad_m3);
          m.capacidadCount += 1;
        }
      });
    });
    return map;
  }, [rawValesRenta, valeRentaAConciliacion]);

  // ── Tabla renta agrupada por obra ───────────────────────────────────
  const tablaRentaPorObra = useMemo(() => {
    let concsFiltradas = rawConciliaciones.filter(
      (c) => c.tipo_conciliacion === "renta" && c.id_obra !== 14 && Number(c.id_empresa) !== 4
    );
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.mes, c.fecha_generacion?.substring(0, 7), modosFiltro.mes));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.semana, getWeekKey(c.fecha_generacion), modosFiltro.semana));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idObra, c.id_obra, modosFiltro.idObra));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idEmpresa, c.id_empresa, modosFiltro.idEmpresa));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idSindicato, c.id_sindicato, modosFiltro.idSindicato));

    const map = {};
    concsFiltradas.forEach((c) => {
      const obraId = c.id_obra;
      const obraNombre = c.obras?.obra || "Sin obra";
      if (!map[obraId]) {
        map[obraId] = {
          obra: obraNombre,
          cc: c.obras?.cc ?? null,
          empresa: c.empresas?.empresa || null,
          conciliaciones: 0,
          totalViajes: 0,
          totalDias: 0,
          totalHoras: 0,
          importeTotal: 0,
          capacidadSuma: 0,
          capacidadCount: 0,
          conciliacionesArr: [],
        };
      }
      map[obraId].conciliaciones += 1;
      map[obraId].totalViajes += viajesPorConciliacionRenta[c.id_conciliacion] || 0;
      map[obraId].totalDias  += Number(c.total_dias  || 0);
      map[obraId].totalHoras += Number(c.total_horas || 0);
      map[obraId].importeTotal += Number(c.total_final || 0);
      const cap = capacidadPorConciliacionRenta[c.id_conciliacion];
      if (cap) {
        map[obraId].capacidadSuma += cap.capacidadSuma;
        map[obraId].capacidadCount += cap.capacidadCount;
      }
      map[obraId].conciliacionesArr.push(c);
    });

    return Object.values(map)
      .map((row) => ({
        ...row,
        ...derivarPrecioRenta({
          capacidadSuma: row.capacidadSuma,
          capacidadCount: row.capacidadCount,
          importeTotal: row.importeTotal,
          viajes: row.totalViajes,
        }),
      }))
      .sort((a, b) => b.importeTotal - a.importeTotal);
  }, [rawConciliaciones, filtros, modosFiltro, viajesPorConciliacionRenta, capacidadPorConciliacionRenta]);

  // ── Presupuestos filtrados ─────────────────────────────────────────
  const presupuestosMaterialFiltrados = useMemo(
    () => presupuestosMaterial.filter(
      (p) =>
        matchesFiltro(filtros.idObra, p.id_obra, modosFiltro.idObra) &&
        matchesFiltro(filtros.idEmpresa, p.obras?.empresas?.id_empresa, modosFiltro.idEmpresa) &&
        matchesFiltro(filtros.material, p.material?.material, modosFiltro.material) &&
        Number(p.obras?.empresas?.id_empresa) !== 4
    ),
    [presupuestosMaterial, filtros.idObra, filtros.idEmpresa, filtros.material, modosFiltro.idObra, modosFiltro.idEmpresa, modosFiltro.material]
  );

  const presupuestosRentaFiltrados = useMemo(
    () => presupuestosRenta.filter(
      (p) =>
        matchesFiltro(filtros.idObra, p.id_obra, modosFiltro.idObra) &&
        matchesFiltro(filtros.idEmpresa, p.obras?.empresas?.id_empresa, modosFiltro.idEmpresa) &&
        Number(p.obras?.empresas?.id_empresa) !== 4
    ),
    [presupuestosRenta, filtros.idObra, filtros.idEmpresa, modosFiltro.idObra, modosFiltro.idEmpresa]
  );

  // ── Mapas de presupuesto para cruce O(1) con el acumulado histórico ──
  const presupuestoMaterialMap = useMemo(() => {
    const map = {};
    presupuestosMaterialFiltrados.forEach((p) => {
      map[`${p.id_obra}::${p.id_material}`] = Number(p.m3_presupuestados || 0);
    });
    return map;
  }, [presupuestosMaterialFiltrados]);

  const presupuestoRentaMap = useMemo(() => {
    const map = {};
    presupuestosRentaFiltrados.forEach((p) => {
      map[p.id_obra] = Number(p.monto_presupuestado || 0);
    });
    return map;
  }, [presupuestosRentaFiltrados]);

  // ── Tabla material agrupada por obra (acumulado histórico) ─────────
  // Duplica intencionalmente la lógica de tablaObraMaterialTiempoReal, para
  // no arriesgar los cálculos existentes. Agrega comparación vs presupuesto.
  const tablaObraMaterialAcumulado = useMemo(() => {
    const obraMap = {};
    valesAcumuladoMaterial.forEach((vale) => {
      const obraId = vale.obras?.id_obra;
      if (!obraId) return;
      const obraNombre = vale.obras?.obra || "Sin obra";

      if (!obraMap[obraId]) {
        obraMap[obraId] = {
          obra: obraNombre,
          cc: vale.obras?.cc ?? null,
          empresa: vale.obras?.empresas?.empresa || null,
          matMap: {},
        };
      }

      (vale.vale_material_detalles || []).forEach((det) => {
        const nombreMat = det.material?.material || "Sin clasificar";
        const idMaterial = det.material?.id_material ?? null;
        const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;

        if (!matchesFiltro(filtros.material, nombreMat, modosFiltro.material)) return;
        if (!matchesFiltro(filtros.idBanco, det.id_banco, modosFiltro.idBanco)) return;

        if (!obraMap[obraId].matMap[nombreMat]) {
          obraMap[obraId].matMap[nombreMat] = {
            material: nombreMat, idMaterial, m3Total: 0, valesIds: new Set(), totalViajes: 0, importeIVA: 0,
          };
        }
        const s = obraMap[obraId].matMap[nombreMat];
        s.valesIds.add(vale.id_vale);
        // Flota propia (GRUPO GEEM): sí cuenta en m³/viajes/vales, pero su
        // costo_total es el $1/km técnico ficticio — no se suma como dinero.
        if (!esFlotaPropia(det.sindicatos?.sindicato)) {
          s.importeIVA += Number(det.costo_total || 0) * 1.16;
        }

        if (tipoId === 3) {
          s.m3Total += Number(det.volumen_real_m3 || 0);
          s.totalViajes += vale.tickets_material?.length || 0;
        } else {
          const viajes = det.vale_material_viajes || [];
          if (viajes.length > 0) {
            viajes.forEach((v) => { s.m3Total += Number(v.volumen_m3 || 0); });
            s.totalViajes += viajes.length;
          } else {
            // Tipo 2 (Base/Carpeta Asfáltica): 1 vale = 1 viaje capturado directo
            // en el detalle, sin filas en vale_material_viajes → usar volumen_real_m3.
            s.m3Total += Number(det.volumen_real_m3 || 0);
            s.totalViajes += (det.volumen_real_m3 != null || det.costo_total != null) ? 1 : 0;
          }
        }
      });
    });

    return Object.entries(obraMap)
      .map(([obraId, { obra, cc, empresa, matMap }]) => {
        const materiales = Object.values(matMap)
          .map((s) => {
            const m3Presupuestado = s.idMaterial != null
              ? presupuestoMaterialMap[`${obraId}::${s.idMaterial}`] ?? null
              : null;
            return {
              ...s,
              valesCount: s.valesIds.size,
              m3Presupuestado,
              pctPresupuesto: m3Presupuestado ? (s.m3Total / m3Presupuestado) * 100 : null,
            };
          })
          .sort((a, b) => b.m3Total - a.m3Total);

        const subtotal = materiales.reduce(
          (acc, m) => ({
            m3Total:        acc.m3Total        + m.m3Total,
            valesCount:     acc.valesCount     + m.valesCount,
            totalViajes:    acc.totalViajes    + m.totalViajes,
            importeIVA:     acc.importeIVA     + m.importeIVA,
            m3Presupuestado: acc.m3Presupuestado + (m.m3Presupuestado || 0),
          }),
          { m3Total: 0, valesCount: 0, totalViajes: 0, importeIVA: 0, m3Presupuestado: 0 }
        );
        subtotal.pctPresupuesto = subtotal.m3Presupuestado
          ? (subtotal.m3Total / subtotal.m3Presupuestado) * 100
          : null;

        return { obra, cc, empresa, materiales, subtotal };
      })
      .sort((a, b) => b.subtotal.m3Total - a.subtotal.m3Total);
  }, [valesAcumuladoMaterial, filtros.material, filtros.idBanco, modosFiltro.material, modosFiltro.idBanco, presupuestoMaterialMap]);

  // ── Tabla renta agrupada por obra (acumulado histórico) ────────────
  // Importe SIN IVA ni retención, igual que tablaObraRentaTiempoReal.
  const tablaObraRentaAcumulado = useMemo(() => {
    const obraMap = {};
    valesAcumuladoRenta.forEach((vale) => {
      const obraId = vale.id_obra;
      if (!obraId) return;
      if (!obraMap[obraId]) {
        obraMap[obraId] = {
          obra: vale.obras?.obra || "Sin obra",
          cc: vale.obras?.cc ?? null,
          empresa: vale.obras?.empresas?.empresa || null,
          vales: 0, totalViajes: 0, totalDias: 0, totalHoras: 0, subtotalSinIva: 0,
          capacidadSuma: 0, capacidadCount: 0,
        };
      }
      const o = obraMap[obraId];
      o.vales += 1;
      (vale.vale_renta_detalle || []).forEach((det) => {
        o.totalViajes += det.vale_renta_viajes?.length > 0
          ? det.vale_renta_viajes.length
          : (det.numero_viajes || 1);
        o.totalDias  += Number(det.total_dias  || 0);
        o.totalHoras += Number(det.total_horas || 0);
        o.subtotalSinIva += Number(det.costo_total || 0);
        if (vale.vehiculos?.capacidad_m3 != null) {
          o.capacidadSuma += Number(vale.vehiculos.capacidad_m3);
          o.capacidadCount += 1;
        }
      });
    });
    return Object.entries(obraMap)
      .map(([obraId, row]) => {
        const montoPresupuestado = presupuestoRentaMap[obraId] ?? null;
        return {
          ...row,
          montoPresupuestado,
          pctPresupuesto: montoPresupuestado ? (row.subtotalSinIva / montoPresupuestado) * 100 : null,
          ...derivarPrecioRenta({
            capacidadSuma: row.capacidadSuma,
            capacidadCount: row.capacidadCount,
            importeTotal: row.subtotalSinIva,
            viajes: row.totalViajes,
          }),
        };
      })
      .sort((a, b) => b.subtotalSinIva - a.subtotalSinIva);
  }, [valesAcumuladoRenta, presupuestoRentaMap]);

  // ── Fuente del reporte PDF: vales reales filtrados por los chips globales ──
  // A diferencia de las tablas "tiempo real" (Hoy/Ayer/Semana local), esta
  // respeta los filtros de la página: mes/semana (por fecha_creacion del vale)
  // + obra/empresa/sindicato. Así el PDF agrupa según los filtros seleccionados.
  const valesReporteFiltrados = useMemo(
    () =>
      rawValesTiempoReal.filter((vale) => {
        if (!matchesFiltro(filtros.mes, vale.fecha_creacion?.substring(0, 7), modosFiltro.mes)) return false;
        if (!matchesFiltro(filtros.semana, getWeekKey(vale.fecha_creacion), modosFiltro.semana)) return false;
        if (!matchesFiltro(filtros.idObra, vale.id_obra, modosFiltro.idObra)) return false;
        if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa, modosFiltro.idEmpresa)) return false;
        if (!matchesFiltro(filtros.idSindicato, vale.operadores?.id_sindicato, modosFiltro.idSindicato)) return false;
        return true;
      }),
    [rawValesTiempoReal, filtros, modosFiltro]
  );

  const tablaObraMaterialReporte = useMemo(
    () =>
      agregarObraMaterialReal(
        valesReporteFiltrados.filter((v) => v.tipo_vale === "material"),
        filtros.material,
        filtros.idBanco,
        modosFiltro.material,
        modosFiltro.idBanco
      ),
    [valesReporteFiltrados, filtros.material, filtros.idBanco, modosFiltro.material, modosFiltro.idBanco]
  );

  const tablaObraRentaReporte = useMemo(
    () =>
      agregarObraRentaReal(valesReporteFiltrados.filter((v) => v.tipo_vale === "renta")),
    [valesReporteFiltrados]
  );

  const tablaBancoMaterialReporte = useMemo(
    () =>
      agregarBancoMaterialReal(
        valesReporteFiltrados.filter((v) => v.tipo_vale === "material"),
        filtros.material,
        filtros.idBanco,
        modosFiltro.material,
        modosFiltro.idBanco
      ),
    [valesReporteFiltrados, filtros.material, filtros.idBanco, modosFiltro.material, modosFiltro.idBanco]
  );

  // ── Ahorro estimado vs. proceso anterior en papel ────────────────────
  // `valesReporteFiltrados` ya excluye cancelado/borrador a nivel de query
  // (fetchValesTiempoReal, .not("estado", "in", "(borrador,cancelado)")).
  const ahorroEstimado = useMemo(() => {
    const materialVales = valesReporteFiltrados.filter((v) => v.tipo_vale === "material");
    const rentaVales = valesReporteFiltrados.filter((v) => v.tipo_vale === "renta");

    const totalViajesMaterial = materialVales.reduce((acc, vale) => {
      return acc + (vale.vale_material_detalles || []).reduce((sum, det) => {
        if (det.material?.tipo_de_material?.id_tipo_de_material === 3) {
          return sum + (vale.tickets_material?.length || 0);
        }
        const viajes = det.vale_material_viajes || [];
        return sum + (viajes.length > 0 ? viajes.length : ((det.volumen_real_m3 != null || det.costo_total != null) ? 1 : 0));
      }, 0);
    }, 0);
    const totalValesMaterial = materialVales.length;
    const totalValesRenta = rentaVales.length;
    const totalConciliaciones = resumen?.totalConciliaciones || 0;

    const ahorroMaterial = (totalViajesMaterial * COSTO_VALE_VIEJO_MATERIAL) - (totalValesMaterial * COSTO_TICKET_TERMICO);
    const ahorroRenta = (totalValesRenta * COSTO_VALE_VIEJO_RENTA) - (totalValesRenta * COSTO_TICKET_TERMICO);
    const ahorroConciliaciones = totalConciliaciones * COSTO_CONCILIACION_VIEJA;

    return {
      totalViajesMaterial, totalValesMaterial, totalValesRenta, totalConciliaciones,
      ahorroMaterial, ahorroRenta, ahorroConciliaciones,
      ahorroTotal: ahorroMaterial + ahorroRenta + ahorroConciliaciones,
    };
  }, [valesReporteFiltrados, resumen]);

  const hayAlertaPresupuesto = useMemo(
    () =>
      presupuestosMaterialFiltrados.some(
        (p) =>
          p.m3_presupuestados > 0 &&
          Number(p.m3_consumidos) / Number(p.m3_presupuestados) > 1
      ) ||
      presupuestosRentaFiltrados.some(
        (p) =>
          p.monto_presupuestado > 0 &&
          Number(p.monto_consumido) / Number(p.monto_presupuestado) > 1
      ),
    [presupuestosMaterialFiltrados, presupuestosRentaFiltrados]
  );

  // ── Series tiempo renta (viajes por mes × tipo de equipo) ─────────────
  // Ignora filtro mes/semana para mostrar la evolución histórica completa
  const seriesTiempoRenta = useMemo(() => {
    const valesFilt = rawValesRenta.filter((vale) => {
      if (!matchesFiltro(filtros.idObra, vale.id_obra, modosFiltro.idObra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa, modosFiltro.idEmpresa)) return false;
      return true;
    });

    const byMesMat = {};
    const totalPorMat = {};

    valesFilt.forEach((vale) => {
      const conc = valeRentaAConciliacion[vale.id_vale];
      if (!conc?.fecha_generacion) return;
      // El sindicato de un vale de renta vive en la conciliación (rawValesRenta
      // no trae operador); sin esto el filtro Sindicato no afecta esta gráfica.
      if (!matchesFiltro(filtros.idSindicato, conc?.id_sindicato, modosFiltro.idSindicato)) return;
      const mes = conc.fecha_generacion.substring(0, 7);

      (vale.vale_renta_detalle || []).forEach((det) => {
        const equipo = det.material?.material || "Sin clasificar";
        const numViajes = det.vale_renta_viajes?.length > 0
          ? det.vale_renta_viajes.length
          : (det.numero_viajes || 1);

        if (!byMesMat[mes]) byMesMat[mes] = {};
        byMesMat[mes][equipo] = (byMesMat[mes][equipo] || 0) + numViajes;
        totalPorMat[equipo] = (totalPorMat[equipo] || 0) + numViajes;
      });
    });

    const meses = Object.keys(byMesMat).sort();
    const equipos = Object.entries(totalPorMat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([eq]) => eq);

    const data = meses.map((mes) => {
      const row = { mes };
      equipos.forEach((eq) => { row[eq] = byMesMat[mes]?.[eq] || 0; });
      return row;
    });

    return { data, equipos };
  }, [rawValesRenta, valeRentaAConciliacion, filtros.idObra, filtros.idEmpresa, filtros.idSindicato, modosFiltro.idObra, modosFiltro.idEmpresa, modosFiltro.idSindicato]);

  // ── Importe de Renta gastado por mes (desde conciliaciones de renta) ──
  // Ignora filtro mes/semana para mostrar la evolución histórica completa,
  // igual que seriesTiempoRenta. Usa total_final de la conciliación (ya
  // incluye IVA y retención). Solo renta — el importe de material ya tiene
  // su propia gráfica (Material vs Tiempo).
  const seriesImporteTiempo = useMemo(() => {
    let concsFiltradas = rawConciliaciones.filter(
      (c) => c.tipo_conciliacion === "renta" && c.id_obra !== 14 && Number(c.id_empresa) !== 4
    );
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idObra, c.id_obra, modosFiltro.idObra));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idEmpresa, c.id_empresa, modosFiltro.idEmpresa));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idSindicato, c.id_sindicato, modosFiltro.idSindicato));

    const byMes = {};
    concsFiltradas.forEach((c) => {
      const mes = c.fecha_generacion?.substring(0, 7);
      if (!mes) return;
      byMes[mes] = (byMes[mes] || 0) + Number(c.total_final || 0);
    });

    const meses = Object.keys(byMes).sort();
    const data = meses.map((mes) => ({ mes, importeRenta: Math.round(byMes[mes] * 100) / 100 }));

    return { data };
  }, [rawConciliaciones, filtros.idObra, filtros.idEmpresa, filtros.idSindicato, modosFiltro.idObra, modosFiltro.idEmpresa, modosFiltro.idSindicato]);

  // ── Camiones rentados por mes ────────────────────────────────────────
  // Cuenta TODOS los vales de renta por mes de conciliación (no solo
  // vehículos únicos) — un vale es un camión rentado, así que el conteo
  // debe cuadrar con el número de vales de renta del mes.
  const seriesCamionesRentaTiempo = useMemo(() => {
    const valesFilt = rawValesRenta.filter((vale) => {
      if (!matchesFiltro(filtros.idObra, vale.id_obra, modosFiltro.idObra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa, modosFiltro.idEmpresa)) return false;
      return true;
    });

    const byMes = {};
    valesFilt.forEach((vale) => {
      const conc = valeRentaAConciliacion[vale.id_vale];
      if (!conc?.fecha_generacion) return;
      if (!matchesFiltro(filtros.idSindicato, conc?.id_sindicato, modosFiltro.idSindicato)) return;
      const mes = conc.fecha_generacion.substring(0, 7);
      byMes[mes] = (byMes[mes] || 0) + 1;
    });

    const meses = Object.keys(byMes).sort();
    const data = meses.map((mes) => ({ mes, camiones: byMes[mes] }));

    return { data };
  }, [rawValesRenta, valeRentaAConciliacion, filtros.idObra, filtros.idEmpresa, filtros.idSindicato, modosFiltro.idObra, modosFiltro.idEmpresa, modosFiltro.idSindicato]);

  // ── Tabla viajes de renta agrupada por obra → equipo (respeta todos los filtros) ──
  const tablaViajesRentaPorEquipo = useMemo(() => {
    const valesFilt = rawValesRenta.filter((vale) => {
      if (vale.id_obra === 14 || Number(vale.id_empresa) === 4) return false;
      const conc = valeRentaAConciliacion[vale.id_vale];
      if (!matchesFiltro(filtros.mes, conc?.fecha_generacion?.substring(0, 7), modosFiltro.mes)) return false;
      if (!matchesFiltro(filtros.semana, getWeekKey(conc?.fecha_generacion), modosFiltro.semana)) return false;
      if (!matchesFiltro(filtros.idObra, vale.id_obra, modosFiltro.idObra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa, modosFiltro.idEmpresa)) return false;
      // Sindicato desde la conciliación (rawValesRenta no trae operador).
      if (!matchesFiltro(filtros.idSindicato, conc?.id_sindicato, modosFiltro.idSindicato)) return false;
      return true;
    });

    // obraId → { obra, cc, equipos: { equipoNombre → stats } }
    const obraMap = {};
    valesFilt.forEach((vale) => {
      const obraId  = vale.id_obra;
      const obraNombre = vale.obras?.obra || "Sin obra";
      const cc      = vale.obras?.cc ?? null;

      if (!obraMap[obraId]) obraMap[obraId] = { obra: obraNombre, cc, equipos: {} };

      (vale.vale_renta_detalle || []).forEach((det) => {
        const equipo = det.material?.material || "Sin clasificar";
        if (!obraMap[obraId].equipos[equipo]) {
          obraMap[obraId].equipos[equipo] = {
            equipo, viajes: 0, totalDias: 0, totalHoras: 0,
            importeTotal: 0, capacidadSuma: 0, capacidadCount: 0,
          };
        }
        const s = obraMap[obraId].equipos[equipo];
        // Viajes registrados: se prefiere el conteo real de vale_renta_viajes
        // (el ledger, igual que en material); numero_viajes es solo lo
        // declarado al crear el vale y puede no cuadrar con lo registrado.
        s.viajes += det.vale_renta_viajes?.length > 0
          ? det.vale_renta_viajes.length
          : (det.numero_viajes || 1);
        s.totalDias  += Number(det.total_dias  || 0);
        s.totalHoras += Number(det.total_horas || 0);
        s.importeTotal += Number(det.costo_total || 0);
        // La capacidad depende del vehículo (placas) rentado, no del detalle:
        // vale_renta_detalle.capacidad_m3 casi nunca se captura.
        if (vale.vehiculos?.capacidad_m3 != null) {
          s.capacidadSuma += Number(vale.vehiculos.capacidad_m3);
          s.capacidadCount += 1;
        }
      });
    });

    // Importe por viaje = costo_total del vale (o subtotal) entre el número
    // de viajes registrados — no existe un importe capturado por viaje
    // individual en BD, el costo de renta siempre es del vale/detalle.
    // Precio aprox. por m³ = ese importe por viaje entre la capacidad
    // promedio del vehículo — una tarifa efectiva de renta normalizada por
    // volumen, para poder comparar equipos de distinta capacidad entre sí.
    const conDerivados = (s) => {
      const capacidadPromedio = s.capacidadCount > 0 ? s.capacidadSuma / s.capacidadCount : null;
      const importePorViaje = s.viajes > 0 ? s.importeTotal / s.viajes : null;
      return {
        ...s,
        capacidadPromedio,
        importePorViaje,
        precioAproxM3: importePorViaje != null && capacidadPromedio
          ? importePorViaje / capacidadPromedio
          : null,
      };
    };

    return Object.values(obraMap)
      .map(({ obra, cc, equipos }) => {
        const equiposList = Object.values(equipos)
          .map(conDerivados)
          .sort((a, b) => b.viajes - a.viajes);
        const subtotalBase = equiposList.reduce(
          (acc, e) => ({
            viajes: acc.viajes + e.viajes,
            totalDias: acc.totalDias + e.totalDias,
            totalHoras: acc.totalHoras + e.totalHoras,
            importeTotal: acc.importeTotal + e.importeTotal,
            capacidadSuma: acc.capacidadSuma + e.capacidadSuma,
            capacidadCount: acc.capacidadCount + e.capacidadCount,
          }),
          { viajes: 0, totalDias: 0, totalHoras: 0, importeTotal: 0, capacidadSuma: 0, capacidadCount: 0 }
        );
        return { obra, cc, equipos: equiposList, subtotal: conDerivados(subtotalBase) };
      })
      .sort((a, b) => b.subtotal.viajes - a.subtotal.viajes);
  }, [rawValesRenta, valeRentaAConciliacion, filtros, modosFiltro]);

  // ── Estadísticas de un periodo dado (mes o semana) con filtros activos ──
  const getPeriodoStats = useCallback((mesVal, semanaVal) => {
    const valesPeriodo = rawVales.filter((vale) => {
      if (vale.id_obra === 14 || Number(vale.id_empresa) === 4) return false;
      const conc = valeAConciliacion[vale.id_vale];
      if (mesVal && conc?.fecha_generacion?.substring(0, 7) !== mesVal) return false;
      if (semanaVal && getWeekKey(conc?.fecha_generacion) !== semanaVal) return false;
      if (!matchesFiltro(filtros.idObra, vale.id_obra, modosFiltro.idObra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa, modosFiltro.idEmpresa)) return false;
      if (!matchesFiltro(filtros.idSindicato, vale.operadores?.id_sindicato, modosFiltro.idSindicato)) return false;
      return true;
    });

    const matStats = agregarPorMaterial(valesPeriodo, filtros.material, filtros.idBanco, modosFiltro.material, modosFiltro.idBanco);
    const m3Total = matStats.reduce((s, r) => s + r.m3Total, 0);
    const importeTotal = matStats.reduce((s, r) => s + r.importeIVA, 0);

    let concsPeriodo = rawConciliaciones.filter((c) => c.id_obra !== 14 && Number(c.id_empresa) !== 4);
    if (mesVal) {
      concsPeriodo = concsPeriodo.filter((c) => c.fecha_generacion?.substring(0, 7) === mesVal);
    }
    if (semanaVal) {
      concsPeriodo = concsPeriodo.filter((c) => getWeekKey(c.fecha_generacion) === semanaVal);
    }
    concsPeriodo = concsPeriodo.filter((c) => matchesFiltro(filtros.idObra, c.id_obra, modosFiltro.idObra));
    concsPeriodo = concsPeriodo.filter((c) => matchesFiltro(filtros.idEmpresa, c.id_empresa, modosFiltro.idEmpresa));
    concsPeriodo = concsPeriodo.filter((c) => matchesFiltro(filtros.idSindicato, c.id_sindicato, modosFiltro.idSindicato));

    let totalHorasRenta = 0;
    let totalDiasRenta = 0;
    concsPeriodo.forEach((c) => {
      if (c.tipo_conciliacion === "renta") {
        totalHorasRenta += Number(c.total_horas || 0);
        totalDiasRenta += Number(c.total_dias || 0);
      }
    });

    return {
      m3Total,
      importeTotal,
      totalHorasRenta,
      totalDiasRenta,
      totalConciliaciones: concsPeriodo.length,
    };
  }, [rawVales, rawConciliaciones, valeAConciliacion, filtros, modosFiltro, agregarPorMaterial]);

  // ── Comparativa contra el periodo anterior (mes o semana según filtro activo) ──
  const comparativaPeriodoAnterior = useMemo(() => {
    let modo = null;
    let actualKey = null;
    let anteriorKey = null;

    if (filtros.semana.length === 1) {
      modo = "semana";
      actualKey = filtros.semana[0];
      const idx = opcionesSemanas.indexOf(actualKey);
      anteriorKey = idx >= 0 ? opcionesSemanas[idx + 1] || null : null;
    } else if (filtros.mes.length === 1) {
      modo = "mes";
      actualKey = filtros.mes[0];
      const idx = opcionesMeses.indexOf(actualKey);
      anteriorKey = idx >= 0 ? opcionesMeses[idx + 1] || null : null;
    }

    if (!anteriorKey) return null;

    const actual = modo === "mes" ? getPeriodoStats(actualKey, null) : getPeriodoStats(null, actualKey);
    const anterior = modo === "mes" ? getPeriodoStats(anteriorKey, null) : getPeriodoStats(null, anteriorKey);

    return { modo, actualKey, anteriorKey, actual, anterior };
  }, [filtros.semana, filtros.mes, opcionesSemanas, opcionesMeses, getPeriodoStats]);

  // ── Acciones de filtros ─────────────────────────────────────────────
  // value === null limpia la categoría (botón "Todos"); cualquier otro valor
  // se agrega o quita del arreglo de selección de esa categoría.
  const toggleFiltro = useCallback((key, value) => {
    setFiltrosState((prev) => {
      if (value === null) return { ...prev, [key]: [] };
      const current = prev[key];
      const yaExiste = current.some((v) => String(v) === String(value));
      const next = yaExiste
        ? current.filter((v) => String(v) !== String(value))
        : [...current, value];
      return { ...prev, [key]: next };
    });
  }, []);

  const resetFiltros = useCallback(() => {
    setFiltrosState({
      mes: [], semana: [], idObra: [], idEmpresa: [],
      idSindicato: [], material: [], idBanco: [], idTipoMaterial: [],
    });
    setModosFiltro({
      mes: "incluir", semana: "incluir", idObra: "incluir", idEmpresa: "incluir",
      idSindicato: "incluir", material: "incluir", idBanco: "incluir", idTipoMaterial: "incluir",
    });
  }, []);

  // Alterna Incluir ⇄ Excluir para una categoría de filtro.
  const toggleModoFiltro = useCallback((key) => {
    setModosFiltro((prev) => ({
      ...prev,
      [key]: prev[key] === "excluir" ? "incluir" : "excluir",
    }));
  }, []);

  const hayFiltrosActivos = Object.values(filtros).some((arr) => arr.length > 0);

  // ── Rango de fechas: "Desglose — Hoy" ───────────────────────────────
  const seleccionarRangoTiempoReal = useCallback((desde, hasta) => {
    setRangoTiempoRealDesde(desde || null);
    setRangoTiempoRealHasta(hasta || null);
    setPeriodoTiempoReal("rango");
  }, []);

  // ── Rango de fechas: "Volumen Acumulado" (opcional, histórico por defecto) ──
  const seleccionarRangoAcumulado = useCallback((desde, hasta) => {
    setRangoAcumuladoDesde(desde || null);
    setRangoAcumuladoHasta(hasta || null);
  }, []);

  return {
    loading,
    error,
    resumen,
    tablaMaterial,
    ultimaConciliacion,
    fetchEstadisticas,
    valeAConciliacion,
    // Carga perezosa por dominio
    estadisticasCargadas,
    tiempoRealCargado,
    presupuestosCargados,
    garantizarEstadisticas,
    garantizarTiempoReal,
    garantizarPresupuestos,
    // Filtros
    filtros,
    toggleFiltro,
    resetFiltros,
    hayFiltrosActivos,
    modosFiltro,
    toggleModoFiltro,
    opcionesMeses,
    opcionesSemanas,
    opcionesObras,
    opcionesEmpresas,
    opcionesSindicatos,
    opcionesMateriales,
    opcionesBancos,
    opcionesTipoMaterial,
    // Gráficas
    seriesTiempo,
    seriesTiempoRenta,
    seriesImporteTiempo,
    seriesCamionesRentaTiempo,
    tablaViajesRentaPorEquipo,
    derivarPrecioRenta,
    // Análisis avanzado
    topResidentes,
    topChecadores,
    topPlacas,
    horasPico,
    viajesPorVale,
    rendimientoPorMaterial,
    // Tablas agrupadas por obra
    tablaObraMaterial,
    tablaRentaPorObra,
    // Desglose por obra en tiempo real (directo de vales, sin conciliaciones)
    periodoTiempoReal,
    seleccionarPeriodoTiempoReal,
    semanaTiempoReal,
    seleccionarSemanaTiempoReal,
    opcionesSemanasTiempoReal,
    rangoTiempoRealDesde,
    rangoTiempoRealHasta,
    seleccionarRangoTiempoReal,
    loadingTiempoReal,
    errorTiempoReal,
    fetchValesTiempoReal,
    tablaObraMaterialTiempoReal,
    tablaObraRentaTiempoReal,
    // Volumen acumulado histórico por obra (sin filtro de periodo) + % vs presupuesto
    rangoAcumuladoDesde,
    rangoAcumuladoHasta,
    seleccionarRangoAcumulado,
    tablaObraMaterialAcumulado,
    tablaObraRentaAcumulado,
    // Fuente del reporte PDF: vales reales agrupados por los chips globales
    valesReporteFiltrados,
    tablaObraMaterialReporte,
    tablaObraRentaReporte,
    tablaBancoMaterialReporte,
    // Ahorro estimado vs. proceso anterior en papel (sección final del PDF)
    ahorroEstimado,
    serieConciliacionesPorMes,
    conciliacionesPorObraTipo,
    // Presupuestos
    loadingPresupuestos,
    presupuestosMaterialFiltrados,
    presupuestosRentaFiltrados,
    hayAlertaPresupuesto,
    fetchPresupuestos,
    // Comparativa periodo anterior
    comparativaPeriodoAnterior,
  };
};
