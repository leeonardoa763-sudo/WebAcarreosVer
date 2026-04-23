# Control de Acarreos — Claude Code Guide

Web de logística de construcción que gestiona vales (órdenes de trabajo) de transporte de materiales y renta de equipos. Reemplaza un proceso manual en papel para **CAPAM**, **TRIACO** y **COEDESSA**.

- **Repo:** `leeonardoa763-sudo/WebAcarreosVer`
- **Deploy:** Vercel (`https://web-acarreos.vercel.app`)
- **Stack:** React 19 + Vite 7, Supabase (DB + Auth + RLS), jsPDF / React-PDF, Lucide React, Recharts, date-fns, XLSX, jsQR

---

## Comandos

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build de producción (output: dist/)
npm run lint      # ESLint
npm run preview   # Preview del build
```

---

## Estructura src/

```
src/
├── App.jsx                          # Router principal + AuthProvider (8 rutas)
├── config/
│   ├── supabase.js                  # Cliente Supabase (única instancia — no re-crear)
│   └── colors.js                    # Paleta de colores centralizada
├── hooks/
│   ├── useAuth.jsx                  # Orquestador de auth (Context API) — race condition intencional
│   ├── useVales.js                  # Hook principal de vales (orquestador)
│   ├── useVerificacion.js
│   ├── useDashboardAnalytics.js
│   ├── vales/
│   │   ├── useValesQueries.js
│   │   ├── useValesFiltros.js
│   │   └── useEditarValeViajes.js
│   └── conciliaciones/
│       ├── useConciliacionesGenerar.js
│       └── useConciliacionesQueries.js
├── pages/                           # 7 páginas (una por ruta)
│   ├── VisualizarVale.jsx           # 744 líneas — leer completa antes de editar
│   └── ...
├── components/                      # 49 componentes organizados por dominio
│   ├── auth/ProtectedRoute.jsx      # Soporta string y array en requiredRole
│   ├── layout/
│   ├── dashboard/
│   ├── vales/
│   ├── operadores/
│   └── verificacion/
├── styles/                          # 15 archivos CSS (uno por página/componente)
│   └── global.css                   # Variables CSS globales --color-primary, etc.
└── utils/
    ├── pdfExtractor.js
    ├── qrDecoder.js
    ├── formatters.js
    ├── dateUtils.js
    ├── exportToExcel.js
    └── conciliaciones/              # Generadores PDF con formato aprobado — no tocar sin ver output
```

---

## Convenciones de código

### Encabezado obligatorio en cada archivo

```js
/**
 * ruta/del/archivo.jsx
 *
 * Descripción breve.
 * Dependencias: qué otros archivos usa
 * Usado en: dónde se importa
 */
