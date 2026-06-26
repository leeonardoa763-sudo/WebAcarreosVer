# hooks/

Arquitectura en dos niveles: **orquestadores raíz** (importables desde páginas) + **submódulos especializados** (solo usados internamente por su orquestador).

**Regla:** Las páginas y componentes nunca importan submódulos directamente. Solo los orquestadores.

## Jerarquía

```
hooks/
├── useAuth.jsx              ← orquestador
│   └── auth/{useAuthState, useAuthSession, useAuthActions, useAuthHelpers}
├── useVales.js              ← orquestador
│   └── vales/{State, Queries, Filters, Helpers, Pagination, useCancelarVale, useSolicitudesDesver}
├── useVerificacion.js       ← autónomo (sin submódulos)
├── useConciliaciones.js     ← orquestador (renta)
│   └── conciliaciones/{State, Queries, Helpers, Generar, Sindicatos}
├── useConciliacionesMaterial.js  ← orquestador (material)
│   └── conciliaciones/{MaterialQueries, MaterialHelpers}
├── useOperadores.js         ← orquestador
│   └── operadores/{State, Queries, Helpers}
├── useDashboardAnalytics.js ← autónomo
├── useEstadisticasGlobales.js ← autónomo
├── useDashboardUnificado.js ← autónomo
├── useMvStats.js            ← autónomo
├── useNotifications.js      ← autónomo
└── dashboard/
    └── useConciliacionesDashboard.js  ← wrapper (reutiliza useConciliaciones + useConciliacionesMaterial)
```

## Orquestadores raíz

| Hook | Usado en | Propósito |
|------|----------|-----------|
| `useAuth.jsx` | `App.jsx` (AuthProvider global) | Auth, perfil de usuario, roles, helpers |
| `useVales.js` | `Vales.jsx`, `Conciliaciones.jsx` | Fetch + filtrado client-side de vales |
| `useVerificacion.js` | `VerificarVales.jsx` | OCR + QR + batch verify de PDFs |
| `useConciliaciones.js` | `Conciliaciones.jsx` (tab renta) | Generación de conciliaciones de renta |
| `useConciliacionesMaterial.js` | `Conciliaciones.jsx` (tab material) | Generación de conciliaciones de material |
| `useOperadores.js` | `Operadores.jsx` | Vales agrupados por empresa → placas → estado |
| `useDashboardAnalytics.js` | `Dashboard.jsx` | Métricas con comparativa periodo anterior |
| `useEstadisticasGlobales.js` | `EstadisticasGlobales.jsx` | KPIs desde conciliaciones; desglose por material con m³, viajes, importe |
| `useDashboardUnificado.js` | `DashboardUnificado.jsx` | Vista unificada con paginación y KPIs |
| `useMvStats.js` | `Dashboard.jsx` | Vistas materializadas históricas (mv_stats_*) |
| `useNotifications.js` | `NotificationBell.jsx` | Realtime: vales nuevos vía Supabase Realtime |

## Contexto global

Solo `useAuth` es contexto global (AuthProvider en App.jsx envuelve toda la app). Todos los demás hooks son locales a su página/componente.

## Submódulos — ver directorios

- `vales/` → 7 submódulos del dominio de vales
- `conciliaciones/` → 8 submódulos del dominio de conciliaciones
- `operadores/` → 3 submódulos del dominio de operadores
- `auth/` → 4 submódulos de autenticación
- `editar-vale/` → `useEditarValeViajes` y `useEditarValeRenta` (usados en modales de edición)
- `dashboard/` → `useConciliacionesDashboard` (wrapper para historial)
