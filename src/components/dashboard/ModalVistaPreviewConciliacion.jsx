/**
 * src/components/dashboard/ModalVistaPreviewConciliacion.jsx
 *
 * Modal que muestra vista previa de conciliación similar al PDF
 *
 * Funcionalidades:
 * - Simula el diseño del PDF generado
 * - Muestra encabezados, tabla, totales y firmas
 * - Cierra con X o click fuera
 *
 * Usado en: SeccionConciliaciones.jsx
 */

// 1. React y hooks
import { useEffect, useState } from "react";

// 2. Icons
import { X, Loader2 } from "lucide-react";

// 3. Config
import { supabase } from "../../config/supabase";

// 4. Componentes
import VistaPreviewRenta from "./preview/VistaPreviewRenta";
import VistaPreviewMaterial from "./preview/VistaPreviewMaterial";

// 5. Utils
import { formatearFechaCorta } from "../../utils/formatters";

const ModalVistaPreviewConciliacion = ({ conciliacion, onCerrar, tipo }) => {
  const [valesAgrupados, setValesAgrupados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
              *,
              vehiculos:id_vehiculo (
                placas
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
            `
            )
            .in("id_vale", idsVales)
            .order("fecha_creacion", { ascending: true });

          if (errorVales) throw errorVales;

          // Agrupar por placas
          const grupos = agruparPorPlacasRenta(vales);
          setValesAgrupados(grupos);
        } else {
          // Material (implementar después)
          const { data: vales, error: errorVales } = await supabase
            .from("vales")
            .select(
              `
              *,
              vehiculos:id_vehiculo (
                placas
              ),
              vale_material_detalles (
                capacidad_m3,
                distancia_km,
                cantidad_pedida_m3,
                peso_ton,
                volumen_real_m3,
                folio_banco,
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
                )
              )
            `
            )
            .in("id_vale", idsVales)
            .order("fecha_creacion", { ascending: true });

          if (errorVales) throw errorVales;

          const grupos = agruparPorPlacasMaterial(vales);
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

      vale.vale_material_detalles.forEach((detalle) => {
        const idTipo = detalle.material?.tipo_de_material?.id_tipo_de_material;
        grupos[placas].subtotal += Number(detalle.costo_total || 0);

        if (idTipo === 1) {
          grupos[placas].totalesTipo1.totalM3 += Number(
            detalle.volumen_real_m3 || 0
          );
          grupos[placas].totalesTipo1.totalToneladas += Number(
            detalle.peso_ton || 0
          );
          grupos[placas].totalesTipo1.totalViajes += 1;
        } else if (idTipo === 2) {
          grupos[placas].totalesTipo2.totalM3 += Number(
            detalle.volumen_real_m3 || 0
          );
          grupos[placas].totalesTipo2.totalToneladas += Number(
            detalle.peso_ton || 0
          );
          grupos[placas].totalesTipo2.totalViajes += 1;
        } else if (idTipo === 3) {
          grupos[placas].totalesTipo3.totalM3 += Number(
            detalle.cantidad_pedida_m3 || 0
          );
          grupos[placas].totalesTipo3.totalViajes += 1;
        }
      });

      grupos[placas].vales.push(vale);
    });

    return grupos;
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
          <button
            className="modal-preview__close"
            onClick={onCerrar}
            aria-label="Cerrar modal"
          >
            <X size={24} />
          </button>
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
