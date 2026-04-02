/**
 * src/hooks/editar-vale/useEditarValeViajes.js
 *
 * Hook para editar viajes internos de vales material tipo 1 (Materiales Pétreos)
 *
 * Responsabilidades:
 * - Cargar datos del detalle y sus viajes
 * - Calcular volumen_m3 y costo_viaje a partir de peso_ton editado
 * - Calcular precio_m3 a partir de distancia_km editada
 * - Guardar cambios individuales (UPDATE) en vale_material_viajes
 * - Recalcular y actualizar totales en vale_material_detalles
 * - Agregar y eliminar viajes
 *
 * Dependencias: supabase, useAuth
 * Usado en: ModalEditarVale.jsx
 */

// 1. React y hooks
import { useState, useCallback } from "react";

// 2. Config
import { supabase } from "../../config/supabase";

// ─── Fórmulas de cálculo ──────────────────────────────────────────────────────

/**
 * Calcula precio_m3 a partir de distancia y tarifas almacenadas en el viaje.
 * Soporta hasta 2 intervalos según numero_de_intervalos implícito en las tarifas.
 *
 * @param {number} distancia_km
 * @param {number} tarifa_primer_km   - costo del primer km
 * @param {number} tarifa_subsecuente - costo por km adicional (intervalo 1)
 * @param {number|null} limite_int1   - km donde cambia al intervalo 2 (null si 1 intervalo)
 * @param {number|null} km_sub_int2   - costo por km en intervalo 2
 * @returns {number}
 */
const calcularPrecioM3 = (
  distancia_km,
  tarifa_primer_km,
  tarifa_subsecuente,
  limite_int1 = null,
  km_sub_int2 = null,
) => {
  const dist = Number(distancia_km);
  const primerKm = Number(tarifa_primer_km);
  const subInt1 = Number(tarifa_subsecuente);

  if (dist <= 0) return 0;

  // Un solo intervalo
  if (!limite_int1 || !km_sub_int2) {
    return primerKm + subInt1 * (dist - 1);
  }

  // Dos intervalos
  const limite = Number(limite_int1);
  const subInt2 = Number(km_sub_int2);

  if (dist <= limite) {
    return primerKm + subInt1 * (dist - 1);
  }

  return primerKm + subInt1 * (limite - 1) + subInt2 * (dist - limite);
};

/**
 * Calcula volumen_m3 a partir de peso_ton y peso_especifico.
 * Redondea a 3 decimales (convención del sistema).
 *
 * @param {number} peso_ton
 * @param {number} peso_especifico
 * @returns {number}
 */
const calcularVolumenM3 = (peso_ton, peso_especifico) => {
  if (!peso_ton || !peso_especifico || Number(peso_especifico) === 0) return 0;
  return Math.round((Number(peso_ton) / Number(peso_especifico)) * 1000) / 1000;
};

/**
 * Calcula costo_viaje a partir de volumen_m3 y precio_m3.
 * Redondea a 2 decimales.
 *
 * @param {number} volumen_m3
 * @param {number} precio_m3
 * @returns {number}
 */
const calcularCostoViaje = (volumen_m3, precio_m3) => {
  return Math.round(Number(volumen_m3) * Number(precio_m3) * 100) / 100;
};

// ─── Hook principal ───────────────────────────────────────────────────────────

