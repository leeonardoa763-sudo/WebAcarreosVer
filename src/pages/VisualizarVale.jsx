/**
 * src/pages/VisualizarVale.jsx
 *
 * Página pública para visualizar vales mediante código QR
 *
 * Funcionalidades:
 * - Acceso SIN autenticación
 * - Muestra vale completo (Material o Renta)
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
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  LogIn,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";

// 3. Hooks personalizados
import { useAuth } from "../hooks/useAuth";

// 3. Config
import { supabase } from "../config/supabase";
import { colors } from "../config/colors";

// 4. Utils
import {
  formatearFecha,
  formatearFechaCorta,
  formatearHora,
  formatearMoneda,
  formatearVolumen,
  formatearPeso,
  getBadgeEstado,
  getBadgeTipo,
} from "../utils/formatters";
import {
  generarPDFMaterialPublico,
  generarPDFRentaPublico,
} from "../utils/pdfPublicGenerator";

// 5. Estilos
import "../styles/visualizar-vale.css";

const VisualizarVale = () => {
  const { folio } = useParams();
  const navigate = useNavigate();
  const { user, userProfile, signIn } = useAuth();

  // Estados
  const [vale, setVale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Login estados
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  /**
   * Obtener clase de fondo según estado del vale
   * Aplica colores distintivos para identificación rápida:
   * - en_proceso: rojo
   * - emitido: azul
   * - verificado: amarillo
   */
  const getBackgroundClass = (estado) => {
    const backgroundClasses = {
      en_proceso: "bg-estado-proceso",
      emitido: "bg-estado-emitido",
      verificado: "bg-estado-verificado",
    };
    return backgroundClasses[estado] || "";
  };

  /**
   * Verificar si el usuario puede ver precios
   * Lógica:
   * - Sin sesión: NO ver precios
   * - Administrador: SÍ ver precios de todos los vales
   * - Sindicato: SÍ ver precios SOLO de vales de su sindicato
   */
  const puedeVerPrecios = () => {
    console.log("=== DEBUG puedeVerPrecios ===");
    console.log("1. user:", user);
    console.log("2. userProfile:", userProfile);
    console.log("3. vale completo:", vale);

    // Sin autenticación, no puede ver precios
    if (!user || !userProfile) {
      console.log("❌ NO hay user o userProfile");
      return false;
    }

    console.log("4. Role del usuario:", userProfile.roles?.role);

    // Administrador ve todos los precios
    if (userProfile.roles?.role === "Administrador") {
      console.log("✅ Es ADMINISTRADOR - puede ver precios");
      return true;
    }

    // Sindicato solo ve precios de vales de su sindicato
    if (userProfile.roles?.role === "Sindicato") {
      const sindicatoUsuario = userProfile.id_sindicato;
      const sindicatoOperador = vale?.operadores?.id_sindicato;

      console.log("5. Es SINDICATO");
      console.log("6. sindicatoUsuario:", sindicatoUsuario);
      console.log("7. sindicatoOperador:", sindicatoOperador);
      console.log("8. vale.operadores completo:", vale?.operadores);

      const tienePermiso =
        sindicatoUsuario && sindicatoUsuario === sindicatoOperador;
      console.log("9. ¿Tiene permiso?", tienePermiso);

      return tienePermiso;
    }

    console.log("❌ Rol no reconocido:", userProfile.roles?.role);
    // Otros roles no ven precios
    return false;
  };

  const mostrarPrecios = puedeVerPrecios();
  console.log("10. RESULTADO FINAL mostrarPrecios:", mostrarPrecios);

  /**
   * Cargar datos del vale desde BD
   */

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 10000; // 10 segundos

    const fetchVale = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(
          `[VisualizarVale] Intentando cargar vale: ${folio} (intento ${retryCount + 1}/${MAX_RETRIES + 1})`,
        );

        // Crear controlador de timeout para móviles
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log("[VisualizarVale] ⏱️ Timeout alcanzado, abortando...");
          controller.abort();
        }, TIMEOUT_MS);

        const { data, error: fetchError } = await supabase
          .from("vales")
          .select(
            `
            *,
            total_descargas_web,
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
              material:id_material (
                material,
                tipo_de_material:id_tipo_de_material (
                  tipo_de_material
                )
              ),
              bancos:id_banco (
                banco
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
              sindicatos:id_sindicato (
                sindicato
              ),
              precios_renta:id_precios_renta (
                costo_hr,
                costo_dia
              )
            )
          `,
          )
          .eq("folio", folio)
          .abortSignal(controller.signal)
          .single();

        // Limpiar timeout si la petición terminó antes
        clearTimeout(timeoutId);

        if (fetchError) {
          // Detectar si fue timeout
          const isTimeout =
            fetchError.message?.includes("aborted") ||
            fetchError.message?.includes("timeout") ||
            fetchError.name === "AbortError";

          // Si fue timeout y aún hay reintentos disponibles
          if (isTimeout && retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(
              `⚠️ Timeout detectado, reintentando en ${retryCount} segundos...`,
            );

            // Esperar más tiempo en cada reintento (1s, 2s, 3s)
            setTimeout(() => {
              if (isMounted) {
                fetchVale();
              }
            }, 1000 * retryCount);
            return;
          }

          // Si no hay más reintentos o es otro tipo de error
          console.error("[VisualizarVale] Error en query:", fetchError);
          throw fetchError;
        }

        if (!data) {
          console.log("[VisualizarVale] Vale no encontrado");
          setError("Vale no encontrado");
          return;
        }

        console.log("[VisualizarVale] ✅ Vale encontrado:", data.folio);

        // Solo actualizar estado si el componente sigue montado
        if (isMounted) {
          setVale(data);
          // Registrar acceso (sin esperar respuesta)
          registrarAcceso(data.id_vale);
        }
      } catch (error) {
        console.error("[VisualizarVale] Error al cargar vale:", error);

        // Solo actualizar estado si el componente sigue montado
        if (isMounted) {
          // Mensajes de error más específicos
          if (
            error.name === "AbortError" ||
            error.message?.includes("aborted")
          ) {
            setError(
              "La conexión está tardando demasiado. Por favor, verifica tu conexión a internet y vuelve a escanear el código QR.",
            );
          } else if (error.code === "PGRST116") {
            setError("Vale no encontrado en el sistema.");
          } else {
            setError("Error al cargar el vale. Por favor, intenta nuevamente.");
          }
        }
      } finally {
        // Solo actualizar loading si el componente sigue montado
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (folio) {
      fetchVale();
    }

    // Cleanup: prevenir actualizaciones de estado en componente desmontado
    return () => {
      isMounted = false;
    };
  }, [folio]);

  /**
   * Registrar acceso al vale (auditoría)
   */
  const registrarAcceso = async (idVale) => {
    try {
      await supabase.from("vale_accesos").insert({
        id_vale: idVale,
        id_persona: null, // Acceso público
        tipo_accion: "visualizacion_publica",
        ip_address: null,
        user_agent: navigator.userAgent,
      });

      console.log("[VisualizarVale] Acceso registrado");
    } catch (error) {
      // No bloqueamos si falla el registro
      console.error("[VisualizarVale] Error al registrar acceso:", error);
    }
  };

  /**
   * Manejar login desde el modal
   */
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoginLoading(true);
      setLoginError(null);

      // Intentar iniciar sesión
      const { error } = await signIn(loginEmail, loginPassword);

      if (error) {
        setLoginError(error.message || "Credenciales inválidas");
        return;
      }

      // Si login exitoso, cerrar modal
      setShowLoginModal(false);
      setLoginEmail("");
      setLoginPassword("");

      // Recargar datos del vale para verificar permisos
      // (el useEffect se ejecutará automáticamente al cambiar user)
    } catch (error) {
      console.error("[VisualizarVale] Error en login:", error);
      setLoginError("Error al iniciar sesión. Intenta nuevamente.");
    } finally {
      setLoginLoading(false);
    }
  };

  /**
   * Cerrar modal de login
   */
  const handleCloseModal = () => {
    setShowLoginModal(false);
    setLoginEmail("");
    setLoginPassword("");
    setLoginError(null);
  };

  /**
   * Descargar PDF con marca de agua (registra descarga sin límites)
   */
  const handleDescargarPDF = async () => {
    try {
      setDownloadingPDF(true);

      // Registrar descarga en BD
      const { data, error } = await supabase.rpc(
        "registrar_descarga_vale_web",
        {
          p_folio: folio,
          p_user_agent: navigator.userAgent,
        },
      );

      if (error) {
        console.error("[VisualizarVale] Error al registrar descarga:", error);
        // Continuar con la descarga aunque falle el registro
      }

      // Generar PDF
      if (vale.tipo_vale === "material") {
        generarPDFMaterialPublico(vale);
      } else {
        generarPDFRentaPublico(vale);
      }

      console.log(
        `✅ Descarga registrada. Total: ${data?.total_descargas || "?"}`,
      );
    } catch (error) {
      console.error("[VisualizarVale] Error al descargar:", error);
      alert("Error al descargar PDF. Intente nuevamente.");
    } finally {
      setDownloadingPDF(false);
    }
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
          <div className="info-row">
            <span className="info-label">Fecha:</span>
            <span className="info-value">
              {formatearFechaCorta(vale.fecha_creacion)}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Hora:</span>
            <span className="info-value">
              {formatearHora(vale.fecha_creacion)}
            </span>
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

          {/* Botón para iniciar sesión si no está autenticado */}
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

          {/* Mensaje si está autenticado pero no tiene permisos */}
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
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Iniciar Sesión</h3>
              <button
                className="modal-close"
                onClick={handleCloseModal}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              {loginError && (
                <div className="login-error">
                  <span>{loginError}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Correo Electrónico</label>
                <input
                  id="email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <div className="password-input">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={loginLoading}
                style={{ backgroundColor: colors.primary }}
              >
                {loginLoading ? (
                  <>
                    <Loader2 size={20} className="spinner" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    Iniciar Sesión
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================================
// COMPONENTE: DETALLES DE MATERIAL
// ========================================

const DetallesMaterial = ({ detalle, mostrarPrecios }) => {
  return (
    <div className="vale-section">
      <h3 className="section-title">DATOS DE VALE</h3>

      <div className="info-full">
        <span className="info-label">Material:</span>
        <span className="info-value">
          {detalle.material?.material || "N/A"}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Capacidad:</span>
        <span className="info-value">
          {formatearVolumen(detalle.capacidad_m3)}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Distancia:</span>
        <span className="info-value">{detalle.distancia_km || 0} Km</span>
      </div>

      <div className="divider-thin"></div>

      <div className="info-row">
        <span className="info-label">Cantidad Pedida:</span>
        <span className="info-value">
          {formatearVolumen(detalle.cantidad_pedida_m3)}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Requisición:</span>
        <span className="info-value">{detalle.requisicion || "N/A"}</span>
      </div>

      {detalle.folio_banco && (
        <div className="info-row">
          <span className="info-label">Folio Banco:</span>
          <span className="info-value">{detalle.folio_banco}</span>
        </div>
      )}

      {detalle.peso_ton && (
        <div className="info-row">
          <span className="info-label">Peso:</span>
          <span className="info-value">{formatearPeso(detalle.peso_ton)}</span>
        </div>
      )}

      {detalle.volumen_real_m3 && (
        <div className="info-row">
          <span className="info-label">Volumen Real:</span>
          <span className="info-value">
            {formatearVolumen(detalle.volumen_real_m3)}
          </span>
        </div>
      )}

      {/* PRECIOS (solo si tiene permiso) */}
      {mostrarPrecios && detalle.costo_total && (
        <>
          <div className="divider-thin"></div>

          {detalle.tarifa_primer_km && (
            <div className="info-row">
              <span className="info-label">Tarifa 1er Km:</span>
              <span className="info-value">
                {formatearMoneda(detalle.tarifa_primer_km)}
              </span>
            </div>
          )}

          {detalle.tarifa_subsecuente && (
            <div className="info-row">
              <span className="info-label">Tarifa Subsecuente:</span>
              <span className="info-value">
                {formatearMoneda(detalle.tarifa_subsecuente)}/km
              </span>
            </div>
          )}

          {detalle.precio_m3 && (
            <div className="info-row">
              <span className="info-label">Precio/m³:</span>
              <span className="info-value">
                {formatearMoneda(detalle.precio_m3)}
              </span>
            </div>
          )}

          <div className="info-row info-row-total">
            <span className="info-label">Costo Total:</span>
            <span className="info-value">
              {formatearMoneda(detalle.costo_total)} MXN
            </span>
          </div>
        </>
      )}
    </div>
  );
};

// ========================================
// COMPONENTE: DETALLES DE RENTA
// ========================================

const DetallesRenta = ({ detalle, mostrarPrecios }) => {
  // MODIFICADO: Detectar renta por día si total_dias > 0
  const totalDias = Number(detalle.total_dias || 0);
  const esRentaPorDia = totalDias > 0;

  return (
    <div className="vale-section">
      <h3 className="section-title">SERVICIO DE RENTA</h3>

      <div className="info-full">
        <span className="info-label">Material Movido:</span>
        <span className="info-value">
          {detalle.material?.material || "N/A"}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Capacidad:</span>
        <span className="info-value">
          {formatearVolumen(detalle.capacidad_m3)}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Núm. Viajes:</span>
        <span className="info-value">{detalle.numero_viajes || 1}</span>
      </div>

      <div className="divider-thin"></div>

      <div className="info-row">
        <span className="info-label">Hora Inicio:</span>
        <span className="info-value">
          {detalle.hora_inicio ? formatearHora(detalle.hora_inicio) : "N/A"}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Hora Fin:</span>
        <span className="info-value">
          {esRentaPorDia
            ? "Día completo"
            : detalle.hora_fin
              ? formatearHora(detalle.hora_fin)
              : "Pendiente"}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Total Horas:</span>
        <span className="info-value">
          {esRentaPorDia ? "N/A" : `${detalle.total_horas || 0} hrs`}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Total Días:</span>
        <span className="info-value">
          {esRentaPorDia
            ? totalDias === 0.5
              ? "0.5 días (medio día)"
              : `${totalDias} ${totalDias === 1 ? "día" : "días"}`
            : "N/A"}
        </span>
      </div>

      <div className="divider-thin"></div>

      {/* PRECIOS (solo si tiene permiso) */}
      {mostrarPrecios && (
        <>
          <div className="divider-thin"></div>

          {detalle.precios_renta?.costo_hr && (
            <div className="info-row">
              <span className="info-label">Tarifa/Hora:</span>
              <span className="info-value">
                {formatearMoneda(detalle.precios_renta.costo_hr)}
              </span>
            </div>
          )}

          {detalle.precios_renta?.costo_dia && (
            <div className="info-row">
              <span className="info-label">Tarifa/Día:</span>
              <span className="info-value">
                {formatearMoneda(detalle.precios_renta.costo_dia)}
              </span>
            </div>
          )}

          {detalle.costo_total && (
            <div className="info-row info-row-total">
              <span className="info-label">Costo Total:</span>
              <span className="info-value">
                {formatearMoneda(detalle.costo_total)} MXN
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VisualizarVale;
