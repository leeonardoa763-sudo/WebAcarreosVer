/**
 * src/components/conciliaciones/BotonGenerarPDF.jsx
 *
 * Botón para generar PDFs de conciliaciones
 *
 * Funcionalidades:
 * - Detecta tipo de material automáticamente
 * - Llama al generador correcto según tipo
 * - Recarga página después de descargar
 *
 * Usado en: Conciliaciones.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import { FileText } from "lucide-react";

// 3. Utils
import { generarPDFConciliacionRenta } from "../../utils/conciliaciones/renta/generarPDFConciliacionRenta.jsx";
import { generarPDFConciliacionMaterialPetreo } from "../../utils/conciliaciones/material-petreo/generarPDFConciliacionMaterialPetreo";
import { generarPDFConciliacionMaterialCorte } from "../../utils/conciliaciones/material-corte/generarPDFConciliacionMaterialCorte";

const BotonGenerarPDF = ({
  conciliacion,
  valesAgrupados,
  totales,
  tipoConciliacion,
  customIcon,
  customText,
  customClassName,
  onPdfGenerado,
}) => {
  const [generando, setGenerando] = useState(false);

  /**
   * Detectar tipo de material predominante
   */
  const detectarTipoMaterial = () => {
    let conteoTipo1o2 = 0;
    let conteoTipo3 = 0;

    Object.values(valesAgrupados).forEach((grupo) => {
      grupo.vales.forEach((vale) => {
        vale.vale_material_detalles?.forEach((detalle) => {
          const idTipo =
            detalle.material?.tipo_de_material?.id_tipo_de_material;
          if (idTipo === 1 || idTipo === 2) conteoTipo1o2++;
          if (idTipo === 3) conteoTipo3++;
        });
      });
    });

    return conteoTipo1o2 > conteoTipo3 ? "petreo" : "corte";
  };

  const handleGenerar = async () => {
    try {
      setGenerando(true);

      if (tipoConciliacion === "material") {
        const tipoMaterial = detectarTipoMaterial();

        if (tipoMaterial === "petreo") {
          await generarPDFConciliacionMaterialPetreo(
            conciliacion,
            valesAgrupados,
            totales
          );
        } else {
          await generarPDFConciliacionMaterialCorte(
            conciliacion,
            valesAgrupados,
            totales
          );
        }
      } else {
        await generarPDFConciliacionRenta(
          conciliacion,
          valesAgrupados,
          totales
        );
      }

      // Llamar callback si existe
      if (onPdfGenerado) {
        onPdfGenerado();
      }

      // Recargar página después de generar PDF (solo si NO hay callback)
      if (!onPdfGenerado) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Error al generar PDF");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <button
      onClick={handleGenerar}
      disabled={generando}
      className={customClassName || "btn btn--secondary"}
      style={
        customClassName
          ? undefined
          : { display: "flex", alignItems: "center", gap: "8px" }
      }
    >
      {customIcon || <FileText size={18} />}
      {generando ? "Generando PDF..." : customText || "Descargar PDF"}
    </button>
  );
};

export default BotonGenerarPDF;
