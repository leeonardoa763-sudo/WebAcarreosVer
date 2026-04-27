/**
 * src/hooks/conciliaciones/useContabilidad.js
 *
 * Hook para gestionar conciliaciones en la pestaña Contabilidad.
 * Carga conciliaciones renta y material, y permite marcar como pagadas.
 *
 * Dependencias: supabase
 * Usado en: TablaContabilidad.jsx
 */

import { useCallback } from 'react';
import { supabase } from '../../config/supabase';

export const useContabilidad = () => {
  const fetchConciliacionesContabilidad = useCallback(async (tipo) => {
    try {
      if (tipo === 'renta') {
        const { data, error } = await supabase
          .from('conciliaciones')
          .select(`
            *,
            obras:id_obra (
              id_obra,
              obra,
              cc,
              empresas:id_empresa (
                id_empresa,
                empresa,
                sufijo
              )
            ),
            sindicatos:id_sindicato (
              id_sindicato,
              sindicato,
              nombre_completo,
              nombre_firma_conciliacion
            )
          `)
          .eq('tipo_conciliacion', 'renta')
          .order('fecha_generacion', { ascending: false });

        if (error) throw error;

        // Ordenar por empresa y luego por antigüedad
        const sortedData = [...data].sort((a, b) => {
          const empresaA = a.obras?.empresas?.empresa || '';
          const empresaB = b.obras?.empresas?.empresa || '';

          if (empresaA !== empresaB) {
            return empresaA.localeCompare(empresaB);
          }

          return new Date(b.fecha_generacion) - new Date(a.fecha_generacion);
        });

        return { success: true, data: sortedData };
      } else if (tipo === 'material') {
        const { data: conciliaciones, error: errorConc } = await supabase
          .from('conciliaciones')
          .select(`
            *,
            obras:id_obra (
              id_obra,
              obra,
              cc,
              empresas:id_empresa (
                id_empresa,
                empresa,
                sufijo
              )
            ),
            sindicatos:id_sindicato (
              id_sindicato,
              sindicato,
              nombre_completo,
              nombre_firma_conciliacion
            ),
            conciliacion_vales (
              id_vale,
              vales (
                id_vale,
                vale_material_detalles (
                  volumen_real_m3,
                  material:id_material (
                    material,
                    tipo_de_material:id_tipo_de_material (
                      tipo_de_material
                    )
                  )
                )
              )
            )
          `)
          .eq('tipo_conciliacion', 'material')
          .order('fecha_generacion', { ascending: false });

        if (errorConc) throw errorConc;

        // Computar volumen total y nombre material por conciliación
        const processed = conciliaciones.map((c) => {
          const detalles = (c.conciliacion_vales || [])
            .flatMap((cv) => cv.vales?.vale_material_detalles ?? []);

          const totalVol = detalles.reduce(
            (sum, d) => sum + (d.volumen_real_m3 ?? 0),
            0
          );

          const nombreMaterial =
            detalles[0]?.material?.tipo_de_material?.tipo_de_material ?? '—';

          return {
            ...c,
            totalVolumenM3: totalVol,
            nombreMaterial,
          };
        });

        // Ordenar por empresa y luego por antigüedad
        const sortedData = processed.sort((a, b) => {
          const empresaA = a.obras?.empresas?.empresa || '';
          const empresaB = b.obras?.empresas?.empresa || '';

          if (empresaA !== empresaB) {
            return empresaA.localeCompare(empresaB);
          }

          return new Date(b.fecha_generacion) - new Date(a.fecha_generacion);
        });

        return { success: true, data: sortedData };
      }

      return { success: false, error: 'Tipo inválido' };
    } catch (error) {
      console.error('Error fetching conciliaciones:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const pagarConciliacion = useCallback(
    async (idConciliacion, { numeroFactura, numeroOrdenCompra, nombreProveedor }) => {
      try {
        const { error } = await supabase
          .from('conciliaciones')
          .update({
            estado: 'pagada',
            numero_factura: numeroFactura,
            numero_orden_compra: numeroOrdenCompra,
            nombre_proveedor: nombreProveedor,
          })
          .eq('id_conciliacion', idConciliacion);

        if (error) throw error;
        return { success: true };
      } catch (error) {
        console.error('Error al pagar conciliación:', error);
        return { success: false, error: error.message };
      }
    },
    []
  );

  const editarConciliacionPagada = useCallback(
    async (idConciliacion, { numeroFactura, numeroOrdenCompra, nombreProveedor }) => {
      try {
        const { error } = await supabase
          .from('conciliaciones')
          .update({
            numero_factura: numeroFactura,
            numero_orden_compra: numeroOrdenCompra,
            nombre_proveedor: nombreProveedor,
          })
          .eq('id_conciliacion', idConciliacion);

        if (error) throw error;
        return { success: true };
      } catch (error) {
        console.error('Error al editar conciliación:', error);
        return { success: false, error: error.message };
      }
    },
    []
  );

  return {
    fetchConciliacionesContabilidad,
    pagarConciliacion,
    editarConciliacionPagada,
  };
};
