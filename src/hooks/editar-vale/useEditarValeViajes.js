/**
 * src/hooks/editar-vale/useEditarValeViajes.js
 *
 * Hook para editar viajes internos de vales de material tipo 1, 2 y 3.
 *
 * Responsabilidades:
 * - Cargar datos del detalle y sus viajes
 * - Tipo 1 y 2: editar peso_ton → recalcula volumen_m3 y costo_viaje
 * - Tipo 3: editar volumen_m3 directo, banco y distancia por viaje (overrides)
 *           → recalcula precio_m3_override y costo_viaje_override
 * - Guardar cambios (UPDATE/INSERT/DELETE) en vale_material_viajes
 * - Recalcular y actualizar totales en vale_material_detalles
 * - Agregar y eliminar viajes
 *
 * Dependencias: supabase
 * Usado en: ModalEditarVale.jsx
 */

// 1. React y hooks
import { useState, useCallback } from "react";

// 2. Config
import { supabase } from "../../config/supabase";

// ─── Fórmulas de cálculo ──────────────────────────────────────────────────────

/**
 * Calcula precio_m3 a partir de distancia y tarifas.
 * Soporta hasta 2 intervalos.
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

  if (dist <= 0 || !primerKm || !subInt1) return 0;

  if (!limite_int1 || !km_sub_int2) {
    return primerKm + subInt1 * (dist - 1);
  }

  const limite = Number(limite_int1);
  const subInt2 = Number(km_sub_int2);

  if (dist <= limite) {
    return primerKm + subInt1 * (dist - 1);
  }

  return primerKm + subInt1 * (limite - 1) + subInt2 * (dist - limite);
};

/**
 * Calcula volumen_m3 a partir de peso_ton y peso_especifico.
 * Redondea a 3 decimales.
 */
const calcularVolumenM3 = (peso_ton, peso_especifico) => {
  if (!peso_ton || !peso_especifico || Number(peso_especifico) === 0) return 0;
  return Math.round((Number(peso_ton) / Number(peso_especifico)) * 1000) / 1000;
};

