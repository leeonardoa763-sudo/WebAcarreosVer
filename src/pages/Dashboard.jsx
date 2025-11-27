/**
 * src/pages/Dashboard.jsx
 *
 * Vista principal del dashboard administrativo
 *
 * Muestra estadísticas generales de vales emitidos
 * Gráficas de vales por obra y tipo
 * Lista de últimos vales creados
 *
 * Acceso: Solo ADMINISTRADOR, FINANZAS, SINDICATO
 */

// 1. React y hooks
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 2. Icons
import { FileText, Calendar, TrendingUp, CalendarDays } from "lucide-react";

// 3. Config
import { supabase } from "../config/supabase";

// 4. Hooks personalizados
import { useAuth } from "../hooks/useAuth";

// 5. Componentes
import StatsCard from "../components/dashboard/StatsCard";

// 6. Estilos
import "../styles/dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const { userProfile, canViewAllVales } = useAuth();
  const [stats, setStats] = useState({
    totalVales: 0,
    valesHoy: 0,
    valesSemana: 0,
    valesMes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Obtener estadísticas de vales
   */
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fechas para filtros
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const inicioSemana = new Date();
      inicioSemana.setDate(hoy.getDate() - 7);

      const inicioMes = new Date();
      inicioMes.setDate(1);

      // Query base
      let query = supabase
        .from("vales")
        .select("id_vale, fecha_creacion", { count: "exact" });

      // Filtrar por obra si no puede ver todos
      if (!canViewAllVales() && userProfile?.id_current_obra) {
        query = query.eq("id_obra", userProfile.id_current_obra);
      }

      // Total de vales
      const { count: totalVales } = await query;

      // Vales de hoy
      const { count: valesHoy } = await query.gte(
        "fecha_creacion",
        hoy.toISOString()
      );

      // Vales de la semana
      const { count: valesSemana } = await query.gte(
        "fecha_creacion",
        inicioSemana.toISOString()
      );

      // Vales del mes
      const { count: valesMes } = await query.gte(
        "fecha_creacion",
        inicioMes.toISOString()
      );

      setStats({
        totalVales: totalVales || 0,
        valesHoy: valesHoy || 0,
        valesSemana: valesSemana || 0,
        valesMes: valesMes || 0,
      });
    } catch (error) {
      console.error("Error en fetchStats:", error);
      setError("No se pudieron cargar las estadísticas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchStats();
    }
  }, [userProfile?.id_persona, canViewAllVales()]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1 className="dashboard__title">Dashboard</h1>
        <p className="dashboard__subtitle">Bienvenido, {userProfile?.nombre}</p>
      </div>

      <div className="dashboard__stats">
        <StatsCard
          title="Total Vales"
          value={stats.totalVales}
          Icon={FileText}
          color="#FF6B35"
        />
        <StatsCard
          title="Hoy"
          value={stats.valesHoy}
          Icon={Calendar}
          color="#004E89"
        />
        <StatsCard
          title="Esta Semana"
          value={stats.valesSemana}
          Icon={TrendingUp}
          color="#1A936F"
        />
        <StatsCard
          title="Este Mes"
          value={stats.valesMes}
          Icon={CalendarDays}
          color="#F59E0B"
        />
      </div>
    </div>
  );
};

export default Dashboard;