```

### Orden de imports

```js
// 1. React y hooks nativos
// 2. React Router
// 3. Third party
// 4. Config
import { supabase } from '../config/supabase';
import { colors } from '../config/colors';
// 5. Hooks personalizados
// 6. Componentes
// 7. Estilos
```

### Estructura de un componente

```js
const ComponentName = ({ prop1, prop2 }) => {
  // 1. Estados
  // 2. Hooks personalizados
  // 3. Effects
  // 4. Funciones (handlers en inglés: handleSubmit, fetchData)
  // 5. Render
};
export default ComponentName;
```

### Reglas estrictas

- **NO** `console.log` innecesarios en producción
- **NO** colores hardcodeados — siempre `colors.js` o `var(--color-primary)`
- **NO** lógica de negocio en componentes de UI
- **NO** queries Supabase repetidas — crear hooks
- **NO** instalar dependencias sin aprobación
- **NO** migrar a TypeScript ni Tailwind (decisión del proyecto)
- **SÍ** variables de dominio en **español** (`vale`, `folio`, `obra`, `operador`)
- **SÍ** funciones/handlers en **inglés** (`handleSubmit`, `fetchVales`)
- **SÍ** estados `loading` / `error` en cada hook con datos asincrónicos

### CSS — BEM por componente

```css
.component-name { }
.component-name__element { }
.component-name--modifier { }
```

Prefijos BEM establecidos: `mev__` (ModalEditarVale), `tev__` (TablaEditarViajes), `mer__` (ModalEditarValeRenta)

---

## Base de datos (Supabase / PostgreSQL)

> Schema completo con todas las columnas y tipos en `.claude/database.sql`.
> Las migraciones también van ahí — agregar una entrada cada vez que se modifique la BD.

### Tablas principales

| Tabla | Descripción |
|---|---|
| `vales` | Órdenes de trabajo (material o renta) |
| `vale_material_detalles` | Detalles de material por vale |
| `vale_material_viajes` | Viajes individuales (Tipos 1 y 2) |
| `tickets_material` | Tickets físicos (Tipo 3 — corte) |
| `vale_renta_detalle` | Detalle de renta por vale |
| `vale_renta_viajes` | Viajes de renta individuales |
| `conciliaciones` | Conciliaciones financieras |
| `conciliacion_vales` | Relación conciliación ↔ vales |
| `operadores` | Operadores de vehículos |
| `vehiculos` | Vehículos (placas) |
| `obras` | Obras de construcción |
| `empresas` | CAPAM, TRIACO, COEDESSA |
| `sindicatos` | Organizaciones sindicales |
| `bancos` | Bancos/canteras de material |
| `material` | Catálogo de materiales |
| `distancias_banco_obra` | Distancias entre banco y obra |
| `persona` | Usuarios del sistema |
| `roles` | Roles de acceso |

### Columnas clave en `vales`

`id_vale`, `folio`, `estado`, `fecha_creacion`, `fecha_programada`, `id_obra`, `id_operador`, `id_vehiculo`, `id_persona_creador`, `verificado_por_sindicato`, `fecha_verificacion`, `id_persona_verificador`

### Columnas clave en `vale_material_viajes`

`id_viaje`, `numero_viaje`, `hora_registro`, `peso_ton`, `volumen_m3`, `id_banco_override`, `distancia_km_override`, `precio_m3_override`, `costo_viaje_override` (Tipo 3)

### Columnas clave en `vale_material_detalles`

`id_detalle_material`, `capacidad_m3`, `distancia_km`, `cantidad_pedida_m3`, `peso_ton`, `volumen_real_m3`, `precio_m3`, `costo_total`, `folio_banco`, `requisicion`, `notas_adicionales`

### Columnas en `tickets_material`

`id_ticket`, `numero_ticket`, `folio_ticket`, `fecha_impresion` — relación directa con `vales` (no anidada bajo `vale_material_detalles`)

---

## Reglas de negocio críticas

### Tipos de material

| Tipo | Nombre | Tabla de viajes | Columna volumen |
|---|---|---|---|
| 1 | Materiales Pétreos | `vale_material_viajes` | `volumen_m3 = peso_ton / peso_especifico` |
| 2 | Base Asfáltica | `vale_material_viajes` | `volumen_m3 = peso_ton / peso_especifico` |
| 3 | Tepetate/Corte | `tickets_material` | `volumen_real_m3` — **nunca** `cantidad_pedida_m3` |

### Fórmulas de precio

```
precio_m3 = primer_km + (km_sub_int1 × (distancia_km - 1))
costo_viaje = volumen_m3 × precio_m3
total_final = (subtotal + IVA 16%) - retención 4%
```

### Estados de un vale

`emitido` → `verificado` → `conciliado` (también: `en_proceso`, `cancelado`)

Edición **bloqueada** cuando `estado === 'conciliado'` o `estado === 'verificado'`

### Rentas

- `es_renta_por_dia` determina tarifas diarias vs. por hora
- Medio día: `total_dias = 0.5` (columna integer — manejar con cuidado)

### Timestamps y zonas horarias

- `hora_inicio` / `hora_fin` son ISO completos (`2026-03-19T14:36:00+00:00`)
- Para hora: `new Date(ts).toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City' })`
- Para fechas: `substring(0, 10)` + `T12:00:00` antes de `new Date()` para evitar drift por UTC

---

## Roles y permisos

### Jerarquía

`Administrador` > `Finanzas` > `Sindicato`

### Patrón correcto en React

```js
// CORRECTO
userProfile?.roles?.role === 'Administrador'

// INCORRECTO
userProfile?.rol
```

Nombres de roles (title case): `'Administrador'`, `'Finanzas'`, `'Sindicato'`

> Algunas políticas RLS antiguas usan `'ADMINISTRADOR'` en mayúsculas — verificar antes de escribir queries.

### Políticas RLS relevantes

- `vales` — lectura pública (`anon`); escritura por creador/obra/rol
- `vale_material_detalles` — lectura pública (`anon`)
- `conciliaciones` — Sindicato crea/lee las suyas; Admin/Finanzas leen todas
- `distancias_banco_obra` — solo ADMINISTRADOR puede INSERT/UPDATE/DELETE
- `vehiculos` — lectura autenticada solo `activo = true`

---

## Patrones Supabase importantes

### Query base de vales (relaciones completas)

```js
supabase.from('vales').select(`
  *,
  obras:id_obra (id_obra, obra, cc, empresas:id_empresa (empresa, sufijo, logo)),
  operadores:id_operador (id_operador, id_sindicato, nombre_completo,
    sindicatos:id_sindicato (id_sindicato, sindicato)),
  vehiculos:id_vehiculo (id_vehiculo, placas),
  persona:id_persona_creador (nombre, primer_apellido, segundo_apellido),
  tickets_material (id_ticket, numero_ticket, folio_ticket, fecha_impresion),
  vale_material_detalles (
    id_detalle_material, capacidad_m3, distancia_km, cantidad_pedida_m3,
    peso_ton, volumen_real_m3, precio_m3, costo_total, folio_banco,
    requisicion, notas_adicionales,
    material:id_material (id_material, material,
      tipo_de_material:id_tipo_de_material (id_tipo_de_material, tipo_de_material)),
    bancos:id_banco (id_banco, banco),
    vale_material_viajes (
      id_viaje, numero_viaje, hora_registro, peso_ton, volumen_m3,
      id_banco_override, distancia_km_override, precio_m3_override, costo_viaje_override
    )
  )
