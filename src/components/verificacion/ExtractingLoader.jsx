/**
 * src/components/verificacion/ExtractingLoader.jsx
 *
 * Componente de loading durante extracción de folio
 *
 * Usado en: VerificarVales.jsx
 */

// 1. Icons
import { Loader2, FileSearch, QrCode, CheckCircle } from "lucide-react";

const ExtractingLoader = ({ step = "uploading" }) => {
  const steps = {
    uploading: {
      icon: Loader2,
      text: "Cargando PDF...",
      progress: 25,
    },
    extracting: {
      icon: FileSearch,
      text: "Extrayendo información...",
      progress: 50,
    },
    qr: {
      icon: QrCode,
      text: "Decodificando QR...",
      progress: 75,
    },
    validating: {
      icon: CheckCircle,
      text: "Validando vale...",
      progress: 90,
    },
  };

  const currentStep = steps[step] || steps.uploading;
  const Icon = currentStep.icon;

  return (
    <div className="extracting-loader">
      <div className="extracting-loader__icon">
        <Icon size={40} className="extracting-loader__spinner" />
      </div>

      <p className="extracting-loader__text">{currentStep.text}</p>

      <div className="extracting-loader__progress-bar">
        <div
          className="extracting-loader__progress-fill"
          style={{ width: `${currentStep.progress}%` }}
        />
      </div>
    </div>
  );
};

export default ExtractingLoader;
