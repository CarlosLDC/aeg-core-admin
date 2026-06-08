# Libro fiscal virtual

Módulo de consulta del libro virtual de control de máquinas fiscales, integrado en **aeg-core-admin** con datos del API Java (sin Supabase).

## Acceso

| Rol | Menú | Ruta |
|-----|------|------|
| ADMIN | Operaciones → Libro fiscal | `/fiscal-book` |
| TECHNICIAN | Operaciones → Libro fiscal | `/fiscal-book` |
| SERVICE_CENTER | Operaciones → Libro fiscal | `/fiscal-book` |
| DISTRIBUTOR | — | 403 / sin entrada de menú |

Recurso de permisos: `fiscalBook` (`read` → `FIELD_OPS`). Ver [permissions-matrix.md](./permissions-matrix.md).

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/fiscal-book` | Búsqueda por serial fiscal o RIF |
| `/fiscal-book/[id]` | Visor del libro (pestañas, filtros, PDF) |
| `/fiscal-book/manual` | Manual de uso adaptado al panel |

El módulo usa layout propio (`FiscalBookShell`): cabecera mínima, sin sidebar del panel administrativo.

## Datos

La capa `src/lib/fiscal-book/` compone el view model a partir de endpoints existentes:

- `GET /api/printers` y `GET /api/printers/{id}`
- `GET /api/seals`, `/api/technical-services`, `/api/annual-inspections`
- Catálogos: empresas, sucursales, clientes, distribuidoras, modelos, software, empleados, técnicos

Funciones principales:

- `loadFiscalPrinter(id)` — libro completo para una impresora en alcance del usuario
- `searchFiscalPrinters(query, type, page)` — serial exacto (`ABC1234567`) o RIF normalizado

## Accesos desde el panel

1. **Menú** — Libro fiscal en Operaciones.
2. **Detalle de impresora** — botón «Libro fiscal» → `/fiscal-book/{id}`.
3. **Altas** — botones «+» en el visor enlazan a:
   - `/technical-services?printerId={id}&action=create`
   - `/annual-inspections?printerId={id}&action=create`  
   Los managers abren el diálogo de creación con la impresora preseleccionada.

## Diferencias respecto a aeg-admin

| Aspecto | aeg-admin | aeg-core-admin |
|---------|-----------|----------------|
| Backend | Supabase (`vista_impresoras`) | API Spring |
| Auth / roles | `admin`, `tecnico`, `seniat` | JWT + `ADMIN`, `TECHNICIAN`, `SERVICE_CENTER` |
| Formularios de alta | Páginas propias en `/fiscal-book/.../new-*` | Módulos ST e inspección del panel |
| Rol SENIAT | Solo lectura dedicada | No portado (ADMIN cubre auditoría interna) |
| Distribuidor | N/A en origen | Sin acceso en v1 |

## Exportación PDF

`jspdf` genera PDF por registro de servicio técnico o inspección anual desde el visor (`fiscal-book-pdf.ts`).

## Verificación manual

1. Usuario TECHNICIAN: menú → buscar serial → abrir libro → pestañas y PDF.
2. Desde `/printers/{id}`: acceso directo al mismo libro.
3. Botón «+» abre creación de ST o inspección con impresora fijada.
4. Usuario DISTRIBUTOR: sin menú ni acceso a `/fiscal-book`.
