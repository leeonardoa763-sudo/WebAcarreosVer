# hooks/vales/

7 submódulos del dominio de vales. Se consumen exclusivamente a través de `useVales.js` (orquestador raíz).

## Responsabilidades

| Archivo | Responsabilidad |
|---------|----------------|
| `useValesState.js` | Constantes de estado inicial: `initialValesState`, `initialFiltersState`, `initialPaginationState`, `initialCatalogosState`. Constantes del dominio: `ESTADOS_VALE`, `TIPOS_VALE` |
| `useValesQueries.js` | `buildBaseQuery()` con relaciones completas, `fetchObras()`, `fetchMateriales(idObra)`, `fetchSindicatos()`, `fetchValeById()`, `fetchValeByFolio()` |
| `useValesFilters.js` | Filtrado client-side: obra, material, sindicato, estado, rango fechas, búsqueda libre (folio, operador, placas) |
| `useValesHelpers.js` | `calcularPrecioTotal(vale)`, `calcularTotalesMaterial(vale)`, `calcularTotalesRenta(vale)` |
| `useValesPagination.js` | `calculateRange(page, pageSize)` → `{from, to}`, `calculateTotalPages()`, `getPaginationInfo()` |
| `useCancelarVale.js` | `cancelarVale(idVale, estadoActual, motivoCancelacion)` — UPDATE estado a `'cancelado'` |
| `useSolicitudesDesver.js` | RPC `solicitar_desverificacion` y RPC `responder_desverificacion` |

## Gotchas importantes

**Fechas:** `useValesFilters.js` filtra por `fecha_programada` cuando existe; si no, usa `fecha_creacion`. La página de Verificación es excepción: solo considera `fecha_creacion`.

**Wildcard CC temporal:** `fetchValeByFolio` en `useValesQueries.js` hace búsqueda wildcard (`CC-%-XXXXX`) cuando el folio exacto no encuentra resultado. **No borrar** hasta que los PDFs con CC anterior dejen de circular (migración CC148/CC149).

**Filtro por sindicato:** Se aplica client-side en `useValesFilters.js`, no en la query de Supabase. PostgREST no filtra por relaciones anidadas.

**useSolicitudesDesver:** Llama RPCs, no hace INSERT/UPDATE directo. Retorna `{ success, id_solicitud, sindicato_nombre }`.

**useCancelarVale:** Solo permite cancelar vales en estado `'emitido'` o `'en_proceso'`. Requiere motivo de mínimo 10 caracteres.
