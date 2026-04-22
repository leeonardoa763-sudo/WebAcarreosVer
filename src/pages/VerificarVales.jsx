/**
 * src/pages/VerificarVales.jsx
 *
 * Página principal de verificación masiva de vales por PDF
 *
 * Funcionalidades:
 * - Subir múltiples PDFs en lote
 * - Extraer folios automáticamente (QR o OCR)
 * - Mostrar resultados del lote y confirmar verificación masiva
 * - Ver historial de verificados
 *
 * Acceso: Solo SINDICATO y ADMINISTRADOR
 */

// 1. React y hooks
import { useState, useEffect } from "react";

// 2. Icons
import { FileCheck, AlertCircle } from "lucide-react";

// 3. Hooks personalizados
import { useAuth } from "../hooks/useAuth";
import { useVerificacion } from "../hooks/useVerificacion";

// 4. Componentes
import ExtractingLoader from "../components/verificacion/ExtractingLoader";
import BatchUpload from "../components/verificacion/BatchUpload";
import BatchResults from "../components/verificacion/BatchResults";

// 5. Estilos
import "../styles/verificacion.css";

const VerificarVales = () => {
  const { userProfile, hasRole } = useAuth();
  const {
    processing,
    error,
    valesVerificados,
    loadingVerificados,
    fetchValesVerificados,
    clearStates,
    processBatch,
    verificarBatch,
  } = useVerificacion();

  const [step, setStep] = useState("upload"); // upload, extracting, batch-results, verifying, success
  const [successMessage, setSuccessMessage] = useState(null);
  const [batchResults, setBatchResults] = useState(null);

  const handleBatchProcess = async (files) => {
    setStep("extracting");
    setSuccessMessage(null);

    const results = await processBatch(files);
    setBatchResults(results);
    setStep("batch-results");
  };

  const handleBatchVerify = async (valesParaVerificar) => {
    setStep("verifying");

    const results = await verificarBatch(valesParaVerificar);

    await fetchValesVerificados();

    const totalVerified = results.verified.length;
    const totalErrors = results.errors.length;

    if (totalVerified > 0) {
      setSuccessMessage(
        `${totalVerified} vale${totalVerified !== 1 ? "s" : ""} verificado${
          totalVerified !== 1 ? "s" : ""
        } correctamente${totalErrors > 0 ? `. ${totalErrors} con errores` : ""}`
      );
      setStep("success");

      setTimeout(() => {
        clearStates();
        setBatchResults(null);
        setStep("upload");
        setSuccessMessage(null);
      }, 4000);
    } else {
      setStep("batch-results");
    }
  };

  const handleCancelBatch = () => {
    clearStates();
    setBatchResults(null);
    setStep("upload");
  };

  useEffect(() => {
    if (userProfile?.id_persona) {
      fetchValesVerificados();
    }
  }, [userProfile?.id_persona]);

  return (
    <div className="verificar-vales__main">
      {step === "upload" && (
        <BatchUpload
          onBatchProcess={handleBatchProcess}
          disabled={processing}
        />
      )}

      {step === "extracting" && <ExtractingLoader step="extracting" />}

      {step === "batch-results" && batchResults && (
        <BatchResults
          results={batchResults}
          onConfirmVerification={handleBatchVerify}
          onCancel={handleCancelBatch}
          processing={processing}
        />
      )}

      {step === "verifying" && <ExtractingLoader step="validating" />}

      {step === "success" && successMessage && (
        <div className="verificar-vales__success">
          <FileCheck size={64} />
          <h3>{successMessage}</h3>
          <p>Redirigiendo...</p>
        </div>
      )}

      {error && (
        <div className="verificar-vales__error">
          <AlertCircle size={24} />
          <p>{error}</p>
        </div>
      )}

      {hasRole("Administrador") && step === "upload" && (
        <div className="verificar-vales__admin-note">
          <AlertCircle size={16} />
          <p>
            Como administrador, puedes verificar vales de cualquier sindicato
          </p>
        </div>
      )}
    </div>
  );
};

export default VerificarVales;
