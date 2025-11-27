/**
 * src/pages/Conciliaciones.jsx
 *
 * Página principal de conciliaciones con tabs para Renta y Material
 *
 * Funcionalidades:
 * - Sistema de tabs para alternar entre Renta y Material
 * - Maneja estados independientes para cada tipo
 * - Genera conciliaciones según el tipo seleccionado
 * - Muestra vista previa antes de guardar
 *
 * Usado en: App.jsx (ruta /conciliaciones)
 */

// 1. React y hooks
import { useState } from "react";

// 2. Hooks personalizados
import { useConciliaciones } from "../hooks/useConciliaciones";
import { useConciliacionesMaterial } from "../hooks/useConciliacionesMaterial";

// 3. Config
import { supabase } from "../config/supabase";

// 4. Componentes compartidos
import FiltrosConciliacion from "../components/conciliaciones/FiltrosConciliacion";

// 5. Componentes de Renta
import TablaConciliacionRenta from "../components/conciliaciones/TablaConciliacionRenta";
import ResumenTotales from "../components/conciliaciones/ResumenTotales";

// 6. Componentes de Material
import TablaConciliacionMaterial from "../components/conciliaciones/TablaConciliacionMaterial";
import ResumenTotalesMaterial from "../components/conciliaciones/ResumenTotalesMaterial";

// 7. Componentes comunes
import BotonGenerarPDF from "../components/conciliaciones/BotonGenerarPDF";

// 8. Icons
import { Truck, Package } from "lucide-react";

// 9. Config
import { colors } from "../config/colors";

// 10. Estilos
import "../styles/conciliaciones.css";

