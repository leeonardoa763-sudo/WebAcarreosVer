/**
 * src/utils/cotizarFlete.js
 *
 * Cotiza el flete por m³ de material a una distancia arbitraria — no la del
 * viaje real, sino la de un banco/ruta ALTERNATIVO que no se usó. El resto
 * del repo solo LEE la tarifa ya aplicada al viaje real (`precio_m3`,
 * `costo_total`); esto recalcula con la misma fórmula por tramos para poder
 * comparar "qué hubiera costado en otro banco/ruta".
 *
 * Puerto de solo-lectura de `calcularPrecioM3` en
 * appAcarreos/src/utils/preciosMaterial.js — misma lógica de intervalos,
 * sin las validaciones que lanzan error (aquí una tarifa incompleta debe
 * dar `null`, no tronar un reporte).
 *
 * Dependencias: ninguna
 * Usado en: hooks/useIndicadoresEficiencia.js
 */

// tarifa: fila de precios_material o precios_material_obra (mismos campos)
export const cotizarFleteM3 = (distanciaKm, tarifa) => {
  const distancia = Number(distanciaKm);
  const primerKm = Number(tarifa?.primer_km);
  const numeroIntervalos = Number(tarifa?.numero_de_intervalos);

  if (!tarifa || isNaN(distancia) || distancia <= 0 || isNaN(primerKm) || primerKm <= 0) {
    return null;
  }

  if (distancia === 1) return primerKm;

  let precioTotal = primerKm;

  if (numeroIntervalos >= 1) {
    const kmSubInt1 = Number(tarifa.km_sub_int1);
    const limiteInt1 = tarifa.limite_int1 != null ? Number(tarifa.limite_int1) : null;
    if (isNaN(kmSubInt1)) return null;

    if (limiteInt1 === null || distancia <= limiteInt1) {
      return precioTotal + (distancia - 1) * kmSubInt1;
    }
    precioTotal += (limiteInt1 - 1) * kmSubInt1;

    if (numeroIntervalos >= 2) {
      const kmSubInt2 = Number(tarifa.km_sub_int2);
      const limiteInt2 = tarifa.limite_int2 != null ? Number(tarifa.limite_int2) : null;
      if (isNaN(kmSubInt2)) return null;

      if (limiteInt2 === null || distancia <= limiteInt2) {
        return precioTotal + (distancia - limiteInt1) * kmSubInt2;
      }
      precioTotal += (limiteInt2 - limiteInt1) * kmSubInt2;
      precioTotal += (distancia - limiteInt2) * kmSubInt2;
      return precioTotal;
    }
    // 1 solo intervalo con límite: fuera de él no hay tarifa definida.
    return null;
  }

  return precioTotal;
};
