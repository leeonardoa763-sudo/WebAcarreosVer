/**
 * src/components/vales/ValeFilters.jsx
 *
 * Componente de filtros avanzados para vales
 *
 * Funcionalidades:
 * - Filtro por obra
 * - Filtro por material
 * - Filtro por sindicato (solo ADMINISTRADOR)
 * - Filtro por estado
 * - Filtro por rango de fechas
 * - Aplicar y limpiar filtros
 * - Accesibilidad completa con labels y ARIA
 *
 * Usado en: Vales.jsx
 */

// 1. React y hooks
import { useState, useEffect } from "react";

// 2. Icons
import { Building2, AlertCircle, Calendar, Package, Users } from "lucide-react";

// 3. Hooks personalizados
import { useAuth } from "../../hooks/useAuth";
import { useVales } from "../../hooks/useVales";

// 4. Utils
import { formatearFechaInput } from "../../utils/formatters";

// 5. Config
import { colors } from "../../config/colors";

const ValeFilters = ({ filters, updateFilters, onClose }) => {
  const { userProfile } = useAuth();
  const { obras, materiales, sindicatos, loadingCatalogos } = useVales();

  // Estados locales para formulario
  const [localFilters, setLocalFilters] = useState({
    id_obra: filters.id_obra || "",
    id_material: filters.id_material || "",
    id_sindicato: filters.id_sindicato || "",
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
    // Validar rango de fechas
    if (localFilters.fecha_inicio && localFilters.fecha_fin) {
      const inicio = new Date(localFilters.fecha_inicio);
      const fin = new Date(localFilters.fecha_fin);

      if (inicio > fin) {
        alert("La fecha de inicio no puede ser posterior a la fecha fin");
        return;
      }
    }

    // Convertir valores vacíos a null
    const filtersToApply = {
      id_obra: localFilters.id_obra ? parseInt(localFilters.id_obra) : null,
      id_material: localFilters.id_material
        ? parseInt(localFilters.id_material)
        : null,
      id_sindicato: localFilters.id_sindicato
        ? parseInt(localFilters.id_sindicato)
        : null,
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
      id_material: "",
      id_sindicato: "",
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
      id_material: filters.id_material || "",
      id_sindicato: filters.id_sindicato || "",
      estado: filters.estado || "",
      fecha_inicio: filters.fecha_inicio
        ? formatearFechaInput(filters.fecha_inicio)
        : "",
      fecha_fin: filters.fecha_fin
        ? formatearFechaInput(filters.fecha_fin)
        : "",
    });
  }, [
    filters.id_obra,
    filters.id_material,
    filters.id_sindicato,
    filters.estado,
    filters.fecha_inicio,
    filters.fecha_fin,
  ]);

  return (
    <div className="vale-filters">
      <div className="vale-filters__header">
        <h3 className="vale-filters__title">Filtros Avanzados</h3>
      </div>

      <div className="vale-filters__body">
        {/* Filtro por Obra */}
        <div className="vale-filters__field">
          <label htmlFor="filter-obra" className="vale-filters__label">
            <Building2 size={16} aria-hidden="true" />
            <span>Obra</span>
          </label>
          <select
            id="filter-obra"
            value={localFilters.id_obra}
            onChange={(e) => handleInputChange("id_obra", e.target.value)}
            className="vale-filters__select"
            disabled={loadingCatalogos}
            aria-label="Seleccionar obra para filtrar"
          >
            <option value="">Todas las obras</option>
            {obras.map((obra) => (
              <option key={obra.id_obra} value={obra.id_obra}>
                {obra.obra} - {obra.empresas?.sufijo}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Material */}
        <div className="vale-filters__field">
          <label htmlFor="filter-material" className="vale-filters__label">
            <Package size={16} aria-hidden="true" />
            <span>Material</span>
          </label>
          <select
            id="filter-material"
            value={localFilters.id_material}
            onChange={(e) => handleInputChange("id_material", e.target.value)}
            className="vale-filters__select"
            disabled={loadingCatalogos}
            aria-label="Seleccionar material para filtrar"
          >
            <option value="">Todos los materiales</option>
            {materiales.map((material) => (
              <option key={material.id_material} value={material.id_material}>
                {material.material}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Sindicato - Solo para ADMINISTRADOR */}
        {userProfile?.roles?.role === "Administrador" && (
          <div className="vale-filters__field">
            <label htmlFor="filter-sindicato" className="vale-filters__label">
              <Users size={16} aria-hidden="true" />
              <span>Sindicato</span>
            </label>
            <select
              id="filter-sindicato"
              value={localFilters.id_sindicato}
              onChange={(e) =>
                handleInputChange("id_sindicato", e.target.value)
              }
              className="vale-filters__select"
              disabled={loadingCatalogos}
              aria-label="Seleccionar sindicato para filtrar"
            >
              <option value="">Todos los sindicatos</option>
              {sindicatos.map((sindicato) => (
                <option
                  key={sindicato.id_sindicato}
                  value={sindicato.id_sindicato}
                >
                  {sindicato.sindicato}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filtro por Estado */}
        <div className="vale-filters__field">
          <label htmlFor="filter-estado" className="vale-filters__label">
            <AlertCircle size={16} aria-hidden="true" />
            <span>Estado</span>
          </label>
          <select
            id="filter-estado"
            value={localFilters.estado}
            onChange={(e) => handleInputChange("estado", e.target.value)}
            className="vale-filters__select"
            aria-label="Seleccionar estado del vale para filtrar"
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
          <label htmlFor="filter-fecha-inicio" className="vale-filters__label">
            <Calendar size={16} aria-hidden="true" />
            <span>Fecha Inicio</span>
          </label>
          <input
            id="filter-fecha-inicio"
            type="date"
            value={localFilters.fecha_inicio}
            onChange={(e) => handleInputChange("fecha_inicio", e.target.value)}
            className="vale-filters__input"
            aria-label="Seleccionar fecha de inicio para filtrar"
            aria-describedby="fecha-inicio-help"
          />
          <span id="fecha-inicio-help" className="sr-only">
            Fecha desde la cual buscar vales
          </span>
        </div>

        <div className="vale-filters__field">
          <label htmlFor="filter-fecha-fin" className="vale-filters__label">
            <Calendar size={16} aria-hidden="true" />
            <span>Fecha Fin</span>
          </label>
          <input
            id="filter-fecha-fin"
            type="date"
            value={localFilters.fecha_fin}
            onChange={(e) => handleInputChange("fecha_fin", e.target.value)}
            className="vale-filters__input"
            min={localFilters.fecha_inicio}
            aria-label="Seleccionar fecha fin para filtrar"
            aria-describedby="fecha-fin-help"
          />
          <span id="fecha-fin-help" className="sr-only">
            Fecha hasta la cual buscar vales. Debe ser posterior a la fecha de
            inicio
          </span>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="vale-filters__actions">
        <button
          onClick={handleClearLocal}
          className="vale-filters__button vale-filters__button--secondary"
          type="button"
          aria-label="Limpiar todos los filtros"
        >
          Limpiar
        </button>
        <button
          onClick={handleApplyFilters}
          className="vale-filters__button vale-filters__button--primary"
          style={{ backgroundColor: colors.primary }}
          type="button"
          aria-label="Aplicar los filtros seleccionados"
        >
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
};

export default ValeFilters;
