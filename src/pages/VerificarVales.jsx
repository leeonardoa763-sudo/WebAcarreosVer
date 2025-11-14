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
  } = useVerificacion();

  const [step, setStep] = useState("upload"); // upload, extracting, preview, verifying, success
  const [successMessage, setSuccessMessage] = useState(null);

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

  const handleCancel = () => {
    clearStates();
    setStep("upload");
    setSuccessMessage(null);
  };

  useEffect(() => {
    if (userProfile) {
      fetchValesVerificados();
    }
  }, [userProfile?.id_persona]); // Solo cuando cambie el ID del usuario

  return (
    <div className="verificar-vales">
      <div className="verificar-vales__header">
        <div className="verificar-vales__title-section">
          <FileCheck size={32} />
          <div>
            <h1 className="verificar-vales__title">Verificar Vales</h1>
            <p className="verificar-vales__subtitle">
              Sube el PDF del vale para verificarlo en el sistema
            </p>
          </div>
        </div>
      </div>

      <div className="verificar-vales__content">
        <div className="verificar-vales__main">
          {step === "upload" && (
            <UploadZone onFileSelect={handleFileSelect} disabled={processing} />
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
                Como administrador, puedes verificar vales de cualquier
                sindicato
              </p>
            </div>
          )}
        </div>

        <div className="verificar-vales__sidebar">
          <ValesVerificadosList
            vales={valesVerificados}
            loading={loadingVerificados}
          />
        </div>
      </div>
    </div>
  );
};

export default VerificarVales;
