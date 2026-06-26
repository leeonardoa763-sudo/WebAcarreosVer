# hooks/conciliaciones/

8 submódulos para los dos tipos de conciliación. Se consumen a través de `useConciliaciones.js` (renta) y `useConciliacionesMaterial.js` (material).

## Responsabilidades

| Archivo | Tipo | Responsabilidad |
|---------|------|----------------|
| `useConciliacionesState.js` | Ambos | Estado inicial, `ESTADOS_CONCILIACION` (`generada`, `enviada`, `pagada`, `cancelada`), `TIPOS_CONCILIACION` |
| `useConciliacionesQueries.js` | Renta | Fetch vales verificados renta, obras disponibles, semanas disponibles, `guardarConciliacion()` |
| `useConciliacionesHelpers.js` | Renta | `agruparValesPorPlacas()`, calcular subtotal + IVA 16% |
| `useConciliacionesGenerar.js` | Renta | `generarNuevaConciliacion()`, `regenerarConciliacion()` — INSERT en BD |
| `useSindicatos.js` | Renta | Cargar catálogo de sindicatos (solo visible para Administrador) |
| `useConciliacionesMaterialQueries.js` | Material | Fetch vales material, catálogos de obras/semanas/materiales, `guardarConciliacionMaterial()` |
| `useConciliacionesMaterialHelpers.js` | Material | Agrupar por placas y tipo, calcular subtotal + IVA 16% - retención 4% |
| `useContabilidad.js` | Contabilidad | Fetch conciliaciones para tabla de contabilidad, `marcarComoPagada()` |

## Diferencia crítica Renta vs Material

**Renta:** Filtra vales por `id_sindicato` del usuario autenticado. Totales = `subtotal × 1.16`.

**Material:** **NO filtra por sindicato** — material es independiente del sindicato. Totales incluyen retención:

```js
// Material
total_final = (subtotal * 1.16) - (subtotal * 0.04)
```

## Wrapper de Dashboard

`hooks/dashboard/useConciliacionesDashboard.js` reutiliza los dos orquestadores y agrega paginación client-side + búsqueda por folio. Solo lo usa `SeccionConciliaciones.jsx`.

## Fecha efectiva

Ambos queries usan `fecha_programada` con fallback a `fecha_creacion` para determinar a qué semana pertenece un vale.
