/**
 * src/components/conciliaciones/BotonGenerarPDF.jsx
 */

import { useState } from "react";
import { FileText } from "lucide-react";
import { generarPDFConciliacionRenta } from "../../utils/conciliaciones/generarPDFConciliacionRenta";
import { generarPDFConciliacionMaterial } from "../../utils/conciliaciones/generarPDFConciliacionMaterial"; // 👈 AGREGAR

const BotonGenerarPDF = ({
  conciliacion,
  valesAgrupados,
  totales,
  disabled,
  tipoConciliacion,
}) => {
  const [generando, setGenerando] = useState(false);

  const handleGenerar = () => {
    try {
      setGenerando(true);

      if (tipoConciliacion === "material") {
        generarPDFConciliacionMaterial(conciliacion, valesAgrupados, totales); // 👈 CAMBIAR
      } else {
        generarPDFConciliacionRenta(conciliacion, valesAgrupados, totales);
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
      disabled={disabled || generando}
      className="btn btn--secondary"
    >
      <FileText size={18} />
      {generando ? "Generando PDF..." : "Descargar PDF"}
    </button>
  );
};

export default BotonGenerarPDF;
