# pages/

11 páginas del sistema. Cada una tiene su propio hook orquestador y CSS asociado.

## Índice de páginas

| Página | Ruta | Roles | Hook orquestador | CSS |
|--------|------|-------|------------------|-----|
| `Login.jsx` | `/login` | Público | `useAuth` | `auth.css` |
| `DashboardUnificado.jsx` | `/dashboard-unificado` | Todos autenticados | `useDashboardUnificado` | `dashboard-unificado.css` |
| `Dashboard.jsx` | `/dashboard` | Solo Administrador | `useDashboardAnalytics`, `useMvStats` | `dashboard.css` |
| `VerificarVales.jsx` | `/verificar-vales` | Todos autenticados | `useVerificacion` | `verificacion.css` |
| `Conciliaciones.jsx` | `/conciliaciones` | Todos autenticados | `useConciliaciones` + `useConciliacionesMaterial` | `conciliaciones.css` |
| `HistorialConciliaciones.jsx` | `/historial-conciliaciones` | Admin, Sindicato | — (wrapper de `SeccionConciliaciones`) | — |
| `Contabilidad.jsx` | `/contabilidad` | Admin, Finanzas | — (wrapper de `TablaContabilidad`) | `contabilidad.css` |
| `VisualizarVale.jsx` | `/vale/:folio` | **Público sin auth** | `useAuth` (opcional) | `visualizar-vale.css` |
| `VisualizarConciliacion.jsx` | `/conciliacion/:folio` | **Público sin auth** | — | `visualizar-conciliacion.css` |

## Home por defecto

`/` redirige a `/dashboard-unificado`. Cualquier ruta 404 también redirige ahí.

## Páginas públicas

`VisualizarVale` y `VisualizarConciliacion` son accesibles sin autenticación vía QR desde PDFs. Registran auditoría de acceso en BD.

## Páginas wrapper

`HistorialConciliaciones` y `Contabilidad` son wrappers delgados alrededor de un componente. Incluyen validación de rol propia con redirección a `/vales` si el rol no es suficiente.

## Advertencias de tamaño

- `DashboardUnificado.jsx` — **789 líneas** — leer completa antes de editar
- `VisualizarVale.jsx` — **744 líneas** — leer completa antes de editar

## Guards de acceso (ProtectedRoute)

Todas las rutas protegidas usan `<ProtectedRoute requiredRole={...}>`. Soporta string o array de strings. El acceso exacto está en `src/App.jsx`.
