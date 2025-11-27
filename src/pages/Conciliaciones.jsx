/**
 * src/pages/Conciliaciones.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Hooks personalizados
import { useConciliaciones } from "../hooks/useConciliaciones";

// 3. Config
import { supabase } from "../config/supabase";

// 4. Componentes
import FiltrosConciliacion from "../components/conciliaciones/FiltrosConciliacion";
import TablaConciliacionRenta from "../components/conciliaciones/TablaConciliacionRenta";
import ResumenTotales from "../components/conciliaciones/ResumenTotales";
import BotonGenerarPDF from "../components/conciliaciones/BotonGenerarPDF";

// 5. Estilos
import "../styles/conciliaciones.css";

const Conciliaciones = () => {
  const {
    semanas,
    obras,
    sindicatos, // ← NUEVO: Desestructurar sindicatos
    loadingCatalogos,
    filtros,
    updateFiltros,
    clearFiltros,
    vistaPrevia,
    cargarVistaPrevia,
    generarConciliacion,
  } = useConciliaciones();

  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: null, texto: "" });
  const [conciliacionGenerada, setConciliacionGenerada] = useState(null);
  const [datosParaPDF, setDatosParaPDF] = useState(null);

  const handleGenerar = async () => {
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
      setGenerando(true);
      setMensaje({ tipo: null, texto: "" });

      // Guardar los datos ANTES de que se limpien
      const datosGuardados = {
        valesAgrupados: vistaPrevia.valesAgrupados,
        totalesGenerales: vistaPrevia.totalesGenerales,
      };

      const resultado = await generarConciliacion();

      if (resultado.success) {
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
        <h1>Conciliaciones de Renta</h1>
        <p className="conciliaciones-page__subtitle">
          Genera conciliaciones agrupando vales verificados por semana y obra
        </p>
      </div>

      {mensaje.tipo && (
        <div
          className={`conciliaciones-message conciliaciones-message--${mensaje.tipo}`}
        >
          {mensaje.texto}
        </div>
      )}

      <FiltrosConciliacion
        semanas={semanas}
        obras={obras}
        sindicatos={sindicatos} // ← NUEVO: Pasar sindicatos como prop
        filtros={filtros}
        onFiltrosChange={updateFiltros}
        onCargarVistaPrevia={cargarVistaPrevia}
        onLimpiar={clearFiltros}
        loading={loadingCatalogos}
        vistaPreviaLoading={vistaPrevia.loading}
      />

      {vistaPrevia.error && (
        <div className="conciliaciones-message conciliaciones-message--error">
          {vistaPrevia.error}
        </div>
      )}

      {vistaPrevia.valesAgrupados && (
        <>
          <TablaConciliacionRenta valesAgrupados={vistaPrevia.valesAgrupados} />

          <ResumenTotales
            totales={vistaPrevia.totalesGenerales}
            loading={vistaPrevia.loading}
          />

          <div className="conciliaciones-actions">
            {!conciliacionGenerada ? (
              Object.keys(vistaPrevia.valesAgrupados || {}).length > 0 && (
                <button
                  onClick={handleGenerar}
                  disabled={generando}
                  className="btn btn--primary btn--generar-conciliacion"
                  style={{ backgroundColor: "#1a936f" }}
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
  );
};

export default Conciliaciones;
