/**
 * src/hooks/useAutorizacion.js
 *
 * Hook de datos para la pestaña "Autorizar Vales" (control del Administrador,
 * independiente de la verificación del sindicato). Fetch server-side por
 * rango de fechas + filtros client-side + selección en lote para autorizar
 * varios vales a la vez, más desautorizar uno por uno.
 *
 * Dependencias: config/supabase.js, hooks/useAuth.jsx
 * Usado en: pages/AutorizarVales.jsx
 */

// 1. React
import { useState, useEffect, useMemo, useCallback } from "react";

// 2. Config
import { supabase } from "../config/supabase";

// 3. Hooks personalizados
import { useAuth } from "./useAuth";

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getDefaultFechaInicio = () => {
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  return formatDate(hace30Dias);
};

const SELECT_AUTORIZACION = `
  *,
  obras:id_obra (
    id_obra, obra, cc,
    empresas:id_empresa (empresa, sufijo, logo)
  ),
  operadores:id_operador (
    id_operador, id_sindicato, nombre_completo,
    sindicatos:id_sindicato (id_sindicato, sindicato)
  ),
  vehiculos:id_vehiculo (id_vehiculo, placas, capacidad_m3),
  persona:id_persona_creador (nombre, primer_apellido, segundo_apellido),
  tickets_material (id_ticket, numero_ticket, folio_ticket, fecha_impresion),
  tickets_descarga (
    numero_ticket, id_material_ticket,
    material_ticket:id_material_ticket (material)
  ),
  vale_material_detalles (
    id_detalle_material, capacidad_m3, distancia_km, cantidad_pedida_m3,
    peso_ton, volumen_real_m3, precio_m3, costo_total,
    folio_banco, requisicion, notas_adicionales,
    tarifa_primer_km, tarifa_subsecuente,
    material:id_material (
      id_material, material,
      tipo_de_material:id_tipo_de_material (id_tipo_de_material, tipo_de_material)
    ),
    bancos:id_banco (id_banco, banco),
    vale_material_viajes (
      id_viaje, numero_viaje, hora_registro, peso_ton, volumen_m3,
      precio_m3, costo_viaje, folio_vale_fisico,
      id_banco_override, distancia_km_override, precio_m3_override, costo_viaje_override,
      bancos_override:id_banco_override (id_banco, banco)
    )
  ),
  vale_renta_detalle (
    id_vale_renta_detalle, capacidad_m3, hora_inicio, hora_fin,
    total_horas, total_dias, costo_total, numero_viajes,
    notas_adicionales, es_renta_por_dia,
    material:id_material (id_material, material),
    precios_renta:id_precios_renta (costo_hr, costo_dia),
    vale_renta_viajes (id_viaje, numero_viaje, hora_registro)
  ),
  solicitudes_desverificacion (
    id_solicitud, estado, motivo_solicitud, motivo_respuesta,
    fecha_solicitud, fecha_respuesta, id_sindicato_requerido,
    sindicatos:id_sindicato_requerido (sindicato),
    persona_solicitante:id_persona_solicitante (nombre, primer_apellido),
    persona_respondedor:id_persona_respondedor (nombre, primer_apellido)
  )
`;

const getMaterialVale = (vale) => {
  if (vale.tipo_vale === "renta") {
    return vale.vale_renta_detalle?.[0]?.material?.material ?? "—";
  }
  return vale.vale_material_detalles?.[0]?.material?.material ?? "—";
};

// Folios de remisión: folio_vale_fisico por viaje (Tipos 1/2), con fallback a
// folio_banco del detalle si el viaje no lo tiene; más folio_ticket de
// tickets_material (Tipo 3 — corte). Mismo criterio que el export de
// DashboardUnificado.jsx.
const getFoliosRemision = (vale) => {
  const folios = new Set();
  for (const det of vale.vale_material_detalles ?? []) {
    const foliosViaje = (det.vale_material_viajes ?? [])
      .map((v) => v.folio_vale_fisico)
      .filter(Boolean);
    if (foliosViaje.length > 0) {
      foliosViaje.forEach((f) => folios.add(f));
    } else if (det.folio_banco) {
      folios.add(det.folio_banco);
    }
  }
  for (const ticket of vale.tickets_material ?? []) {
    if (ticket.folio_ticket) folios.add(ticket.folio_ticket);
  }
  return [...folios];
};

