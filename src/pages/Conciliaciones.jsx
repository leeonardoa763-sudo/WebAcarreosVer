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
 * - Valida si se está generando conciliación de la semana actual
 *
 * Usado en: App.jsx (ruta /conciliaciones)
 */

// 1. React y hooks
import { useState } from "react";

// 2. Hooks personalizados
import { useConciliaciones } from "../hooks/useConciliaciones";
import { useConciliacionesMaterial } from "../hooks/useConciliacionesMaterial";
import { useAuth } from "../hooks/useAuth";

// 3. Config
import { supabase } from "../config/supabase";

// 4. Componentes compartidos
import FiltrosConciliacion from "../components/conciliaciones/FiltrosConciliacion";
import ModalConciliacionGenerada from "../components/conciliaciones/ModalConciliacionGenerada";
import "../styles/modal-conciliacion.css";

// 5. Componentes de Renta
import TablaConciliacionRenta from "../components/conciliaciones/TablaConciliacionRenta";
import ResumenTotales from "../components/conciliaciones/ResumenTotales";

// 6. Componentes de Material
import TablaConciliacionMaterial from "../components/conciliaciones/TablaConciliacionMaterial";
import ResumenTotalesMaterial from "../components/conciliaciones/ResumenTotalesMaterial";

// 7. Componentes comunes
import BotonGenerarPDF from "../components/conciliaciones/BotonGenerarPDF";
import { esSemanaCorriente } from "../utils/dateUtils";
// 8. Icons
import { Truck, Package } from "lucide-react";

// 9. Config
import { colors } from "../config/colors";

// 10. Estilos
import "../styles/conciliaciones.css";