export const useEditarValeViajes = () => {
  // Datos originales del detalle y viajes (sin modificar)
  const [detalle, setDetalle] = useState(null);
  const [viajesOriginales, setViajesOriginales] = useState([]);

  // Estado de edición — copia mutable de los viajes
  const [viajes, setViajes] = useState([]);

  // Peso específico del banco+material (para recalcular m3 al editar toneladas)
  const [pesoEspecifico, setPesoEspecifico] = useState(null);

  // IDs de viajes con cambios pendientes
  const [viajesEditados, setViajesEditados] = useState(new Set());

  // Viajes nuevos pendientes de INSERT (tienen id temporal string)
  const [viajesNuevos, setViajesNuevos] = useState(new Set());

  // IDs de viajes marcados para eliminar
  const [viajesAEliminar, setViajesAEliminar] = useState(new Set());

  // Estados de carga y error
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  /**
   * Carga el detalle material y sus viajes para edición.
   * También carga el peso_especifico según id_banco + id_material del detalle.
   *
   * @param {number} id_detalle_material
   */
  const cargarDetalle = useCallback(async (id_detalle_material) => {
    try {
      setLoading(true);
      setError(null);
      setMensajeExito(null);
      setViajesEditados(new Set());
      setViajesNuevos(new Set());
      setViajesAEliminar(new Set());

      // 1. Cargar detalle con viajes
      const { data: dataDetalle, error: errorDetalle } = await supabase
        .from("vale_material_detalles")
        .select(
          `
          id_detalle_material,
          id_vale,
          id_material,
          id_banco,
          id_sindicato,
          capacidad_m3,
          distancia_km,
          cantidad_pedida_m3,
          peso_ton,
          volumen_real_m3,
          precio_m3,
          costo_total,
          folio_banco,
          requisicion,
          notas_adicionales,
          id_precios_material,
          tarifa_primer_km,
          tarifa_subsecuente,
          material:id_material (
            id_material,
            material,
            tipo_de_material:id_tipo_de_material (
              id_tipo_de_material,
              tipo_de_material
            )
          ),
          bancos:id_banco (
            id_banco,
            banco
          ),
          vale_material_viajes (
            id_viaje,
            numero_viaje,
            hora_registro,
            peso_ton,
            volumen_m3,
            precio_m3,
            costo_viaje,
            folio_vale_fisico,
            id_precios_material,
            tarifa_primer_km,
            tarifa_subsecuente
          )
        `,
        )
        .eq("id_detalle_material", id_detalle_material)
        .single();

      if (errorDetalle) throw errorDetalle;

      // 2. Cargar peso_especifico para este banco+material
      const { data: dataPeso, error: errorPeso } = await supabase
        .from("peso_especifico")
        .select("peso_especifico")
        .eq("id_banco", dataDetalle.id_banco)
        .eq("id_material", dataDetalle.id_material)
        .maybeSingle();

      if (errorPeso) throw errorPeso;

      // Ordenar viajes por numero_viaje
      const viajesOrdenados = [
        ...(dataDetalle.vale_material_viajes || []),
      ].sort((a, b) => a.numero_viaje - b.numero_viaje);

      setDetalle(dataDetalle);
      setViajesOriginales(viajesOrdenados);
      setViajes(viajesOrdenados.map((v) => ({ ...v })));
      setPesoEspecifico(dataPeso?.peso_especifico ?? null);
    } catch (err) {
      console.error("Error en cargarDetalle:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Edición de campo en un viaje ──────────────────────────────────────────

  /**
   * Actualiza un campo de un viaje y recalcula los campos derivados.
   * Marca el viaje como editado.
   *
   * Campos editables:
   *   - peso_ton       → recalcula volumen_m3 y costo_viaje
   *   - folio_vale_fisico → solo actualiza texto
   *
   * @param {string} id_viaje         - UUID del viaje (o id temporal para nuevos)
   * @param {string} campo            - nombre del campo a editar
   * @param {string|number} valor     - nuevo valor
   */
  const editarCampoViaje = useCallback(
    (id_viaje, campo, valor) => {
      setViajes((prev) =>
        prev.map((viaje) => {
          if (viaje.id_viaje !== id_viaje) return viaje;

          const actualizado = { ...viaje, [campo]: valor };

          // Recálculo en cascada al editar peso_ton
          if (campo === "peso_ton") {
            const pesoNum = Number(valor);
            const pe = Number(pesoEspecifico);
            const precioM3Viaje = Number(
              viaje.precio_m3 || detalle?.precio_m3 || 0,
            );

            if (pe > 0 && pesoNum > 0) {
              const nuevoVolumen = calcularVolumenM3(pesoNum, pe);
              const nuevoCosto = calcularCostoViaje(
                nuevoVolumen,
                precioM3Viaje,
              );
              actualizado.volumen_m3 = nuevoVolumen;
              actualizado.costo_viaje = nuevoCosto;
            }
          }

          return actualizado;
        }),
      );

      setViajesEditados((prev) => new Set(prev).add(id_viaje));
    },
    [pesoEspecifico, detalle],
  );

  // ── Edición de distancia del detalle (recalcula precio_m3 de todos los viajes) ──

  /**
   * Al cambiar la distancia del detalle, recalcula precio_m3 y por ende
   * costo_viaje de cada viaje usando sus tarifas individuales almacenadas.
   *
   * @param {number} nueva_distancia
   */
  const editarDistanciaDetalle = useCallback(
    (nueva_distancia) => {
      const dist = Number(nueva_distancia);

      setDetalle((prev) => {
        if (!prev) return prev;

        // Recalcular precio_m3 del detalle con sus tarifas
        const nuevoPrecio = calcularPrecioM3(
          dist,
          prev.tarifa_primer_km,
          prev.tarifa_subsecuente,
        );

        return { ...prev, distancia_km: dist, precio_m3: nuevoPrecio };
      });

      // Recalcular precio_m3 y costo de cada viaje con sus propias tarifas
      setViajes((prev) =>
        prev.map((viaje) => {
          const nuevoPrecioViaje = calcularPrecioM3(
            dist,
            viaje.tarifa_primer_km || detalle?.tarifa_primer_km,
            viaje.tarifa_subsecuente || detalle?.tarifa_subsecuente,
          );
          const nuevoCosto = calcularCostoViaje(
            viaje.volumen_m3,
            nuevoPrecioViaje,
          );

          return {
            ...viaje,
            precio_m3: nuevoPrecioViaje,
            costo_viaje: nuevoCosto,
          };
        }),
      );

      // Marcar todos los viajes como editados
      setViajesEditados((prev) => {
        const nuevo = new Set(prev);
        viajes.forEach((v) => nuevo.add(v.id_viaje));
        return nuevo;
      });
    },
    [detalle, viajes],
  );

  // ── Agregar viaje nuevo ────────────────────────────────────────────────────

  /**
   * Agrega un viaje nuevo con valores vacíos al estado local.
   * Usa un ID temporal (string) que se reemplaza al hacer INSERT.
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
      peso_ton: "",
      volumen_m3: "",
      precio_m3: detalle?.precio_m3 ?? "",
      costo_viaje: "",
      folio_vale_fisico: "",
      id_precios_material: detalle?.id_precios_material ?? null,
      tarifa_primer_km: detalle?.tarifa_primer_km ?? null,
      tarifa_subsecuente: detalle?.tarifa_subsecuente ?? null,
      esNuevo: true,
    };

    setViajes((prev) => [...prev, viajeNuevo]);
    setViajesNuevos((prev) => new Set(prev).add(idTemporal));
  }, [viajes, detalle]);

  // ── Eliminar viaje ─────────────────────────────────────────────────────────

  /**
   * Marca un viaje para eliminar.
   * Si es nuevo (todavía no existe en DB), lo elimina directo del estado local.
   *
   * @param {string} id_viaje
   */
  const eliminarViaje = useCallback(
    (id_viaje) => {
      if (viajesNuevos.has(id_viaje)) {
        // Es nuevo — no existe en DB, solo quitar del estado
        setViajes((prev) => prev.filter((v) => v.id_viaje !== id_viaje));
        setViajesNuevos((prev) => {
          const nuevo = new Set(prev);
          nuevo.delete(id_viaje);
          return nuevo;
        });
      } else {
        // Existe en DB — marcar para DELETE al guardar
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
   *
   * @param {string} id_viaje
   */
  const cancelarEliminacion = useCallback((id_viaje) => {
    setViajesAEliminar((prev) => {
      const nuevo = new Set(prev);
      nuevo.delete(id_viaje);
      return nuevo;
    });
  }, []);

  // ── Calcular totales del detalle a partir del estado actual de viajes ──────

  /**
   * Calcula los totales consolidados del detalle
   * excluyendo los viajes marcados para eliminar.
   *
   * @returns {{ peso_ton: number, volumen_real_m3: number, costo_total: number }}
   */
  const calcularTotalesDetalle = useCallback(() => {
    const viajesActivos = viajes.filter(
      (v) => !viajesAEliminar.has(v.id_viaje),
    );

    const peso_ton = viajesActivos.reduce(
      (acc, v) => acc + Number(v.peso_ton || 0),
      0,
    );
    const volumen_real_m3 = viajesActivos.reduce(
      (acc, v) => acc + Number(v.volumen_m3 || 0),
      0,
    );
    const costo_total = viajesActivos.reduce(
      (acc, v) => acc + Number(v.costo_viaje || 0),
      0,
    );

    return {
      peso_ton: Math.round(peso_ton * 1000) / 1000,
      volumen_real_m3: Math.round(volumen_real_m3 * 1000) / 1000,
      costo_total: Math.round(costo_total * 100) / 100,
    };
  }, [viajes, viajesAEliminar]);

  // ── Guardar todos los cambios ─────────────────────────────────────────────

  /**
   * Persiste todos los cambios pendientes en Supabase:
   * 1. DELETE viajes marcados para eliminar
   * 2. UPDATE viajes editados
   * 3. INSERT viajes nuevos
   * 4. UPDATE totales en vale_material_detalles
   * 5. UPDATE distancia y precio_m3 en vale_material_detalles si cambió
   *
   * @param {number} id_persona - id del usuario que realiza los cambios (para INSERT)
   */
  const guardarCambios = useCallback(
    async (id_persona) => {
      if (!detalle) return;

      try {
        setGuardando(true);
        setError(null);
        setMensajeExito(null);

        const errores = [];

        // 1. DELETE viajes marcados
        for (const id_viaje of viajesAEliminar) {
          const { error } = await supabase
            .from("vale_material_viajes")
            .delete()
            .eq("id_viaje", id_viaje);

          if (error) errores.push(`Error al eliminar viaje: ${error.message}`);
        }

        // 2. UPDATE viajes editados (excluir los marcados para eliminar)
        const editadosActivos = [...viajesEditados].filter(
          (id) => !viajesAEliminar.has(id) && !viajesNuevos.has(id),
        );

        for (const id_viaje of editadosActivos) {
          const viaje = viajes.find((v) => v.id_viaje === id_viaje);
          if (!viaje) continue;

          const { error } = await supabase
            .from("vale_material_viajes")
            .update({
              peso_ton: Number(viaje.peso_ton) || null,
              volumen_m3: Number(viaje.volumen_m3) || null,
              precio_m3: Number(viaje.precio_m3) || null,
              costo_viaje: Number(viaje.costo_viaje) || null,
              folio_vale_fisico: viaje.folio_vale_fisico || null,
            })
            .eq("id_viaje", id_viaje);

          if (error)
            errores.push(
              `Error al actualizar viaje ${viaje.numero_viaje}: ${error.message}`,
            );
        }

        // 3. INSERT viajes nuevos
        const viajesAInsertar = viajes.filter((v) =>
          viajesNuevos.has(v.id_viaje),
        );

        for (const viaje of viajesAInsertar) {
          const pesoNum = Number(viaje.peso_ton);
          const pe = Number(pesoEspecifico);
          const precioM3 = Number(viaje.precio_m3 || detalle.precio_m3 || 0);

          const volumen =
            pe > 0
              ? calcularVolumenM3(pesoNum, pe)
              : Number(viaje.volumen_m3) || 0;
          const costo = calcularCostoViaje(volumen, precioM3);

          const { error } = await supabase.from("vale_material_viajes").insert({
            id_detalle_material: detalle.id_detalle_material,
            numero_viaje: viaje.numero_viaje,
            id_persona_registro: id_persona,
            peso_ton: pesoNum || null,
            volumen_m3: volumen || null,
            precio_m3: precioM3 || null,
            costo_viaje: costo || null,
            folio_vale_fisico: viaje.folio_vale_fisico || null,
            id_precios_material: viaje.id_precios_material || null,
            tarifa_primer_km: viaje.tarifa_primer_km || null,
            tarifa_subsecuente: viaje.tarifa_subsecuente || null,
          });

          if (error)
            errores.push(
              `Error al insertar viaje ${viaje.numero_viaje}: ${error.message}`,
            );
        }

        // 4. Actualizar distancia y precio_m3 del detalle si cambió
        const detalleOriginal = viajesOriginales.length > 0 ? detalle : null;
        const distanciaCambio =
          detalleOriginal &&
          Number(detalle.distancia_km) !==
            Number(detalleOriginal?.distancia_km);

        // 5. Recalcular totales del detalle y actualizar
        const totales = calcularTotalesDetalle();

        const camposDetalle = {
          peso_ton: totales.peso_ton,
          volumen_real_m3: totales.volumen_real_m3,
          costo_total: totales.costo_total,
        };

        // Incluir distancia y precio_m3 si cambió
        if (
          Number(detalle.distancia_km) !==
            Number(detalleOriginal?.distancia_km) ||
          true
        ) {
          camposDetalle.distancia_km = Number(detalle.distancia_km);
          camposDetalle.precio_m3 = Number(detalle.precio_m3);
        }

        const { error: errorDetalle } = await supabase
          .from("vale_material_detalles")
          .update(camposDetalle)
          .eq("id_detalle_material", detalle.id_detalle_material);

        if (errorDetalle)
          errores.push(
            `Error al actualizar totales del detalle: ${errorDetalle.message}`,
          );

        // Resultado final
        if (errores.length > 0) {
          setError(errores.join("\n"));
        } else {
          setMensajeExito("Cambios guardados correctamente");
          // Recargar datos frescos desde DB
          await cargarDetalle(detalle.id_detalle_material);
        }
      } catch (err) {
        console.error("Error en guardarCambios:", err);
        setError(err.message);
      } finally {
        setGuardando(false);
      }
    },
    [
      detalle,
      viajes,
      viajesEditados,
      viajesNuevos,
      viajesAEliminar,
      pesoEspecifico,
      calcularTotalesDetalle,
      cargarDetalle,
      viajesOriginales,
    ],
  );

  // ── Reset ─────────────────────────────────────────────────────────────────

  /**
   * Descarta todos los cambios y restaura el estado original.
   */
  const descartarCambios = useCallback(() => {
    if (!detalle) return;
    setViajes(viajesOriginales.map((v) => ({ ...v })));
    setDetalle((prev) => ({ ...prev }));
    setViajesEditados(new Set());
    setViajesNuevos(new Set());
    setViajesAEliminar(new Set());
    setError(null);
    setMensajeExito(null);
  }, [viajesOriginales, detalle]);

  // ── Flags de estado útiles para la UI ────────────────────────────────────

  const hayCambiosPendientes =
    viajesEditados.size > 0 ||
    viajesNuevos.size > 0 ||
    viajesAEliminar.size > 0;

  return {
    // Datos
    detalle,
    viajes,
    pesoEspecifico,

    // Flags
    loading,
    guardando,
    error,
    mensajeExito,
    hayCambiosPendientes,
    viajesAEliminar,
    viajesNuevos,

    // Acciones
    cargarDetalle,
    editarCampoViaje,
    editarDistanciaDetalle,
    agregarViaje,
    eliminarViaje,
    cancelarEliminacion,
    guardarCambios,
    descartarCambios,
    calcularTotalesDetalle,
  };
};
