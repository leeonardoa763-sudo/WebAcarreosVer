/**
 * src/components/conciliaciones/FiltrosConciliacion.jsx
 *
 * Componente de filtros para generar conciliaciones
 *
 * Funcionalidades:
 * - Selector de semana (solo semanas con vales verificados)
 * - Selector de obra (solo obras con vales en la semana)
 * - Selector de material (solo para Material, solo materiales con vales en obra/semana)
 * - Selector de sindicato (solo para Admin)
 * - Botón para cargar vista previa
 *
 * Usado en: Conciliaciones.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import { Calendar, Building2, Users, Search, Package } from "lucide-react";

// 3. Hooks personalizados
import { useAuth } from "../../hooks/useAuth";

// 4. Config
import { colors } from "../../config/colors";

const FiltrosConciliacion = ({
  semanas,
  obras,
  materiales, // 👈 NUEVO
  sindicatos,
  filtros,
  onFiltrosChange,
  onCargarVistaPrevia,
  loadingCatalogos,
  disabled,
  tipoActivo, // 👈 NUEVO: 'renta' o 'material'
}) => {
  const { hasRole } = useAuth();
  const [errors, setErrors] = useState({});

  const handleSemanaChange = (e) => {
    const semanaId = e.target.value;
    if (!semanaId) {
      onFiltrosChange({
        semanaSeleccionada: null,
        obraSeleccionada: null,
        materialSeleccionado: null, // 👈 NUEVO
      });
      return;
    }

    const semana = semanas.find((s) => `${s.año}-${s.numero}` === semanaId);

    onFiltrosChange({
      semanaSeleccionada: semana,
      obraSeleccionada: null,
      materialSeleccionado: null, // 👈 NUEVO
    });
    setErrors({});
  };

  const handleObraChange = (e) => {
    const obraId = e.target.value ? parseInt(e.target.value) : null;
    onFiltrosChange({
      obraSeleccionada: obraId,
      materialSeleccionado: null, // 👈 NUEVO: Reset material cuando cambia obra
    });
    setErrors({});
  };

  const handleMaterialChange = (e) => {
    const materialId = e.target.value ? parseInt(e.target.value) : null;
    onFiltrosChange({ materialSeleccionado: materialId });
    setErrors({});
  };

  const handleSindicatoChange = (e) => {
    const sindicatoId = e.target.value ? parseInt(e.target.value) : null;
    onFiltrosChange({
      sindicatoSeleccionado: sindicatoId,
      obraSeleccionada: null,
      materialSeleccionado: null, // 👈 NUEVO
    });
    setErrors({});
  };

  const handleCargarVistaPrevia = () => {
    const newErrors = {};

    if (!filtros.semanaSeleccionada) {
      newErrors.semana = "Debe seleccionar una semana";
    }

    if (!filtros.obraSeleccionada) {
      newErrors.obra = "Debe seleccionar una obra";
    }

    // 👇 NUEVO: Validar material solo si es tipo Material
    if (tipoActivo === "material" && !filtros.materialSeleccionado) {
      newErrors.material = "Debe seleccionar un material";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onCargarVistaPrevia();
  };

  const formatearRangoSemana = (semana) => {
    const inicio = new Date(semana.fechaInicio);
    const fin = new Date(semana.fechaFin);

    const dia1 = inicio.getDate();
    const dia2 = fin.getDate();
    const mes = inicio.toLocaleDateString("es-MX", { month: "short" });

    return `${dia1}-${dia2} ${mes}`;
  };

  return (
    <div className="filtros-conciliacion">
      <div className="filtros-conciliacion__header">
        <h3 className="filtros-conciliacion__title">
          Nueva Conciliación de {tipoActivo === "renta" ? "Renta" : "Material"}
        </h3>
        <p className="filtros-conciliacion__subtitle">
          Seleccione los filtros para generar la conciliación
        </p>
      </div>

      <div className="filtros-conciliacion__body">
        {/* Selector de Sindicato (solo Admin) */}
        {hasRole("Administrador") && (
          <div className="filtros-conciliacion__field">
            <label
              htmlFor="filtro-sindicato"
              className="filtros-conciliacion__label"
            >
              <Users size={16} aria-hidden="true" />
              <span>Sindicato</span>
            </label>
            <select
              id="filtro-sindicato"
              value={filtros.sindicatoSeleccionado || ""}
              onChange={handleSindicatoChange}
              className="filtros-conciliacion__select"
              disabled={disabled || loadingCatalogos}
              aria-label="Seleccionar sindicato"
            >
              <option value="">Todos los sindicatos</option>
              {sindicatos?.map((sindicato) => (
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

        {/* Selector de Semana */}
        <div className="filtros-conciliacion__field">
          <label
            htmlFor="filtro-semana"
            className="filtros-conciliacion__label"
          >
            <Calendar size={16} aria-hidden="true" />
            <span>Semana</span>
          </label>
          <select
            id="filtro-semana"
            value={
              filtros.semanaSeleccionada
                ? `${filtros.semanaSeleccionada.año}-${filtros.semanaSeleccionada.numero}`
                : ""
            }
            onChange={handleSemanaChange}
            className={`filtros-conciliacion__select ${errors.semana ? "filtros-conciliacion__select--error" : ""}`}
            disabled={disabled || loadingCatalogos}
            aria-label="Seleccionar semana"
            aria-invalid={!!errors.semana}
            aria-describedby={errors.semana ? "error-semana" : undefined}
          >
            <option value="">Seleccione una semana</option>
            {semanas.map((semana) => (
              <option
                key={`${semana.año}-${semana.numero}`}
                value={`${semana.año}-${semana.numero}`}
              >
                Semana {semana.numero}: {formatearRangoSemana(semana)} (
                {semana.cantidadVales} vales)
              </option>
            ))}
          </select>
          {errors.semana && (
            <span id="error-semana" className="filtros-conciliacion__error">
              {errors.semana}
            </span>
          )}
        </div>

        {/* Selector de Obra */}
        <div className="filtros-conciliacion__field">
          <label htmlFor="filtro-obra" className="filtros-conciliacion__label">
            <Building2 size={16} aria-hidden="true" />
            <span>Obra</span>
          </label>
          <select
            id="filtro-obra"
            value={filtros.obraSeleccionada || ""}
            onChange={handleObraChange}
            className={`filtros-conciliacion__select ${errors.obra ? "filtros-conciliacion__select--error" : ""}`}
            disabled={
              !filtros.semanaSeleccionada || disabled || loadingCatalogos
            }
            aria-label="Seleccionar obra"
            aria-invalid={!!errors.obra}
            aria-describedby={errors.obra ? "error-obra" : undefined}
          >
            <option value="">
              {!filtros.semanaSeleccionada
                ? "Primero seleccione una semana"
                : "Seleccione una obra"}
            </option>
            {obras.map((obra) => (
              <option key={obra.id_obra} value={obra.id_obra}>
                {obra.obra} - {obra.sufijo}
              </option>
            ))}
          </select>
          {errors.obra && (
            <span id="error-obra" className="filtros-conciliacion__error">
              {errors.obra}
            </span>
          )}
        </div>

        {/* 👇 NUEVO: Selector de Material (solo para tipo Material) */}
        {tipoActivo === "material" && (
          <div className="filtros-conciliacion__field">
            <label
              htmlFor="filtro-material"
              className="filtros-conciliacion__label"
            >
              <Package size={16} aria-hidden="true" />
              <span>Material</span>
            </label>
            <select
              id="filtro-material"
              value={filtros.materialSeleccionado || ""}
              onChange={handleMaterialChange}
              className={`filtros-conciliacion__select ${errors.material ? "filtros-conciliacion__select--error" : ""}`}
              disabled={
                !filtros.obraSeleccionada || disabled || loadingCatalogos
              }
              aria-label="Seleccionar material"
              aria-invalid={!!errors.material}
              aria-describedby={errors.material ? "error-material" : undefined}
            >
              <option value="">
                {!filtros.obraSeleccionada
                  ? "Primero seleccione una obra"
                  : "Seleccione un material"}
              </option>
              {materiales?.map((material) => (
                <option key={material.id_material} value={material.id_material}>
                  {material.material} ({material.tipo_de_material})
                </option>
              ))}
            </select>
            {errors.material && (
              <span id="error-material" className="filtros-conciliacion__error">
                {errors.material}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Botón de acción */}
      <div className="filtros-conciliacion__actions">
        <button
          onClick={handleCargarVistaPrevia}
          disabled={
            !filtros.semanaSeleccionada ||
            !filtros.obraSeleccionada ||
            (tipoActivo === "material" && !filtros.materialSeleccionado) ||
            disabled ||
            loadingCatalogos
          }
          className="filtros-conciliacion__button"
          style={{ backgroundColor: colors.primary }}
          type="button"
          aria-label="Cargar vista previa de la conciliación"
        >
          <Search size={20} aria-hidden="true" />
          <span>Cargar Vista Previa</span>
        </button>
      </div>
    </div>
  );
};

export default FiltrosConciliacion;
