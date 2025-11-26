/**
 * src/components/conciliaciones/BotonGenerarPDF.jsx
 */

import { useState } from "react";
import { FileText } from "lucide-react";
import { generarPDFConciliacionRenta } from "../../utils/conciliaciones/generarPDFConciliacionRenta";

const BotonGenerarPDF = ({
  conciliacion,
  valesAgrupados,
  totales,
  disabled,
}) => {
  const [generando, setGenerando] = useState(false);

  const handleGenerar = () => {
    // ⬇️ AGREGAR ESTOS CONSOLE.LOGS
    console.log("=== DEBUG BOTON PDF ===");
    console.log("1. conciliacion:", conciliacion);
    console.log("2. valesAgrupados:", valesAgrupados);
    console.log("3. totales:", totales);
    console.log("======================");
    // ⬆️ FIN CONSOLE.LOGS

    try {
      setGenerando(true);
      generarPDFConciliacionRenta(conciliacion, valesAgrupados, totales);
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
