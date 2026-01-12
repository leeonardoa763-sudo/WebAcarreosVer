/**
 * src/pages/VerificarVales.jsx
 *
 * Página principal de verificación de vales por PDF
 *
 * Funcionalidades:
 * - Subir PDF individual
 * - Extraer folio automáticamente (QR o OCR)
 * - Buscar y mostrar preview del vale
 * - Confirmar verificación
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
import UploadZone from "../components/verificacion/UploadZone";
import ExtractingLoader from "../components/verificacion/ExtractingLoader";
import ValePreview from "../components/verificacion/ValePreview";
import VerificationConfirm from "../components/verificacion/VerificationConfirm";
import ValesVerificadosList from "../components/verificacion/ValesVerificadosList";
import BatchUpload from "../components/verificacion/BatchUpload";
import BatchResults from "../components/verificacion/BatchResults";

// 5. Estilos
import "../styles/verificacion.css";

const VerificarVales = () => {
  const { userProfile, hasRole } = useAuth();
  const {
    processing,
    currentVale,
    extractedFolio,
    error,
    valesVerificados,
    loadingVerificados,
    processPDF,
    buscarValePorFolio,
    verificarVale,
    fetchValesVerificados,
    clearStates,
    processBatch,
    verificarBatch,
  } = useVerificacion();

  const [step, setStep] = useState("upload"); // upload, extracting, preview, verifying, success
  const [successMessage, setSuccessMessage] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  // Inicializado en true para mostrar solo opción masiva
  const [showBatchUpload, setShowBatchUpload] = useState(true);

  const handleFileSelect = async (file) => {
    setStep("extracting");
    setSuccessMessage(null);

    const result = await processPDF(file);

    if (result.success) {
      const searchResult = await buscarValePorFolio(result.folio);

      if (searchResult.success) {
        setStep("preview");
      } else {
        setStep("upload");
      }
    } else {
      setStep("upload");
    }
  };

  const handleVerify = async () => {
    if (!currentVale) return;

    setStep("verifying");

    const result = await verificarVale(currentVale.id_vale);

    if (result.success) {
      setSuccessMessage(`Vale ${extractedFolio} verificado correctamente`);
      setStep("success");

      setTimeout(() => {
        clearStates();
        setStep("upload");
        setSuccessMessage(null);
      }, 3000);
    } else {
      setStep("preview");
    }
  };

  //  funciones de manejo
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
        setShowBatchUpload(false);
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
    setShowBatchUpload(false);
    setStep("upload");
  };

  const handleCancel = () => {
    clearStates();
    setStep("upload");
    setSuccessMessage(null);
  };

  useEffect(() => {
    if (userProfile?.id_persona) {
      fetchValesVerificados();
    }
  }, [userProfile?.id_persona]);

  return (
    <div className="verificar-vales__main">
      {/* TOGGLE COMENTADO - Solo mostrar masivo por ahora */}
      {/* {step === "upload" && (
  <div className="verificar-vales__mode-toggle">
    <button
      onClick={() => setShowBatchUpload(false)}
      className={`verificar-vales__mode-btn ${!showBatchUpload ? "verificar-vales__mode-btn--active" : ""}`}
    >
      Individual
    </button>
    <button
      onClick={() => setShowBatchUpload(true)}
      className={`verificar-vales__mode-btn ${showBatchUpload ? "verificar-vales__mode-btn--active" : ""}`}
    >
      Masivo
    </button>
  </div>
)} */}

      {step === "upload" && !showBatchUpload && (
        <UploadZone onFileSelect={handleFileSelect} disabled={processing} />
      )}

      {step === "upload" && showBatchUpload && (
        <BatchUpload
          onBatchProcess={handleBatchProcess}
          disabled={processing}
        />
      )}

      {step === "extracting" && <ExtractingLoader step="extracting" />}

      {step === "preview" && currentVale && (
        <div className="verificar-vales__preview-section">
          <ValePreview vale={currentVale} />

          <div className="verificar-vales__actions">
            <button
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={processing}
            >
              Cancelar
            </button>

            <VerificationConfirm
              onConfirm={handleVerify}
              disabled={processing}
              loading={step === "verifying"}
            />
          </div>
        </div>
      )}

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
          {step === "preview" && (
            <button onClick={handleCancel} className="btn btn-secondary">
              Intentar de Nuevo
            </button>
          )}
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
