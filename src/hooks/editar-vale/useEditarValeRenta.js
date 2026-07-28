/**
 * src/hooks/editar-vale/useEditarValeRenta.js
 *
 * Lógica para editar un vale de renta: material del detalle, tipo de renta
 * (día completo, medio día, horas) y sus viajes internos (vale_renta_viajes:
 * numero_viaje, hora_registro). Actualiza id_material, es_renta_por_dia,
 * total_dias, total_horas, numero_viajes y recalcula costo_total.
 *
 * Nota: precios_renta (costo_hr/costo_dia) depende de id_sindicato, no del
 * material — cambiar el material no requiere recalcular tarifas.
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

  // Catálogo de materiales disponibles (para editar el material del detalle)
  const [materiales, setMateriales] = useState([]);

  // id_material original — para detectar cambios pendientes y descartar
  const [idMaterialOriginal, setIdMaterialOriginal] = useState(null);

  // Viajes (vale_renta_viajes) — estado de edición y copia original
  const [viajes, setViajes] = useState([]);
  const [viajesOriginales, setViajesOriginales] = useState([]);
  const [viajesEditados, setViajesEditados] = useState(new Set());
  const [viajesNuevos, setViajesNuevos] = useState(new Set());
  const [viajesAEliminar, setViajesAEliminar] = useState(new Set());

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
      setViajesEditados(new Set());
      setViajesNuevos(new Set());
      setViajesAEliminar(new Set());

      const { data, error: err } = await supabase
        .from("vale_renta_detalle")
        .select(
          `
          id_vale_renta_detalle,
          id_material,
          es_renta_por_dia,
          total_dias,
          total_horas,
          numero_viajes,
          costo_total,
          hora_inicio,
          hora_fin,
          precios_renta:id_precios_renta (
            id_precios_renta,
            costo_hr,
            costo_dia
          ),
          material:id_material (
            id_material,
            material
          ),
          vale_renta_viajes (
            id_viaje,
            numero_viaje,
            hora_registro,
            persona_registro:id_persona_registro (
              nombre,
              primer_apellido
            )
          )
        `,
        )
        .eq("id_vale_renta_detalle", idValeRentaDetalle)
        .single();

      if (err) throw err;

      // Catálogo de materiales (para el selector de edición)
      const { data: dataMateriales, error: errorMateriales } = await supabase
        .from("material")
        .select("id_material, material")
        .order("material", { ascending: true });

      if (errorMateriales) throw errorMateriales;
      setMateriales(dataMateriales || []);

      const opcionActual = detectarOpcionActual(data);
      const viajesOrdenados = [...(data.vale_renta_viajes || [])].sort(
        (a, b) => a.numero_viaje - b.numero_viaje,
      );

      setDetalle(data);
      setOpcionSeleccionada(opcionActual);
      setTotalHorasInput(
        opcionActual === "horas" ? String(data.total_horas || "") : "",
      );
      setIdMaterialOriginal(data.id_material);
      setViajesOriginales(viajesOrdenados);
      setViajes(viajesOrdenados.map((v) => ({ ...v })));
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

  // ── Editar material del detalle ────────────────────────────────────────────

  /**
   * Cambia el material del detalle. No afecta precios_renta (la tarifa
   * costo_hr/costo_dia depende del sindicato, no del material).
   * @param {number} id_material
   */
  const editarMaterialDetalle = useCallback(
    (id_material) => {
      const materialSeleccionado = materiales.find(
        (m) => m.id_material === id_material,
      );
      if (!materialSeleccionado) return;

      setDetalle((prev) =>
        prev ? { ...prev, id_material, material: materialSeleccionado } : prev,
      );
      setError(null);
      setMensajeExito(null);
    },
    [materiales],
  );

  // ── Viajes: edición de campo ───────────────────────────────────────────────

  /**
   * Actualiza un campo de un viaje (solo hora_registro es editable).
   * @param {string} id_viaje - UUID del viaje (o id temporal para nuevos)
   * @param {string} campo
   * @param {string} valor
   */
  const editarCampoViaje = useCallback((id_viaje, campo, valor) => {
    setViajes((prev) =>
      prev.map((v) => (v.id_viaje === id_viaje ? { ...v, [campo]: valor } : v)),
    );
    setViajesEditados((prev) => new Set(prev).add(id_viaje));
  }, []);

  // ── Viajes: agregar ────────────────────────────────────────────────────────

  /**
   * Agrega un viaje nuevo vacío al estado local.
   */
  const agregarViaje = useCallback(() => {
    const idTemporal = `nuevo_${Date.now()}`;
    const siguienteNumero =
      viajes.length > 0
        ? Math.max(...viajes.map((v) => v.numero_viaje)) + 1
        : 1;

    const viajeNuevo = {
      id_viaje: idTemporal,
      numero_viaje: siguienteNumero,
      hora_registro: null,
      persona_registro: null,
      esNuevo: true,
    };

    setViajes((prev) => [...prev, viajeNuevo]);
    setViajesNuevos((prev) => new Set(prev).add(idTemporal));
  }, [viajes]);

  // ── Viajes: eliminar ───────────────────────────────────────────────────────

  /**
   * Marca un viaje para eliminar. Si es nuevo, lo quita directo del estado local.
   * @param {string} id_viaje
   */
  const eliminarViaje = useCallback(
    (id_viaje) => {
      if (viajesNuevos.has(id_viaje)) {
        setViajes((prev) => prev.filter((v) => v.id_viaje !== id_viaje));
        setViajesNuevos((prev) => {
          const nuevo = new Set(prev);
          nuevo.delete(id_viaje);
          return nuevo;
        });
      } else {
        setViajesAEliminar((prev) => new Set(prev).add(id_viaje));
        setViajesEditados((prev) => {
          const nuevo = new Set(prev);
          nuevo.delete(id_viaje);
          return nuevo;
        });
      }
    },
    [viajesNuevos],
  );

  /**
   * Cancela la eliminación de un viaje marcado.
   * @param {string} id_viaje
   */
  const cancelarEliminacionViaje = useCallback((id_viaje) => {
    setViajesAEliminar((prev) => {
      const nuevo = new Set(prev);
      nuevo.delete(id_viaje);
      return nuevo;
    });
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
   * - numero_viajes
   *
   * Y en vale_renta_viajes:
   * - DELETE viajes marcados
   * - UPDATE viajes editados (hora_registro)
   * - INSERT viajes nuevos
   *
   * @param {number} id_persona - id del usuario que realiza los cambios (para viajes nuevos)
   */
  const guardarCambios = useCallback(
    async (id_persona) => {
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

        const errores = [];

        // 1. DELETE viajes marcados
        for (const id_viaje of viajesAEliminar) {
          const { error } = await supabase
            .from("vale_renta_viajes")
            .delete()
            .eq("id_viaje", id_viaje);

          if (error) errores.push(`Error al eliminar viaje: ${error.message}`);
        }

        // 2. UPDATE viajes editados (excluir eliminados y nuevos)
        const editadosActivos = [...viajesEditados].filter(
          (id) => !viajesAEliminar.has(id) && !viajesNuevos.has(id),
        );

        for (const id_viaje of editadosActivos) {
          const viaje = viajes.find((v) => v.id_viaje === id_viaje);
          if (!viaje) continue;

          const { error } = await supabase
            .from("vale_renta_viajes")
            .update({ hora_registro: viaje.hora_registro || null })
            .eq("id_viaje", id_viaje);

          if (error)
            errores.push(
              `Error al actualizar viaje ${viaje.numero_viaje}: ${error.message}`,
            );
        }

        // 3. INSERT viajes nuevos
        const viajesAInsertar = viajes.filter((v) => viajesNuevos.has(v.id_viaje));

        for (const viaje of viajesAInsertar) {
          const { error } = await supabase.from("vale_renta_viajes").insert({
            id_vale_renta_detalle: detalle.id_vale_renta_detalle,
            numero_viaje: viaje.numero_viaje,
            hora_registro: viaje.hora_registro || null,
            id_persona_registro: id_persona,
          });

          if (error)
            errores.push(
              `Error al insertar viaje ${viaje.numero_viaje}: ${error.message}`,
            );
        }

        // 4. Payload de vale_renta_detalle (tipo de renta + conteo de viajes)
        const { costo_dia, costo_hr } = detalle.precios_renta || {};
        const numeroViajesFinal = viajes.filter(
          (v) => !viajesAEliminar.has(v.id_viaje),
        ).length;

        let payload = {
          numero_viajes: numeroViajesFinal,
          id_material: detalle.id_material,
        };

        if (opcionSeleccionada === "dia") {
          payload = {
            ...payload,
            es_renta_por_dia: true,
            total_dias: 1,
            total_horas: null,
            costo_total: calcularCosto("dia", null, costo_dia, costo_hr),
          };
        } else if (opcionSeleccionada === "medio_dia") {
          payload = {
            ...payload,
            es_renta_por_dia: true,
            total_dias: 0.5,
            total_horas: null,
            costo_total: calcularCosto("medio_dia", null, costo_dia, costo_hr),
          };
        } else {
          const horas = Number(totalHorasInput);
          payload = {
            ...payload,
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

        if (err) errores.push(`Error al actualizar detalle: ${err.message}`);

        if (errores.length > 0) {
          setError(errores.join("\n"));
        } else {
          setMensajeExito("Cambios guardados correctamente.");
          // Recargar datos frescos desde DB
          await cargarDetalle(detalle.id_vale_renta_detalle);
        }
      } catch (err) {
        console.error("Error al guardar cambios de renta:", err);
        setError(err.message);
      } finally {
        setGuardando(false);
      }
    },
    [
      detalle,
      opcionSeleccionada,
      totalHorasInput,
      viajes,
      viajesEditados,
      viajesNuevos,
      viajesAEliminar,
      cargarDetalle,
    ],
  );

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
    setViajes(viajesOriginales.map((v) => ({ ...v })));
    setViajesEditados(new Set());
    setViajesNuevos(new Set());
    setViajesAEliminar(new Set());
    setDetalle((prev) => {
      if (!prev) return prev;
      const materialOriginal = materiales.find(
        (m) => m.id_material === idMaterialOriginal,
      );
      return {
        ...prev,
        id_material: idMaterialOriginal,
        material: materialOriginal ?? prev.material,
      };
    });
    setError(null);
    setMensajeExito(null);
  }, [detalle, viajesOriginales, idMaterialOriginal, materiales]);

  // ── Detectar cambios pendientes ────────────────────────────────────────────

  const hayCambiosPendientes = (() => {
    if (!detalle) return false;
    const opcionOriginal = detectarOpcionActual(detalle);
    if (opcionSeleccionada !== opcionOriginal) return true;
    if (
      opcionSeleccionada === "horas" &&
      String(detalle.total_horas || "") !== totalHorasInput
    ) {
      return true;
    }
    if (detalle.id_material !== idMaterialOriginal) return true;
    return (
      viajesEditados.size > 0 || viajesNuevos.size > 0 || viajesAEliminar.size > 0
    );
  })();

  return {
    detalle,
    opcionSeleccionada,
    totalHorasInput,
    costoPreview,
    materiales,
    viajes,
    viajesAEliminar,
    viajesNuevos,
    loading,
    guardando,
    error,
    mensajeExito,
    hayCambiosPendientes,
    cargarDetalle,
    seleccionarOpcion,
    setTotalHorasInput,
    editarMaterialDetalle,
    editarCampoViaje,
    agregarViaje,
    eliminarViaje,
    cancelarEliminacionViaje,
    guardarCambios,
    descartarCambios,
  };
};