const Conciliaciones = () => {
  // Estado del tab activo
  const [tabActivo, setTabActivo] = useState("renta"); // 'renta' o 'material'

  // Auth
  const { userProfile, hasRole } = useAuth();
  const esAdmin = hasRole("Administrador");

  // Hooks de Renta
  const rentaHook = useConciliaciones();

  // Hooks de Material
  const materialHook = useConciliacionesMaterial();

  // Estados locales para generación
  const [generando, setGenerando] = useState(false);
  const [previsualizando, setPrevisualizando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: null, texto: "" });
  const [conciliacionGenerada, setConciliacionGenerada] = useState(null);
  const [datosParaPDF, setDatosParaPDF] = useState(null);
  const [mostrarModalSemanaActual, setMostrarModalSemanaActual] =
    useState(false);
  const [mostrarModalConciliacion, setMostrarModalConciliacion] =
    useState(false);

  // Seleccionar el hook activo según el tab
  const hookActivo = tabActivo === "renta" ? rentaHook : materialHook;

  /**
   * Cambiar de tab y limpiar estados
   */
  const handleCambiarTab = (nuevoTab) => {
    // Limpiar estados del tab anterior
    if (tabActivo === "renta") {
      console.log("  → Limpiando filtros de RENTA");
      rentaHook.clearFiltros();
    } else {
      console.log("  → Limpiando filtros de MATERIAL");
      materialHook.clearFiltros();
    }

    // Limpiar mensajes y conciliación generada
    setMensaje({ tipo: null, texto: "" });
    setConciliacionGenerada(null);
    setDatosParaPDF(null);

    setTabActivo(nuevoTab);

    // Forzar recarga de catálogos del nuevo tab
    setTimeout(() => {
      if (nuevoTab === "renta") {
        console.log("  → Recargando catálogos de RENTA");
        rentaHook.loadSemanas?.();
      } else {
        console.log("  → Recargando catálogos de MATERIAL");
        materialHook.loadSemanas?.();
      }
    }, 100);
  };

  /**
   * Ejecutar la generación de conciliación
   */
  const ejecutarGeneracion = async () => {
    const vistaPrevia = hookActivo.vistaPrevia;

    try {
      console.log(
        "[Conciliaciones] handleGenerar - Tipo:",
        tabActivo.toUpperCase()
      );
      setGenerando(true);
      setMensaje({ tipo: null, texto: "" });

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

        // Abrir modal en lugar de mostrar mensaje
        setMostrarModalConciliacion(true);

        // Limpiar mensaje
        setMensaje({ tipo: "", texto: "" });
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

  /**
   * Generar conciliación (valida semana actual antes de proceder)
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

    // Verificar si es la semana actual
    const semanaSeleccionada = hookActivo.filtros.semanaSeleccionada;

    if (semanaSeleccionada) {
      const esSemanaActual = esSemanaCorriente(semanaSeleccionada);

      if (esSemanaActual) {
        setMostrarModalSemanaActual(true);
        return;
      }
    }

    // Continuar con la generación normal
    await ejecutarGeneracion();
  };

  /**
   * Genera el PDF sin guardar nada en BD — solo para Administrador
   */
  const handlePrevisualizarPDF = async () => {
    const vistaPrevia = hookActivo.vistaPrevia;
    const filtros = hookActivo.filtros;

    try {
      setPrevisualizando(true);
      setMensaje({ tipo: null, texto: "" });

      const primerGrupo = Object.values(vistaPrevia.valesAgrupados)[0];
      const primerVale = primerGrupo?.vales?.[0];

      // Prioridad: filtro de sindicato → perfil del usuario → sindicato del operador del primer vale
      const idSindicatoUsado =
        filtros.sindicatoSeleccionado ||
        userProfile?.id_sindicato ||
        primerVale?.operadores?.sindicatos?.id_sindicato;

      console.log("[Preview PDF] id_sindicato resuelto:", idSindicatoUsado, {
        filtros: filtros.sindicatoSeleccionado,
        perfil: userProfile?.id_sindicato,
        operador: primerVale?.operadores?.sindicatos?.id_sindicato,
      });

      if (!idSindicatoUsado) {
        throw new Error("No se pudo determinar el sindicato — verifica que los vales tengan operador asignado");
      }

      console.log("[Preview PDF] primerVale.obras:", primerVale?.obras);

      const { data: sindicatoData, error: sindicatoError } = await supabase
        .from("sindicatos")
        .select("id_sindicato, sindicato, nombre_completo, nombre_firma_conciliacion")
        .eq("id_sindicato", idSindicatoUsado)
        .single();

      if (sindicatoError) throw sindicatoError;

      console.log("[Preview PDF] sindicatoData:", sindicatoData);

      const mockConciliacion = {
        folio: "BORRADOR",
        tipo_conciliacion: tabActivo,
        numero_semana: filtros.semanaSeleccionada?.numero,
        año: filtros.semanaSeleccionada?.año,
        fecha_inicio: filtros.semanaSeleccionada?.fechaInicio,
        fecha_fin: filtros.semanaSeleccionada?.fechaFin,
        subtotal: vistaPrevia.totalesGenerales?.subtotal,
        iva_16_porciento: vistaPrevia.totalesGenerales?.iva,
        retencion_4_porciento: vistaPrevia.totalesGenerales?.retencion,
        total_final: vistaPrevia.totalesGenerales?.total,
        estado: "borrador",
        obras: primerVale?.obras,
        sindicatos: sindicatoData,
        empresas: primerVale?.obras?.empresas,
      };

      console.log("[Preview PDF] mockConciliacion:", mockConciliacion);

      setConciliacionGenerada(mockConciliacion);
      setDatosParaPDF({
        valesAgrupados: vistaPrevia.valesAgrupados,
        totalesGenerales: vistaPrevia.totalesGenerales,
      });
      setMostrarModalConciliacion(true);
    } catch (error) {
      console.error("[Preview PDF] Error:", error);
      setMensaje({ tipo: "error", texto: `Error al generar vista previa: ${error.message}` });
    } finally {
      setPrevisualizando(false);
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
          <span>Renta</span>
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
          materiales={hookActivo.materiales}
          sindicatos={hookActivo.sindicatos}
          filtros={hookActivo.filtros}
          onFiltrosChange={hookActivo.updateFiltros}
          onCargarVistaPrevia={hookActivo.cargarVistaPrevia}
          loadingCatalogos={hookActivo.loadingCatalogos}
          disabled={false}
          tipoActivo={tabActivo}
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
              {Object.keys(hookActivo.vistaPrevia.valesAgrupados || {}).length > 0 &&
                !conciliacionGenerada && (
                  <>
                    {esAdmin && (
                      <button
                        onClick={handlePrevisualizarPDF}
                        disabled={previsualizando || generando}
                        className="btn btn--secondary"
                        title="Genera el PDF sin guardar la conciliación"
                      >
                        {previsualizando ? "Generando..." : "Previsualizar PDF"}
                      </button>
                    )}
                    <button
                      onClick={handleGenerar}
                      disabled={generando || previsualizando}
                      className="btn btn--primary btn--generar-conciliacion"
                      style={{ backgroundColor: colors.accent }}
                    >
                      {generando ? "Generando..." : "Generar Conciliación"}
                    </button>
                  </>
                )}
            </div>
          </>
        )}
      </div>

      {/* Modal de advertencia semana actual */}
      {mostrarModalSemanaActual && (
        <div
          className="modal-overlay"
          onClick={() => setMostrarModalSemanaActual(false)}
        >
          <div
            className="modal-content modal-content--warning"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>⚠️ Advertencia: Semana en Curso</h3>
            </div>

            <div className="modal-body">
              <p>
                Estás generando una conciliación para la{" "}
                <strong>semana actual</strong>.
              </p>
              <p>
                Si la semana aún no ha terminado, podrían aparecer más vales que
                no estarán incluidos en esta conciliación.
              </p>
              <p className="modal-question">
                ¿Deseas continuar de todas formas?
              </p>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setMostrarModalSemanaActual(false)}
                className="btn btn--secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setMostrarModalSemanaActual(false);
                  ejecutarGeneracion();
                }}
                className="btn btn--primary"
                style={{ backgroundColor: colors.accent }}
              >
                Sí, generar conciliación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de conciliación generada */}
      {mostrarModalConciliacion && conciliacionGenerada && (
        <ModalConciliacionGenerada
          isOpen={mostrarModalConciliacion}
          onClose={() => {
            setMostrarModalConciliacion(false);
            setConciliacionGenerada(null);
            setDatosParaPDF({ valesAgrupados: null, totalesGenerales: null });
          }}
          conciliacion={conciliacionGenerada}
          valesAgrupados={datosParaPDF.valesAgrupados}
          totales={datosParaPDF.totalesGenerales}
          tipoConciliacion={tabActivo}
        />
      )}
    </div>
  );
};

export default Conciliaciones;
