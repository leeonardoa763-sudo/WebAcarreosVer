# components/conciliaciones/

12 componentes del flujo de generación y gestión de conciliaciones. Usados en `Conciliaciones.jsx` y `Contabilidad.jsx`.

## Flujo de UI en Conciliaciones.jsx

```
FiltrosConciliacion
  ↓ (selecciona semana, obra, sindicato/material)
TablaConciliacionRenta  |  TablaConciliacionMaterial
  ↓ (vista previa agrupada por placas)
ResumenTotales  |  ResumenTotalesMaterial
  ↓
AccionesConciliacion
  ├─ BotonGenerarPDF
  └─ Exportar Excel
  ↓
ModalConciliacionGenerada
```

## Mapa de componentes

| Componente | Propósito |
|-----------|-----------|
| `FiltrosConciliacion.jsx` | Selectores de semana, obra, sindicato (Admin), material — dinámicos según disponibilidad |
| `TablaConciliacionRenta.jsx` | Vista previa de renta agrupada por placas (colapsable) |
| `TablaConciliacionMaterial.jsx` | Vista previa de material agrupada por placas y tipo (1, 2, 3) |
| `ResumenTotales.jsx` | Totales de renta: días, horas, subtotal, IVA |
| `ResumenTotalesMaterial.jsx` | Totales de material: m³, subtotal, IVA, **retención 4%** |
| `AccionesConciliacion.jsx` | Contenedor de botones de acción |
| `BotonGenerarPDF.jsx` | Genera PDF detectando tipo automáticamente |
| `ModalConciliacionGenerada.jsx` | Confirmación post-generación con folio asignado |
| `ModalPagarConciliacion.jsx` | Registra pago de una conciliación — Admin/Finanzas |
| `TablaContabilidad.jsx` | Tabla de estado de pago — solo para `Contabilidad.jsx` |
| `BatchResults.jsx` | Muestra resultados del proceso batch de verificación (exito/error por archivo) |

## BotonGenerarPDF — detección automática de tipo

```js
// Lee tipo_de_material.id_tipo_de_material del vale
1 o 2  →  generarPDFConciliacionMaterialPetreo   (usa @react-pdf/renderer)
3      →  generarPDFConciliacionMaterialCorte     (usa @react-pdf/renderer)
renta  →  generarPDFConciliacionRenta             (usa jsPDF)
```

## Diferencia en totales

**Renta** (`ResumenTotales`): `subtotal + IVA 16%`. Sin retención.

**Material** (`ResumenTotalesMaterial`): `(subtotal × 1.16) - (subtotal × 0.04)`. Retención siempre 4%.

## FiltrosConciliacion — campos dinámicos

- Semana: solo muestra semanas que tienen vales verificados disponibles
- Obra: solo obras con vales verificados en la semana seleccionada
- Sindicato: solo visible para Administrador
- Material: solo visible en tab material
