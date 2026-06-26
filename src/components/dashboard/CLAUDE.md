# components/dashboard/

25+ componentes de analytics. Usados en `Dashboard.jsx` (solo Admin) y `DashboardUnificado.jsx` (todos).

## KPI y métricas

| Componente | Propósito |
|-----------|-----------|
| `KpiCard.jsx` | Tarjeta animada. Props: `icon`, `title`, `value`, `subtitle`, `isCurrency`, `gradient`, `comparativa` |
| `MetricCard.jsx` | Variante sin animación para valores estáticos |
| `StatsCard.jsx` | Tarjeta numérica + label simple |
| `CardEstadosDetallado.jsx` | Distribución por estado con barras visuales |
| `DashboardSkeleton.jsx` | Skeleton de carga para toda la página |
| `DashboardHeader.jsx` | Encabezado con título, período seleccionado, botones de acción |
| `DashboardFilters.jsx` | Filtros: período, año, trimestre, empresa, sindicato, banco, obra, material, tipo |

### KpiCard — detalles
- Animación de conteo de 0 → valor final en **800ms** (easing cúbico)
- `isCurrency=true` → formatea como `$X,XXX,XXX`
- `comparativa.pct` → flecha ↑↓ con % de cambio vs período anterior

## Gráficas Recharts

Patrón uniforme: **data plana → componente Recharts + `CustomTooltip` con fondo oscuro**.
Colores recurrentes: `#ff6b35` (primary), `#1a936f` (accent), `#004e89` (secondary).

| Componente | Tipo gráfica | Métrica |
|-----------|-------------|---------|
| `GraficaTendencia.jsx` | Área + línea | Cantidad vales + M³ por período |
| `GraficaTendenciaMensual.jsx` | Línea | Tendencia mensual de largo plazo |
| `GraficaEstados.jsx` | Dona (pie) | Distribución de vales por estado |
| `GraficaTipoVales.jsx` | Barras | Pétreos / Asfáltico / Corte / Renta |
| `GraficaEmpresas.jsx` | Barras | Vales por empresa (CAPAM / TRIACO / COEDESSA) |
| `GraficaMaterialesMensual.jsx` | Barras agrupadas | M³ por material por mes |
| `GraficaDistribucionObras.jsx` | Barras horizontales | Vales por obra |
| `GraficaTopBancos.jsx` | Barras | Top bancos por volumen |
| `GraficaTopMateriales.jsx` | Barras | Top materiales por M³ |
| `GraficaTopObras.jsx` | Barras | Top obras |
| `GraficaEficienciaViajes.jsx` | Área | Viajes registrados por hora del día |
| `ChartResumen.jsx` | Mixto | Resumen general de período |

## Tablas

| Componente | Columnas |
|-----------|---------|
| `TablaMateriales.jsx` | Material · M³ Total · Vales · Viajes · Importe+IVA — ordenable por cualquier columna |

## Historial de conciliaciones (SeccionConciliaciones y subordinados)

| Componente | Propósito |
|-----------|-----------|
| `SeccionConciliaciones.jsx` | Tabs renta/material, búsqueda por folio, paginación — usa `useConciliacionesDashboard` |
| `ListaConciliacionesPorMes.jsx` | Agrupa por mes → llama `ListaConciliacionesPorSemana` |
| `ListaConciliacionesPorSemana.jsx` | Filas de conciliación individuales |
| `ModalVistaPreviewConciliacion.jsx` | Modal de preview de una conciliación del historial |
| `preview/VistaPreviewMaterial.jsx` | Detalle de conciliación de material |
| `preview/VistaPreviewRenta.jsx` | Detalle de conciliación de renta |
