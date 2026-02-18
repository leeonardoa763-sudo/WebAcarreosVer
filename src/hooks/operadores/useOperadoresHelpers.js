/**
 * src/hooks/operadores/useOperadoresHelpers.js
 *
 * Funciones auxiliares para la página de Operadores
 *
 * Funcionalidades:
 * - Formateo de números y fechas
 * - Obtener colores por empresa
 * - Obtener etiquetas de estado
 * - Exportar a Excel
 * - Validaciones
 *
 * Dependencias: colors.js
 * Usado en: useOperadores.js
 */

// 1. Config
import { colors } from "../../config/colors";

/**
 * Obtener color según empresa
 */
export const obtenerColorEmpresa = (nombreEmpresa) => {
  if (!nombreEmpresa) return colors.gray;

  const empresa = nombreEmpresa.toUpperCase();

  if (empresa.includes("CAPAM")) return colors.capam;
  if (empresa.includes("TRIACO")) return colors.triaco;
  if (empresa.includes("COEDESSA")) return colors.coedessa;

  return colors.gray;
};

/**
 * Obtener etiqueta legible del estado
 */
export const obtenerEtiquetaEstado = (estado) => {
  const etiquetas = {
    borrador: "Borrador",
    en_proceso: "En Proceso",
    emitido: "Emitido",
    verificado: "Verificado",
    pagado: "Pagado",
    conciliado: "Conciliado",
    archivado: "Archivado",
    sin_estado: "Sin Estado",
  };

  return etiquetas[estado] || estado;
};

/**
 * Obtener color del estado
 */
export const obtenerColorEstado = (estado) => {
  const colores = {
    borrador: "#94A3B8", // Gris
    en_proceso: "#3B82F6", // Azul
    emitido: "#8B5CF6", // Púrpura
    verificado: "#10B981", // Verde
    pagado: "#059669", // Verde oscuro
    conciliado: "#0891B2", // Cyan
    archivado: "#6B7280", // Gris oscuro
    sin_estado: "#9CA3AF", // Gris claro
  };

  return colores[estado] || "#9CA3AF";
};

/**
 * Obtener componente de ícono del estado (lucide-react)
 * Retorna el nombre del ícono para usar con lucide-react
 */
export const obtenerIconoEstado = (estado) => {
  const iconos = {
    borrador: "FileEdit", // Archivo editándose
    en_proceso: "Clock", // Reloj
    emitido: "FileText", // Documento
    verificado: "CheckCircle", // Check verde
    pagado: "DollarSign", // Signo de dólar
    conciliado: "FileCheck", // Archivo con check
    archivado: "Archive", // Caja de archivo
    sin_estado: "HelpCircle", // Interrogación
  };

  return iconos[estado] || "File";
};

/**
 * Formatear número con separadores de miles y decimales
 */
