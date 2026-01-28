/**
 * src/hooks/useDashboardAnalytics.js
 *
 * Hook para obtener métricas y analytics del dashboard
 *
 * Funcionalidades:
 * - Métricas generales (total vales, m³, horas, valor)
 * - Tendencia mensual de vales (últimos 6 meses)
 * - Distribución por obra
 * - Distribución por tipo (material vs renta)
 * - Top materiales más solicitados
 *
 * Dependencias: supabase, useAuth
 * Usado en: Dashboard.jsx
 */

// 1. React y hooks
import { useState, useEffect } from "react";

// 2. Config
import { supabase } from "../config/supabase";

// 3. Hooks personalizados
import { useAuth } from "./useAuth";

export const useDashboardAnalytics = () => {
  const { userProfile, canViewAllVales } = useAuth();

  // Estados para métricas
  const [metricas, setMetricas] = useState({
    totalVales: 0,
    totalM3: 0,
    totalHoras: 0,
    valorTotal: 0,
  });

  const [tendenciaMensual, setTendenciaMensual] = useState([]);
  const [distribucionObras, setDistribucionObras] = useState([]);
  const [distribucionTipo, setDistribucionTipo] = useState([]);
  const [topMateriales, setTopMateriales] = useState([]);
  const [periodoTendencia, setPeriodoTendencia] = useState("semana"); // 'semana' o 'mes'
  const [obraSeleccionadaMateriales, setObraSeleccionadaMateriales] =
    useState(null); // null = todas
  const [obrasDisponibles, setObrasDisponibles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Obtener métricas generales
   */
  const fetchMetricasGenerales = async () => {
    try {
      // Query base para vales
      let queryVales = supabase
        .from("vales")
        .select("id_vale, tipo_vale, fecha_creacion");

      // Filtrar por obra si no puede ver todos
      if (!canViewAllVales() && userProfile?.id_current_obra) {
        queryVales = queryVales.eq("id_obra", userProfile.id_current_obra);
      }

      const { data: vales, error: errorVales } = await queryVales;
      if (errorVales) throw errorVales;

      // Contar vales
      const totalVales = vales?.length || 0;
      const valesMaterial =
        vales
          ?.filter((v) => v.tipo_vale === "material")
          .map((v) => v.id_vale) || [];
      const valesRenta =
        vales?.filter((v) => v.tipo_vale === "renta").map((v) => v.id_vale) ||
        [];

      // Obtener detalles de material (m³ y costos)
      let totalM3 = 0;
      let valorMaterial = 0;

      if (valesMaterial.length > 0) {
        const { data: detallesMaterial } = await supabase
          .from("vale_material_detalles")
          .select("volumen_real_m3, cantidad_pedida_m3, costo_total")
          .in("id_vale", valesMaterial);

        if (detallesMaterial) {
          totalM3 = detallesMaterial.reduce((sum, d) => {
            // Usar volumen_real_m3 si existe, sino cantidad_pedida_m3
            const volumen = d.volumen_real_m3 || d.cantidad_pedida_m3 || 0;
            return sum + parseFloat(volumen);
          }, 0);

          valorMaterial = detallesMaterial.reduce(
            (sum, d) => sum + (parseFloat(d.costo_total) || 0),
            0,
          );
        }
      }

      // Obtener detalles de renta (horas y costos)
      let totalHoras = 0;
      let valorRenta = 0;

      if (valesRenta.length > 0) {
        const { data: detallesRenta } = await supabase
          .from("vale_renta_detalle")
          .select("total_horas, total_dias, costo_total, es_renta_por_dia")
          .in("id_vale", valesRenta);

        if (detallesRenta) {
          totalHoras = detallesRenta.reduce((sum, d) => {
            // Si es renta por día, convertir días a horas (8 horas por día)
            if (d.es_renta_por_dia && d.total_dias) {
              return sum + parseFloat(d.total_dias) * 8;
            }
            return sum + (parseFloat(d.total_horas) || 0);
          }, 0);

          valorRenta = detallesRenta.reduce(
            (sum, d) => sum + (parseFloat(d.costo_total) || 0),
            0,
          );
        }
      }

      const valorTotal = valorMaterial + valorRenta;

      setMetricas({
        totalVales,
        totalM3: Math.round(totalM3 * 100) / 100,
        totalHoras: Math.round(totalHoras * 100) / 100,
        valorTotal: Math.round(valorTotal * 100) / 100,
      });

      return vales;
    } catch (error) {
      console.error("Error en fetchMetricasGenerales:", error);
      throw error;
    }
  };

  /**
   * Obtener tendencia por período (semanal o mensual)
   * @param {Array} vales - Array de vales
   * @param {String} periodo - 'semana' o 'mes'
   */
  const fetchTendencia = async (vales, periodo = "semana") => {
    try {
      if (!vales || vales.length === 0) {
        setTendenciaMensual([]);
        return;
      }

      if (periodo === "semana") {
        // Agrupar por semana
        const valesPorSemana = {};

        vales.forEach((vale) => {
          const fecha = new Date(vale.fecha_creacion);

          // Calcular número de semana del año
          const primerDiaAnio = new Date(fecha.getFullYear(), 0, 1);
          const diasTranscurridos = Math.floor(
            (fecha - primerDiaAnio) / (24 * 60 * 60 * 1000),
          );
          const numeroSemana = Math.ceil(
            (diasTranscurridos + primerDiaAnio.getDay() + 1) / 7,
          );

          const semanaKey = `${fecha.getFullYear()}-S${String(numeroSemana).padStart(2, "0")}`;

          if (!valesPorSemana[semanaKey]) {
            valesPorSemana[semanaKey] = {
              periodo: semanaKey,
              cantidad: 0,
              fecha: fecha,
            };
          }
          valesPorSemana[semanaKey].cantidad++;
        });

        // Convertir a array y ordenar
        const tendencia = Object.values(valesPorSemana)
          .sort((a, b) => a.fecha - b.fecha)
          .slice(-8) // Últimas 8 semanas
          .map((item) => {
            const [year, semana] = item.periodo.split("-S");
            return {
              periodo: `S${semana}/${year.slice(2)}`,
              cantidad: item.cantidad,
            };
          });

        setTendenciaMensual(tendencia);
      } else {
        // Agrupar por mes (código original)
        const valesPorMes = {};

        vales.forEach((vale) => {
          const fecha = new Date(vale.fecha_creacion);
          const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;

          if (!valesPorMes[mesKey]) {
            valesPorMes[mesKey] = {
              mes: mesKey,
              cantidad: 0,
              fecha: fecha,
            };
          }
          valesPorMes[mesKey].cantidad++;
        });

        // Convertir a array y ordenar
        const tendencia = Object.values(valesPorMes)
          .sort((a, b) => a.fecha - b.fecha)
          .slice(-6) // Últimos 6 meses
          .map((item) => {
            const [year, month] = item.mes.split("-");
            const meses = [
              "Ene",
              "Feb",
              "Mar",
              "Abr",
              "May",
              "Jun",
              "Jul",
              "Ago",
              "Sep",
              "Oct",
              "Nov",
              "Dic",
            ];
            return {
              periodo: `${meses[parseInt(month) - 1]} ${year.slice(2)}`,
              cantidad: item.cantidad,
            };
          });

        setTendenciaMensual(tendencia);
      }
    } catch (error) {
      console.error("Error en fetchTendencia:", error);
    }
  };

  /**
   * Obtener distribución por obra (top 5)
   */
  const fetchDistribucionObras = async () => {
    try {
      let query = supabase.from("vales").select(
        `
          id_vale,
          obras:id_obra (
            obra
          )
        `,
        { count: "exact" },
      );

      // Filtrar por obra si no puede ver todos
      if (!canViewAllVales() && userProfile?.id_current_obra) {
        query = query.eq("id_obra", userProfile.id_current_obra);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por obra
      const obrasCounts = {};
      data?.forEach((vale) => {
        const nombreObra = vale.obras?.obra || "Sin obra";
        obrasCounts[nombreObra] = (obrasCounts[nombreObra] || 0) + 1;
      });

      // Convertir a array y ordenar por cantidad
      const distribucion = Object.entries(obrasCounts)
        .map(([obra, cantidad]) => ({ obra, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5); // Top 5

      setDistribucionObras(distribucion);
    } catch (error) {
      console.error("Error en fetchDistribucionObras:", error);
    }
  };

  /**
   * Obtener distribución por tipo (material vs renta)
   */
  const fetchDistribucionTipo = async () => {
    try {
      let query = supabase
        .from("vales")
        .select("tipo_vale", { count: "exact" });

      // Filtrar por obra si no puede ver todos
      if (!canViewAllVales() && userProfile?.id_current_obra) {
        query = query.eq("id_obra", userProfile.id_current_obra);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Contar por tipo
      const material =
        data?.filter((v) => v.tipo_vale === "material").length || 0;
      const renta = data?.filter((v) => v.tipo_vale === "renta").length || 0;

      setDistribucionTipo([
        {
          tipo: "Material",
          cantidad: material,
          porcentaje: Math.round((material / (material + renta)) * 100) || 0,
        },
        {
          tipo: "Renta",
          cantidad: renta,
          porcentaje: Math.round((renta / (material + renta)) * 100) || 0,
        },
      ]);
    } catch (error) {
      console.error("Error en fetchDistribucionTipo:", error);
    }
  };

  /**
   * Obtener lista de obras disponibles
   */
  const fetchObrasDisponibles = async () => {
    try {
      let query = supabase.from("obras").select("id_obra, obra").order("obra");

      // Si el usuario no puede ver todas, solo mostrar su obra
      if (!canViewAllVales() && userProfile?.id_current_obra) {
        query = query.eq("id_obra", userProfile.id_current_obra);
      }

      const { data, error } = await query;
      if (error) throw error;

      setObrasDisponibles(data || []);
    } catch (error) {
      console.error("Error en fetchObrasDisponibles:", error);
    }
  };

  /**
   * Obtener top 5 materiales más solicitados (por M³)
   * Ahora soporta filtrado por obra específica
   */
  const fetchTopMateriales = async () => {
    try {
      // Materiales de vales de material (con M³)
      let queryMaterial = supabase.from("vale_material_detalles").select(
        `
          id_detalle_material,
          id_vale,
          volumen_real_m3,
          cantidad_pedida_m3,
          material:id_material (
            material
          )
        `,
      );

      const { data: detallesMaterial, error: errorMaterial } =
        await queryMaterial;
      if (errorMaterial) throw errorMaterial;

      // Materiales de vales de renta (con capacidad M³)
      let queryRenta = supabase.from("vale_renta_detalle").select(
        `
          id_vale_renta_detalle,
          id_vale,
          capacidad_m3,
          material:id_material (
            material
          )
        `,
      );

      const { data: detallesRenta, error: errorRenta } = await queryRenta;
      if (errorRenta) throw errorRenta;

      // Si hay filtro por obra (global del usuario o selección específica)
      const idObraFiltro =
        obraSeleccionadaMateriales ||
        (!canViewAllVales() && userProfile?.id_current_obra
          ? userProfile.id_current_obra
          : null);

      if (idObraFiltro) {
        const { data: valesObra } = await supabase
          .from("vales")
          .select("id_vale")
          .eq("id_obra", idObraFiltro);

        const idsValesObra = valesObra?.map((v) => v.id_vale) || [];

        // Filtrar detalles por vales de la obra
        const materialesFiltrados = detallesMaterial?.filter((d) =>
          idsValesObra.includes(d.id_vale),
        );
        const rentaFiltrada = detallesRenta?.filter((d) =>
          idsValesObra.includes(d.id_vale),
        );

        detallesMaterial.length = 0;
        detallesRenta.length = 0;
        detallesMaterial.push(...(materialesFiltrados || []));
        detallesRenta.push(...(rentaFiltrada || []));
      }

      // Sumar M³ por material
      const materialesM3 = {};

      // Material: usar volumen_real_m3 o cantidad_pedida_m3
      detallesMaterial?.forEach((detalle) => {
        const nombreMaterial = detalle.material?.material || "Sin material";
        const m3 = parseFloat(
          detalle.volumen_real_m3 || detalle.cantidad_pedida_m3 || 0,
        );

        if (!materialesM3[nombreMaterial]) {
          materialesM3[nombreMaterial] = 0;
        }
        materialesM3[nombreMaterial] += m3;
      });

      // Renta: usar capacidad_m3
      detallesRenta?.forEach((detalle) => {
        const nombreMaterial = detalle.material?.material || "Sin material";
        const m3 = parseFloat(detalle.capacidad_m3 || 0);

        if (!materialesM3[nombreMaterial]) {
          materialesM3[nombreMaterial] = 0;
        }
        materialesM3[nombreMaterial] += m3;
      });

      // Convertir a array y ordenar por M³
      const top = Object.entries(materialesM3)
        .map(([material, m3Total]) => ({
          material,
          m3Total: Math.round(m3Total * 100) / 100,
        }))
        .sort((a, b) => b.m3Total - a.m3Total)
        .slice(0, 5);

      setTopMateriales(top);
    } catch (error) {
      console.error("Error en fetchTopMateriales:", error);
    }
  };

  /**
   * Cargar todos los datos
   */
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Métricas generales (retorna vales para reutilizar)
      const vales = await fetchMetricasGenerales();

      // 2. Tendencia (usa los vales ya obtenidos)
      await fetchTendencia(vales, periodoTendencia);

      // 3. Distribuciones (queries independientes)
      await Promise.all([
        fetchDistribucionObras(),
        fetchDistribucionTipo(),
        fetchTopMateriales(),
        fetchObrasDisponibles(), // ← Nueva función
      ]);
    } catch (error) {
      console.error("Error en fetchAllData:", error);
      setError("No se pudieron cargar las estadísticas del dashboard");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cambiar obra seleccionada para filtrar materiales
   */
  const cambiarObraMateriales = async (idObra) => {
    setObraSeleccionadaMateriales(idObra);
    // Recargar solo los materiales con el nuevo filtro
    await fetchTopMateriales();
  };

  /**
   * Cambiar período de tendencia
   */
  const cambiarPeriodo = async (nuevoPeriodo) => {
    setPeriodoTendencia(nuevoPeriodo);

    // Recargar solo la tendencia con el nuevo período
    try {
      let query = supabase
        .from("vales")
        .select("id_vale, tipo_vale, fecha_creacion");

      if (!canViewAllVales() && userProfile?.id_current_obra) {
        query = query.eq("id_obra", userProfile.id_current_obra);
      }

      const { data: vales } = await query;
      await fetchTendencia(vales, nuevoPeriodo);
    } catch (error) {
      console.error("Error al cambiar período:", error);
    }
  };

  // Cargar datos al montar componente
  useEffect(() => {
    if (userProfile) {
      fetchAllData();
    }
  }, [userProfile?.id_persona, userProfile?.id_current_obra, periodoTendencia]);

  // Recargar materiales cuando cambie el filtro de obra
  useEffect(() => {
    if (userProfile && obrasDisponibles.length > 0) {
      fetchTopMateriales();
    }
  }, [obraSeleccionadaMateriales]);

  return {
    // Datos
    metricas,
    tendenciaMensual,
    distribucionObras,
    distribucionTipo,
    topMateriales,
    periodoTendencia,
    obrasDisponibles,
    obraSeleccionadaMateriales,

    // Estados
    loading,
    error,

    // Funciones
    refresh: fetchAllData,
    cambiarPeriodo,
    cambiarObraMateriales,
  };
};
