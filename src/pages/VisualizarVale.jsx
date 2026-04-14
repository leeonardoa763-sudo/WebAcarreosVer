/**
 * src/pages/VisualizarVale.jsx
 *
 * Página pública para visualizar vales mediante código QR
 *
 * Funcionalidades:
 * - Acceso SIN autenticación
 * - Muestra vale completo (Material o Renta)
 * - Lista de viajes con foto de evidencia y distancia a la obra
 * - Permite descargar PDF con marca de agua
 * - Registra acceso para auditoría
 *
 * URL: /vale/:folio
 * Usado en: Escaneo de código QR desde PDFs físicos
 */

// 1. React y hooks
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// 2. Icons
import {
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  LogIn,
  Lock,
} from "lucide-react";

// 3. Hooks personalizados
import { useAuth } from "../hooks/useAuth";

// 4. Config
import { supabase } from "../config/supabase";
import { colors } from "../config/colors";

// 5. Utils
import {
  formatearFecha,
  formatearFechaCorta,
  formatearHora,
  getBadgeEstado,
  getBadgeTipo,
} from "../utils/formatters";
import {
  generarPDFMaterialPublico,
  generarPDFRentaPublico,
} from "../utils/pdfPublicGenerator";

// 6. Componentes
import DetallesMaterial from "../components/visualizar-vale/DetallesMaterial";
import DetallesRenta from "../components/visualizar-vale/DetallesRenta";
import ListaViajesMaterial from "../components/visualizar-vale/ListaViajesMaterial";
import LoginModal from "../components/visualizar-vale/LoginModal";

// 7. Estilos
import "../styles/visualizar-vale.css";

