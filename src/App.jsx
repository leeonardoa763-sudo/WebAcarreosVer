/**
 * src/App.jsx
 *
 * Componente principal con router
 *
 * Define todas las rutas de la aplicación
 * Envuelve la app con AuthProvider
 * Rutas protegidas con ProtectedRoute
 */

// 1. React y hooks
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

// 5. Estilos
import "./styles/global.css";

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública - Login */}
          <Route path="/login" element={<Login />} />

          {/* Ruta raíz - Redireccionar a dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Rutas protegidas - Requieren autenticación */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

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

          {/* Ruta pública - Verificación de vale sin auth */}
          <Route
            path="/vale/:folio"
            element={<div>Verificar Vale - Por implementar</div>}
          />

          {/* Ruta 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
