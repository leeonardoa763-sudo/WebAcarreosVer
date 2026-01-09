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
 *
 * Dependencias: xlsx
 * Usado en: Conciliaciones, Operadores, otros reportes
 */

// Importar librería xlsx
import * as XLSX from "xlsx";

/**
 * Exportar datos a archivo Excel
 *
 * @param {Array} data - Array de objetos con los datos
 * @param {string} fileName - Nombre del archivo (sin extensión)
 * @param {string} sheetName - Nombre de la hoja (opcional)
 */
export const exportToExcel = (
  data,
  fileName = "datos",
  sheetName = "Hoja1"
) => {
  try {
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

    // Aplicar ancho automático a las columnas
    const columnWidths = [];

    // Iterar por cada columna
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 10; // Ancho mínimo

      // Revisar cada celda de la columna
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];

        if (cell && cell.v) {
          const cellLength = cell.v.toString().length;
          if (cellLength > maxWidth) {
            maxWidth = cellLength;
          }
        }
      }

      // Limitar el ancho máximo a 50 caracteres
      columnWidths.push({ wch: Math.min(maxWidth + 2, 50) });
    }

    worksheet["!cols"] = columnWidths;

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
 * @param {Array} sheets - Array de objetos { name: string, data: Array }
 * @param {string} fileName - Nombre del archivo (sin extensión)
 */
export const exportMultipleSheetsToExcel = (sheets, fileName = "datos") => {
  try {
    // Validar que hay hojas
    if (!sheets || sheets.length === 0) {
      console.warn("No hay hojas para exportar");
      return;
    }

    // Crear un nuevo libro de trabajo
    const workbook = XLSX.utils.book_new();

    // Agregar cada hoja
    sheets.forEach((sheet) => {
      if (!sheet.data || sheet.data.length === 0) {
        console.warn(`La hoja "${sheet.name}" no tiene datos`);
        return;
      }

      // Convertir datos a hoja
      const worksheet = XLSX.utils.json_to_sheet(sheet.data);

      // Aplicar ancho automático
      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      const columnWidths = [];

      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxWidth = 10;
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const cellLength = cell.v.toString().length;
            if (cellLength > maxWidth) {
              maxWidth = cellLength;
            }
          }
        }
        columnWidths.push({ wch: Math.min(maxWidth + 2, 50) });
      }
      worksheet["!cols"] = columnWidths;

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
      `✅ Archivo exportado: ${fileName}.xlsx con ${sheets.length} hojas`
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
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    const columnWidths = [];

    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const cellLength = cell.v.toString().length;
          if (cellLength > maxWidth) {
            maxWidth = cellLength;
          }
        }
      }
      columnWidths.push({ wch: Math.min(maxWidth + 2, 50) });
    }
    worksheet["!cols"] = columnWidths;

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