const VisualizarVale = () => {
  const { folio } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  // Estados
  const [vale, setVale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [fechaConciliacion, setFechaConciliacion] = useState(null);

  /**
   * Obtener clase de fondo según estado del vale
   */
  const getBackgroundClass = (estado) => {
    const clases = {
      en_proceso: "bg-estado-proceso",
      emitido: "bg-estado-emitido",
      verificado: "bg-estado-verificado",
    };
    return clases[estado] || "";
  };

  /**
   * Verificar si el usuario puede ver precios
   * - Sin sesión: NO
   * - Administrador: SÍ siempre
   * - Sindicato: SÍ solo si el operador pertenece a su sindicato
   */
  const puedeVerPrecios = () => {
    if (!user || !userProfile) return false;
    if (userProfile.roles?.role === "Administrador") return true;
    if (userProfile.roles?.role === "Sindicato") {
      const sindicatoUsuario = userProfile.id_sindicato;
      const sindicatoOperador = vale?.operadores?.id_sindicato;
      return Boolean(
        sindicatoUsuario && sindicatoUsuario === sindicatoOperador,
      );
    }
    return false;
  };

  const mostrarPrecios = puedeVerPrecios();

  /**
   * Cargar datos del vale desde BD con reintentos por timeout
   */
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 10000;

    const fetchVale = async () => {
      try {
        setLoading(true);
        setError(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const { data, error: fetchError } = await supabase
          .from("vales")
          .select(
            `
            *,
            total_descargas_web,
            fecha_creacion,
            fecha_completado,
            fecha_verificacion,
            obras:id_obra (
              id_obra,
              obra,
              cc,
              empresas:id_empresa (
                empresa,
                sufijo,
                logo
              )
            ),
            operadores:id_operador (
              id_operador,
              nombre_completo,
              id_sindicato
            ),
            vehiculos:id_vehiculo (
              id_vehiculo,
              placas,
              sindicatos:id_sindicato (
                sindicato
              )
            ),
            persona:id_persona_creador (
              nombre,
              primer_apellido,
              segundo_apellido
            ),
            vale_material_detalles (
              capacidad_m3,
              distancia_km,
              cantidad_pedida_m3,
              peso_ton,
              volumen_real_m3,
              folio_banco,
              requisicion,
              precio_m3,
              costo_total,
              tarifa_primer_km,
              tarifa_subsecuente,
              notas_adicionales,
              foto_evidencia_url,
              latitud_completado,
              longitud_completado,
              distancia_obra_metros,
              material:id_material (
                material,
                tipo_de_material:id_tipo_de_material (
                  tipo_de_material
                )
              ),
              bancos:id_banco (
                banco
              ),
              sindicatos:id_sindicato (
                sindicato
              ),
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
                bancos_override:id_banco_override (
                  id_banco,
                  banco
                )
              )
            ),
            vale_renta_detalle (
              capacidad_m3,
              hora_inicio,
              hora_fin,
              total_horas,
              total_dias,
              costo_total,
              numero_viajes,
              notas_adicionales,
              es_renta_por_dia,
              material:id_material (
                material
              ),
              precios_renta:id_precios_renta (
                costo_hr,
                costo_dia
              ),
              vale_renta_viajes (
                id_viaje,
                numero_viaje,
                hora_registro,
                persona_registro:id_persona_registro (
                  nombre,
                  primer_apellido
                )
              )
            )
          `,
          )
          .eq("folio", folio)
          .abortSignal(controller.signal)
          .single();

        clearTimeout(timeoutId);

        if (fetchError) {
          const isTimeout =
            fetchError.message?.includes("aborted") ||
            fetchError.message?.includes("timeout") ||
            fetchError.name === "AbortError";

          if (isTimeout && retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(() => {
              if (isMounted) fetchVale();
            }, 1000 * retryCount);
            return;
          }

          throw fetchError;
        }

        if (!data) {
          setError("Vale no encontrado");
          return;
        }

        if (isMounted) {
          setVale(data);
          registrarAcceso(data.id_vale);

          // Buscar fecha de conciliación si el vale está conciliado
          if (data.estado === "conciliado") {
            fetchFechaConciliacion(data.id_vale);
          }
        }
      } catch (err) {
        if (isMounted) {
          if (err.name === "AbortError" || err.message?.includes("aborted")) {
            setError(
              "La conexión está tardando demasiado. Por favor, verifica tu conexión a internet y vuelve a escanear el código QR.",
            );
          } else if (err.code === "PGRST116") {
            setError("Vale no encontrado en el sistema.");
          } else {
            setError("Error al cargar el vale. Por favor, intenta nuevamente.");
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (folio) fetchVale();

    return () => {
      isMounted = false;
    };
  }, [folio]);

  /**
   * Buscar fecha de conciliación via conciliacion_vales → conciliaciones
   */
  const fetchFechaConciliacion = async (idVale) => {
    try {
      const { data, error } = await supabase
        .from("conciliacion_vales")
        .select(
          `
          conciliaciones:id_conciliacion (
            fecha_creacion
          )
        `,
        )
        .eq("id_vale", idVale)
        .limit(1)
        .single();

      if (error) return;
      if (data?.conciliaciones?.fecha_creacion) {
        setFechaConciliacion(data.conciliaciones.fecha_creacion);
      }
    } catch {
      // No bloquear si falla
    }
  };

  /**
   * Registrar acceso al vale para auditoría (sin bloquear el render)
   */
  const registrarAcceso = async (idVale) => {
    try {
      await supabase.from("vale_accesos").insert({
        id_vale: idVale,
        id_persona: null,
        tipo_accion: "visualizacion_publica",
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    } catch (err) {
      console.error("[VisualizarVale] Error al registrar acceso:", err);
    }
  };

  /**
   * Descargar PDF con marca de agua
   */
  const handleDescargarPDF = async () => {
    try {
      setDownloadingPDF(true);

      const { error } = await supabase.rpc("registrar_descarga_vale_web", {
        p_folio: folio,
        p_user_agent: navigator.userAgent,
      });

      if (error) {
        console.error("[VisualizarVale] Error al registrar descarga:", error);
      }

      if (vale.tipo_vale === "material") {
        generarPDFMaterialPublico(vale);
      } else {
        generarPDFRentaPublico(vale);
      }
    } catch (err) {
      console.error("[VisualizarVale] Error al descargar:", err);
      alert("Error al descargar PDF. Intente nuevamente.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  /**
   * Aplanar viajes: un objeto por cada vale_material_viaje con contexto del detalle padre.
   * foto y coordenadas viven en vale_material_detalles, no en vale_material_viajes.
   */
  const aplanarViajesMaterial = (detalles) => {
    return detalles.flatMap((det) => {
      const viajes = det.vale_material_viajes || [];

      if (viajes.length === 0) {
        return [{ ...det, _esDetalleFallback: true }];
      }

      return viajes.map((viaje) => ({
        ...viaje,
        // Contexto del detalle padre
        material: det.material,
        capacidad_m3: det.capacidad_m3, // siempre del detalle
        cantidad_pedida_m3: det.cantidad_pedida_m3,
        notas_adicionales: det.notas_adicionales,
        folio_banco: det.folio_banco,
        // Foto y geolocalización viven en el detalle
        foto_evidencia_url: det.foto_evidencia_url,
        latitud_completado: det.latitud_completado,
        longitud_completado: det.longitud_completado,
        distancia_obra_metros: det.distancia_obra_metros,
        // Banco y distancia: usar override del viaje si existe
        bancos: viaje.bancos_override ?? det.bancos,
        distancia_km: viaje.distancia_km_override ?? det.distancia_km,
        // Volumen, peso y costo del viaje individual
        volumen_real_m3: viaje.volumen_m3 ?? det.volumen_real_m3,
        peso_ton: viaje.peso_ton ?? det.peso_ton,
        costo_total: viaje.costo_viaje ?? det.costo_total,
      }));
    });
  };

  // ========================================
  // ESTADOS DE CARGA Y ERROR
  // ========================================

  if (loading) {
    return (
      <div className="visualizar-vale-loading">
        <Loader2 size={48} className="spinner" />
        <p>Cargando vale...</p>
      </div>
    );
  }

  if (error || !vale) {
    return (
      <div className="visualizar-vale-error">
        <XCircle size={64} color={colors.textSecondary} />
        <h2>Vale no encontrado</h2>
        <p>
          {error || "No se pudo encontrar el vale con el folio especificado."}
        </p>
        <button
          onClick={() => navigate("/")}
          className="btn-volver"
          style={{ backgroundColor: colors.primary }}
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  // ========================================
  // RENDERIZADO PRINCIPAL
  // ========================================

  const detalleMaterial = vale.vale_material_detalles?.[0];
  const detalleRenta = vale.vale_renta_detalle?.[0];
  const badgeEstado = getBadgeEstado(vale.estado);
  const badgeTipo = getBadgeTipo(vale.tipo_vale);
  const viajesAplanados =
    vale.tipo_vale === "material" && vale.vale_material_detalles?.length > 0
      ? aplanarViajesMaterial(vale.vale_material_detalles)
      : [];

  return (
    <div className={`visualizar-vale-page ${getBackgroundClass(vale.estado)}`}>
      <div className="visualizar-vale-container">
        {/* MARCA DE AGUA */}
        <div className="marca-agua">
          <span>VISUALIZACIÓN WEB</span>
        </div>

        {/* HEADER CON LOGO */}
        <div className="vale-header">
          {vale.obras?.empresas?.logo && (
            <img
              src={vale.obras.empresas.logo}
              alt="Logo Empresa"
              className="vale-logo"
            />
          )}
          <h1 className="vale-empresa">{vale.obras?.empresas?.empresa}</h1>
          <h2 className="vale-titulo">
            VALE DE{" "}
            {vale.tipo_vale === "material"
              ? "MATERIAL - ACARREO"
              : "RENTA - SERVICIO"}
          </h2>
        </div>

        {/* BADGES DE ESTADO Y TIPO */}
        <div className="vale-badges">
          <span
            className="badge badge-tipo"
            style={{
              backgroundColor: badgeTipo.background,
              color: badgeTipo.color,
            }}
          >
            {badgeTipo.label}
          </span>
          <span
            className="badge badge-estado"
            style={{
              backgroundColor: badgeEstado.background,
              color: badgeEstado.color,
            }}
          >
            {badgeEstado.label}
          </span>
        </div>

        <div className="divider"></div>

        {/* DATOS PRINCIPALES */}
        <div className="vale-section">
          <div className="info-row">
            <span className="info-label">Folio:</span>
            <span className="info-value">{vale.folio}</span>
          </div>
          <div className="info-full">
            <span className="info-label">Obra:</span>
            <span className="info-value">{vale.obras?.obra}</span>
          </div>
          {vale.tipo_vale === "material" && detalleMaterial && (
            <div className="info-full">
              <span className="info-label">Banco:</span>
              <span className="info-value">
                {detalleMaterial.bancos?.banco || "N/A"}
              </span>
            </div>
          )}
          {vale.tipo_vale === "renta" && detalleRenta && (
            <div className="info-full">
              <span className="info-label">Sindicato:</span>
              <span className="info-value">
                {detalleRenta.sindicatos?.sindicato || "N/A"}
              </span>
            </div>
          )}
        </div>

        <div className="divider"></div>

        {/* LÍNEA DE TIEMPO DE FECHAS */}
        <div className="vale-section">
          <h3 className="section-title">HISTORIAL DE FECHAS</h3>

          <div className="fechas-timeline">
            {/* Creación */}
            <div className="fecha-item fecha-item--creacion">
              <div className="fecha-item__dot" />
              <div className="fecha-item__contenido">
                <span className="fecha-item__label">Creación</span>
                <span className="fecha-item__valor">
                  {formatearFecha(vale.fecha_creacion)}
                </span>
                <span className="fecha-item__hora">
                  {formatearHora(vale.fecha_creacion)}
                </span>
              </div>
            </div>

            {/* Emisión (fecha_completado = cuando se emitió el vale físico) */}
            {vale.fecha_completado && (
              <div className="fecha-item fecha-item--emision">
                <div className="fecha-item__dot" />
                <div className="fecha-item__contenido">
                  <span className="fecha-item__label">Emisión</span>
                  <span className="fecha-item__valor">
                    {formatearFecha(vale.fecha_completado)}
                  </span>
                  <span className="fecha-item__hora">
                    {formatearHora(vale.fecha_completado)}
                  </span>
                </div>
              </div>
            )}

            {/* Verificación */}
            {vale.fecha_verificacion && (
              <div className="fecha-item fecha-item--verificacion">
                <div className="fecha-item__dot" />
                <div className="fecha-item__contenido">
                  <span className="fecha-item__label">Verificación</span>
                  <span className="fecha-item__valor">
                    {formatearFecha(vale.fecha_verificacion)}
                  </span>
                  <span className="fecha-item__hora">
                    {formatearHora(vale.fecha_verificacion)}
                  </span>
                </div>
              </div>
            )}

            {/* Conciliación (solo si estado === "conciliado") */}
            {fechaConciliacion && (
              <div className="fecha-item fecha-item--conciliacion">
                <div className="fecha-item__dot" />
                <div className="fecha-item__contenido">
                  <span className="fecha-item__label">Conciliación</span>
                  <span className="fecha-item__valor">
                    {formatearFecha(fechaConciliacion)}
                  </span>
                  <span className="fecha-item__hora">
                    {formatearHora(fechaConciliacion)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="divider"></div>

        {/* DATOS ESPECÍFICOS POR TIPO */}
        {vale.tipo_vale === "material" && detalleMaterial && (
          <DetallesMaterial
            detalle={detalleMaterial}
            mostrarPrecios={mostrarPrecios}
          />
        )}

        {vale.tipo_vale === "renta" && detalleRenta && (
          <DetallesRenta
            detalle={detalleRenta}
            mostrarPrecios={mostrarPrecios}
          />
        )}

        {/* LISTA DE VIAJES - MATERIAL */}
        {viajesAplanados.length > 0 && (
          <ListaViajesMaterial
            detalles={viajesAplanados}
            mostrarPrecios={mostrarPrecios}
          />
        )}

        <div className="divider"></div>

        {/* DATOS GENERALES */}
        <div className="vale-section">
          <h3 className="section-title">DATOS GENERALES</h3>
          <div className="info-row">
            <span className="info-label">Operador:</span>
            <span className="info-value">
              {vale.operadores?.nombre_completo || "N/A"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Placas:</span>
            <span className="info-value">
              {vale.vehiculos?.placas || "N/A"}
            </span>
          </div>
          {vale.tipo_vale === "material" && (
            <div className="info-row">
              <span className="info-label">Sindicato:</span>
              <span className="info-value">
                {vale.vehiculos?.sindicatos?.sindicato || "N/A"}
              </span>
            </div>
          )}
        </div>

        {/* EMITIDO POR (solo renta) */}
        {vale.tipo_vale === "renta" && vale.persona && (
          <>
            <div className="divider"></div>
            <div className="vale-section">
              <h3 className="section-title">EMITIDO POR</h3>
              <div className="info-row">
                <span className="info-label">Residente:</span>
                <span className="info-value">
                  {vale.persona.nombre} {vale.persona.primer_apellido}{" "}
                  {vale.persona.segundo_apellido || ""}
                </span>
              </div>
            </div>
          </>
        )}

        {/* NOTAS (si existen) */}
        {((vale.tipo_vale === "material" &&
          detalleMaterial?.notas_adicionales) ||
          (vale.tipo_vale === "renta" && detalleRenta?.notas_adicionales)) && (
          <>
            <div className="divider"></div>
            <div className="vale-section">
              <h3 className="section-title">NOTAS</h3>
              <p className="notas-text">
                {vale.tipo_vale === "material"
                  ? detalleMaterial.notas_adicionales
                  : detalleRenta.notas_adicionales}
              </p>
            </div>
          </>
        )}

        <div className="divider"></div>

        {/* FOOTER CON BOTÓN DE DESCARGA */}
        <div className="vale-footer">
          <button
            onClick={handleDescargarPDF}
            disabled={downloadingPDF}
            className="btn-descargar"
            style={{ backgroundColor: colors.accent }}
          >
            {downloadingPDF ? (
              <>
                <Loader2 size={20} className="spinner" />
                <span>Generando PDF...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>Descargar PDF</span>
              </>
            )}
          </button>

          {/* Botón de login si no está autenticado */}
          {!user && (
            <button
              onClick={() => setShowLoginModal(true)}
              className="btn-login"
              style={{ backgroundColor: colors.success }}
            >
              <LogIn size={20} />
              <span>Iniciar Sesión para Ver Precios</span>
            </button>
          )}

          {/* Mensaje si autenticado sin permisos */}
          {user && !mostrarPrecios && (
            <div className="info-message">
              <Lock size={20} />
              <p>No tienes permisos para ver los precios de este vale</p>
            </div>
          )}

          <p className="footer-text">
            <CheckCircle size={16} />
            Vale emitido el {formatearFecha(vale.fecha_creacion)}
          </p>
        </div>
      </div>

      {/* Modal de login */}
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  );
};

export default VisualizarVale;
