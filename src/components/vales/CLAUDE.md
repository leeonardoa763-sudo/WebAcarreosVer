# components/vales/

11 componentes del dominio de vales + subdirectorio `editar/`.

## Mapa de componentes

| Componente | Propósito |
|-----------|-----------|
| `ValeCard.jsx` | Router: decide entre `ValeCardMaterial` y `ValeCardRenta` según `vale.tipo_vale` |
| `ValeCardMaterial.jsx` | Tarjeta compacta de vale material (folio, operador, estado, costo total) |
| `ValeCardRenta.jsx` | Tarjeta compacta de vale renta (folio, operador, estado, fecha efectiva) |
| `ValesList.jsx` | Lista agrupada por mes → semana → obra, grupos colapsables |
| `ValeFilters.jsx` | Panel de filtros avanzados (obra, material, sindicato, estado, fechas) |
| `ModalValeDetalle.jsx` | Modal principal de detalle — punto de entrada a todos los sub-modales |
| `ModalEditarVale.jsx` | Edición de viajes de material (Tipos 1, 2, 3) — solo Administrador |
| `ModalEditarValeRenta.jsx` | Edición de tipo renta (día completo / medio día / por horas) — solo Admin |
| `ModalCancelarVale.jsx` | Confirmación de cancelación con campo de motivo requerido — solo Admin |
| `ModalSolicitudDesver.jsx` | Crear (Admin) o responder (Sindicato) solicitud de desverificación |
| `editar/TablaEditarViajes.jsx` | Tabla editable de viajes dentro de `ModalEditarVale` |

## Cadena de modales

```
ValesList
  └─ ValeCard (router)
       ├─ ValeCardMaterial  ─┐
       └─ ValeCardRenta     ─┤─ clic abre ModalValeDetalle (createPortal)
                                  ├─ ModalEditarVale → editar/TablaEditarViajes
                                  ├─ ModalEditarValeRenta
                                  ├─ ModalCancelarVale
                                  └─ ModalSolicitudDesver
```

## Prefijos BEM de CSS

| Prefijo | Archivo CSS | Componente |
|---------|-------------|-----------|
| `mev__` | `modal-editar-vale.css` | `ModalEditarVale` |
| `mer__` | `modal-editar-vale.css` | `ModalEditarValeRenta` |
| `tev__` | `modal-editar-vale.css` | `TablaEditarViajes` |

## Reglas de edición y acceso

- Edición bloqueada cuando `estado === 'conciliado'` o `estado === 'verificado'`
- `ModalEditarVale` y `ModalEditarValeRenta`: solo Administrador
- `ModalCancelarVale`: solo Admin, solo estados `'emitido'` y `'en_proceso'`

## Fecha efectiva

`ValeCardRenta` y `ValesList` usan `fecha_programada || fecha_creacion`. Siempre hacer parse como `substring(0, 10) + 'T12:00:00'` antes de `new Date()` para evitar drift UTC.
