# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

```
web-verification-vales
├─ eslint.config.js
├─ index.html
├─ package-lock.json
├─ package.json
├─ public
│  └─ vite.svg
├─ README.md
├─ src
│  ├─ App.css
│  ├─ App.jsx
│  ├─ assets
│  │  └─ react.svg
│  ├─ components
│  │  ├─ auth
│  │  │  ├─ LoginForm.jsx
│  │  │  └─ ProtectedRoute.jsx
│  │  ├─ conciliaciones
│  │  │  ├─ AccionesConciliacion.jsx
│  │  │  ├─ BotonGenerarPDF.jsx
│  │  │  ├─ FiltrosConciliacion.jsx
│  │  │  ├─ ResumenTotales.jsx
│  │  │  └─ TablaConciliacionRenta.jsx
│  │  ├─ dashboard
│  │  │  ├─ ChartResumen.jsx
│  │  │  └─ StatsCard.jsx
│  │  ├─ layout
│  │  │  ├─ Layout.jsx
│  │  │  ├─ Navbar.jsx
│  │  │  └─ Sidebar.jsx
│  │  ├─ vales
│  │  │  ├─ ValeCard.jsx
│  │  │  ├─ ValeCardMaterial.jsx
│  │  │  ├─ ValeCardRenta.jsx
│  │  │  ├─ ValeFilters.jsx
│  │  │  └─ ValesList.jsx
│  │  └─ verificacion
│  │     ├─ BatchResults.jsx
│  │     ├─ BatchUpload.jsx
│  │     ├─ ExtractingLoader.jsx
│  │     ├─ UploadZone.jsx
│  │     ├─ ValePreview.jsx
│  │     ├─ ValesVerificadosList.jsx
│  │     └─ VerificationConfirm.jsx
│  ├─ config
│  │  ├─ colors.js
│  │  └─ supabase.js
│  ├─ hooks
│  │  ├─ auth
│  │  │  ├─ useAuthActions.js
│  │  │  ├─ useAuthHelpers.js
│  │  │  ├─ useAuthSession.js
│  │  │  └─ useAuthState.js
│  │  ├─ conciliaciones
│  │  │  ├─ useConciliacionesGenerar.js
│  │  │  ├─ useConciliacionesHelpers.js
│  │  │  ├─ useConciliacionesQueries.js
│  │  │  └─ useConciliacionesState.js
│  │  ├─ useAuth.jsx
│  │  ├─ useConciliaciones.js
│  │  ├─ useVales.js
│  │  ├─ useVerificacion.js
│  │  └─ vales
│  │     ├─ useValesFilters.js
│  │     ├─ useValesHelpers.js
│  │     ├─ useValesPagination.js
│  │     ├─ useValesQueries.js
│  │     └─ useValesState.js
│  ├─ index.css
│  ├─ main.jsx
│  ├─ pages
│  │  ├─ Conciliaciones.jsx
│  │  ├─ Dashboard.jsx
│  │  ├─ DebugConciliaciones.jsx
│  │  ├─ Login.jsx
│  │  ├─ Vales.jsx
│  │  └─ VerificarVales.jsx
│  ├─ styles
│  │  ├─ auth.css
│  │  ├─ conciliaciones.css
│  │  ├─ dashboard.css
│  │  ├─ global.css
│  │  ├─ layout.css
│  │  ├─ vales.css
│  │  └─ verificacion.css
│  └─ utils
│     ├─ conciliaciones
│     │  └─ generarPDFConciliacionRenta.js
│     ├─ exportToExcel.js
│     ├─ formatters.js
│     ├─ pdfExtractor.js
│     └─ qrDecoder.js
└─ vite.config.js

```