/**
 * Calcula costo_viaje a partir de volumen_m3 y precio_m3.
 * Redondea a 2 decimales.
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

  // Tipo de material del detalle (1, 2 o 3)
  const [tipoMaterial, setTipoMaterial] = useState(null);

  // Peso específico del banco+material (para tipo 1 y 2)
  const [pesoEspecifico, setPesoEspecifico] = useState(null);

  // Catálogo de bancos disponibles (para tipo 3 — selector de banco por viaje)
  const [bancos, setBancos] = useState([]);

  // IDs de viajes con cambios pendientes
  const [viajesEditados, setViajesEditados] = useState(new Set());

  // Viajes nuevos pendientes de INSERT (tienen id temporal string)
  const [viajesNuevos, setViajesNuevos] = useState(new Set());

  // IDs de viajes marcados para eliminar
  const [viajesAEliminar, setViajesAEliminar] = useState(new Set());
  // Notas adicionales del detalle (editable)
  const [notasAdicionales, setNotasAdicionales] = useState("");

  // Estados de carga y error
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  /**
   * Carga el detalle material y sus viajes para edición.
   * Detecta el tipo de material y carga datos adicionales según tipo.
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

      // 1. Cargar detalle con viajes — incluye campos override para tipo 3
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
            tarifa_subsecuente,
            id_banco_override,
            distancia_km_override,
            precio_m3_override,
            costo_viaje_override,
            bancos_override:id_banco_override (
              id_banco,
              banco
            )
          )
        `,
        )
        .eq("id_detalle_material", id_detalle_material)
        .single();

      if (errorDetalle) throw errorDetalle;

      const idTipo =
        dataDetalle.material?.tipo_de_material?.id_tipo_de_material;
      const esTipo3 = idTipo === 3;

      setTipoMaterial(idTipo);

      // 2a. Tipo 1 y 2: cargar peso_especifico del banco+material
      let pesoEsp = null;
      if (!esTipo3 && dataDetalle.id_banco) {
        const { data: dataPeso, error: errorPeso } = await supabase
          .from("peso_especifico")
          .select("peso_especifico")
          .eq("id_banco", dataDetalle.id_banco)
          .eq("id_material", dataDetalle.id_material)
          .maybeSingle();

        if (errorPeso) throw errorPeso;
        pesoEsp = dataPeso?.peso_especifico ?? null;
      }

      // 2b. Tipo 3: cargar catálogo de bancos para el selector por viaje
      if (esTipo3) {
        const { data: dataBancos, error: errorBancos } = await supabase
          .from("bancos")
          .select("id_banco, banco")
          .order("banco", { ascending: true });

        if (errorBancos) throw errorBancos;
        setBancos(dataBancos || []);
      }

      // Ordenar viajes por numero_viaje
      const viajesOrdenados = [
        ...(dataDetalle.vale_material_viajes || []),
      ].sort((a, b) => a.numero_viaje - b.numero_viaje);

      setDetalle(dataDetalle);
      setNotasAdicionales(dataDetalle.notas_adicionales || "");
      setViajesOriginales(viajesOrdenados);
      setViajes(viajesOrdenados.map((v) => ({ ...v })));
      setPesoEspecifico(pesoEsp);
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
   * Tipo 1 y 2:
   *   - peso_ton       → recalcula volumen_m3 y costo_viaje
   *   - folio_vale_fisico → solo actualiza texto
   *
   * Tipo 3:
   *   - volumen_m3          → recalcula costo_viaje_override (o costo_viaje si sin override)
   *   - id_banco_override   → solo actualiza referencia (precio se recalcula al cambiar distancia)
   *   - distancia_km_override → recalcula precio_m3_override y costo_viaje_override
   *   - folio_vale_fisico   → solo actualiza texto
   *
   * @param {string} id_viaje     - UUID del viaje (o id temporal para nuevos)
   * @param {string} campo        - nombre del campo a editar
   * @param {string|number} valor - nuevo valor
   */
  const editarCampoViaje = useCallback(
    (id_viaje, campo, valor) => {
      setViajes((prev) =>
        prev.map((viaje) => {
          if (viaje.id_viaje !== id_viaje) return viaje;

          const actualizado = { ...viaje, [campo]: valor };

          // ── Tipo 1 y 2: recálculo desde peso_ton ──────────────────────────
          if (campo === "peso_ton" && tipoMaterial !== 3) {
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

          // ── Tipo 3: recálculo desde volumen_m3 ───────────────────────────
          if (campo === "volumen_m3" && tipoMaterial === 3) {
            const volNum = Number(valor);
            // Usar precio override si existe, si no el precio del detalle
            const precio = Number(
              viaje.precio_m3_override ||
                viaje.precio_m3 ||
                detalle?.precio_m3 ||
                0,
            );

            if (volNum > 0 && precio > 0) {
              const nuevoCosto = calcularCostoViaje(volNum, precio);
              // Si hay override de distancia/banco, escribir en costo_viaje_override
              if (viaje.distancia_km_override || viaje.id_banco_override) {
                actualizado.costo_viaje_override = nuevoCosto;
              } else {
                actualizado.costo_viaje = nuevoCosto;
              }
            }
          }

          // ── Tipo 3: recálculo desde distancia_km_override ────────────────
          if (campo === "distancia_km_override" && tipoMaterial === 3) {
            const distNum = Number(valor);
            const tarifa1 = Number(detalle?.tarifa_primer_km || 0);
            const tarifaSub = Number(detalle?.tarifa_subsecuente || 0);

            if (distNum > 0 && tarifa1 > 0) {
              const nuevoPrecio = calcularPrecioM3(distNum, tarifa1, tarifaSub);
              const volumen = Number(viaje.volumen_m3 || 0);
              const nuevoCosto = calcularCostoViaje(volumen, nuevoPrecio);

              actualizado.precio_m3_override = nuevoPrecio;
              actualizado.costo_viaje_override = nuevoCosto;
            } else if (!valor || Number(valor) === 0) {
              // Si limpia la distancia, limpiar overrides de precio y costo
              actualizado.precio_m3_override = null;
              actualizado.costo_viaje_override = null;
            }
          }

          // ── Tipo 3: limpiar override de banco si se selecciona vacío ──────
          if (campo === "id_banco_override" && tipoMaterial === 3) {
            if (!valor) {
              actualizado.id_banco_override = null;
            }
          }

          return actualizado;
        }),
      );

      setViajesEditados((prev) => new Set(prev).add(id_viaje));
    },
    [pesoEspecifico, detalle, tipoMaterial],
  );

  // ── Edición de distancia del detalle (tipo 1 y 2 — recalcula todos los viajes) ──

  /**
   * Al cambiar la distancia del detalle (tipo 1 y 2), recalcula precio_m3
   * y costo_viaje de cada viaje usando sus tarifas individuales.
   * No aplica a tipo 3 donde la distancia se edita por viaje.
   *
   * @param {number} nueva_distancia
   */
  const editarDistanciaDetalle = useCallback(
    (nueva_distancia) => {
      const dist = Number(nueva_distancia);

      setDetalle((prev) => {
        if (!prev) return prev;
        const nuevoPrecio = calcularPrecioM3(
          dist,
          prev.tarifa_primer_km,
          prev.tarifa_subsecuente,
        );
        return { ...prev, distancia_km: dist, precio_m3: nuevoPrecio };
      });

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
   * Tipo 3: pre-rellena volumen_m3 con capacidad_m3 del detalle.
   * Tipo 1/2: campos de peso vacíos para que el usuario los llene.
   */
  const agregarViaje = useCallback(() => {
    const idTemporal = `nuevo_${Date.now()}`;
    const siguienteNumero =
      viajes.length > 0
        ? Math.max(...viajes.map((v) => v.numero_viaje)) + 1
        : 1;

    const esTipo3 = tipoMaterial === 3;

    const viajeNuevo = esTipo3
      ? {
          id_viaje: idTemporal,
          numero_viaje: siguienteNumero,
          hora_registro: null,
          // Tipo 3: volumen por defecto = capacidad del camión
          volumen_m3: detalle?.capacidad_m3 ?? "",
          precio_m3: detalle?.precio_m3 ?? "",
          costo_viaje:
            detalle?.capacidad_m3 && detalle?.precio_m3
              ? calcularCostoViaje(
                  Number(detalle.capacidad_m3),
                  Number(detalle.precio_m3),
                )
              : "",
          folio_vale_fisico: "",
          // Sin overrides al crear
          id_banco_override: null,
          distancia_km_override: null,
          precio_m3_override: null,
          costo_viaje_override: null,
          bancos_override: null,
          esNuevo: true,
        }
      : {
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
  }, [viajes, detalle, tipoMaterial]);

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

  // ── Calcular totales del detalle ──────────────────────────────────────────

  /**
   * Calcula los totales consolidados del detalle
   * excluyendo los viajes marcados para eliminar.
   *
   * Tipo 1 y 2: suma peso_ton, volumen_m3, costo_viaje
   * Tipo 3:     suma volumen_m3, y usa costo_viaje_override ?? costo_viaje
   *
   * @returns {{ peso_ton: number, volumen_real_m3: number, costo_total: number }}
   */
  const calcularTotalesDetalle = useCallback(() => {
    const viajesActivos = viajes.filter(
      (v) => !viajesAEliminar.has(v.id_viaje),
    );

    const esTipo3 = tipoMaterial === 3;

    const peso_ton = esTipo3
      ? 0
      : viajesActivos.reduce((acc, v) => acc + Number(v.peso_ton || 0), 0);

    const volumen_real_m3 = viajesActivos.reduce(
      (acc, v) => acc + Number(v.volumen_m3 || 0),
      0,
    );

    const costo_total = viajesActivos.reduce((acc, v) => {
      // Para tipo 3: usar costo override si existe
      const costo = esTipo3
        ? Number(v.costo_viaje_override ?? v.costo_viaje ?? 0)
        : Number(v.costo_viaje || 0);
      return acc + costo;
    }, 0);

    return {
      peso_ton: Math.round(peso_ton * 1000) / 1000,
      volumen_real_m3: Math.round(volumen_real_m3 * 1000) / 1000,
      costo_total: Math.round(costo_total * 100) / 100,
    };
  }, [viajes, viajesAEliminar, tipoMaterial]);

  // ── Guardar todos los cambios ─────────────────────────────────────────────

  /**
   * Persiste todos los cambios pendientes en Supabase.
   *
   * Tipo 1 y 2:
   *   1. DELETE viajes marcados
   *   2. UPDATE viajes editados (peso_ton, volumen_m3, precio_m3, costo_viaje, folio)
   *   3. INSERT viajes nuevos
   *   4. UPDATE totales en vale_material_detalles
   *
   * Tipo 3 (adicional):
   *   - UPDATE incluye id_banco_override, distancia_km_override,
   *     precio_m3_override, costo_viaje_override
   *   - INSERT también incluye campos override si los tiene
   *   - No actualiza peso_ton en el detalle (siempre null en tipo 3)
   *
   * @param {number} id_persona - id del usuario que realiza los cambios
   */
  const guardarCambios = useCallback(
    async (id_persona) => {
      if (!detalle) return;

      try {
        setGuardando(true);
        setError(null);
        setMensajeExito(null);

        const errores = [];
        const esTipo3 = tipoMaterial === 3;

        // 1. DELETE viajes marcados
        for (const id_viaje of viajesAEliminar) {
          const { error } = await supabase
            .from("vale_material_viajes")
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

          // Campos comunes a todos los tipos
          const camposUpdate = {
            folio_vale_fisico: viaje.folio_vale_fisico || null,
            volumen_m3: Number(viaje.volumen_m3) || null,
          };

          if (esTipo3) {
            // Tipo 3: campos override
            camposUpdate.id_banco_override = viaje.id_banco_override || null;
            camposUpdate.distancia_km_override = viaje.distancia_km_override
              ? Number(viaje.distancia_km_override)
              : null;
            camposUpdate.precio_m3_override = viaje.precio_m3_override
              ? Number(viaje.precio_m3_override)
              : null;
            camposUpdate.costo_viaje_override =
              viaje.costo_viaje_override != null
                ? Number(viaje.costo_viaje_override)
                : null;
            // Actualizar costo_viaje base también si cambió el volumen
            camposUpdate.costo_viaje = Number(viaje.costo_viaje) || null;
          } else {
            // Tipo 1 y 2: campos de peso
            camposUpdate.peso_ton = Number(viaje.peso_ton) || null;
            camposUpdate.precio_m3 = Number(viaje.precio_m3) || null;
            camposUpdate.costo_viaje = Number(viaje.costo_viaje) || null;
          }

          const { error } = await supabase
            .from("vale_material_viajes")
            .update(camposUpdate)
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
          let camposInsert = {
            id_detalle_material: detalle.id_detalle_material,
            numero_viaje: viaje.numero_viaje,
            id_persona_registro: id_persona,
            folio_vale_fisico: viaje.folio_vale_fisico || null,
          };

          if (esTipo3) {
            // Tipo 3: insertar con volumen directo y posibles overrides
            const volumen = Number(viaje.volumen_m3) || 0;
            const precio = Number(viaje.precio_m3 || detalle.precio_m3 || 0);
            const costo = calcularCostoViaje(volumen, precio);

            camposInsert = {
              ...camposInsert,
              volumen_m3: volumen || null,
              precio_m3: precio || null,
              costo_viaje: costo || null,
              id_banco_override: viaje.id_banco_override || null,
              distancia_km_override: viaje.distancia_km_override
                ? Number(viaje.distancia_km_override)
                : null,
              precio_m3_override: viaje.precio_m3_override
                ? Number(viaje.precio_m3_override)
                : null,
              costo_viaje_override:
                viaje.costo_viaje_override != null
                  ? Number(viaje.costo_viaje_override)
                  : null,
            };
          } else {
            // Tipo 1 y 2: calcular desde peso_ton
            const pesoNum = Number(viaje.peso_ton);
            const pe = Number(pesoEspecifico);
            const precioM3 = Number(viaje.precio_m3 || detalle.precio_m3 || 0);

            const volumen =
              pe > 0
                ? calcularVolumenM3(pesoNum, pe)
                : Number(viaje.volumen_m3) || 0;
            const costo = calcularCostoViaje(volumen, precioM3);

            camposInsert = {
              ...camposInsert,
              peso_ton: pesoNum || null,
              volumen_m3: volumen || null,
              precio_m3: precioM3 || null,
              costo_viaje: costo || null,
              id_precios_material: viaje.id_precios_material || null,
              tarifa_primer_km: viaje.tarifa_primer_km || null,
              tarifa_subsecuente: viaje.tarifa_subsecuente || null,
            };
          }

          const { error } = await supabase
            .from("vale_material_viajes")
            .insert(camposInsert);

          if (error)
            errores.push(
              `Error al insertar viaje ${viaje.numero_viaje}: ${error.message}`,
            );
        }

        // 4. Recalcular totales del detalle y actualizar
        const totales = calcularTotalesDetalle();

        const camposDetalle = {
          volumen_real_m3: totales.volumen_real_m3,
          costo_total: totales.costo_total,
          distancia_km: Number(detalle.distancia_km),
          precio_m3: Number(detalle.precio_m3),
          notas_adicionales: notasAdicionales.trim() || null,
        };
        // Tipo 1 y 2: también actualizar peso_ton total
        if (!esTipo3) {
          camposDetalle.peso_ton = totales.peso_ton;
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
      tipoMaterial,
      calcularTotalesDetalle,
      cargarDetalle,
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
    viajesAEliminar.size > 0 ||
    notasAdicionales !== (detalle?.notas_adicionales || "");

  return {
    // Datos
    detalle,
    viajes,
    pesoEspecifico,
    tipoMaterial,
    bancos,

    // Notas
    notasAdicionales,
    setNotasAdicionales,

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