export const formatearNumero = (numero, decimales = 2) => {
  if (numero === null || numero === undefined) return "0.00";

  const num = Number(numero);
  if (isNaN(num)) return "0.00";

  return num.toLocaleString("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
};

/**
 * Formatear fecha a formato legible
 */
export const formatearFecha = (fecha) => {
  if (!fecha) return "Sin fecha";

  const date = new Date(fecha);
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Formatear fecha corta (DD/MM/YYYY)
 */
export const formatearFechaCorta = (fecha) => {
  if (!fecha) return "Sin fecha";

  const date = new Date(fecha);
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

/**
 * Formatear hora (HH:MM)
 */
export const formatearHora = (fecha) => {
  if (!fecha) return "Sin hora";

  const date = new Date(fecha);
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Validar si hay filtros activos
 */
export const validarFiltrosActivos = (filtros) => {
  return (
    filtros.fecha_inicio ||
    filtros.fecha_fin ||
    filtros.id_empresa ||
    filtros.id_obra ||
    filtros.id_sindicato ||
    filtros.searchTerm
  );
};

/**
 * Preparar datos de MATERIAL para exportar a Excel en formato tabla plana
 * Una fila por vale (repitiendo empresa, placas, obra en cada renglón)
 */
export const prepararDatosExcelMaterial = (datos) => {
  const filas = [];

  datos.forEach((empresa) => {
    const nombreEmpresa = empresa.nombre_empresa || "";

    empresa.vehiculos.forEach((vehiculo) => {
      const placas = vehiculo.placas || "";

      vehiculo.porEstado.forEach((estadoGrupo) => {
        // Capitalizar primera letra del estado
        const estado =
          estadoGrupo.estado.charAt(0).toUpperCase() +
          estadoGrupo.estado.slice(1).replace("_", " ");

        estadoGrupo.vales.forEach((vale) => {
          // Formatear fecha dd/mm/yyyy
          const fechaRaw = vale.fecha_creacion || "";
          const fecha = fechaRaw
            ? fechaRaw.split("T")[0].split("-").reverse().join("/")
            : "";

          const detalles = vale.vale_material_detalles || [];

          if (detalles.length === 0) {
            // Vale sin detalles: una fila vacía
            filas.push({
              Empresa: nombreEmpresa,
              Placas: placas,
              Estado: estado,
              Folio: vale.folio || "",
              Fecha: fecha,
              Obra: vale.obras?.obra || "",
              Material: "",
              "M³ Real": "",
              Operador: vale.operadores?.nombre_completo || "",
            });
          } else {
            detalles.forEach((detalle) => {
              filas.push({
                Empresa: nombreEmpresa,
                Placas: placas,
                Estado: estado,
                Folio: vale.folio || "",
                Fecha: fecha,
                Obra: vale.obras?.obra || "",
                Material: detalle.material?.material || "",
                "M³ Real":
                  detalle.volumen_real_m3 != null
                    ? Number(detalle.volumen_real_m3)
                    : "",
                Operador: vale.operadores?.nombre_completo || "",
              });
            });
          }
        });
      });
    });
  });

  return filas;
};

/**
 * Preparar datos de RENTA para exportar a Excel en formato tabla plana
 * Una fila por vale (repitiendo empresa, placas, obra en cada renglón)
 */
export const prepararDatosExcelRenta = (datos) => {
  const filas = [];

  datos.forEach((empresa) => {
    const nombreEmpresa = empresa.nombre_empresa || "";

    empresa.vehiculos.forEach((vehiculo) => {
      const placas = vehiculo.placas || "";

      vehiculo.porEstado.forEach((estadoGrupo) => {
        const estado =
          estadoGrupo.estado.charAt(0).toUpperCase() +
          estadoGrupo.estado.slice(1).replace("_", " ");

        estadoGrupo.vales.forEach((vale) => {
          const fechaRaw = vale.fecha_creacion || "";
          const fecha = fechaRaw
            ? fechaRaw.split("T")[0].split("-").reverse().join("/")
            : "";

          const detalles = vale.vale_renta_detalle || [];

          if (detalles.length === 0) {
            filas.push({
              Empresa: nombreEmpresa,
              Placas: placas,
              Estado: estado,
              Folio: vale.folio || "",
              Fecha: fecha,
              Obra: vale.obras?.obra || "",
              Material: "",
              "Num. Viajes": "",
              "Total Días": "",
              "Total Horas": "",
              Operador: vale.operadores?.nombre_completo || "",
            });
          } else {
            detalles.forEach((detalle) => {
              filas.push({
                Empresa: nombreEmpresa,
                Placas: placas,
                Estado: estado,
                Folio: vale.folio || "",
                Fecha: fecha,
                Obra: vale.obras?.obra || "",
                Material: detalle.material?.material || "",
                "Num. Viajes":
                  detalle.numero_viajes != null
                    ? Number(detalle.numero_viajes)
                    : "",
                "Total Días":
                  detalle.total_dias != null ? Number(detalle.total_dias) : "",
                "Total Horas":
                  detalle.total_horas != null
                    ? Number(detalle.total_horas)
                    : "",
                Operador: vale.operadores?.nombre_completo || "",
              });
            });
          }
        });
      });
    });
  });

  return filas;
};

/**
 * Generar nombre de archivo para exportación
 */
export const generarNombreArchivoExcel = (tipoVale, filtros) => {
  const fecha = new Date().toISOString().split("T")[0];
  let nombre = `Reporte_Operadores_${tipoVale}_${fecha}`;

  if (filtros.fecha_inicio && filtros.fecha_fin) {
    const inicio = new Date(filtros.fecha_inicio).toISOString().split("T")[0];
    const fin = new Date(filtros.fecha_fin).toISOString().split("T")[0];
    nombre += `_${inicio}_a_${fin}`;
  }

  return `${nombre}.xlsx`;
};
