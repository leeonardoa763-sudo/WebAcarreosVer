/**
 * src/hooks/useEstadisticasGlobales.js
 *
 * Estadísticas globales con filtros reactivos por mes, semana, obra, empresa,
 * sindicato, material y banco. Expone series de tiempo para gráfica.
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

export const useEstadisticasGlobales = () => {
  // 1. Estados base
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawConciliaciones, setRawConciliaciones] = useState([]);
  const [rawVales, setRawVales] = useState([]);
  const [valeAConciliacion, setValeAConciliacion] = useState({});

  // 2. Estado de filtros
  const [filtros, setFiltrosState] = useState({
    mes: null,
    semana: null,
    idObra: null,
    idEmpresa: null,
    idSindicato: null,
    material: null,
    idBanco: null,
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
          "id_conciliacion, tipo_conciliacion, total_final, total_horas, total_dias, fecha_generacion, folio"
        );

      if (errorConc) throw errorConc;
      setRawConciliaciones(conciliaciones || []);

      // Solo procesar conciliaciones de material para la tabla
      const concMaterialIds = (conciliaciones || [])
        .filter((c) => c.tipo_conciliacion === "material")
        .map((c) => c.id_conciliacion);

      if (concMaterialIds.length === 0) {
        setRawVales([]);
        setValeAConciliacion({});
        return;
      }

      // Query B: vales ligados a conciliaciones de material
      const { data: cvData, error: errorCv } = await supabase
        .from("conciliacion_vales")
        .select("id_vale, id_conciliacion")
        .in("id_conciliacion", concMaterialIds);

      if (errorCv) throw errorCv;

      // Mapa valeId → conciliación completa
      const concMap = {};
      (conciliaciones || []).forEach((c) => { concMap[c.id_conciliacion] = c; });

      const valeConc = {};
      (cvData || []).forEach((cv) => { valeConc[cv.id_vale] = concMap[cv.id_conciliacion]; });
      setValeAConciliacion(valeConc);

      const valeIds = [...new Set((cvData || []).map((cv) => cv.id_vale))];
      if (valeIds.length === 0) { setRawVales([]); return; }

      // Query C: vales con todos los campos para filtros y agregación
      const { data: vales, error: errorVales } = await supabase
        .from("vales")
        .select(
          `
          id_vale, id_obra, id_operador, id_persona_creador, id_persona_verificador, id_vehiculo,
          obras:id_obra (id_obra, obra, empresas:id_empresa (id_empresa, empresa)),
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
        `
        )
        .in("id_vale", valeIds)
        .neq("id_obra", 8);

      if (errorVales) throw errorVales;
      setRawVales(vales || []);

      // ── LOG DE VERIFICACIÓN ──────────────────────────────────────────
      // Compara estos totales contra la query en Supabase SQL Editor:
      //
      // SELECT
      //   m.material,
      //   tdm.id_tipo_de_material,
      //   SUM(CASE WHEN tdm.id_tipo_de_material = 3 THEN vmd.volumen_real_m3
      //            ELSE vmv_totales.m3 END)         AS m3_total,
      //   COUNT(DISTINCT v.id_vale)                  AS vales_count,
      //   SUM(vmd.costo_total) * 1.16                AS importe_iva
      // FROM vales v
      // JOIN conciliacion_vales cv ON v.id_vale = cv.id_vale
      // JOIN conciliaciones c      ON cv.id_conciliacion = c.id_conciliacion
      //                           AND c.tipo_conciliacion = 'material'
      // JOIN vale_material_detalles vmd ON v.id_vale = vmd.id_vale
      // JOIN material m              ON vmd.id_material = m.id_material
      // JOIN tipo_de_material tdm    ON m.id_tipo_de_material = tdm.id_tipo_de_material
      // LEFT JOIN LATERAL (
      //   SELECT SUM(volumen_m3) AS m3
      //   FROM vale_material_viajes
      //   WHERE id_detalle_material = vmd.id_detalle_material
      // ) vmv_totales ON true
      // GROUP BY m.material, tdm.id_tipo_de_material
      // ORDER BY m3_total DESC;

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
        .map((s) => ({
          material: s.material,
          tipo: s.tipoId,
          m3_total: Math.round(s.m3 * 100) / 100,
          vales_count: s.valesIds.size,
          importe_iva: Math.round(s.importeIVA * 100) / 100,
        }))
        .sort((a, b) => b.m3_total - a.m3_total);

      console.group("[EstadisticasGlobales] Verificación de datos");
      console.log(`Conciliaciones: ${(conciliaciones || []).length} total`);
      console.log(`Vales con material conciliado: ${(vales || []).length}`);
      console.table(logTable);
      console.groupEnd();
      // ────────────────────────────────────────────────────────────────

    } catch (err) {
      console.error("Error en fetchEstadisticas:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. Effect inicial
  useEffect(() => { fetchEstadisticas(); }, []);

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
      if (vale.id_obra === 8) return false;
      const conc = valeAConciliacion[vale.id_vale];

      if (filtros.mes && conc?.fecha_generacion?.substring(0, 7) !== filtros.mes) return false;
      if (filtros.semana && getWeekKey(conc?.fecha_generacion) !== filtros.semana) return false;
      if (filtros.idObra && String(vale.id_obra) !== String(filtros.idObra)) return false;
      if (filtros.idEmpresa && String(vale.obras?.empresas?.id_empresa) !== String(filtros.idEmpresa)) return false;
      if (filtros.idSindicato && String(vale.operadores?.id_sindicato) !== String(filtros.idSindicato)) return false;

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

        if (filtroMaterial && nombre !== filtroMaterial) return;
        if (filtroBanco && String(det.id_banco) !== String(filtroBanco)) return;

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
          (det.vale_material_viajes || []).forEach((v) => { s.m3Total += Number(v.volumen_m3 || 0); });
          s.totalViajes += det.vale_material_viajes?.length || 0;
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
    let concsFiltradas = rawConciliaciones;
    if (filtros.mes) {
      concsFiltradas = concsFiltradas.filter(
        (c) => c.fecha_generacion?.substring(0, 7) === filtros.mes
      );
    }
    if (filtros.semana) {
      concsFiltradas = concsFiltradas.filter(
        (c) => getWeekKey(c.fecha_generacion) === filtros.semana
      );
    }

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
  }, [rawConciliaciones, filtros.mes, filtros.semana, tablaMaterial]);

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
      if (filtros.idObra && String(vale.id_obra) !== String(filtros.idObra)) return false;
      if (filtros.idEmpresa && String(vale.obras?.empresas?.id_empresa) !== String(filtros.idEmpresa)) return false;
      if (filtros.idSindicato && String(vale.operadores?.id_sindicato) !== String(filtros.idSindicato)) return false;
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

        if (filtros.material && mat !== filtros.material) return;
        if (filtros.idBanco && String(det.id_banco) !== String(filtros.idBanco)) return;

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
      if (filtros.material && det.material?.material !== filtros.material) return false;
      if (filtros.idBanco && String(det.id_banco) !== String(filtros.idBanco)) return false;
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

  // ── Acciones de filtros ─────────────────────────────────────────────
  const setFiltro = useCallback((key, value) => {
    setFiltrosState((prev) => ({ ...prev, [key]: prev[key] === value ? null : value }));
  }, []);

  const resetFiltros = useCallback(() => {
    setFiltrosState({
      mes: null, semana: null, idObra: null, idEmpresa: null,
      idSindicato: null, material: null, idBanco: null,
    });
  }, []);

  const hayFiltrosActivos = Object.values(filtros).some(Boolean);

  return {
    loading,
    error,
    resumen,
    tablaMaterial,
    ultimaConciliacion,
    fetchEstadisticas,
    // Filtros
    filtros,
    setFiltro,
    resetFiltros,
    hayFiltrosActivos,
    opcionesMeses,
    opcionesSemanas,
    opcionesObras,
    opcionesEmpresas,
    opcionesSindicatos,
    opcionesMateriales,
    opcionesBancos,
    // Gráfica
    seriesTiempo,
    // Análisis avanzado
    topResidentes,
    topChecadores,
    topPlacas,
    horasPico,
    viajesPorVale,
    rendimientoPorMaterial,
  };
};
