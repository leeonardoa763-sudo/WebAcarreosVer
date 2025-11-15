/**
 * src/components/verificacion/BatchUpload.jsx
 *
 * Componente para subida masiva de PDFs
 */

// 1. React y hooks
import { useState, useRef } from "react";

// 2. Icons
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";

// 3. Config
import { colors } from "../../config/colors";

const BatchUpload = ({ onBatchProcess, disabled = false }) => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFilesSelection(droppedFiles);
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFilesSelection(selectedFiles);
  };

  const handleFilesSelection = (selectedFiles) => {
    const pdfFiles = selectedFiles.filter(
      (file) => file.type === "application/pdf"
    );

    if (pdfFiles.length === 0) {
      alert("Solo se permiten archivos PDF");
      return;
    }

    if (pdfFiles.length > 50) {
      alert("Máximo 50 archivos a la vez");
      return;
    }

    const validFiles = pdfFiles.filter((file) => file.size <= 5 * 1024 * 1024);

    if (validFiles.length !== pdfFiles.length) {
      alert(
        `${pdfFiles.length - validFiles.length} archivo(s) exceden 5MB y fueron omitidos`
      );
    }

    setFiles(validFiles);
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleProcess = () => {
    if (files.length > 0) {
      onBatchProcess(files);
    }
  };

  return (
    <div className="batch-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        onChange={handleFileInput}
        style={{ display: "none" }}
        disabled={disabled}
      />

      {files.length === 0 ? (
        <div
          className={`batch-upload__droparea ${isDragging ? "batch-upload__droparea--dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Upload size={48} className="batch-upload__icon" />
          <h3 className="batch-upload__title">Verificación Masiva</h3>
          <p className="batch-upload__subtitle">Arrastra múltiples PDFs aquí</p>
          <p className="batch-upload__info">
            Hasta 50 PDFs • Máximo 5MB cada uno
          </p>
        </div>
      ) : (
        <div className="batch-upload__files">
          <div className="batch-upload__header">
            <h4>
              {files.length} archivo{files.length !== 1 ? "s" : ""} seleccionado
              {files.length !== 1 ? "s" : ""}
            </h4>
            <button
              onClick={handleClearAll}
              className="batch-upload__clear-all"
            >
              <X size={16} />
              Limpiar todo
            </button>
          </div>

          <div className="batch-upload__list">
            {files.map((file, index) => (
              <div key={index} className="batch-upload__file-item">
                <FileText size={20} style={{ color: colors.primary }} />
                <div className="batch-upload__file-info">
                  <p className="batch-upload__file-name">{file.name}</p>
                  <p className="batch-upload__file-size">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="batch-upload__remove"
                  disabled={disabled}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleProcess}
            disabled={disabled || files.length === 0}
            className="batch-upload__process-btn"
            style={{ backgroundColor: colors.accent }}
          >
            Procesar {files.length} Vale{files.length !== 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );
};

export default BatchUpload;
