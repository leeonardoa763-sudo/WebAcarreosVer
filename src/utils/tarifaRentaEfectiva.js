/**
 * src/utils/tarifaRentaEfectiva.js
 *
 * Tarifa de renta realmente aplicada a un vale ya guardado (feature "tarifas
 * por obra" del 2026-08-04, ver appAcarreos/CLAUDE.md).
 *
 * `vale_renta_detalle.costo_hr_aplicado` / `costo_dia_aplicado` congelan la
 * tarifa usada al crear el vale — la de la obra (precios_renta_obra) si
 * existía, si no la del sindicato (precios_renta). Leer `detalle.precios_renta`
 * directo (el join en vivo a la tabla de default del sindicato) ignora la
 * tarifa de obra y siempre muestra el default, aunque el importe cobrado
 * (costo_total) sí sea el correcto.
 *
 * Vales anteriores a esa fecha tienen esas columnas en NULL: cae al join,
 * mismo comportamiento que antes, sin alterar el histórico.
 *
 * Dependencias: ninguna
 * Usado en: cualquier lectura de costo_hr/costo_dia de vale_renta_detalle
 */

export const tarifaRentaEfectiva = (detalleRenta) => ({
  costo_hr: detalleRenta?.costo_hr_aplicado ?? detalleRenta?.precios_renta?.costo_hr ?? null,
  costo_dia: detalleRenta?.costo_dia_aplicado ?? detalleRenta?.precios_renta?.costo_dia ?? null,
});
