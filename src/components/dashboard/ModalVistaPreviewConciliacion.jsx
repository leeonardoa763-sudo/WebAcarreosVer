/**
 * src/components/dashboard/ModalVistaPreviewConciliacion.jsx
 *
 * Modal que muestra vista previa de conciliación similar al PDF.
 * Incluye botón para exportar los vales de renta en PDF (4 por hoja).
 *
 * Funcionalidades:
 * - Simula el diseño del PDF generado
 * - Muestra encabezados, tabla, totales y firmas
 * - Cierra con X o click fuera
 * - Exporta vales de renta en PDF bulk (solo tipo renta)
 *
 * Usado en: SeccionConciliaciones.jsx
 */

// 1. React y hooks
import { useEffect, useState } from "react";

// 2. Icons
import { X, Loader2, FileDown } from "lucide-react";

// 3. Config
import { supabase } from "../../config/supabase";
import { colors } from "../../config/colors";

// 4. Componentes
import VistaPreviewRenta from "./preview/VistaPreviewRenta";
import VistaPreviewMaterial from "./preview/VistaPreviewMaterial";

// 5. Utils
import { formatearFechaCorta } from "../../utils/formatters";

const ModalVistaPreviewConciliacion = ({ conciliacion, onCerrar, tipo }) => {
  const [valesAgrupados, setValesAgrupados] = useState(null);
  // Guardamos el array plano de vales para el export PDF
  const [valesPlanos, setValesPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportandoPDF, setExportandoPDF] = useState(false);

  /**
   * Cargar vales de la conciliación
   */
  useEffect(() => {
    const cargarVales = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Obtener IDs de vales
        const { data: valesIds, error: errorIds } = await supabase
          .from("conciliacion_vales")
          .select("id_vale")
          .eq("id_conciliacion", conciliacion.id_conciliacion);

        if (errorIds) throw errorIds;

        // 2. Obtener vales completos
        const idsVales = valesIds.map((v) => v.id_vale);

        if (tipo === "renta") {
          const { data: vales, error: errorVales } = await supabase
            .from("vales")
            .select(
              `
              id_vale,
              folio,
              tipo_vale,
              estado,
              fecha_creacion,
              fecha_programada,
              fecha_completado,
              qr_verification_url,
              obras:id_obra (
                id_obra,
                obra,
                cc,
                empresas:id_empresa (
                  id_empresa,
                  empresa
                )
              ),
              vehiculos:id_vehiculo (
                placas
              ),
              operadores:id_operador (
                nombre_completo,
                sindicatos:id_sindicato (
                  sindicato
                )
              ),
              persona:id_persona_creador (
                nombre,
                primer_apellido,
                segundo_apellido
              ),
              persona_completador:id_persona_completador (
                nombre,
                primer_apellido,
                segundo_apellido
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
                )
              )
            `,
            )
            .in("id_vale", idsVales)
            .order("fecha_creacion", { ascending: true });

          if (errorVales) throw errorVales;

          // Guardar array plano para export
          setValesPlanos(vales || []);

          // Agrupar por placas para la vista previa
          const grupos = agruparPorPlacasRenta(vales);
          setValesAgrupados(grupos);
        } else {
          // Material
          const { data: vales, error: errorVales } = await supabase
            .from("vales")
            .select(
              `
              *,
              obras:id_obra (
                id_obra,
                obra,
                cc,
                empresas:id_empresa (
                  id_empresa,
                  empresa
                )
              ),
              vehiculos:id_vehiculo (
                placas
              ),
              operadores:id_operador (
                nombre_completo,
                sindicatos:id_sindicato (
                  sindicato
                )
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
                volumen_real_m3,
                folio_banco,
                requisicion,
                precio_m3,
                costo_total,
                material:id_material (
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
                  folio_vale_fisico,
                  peso_ton,
                  volumen_m3,
                  costo_viaje
                )
              )
            `,
            )
            .in("id_vale", idsVales)
            .order("fecha_creacion", { ascending: true });
          if (errorVales) throw errorVales;

          // Guardar array plano para export
          setValesPlanos(vales || []);

          const grupos = agruparPorPlacasMaterial(vales || []);
          setValesAgrupados(grupos);
        }
      } catch (err) {
        console.error("[ModalVistaPreviewConciliacion] Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    cargarVales();
  }, [conciliacion.id_conciliacion, tipo]);

  /**
   * Agrupar vales de renta por placas
   */
  const agruparPorPlacasRenta = (vales) => {
    const grupos = {};

    vales.forEach((vale) => {
      const placas = vale.vehiculos?.placas || "SIN PLACAS";

      if (!grupos[placas]) {
        grupos[placas] = {
          placas,
          vales: [],
          totalDias: 0,
          totalHoras: 0,
          subtotal: 0,
        };
      }

      vale.vale_renta_detalle.forEach((detalle) => {
        grupos[placas].totalDias += Number(detalle.total_dias || 0);
        grupos[placas].totalHoras += Number(detalle.total_horas || 0);
        grupos[placas].subtotal += Number(detalle.costo_total || 0);
      });

      grupos[placas].vales.push(vale);
    });

    return grupos;
  };

  /**
   * Agrupar vales de material por placas
   */
  const agruparPorPlacasMaterial = (vales) => {
    const grupos = {};

    vales.forEach((vale) => {
      const placas = vale.vehiculos?.placas || "SIN PLACAS";

      if (!grupos[placas]) {
        grupos[placas] = {
          placas,
          vales: [],
          subtotal: 0,
          totalesTipo1: { totalM3: 0, totalToneladas: 0, totalViajes: 0 },
          totalesTipo2: { totalM3: 0, totalToneladas: 0, totalViajes: 0 },
          totalesTipo3: { totalM3: 0, totalViajes: 0 },
        };
      }

      vale.vale_material_detalles?.forEach((detalle) => {
        const idTipo = detalle.material?.tipo_de_material?.id_tipo_de_material;
        const costo = Number(detalle.costo_total || 0);

        grupos[placas].subtotal += costo;

        // Viajes reales registrados; fallback a 1 si aún no hay viajes
        const viajes = detalle.vale_material_viajes || [];
        const numViajes = viajes.length > 0 ? viajes.length : 1;

        if (idTipo === 1) {
          grupos[placas].totalesTipo1.totalViajes += numViajes;
          grupos[placas].totalesTipo1.totalM3 += Number(
            detalle.volumen_real_m3 || 0,
          );
          grupos[placas].totalesTipo1.totalToneladas += Number(
            detalle.peso_ton || 0,
          );
        } else if (idTipo === 2) {
          grupos[placas].totalesTipo2.totalViajes += numViajes;
          grupos[placas].totalesTipo2.totalM3 += Number(
            detalle.volumen_real_m3 || 0,
          );
          grupos[placas].totalesTipo2.totalToneladas += Number(
            detalle.peso_ton || 0,
          );
        } else if (idTipo === 3) {
          grupos[placas].totalesTipo3.totalViajes += numViajes;
          grupos[placas].totalesTipo3.totalM3 += Number(
            detalle.cantidad_pedida_m3 || detalle.volumen_real_m3 || 0,
          );
        }
      });

      grupos[placas].vales.push(vale);
    });

    return grupos;
  };

  /**
   * Exportar vales de renta en PDF bulk (4 por página)
   */
  const handleExportarValesPDF = async () => {
    if (exportandoPDF || valesPlanos.length === 0) return;

    try {
      setExportandoPDF(true);

      if (tipo === "renta") {
        const { generarPDFValesRentaBulk } = await import(
          "../../utils/conciliaciones/generarPDFValesRentaBulk"
        );
        await generarPDFValesRentaBulk(valesPlanos, conciliacion.folio);
      } else {
        const { generarPDFValesMaterialBulk } = await import(
          "../../utils/conciliaciones/generarPDFValesMaterialBulk"
        );
        await generarPDFValesMaterialBulk(valesPlanos, conciliacion.folio);
      }
    } catch (err) {
      console.error(
        "[ModalVistaPreviewConciliacion] Error al exportar PDF:",
        err,
      );
      alert("Error al generar el PDF de vales. Intenta de nuevo.");
    } finally {
      setExportandoPDF(false);
    }
  };
  /**
   * Cerrar modal con ESC
   */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onCerrar]);

  /**
   * Prevenir scroll del body cuando modal está abierto
   */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-preview" onClick={(e) => e.stopPropagation()}>
        {/* Header del modal */}
        <div className="modal-preview__header">
          <h2 className="modal-preview__title">
            Vista Previa - {conciliacion.folio}
          </h2>

          <div className="modal-preview__header-actions">
            {/* Botón exportar vales PDF — solo visible para conciliaciones de renta */}
            {!loading && !error && valesPlanos.length > 0 && (
              <button
                className="modal-preview__btn-export"
                onClick={handleExportarValesPDF}
                disabled={exportandoPDF}
                title={`Exportar ${valesPlanos.length} vales en PDF`}
                style={{ backgroundColor: colors.secondary }}
              >
                {exportandoPDF ? (
                  <>
                    <Loader2
                      size={16}
                      className="modal-preview__btn-export-spinner"
                    />
                    <span>Generando...</span>
                  </>
                ) : (
                  <>
                    <FileDown size={16} />
                    <span>Exportar Vales PDF</span>
                  </>
                )}
              </button>
            )}

            {/* Botón cerrar */}
            <button
              className="modal-preview__close"
              onClick={onCerrar}
              aria-label="Cerrar modal"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="modal-preview__content">
          {loading && (
            <div className="modal-preview__loading">
              <Loader2 size={48} className="spinner" />
              <p>Cargando vista previa...</p>
            </div>
          )}

          {error && (
            <div className="modal-preview__error">
              <p>Error al cargar: {error}</p>
            </div>
          )}

          {!loading && !error && valesAgrupados && (
            <>
              {tipo === "renta" ? (
                <VistaPreviewRenta
                  conciliacion={conciliacion}
                  valesAgrupados={valesAgrupados}
                />
              ) : (
                <VistaPreviewMaterial
                  conciliacion={conciliacion}
                  valesAgrupados={valesAgrupados}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalVistaPreviewConciliacion;
