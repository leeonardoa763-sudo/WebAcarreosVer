/**
 * src/components/vales/ValeFilters.jsx
 *
 * Componente de filtros avanzados para vales
 *
 * Funcionalidades:
 * - Filtro por obra
 * - Filtro por tipo de vale (material/renta)
 * - Filtro por estado
 * - Filtro por rango de fechas
 * - Aplicar y limpiar filtros
 *
 * Usado en: Vales.jsx
 */

// 1. React y hooks
import { useState, useEffect } from "react";

// 2. Icons
import { Building2, FileType, AlertCircle, Calendar } from "lucide-react";

// 3. Hooks personalizados
import { useVales } from "../../hooks/useVales";

// 4. Utils
import { formatearFechaInput } from "../../utils/formatters";

// 5. Config
import { colors } from "../../config/colors";

const ValeFilters = ({ filters, updateFilters, onClose }) => {
  const { obras, loadingCatalogos } = useVales();

  // Estados locales para formulario
  const [localFilters, setLocalFilters] = useState({
    id_obra: filters.id_obra || "",
    tipo_vale: filters.tipo_vale || "",
    estado: filters.estado || "",
    fecha_inicio: filters.fecha_inicio
      ? formatearFechaInput(filters.fecha_inicio)
      : "",
    fecha_fin: filters.fecha_fin ? formatearFechaInput(filters.fecha_fin) : "",
  });

  // Estados de vale disponibles
  const estados = [
    { value: "borrador", label: "Borrador" },
    { value: "en_proceso", label: "En Proceso" },
    { value: "emitido", label: "Emitido" },
    { value: "verificado", label: "Verificado" },
    { value: "pagado", label: "Pagado" },
  ];

  // Tipos de vale
  const tipos = [
    { value: "material", label: "Material" },
    { value: "renta", label: "Renta" },
  ];

  /**
   * Manejar cambio en input
   */
  const handleInputChange = (field, value) => {
    setLocalFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Aplicar filtros
   */
  const handleApplyFilters = () => {
    // Convertir valores vacíos a null
    const filtersToApply = {
      id_obra: localFilters.id_obra ? parseInt(localFilters.id_obra) : null,
      tipo_vale: localFilters.tipo_vale || null,
      estado: localFilters.estado || null,
      fecha_inicio: localFilters.fecha_inicio || null,
      fecha_fin: localFilters.fecha_fin || null,
    };

    updateFilters(filtersToApply);
    onClose();
  };

  /**
   * Limpiar filtros locales
   */
  const handleClearLocal = () => {
    setLocalFilters({
      id_obra: "",
      tipo_vale: "",
      estado: "",
      fecha_inicio: "",
      fecha_fin: "",
    });
  };

  /**
   * Sincronizar con filtros externos si cambian
   */
  useEffect(() => {
    setLocalFilters({
      id_obra: filters.id_obra || "",
      tipo_vale: filters.tipo_vale || "",
      estado: filters.estado || "",
      fecha_inicio: filters.fecha_inicio
        ? formatearFechaInput(filters.fecha_inicio)
        : "",
      fecha_fin: filters.fecha_fin
        ? formatearFechaInput(filters.fecha_fin)
        : "",
    });
  }, [filters]);

  return (
    <div className="vale-filters">
      <div className="vale-filters__header">
        <h3 className="vale-filters__title">Filtros Avanzados</h3>
      </div>

      <div className="vale-filters__body">
        {/* Filtro por Obra */}
        <div className="vale-filters__field">
          <label className="vale-filters__label">
            <Building2 size={16} />
            <span>Obra</span>
          </label>
          <select
            value={localFilters.id_obra}
            onChange={(e) => handleInputChange("id_obra", e.target.value)}
            className="vale-filters__select"
            disabled={loadingCatalogos}
          >
            <option value="">Todas las obras</option>
            {obras.map((obra) => (
              <option key={obra.id_obra} value={obra.id_obra}>
                {obra.obra} - {obra.empresas?.sufijo}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Tipo de Vale */}
        <div className="vale-filters__field">
          <label className="vale-filters__label">
            <FileType size={16} />
            <span>Tipo de Vale</span>
          </label>
          <select
            value={localFilters.tipo_vale}
            onChange={(e) => handleInputChange("tipo_vale", e.target.value)}
            className="vale-filters__select"
          >
            <option value="">Todos los tipos</option>
            {tipos.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Estado */}
        <div className="vale-filters__field">
          <label className="vale-filters__label">
            <AlertCircle size={16} />
            <span>Estado</span>
          </label>
          <select
            value={localFilters.estado}
            onChange={(e) => handleInputChange("estado", e.target.value)}
            className="vale-filters__select"
          >
            <option value="">Todos los estados</option>
            {estados.map((estado) => (
              <option key={estado.value} value={estado.value}>
                {estado.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Rango de Fechas */}
        <div className="vale-filters__field">
          <label className="vale-filters__label">
            <Calendar size={16} />
            <span>Fecha Inicio</span>
          </label>
          <input
            type="date"
            value={localFilters.fecha_inicio}
            onChange={(e) => handleInputChange("fecha_inicio", e.target.value)}
            className="vale-filters__input"
          />
        </div>

        <div className="vale-filters__field">
          <label className="vale-filters__label">
            <Calendar size={16} />
            <span>Fecha Fin</span>
          </label>
          <input
            type="date"
            value={localFilters.fecha_fin}
            onChange={(e) => handleInputChange("fecha_fin", e.target.value)}
            className="vale-filters__input"
            min={localFilters.fecha_inicio}
          />
        </div>
      </div>

      {/* Botones de acción */}
      <div className="vale-filters__actions">
        <button
          onClick={handleClearLocal}
          className="vale-filters__button vale-filters__button--secondary"
        >
          Limpiar
        </button>
        <button
          onClick={handleApplyFilters}
          className="vale-filters__button vale-filters__button--primary"
          style={{ backgroundColor: colors.primary }}
        >
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
};

export default ValeFilters;
