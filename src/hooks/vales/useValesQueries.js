/**
 * src/hooks/vales/useValesQueries.js
 *
 * Queries a Supabase para vales
 *
 * Funcionalidades:
 * - Query base con relaciones completas
 * - Obtener catálogo de obras
 * - Obtener vale por ID
 * - Obtener vale por folio
 * - Incluye es_renta_por_dia en queries de renta
 * - Incluye vale_renta_viajes para desglose de viajes individuales
 * - Incluye campos override (banco, distancia, precio, costo) en vale_material_viajes
 *   para soportar viajes tipo 3 con banco/distancia variable por viaje
 *
 * Usado en: useVales.js
 */

// 1. React y hooks
import { useCallback } from "react";

// 2. Config
import { supabase } from "../../config/supabase";

/**
 * Hook para queries de vales
 */
export const useValesQueries = () => {
  /**
   * Query base con todas las relaciones
   * Incluye vale_renta_viajes para mostrar desglose de viajes en el card
   * Incluye campos override en vale_material_viajes para viajes tipo 3
   */
  const buildBaseQuery = useCallback(() => {
    return supabase.from("vales").select(
      `
        *,
        obras:id_obra (
          id_obra,
          obra,
          cc,
          empresas:id_empresa (
            empresa,
            sufijo,
            logo
          )
        ),
        operadores:id_operador (
          id_operador,
          id_sindicato,
          nombre_completo,
          sindicatos:id_sindicato (
            id_sindicato,
            sindicato
          )
        ),
        vehiculos:id_vehiculo (
          id_vehiculo,
          placas
        ),
        persona:id_persona_creador (
          nombre,
          primer_apellido,
          segundo_apellido
        ),
        tickets_material (
          id_ticket,
          numero_ticket,
          folio_ticket,
          fecha_impresion
        ),
        vale_material_detalles (
          id_detalle_material,
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
            id_banco_override,
            distancia_km_override,
            precio_m3_override,
            costo_viaje_override,
            bancos_override:id_banco_override (
              id_banco,
              banco
            )
          )
        ),
        vale_renta_detalle (
          id_vale_renta_detalle,
          capacidad_m3,
          hora_inicio,
          hora_fin,
          total_horas,
          total_dias,
          costo_total,
          numero_viajes,
          notas_adicionales,
          es_renta_por_dia,
          material:id_material (
            id_material,
            material
          ),
          precios_renta:id_precios_renta (
            costo_hr,
            costo_dia
          ),
          vale_renta_viajes (
            id_viaje,
            numero_viaje,
            hora_registro
          )
        )
      `,
      { count: "exact" },
    );
  }, []);

  /**
   * Obtener catálogo de obras
   */
  const fetchObras = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("obras")
        .select(
          `
          id_obra,
          obra,
          cc,
          empresas:id_empresa (
            empresa,
            sufijo
          )
        `,
        )
        .order("obra", { ascending: true });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error en fetchObras:", error);
      return { success: false, error: error.message, data: [] };
    }
  }, []);

  /**
   * Obtener un vale específico por ID
   * Incluye vale_renta_viajes para desglose completo
   * Incluye campos override en vale_material_viajes para viajes tipo 3
   */
  const fetchValeById = useCallback(async (id_vale) => {
    try {
      const { data, error } = await supabase
        .from("vales")
        .select(
          `
          *,
          obras:id_obra (
            id_obra,
            obra,
            cc,
            empresas:id_empresa (
              empresa,
              sufijo,
              logo
            )
          ),
          operadores:id_operador (
            id_operador,
            nombre_completo,
            sindicatos:id_sindicato (
              id_sindicato,
              sindicato
            )
          ),
          vehiculos:id_vehiculo (
            id_vehiculo,
            placas
          ),
          persona:id_persona_creador (
            nombre,
            primer_apellido,
            segundo_apellido
          ),
          tickets_material (
            id_ticket,
            numero_ticket,
            folio_ticket,
            fecha_impresion
          ),
          vale_material_detalles (
            id_detalle_material,
            capacidad_m3,
            distancia_km,
            cantidad_pedida_m3,
            peso_ton,
            volumen_real_m3,
            precio_m3,
            costo_total,
            folio_banco,
            notas_adicionales,
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
              id_banco_override,
              distancia_km_override,
              precio_m3_override,
              costo_viaje_override,
              bancos_override:id_banco_override (
                id_banco,
                banco
              )
            )
          ),
          vale_renta_detalle (
            id_vale_renta_detalle,
            capacidad_m3,
            hora_inicio,
            hora_fin,
            total_horas,
            total_dias,
            costo_total,
            numero_viajes,
            notas_adicionales,
            es_renta_por_dia,
            material:id_material (
              id_material,
              material
            ),
            precios_renta:id_precios_renta (
              costo_hr,
              costo_dia
            ),
            vale_renta_viajes (
              id_viaje,
              numero_viaje,
              hora_registro
            )
          )
        `,
        )
        .eq("id_vale", id_vale)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error en fetchValeById:", error);
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Obtener vale por folio (para verificación pública)
   * Incluye vale_renta_viajes para desglose completo
   * Incluye campos override en vale_material_viajes para viajes tipo 3
   */
  const fetchValeByFolio = useCallback(async (folio) => {
    try {
      const { data, error } = await supabase
        .from("vales")
        .select(
          `
          *,
          obras:id_obra (
            id_obra,
            obra,
            cc,
            empresas:id_empresa (
              empresa,
              sufijo,
              logo
            )
          ),
          operadores:id_operador (
            id_operador,
            nombre_completo
          ),
          vehiculos:id_vehiculo (
            id_vehiculo,
            placas
          ),
          tickets_material (
            id_ticket,
            numero_ticket,
            folio_ticket,
            fecha_impresion
          ),
          vale_material_detalles (
            capacidad_m3,
            distancia_km,
            cantidad_pedida_m3,
            peso_ton,
            volumen_real_m3,
            precio_m3,
            costo_total,
            material:id_material (
              id_material,
              material,
              tipo_de_material:id_tipo_de_material (
                id_tipo_de_material,
                tipo_de_material
              )
            ),
            bancos:id_banco (
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
              id_banco_override,
              distancia_km_override,
              precio_m3_override,
              costo_viaje_override,
              bancos_override:id_banco_override (
                id_banco,
                banco
              )
            )
          ),
          vale_renta_detalle (
            capacidad_m3,
            hora_inicio,
            hora_fin,
            total_horas,
            total_dias,
            costo_total,
            numero_viajes,
            es_renta_por_dia,
            material:id_material (
              material
            ),
            precios_renta:id_precios_renta (
              costo_hr,
              costo_dia
            ),
            vale_renta_viajes (
              id_viaje,
              numero_viaje,
              hora_registro
            )
          )
        `,
        )
        .eq("folio", folio)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error en fetchValeByFolio:", error);
      return { success: false, error: error.message };
    }
  }, []);

  return {
    buildBaseQuery,
    fetchObras,
    fetchValeById,
    fetchValeByFolio,
  };
};