`)
```

### Filtro por sindicato — solo en cliente

PostgREST **no soporta** filtrar por relaciones anidadas. Filtrar después de recibir datos:

```js
if (esSindicato && idSindicatoUsuario) {
  datos = datos.filter(
    (vale) => Number(vale.operadores?.id_sindicato) === Number(idSindicatoUsuario)
  );
}
```

### Verificar UPDATE exitoso

Supabase retorna `Success. No rows returned` para UPDATEs correctos. Confirmar siempre con SELECT posterior.

### Comparación numérica en campos calculados

```js
// NO — igualdad directa falla por punto flotante
WHERE volumen_m3 = 1.234

// SÍ — tolerancia
WHERE ABS(volumen_m3 - ROUND(1.234, 3)) < 0.001
```

### Patrón estándar de query

```js
const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('tabla').select('*');
    if (error) throw error;
    setData(data);
  } catch (error) {
    console.error('Error en fetchData:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

### Evitar loop infinito en useEffect

```js
// MAL — fetchVales como dependencia causa loop
useEffect(() => { fetchVales(); }, [fetchVales]);

// BIEN — valores primitivos
useEffect(() => { fetchVales(); }, [idObra, estado]);
```

---

## Verificación de PDFs

- Solo se aceptan **copias blancas** (`COPIA BLANCA` / `COPIA BLANCO`)
- **Copias rojas** → rechazar con error explícito
- Flujo: OCR primero → si falla, decodificar QR a escala 2x → si falla, reintentar QR a escala 3x
- Validar que el PDF contenga `VALE DE MATERIAL` o `VALE DE RENTA` + `OPERADOR`

### Extracción de folio (`pdfExtractor.js` + `qrDecoder.js`)

- **OCR**: `extractFolioFromPDF` extrae texto con pdf.js y busca regex `/[A-Z]{2,3}-\d{3}-\d{5}/`
- **QR**: `convertPDFToImage(file, scale)` acepta escala como parámetro (default `2.0`). Si el QR no se decodifica a 2x, `useVerificacion.js` reintenta con `3.0`
- **jsQR**: usa `inversionAttempts: "attemptBoth"` — intenta imagen normal e invertida (cubre QRs con fondo de color o bajo contraste)
- PDFs escaneados (sin texto extraíble) solo pueden resolverse por QR

### Búsqueda de vale por folio — migración CC148/CC149

```js
// TODO TEMPORAL: si el folio extraído del PDF no encuentra vale exacto,
// hace búsqueda wildcard ignorando el número de CC (folio parcial con %)
// Eliminar cuando los PDFs con CC anterior dejen de circular
const patron = `${partes[0]}-%-${partes[2]}`;
```

---

## Paleta de colores

Siempre importar desde `colors.js`. Nunca hardcodear hex.

```js
import { colors } from '../config/colors';
style={{ color: colors.primary }}   // En JSX
color: var(--color-primary);        // En CSS
```

---

## Rutas de la aplicación

| Ruta | Página | Roles |
|------|--------|-------|
| `/login` | Login.jsx | Público |
| `/vales` | Vales.jsx | Todos autenticados |
| `/verificar-vales` | VerificarVales.jsx | Todos autenticados |
| `/conciliaciones` | Conciliaciones.jsx | Todos autenticados |
| `/historial-conciliaciones` | HistorialConciliaciones.jsx | Todos autenticados |
| `/dashboard` | Dashboard.jsx | Solo Administrador |
| `/operadores` | Operadores.jsx | Administrador, Sindicato |
| `/vale/:folio` | VisualizarVale.jsx | **Público** (sin auth) |

---

## Desarrollo incremental

1. Un archivo a la vez — confirmar antes de pasar al siguiente
2. Verificar nombres de columnas con `information_schema.columns` antes de escribir código
3. Archivos completos sobre diffs cuando los cambios son complejos
4. Una solución a la vez para debugging
5. Correr SELECT de verificación después de cada UPDATE

---

## Git (Windows / VS Code)

- Editor de commits: **Vim** → `:wq` guardar, `:q!` salir sin guardar
- `fatal: There is no merge in progress` después de merge exitoso es **normal**

---

## Checklist antes de escribir código

- [ ] ¿Leí este `CLAUDE.md` completo?
- [ ] ¿Verifiqué columnas exactas con `information_schema.columns`?
- [ ] ¿El vale es Tipo 1/2 (`vale_material_viajes`) o Tipo 3 (`tickets_material`)?
- [ ] ¿El estado permite edición (`!== 'conciliado'` y `!== 'verificado'`)?
- [ ] ¿El rol se lee desde `userProfile?.roles?.role`?
- [ ] ¿Los timestamps usan `timeZone: 'America/Mexico_City'`?
- [ ] ¿Hay manejo de `loading` y `error` en el hook?
- [ ] ¿El archivo lleva encabezado con ruta y descripción?
