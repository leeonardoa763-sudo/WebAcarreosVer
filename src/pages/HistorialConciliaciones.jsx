/**
 * src/pages/HistorialConciliaciones.jsx
 *
 * Página de historial de conciliaciones
 * Accesible para Administrador y Sindicato
 *
 * Dependencias: SeccionConciliaciones, useAuth
 * Usado en: App.jsx (ruta /historial-conciliaciones)
 */

// 1. React y hooks
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 2. Hooks personalizados
import { useAuth } from "../hooks/useAuth";

// 3. Componentes
import SeccionConciliaciones from "../components/dashboard/SeccionConciliaciones";

// 4. Config
import { colors } from "../config/colors";

const ROLES_PERMITIDOS = ["Administrador", "Sindicato"];

const HistorialConciliaciones = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const rol = userProfile?.roles?.role;
    if (rol && !ROLES_PERMITIDOS.includes(rol)) {
      navigate("/vales", { replace: true });
    }
  }, [userProfile, navigate]);

  return (
    <div style={{ padding: "24px" }}>
      <header style={{ marginBottom: "24px" }}>
        <h1 style={{ color: colors.text, fontSize: "24px", fontWeight: 700 }}>
          Historial de Conciliaciones
        </h1>
        <p style={{ color: colors.textSecondary, marginTop: "4px" }}>
          Consulta todas las conciliaciones registradas
        </p>
      </header>

      <SeccionConciliaciones />
    </div>
  );
};

export default HistorialConciliaciones;
