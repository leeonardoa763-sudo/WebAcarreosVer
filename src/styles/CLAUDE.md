# styles/

18 archivos CSS. Cada uno corresponde a una página o componente y es importado directamente en ese archivo.

## Índice

| Archivo CSS | Importado en |
|-------------|-------------|
| `global.css` | `main.jsx` — reset, variables globales, utilidades base |
| `auth.css` | `Login.jsx` |
| `layout.css` | `Layout.jsx` / `Navbar.jsx` / `Sidebar.jsx` |
| `modal-vale-detalle.css` | `ModalValeDetalle.jsx` — prefijo `vdm__` |
| `modal-editar-vale.css` | `ModalEditarVale.jsx` / `ModalEditarValeRenta.jsx` / `TablaEditarViajes.jsx` |
| `modal-cancelar-vale.css` | `ModalCancelarVale.jsx` — prefijo `mcv__` |
| `verificacion.css` | `VerificarVales.jsx` + componentes de `verificacion/` |
| `conciliaciones.css` | `Conciliaciones.jsx` + componentes de `conciliaciones/` |
| `dashboard.css` | `Dashboard.jsx` + componentes de `dashboard/` |
| `dashboard-unificado.css` | `DashboardUnificado.jsx` |
| `dashboard-conciliaciones.css` | `SeccionConciliaciones.jsx` |
| `contabilidad.css` | `Contabilidad.jsx` / `TablaContabilidad.jsx` |
| `visualizar-vale.css` | `VisualizarVale.jsx` (también importado en `VisualizarConciliacion.jsx`) |
| `visualizar-conciliacion.css` | `VisualizarConciliacion.jsx` |
| `modal-conciliacion.css` | Modales de conciliación |
| `modal-pagar-conciliacion.css` | `ModalPagarConciliacion.jsx` |
| `notifications.css` | `NotificationBell.jsx` |
| `ModalSolicitudDesver.css` | `ModalSolicitudDesver.jsx` |

## Variables de global.css

```css
/* Colores semánticos */
--color-primary:   #ff6b35   /* naranja — brand */
--color-secondary: #004e89   /* azul oscuro */
--color-accent:    #1a936f   /* verde */
--color-error:     #dc2626
--color-success:   #10b981
--color-warning:   #f59e0b

/* Sombras */
--shadow-sm / --shadow-md / --shadow-lg / --shadow-xl

/* Radios */
--radius-sm: 4px  →  --radius-xl: 16px
```

## Prefijos BEM establecidos

| Prefijo | Componente |
|---------|-----------|
| `mev__` | `ModalEditarVale` |
| `tev__` | `TablaEditarViajes` |
| `mer__` | `ModalEditarValeRenta` |
| `mcv__` | `ModalCancelarVale` |

Al crear un componente nuevo con modal/tabla compleja, definir un prefijo de 3-4 letras único y agregarlo aquí.

## Regla de colores

En JSX: `import { colors } from '../config/colors'` → `style={{ color: colors.primary }}`

En CSS: `color: var(--color-primary);`

Nunca hardcodear valores hex directamente.
