/**
 * src/components/conciliaciones/VerificarConciliacionAccion.jsx
 *
 * Acción de verificación de conciliación en la página pública (QR).
 * Muestra 4 estados: ya verificada / no logueado / logueado sin rol Administrador / Administrador sin verificar.
 *
 * Dependencias: useAuth, useVerificarConciliacion, LoginModal, VerificationConfirm
 * Usado en: VisualizarConciliacion.jsx
 */

// 1. React y hooks
import { useState } from "react";

// 2. Icons
import { CheckCircle2, LogIn, ShieldCheck } from "lucide-react";

// 3. Config
import { colors } from "../../config/colors";

// 4. Hooks personalizados
import { useAuth } from "../../hooks/useAuth";
import { useVerificarConciliacion } from "../../hooks/useVerificarConciliacion";

// 5. Componentes
import LoginModal from "../visualizar-vale/LoginModal";
import VerificationConfirm from "../verificacion/VerificationConfirm";

// 6. Utils
import { formatearFecha, formatearHora } from "../../utils/formatters";

const nombrePersona = (p) => {
  if (!p) return null;
  return `${p.nombre || ""} ${p.primer_apellido || ""}`.trim() || null;
};

const VerificarConciliacionAccion = ({ conciliacion, onVerificada }) => {
  const { user, hasRole } = useAuth();
  const { verificando, verificarConciliacion } = useVerificarConciliacion();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [errorLocal, setErrorLocal] = useState(null);

  const handleVerificar = async () => {
    setErrorLocal(null);
    const resultado = await verificarConciliacion(conciliacion.folio);
    if (resultado.success) {
      onVerificada();
    } else {
      setErrorLocal(resultado.error);
    }
  };

  // Ya verificada — mostrar quién y cuándo
  if (conciliacion.verificado) {
    return (
      <div className="vc-verificacion vc-verificacion--verificada">
        <CheckCircle2 size={20} color={colors.accent} />
        <span>
          Verificada por {nombrePersona(conciliacion.persona_verificador) || "un administrador"}
          {conciliacion.fecha_verificacion && (
            <>
              {" "}
              el {formatearFecha(conciliacion.fecha_verificacion)} a las{" "}
              {formatearHora(conciliacion.fecha_verificacion)}
            </>
          )}
        </span>
      </div>
    );
  }

  // No logueado — invitar a iniciar sesión
  if (!user) {
    return (
      <div className="vc-verificacion">
        <button
          className="vc-verificacion__login-btn"
          onClick={() => setShowLoginModal(true)}
          style={{ borderColor: colors.primary, color: colors.primary }}
        >
          <LogIn size={18} />
          Iniciar sesión para verificar
        </button>

        {showLoginModal && (
          <LoginModal onClose={() => setShowLoginModal(false)} />
        )}
      </div>
    );
  }

  // Logueado pero sin rol Administrador — no mostrar acción
  if (!hasRole("Administrador")) {
    return null;
  }

  // Administrador, pendiente de verificar
  return (
    <div className="vc-verificacion">
      <div className="vc-verificacion__aviso">
        <ShieldCheck size={18} color={colors.secondary} />
        <span>Esta conciliación aún no ha sido verificada.</span>
      </div>

      {errorLocal && <div className="vc-verificacion__error">{errorLocal}</div>}

      <VerificationConfirm
        onConfirm={handleVerificar}
        loading={verificando}
        itemLabel="conciliación"
      />
    </div>
  );
};

export default VerificarConciliacionAccion;
