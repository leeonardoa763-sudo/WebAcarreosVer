/**
 * src/pages/VisualizarConciliacion.jsx
 *
 * Página pública de soporte para conciliaciones — accesible por QR desde el PDF.
 * Muestra la conciliación completa con todos sus vales, viajes, fotos y personas.
 *
 * Dependencias: supabase, formatters, ListaViajesMaterial, visualizar-vale.css,
 *               visualizar-conciliacion.css
 * Usado en: App.jsx — ruta /conciliacion/:folio (pública, sin auth)
 */

// 1. React y hooks
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// 2. Icons
import {
  Loader2,
  XCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ImageOff,
  X,
} from "lucide-react";

// 3. Config
import { supabase } from "../config/supabase";
import { colors } from "../config/colors";

// 4. Utils
import { formatearFecha, formatearHora, formatearMoneda } from "../utils/formatters";

// 5. Componentes reutilizables de VisualizarVale
import ListaViajesMaterial from "../components/visualizar-vale/ListaViajesMaterial";

// 6. Estilos
import "../styles/visualizar-vale.css";
import "../styles/visualizar-conciliacion.css";

// ========================================
// HELPERS LOCALES
// ========================================

const nombrePersona = (p) => {
  if (!p) return null;
  return `${p.nombre || ""} ${p.primer_apellido || ""}`.trim() || null;
};

const formatearMonedaMXN = (num) =>
  Number(num || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });

// ========================================
// SUBCOMPONENTE: TIMELINE DEL VALE
// ========================================

