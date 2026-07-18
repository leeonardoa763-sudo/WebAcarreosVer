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
import { useState, useEffect, useCallback, useMemo } from "react";

// 2. Config
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
const matchesFiltro = (filtroArr, value) => {
  if (!filtroArr || filtroArr.length === 0) return true;
  return filtroArr.some((v) => String(v) === String(value));
};

export const useEstadisticasGlobales = () => {
  // 1. Estados base
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawConciliaciones, setRawConciliaciones] = useState([]);
  const [rawVales, setRawVales] = useState([]);
  const [valeAConciliacion, setValeAConciliacion] = useState({});
  const [rawValesRenta, setRawValesRenta] = useState([]);
  const [valeRentaAConciliacion, setValeRentaAConciliacion] = useState({});

  // Estados de presupuesto
  const [presupuestosMaterial, setPresupuestosMaterial] = useState([]);
  const [presupuestosRenta,    setPresupuestosRenta]    = useState([]);
  const [loadingPresupuestos,  setLoadingPresupuestos]  = useState(true);

  // Estados del desglose por obra en tiempo real (directo de vales, sin conciliaciones)
  const [rawValesTiempoReal, setRawValesTiempoReal] = useState([]);
  const [loadingTiempoReal,  setLoadingTiempoReal]  = useState(true);
  const [errorTiempoReal,    setErrorTiempoReal]    = useState(null);
  // Periodo local de esta sección: "hoy" (default) | "ayer" | "semana"
  const [periodoTiempoReal, setPeriodoTiempoReal] = useState("hoy");
  const [semanaTiempoReal,  setSemanaTiempoReal]  = useState(() => getWeekKey(new Date().toISOString()));

  // 2. Estado de filtros
  const [filtros, setFiltrosState] = useState({
    mes: [],
    semana: [],
    idObra: [],
    idEmpresa: [],
    idSindicato: [],
    material: [],
    idBanco: [],
  });

  // 3. Fetch principal
  const fetchEstadisticas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Query A: todas las conciliaciones
      const { data: conciliaciones, error: errorConc } = await supabase
        .from("conciliaciones")
        .select(
          "id_conciliacion, tipo_conciliacion, total_final, total_horas, total_dias, fecha_generacion, folio, id_obra, id_empresa, id_sindicato, obras:id_obra (id_obra, obra, cc), sindicatos:id_sindicato (sindicato), empresas:id_empresa (empresa)"
        )
        .neq("id_obra", 14)
        .neq("id_empresa", 4);

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
                id_detalle_material, volumen_real_m3, costo_total, id_banco,
                bancos:id_banco (id_banco, banco),
                material:id_material (
                  id_material, material,
                  tipo_de_material:id_tipo_de_material (id_tipo_de_material)
                ),
                vale_material_viajes (
                  id_viaje, volumen_m3, hora_registro, id_persona_registro,
                  persona_registro:id_persona_registro (nombre, primer_apellido)
                )
              ),
              tickets_material (id_ticket)
            `)
            .in("id_vale", valeIds)
            .neq("id_obra", 14)
            .neq("id_empresa", 4);

          if (errorVales) throw errorVales;
          setRawVales(vales || []);

          const logStats = {};
          (vales || []).forEach((vale) => {
            (vale.vale_material_detalles || []).forEach((det) => {
              const nombre = det.material?.material || "Sin clasificar";
              const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;
              if (!logStats[nombre]) logStats[nombre] = { material: nombre, tipoId, m3: 0, valesIds: new Set(), importeIVA: 0 };
              const s = logStats[nombre];
              s.valesIds.add(vale.id_vale);
              s.importeIVA += Number(det.costo_total || 0) * 1.16;
              if (tipoId === 3) {
                s.m3 += Number(det.volumen_real_m3 || 0);
              } else {
                (det.vale_material_viajes || []).forEach((v) => { s.m3 += Number(v.volumen_m3 || 0); });
              }
            });
          });
          const logTable = Object.values(logStats)
            .map((s) => ({ material: s.material, tipo: s.tipoId, m3_total: Math.round(s.m3 * 100) / 100, vales_count: s.valesIds.size, importe_iva: Math.round(s.importeIVA * 100) / 100 }))
            .sort((a, b) => b.m3_total - a.m3_total);
          console.group("[EstadisticasGlobales] Verificación de datos");
          console.log(`Conciliaciones: ${(conciliaciones || []).length} total`);
          console.log(`Vales con material conciliado: ${(vales || []).length}`);
          console.table(logTable);
          console.groupEnd();
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
              vale_renta_detalle (
                id_vale_renta_detalle, hora_inicio, total_horas, total_dias, numero_viajes, costo_total,
                material:id_material (id_material, material),
                vale_renta_viajes (id_viaje, hora_registro)
              )
            `)
            .in("id_vale", rentaValeIds)
            .neq("id_obra", 14)
            .neq("id_empresa", 4);

          if (errorRentaVales) throw errorRentaVales;
          setRawValesRenta(rentaVales || []);
        } else {
          setRawValesRenta([]);
        }
      } else {
        setRawValesRenta([]);
        setValeRentaAConciliacion({});
      }

    } catch (err) {
      console.error("Error en fetchEstadisticas:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. Effect inicial
  useEffect(() => { fetchEstadisticas(); }, []);

  // 5. Fetch presupuestos (independiente de conciliaciones)
  const fetchPresupuestos = useCallback(async () => {
    try {
      setLoadingPresupuestos(true);
      const [{ data: pMat, error: eMat }, { data: pRenta, error: eRenta }] =
        await Promise.all([
          supabase
            .from("presupuesto_material_obra")
            .select(`
              id, id_obra, id_material, m3_presupuestados, m3_consumidos,
              obras:id_obra (id_obra, obra, cc, empresas:id_empresa (id_empresa, empresa)),
              material:id_material (id_material, material)
            `)
            .eq("activo", true)
            .neq("id_obra", 14),
          supabase
            .from("presupuesto_renta_obra")
            .select(`
              id, id_obra, monto_presupuestado, monto_consumido,
              obras:id_obra (id_obra, obra, cc, empresas:id_empresa (id_empresa, empresa))
            `)
            .eq("activo", true)
            .neq("id_obra", 14),
        ]);
      if (eMat) throw eMat;
      if (eRenta) throw eRenta;
      setPresupuestosMaterial(pMat || []);
      setPresupuestosRenta(pRenta || []);
    } catch (err) {
      console.error("Error en fetchPresupuestos:", err);
    } finally {
      setLoadingPresupuestos(false);
    }
  }, []);

  useEffect(() => { fetchPresupuestos(); }, []);

  // ── Fetch independiente: vales en tiempo real para "Desglose por Obra" ──
  // No pasa por conciliaciones/conciliacion_vales. Incluye vales aún no
  // conciliados. Aislado de fetchEstadisticas: un fallo aquí no debe afectar
  // KPIs, gráficas ni tops (que siguen siendo 100% conciliaciones).
  const fetchValesTiempoReal = useCallback(async () => {
    try {
      setLoadingTiempoReal(true);
      setErrorTiempoReal(null);

      const { data, error } = await supabase
        .from("vales")
        .select(`
          id_vale, tipo_vale, estado, fecha_creacion, id_obra, id_empresa,
          obras:id_obra (id_obra, obra, cc, empresas:id_empresa (id_empresa, empresa)),
          operadores:id_operador (id_operador, id_sindicato),
          vale_material_detalles (
            id_detalle_material, volumen_real_m3, cantidad_pedida_m3, costo_total, id_banco,
            material:id_material (
              id_material, material,
              tipo_de_material:id_tipo_de_material (id_tipo_de_material)
            ),
            vale_material_viajes (id_viaje, volumen_m3)
          ),
          tickets_material (id_ticket),
          vale_renta_detalle (
            id_vale_renta_detalle, total_dias, total_horas, numero_viajes, costo_total,
            vale_renta_viajes (id_viaje)
          )
        `)
        .neq("id_obra", 14)
        .neq("id_empresa", 4)
        .not("estado", "in", "(borrador,cancelado)")
        .limit(20000);

      if (error) throw error;
      setRawValesTiempoReal(data || []);
    } catch (err) {
      console.error("Error en fetchValesTiempoReal:", err);
      setErrorTiempoReal(err.message);
      setRawValesTiempoReal([]);
    } finally {
      setLoadingTiempoReal(false);
    }
  }, []);

  useEffect(() => { fetchValesTiempoReal(); }, [fetchValesTiempoReal]);

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
      if (v.obras) map[v.obras.id_obra] = v.obras.obra;
    });
    return Object.entries(map)
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [rawVales]);

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

  // ── Vales filtrados (nivel vale: mes, semana, obra, empresa, sindicato) ──
  const valesFiltrados = useMemo(() => {
    return rawVales.filter((vale) => {
      if (vale.id_obra === 14 || Number(vale.id_empresa) === 4) return false;
      const conc = valeAConciliacion[vale.id_vale];

      if (!matchesFiltro(filtros.mes, conc?.fecha_generacion?.substring(0, 7))) return false;
      if (!matchesFiltro(filtros.semana, getWeekKey(conc?.fecha_generacion))) return false;
      if (!matchesFiltro(filtros.idObra, vale.id_obra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa)) return false;
      if (!matchesFiltro(filtros.idSindicato, vale.operadores?.id_sindicato)) return false;

      return true;
    });
  }, [rawVales, filtros, valeAConciliacion]);

  // ── Función de agregación (reutilizable) ───────────────────────────
  const agregarPorMaterial = useCallback((vales, filtroMaterial, filtroBanco) => {
    const stats = {};
    vales.forEach((vale) => {
      (vale.vale_material_detalles || []).forEach((det) => {
        const nombre = det.material?.material || "Sin clasificar";
        const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;

        if (!matchesFiltro(filtroMaterial, nombre)) return;
        if (!matchesFiltro(filtroBanco, det.id_banco)) return;

        if (!stats[nombre]) {
          stats[nombre] = { material: nombre, m3Total: 0, valesIds: new Set(), totalViajes: 0, importeIVA: 0 };
        }
        const s = stats[nombre];
        s.valesIds.add(vale.id_vale);
        s.importeIVA += Number(det.costo_total || 0) * 1.16;

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
    () => agregarPorMaterial(valesFiltrados, filtros.material, filtros.idBanco),
    [valesFiltrados, filtros.material, filtros.idBanco, agregarPorMaterial]
  );

  // ── Resumen KPIs ────────────────────────────────────────────────────
  const resumen = useMemo(() => {
    let concsFiltradas = rawConciliaciones.filter((c) => c.id_obra !== 14 && Number(c.id_empresa) !== 4);
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.mes, c.fecha_generacion?.substring(0, 7)));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.semana, getWeekKey(c.fecha_generacion)));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idObra, c.id_obra));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idEmpresa, c.id_empresa));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idSindicato, c.id_sindicato));

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
    tablaMaterial,
  ]);

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
      if (!matchesFiltro(filtros.idObra, vale.id_obra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa)) return false;
      if (!matchesFiltro(filtros.idSindicato, vale.operadores?.id_sindicato)) return false;
      return true;
    });

    const byMesMat = {};
    const totalPorMat = {};

    valesSinTiempo.forEach((vale) => {
      const conc = valeAConciliacion[vale.id_vale];
      if (!conc?.fecha_generacion) return;
      const mes = conc.fecha_generacion.substring(0, 7);

      (vale.vale_material_detalles || []).forEach((det) => {
        const mat = det.material?.material || "Sin clasificar";
        const tipoId = det.material?.tipo_de_material?.id_tipo_de_material;

        if (!matchesFiltro(filtros.material, mat)) return;
        if (!matchesFiltro(filtros.idBanco, det.id_banco)) return;

        let m3 = 0;
        if (tipoId === 3) {
          m3 = Number(det.volumen_real_m3 || 0);
        } else {
          (det.vale_material_viajes || []).forEach((v) => { m3 += Number(v.volumen_m3 || 0); });
        }

        if (!byMesMat[mes]) byMesMat[mes] = {};
        byMesMat[mes][mat] = (byMesMat[mes][mat] || 0) + m3;
        totalPorMat[mat] = (totalPorMat[mat] || 0) + m3;
      });
    });

    const meses = Object.keys(byMesMat).sort();
    const topMateriales = Object.entries(totalPorMat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mat]) => mat);

    const data = meses.map((mes) => {
      const row = { mes };
      topMateriales.forEach((mat) => {
        row[mat] = Math.round((byMesMat[mes]?.[mat] || 0) * 100) / 100;
      });
      return row;
    });

    return { data, materiales: topMateriales };
  }, [rawVales, filtros, valeAConciliacion]);

  // ── Helper: nombre completo de persona ─────────────────────────────
  const nombrePersona = (p) => p ? `${p.nombre || ""} ${p.primer_apellido || ""}`.trim() : "Sin nombre";

  // ── Helper: filtra detalles por material/banco activos ─────────────
  const detsFiltrados = useCallback((detalles) =>
    (detalles || []).filter((det) => {
      if (!matchesFiltro(filtros.material, det.material?.material)) return false;
      if (!matchesFiltro(filtros.idBanco, det.id_banco)) return false;
      return true;
    }), [filtros.material, filtros.idBanco]);

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
          (det.vale_material_viajes || []).forEach((v) => { map[nombre].m3Total += Number(v.volumen_m3 || 0); });
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
          map[placas].viajes += det.vale_material_viajes?.length || 0;
          (det.vale_material_viajes || []).forEach((v) => { map[placas].m3Total += Number(v.volumen_m3 || 0); });
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

        if (!matchesFiltro(filtros.material, nombreMat)) return;
        if (!matchesFiltro(filtros.idBanco, det.id_banco)) return;

        if (!obraMap[obraId].matMap[nombreMat]) {
          obraMap[obraId].matMap[nombreMat] = {
            material: nombreMat, m3Total: 0, valesIds: new Set(), totalViajes: 0, importeIVA: 0,
          };
        }
        const s = obraMap[obraId].matMap[nombreMat];
        s.valesIds.add(vale.id_vale);
        s.importeIVA += Number(det.costo_total || 0) * 1.16;

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
  }, [valesFiltrados, filtros.material, filtros.idBanco]);

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

      if (!matchesFiltro(filtros.idObra, vale.id_obra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa)) return false;
      if (!matchesFiltro(filtros.idSindicato, vale.operadores?.id_sindicato)) return false;
      return true;
    });
  }, [rawValesTiempoReal, filtros, periodoTiempoReal, semanaTiempoReal]);

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

        if (!matchesFiltro(filtros.material, nombreMat)) return;
        if (!matchesFiltro(filtros.idBanco, det.id_banco)) return;

        if (!obraMap[obraId].matMap[nombreMat]) {
          obraMap[obraId].matMap[nombreMat] = {
            material: nombreMat, m3Total: 0, valesIds: new Set(), totalViajes: 0, importeIVA: 0,
          };
        }
        const s = obraMap[obraId].matMap[nombreMat];
        s.valesIds.add(vale.id_vale);
        s.importeIVA += Number(det.costo_total || 0) * 1.16;

        // Vales recién emitidos aún sin viajes/tickets registrados no tienen
        // volumen real todavía — usamos cantidad_pedida_m3 (lo solicitado al
        // crear el vale) como estimado, igual que useDashboardAnalytics.js.
        // Un vale siempre representa al menos un viaje, aunque todavía no se
        // haya registrado el ticket/viaje individual.
        if (tipoId === 3) {
          s.m3Total += Number(det.volumen_real_m3 || det.cantidad_pedida_m3 || 0);
          const tickets = vale.tickets_material?.length || 0;
          s.totalViajes += tickets > 0 ? tickets : 1;
        } else {
          const viajes = det.vale_material_viajes || [];
          if (viajes.length > 0) {
            viajes.forEach((v) => { s.m3Total += Number(v.volumen_m3 || 0); });
          } else {
            // Tipo 2 (asfáltico) captura el volumen directo en el detalle (sin
            // filas en vale_material_viajes) → volumen_real_m3. Vales recién
            // emitidos sin captura aún caen a cantidad_pedida_m3 como estimado.
            s.m3Total += Number(det.volumen_real_m3 || det.cantidad_pedida_m3 || 0);
          }
          s.totalViajes += viajes.length > 0 ? viajes.length : 1;
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
  }, [valesTiempoRealMaterial, filtros.material, filtros.idBanco]);

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
  }, [valesTiempoRealRenta]);

  // ── Vales acumulados (histórico total, sin filtro de periodo) ───────
  // Mismo origen que valesTiempoRealMaterial/Renta (rawValesTiempoReal ya
  // excluye borrador/cancelado y datos de prueba a nivel de query), pero
  // sin el filtro Hoy/Ayer/Semana — para el bloque "Volumen Acumulado por Obra".
  const valesAcumuladoMaterial = useMemo(
    () => rawValesTiempoReal.filter((vale) => {
      if (vale.tipo_vale !== "material") return false;
      if (!matchesFiltro(filtros.idObra, vale.id_obra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa)) return false;
      if (!matchesFiltro(filtros.idSindicato, vale.operadores?.id_sindicato)) return false;
      return true;
    }),
    [rawValesTiempoReal, filtros]
  );

  const valesAcumuladoRenta = useMemo(
    () => rawValesTiempoReal.filter((vale) => {
      if (vale.tipo_vale !== "renta") return false;
      if (!matchesFiltro(filtros.idObra, vale.id_obra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa)) return false;
      if (!matchesFiltro(filtros.idSindicato, vale.operadores?.id_sindicato)) return false;
      return true;
    }),
    [rawValesTiempoReal, filtros]
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

  // ── Tabla renta agrupada por obra ───────────────────────────────────
  const tablaRentaPorObra = useMemo(() => {
    let concsFiltradas = rawConciliaciones.filter(
      (c) => c.tipo_conciliacion === "renta" && c.id_obra !== 14 && Number(c.id_empresa) !== 4
    );
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.mes, c.fecha_generacion?.substring(0, 7)));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.semana, getWeekKey(c.fecha_generacion)));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idObra, c.id_obra));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idEmpresa, c.id_empresa));
    concsFiltradas = concsFiltradas.filter((c) => matchesFiltro(filtros.idSindicato, c.id_sindicato));

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
          conciliacionesArr: [],
        };
      }
      map[obraId].conciliaciones += 1;
      map[obraId].totalViajes += viajesPorConciliacionRenta[c.id_conciliacion] || 0;
      map[obraId].totalDias  += Number(c.total_dias  || 0);
      map[obraId].totalHoras += Number(c.total_horas || 0);
      map[obraId].importeTotal += Number(c.total_final || 0);
      map[obraId].conciliacionesArr.push(c);
    });

    return Object.values(map).sort((a, b) => b.importeTotal - a.importeTotal);
  }, [rawConciliaciones, filtros, viajesPorConciliacionRenta]);

  // ── Presupuestos filtrados ─────────────────────────────────────────
  const presupuestosMaterialFiltrados = useMemo(
    () => presupuestosMaterial.filter(
      (p) =>
        matchesFiltro(filtros.idObra, p.id_obra) &&
        matchesFiltro(filtros.idEmpresa, p.obras?.empresas?.id_empresa) &&
        matchesFiltro(filtros.material, p.material?.material) &&
        Number(p.obras?.empresas?.id_empresa) !== 4
    ),
    [presupuestosMaterial, filtros.idObra, filtros.idEmpresa, filtros.material]
  );

  const presupuestosRentaFiltrados = useMemo(
    () => presupuestosRenta.filter(
      (p) =>
        matchesFiltro(filtros.idObra, p.id_obra) &&
        matchesFiltro(filtros.idEmpresa, p.obras?.empresas?.id_empresa) &&
        Number(p.obras?.empresas?.id_empresa) !== 4
    ),
    [presupuestosRenta, filtros.idObra, filtros.idEmpresa]
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

        if (!matchesFiltro(filtros.material, nombreMat)) return;
        if (!matchesFiltro(filtros.idBanco, det.id_banco)) return;

        if (!obraMap[obraId].matMap[nombreMat]) {
          obraMap[obraId].matMap[nombreMat] = {
            material: nombreMat, idMaterial, m3Total: 0, valesIds: new Set(), totalViajes: 0, importeIVA: 0,
          };
        }
        const s = obraMap[obraId].matMap[nombreMat];
        s.valesIds.add(vale.id_vale);
        s.importeIVA += Number(det.costo_total || 0) * 1.16;

        if (tipoId === 3) {
          s.m3Total += Number(det.volumen_real_m3 || det.cantidad_pedida_m3 || 0);
          const tickets = vale.tickets_material?.length || 0;
          s.totalViajes += tickets > 0 ? tickets : 1;
        } else {
          const viajes = det.vale_material_viajes || [];
          if (viajes.length > 0) {
            viajes.forEach((v) => { s.m3Total += Number(v.volumen_m3 || 0); });
          } else {
            // Tipo 2 (asfáltico) captura el volumen directo en el detalle (sin
            // filas en vale_material_viajes) → volumen_real_m3. Vales recién
            // emitidos sin captura aún caen a cantidad_pedida_m3 como estimado.
            s.m3Total += Number(det.volumen_real_m3 || det.cantidad_pedida_m3 || 0);
          }
          s.totalViajes += viajes.length > 0 ? viajes.length : 1;
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
  }, [valesAcumuladoMaterial, filtros.material, filtros.idBanco, presupuestoMaterialMap]);

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
    return Object.entries(obraMap)
      .map(([obraId, row]) => {
        const montoPresupuestado = presupuestoRentaMap[obraId] ?? null;
        return {
          ...row,
          montoPresupuestado,
          pctPresupuesto: montoPresupuestado ? (row.subtotalSinIva / montoPresupuestado) * 100 : null,
        };
      })
      .sort((a, b) => b.subtotalSinIva - a.subtotalSinIva);
  }, [valesAcumuladoRenta, presupuestoRentaMap]);

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
      if (!matchesFiltro(filtros.idObra, vale.id_obra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa)) return false;
      return true;
    });

    const byMesMat = {};
    const totalPorMat = {};

    valesFilt.forEach((vale) => {
      const conc = valeRentaAConciliacion[vale.id_vale];
      if (!conc?.fecha_generacion) return;
      // El sindicato de un vale de renta vive en la conciliación (rawValesRenta
      // no trae operador); sin esto el filtro Sindicato no afecta esta gráfica.
      if (!matchesFiltro(filtros.idSindicato, conc?.id_sindicato)) return;
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
  }, [rawValesRenta, valeRentaAConciliacion, filtros.idObra, filtros.idEmpresa, filtros.idSindicato]);

  // ── Tabla viajes de renta agrupada por obra → equipo (respeta todos los filtros) ──
  const tablaViajesRentaPorEquipo = useMemo(() => {
    const valesFilt = rawValesRenta.filter((vale) => {
      if (vale.id_obra === 14 || Number(vale.id_empresa) === 4) return false;
      const conc = valeRentaAConciliacion[vale.id_vale];
      if (!matchesFiltro(filtros.mes, conc?.fecha_generacion?.substring(0, 7))) return false;
      if (!matchesFiltro(filtros.semana, getWeekKey(conc?.fecha_generacion))) return false;
      if (!matchesFiltro(filtros.idObra, vale.id_obra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa)) return false;
      // Sindicato desde la conciliación (rawValesRenta no trae operador).
      if (!matchesFiltro(filtros.idSindicato, conc?.id_sindicato)) return false;
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
          obraMap[obraId].equipos[equipo] = { equipo, viajes: 0, totalDias: 0, totalHoras: 0 };
        }
        const s = obraMap[obraId].equipos[equipo];
        s.viajes += det.vale_renta_viajes?.length > 0
          ? det.vale_renta_viajes.length
          : (det.numero_viajes || 1);
        s.totalDias  += Number(det.total_dias  || 0);
        s.totalHoras += Number(det.total_horas || 0);
      });
    });

    return Object.values(obraMap)
      .map(({ obra, cc, equipos }) => {
        const equiposList = Object.values(equipos).sort((a, b) => b.viajes - a.viajes);
        const subtotal = equiposList.reduce(
          (acc, e) => ({ viajes: acc.viajes + e.viajes, totalDias: acc.totalDias + e.totalDias, totalHoras: acc.totalHoras + e.totalHoras }),
          { viajes: 0, totalDias: 0, totalHoras: 0 }
        );
        return { obra, cc, equipos: equiposList, subtotal };
      })
      .sort((a, b) => b.subtotal.viajes - a.subtotal.viajes);
  }, [rawValesRenta, valeRentaAConciliacion, filtros]);

  // ── Estadísticas de un periodo dado (mes o semana) con filtros activos ──
  const getPeriodoStats = useCallback((mesVal, semanaVal) => {
    const valesPeriodo = rawVales.filter((vale) => {
      if (vale.id_obra === 14 || Number(vale.id_empresa) === 4) return false;
      const conc = valeAConciliacion[vale.id_vale];
      if (mesVal && conc?.fecha_generacion?.substring(0, 7) !== mesVal) return false;
      if (semanaVal && getWeekKey(conc?.fecha_generacion) !== semanaVal) return false;
      if (!matchesFiltro(filtros.idObra, vale.id_obra)) return false;
      if (!matchesFiltro(filtros.idEmpresa, vale.obras?.empresas?.id_empresa)) return false;
      if (!matchesFiltro(filtros.idSindicato, vale.operadores?.id_sindicato)) return false;
      return true;
    });

    const matStats = agregarPorMaterial(valesPeriodo, filtros.material, filtros.idBanco);
    const m3Total = matStats.reduce((s, r) => s + r.m3Total, 0);
    const importeTotal = matStats.reduce((s, r) => s + r.importeIVA, 0);

    let concsPeriodo = rawConciliaciones.filter((c) => c.id_obra !== 14 && Number(c.id_empresa) !== 4);
    if (mesVal) {
      concsPeriodo = concsPeriodo.filter((c) => c.fecha_generacion?.substring(0, 7) === mesVal);
    }
    if (semanaVal) {
      concsPeriodo = concsPeriodo.filter((c) => getWeekKey(c.fecha_generacion) === semanaVal);
    }
    concsPeriodo = concsPeriodo.filter((c) => matchesFiltro(filtros.idObra, c.id_obra));
    concsPeriodo = concsPeriodo.filter((c) => matchesFiltro(filtros.idEmpresa, c.id_empresa));
    concsPeriodo = concsPeriodo.filter((c) => matchesFiltro(filtros.idSindicato, c.id_sindicato));

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
  }, [rawVales, rawConciliaciones, valeAConciliacion, filtros, agregarPorMaterial]);

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
    } else if (filtros.mes.length === 0 && filtros.semana.length === 0 && opcionesMeses.length >= 2) {
      modo = "mes";
      actualKey = opcionesMeses[0];
      anteriorKey = opcionesMeses[1];
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
      idSindicato: [], material: [], idBanco: [],
    });
  }, []);

  const hayFiltrosActivos = Object.values(filtros).some((arr) => arr.length > 0);

  return {
    loading,
    error,
    resumen,
    tablaMaterial,
    ultimaConciliacion,
    fetchEstadisticas,
    valeAConciliacion,
    // Filtros
    filtros,
    toggleFiltro,
    resetFiltros,
    hayFiltrosActivos,
    opcionesMeses,
    opcionesSemanas,
    opcionesObras,
    opcionesEmpresas,
    opcionesSindicatos,
    opcionesMateriales,
    opcionesBancos,
    // Gráficas
    seriesTiempo,
    seriesTiempoRenta,
    tablaViajesRentaPorEquipo,
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
    loadingTiempoReal,
    errorTiempoReal,
    fetchValesTiempoReal,
    tablaObraMaterialTiempoReal,
    tablaObraRentaTiempoReal,
    // Volumen acumulado histórico por obra (sin filtro de periodo) + % vs presupuesto
    tablaObraMaterialAcumulado,
    tablaObraRentaAcumulado,
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
