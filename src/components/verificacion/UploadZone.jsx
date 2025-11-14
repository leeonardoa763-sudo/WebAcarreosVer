/**
 * src/components/verificacion/UploadZone.jsx
 *
 * Zona de subida de archivos PDF con drag and drop
 *
 * Usado en: VerificarVales.jsx
 */

// 1. React y hooks
import { useState, useRef } from "react";

// 2. Icons
import { Upload, FileText, X } from "lucide-react";

// 3. Config
import { colors } from "../../config/colors";

const UploadZone = ({ onFileSelect, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file) => {
    if (file.type !== "application/pdf") {
      alert("Solo se permiten archivos PDF");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo es muy grande. Máximo 5MB");
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="upload-zone">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileInput}
        style={{ display: "none" }}
        disabled={disabled}
      />

      {!selectedFile ? (
        <div
          className={`upload-zone__droparea ${isDragging ? "upload-zone__droparea--dragging" : ""} ${disabled ? "upload-zone__droparea--disabled" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <Upload size={48} className="upload-zone__icon" />
          <h3 className="upload-zone__title">Arrastra el PDF aquí</h3>
          <p className="upload-zone__subtitle">o haz clic para seleccionar</p>
          <p className="upload-zone__info">PDF • Máximo 5MB</p>
        </div>
      ) : (
        <div className="upload-zone__selected">
          <FileText size={24} style={{ color: colors.primary }} />
          <div className="upload-zone__file-info">
            <p className="upload-zone__file-name">{selectedFile.name}</p>
            <p className="upload-zone__file-size">
              {(selectedFile.size / 1024).toFixed(2)} KB
            </p>
          </div>
          <button
            onClick={handleClear}
            className="upload-zone__clear"
            disabled={disabled}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
