/**
 * src/pages/DebugConciliaciones.jsx
 *
 * Componente de diagnóstico para probar el hook useConciliaciones
 *
 * Este componente NO es parte del flujo normal de la app
 * Solo para debugging y verificar que cada función del hook funcione
 *
 * Uso: Importar temporalmente en App.jsx con ruta /debug-conciliaciones
 */

// 1. React y hooks
import { useState, useEffect } from "react";

// 2. Hooks personalizados
import { useConciliaciones } from "../hooks/useConciliaciones";
import { useAuth } from "../hooks/useAuth";

// 3. Estilos inline (evitar crear CSS adicional)
const styles = {
  container: {
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "monospace",
  },
  section: {
    marginBottom: "30px",
    padding: "15px",
    border: "2px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#f9f9f9",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "10px",
    color: "#333",
  },
  button: {
    padding: "8px 16px",
    margin: "5px",
    backgroundColor: "#FF6B35",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  log: {
    backgroundColor: "#1e1e1e",
    color: "#00ff00",
    padding: "10px",
    borderRadius: "4px",
    maxHeight: "200px",
    overflowY: "auto",
    fontSize: "12px",
    whiteSpace: "pre-wrap",
  },
  success: {
    color: "#00ff00",
  },
  error: {
    color: "#ff4444",
  },
  warning: {
    color: "#ffaa00",
  },
  info: {
    color: "#00aaff",
  },
  select: {
    padding: "8px",
    margin: "5px",
    fontSize: "14px",
    borderRadius: "4px",
  },
};

const DebugConciliaciones = () => {
  const { userProfile } = useAuth();
  if (!userProfile) {
    return (
      <div style={styles.container}>
        <h1>⏳ Cargando sesión...</h1>
        <p>Espera un momento...</p>
      </div>
    );
  }

  const {
    conciliaciones,
    semanas,
    obras,
    loading,
    loadingCatalogos,
    error,
    filtros,
    updateFiltros,
    clearFiltros,
    vistaPrevia,
    cargarVistaPrevia,
    generarConciliacion,
    obtenerConciliacion,
    loadHistorial,
    helpers,
  } = useConciliaciones();

  const [logs, setLogs] = useState([]);
  const [testResults, setTestResults] = useState({});

  // Función auxiliar para agregar logs
  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString("es-MX");
    const newLog = {
      time: timestamp,
      message,
      type,
    };
    setLogs((prev) => [...prev, newLog]);
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  };

  const clearLogs = () => {
    setLogs([]);
    setTestResults({});
  };

  // ======================
  // PRUEBAS INDIVIDUALES
  // ======================

  /**
   * TEST 1: Verificar autenticación y perfil de usuario
   */
  const testAuth = () => {
    addLog("=== TEST 1: Autenticación y Perfil ===", "info");

    if (!userProfile) {
      addLog("❌ ERROR: No hay userProfile", "error");
      setTestResults((prev) => ({ ...prev, auth: false }));
      return;
    }

    addLog(`✅ Usuario: ${userProfile.nombre || "N/A"}`, "success");
    addLog(`✅ ID Persona: ${userProfile.id_persona}`, "success");
    addLog(`✅ ID Sindicato: ${userProfile.id_sindicato || "N/A"}`, "success");
    addLog(`✅ Rol: ${userProfile.role_nombre || "N/A"}`, "success");

    setTestResults((prev) => ({ ...prev, auth: true }));
  };

  /**
   * TEST 2: Cargar semanas con vales verificados
   */
  const testLoadSemanas = async () => {
    addLog("=== TEST 2: Cargar Semanas ===", "info");

    try {
      addLog("⏳ Iniciando carga de semanas...", "warning");

      // Las semanas ya se cargan automáticamente en el useEffect
      // Solo verificamos el resultado

      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!semanas || semanas.length === 0) {
        addLog(
          "⚠️ ADVERTENCIA: No hay semanas con vales verificados",
          "warning"
        );
        setTestResults((prev) => ({ ...prev, semanas: false }));
        return;
      }

      addLog(`✅ Se encontraron ${semanas.length} semanas`, "success");
      semanas.forEach((s, idx) => {
        addLog(
          `  - Semana ${idx + 1}: Sem ${s.numero}/${s.año} (${s.cantidadVales} vales) [${s.fechaInicio} - ${s.fechaFin}]`,
          "info"
        );
      });

      setTestResults((prev) => ({ ...prev, semanas: true }));
    } catch (error) {
      addLog(`❌ ERROR: ${error.message}`, "error");
      setTestResults((prev) => ({ ...prev, semanas: false }));
    }
  };

  /**
   * TEST 3: Cargar obras de una semana específica
   */
  const testLoadObras = async () => {
    addLog("=== TEST 3: Cargar Obras ===", "info");

    if (!filtros.semanaSeleccionada) {
      addLog("❌ ERROR: Debes seleccionar una semana primero", "error");
      setTestResults((prev) => ({ ...prev, obras: false }));
      return;
    }

    try {
      addLog(
        `⏳ Cargando obras para semana ${filtros.semanaSeleccionada.numero}/${filtros.semanaSeleccionada.año}...`,
        "warning"
      );

      // Las obras se cargan automáticamente cuando cambias la semana
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!obras || obras.length === 0) {
        addLog(
          "⚠️ ADVERTENCIA: No hay obras con vales en esta semana",
          "warning"
        );
        setTestResults((prev) => ({ ...prev, obras: false }));
        return;
      }

      addLog(`✅ Se encontraron ${obras.length} obras`, "success");
      obras.forEach((o, idx) => {
        addLog(
          `  - Obra ${idx + 1}: ${o.obra} (CC: ${o.cc}) - Empresa: ${o.empresa}`,
          "info"
        );
      });

      setTestResults((prev) => ({ ...prev, obras: true }));
    } catch (error) {
      addLog(`❌ ERROR: ${error.message}`, "error");
      setTestResults((prev) => ({ ...prev, obras: false }));
    }
  };

  /**
   * TEST 4: Cargar vista previa de vales
   */
  const testCargarVistaPrevia = async () => {
    addLog("=== TEST 4: Cargar Vista Previa ===", "info");

    if (!filtros.semanaSeleccionada || !filtros.obraSeleccionada) {
      addLog("❌ ERROR: Debes seleccionar semana Y obra primero", "error");
      setTestResults((prev) => ({ ...prev, vistaPrevia: false }));
      return;
    }

    try {
      addLog("⏳ Cargando vista previa de vales...", "warning");

      await cargarVistaPrevia();

      // AUMENTAR el timeout para dar tiempo a React
      await new Promise((resolve) => setTimeout(resolve, 3000)); // ← De 1000 a 2000

      if (vistaPrevia.error) {
        addLog(`❌ ERROR en vista previa: ${vistaPrevia.error}`, "error");
        setTestResults((prev) => ({ ...prev, vistaPrevia: false }));
        return;
      }

      if (
        !vistaPrevia.valesOriginales ||
        vistaPrevia.valesOriginales.length === 0
      ) {
        addLog("⚠️ ADVERTENCIA: No hay vales para esta selección", "warning");
        setTestResults((prev) => ({ ...prev, vistaPrevia: false }));
        return;
      }

      addLog(
        `✅ Vales encontrados: ${vistaPrevia.valesOriginales.length}`,
        "success"
      );
      addLog(
        `✅ Grupos por placas: ${Object.keys(vistaPrevia.valesAgrupados).length}`,
        "success"
      );

      if (vistaPrevia.totalesGenerales) {
        addLog("✅ Totales Generales:", "success");
        addLog(
          `  - Subtotal: $${vistaPrevia.totalesGenerales.subtotal.toLocaleString("es-MX")}`,
          "info"
        );
        addLog(
          `  - IVA: $${vistaPrevia.totalesGenerales.iva.toLocaleString("es-MX")}`,
          "info"
        );
        addLog(
          `  - Total: $${vistaPrevia.totalesGenerales.total.toLocaleString("es-MX")}`,
          "info"
        );
        addLog(
          `  - Total Días: ${vistaPrevia.totalesGenerales.totalDias}`,
          "info"
        );
        addLog(
          `  - Total Horas: ${vistaPrevia.totalesGenerales.totalHoras}`,
          "info"
        );
      }

      // Mostrar detalles de grupos
      Object.entries(vistaPrevia.valesAgrupados).forEach(([placas, grupo]) => {
        addLog(`  📋 Placas: ${placas}`, "info");
        addLog(`     - Vales: ${grupo.vales.length}`, "info");
        addLog(
          `     - Días: ${grupo.totalDias}, Horas: ${grupo.totalHoras}`,
          "info"
        );
        addLog(
          `     - Subtotal: $${grupo.subtotal.toLocaleString("es-MX")}`,
          "info"
        );
      });

      setTestResults((prev) => ({ ...prev, vistaPrevia: true }));
    } catch (error) {
      addLog(`❌ ERROR: ${error.message}`, "error");
      setTestResults((prev) => ({ ...prev, vistaPrevia: false }));
    }
  };

  /**
   * TEST 5: Generar conciliación (CUIDADO: Escribe en BD)
   */
  const testGenerarConciliacion = async () => {
    addLog("=== TEST 5: Generar Conciliación ===", "warning");
    addLog(
      "⚠️ ADVERTENCIA: Esta operación ESCRIBE EN LA BASE DE DATOS",
      "warning"
    );

    if (
      !vistaPrevia.valesOriginales ||
      vistaPrevia.valesOriginales.length === 0
    ) {
      addLog("❌ ERROR: No hay vales en la vista previa", "error");
      setTestResults((prev) => ({ ...prev, generar: false }));
      return;
    }

    const confirmar = window.confirm(
      "¿Estás seguro de generar esta conciliación?\n\n" +
        'Esto escribirá en la base de datos y actualizará los vales a estado "conciliado".'
    );

    if (!confirmar) {
      addLog("❌ Operación cancelada por el usuario", "error");
      return;
    }

    try {
      addLog("⏳ Generando conciliación...", "warning");

      const resultado = await generarConciliacion();

      if (!resultado.success) {
        addLog(`❌ ERROR: ${resultado.error}`, "error");
        setTestResults((prev) => ({ ...prev, generar: false }));
        return;
      }

      addLog("✅ ¡Conciliación generada exitosamente!", "success");
      addLog(`✅ Folio: ${resultado.data.folio}`, "success");
      addLog(`✅ ID: ${resultado.data.id_conciliacion}`, "success");
      addLog(
        `✅ Total: $${resultado.data.total_final.toLocaleString("es-MX")}`,
        "success"
      );

      setTestResults((prev) => ({ ...prev, generar: true }));
    } catch (error) {
      addLog(`❌ ERROR: ${error.message}`, "error");
      setTestResults((prev) => ({ ...prev, generar: false }));
    }
  };

  /**
   * TEST 6: Cargar historial de conciliaciones
   */
  const testLoadHistorial = async () => {
    addLog("=== TEST 6: Cargar Historial ===", "info");

    try {
      addLog("⏳ Cargando historial de conciliaciones...", "warning");

      await loadHistorial();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!conciliaciones || conciliaciones.length === 0) {
        addLog("⚠️ ADVERTENCIA: No hay conciliaciones generadas", "warning");
        setTestResults((prev) => ({ ...prev, historial: false }));
        return;
      }

      addLog(
        `✅ Se encontraron ${conciliaciones.length} conciliaciones`,
        "success"
      );
      conciliaciones.slice(0, 5).forEach((c, idx) => {
        addLog(
          `  - ${idx + 1}. ${c.folio} - ${c.obras?.obra} - $${c.total_final.toLocaleString("es-MX")} - ${c.estado}`,
          "info"
        );
      });

      if (conciliaciones.length > 5) {
        addLog(`  ... y ${conciliaciones.length - 5} más`, "info");
      }

      setTestResults((prev) => ({ ...prev, historial: true }));
    } catch (error) {
      addLog(`❌ ERROR: ${error.message}`, "error");
      setTestResults((prev) => ({ ...prev, historial: false }));
    }
  };

  /**
   * TEST 7: Obtener conciliación existente
   */
  const testObtenerConciliacion = async () => {
    addLog("=== TEST 7: Obtener Conciliación Existente ===", "info");

    if (!conciliaciones || conciliaciones.length === 0) {
      addLog("❌ ERROR: Primero carga el historial (Test 6)", "error");
      setTestResults((prev) => ({ ...prev, obtener: false }));
      return;
    }

    try {
      const primeraConc = conciliaciones[0];
      addLog(`⏳ Obteniendo conciliación ${primeraConc.folio}...`, "warning");

      const resultado = await obtenerConciliacion(primeraConc.id_conciliacion);

      if (!resultado.success) {
        addLog(`❌ ERROR: ${resultado.error}`, "error");
        setTestResults((prev) => ({ ...prev, obtener: false }));
        return;
      }

      addLog("✅ Conciliación obtenida correctamente", "success");
      addLog(`✅ Folio: ${resultado.data.conciliacion.folio}`, "success");
      addLog(
        `✅ Vales incluidos: ${resultado.data.conciliacion.vales.length}`,
        "success"
      );
      addLog(
        `✅ Grupos por placas: ${Object.keys(resultado.data.gruposPorPlacas).length}`,
        "success"
      );

      setTestResults((prev) => ({ ...prev, obtener: true }));
    } catch (error) {
      addLog(`❌ ERROR: ${error.message}`, "error");
      setTestResults((prev) => ({ ...prev, obtener: false }));
    }
  };

  /**
   * EJECUTAR TODOS LOS TESTS (excepto generar)
   */
  const runAllTests = async () => {
    clearLogs();
    addLog("🚀 Iniciando batería completa de pruebas...", "info");
    addLog("", "info");

    testAuth();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testLoadSemanas();
    await new Promise((resolve) => setTimeout(resolve, 500));

    addLog("", "info");
    addLog("⚠️ Ahora selecciona una SEMANA y una OBRA manualmente", "warning");
    addLog("⚠️ Luego ejecuta los tests 3, 4, 5 individualmente", "warning");
  };

  // Cargar semanas automáticamente al montar
  useEffect(() => {
    if (userProfile?.id_persona) {
      addLog(
        "✅ Componente montado, semanas cargándose automáticamente...",
        "info"
      );
    }
  }, [userProfile]);

  // ======================
  // RENDER
  // ======================

  return (
    <div style={styles.container}>
      <h1>🔧 Diagnóstico de Conciliaciones</h1>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Componente temporal para probar el hook useConciliaciones
      </p>

      {/* SECCIÓN: Estados Globales */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>📊 Estados Globales</div>
        <pre style={{ fontSize: "12px" }}>
          {JSON.stringify(
            {
              loading,
              loadingCatalogos,
              error,
              cantidadSemanas: semanas?.length || 0,
              cantidadObras: obras?.length || 0,
              cantidadConciliaciones: conciliaciones?.length || 0,
              filtros: {
                semana: filtros.semanaSeleccionada?.numero || null,
                año: filtros.semanaSeleccionada?.año || null,
                obra: filtros.obraSeleccionada || null,
              },
              vistaPrevia: {
                cargada: !!vistaPrevia.valesOriginales?.length,
                cantidadVales: vistaPrevia.valesOriginales?.length || 0,
                loading: vistaPrevia.loading,
                error: vistaPrevia.error,
              },
            },
            null,
            2
          )}
        </pre>
      </div>

      {/* SECCIÓN: Controles de Prueba */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>🎮 Controles de Prueba</div>

        <div style={{ marginBottom: "15px" }}>
          <button style={styles.button} onClick={testAuth}>
            Test 1: Autenticación
          </button>
          <button style={styles.button} onClick={testLoadSemanas}>
            Test 2: Cargar Semanas
          </button>
          <button style={styles.button} onClick={testLoadObras}>
            Test 3: Cargar Obras
          </button>
          <button style={styles.button} onClick={testCargarVistaPrevia}>
            Test 4: Vista Previa
          </button>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <button
            style={{ ...styles.button, backgroundColor: "#ff9800" }}
            onClick={testGenerarConciliacion}
          >
            Test 5: ⚠️ Generar Conciliación (BD)
          </button>
          <button style={styles.button} onClick={testLoadHistorial}>
            Test 6: Cargar Historial
          </button>
          <button style={styles.button} onClick={testObtenerConciliacion}>
            Test 7: Obtener Existente
          </button>
        </div>

        <div>
          <button
            style={{ ...styles.button, backgroundColor: "#4CAF50" }}
            onClick={runAllTests}
          >
            ▶️ Ejecutar Tests 1-2
          </button>
          <button
            style={{ ...styles.button, backgroundColor: "#f44336" }}
            onClick={clearLogs}
          >
            🗑️ Limpiar Logs
          </button>
          <button
            style={{ ...styles.button, backgroundColor: "#9E9E9E" }}
            onClick={clearFiltros}
          >
            🔄 Limpiar Filtros
          </button>
        </div>
      </div>

      {/* SECCIÓN: Selectores (para tests manuales) */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>⚙️ Selectores Manuales</div>

        <div>
          <label>Semana:</label>
          <select
            style={styles.select}
            value={filtros.semanaSeleccionada?.numero || ""}
            onChange={(e) => {
              const semana = semanas.find(
                (s) => s.numero === parseInt(e.target.value)
              );
              updateFiltros({ semanaSeleccionada: semana });
              addLog(
                `Semana seleccionada: ${semana?.numero}/${semana?.año}`,
                "info"
              );
            }}
          >
            <option value="">Selecciona una semana</option>
            {semanas.map((s) => (
              <option key={`${s.año}-${s.numero}`} value={s.numero}>
                Semana {s.numero}/{s.año} ({s.cantidadVales} vales)
              </option>
            ))}
          </select>

          <label style={{ marginLeft: "15px" }}>Obra:</label>
          <select
            style={styles.select}
            value={filtros.obraSeleccionada || ""}
            onChange={(e) => {
              const obraId = parseInt(e.target.value);
              updateFiltros({ obraSeleccionada: obraId });
              const obra = obras.find((o) => o.id_obra === obraId);
              addLog(`Obra seleccionada: ${obra?.obra}`, "info");
            }}
            disabled={!filtros.semanaSeleccionada}
          >
            <option value="">Selecciona una obra</option>
            {obras.map((o) => (
              <option key={o.id_obra} value={o.id_obra}>
                {o.obra} ({o.empresa})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECCIÓN: Resultados de Tests */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>✅ Resultados de Tests</div>
        <div style={{ fontSize: "14px" }}>
          {Object.entries(testResults).map(([test, passed]) => (
            <div key={test} style={{ marginBottom: "5px" }}>
              {passed ? "✅" : "❌"} {test}
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN: Logs */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>📝 Logs en Tiempo Real</div>
        <div style={styles.log}>
          {logs.length === 0 && (
            <div style={{ color: "#888" }}>
              Ejecuta algún test para ver logs aquí...
            </div>
          )}
          {logs.map((log, idx) => (
            <div key={idx} style={{ color: styles[log.type]?.color }}>
              [{log.time}] {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DebugConciliaciones;