export const useAutorizacion = () => {
  const { userProfile } = useAuth();

  const [vales, setVales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fechaInicio, setFechaInicio] = useState(getDefaultFechaInicio());
  const [fechaFin, setFechaFin] = useState(formatDate(new Date()));

  const [filtroCCs, setFiltroCCs] = useState([]);
  const [filtroSindicatos, setFiltroSindicatos] = useState([]);
  const [filtroMateriales, setFiltroMateriales] = useState([]);
  const [estadoAutorizacion, setEstadoAutorizacion] = useState("pendientes"); // pendientes | autorizados | todos
  const [busqueda, setBusqueda] = useState("");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [autorizando, setAutorizando] = useState(false);
  const [desautorizando, setDesautorizando] = useState(false);

  const fetchVales = useCallback(async (inicio, fin) => {
    try {
      setLoading(true);
      setError(null);

      // .range(0, 4999) evita el límite default de 1000 filas de PostgREST.
      const { data, error: err } = await supabase
        .from("vales")
        .select(SELECT_AUTORIZACION)
        .gte("fecha_creacion", inicio + "T00:00:00")
        .lte("fecha_creacion", fin + "T23:59:59")
        .neq("estado", "cancelado")
        .order("fecha_creacion", { ascending: false })
        .range(0, 4999);

      if (err) throw err;
      setVales(data ?? []);
    } catch (err) {
      console.error("Error en useAutorizacion:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVales(fechaInicio, fechaFin);
  }, [fechaInicio, fechaFin, fetchVales]);

  const refetch = useCallback(() => {
    fetchVales(fechaInicio, fechaFin);
  }, [fetchVales, fechaInicio, fechaFin]);

  const valesEnriquecidos = useMemo(
    () =>
      vales.map((v) => ({
        ...v,
        _material: getMaterialVale(v),
        _foliosRemision: getFoliosRemision(v),
      })),
    [vales],
  );

  const valesFiltrados = useMemo(() => {
    let lista = valesEnriquecidos;

    if (estadoAutorizacion === "pendientes") {
      lista = lista.filter((v) => !v.autorizado);
    } else if (estadoAutorizacion === "autorizados") {
      lista = lista.filter((v) => v.autorizado);
    }
    if (filtroCCs.length > 0) {
      lista = lista.filter((v) => {
        const key = v.obras ? `${v.obras.cc} · ${v.obras.obra}` : null;
        return key && filtroCCs.includes(key);
      });
    }
    if (filtroSindicatos.length > 0) {
      lista = lista.filter((v) =>
        filtroSindicatos.includes(v.operadores?.sindicatos?.sindicato),
      );
    }
    if (filtroMateriales.length > 0) {
      lista = lista.filter((v) => filtroMateriales.includes(v._material));
    }
    if (busqueda.trim()) {
      const term = busqueda.toLowerCase();
      lista = lista.filter(
        (v) =>
          v.folio?.toLowerCase().includes(term) ||
          v.obras?.obra?.toLowerCase().includes(term) ||
          v.operadores?.nombre_completo?.toLowerCase().includes(term) ||
          v._material?.toLowerCase().includes(term) ||
          v.vehiculos?.placas?.toLowerCase().includes(term) ||
          v._foliosRemision?.some((f) => f.toLowerCase().includes(term)),
      );
    }

    return lista;
  }, [
    valesEnriquecidos,
    estadoAutorizacion,
    filtroCCs,
    filtroSindicatos,
    filtroMateriales,
    busqueda,
  ]);

  const opciones = useMemo(() => {
    const ccs = [
      ...new Set(
        valesEnriquecidos
          .map((v) => (v.obras ? `${v.obras.cc} · ${v.obras.obra}` : null))
          .filter(Boolean),
      ),
    ].sort();
    const sindicatos = [
      ...new Set(
        valesEnriquecidos
          .map((v) => v.operadores?.sindicatos?.sindicato)
          .filter(Boolean),
      ),
    ].sort();
    const materiales = [
      ...new Set(
        valesEnriquecidos.map((v) => v._material).filter((m) => m && m !== "—"),
      ),
    ].sort();
    return { ccs, sindicatos, materiales };
  }, [valesEnriquecidos]);

  // ── Selección en lote ───────────────────────────────────────────────────

  const esSeleccionable = (vale) =>
    !vale.autorizado && vale.estado !== "cancelado" && vale.estado !== "conciliado";

  const toggleSelect = useCallback((idVale) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idVale)) next.delete(idVale);
      else next.add(idVale);
      return next;
    });
  }, []);

  const selectAllPendientesVisibles = useCallback(() => {
    const seleccionables = valesFiltrados.filter(esSeleccionable).map((v) => v.id_vale);
    setSelectedIds((prev) => {
      const todosSeleccionados = seleccionables.every((id) => prev.has(id));
      return todosSeleccionados ? new Set() : new Set(seleccionables);
    });
  }, [valesFiltrados]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ── Autorizar / desautorizar ────────────────────────────────────────────

  const autorizarBatch = useCallback(
    async (idsVales) => {
      setAutorizando(true);
      const resultado = { autorizados: [], errores: [] };

      for (const idVale of idsVales) {
        try {
          const { data, error: rpcError } = await supabase.rpc("autorizar_vale", {
            p_id_vale: idVale,
            p_id_persona_autorizador: userProfile.id_persona,
          });

          if (rpcError) throw rpcError;
          if (!data?.success) throw new Error(data?.error || "Error al autorizar");

          await supabase.from("vale_accesos").insert({
            id_vale: idVale,
            id_persona: userProfile.id_persona,
            tipo_accion: "autorizacion_admin",
            user_agent: navigator.userAgent,
          });

          resultado.autorizados.push(idVale);
        } catch (err) {
          resultado.errores.push({ idVale, error: err.message });
        }
      }

      setAutorizando(false);
      clearSelection();
      await refetch();
      return resultado;
    },
    [userProfile, clearSelection, refetch],
  );

  const desautorizarVale = useCallback(
    async (idVale, motivo) => {
      try {
        setDesautorizando(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc("desautorizar_vale", {
          p_id_vale: idVale,
          p_id_persona_autorizador: userProfile.id_persona,
          p_motivo: motivo?.trim() || null,
        });

        if (rpcError) throw rpcError;
        if (!data?.success) throw new Error(data?.error || "Error al desautorizar");

        await supabase.from("vale_accesos").insert({
          id_vale: idVale,
          id_persona: userProfile.id_persona,
          tipo_accion: "desautorizacion_admin",
          user_agent: navigator.userAgent,
        });

        await refetch();
        return { success: true };
      } catch (err) {
        setError(err.message || "Error al desautorizar el vale");
        return { success: false, error: err.message };
      } finally {
        setDesautorizando(false);
      }
    },
    [userProfile, refetch],
  );

  return {
    valesFiltrados,
    loading,
    error,
    opciones,
    filtros: {
      fechaInicio,
      fechaFin,
      filtroCCs,
      filtroSindicatos,
      filtroMateriales,
      estadoAutorizacion,
      busqueda,
    },
    cambiarRango: (inicio, fin) => {
      setFechaInicio(inicio);
      setFechaFin(fin);
      clearSelection();
    },
    cambiarCCs: setFiltroCCs,
    cambiarSindicatos: setFiltroSindicatos,
    cambiarMateriales: setFiltroMateriales,
    cambiarEstadoAutorizacion: (valor) => {
      setEstadoAutorizacion(valor);
      clearSelection();
    },
    cambiarBusqueda: setBusqueda,
    refetch,
    selectedIds,
    esSeleccionable,
    toggleSelect,
    selectAllPendientesVisibles,
    clearSelection,
    autorizarBatch,
    autorizando,
    desautorizarVale,
    desautorizando,
  };
};
