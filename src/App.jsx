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
import Vales from "./pages/Vales";
import Conciliaciones from "./pages/Conciliaciones";
import VerificarVales from "./pages/VerificarVales";
import VisualizarVale from "./pages/VisualizarVale";
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

          {/* Ruta raíz - Redirige a vales (accesible por todos los roles) */}
          <Route path="/" element={<Navigate to="/vales" replace />} />

          {/* Dashboard - solo Administrador */}
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

          {/* Operadores - solo Administrador */}
          <Route
            path="/operadores"
            element={
              <ProtectedRoute requiredRole="Administrador">
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

          {/* RUTA PÚBLICA - Visualización de vale sin autenticación */}
          <Route path="/vale/:folio" element={<VisualizarVale />} />

          {/* Ruta 404 - Redirige a vales */}
          <Route path="*" element={<Navigate to="/vales" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
