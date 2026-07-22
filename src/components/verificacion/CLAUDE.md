# components/verificacion/

6 componentes que implementan el flujo de verificación masiva de PDFs.

## Flujo de 5 pasos (VerificarVales.jsx)

```
step: 'upload'
  └─ BatchUpload (múltiples PDFs)  |  UploadZone (1 PDF)
       ↓
step: 'extracting'
  └─ ExtractingLoader  (25% uploading → 50% extracting → 75% qr → 90% validating)
       ↓
step: 'batch-results'
  └─ BatchResults (lista archivos: OK con folio / Error con motivo)
       ↓
step: 'verifying'
  └─ ValePreview + VerificationConfirm
       ↓
step: 'success'
  └─ ValesVerificadosList
```

## Mapa de componentes

| Componente | Propósito | Restricciones |
|-----------|-----------|---------------|
| `UploadZone.jsx` | Drag & drop de 1 solo PDF | Solo `.pdf`, máx 5 MB |
| `BatchUpload.jsx` | Upload masivo de PDFs | Máx 50 archivos, máx 20 MB c/u |
| `ExtractingLoader.jsx` | Barra de progreso por pasos durante OCR/QR | — |
| `ValePreview.jsx` | Preview del vale encontrado antes de confirmar | — |
| `VerificationConfirm.jsx` | Botón de confirmación con seguridad de doble clic | — |
| `ValesVerificadosList.jsx` | Lista de vales verificados en la sesión actual | — |

## VerificationConfirm — doble clic intencional

Primer clic: muestra advertencia y cambia a estado de confirmación.
Segundo clic: ejecuta la verificación. Protege contra clicks accidentales.

## ValePreview — tipos de renta

- `es_renta_por_dia === true` → muestra días
- `es_renta_por_dia === false` → muestra horas

## Validaciones (en useVerificacion, no en componentes)

- Rechaza PDFs con texto "COPIA ROJA" — acepta "COPIA BLANCA" / "COPIA BLANCO" o formato ticket (contiene "VERIFICA QR", sin leyenda de copia)
- Requiere "VALE DE MATERIAL" o "VALE DE RENTA" en el contenido del PDF
- Retry QR a escala 3x si falla a 2x (default)
- Máx 20 MB por archivo en batch
