/**
 * src/pages/Contabilidad.jsx
 *
 * Página de Contabilidad - vista de todas las conciliaciones con opción de pago
 * Accesible para Administrador y Finanzas
 *
 * Dependencias: TablaContabilidad, useAuth
 * Usado en: App.jsx (ruta /contabilidad)
 */

// 1. React y hooks
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 2. Hooks personalizados
import { useAuth } from "../hooks/useAuth";

// 3. Componentes
import TablaContabilidad from "../components/conciliaciones/TablaContabilidad";

// 4. Config
import { colors } from "../config/colors";

const ROLES_PERMITIDOS = ["Administrador", "Finanzas"];

const Contabilidad = () => {
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
          Contabilidad
        </h1>
        <p style={{ color: colors.textSecondary, marginTop: "4px" }}>
          Gestiona pagos de conciliaciones y registra facturas
        </p>
      </header>

      <TablaContabilidad />
    </div>
  );
};

export default Contabilidad;
