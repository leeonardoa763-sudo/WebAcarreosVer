/**
 * src/utils/exportToExcel.js
 *
 * Utilidad para exportar datos a archivos Excel (.xlsx)
 *
 * Usa la librería SheetJS (xlsx) para generar archivos Excel
 * desde arrays de objetos JavaScript
 *
 * Funcionalidades:
 * - Exportar array de objetos a Excel
 * - Nombres de columnas automáticos
 * - Descargar archivo en el navegador
 * - Formateo básico de celdas
 * - Formato de celda por columna (fechas, horas, moneda) vía `opciones.formatos`
 *
 * Dependencias: xlsx
 * Usado en: Conciliaciones, Operadores, Vales (exportarValesExcel), otros reportes
 */

// Importar librería xlsx
import * as XLSX from "xlsx";

/**
 * Aplica el formato de celda (numFmt) de cada columna listada en `formatos` y
 * devuelve, por índice de columna, el formato aplicado.
 *
 * El valor de la celda ya debe venir como número (p. ej. una serie de fecha de
 * excelFechas.js): `z` solo controla cómo se muestra. Las celdas no numéricas
 * —las vacías "—" o "" de un vale que no tiene ese dato— se dejan intactas.
 */
const aplicarFormatos = (worksheet, range, formatos) => {
  const formatoPorColumna = [];

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const encabezado =
      worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })]?.v;
    const formato = formatos[encabezado];
    if (!formato) continue;

    formatoPorColumna[C] = formato;

    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = formato;
      }
    }
  }

  return formatoPorColumna;
};

/**
 * Ancho automático por columna. Para las columnas con formato se mide el
 * formato ("dd/mm/yyyy" = 10) y no el número de serie (45890 = 5), que dejaría
 * la columna demasiado angosta y Excel la mostraría como #####.
 */
const calcularAnchos = (worksheet, range, formatoPorColumna = []) => {
  const columnWidths = [];

  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxWidth = 10; // Ancho mínimo

    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell || cell.v == null) continue;

      const texto =
        R > range.s.r && formatoPorColumna[C]
          ? formatoPorColumna[C]
          : String(cell.v);
      if (texto.length > maxWidth) maxWidth = texto.length;
    }

    // Limitar el ancho máximo a 50 caracteres
    columnWidths.push({ wch: Math.min(maxWidth + 2, 50) });
  }

  return columnWidths;
};

/**
 * Exportar datos a archivo Excel
 *
 * @param {Array} data - Array de objetos con los datos
 * @param {string} fileName - Nombre del archivo (sin extensión)
 * @param {string} sheetName - Nombre de la hoja (opcional)
 * @param {Object} opciones - { formatos: { "Nombre de columna": "dd/mm/yyyy" },
 *                              autoFiltro: boolean }
 */
export const exportToExcel = (
  data,
  fileName = "datos",
  sheetName = "Hoja1",
  opciones = {}
) => {
  try {
    const { formatos = {}, autoFiltro = false } = opciones;

    // Validar que hay datos
    if (!data || data.length === 0) {
      console.warn("No hay datos para exportar");
      return;
    }

    // Crear un nuevo libro de trabajo
    const workbook = XLSX.utils.book_new();

    // Convertir el array de objetos a una hoja de Excel
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Obtener el rango de la hoja
    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    const formatoPorColumna = aplicarFormatos(worksheet, range, formatos);
    worksheet["!cols"] = calcularAnchos(worksheet, range, formatoPorColumna);

    // Filtros en la fila de encabezados (útil con muchas columnas)
    if (autoFiltro) {
      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: range.s.r, c: range.s.c },
          e: { r: range.e.r, c: range.e.c },
        }),
      };
    }

    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generar el archivo Excel
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    // Crear un Blob con el archivo
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Crear un enlace temporal para descargar
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.xlsx`;

    // Simular click para descargar
    document.body.appendChild(link);
    link.click();

    // Limpiar
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log(`✅ Archivo exportado: ${fileName}.xlsx`);
  } catch (error) {
    console.error("Error al exportar a Excel:", error);
    throw new Error("No se pudo exportar el archivo");
  }
};

/**
 * Exportar múltiples hojas a un solo archivo Excel
 *
 * Las hojas sin datos se omiten: un libro con la hoja "Renta" vacía porque el
 * período no tuvo rentas confunde más de lo que ayuda.
 *
 * @param {Array} sheets - Array de { name, data, formatos?, autoFiltro? }
 *                         `formatos` y `autoFiltro` funcionan igual que en
 *                         exportToExcel, pero por hoja.
 * @param {string} fileName - Nombre del archivo (sin extensión)
 */
export const exportMultipleSheetsToExcel = (sheets, fileName = "datos") => {
  try {
    const conDatos = (sheets ?? []).filter((s) => s.data?.length > 0);

    if (conDatos.length === 0) {
      console.warn("No hay hojas con datos para exportar");
      return;
    }

    // Crear un nuevo libro de trabajo
    const workbook = XLSX.utils.book_new();

    // Agregar cada hoja
    conDatos.forEach((sheet) => {
      // Convertir datos a hoja
      const worksheet = XLSX.utils.json_to_sheet(sheet.data);
      const range = XLSX.utils.decode_range(worksheet["!ref"]);

      const formatoPorColumna = aplicarFormatos(
        worksheet,
        range,
        sheet.formatos ?? {},
      );
      worksheet["!cols"] = calcularAnchos(worksheet, range, formatoPorColumna);

      if (sheet.autoFiltro) {
        worksheet["!autofilter"] = { ref: XLSX.utils.encode_range(range) };
      }

      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    // Generar y descargar archivo
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.xlsx`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log(
      `✅ Archivo exportado: ${fileName}.xlsx con ${conDatos.length} hojas`
    );
  } catch (error) {
    console.error("Error al exportar múltiples hojas a Excel:", error);
    throw new Error("No se pudo exportar el archivo");
  }
};

/**
 * Exportar con formato personalizado
 * Permite agregar estilos básicos a las celdas
 *
 * @param {Array} data - Array de objetos con los datos
 * @param {string} fileName - Nombre del archivo
 * @param {Object} options - Opciones de formato
 */
export const exportToExcelWithFormat = (
  data,
  fileName = "datos",
  options = {}
) => {
  try {
    const {
      sheetName = "Hoja1",
      headerStyle = true, // Aplicar negrita a headers
      freezeHeader = true, // Congelar primera fila
    } = options;

    if (!data || data.length === 0) {
      console.warn("No hay datos para exportar");
      return;
    }

    // Crear libro y hoja
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Aplicar formato a headers (primera fila)
    if (headerStyle) {
      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!worksheet[cellAddress]) continue;

        // Agregar estilo de negrita (nota: requiere xlsx con soporte de estilos)
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "CCCCCC" } },
        };
      }
    }

    // Congelar primera fila
    if (freezeHeader) {
      worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    }

    // Ancho automático de columnas
    const rangeAnchos = XLSX.utils.decode_range(worksheet["!ref"]);
    worksheet["!cols"] = calcularAnchos(worksheet, rangeAnchos);

    // Agregar hoja y generar archivo
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.xlsx`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log(`✅ Archivo exportado con formato: ${fileName}.xlsx`);
  } catch (error) {
    console.error("Error al exportar con formato:", error);
    throw new Error("No se pudo exportar el archivo");
  }
};
