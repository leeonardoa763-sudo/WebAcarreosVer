/**
 * src/hooks/useVerificacion.js
 *
 * Hook para manejo de verificación de vales mediante PDF
 *
 * Funcionalidades:
 * - Procesar PDF y extraer folio (QR o OCR)
 * - Buscar vale en BD por folio
 * - Validar estado y permisos
 * - Marcar vale como verificado
 * - Procesamiento masivo de PDFs
 *
 * Usado en: VerificarVales.jsx
 */

// 1. React y hooks
import { useState, useCallback } from "react";

// 2. Config
import { supabase } from "../config/supabase";

// 3. Hooks personalizados
import { useAuth } from "./useAuth";

// 4. Utils
import { extractFolioFromPDF, convertPDFToImage } from "../utils/pdfExtractor";
import { extractFolioFromQR } from "../utils/qrDecoder";

export const useVerificacion = () => {
  const { userProfile, hasRole } = useAuth();

  // Estados
  const [processing, setProcessing] = useState(false);
  const [currentVale, setCurrentVale] = useState(null);
  const [extractedFolio, setExtractedFolio] = useState(null);
  const [error, setError] = useState(null);
  const [valesVerificados, setValesVerificados] = useState([]);
  const [loadingVerificados, setLoadingVerificados] = useState(false);

  /**
   * Procesar PDF y extraer folio
   */
  const processPDF = useCallback(async (file) => {
    try {
      setProcessing(true);
      setError(null);
      setCurrentVale(null);
      setExtractedFolio(null);

      // Validar tamaño del archivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("El archivo es muy grande. Máximo 5MB.");
      }

      // Validar tipo de archivo
      if (file.type !== "application/pdf") {
        throw new Error("Solo se permiten archivos PDF.");
      }

      // MÉTODO 1: Intentar extraer folio por OCR
      console.log("Intentando extraer folio por OCR...");
      const ocrResult = await extractFolioFromPDF(file);

      if (ocrResult.success) {
        console.log("Folio extraído por OCR:", ocrResult.folio);
        setExtractedFolio(ocrResult.folio);
        return { success: true, folio: ocrResult.folio, method: "OCR" };
      }

      // MÉTODO 2: Intentar extraer folio por QR
      console.log("OCR falló, intentando decodificar QR...");
      const imageResult = await convertPDFToImage(file);

      if (!imageResult.success) {
        throw new Error(
          "No se pudo procesar el PDF. Contacte al administrador."
        );
      }

      const qrResult = await extractFolioFromQR(imageResult.canvas);

      if (qrResult.success) {
        console.log("Folio extraído por QR:", qrResult.folio);
        setExtractedFolio(qrResult.folio);
        return { success: true, folio: qrResult.folio, method: "QR" };
      }

      // Si ambos métodos fallan
      throw new Error(
        "No se pudo leer el folio del PDF. Contacte al administrador."
      );
    } catch (error) {
      console.error("Error en processPDF:", error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setProcessing(false);
    }
  }, []);

  /**
   * Buscar vale en BD por folio
   */
  const buscarValePorFolio = useCallback(
    async (folio) => {
      try {
        setProcessing(true);
        setError(null);

        const { data, error: searchError } = await supabase
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
              sufijo
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
          vale_material_detalles (
            id_detalle_material,
            capacidad_m3,
            distancia_km,
            cantidad_pedida_m3,
            peso_ton,
            material:id_material (
              material,
              tipo_de_material:id_tipo_de_material (
                tipo_de_material
              )
            ),
            bancos:id_banco (
              banco
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
            material:id_material (
              material
            ),
            precios_renta:id_precios_renta (
              costo_hr,
              costo_dia
            )
          )
        `
          )
          .eq("folio", folio)
          .maybeSingle(); // Cambio aquí

        // Si hay error de query
        if (searchError) {
          throw new Error(`Error al buscar vale: ${searchError.message}`);
        }

        // Si no se encontró el vale (RLS lo bloqueó o no existe)
        if (!data) {
          // Si es sindicato, el RLS puede estar bloqueando el acceso
          if (hasRole("Sindicato")) {
            throw new Error(
              "Vale no encontrado o no pertenece a su sindicato."
            );
          }
          throw new Error("Vale no encontrado en el sistema.");
        }

        // VALIDACIÓN 1: Verificar sindicato (solo para rol Sindicato)
        if (hasRole("Sindicato")) {
          const sindicatoOperador = data.operadores?.sindicatos?.id_sindicato;
          const sindicatoUsuario = userProfile?.id_sindicato;

          if (!sindicatoOperador) {
            throw new Error("El vale no tiene operador asignado.");
          }

          if (sindicatoOperador !== sindicatoUsuario) {
            throw new Error("Este vale no pertenece a su sindicato.");
          }
        }

        // VALIDACIÓN 2: Verificar si ya fue verificado
        if (data.verificado_por_sindicato) {
          throw new Error("Este vale ya fue verificado anteriormente.");
        }

        // VALIDACIÓN 3: Verificar estado
        if (data.estado !== "emitido") {
          throw new Error(
            `El vale no está en estado emitido. Estado actual: ${data.estado}`
          );
        }

        setCurrentVale(data);
        return { success: true, vale: data };
      } catch (error) {
        console.error("Error en buscarValePorFolio:", error);
        setError(error.message);
        setCurrentVale(null);
        return { success: false, error: error.message };
      } finally {
        setProcessing(false);
      }
    },
    [userProfile, hasRole]
  );

  /**
   * Verificar vale (marcar como verificado)
   */
  const verificarVale = useCallback(
    async (valeId) => {
      try {
        setProcessing(true);
        setError(null);

        // Usar la función RPC de Supabase
        const { data, error: rpcError } = await supabase.rpc("verificar_vale", {
          p_folio: extractedFolio,
          p_id_persona_verificador: userProfile.id_persona,
        });

        if (rpcError) throw rpcError;

        if (!data.success) {
          throw new Error(data.error);
        }

        // Registrar acción en vale_accesos
        await supabase.from("vale_accesos").insert({
          id_vale: valeId,
          id_persona: userProfile.id_persona,
          tipo_accion: "verificacion_sindicato",
          ip_address: null,
          user_agent: navigator.userAgent,
        });

        // Limpiar estados
        setCurrentVale(null);
        setExtractedFolio(null);

        // Recargar lista de verificados
        await fetchValesVerificados();

        return { success: true };
      } catch (error) {
        console.error("Error en verificarVale:", error);
        setError(error.message);
        return { success: false, error: error.message };
      } finally {
        setProcessing(false);
      }
    },
    [extractedFolio, userProfile]
  );

  /**
   * Obtener vales verificados recientemente
   */
  const fetchValesVerificados = useCallback(async () => {
    try {
      setLoadingVerificados(true);

      let query = supabase
        .from("vales")
        .select(
          `
          id_vale,
          folio,
          fecha_verificacion,
          tipo_vale,
          obras:id_obra (
            obra
          ),
          persona:id_persona_verificador (
            nombre,
            primer_apellido
          )
        `
        )
        .eq("verificado_por_sindicato", true)
        .order("fecha_verificacion", { ascending: false })
        .limit(10);

      // Si es sindicato, solo mostrar los que él verificó
      if (hasRole("Sindicato")) {
        query = query.eq("id_persona_verificador", userProfile.id_persona);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setValesVerificados(data || []);
    } catch (error) {
      console.error("Error en fetchValesVerificados:", error);
    } finally {
      setLoadingVerificados(false);
    }
  }, [userProfile, hasRole]);

  /**
   * Limpiar estados
   */
  const clearStates = useCallback(() => {
    setCurrentVale(null);
    setExtractedFolio(null);
    setError(null);
  }, []);

  /**
   * Verificar múltiples vales en lote
   */
  const verificarBatch = useCallback(
    async (valesParaVerificar) => {
      console.log(
        `=== INICIANDO VERIFICACIÓN MASIVA: ${valesParaVerificar.length} vales ===`
      );

      const results = {
        verified: [],
        errors: [],
      };

      setProcessing(true);

      for (let i = 0; i < valesParaVerificar.length; i++) {
        const item = valesParaVerificar[i];
        console.log(
          `\n[${i + 1}/${valesParaVerificar.length}] Verificando: ${item.folio}`
        );

        try {
          const { data, error: rpcError } = await supabase.rpc(
            "verificar_vale",
            {
              p_folio: item.folio,
              p_id_persona_verificador: userProfile.id_persona,
            }
          );

          if (rpcError) throw rpcError;
          if (!data.success) throw new Error(data.error);

          console.log(`  ✓ Vale ${item.folio} verificado correctamente`);

          // Registrar acción
          await supabase.from("vale_accesos").insert({
            id_vale: item.vale.id_vale,
            id_persona: userProfile.id_persona,
            tipo_accion: "verificacion_sindicato",
            user_agent: navigator.userAgent,
          });

          results.verified.push(item);
        } catch (error) {
          console.log(
            `  ❌ Error al verificar ${item.folio}: ${error.message}`
          );
          results.errors.push({
            ...item,
            error: error.message,
          });
        }
      }

      console.log("\n=== VERIFICACIÓN COMPLETADA ===");
      console.log(`✓ Verificados: ${results.verified.length}`);
      console.log(`❌ Errores: ${results.errors.length}`);

      setProcessing(false);
      await fetchValesVerificados();

      return results;
    },
    [userProfile, fetchValesVerificados]
  );

  /**
   * Procesar múltiples PDFs en lote
   */
  const processBatch = useCallback(
    async (files) => {
      console.log(
        `=== INICIANDO PROCESAMIENTO MASIVO: ${files.length} archivos ===`
      );

      const results = {
        success: [],
        alreadyVerified: [],
        errors: [],
      };

      setProcessing(true);
      setError(null);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`\n[${i + 1}/${files.length}] Procesando: ${file.name}`);

        try {
          // Extraer folio
          console.log("  - Extrayendo folio...");
          const extractResult = await processPDF(file);

          if (!extractResult.success) {
            console.log("  ❌ Error al extraer folio:", extractResult.error);
            results.errors.push({
              fileName: file.name,
              error: extractResult.error,
            });
            continue;
          }

          console.log(`  ✓ Folio extraído: ${extractResult.folio}`);

          // Buscar vale
          console.log("  - Buscando vale en BD...");
          const searchResult = await buscarValePorFolio(extractResult.folio);

          if (!searchResult.success) {
            console.log("  ❌ Error al buscar vale:", searchResult.error);

            if (searchResult.error.includes("ya fue verificado")) {
              console.log("  ⚠️ Vale ya verificado anteriormente");
              results.alreadyVerified.push({
                fileName: file.name,
                folio: extractResult.folio,
              });
            } else {
              results.errors.push({
                fileName: file.name,
                folio: extractResult.folio,
                error: searchResult.error,
              });
            }

            // Limpiar estados antes de continuar
            setCurrentVale(null);
            setExtractedFolio(null);
            continue;
          }

          console.log("  ✓ Vale encontrado y válido");

          // Agregar a lista de éxitos
          results.success.push({
            fileName: file.name,
            folio: extractResult.folio,
            vale: searchResult.vale,
          });
        } catch (error) {
          console.log(`  ❌ Error inesperado: ${error.message}`);
          results.errors.push({
            fileName: file.name,
            error: error.message,
          });
        }

        // Limpiar estados entre archivos
        setCurrentVale(null);
        setExtractedFolio(null);
      }

      console.log("\n=== RESULTADOS FINALES ===");
      console.log(`✓ Éxitos: ${results.success.length}`);
      console.log(`⚠️ Ya verificados: ${results.alreadyVerified.length}`);
      console.log(`❌ Errores: ${results.errors.length}`);

      setProcessing(false);
      return results;
    },
    [processPDF, buscarValePorFolio]
  );

  return {
    // Estados
    processing,
    currentVale,
    extractedFolio,
    error,
    valesVerificados,
    loadingVerificados,

    // Funciones
    processPDF,
    buscarValePorFolio,
    verificarVale,
    fetchValesVerificados,
    clearStates,
    processBatch,
    verificarBatch,
  };
};
