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
 * Preparar datos para exportar a Excel (Material)
 */
export const prepararDatosExcelMaterial = (datosAgrupados) => {
  const filas = [];

  datosAgrupados.forEach((empresa) => {
    // Fila de empresa
    filas.push({
      Empresa: empresa.nombre_empresa,
      Placas: "",
      Estado: "",
      Folio: "",
      Fecha: "",
      Obra: "",
      Material: "",
      "M³ Real": "",
      Operador: "",
      "Total Vehículos": empresa.totalVehiculos,
      "Total Viajes": empresa.totalViajes,
      "Total M³": formatearNumero(empresa.totalM3),
    });

    empresa.vehiculos.forEach((vehiculo) => {
      // Fila de vehículo
      filas.push({
        Empresa: "",
        Placas: vehiculo.placas,
        Estado: "",
        Folio: "",
        Fecha: "",
        Obra: "",
        Material: "",
        "M³ Real": "",
        Operador: "",
        "Total Vehículos": "",
        "Total Viajes": vehiculo.totalViajes,
        "Total M³": formatearNumero(vehiculo.totalM3),
      });

      vehiculo.porEstado.forEach((estadoGrupo) => {
        // Fila de estado
        filas.push({
          Empresa: "",
          Placas: "",
          Estado: obtenerEtiquetaEstado(estadoGrupo.estado),
          Folio: "",
          Fecha: "",
          Obra: "",
          Material: "",
          "M³ Real": "",
          Operador: "",
          "Total Vehículos": "",
          "Total Viajes": estadoGrupo.totalViajes,
          "Total M³": formatearNumero(estadoGrupo.totalM3),
        });

        estadoGrupo.vales.forEach((vale) => {
          const detalles = vale.vale_material_detalles || [];
          const totalM3Vale = detalles.reduce(
            (sum, d) => sum + (Number(d.volumen_real_m3) || 0),
            0
          );

          const materiales = detalles
            .map((d) => d.material?.material || "Sin material")
            .join(", ");

          // Fila de vale
          filas.push({
            Empresa: "",
            Placas: "",
            Estado: "",
            Folio: vale.folio,
            Fecha: formatearFechaCorta(vale.fecha_creacion),
            Obra: vale.obras?.obra || "Sin obra",
            Material: materiales,
            "M³ Real": formatearNumero(totalM3Vale),
            Operador: vale.operadores?.nombre_completo || "Sin operador",
            "Total Vehículos": "",
            "Total Viajes": "",
            "Total M³": "",
          });
        });
      });
    });

    // Fila vacía entre empresas
    filas.push({
      Empresa: "",
      Placas: "",
      Estado: "",
      Folio: "",
      Fecha: "",
      Obra: "",
      Material: "",
      "M³ Real": "",
      Operador: "",
      "Total Vehículos": "",
      "Total Viajes": "",
      "Total M³": "",
    });
  });

  return filas;
};

/**
 * Preparar datos para exportar a Excel (Renta)
 */
export const prepararDatosExcelRenta = (datosAgrupados) => {
  const filas = [];

  datosAgrupados.forEach((empresa) => {
    // Fila de empresa
    filas.push({
      Empresa: empresa.nombre_empresa,
      Placas: "",
      Estado: "",
      Folio: "",
      Fecha: "",
      Obra: "",
      Material: "",
      Días: "",
      Horas: "",
      Operador: "",
      "Total Vehículos": empresa.totalVehiculos,
      "Total Viajes": empresa.totalViajes,
      "Total Días": formatearNumero(empresa.totalDias),
      "Total Horas": formatearNumero(empresa.totalHoras),
    });

    empresa.vehiculos.forEach((vehiculo) => {
      // Fila de vehículo
      filas.push({
        Empresa: "",
        Placas: vehiculo.placas,
        Estado: "",
        Folio: "",
        Fecha: "",
        Obra: "",
        Material: "",
        Días: "",
        Horas: "",
        Operador: "",
        "Total Vehículos": "",
        "Total Viajes": vehiculo.totalViajes,
        "Total Días": formatearNumero(vehiculo.totalDias),
        "Total Horas": formatearNumero(vehiculo.totalHoras),
      });

      vehiculo.porEstado.forEach((estadoGrupo) => {
        // Fila de estado
        filas.push({
          Empresa: "",
          Placas: "",
          Estado: obtenerEtiquetaEstado(estadoGrupo.estado),
          Folio: "",
          Fecha: "",
          Obra: "",
          Material: "",
          Días: "",
          Horas: "",
          Operador: "",
          "Total Vehículos": "",
          "Total Viajes": estadoGrupo.totalViajes,
          "Total Días": formatearNumero(estadoGrupo.totalDias),
          "Total Horas": formatearNumero(estadoGrupo.totalHoras),
        });

        estadoGrupo.vales.forEach((vale) => {
          const detalles = vale.vale_renta_detalle || [];
          const totalDiasVale = detalles.reduce(
            (sum, d) => sum + (Number(d.total_dias) || 0),
            0
          );
          const totalHorasVale = detalles.reduce(
            (sum, d) => sum + (Number(d.total_horas) || 0),
            0
          );

          const materiales = detalles
            .map((d) => d.material?.material || "Sin material")
            .join(", ");

          // Fila de vale
          filas.push({
            Empresa: "",
            Placas: "",
            Estado: "",
            Folio: vale.folio,
            Fecha: formatearFechaCorta(vale.fecha_creacion),
            Obra: vale.obras?.obra || "Sin obra",
            Material: materiales,
            Días: formatearNumero(totalDiasVale),
            Horas: formatearNumero(totalHorasVale),
            Operador: vale.operadores?.nombre_completo || "Sin operador",
            "Total Vehículos": "",
            "Total Viajes": "",
            "Total Días": "",
            "Total Horas": "",
          });
        });
      });
    });

    // Fila vacía entre empresas
    filas.push({
      Empresa: "",
      Placas: "",
      Estado: "",
      Folio: "",
      Fecha: "",
      Obra: "",
      Material: "",
      Días: "",
      Horas: "",
      Operador: "",
      "Total Vehículos": "",
      "Total Viajes": "",
      "Total Días": "",
      "Total Horas": "",
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
