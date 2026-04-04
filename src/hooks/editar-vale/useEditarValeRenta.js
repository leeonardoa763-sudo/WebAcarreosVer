/**
 * src/hooks/editar-vale/useEditarValeRenta.js
 *
 * Lógica para editar el tipo de renta de un vale (día completo, medio día, horas).
 * Actualiza los campos es_renta_por_dia, total_dias, total_horas y recalcula costo_total.
 *
 * Dependencias: supabase
 * Usado en: ModalEditarValeRenta.jsx
 */

// 1. React y hooks
import { useState, useCallback } from "react";

// 2. Config
import { supabase } from "../../config/supabase";

// ─── Constantes ───────────────────────────────────────────────────────────────

/**
 * Opciones disponibles para el tipo de renta
 */
export const OPCIONES_TIPO_RENTA = [
  { valor: "dia", label: "Día completo", dias: 1, horas: null, esPorDia: true },
  {
    valor: "medio_dia",
    label: "Medio día",
    dias: 0.5,
    horas: null,
    esPorDia: true,
  },
  {
    valor: "horas",
    label: "Por horas",
    dias: null,
    horas: null,
    esPorDia: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determinar la opción activa a partir de los valores actuales del detalle
 * @param {object} detalle
 * @returns {'dia' | 'medio_dia' | 'horas'}
 */
const detectarOpcionActual = (detalle) => {
  const totalDias = Number(detalle.total_dias || 0);
  if (totalDias === 1) return "dia";
  if (totalDias === 0.5) return "medio_dia";
  return "horas";
};

/**
 * Calcular costo total según tarifa y tipo de renta
 * @param {string} opcion  - 'dia' | 'medio_dia' | 'horas'
 * @param {number} totalHoras - solo relevante cuando opcion === 'horas'
 * @param {number} costoDia
 * @param {number} costoHr
 * @returns {number}
 */
const calcularCosto = (opcion, totalHoras, costoDia, costoHr) => {
  if (opcion === "dia") return Number(costoDia || 0);
  if (opcion === "medio_dia") return Number(costoDia / 2 || 0);
  if (opcion === "horas")
    return Number((Number(totalHoras || 0) * Number(costoHr || 0)).toFixed(2));
  return 0;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useEditarValeRenta = () => {
  // Datos originales del detalle
  const [detalle, setDetalle] = useState(null);

  // Opción seleccionada: 'dia' | 'medio_dia' | 'horas'
  const [opcionSeleccionada, setOpcionSeleccionada] = useState("dia");

  // Horas ingresadas manualmente (solo aplica cuando opcion === 'horas')
  const [totalHorasInput, setTotalHorasInput] = useState("");

  // Estado de UI
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  // ── Cargar detalle ─────────────────────────────────────────────────────────

  /**
   * Carga el detalle de renta desde Supabase
   * @param {string} idValeRentaDetalle - UUID del registro en vale_renta_detalle
   */
  const cargarDetalle = useCallback(async (idValeRentaDetalle) => {
    try {
      setLoading(true);
      setError(null);
      setMensajeExito(null);

      const { data, error: err } = await supabase
        .from("vale_renta_detalle")
        .select(
          `
          id_vale_renta_detalle,
          es_renta_por_dia,
          total_dias,
          total_horas,
          costo_total,
          hora_inicio,
          hora_fin,
          precios_renta:id_precios_renta (
            id_precios_renta,
            costo_hr,
            costo_dia
          ),
          material:id_material (
            material
          )
        `,
        )
        .eq("id_vale_renta_detalle", idValeRentaDetalle)
        .single();

      if (err) throw err;

      const opcionActual = detectarOpcionActual(data);

      setDetalle(data);
      setOpcionSeleccionada(opcionActual);
      setTotalHorasInput(
        opcionActual === "horas" ? String(data.total_horas || "") : "",
      );
    } catch (err) {
      console.error("Error en cargarDetalle (renta):", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Seleccionar opción ─────────────────────────────────────────────────────

  /**
   * Cambia la opción seleccionada. Limpia horas si no aplica.
   * @param {'dia' | 'medio_dia' | 'horas'} nuevaOpcion
   */
  const seleccionarOpcion = useCallback((nuevaOpcion) => {
    setOpcionSeleccionada(nuevaOpcion);
    setError(null);
    setMensajeExito(null);

    if (nuevaOpcion !== "horas") {
      setTotalHorasInput("");
    }
  }, []);

  // ── Calcular preview del costo ─────────────────────────────────────────────

  /**
   * Costo calculado en tiempo real para mostrar en el modal
   */
  const costoPreview = (() => {
    if (!detalle?.precios_renta) return null;
    const { costo_dia, costo_hr } = detalle.precios_renta;
    return calcularCosto(
      opcionSeleccionada,
      totalHorasInput,
      costo_dia,
      costo_hr,
    );
  })();

  // ── Guardar cambios ────────────────────────────────────────────────────────

  /**
   * Persiste los cambios en vale_renta_detalle:
   * - es_renta_por_dia
   * - total_dias
   * - total_horas
   * - costo_total
   */
  const guardarCambios = useCallback(async () => {
    if (!detalle) return;

    // Validar horas si es necesario
    if (opcionSeleccionada === "horas") {
      const horas = Number(totalHorasInput);
      if (!totalHorasInput || isNaN(horas) || horas <= 0) {
        setError("Ingresa un número de horas válido (mayor a 0).");
        return;
      }
    }

    try {
      setGuardando(true);
      setError(null);
      setMensajeExito(null);

      const { costo_dia, costo_hr } = detalle.precios_renta || {};

      // Construir payload según opción
      let payload = {};

      if (opcionSeleccionada === "dia") {
        payload = {
          es_renta_por_dia: true,
          total_dias: 1,
          total_horas: null,
          costo_total: calcularCosto("dia", null, costo_dia, costo_hr),
        };
      } else if (opcionSeleccionada === "medio_dia") {
        payload = {
          es_renta_por_dia: true,
          total_dias: 0.5,
          total_horas: null,
          costo_total: calcularCosto("medio_dia", null, costo_dia, costo_hr),
        };
      } else {
        // Por horas
        const horas = Number(totalHorasInput);
        payload = {
          es_renta_por_dia: false,
          total_dias: null,
          total_horas: horas,
          costo_total: calcularCosto("horas", horas, costo_dia, costo_hr),
        };
      }

      const { error: err } = await supabase
        .from("vale_renta_detalle")
        .update(payload)
        .eq("id_vale_renta_detalle", detalle.id_vale_renta_detalle);

      if (err) throw err;

      // Actualizar detalle local con los nuevos valores
      setDetalle((prev) => ({ ...prev, ...payload }));
      setMensajeExito("Tipo de renta actualizado correctamente.");
    } catch (err) {
      console.error("Error al guardar cambios de renta:", err);
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }, [detalle, opcionSeleccionada, totalHorasInput]);

  // ── Descartar cambios ──────────────────────────────────────────────────────

  /**
   * Restaura la opción original basándose en el detalle cargado
   */
  const descartarCambios = useCallback(() => {
    if (!detalle) return;
    const opcionOriginal = detectarOpcionActual(detalle);
    setOpcionSeleccionada(opcionOriginal);
    setTotalHorasInput(
      opcionOriginal === "horas" ? String(detalle.total_horas || "") : "",
    );
    setError(null);
    setMensajeExito(null);
  }, [detalle]);

  // ── Detectar cambios pendientes ────────────────────────────────────────────

  const hayCambiosPendientes = (() => {
    if (!detalle) return false;
    const opcionOriginal = detectarOpcionActual(detalle);
    if (opcionSeleccionada !== opcionOriginal) return true;
    if (opcionSeleccionada === "horas") {
      return String(detalle.total_horas || "") !== totalHorasInput;
    }
    return false;
  })();

  return {
    detalle,
    opcionSeleccionada,
    totalHorasInput,
    costoPreview,
    loading,
    guardando,
    error,
    mensajeExito,
    hayCambiosPendientes,
    cargarDetalle,
    seleccionarOpcion,
    setTotalHorasInput,
    guardarCambios,
    descartarCambios,
  };
};
