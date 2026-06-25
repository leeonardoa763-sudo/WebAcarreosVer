/**
 * src/App.jsx
 *
 * Componente principal con router
 *
 * Define todas las rutas de la aplicación
 * Envuelve la app con AuthProvider
 * Rutas protegidas con ProtectedRoute
 */

// 1. React Router
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// 2. Config y Context
import { AuthProvider } from "./hooks/useAuth";

// 3. Componentes
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Layout from "./components/layout/Layout";

// 4. Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardUnificado from "./pages/DashboardUnificado";
import Vales from "./pages/Vales";
import Conciliaciones from "./pages/Conciliaciones";
import Contabilidad from "./pages/Contabilidad";
import VerificarVales from "./pages/VerificarVales";
import VisualizarVale from "./pages/VisualizarVale";
import VisualizarConciliacion from "./pages/VisualizarConciliacion";
import Operadores from "./pages/Operadores";
import HistorialConciliaciones from "./pages/HistorialConciliaciones";

// 5. Estilos
import "./styles/global.css";

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública - Login */}
          <Route path="/login" element={<Login />} />

          {/* Ruta raíz - Redirige a dashboard unificado */}
          <Route path="/" element={<Navigate to="/dashboard-unificado" replace />} />

          {/* Dashboard Unificado - todos los roles autenticados */}
          <Route
            path="/dashboard-unificado"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardUnificado />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Dashboard (analytics) - solo Administrador */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="Administrador">
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Operadores - Administrador y Sindicato */}
          <Route
            path="/operadores"
            element={
              <ProtectedRoute requiredRole={["Administrador", "Sindicato"]}>
                <Layout>
                  <Operadores />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Vales - todos los roles autenticados */}
          <Route
            path="/vales"
            element={
              <ProtectedRoute>
                <Layout>
                  <Vales />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Verificar Vales - todos los roles autenticados */}
          <Route
            path="/verificar-vales"
            element={
              <ProtectedRoute>
                <Layout>
                  <VerificarVales />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Conciliaciones - todos los roles autenticados */}
          <Route
            path="/conciliaciones"
            element={
              <ProtectedRoute>
                <Layout>
                  <Conciliaciones />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Historial de Conciliaciones - todos los roles autenticados */}
          <Route
            path="/historial-conciliaciones"
            element={
              <ProtectedRoute>
                <Layout>
                  <HistorialConciliaciones />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Contabilidad - Administrador y Finanzas */}
          <Route
            path="/contabilidad"
            element={
              <ProtectedRoute requiredRole={["Administrador", "Finanzas"]}>
                <Layout>
                  <Contabilidad />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* RUTA PÚBLICA - Visualización de vale sin autenticación */}
          <Route path="/vale/:folio" element={<VisualizarVale />} />

          {/* RUTA PÚBLICA - Soporte de conciliación sin autenticación */}
          <Route path="/conciliacion/:folio" element={<VisualizarConciliacion />} />

          {/* Ruta 404 - Redirige a dashboard unificado */}
          <Route path="*" element={<Navigate to="/dashboard-unificado" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