const Conciliaciones = () => {
  // Estado del tab activo
  const [tabActivo, setTabActivo] = useState("renta"); // 'renta' o 'material'

  // Hooks de Renta
  const rentaHook = useConciliaciones();

  // Hooks de Material
  const materialHook = useConciliacionesMaterial();

  // Estados locales para generación
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: null, texto: "" });
  const [conciliacionGenerada, setConciliacionGenerada] = useState(null);
  const [datosParaPDF, setDatosParaPDF] = useState(null);

  // Seleccionar el hook activo según el tab
  const hookActivo = tabActivo === "renta" ? rentaHook : materialHook;

  /**
   * Cambiar de tab y limpiar estados
   */
  const handleCambiarTab = (nuevoTab) => {
    console.log("[Conciliaciones] Cambiando a tab:", nuevoTab);

    // Limpiar estados del tab anterior
    if (tabActivo === "renta") {
      rentaHook.clearFiltros();
    } else {
      materialHook.clearFiltros();
    }

    // Limpiar mensajes y conciliación generada
    setMensaje({ tipo: null, texto: "" });
    setConciliacionGenerada(null);
    setDatosParaPDF(null);

    setTabActivo(nuevoTab);
  };

  /**
   * Generar conciliación (aplica al hook activo)
   */
  const handleGenerar = async () => {
    const vistaPrevia = hookActivo.vistaPrevia;

    if (
      !vistaPrevia.valesAgrupados ||
      Object.keys(vistaPrevia.valesAgrupados).length === 0
    ) {
      setMensaje({
        tipo: "error",
        texto: "No hay vales para generar conciliación",
      });
      return;
    }

    try {
      console.log(
        "[Conciliaciones] handleGenerar - Tipo:",
        tabActivo.toUpperCase()
      );
      setGenerando(true);
      setMensaje({ tipo: null, texto: "" });

      // Guardar los datos ANTES de que se limpien
      const datosGuardados = {
        valesAgrupados: vistaPrevia.valesAgrupados,
        totalesGenerales: vistaPrevia.totalesGenerales,
      };

      const resultado = await hookActivo.generarConciliacion();

      if (resultado.success) {
        console.log(
          "[Conciliaciones] Conciliación generada:",
          resultado.data.folio
        );

        // Cargar datos completos con relaciones
        const { data: conciliacionCompleta, error } = await supabase
          .from("conciliaciones")
          .select(
            `
          *,
          obras:id_obra (
            id_obra,
            obra,
            cc
          ),
          sindicatos:id_sindicato (
            id_sindicato,
            sindicato,
            nombre_completo,
            nombre_firma_conciliacion
          ),
          empresas:id_empresa (
            id_empresa,
            empresa,
            sufijo
          )
        `
          )
          .eq("id_conciliacion", resultado.data.id_conciliacion)
          .single();

        if (error) throw error;

        setConciliacionGenerada(conciliacionCompleta);
        setDatosParaPDF(datosGuardados);

        setMensaje({
          tipo: "success",
          texto: `Conciliación generada exitosamente: ${resultado.data.folio}`,
        });
      } else {
        throw new Error(resultado.error);
      }
    } catch (error) {
      console.error("[Conciliaciones] Error al generar conciliación:", error);
      setMensaje({
        tipo: "error",
        texto: error.message || "Error al generar conciliación",
      });
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="conciliaciones-page">
      <div className="conciliaciones-page__header">
        <h1>Conciliaciones</h1>
        <p className="conciliaciones-page__subtitle">
          Genera conciliaciones agrupando vales verificados por semana y obra
        </p>
      </div>

      {/* Sistema de Tabs */}
      <div className="conciliaciones-tabs">
        <button
          className={`conciliaciones-tabs__tab ${
            tabActivo === "renta" ? "conciliaciones-tabs__tab--active" : ""
          }`}
          onClick={() => handleCambiarTab("renta")}
          type="button"
          aria-selected={tabActivo === "renta"}
          style={{
            backgroundColor:
              tabActivo === "renta" ? colors.secondary : "transparent",
            color: tabActivo === "renta" ? "#fff" : colors.textPrimary,
          }}
        >
          <Truck size={20} aria-hidden="true" />
          <span>Renta de Maquinaria</span>
        </button>

        <button
          className={`conciliaciones-tabs__tab ${
            tabActivo === "material" ? "conciliaciones-tabs__tab--active" : ""
          }`}
          onClick={() => handleCambiarTab("material")}
          type="button"
          aria-selected={tabActivo === "material"}
          style={{
            backgroundColor:
              tabActivo === "material" ? colors.primary : "transparent",
            color: tabActivo === "material" ? "#fff" : colors.textPrimary,
          }}
        >
          <Package size={20} aria-hidden="true" />
          <span>Material</span>
        </button>
      </div>

      {/* Mensajes */}
      {mensaje.tipo && (
        <div
          className={`conciliaciones-message conciliaciones-message--${mensaje.tipo}`}
        >
          {mensaje.texto}
        </div>
      )}

      {/* Contenido del Tab Activo */}
      <div className="conciliaciones-content">
        {/* Filtros */}
        <FiltrosConciliacion
          semanas={hookActivo.semanas}
          obras={hookActivo.obras}
          sindicatos={hookActivo.sindicatos}
          filtros={hookActivo.filtros}
          onFiltrosChange={hookActivo.updateFiltros}
          onCargarVistaPrevia={hookActivo.cargarVistaPrevia}
          onLimpiar={hookActivo.clearFiltros}
          loading={hookActivo.loadingCatalogos}
          vistaPreviaLoading={hookActivo.vistaPrevia.loading}
        />

        {/* Error de vista previa */}
        {hookActivo.vistaPrevia.error && (
          <div className="conciliaciones-message conciliaciones-message--error">
            {hookActivo.vistaPrevia.error}
          </div>
        )}

        {/* Vista Previa y Totales */}
        {hookActivo.vistaPrevia.valesAgrupados && (
          <>
            {/* Tabla según tipo */}
            {tabActivo === "renta" ? (
              <TablaConciliacionRenta
                valesAgrupados={hookActivo.vistaPrevia.valesAgrupados}
              />
            ) : (
              <TablaConciliacionMaterial
                valesAgrupados={hookActivo.vistaPrevia.valesAgrupados}
              />
            )}

            {/* Resumen de totales según tipo */}
            {tabActivo === "renta" ? (
              <ResumenTotales
                totales={hookActivo.vistaPrevia.totalesGenerales}
                loading={hookActivo.vistaPrevia.loading}
              />
            ) : (
              <ResumenTotalesMaterial
                totales={hookActivo.vistaPrevia.totalesGenerales}
                loading={hookActivo.vistaPrevia.loading}
              />
            )}

            {/* Botones de acción */}
            <div className="conciliaciones-actions">
              {!conciliacionGenerada ? (
                Object.keys(hookActivo.vistaPrevia.valesAgrupados || {})
                  .length > 0 && (
                  <button
                    onClick={handleGenerar}
                    disabled={generando}
                    className="btn btn--primary btn--generar-conciliacion"
                    style={{ backgroundColor: colors.accent }}
                  >
                    {generando ? "Generando..." : "Generar Conciliación"}
                  </button>
                )
              ) : (
                <BotonGenerarPDF
                  conciliacion={conciliacionGenerada}
                  valesAgrupados={datosParaPDF.valesAgrupados}
                  totales={datosParaPDF.totalesGenerales}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Conciliaciones;