const ValeTimeline = ({ vale, personaGenerador, fechaGeneracion }) => {
  const items = [
    {
      key: "creacion",
      label: "Creación",
      fecha: vale.fecha_creacion,
      persona: nombrePersona(vale.persona),
      clase: "creacion",
    },
    vale.fecha_completado && {
      key: "emision",
      label: "Emisión",
      fecha: vale.fecha_completado,
      persona: nombrePersona(vale.persona_completador),
      clase: "emision",
    },
    vale.fecha_verificacion && {
      key: "verificacion",
      label: "Verificación",
      fecha: vale.fecha_verificacion,
      persona: nombrePersona(vale.persona_verificador),
      clase: "verificacion",
    },
    fechaGeneracion && {
      key: "conciliacion",
      label: "Conciliación",
      fecha: fechaGeneracion,
      persona: nombrePersona(personaGenerador),
      clase: "conciliacion",
    },
  ].filter(Boolean);

  return (
    <div className="vc-timeline">
      {items.map((item) => (
        <div
          key={item.key}
          className={`vc-timeline-item vc-timeline-item--${item.clase}`}
        >
          <div className="vc-timeline-dot" />
          <div className="vc-timeline-content">
            <span className="vc-timeline-label">{item.label}</span>
            <span className="vc-timeline-fecha">{formatearFecha(item.fecha)}</span>
            <span className="vc-timeline-hora">{formatearHora(item.fecha)}</span>
            {item.persona && (
              <span className="vc-timeline-persona">{item.persona}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ========================================
// SUBCOMPONENTE: DETALLES RENTA
// ========================================

const ValeRentaDetalles = ({ detalles }) => {
  const [fotoModal, setFotoModal] = useState(null);

  return (
    <div>
      {detalles.map((det, idx) => {
        const tieneFoto = Boolean(det.foto_evidencia_url);
        const tieneGeo = det.latitud_completado && det.longitud_completado;

        return (
          <div key={det.id_vale_renta_detalle ?? idx} className="vc-renta-detalle">
            <div className="vc-renta-detalle__titulo">
              {det.material?.material || "Servicio de renta"}
            </div>

            {/* Foto de evidencia */}
            {tieneFoto ? (
              <img
                src={det.foto_evidencia_url}
                alt="Evidencia de renta"
                className="vc-renta-foto"
                onClick={() => setFotoModal(det.foto_evidencia_url)}
              />
            ) : (
              <div className="vc-renta-foto-placeholder">
                <ImageOff size={18} />
                <span>Sin foto de evidencia</span>
              </div>
            )}

            {/* Datos del servicio */}
            <div className="vc-dato-row">
              <span className="vc-dato-label">Capacidad</span>
              <span className="vc-dato-value">{det.capacidad_m3 || "—"} m³</span>
            </div>
            {det.hora_inicio && (
              <div className="vc-dato-row">
                <span className="vc-dato-label">Hora inicio</span>
                <span className="vc-dato-value">{formatearHora(det.hora_inicio)}</span>
              </div>
            )}
            {det.hora_fin && (
              <div className="vc-dato-row">
                <span className="vc-dato-label">Hora fin</span>
                <span className="vc-dato-value">{formatearHora(det.hora_fin)}</span>
              </div>
            )}
            {det.total_horas > 0 && (
              <div className="vc-dato-row">
                <span className="vc-dato-label">Total horas</span>
                <span className="vc-dato-value">
                  {Number(det.total_horas).toFixed(2)} h
                </span>
              </div>
            )}
            {det.total_dias > 0 && (
              <div className="vc-dato-row">
                <span className="vc-dato-label">Total días</span>
                <span className="vc-dato-value">
                  {Number(det.total_dias) === 0.5 ? "Medio día" : `${det.total_dias} día(s)`}
                </span>
              </div>
            )}
            <div className="vc-dato-row">
              <span className="vc-dato-label">Viajes</span>
              <span className="vc-dato-value">{det.numero_viajes || 1}</span>
            </div>
            <div className="vc-dato-row">
              <span className="vc-dato-label">Costo total</span>
              <span className="vc-dato-value" style={{ color: colors.success, fontWeight: 700 }}>
                {formatearMonedaMXN(det.costo_total)}
              </span>
            </div>

            {/* Link a mapa */}
            {tieneGeo && (
              <a
                href={`https://www.google.com/maps?q=${det.latitud_completado},${det.longitud_completado}`}
                target="_blank"
                rel="noopener noreferrer"
                className="viaje-item__mapa-link"
                style={{ marginTop: 6, display: "inline-flex" }}
              >
                Ver ubicación en mapa
              </a>
            )}

            {/* Notas */}
            {det.notas_adicionales && (
              <div
                style={{
                  marginTop: 8,
                  padding: "6px 8px",
                  background: "#fffbeb",
                  borderRadius: 4,
                  fontSize: 11,
                  color: "#92400e",
                }}
              >
                <strong>Notas:</strong> {det.notas_adicionales}
              </div>
            )}

            {/* Viajes de renta registrados */}
            {det.vale_renta_viajes?.length > 0 && (
              <div className="vc-renta-viajes">
                <div className="vc-renta-viajes__titulo">
                  Viajes registrados ({det.vale_renta_viajes.length})
                </div>
                {det.vale_renta_viajes
                  .sort((a, b) => a.numero_viaje - b.numero_viaje)
                  .map((viaje) => (
                    <div key={viaje.id_viaje} className="vc-renta-viaje-item">
                      <span className="vc-renta-viaje-num">#{viaje.numero_viaje}</span>
                      <span className="vc-renta-viaje-hora">
                        {formatearHora(viaje.hora_registro)}
                      </span>
                      <span className="vc-renta-viaje-persona">
                        {nombrePersona(viaje.persona_registro) || "—"}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal foto ampliada */}
      {fotoModal && (
        <div
          className="vc-foto-overlay"
          onClick={() => setFotoModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="vc-foto-contenido"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="vc-foto-cerrar"
              onClick={() => setFotoModal(null)}
              aria-label="Cerrar foto"
            >
              <X size={18} />
            </button>
            <img
              src={fotoModal}
              alt="Evidencia de renta ampliada"
              className="vc-foto-imagen"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ========================================
// SUBCOMPONENTE: TARJETA ACORDEÓN POR VALE
// ========================================

const ValeCard = ({ vale, isExpanded, onToggle, personaGenerador, fechaGeneracion }) => {
  const badgeEstadoClase = {
    emitido: "vc-vale-estado--emitido",
    verificado: "vc-vale-estado--verificado",
    conciliado: "vc-vale-estado--conciliado",
    en_proceso: "vc-vale-estado--en_proceso",
  }[vale.estado] || "vc-vale-estado--en_proceso";

  const metaTexto = [
    vale.operadores?.nombre_completo,
    vale.vehiculos?.placas,
    formatearFecha(vale.fecha_creacion),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="vc-vale-card">
      {/* Header clickeable */}
      <button
        className={`vc-vale-header${isExpanded ? " vc-vale-header--expanded" : ""}`}
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="vc-vale-header__left">
          <span className="vc-vale-folio">{vale.folio}</span>
          <span className="vc-vale-meta">{metaTexto}</span>
        </div>
        <div className="vc-vale-header__right">
          <span className={`vc-vale-estado ${badgeEstadoClase}`}>
            {vale.estado}
          </span>
          <span className="vc-vale-chevron">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </button>

      {/* Body expandible */}
      {isExpanded && (
        <div className="vc-vale-body">
          {/* Datos generales */}
          <div className="vc-vale-datos">
            <div className="vc-dato-row">
              <span className="vc-dato-label">Operador</span>
              <span className="vc-dato-value">
                {vale.operadores?.nombre_completo || "—"}
              </span>
            </div>
            <div className="vc-dato-row">
              <span className="vc-dato-label">Placas</span>
              <span className="vc-dato-value">{vale.vehiculos?.placas || "—"}</span>
            </div>
            <div className="vc-dato-row">
              <span className="vc-dato-label">Tipo</span>
              <span className="vc-dato-value">
                {vale.tipo_vale === "material" ? "Material" : "Renta"}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="vc-section-title" style={{ marginBottom: 8 }}>
            HISTORIAL
          </div>
          <ValeTimeline
            vale={vale}
            personaGenerador={personaGenerador}
            fechaGeneracion={fechaGeneracion}
          />

          {/* Viajes material */}
          {vale.tipo_vale === "material" && vale.vale_material_detalles?.length > 0 && (
            <ListaViajesMaterial
              detalles={vale.vale_material_detalles}
              mostrarPrecios={true}
            />
          )}

          {/* Detalles renta */}
          {vale.tipo_vale === "renta" && vale.vale_renta_detalle?.length > 0 && (
            <>
              <div className="divider" style={{ margin: "10px 0" }} />
              <div className="vc-section-title" style={{ marginBottom: 8 }}>
                DETALLES DEL SERVICIO
              </div>
              <ValeRentaDetalles detalles={vale.vale_renta_detalle} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

const VisualizarConciliacion = () => {
  const { folio } = useParams();
  const navigate = useNavigate();

  // Estados
  const [conciliacion, setConciliacion] = useState(null);
  const [vales, setVales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedVales, setExpandedVales] = useState(new Set());

  // Cargar datos
  useEffect(() => {
    let isMounted = true;

    const fetchConciliacion = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("conciliaciones")
          .select(
            `
            id_conciliacion,
            folio,
            tipo_conciliacion,
            numero_semana,
            año,
            fecha_inicio,
            fecha_fin,
            subtotal,
            iva_16_porciento,
            retencion_4_porciento,
            total_final,
            total_dias,
            total_horas,
            fecha_generacion,
            estado,
            empresas:id_empresa (empresa, sufijo, logo),
            sindicatos:id_sindicato (sindicato, nombre_completo),
            obras:id_obra (id_obra, obra, cc),
            persona_generador:generado_por (nombre, primer_apellido),
            conciliacion_vales (
              vales:id_vale (
                id_vale,
                folio,
                tipo_vale,
                estado,
                fecha_creacion,
                fecha_completado,
                fecha_verificacion,
                operadores:id_operador (nombre_completo, id_sindicato),
                vehiculos:id_vehiculo (placas),
                persona:id_persona_creador (nombre, primer_apellido),
                persona_verificador:id_persona_verificador (nombre, primer_apellido),
                persona_completador:id_persona_completador (nombre, primer_apellido),
                vale_material_detalles (
                  id_detalle_material,
                  capacidad_m3,
                  distancia_km,
                  cantidad_pedida_m3,
                  peso_ton,
                  volumen_real_m3,
                  precio_m3,
                  costo_total,
                  folio_banco,
                  foto_evidencia_url,
                  latitud_completado,
                  longitud_completado,
                  distancia_obra_metros,
                  notas_adicionales,
                  material:id_material (
                    material,
                    tipo_de_material:id_tipo_de_material (
                      id_tipo_de_material,
                      tipo_de_material
                    )
                  ),
                  bancos:id_banco (banco),
                  vale_material_viajes (
                    id_viaje,
                    numero_viaje,
                    hora_registro,
                    peso_ton,
                    volumen_m3,
                    precio_m3,
                    costo_viaje,
                    folio_vale_fisico,
                    id_banco_override,
                    distancia_km_override,
                    precio_m3_override,
                    costo_viaje_override,
                    bancos_override:id_banco_override (id_banco, banco)
                  )
                ),
                vale_renta_detalle (
                  id_vale_renta_detalle,
                  capacidad_m3,
                  hora_inicio,
                  hora_fin,
                  total_horas,
                  total_dias,
                  costo_total,
                  numero_viajes,
                  notas_adicionales,
                  es_renta_por_dia,
                  foto_evidencia_url,
                  latitud_completado,
                  longitud_completado,
                  distancia_obra_metros,
                  material:id_material (material),
                  precios_renta:id_precios_renta (costo_hr, costo_dia),
                  vale_renta_viajes (
                    id_viaje,
                    numero_viaje,
                    hora_registro,
                    persona_registro:id_persona_registro (nombre, primer_apellido)
                  )
                )
              )
            )
          `
          )
          .eq("folio", folio)
          .single();

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            throw new Error("Conciliación no encontrada en el sistema.");
          }
          throw fetchError;
        }

        if (!data) {
          throw new Error("Conciliación no encontrada.");
        }

        if (isMounted) {
          setConciliacion(data);
          // Extraer vales desde conciliacion_vales
          const valesExtraidos = (data.conciliacion_vales || [])
            .map((cv) => cv.vales)
            .filter(Boolean);
          setVales(valesExtraidos);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Error al cargar la conciliación.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (folio) fetchConciliacion();

    return () => {
      isMounted = false;
    };
  }, [folio]);

  const toggleVale = (idVale) => {
    setExpandedVales((prev) => {
      const next = new Set(prev);
      if (next.has(idVale)) next.delete(idVale);
      else next.add(idVale);
      return next;
    });
  };

  // ---- Estados de carga y error ----

  if (loading) {
    return (
      <div className="vc-loading">
        <Loader2 size={48} className="vc-spinner" />
        <p>Cargando conciliación...</p>
      </div>
    );
  }

  if (error || !conciliacion) {
    return (
      <div className="vc-error">
        <XCircle size={64} color="rgba(255,255,255,0.6)" />
        <h2>Conciliación no encontrada</h2>
        <p>{error || "No se pudo encontrar la conciliación solicitada."}</p>
        <button
          onClick={() => navigate("/")}
          className="vc-btn-volver"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  // ---- Datos derivados ----

  const esMaterial = conciliacion.tipo_conciliacion === "material";
  const tituloTipo = esMaterial ? "CONCILIACIÓN DE MATERIAL" : "CONCILIACIÓN DE RENTA";
  const tieneRetencion = Number(conciliacion.retencion_4_porciento) > 0;

  const formatearPeriodo = () => {
    const fi = conciliacion.fecha_inicio;
    const ff = conciliacion.fecha_fin;
    if (!fi || !ff) return `Semana ${conciliacion.numero_semana}`;
    return `Semana ${conciliacion.numero_semana} · ${formatearFecha(fi + "T12:00:00")} al ${formatearFecha(ff + "T12:00:00")}`;
  };

  // ---- Render principal ----

  return (
    <div className="vc-page">
      <div className="vc-container">

        {/* MARCA DE AGUA */}
        <div className="vc-marca-agua">SOPORTE DE CONCILIACIÓN</div>

        {/* HEADER */}
        <div className="vc-header">
          {conciliacion.empresas?.logo && (
            <img
              src={conciliacion.empresas.logo}
              alt="Logo empresa"
              className="vc-logo"
            />
          )}
          <h1 className="vc-empresa">{conciliacion.empresas?.empresa}</h1>
          <h2 className="vc-titulo">{tituloTipo}</h2>
        </div>

        {/* BADGES */}
        <div className="vc-badges">
          <span className="vc-badge vc-badge--tipo">
            {esMaterial ? "Material" : "Renta"}
          </span>
          <span className={`vc-badge vc-badge--estado-${conciliacion.estado}`}>
            {conciliacion.estado}
          </span>
        </div>

        <div className="vc-divider" />

        {/* INFO GENERAL */}
        <div className="vc-section">
          <div className="vc-info-row">
            <span className="vc-info-label">Folio:</span>
            <span className="vc-info-value">{conciliacion.folio}</span>
          </div>
          <div className="vc-info-row">
            <span className="vc-info-label">Empresa:</span>
            <span className="vc-info-value">{conciliacion.empresas?.empresa}</span>
          </div>
          <div className="vc-info-row">
            <span className="vc-info-label">Sindicato:</span>
            <span className="vc-info-value">
              {conciliacion.sindicatos?.nombre_completo}
            </span>
          </div>
          <div className="vc-info-row">
            <span className="vc-info-label">Obra:</span>
            <span className="vc-info-value">
              {conciliacion.obras?.cc} — {conciliacion.obras?.obra}
            </span>
          </div>
          <div className="vc-info-row">
            <span className="vc-info-label">Periodo:</span>
            <span className="vc-info-value">{formatearPeriodo()}</span>
          </div>
          {conciliacion.persona_generador && (
            <div className="vc-info-row">
              <span className="vc-info-label">Generado por:</span>
              <span className="vc-info-value">
                {nombrePersona(conciliacion.persona_generador)}
              </span>
            </div>
          )}
        </div>

        <div className="vc-divider" />

        {/* RESUMEN FINANCIERO */}
        <div className="vc-section">
          <h3 className="vc-section-title">RESUMEN FINANCIERO</h3>
          <div className="vc-financiero">
            <div className="vc-financiero-row">
              <span className="vc-financiero-label">Subtotal</span>
              <span className="vc-financiero-value">
                {formatearMonedaMXN(conciliacion.subtotal)}
              </span>
            </div>
            <div className="vc-financiero-row">
              <span className="vc-financiero-label">IVA 16%</span>
              <span className="vc-financiero-value">
                {formatearMonedaMXN(conciliacion.iva_16_porciento)}
              </span>
            </div>
            {tieneRetencion && (
              <div className="vc-financiero-row vc-financiero-row--retencion">
                <span className="vc-financiero-label">Retención 4%</span>
                <span className="vc-financiero-value">
                  -{formatearMonedaMXN(conciliacion.retencion_4_porciento)}
                </span>
              </div>
            )}
            <div className="vc-financiero-row vc-financiero-total">
              <span className="vc-financiero-label">TOTAL</span>
              <span className="vc-financiero-value">
                {formatearMonedaMXN(conciliacion.total_final)}
              </span>
            </div>
          </div>
        </div>

        <div className="vc-divider" />

        {/* VALES INCLUIDOS */}
        <div className="vc-section">
          <h3 className="vc-section-title">
            VALES INCLUIDOS
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#1a3a5c",
                color: "white",
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 700,
                padding: "1px 7px",
                marginLeft: 8,
              }}
            >
              {vales.length}
            </span>
          </h3>

          <div className="vc-vales-lista">
            {vales.map((vale) => (
              <ValeCard
                key={vale.id_vale}
                vale={vale}
                isExpanded={expandedVales.has(vale.id_vale)}
                onToggle={() => toggleVale(vale.id_vale)}
                personaGenerador={conciliacion.persona_generador}
                fechaGeneracion={conciliacion.fecha_generacion}
              />
            ))}
          </div>
        </div>

        <div className="vc-divider" />

        {/* FOOTER */}
        <div className="vc-footer">
          <p className="vc-footer-text">
            <CheckCircle size={14} color={colors.success} />
            Conciliación generada el{" "}
            {formatearFecha(conciliacion.fecha_generacion)}
            {conciliacion.persona_generador && (
              <> · {nombrePersona(conciliacion.persona_generador)}</>
            )}
          </p>
        </div>

      </div>
    </div>
  );
};

export default VisualizarConciliacion;
