# AEG Core Admin

Panel de administración web para **Alpha Engineer Group**: gestión de impresoras fiscales, precintos, empresas, sucursales, contratos y usuarios. Consume el API Java (Spring) con control de acceso por roles (RBAC).

## Requisitos

- Node.js 20+
- npm 10+
- Backend [AEG Core API](https://github.com/) en ejecución (Spring), o URL del entorno desplegado

## Inicio rápido

```bash
cp .env.example .env.local
# Edita NEXT_PUBLIC_API_URL con la URL de tu API

npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e inicia sesión con un usuario del backend.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación TypeScript (`tsc --noEmit`) |
| `npm run test` | Tests unitarios (Vitest) |
| `npm run test:coverage` | Tests con cobertura |
| `npm run test:e2e` | E2E Playwright (requiere credenciales) |

## Variables de entorno

Copia `.env.example` a `.env.local`. Las principales:

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_API_URL` | URL base del API Java en desarrollo |
| `API_UPSTREAM_URL` | Upstream para proxy `/api/*` en Vercel (servidor) |
| `NEXT_PUBLIC_USE_API_PROXY` | `true` para rutas relativas `/api` (producción Vercel) |
| `GEMINI_API_KEY` | Extracción de datos SENIAT (solo servidor) |
| `BLOB_READ_WRITE_TOKEN` | Subida de documentos en Vercel Blob |
| `NEXT_PUBLIC_SENTRY_DSN` | Errores en producción (opcional) |
| `E2E_USER` / `E2E_PASSWORD` | Credenciales para tests E2E |

En Vercel, el proxy same-origin evita CORS: las peticiones van a `/api/...` y Next reescribe al backend.

## Arquitectura

- **Next.js 16** App Router, React 19, TypeScript estricto
- **`src/lib/api.ts`**: cliente HTTP con JWT y mensajes en español
- **`src/lib/permissions/`**: matriz RBAC, `can()`, rutas protegidas
- **Managers**: listados con filtros, paginación y diálogos por dominio

Documentación interna:

- [Matriz de permisos](docs/permissions-matrix.md)
- [Contrato RBAC backend](docs/backend-rbac.md)
- [Paridad UI Modal -> View](src/lib/ui-field-parity.md)

## Despliegue

Despliegue habitual en **Vercel**. Configura `API_UPSTREAM_URL` o `NEXT_PUBLIC_API_URL` y los secretos de Gemini/Blob según las funciones usadas.

## CI

Cada PR ejecuta lint, typecheck, tests y build (ver `.github/workflows/ci.yml`).
Además, existe un guard automatizado de paridad de campos (modal/create/edit -> vista detalle) en `src/lib/ui-field-parity.test.ts`.
