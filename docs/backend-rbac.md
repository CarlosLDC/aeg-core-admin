# RBAC en el API Spring (aeg-core)

Debe reflejar `docs/permissions-matrix.md` para el **panel** y las reglas del **libro fiscal** descritas abajo.

## Dos portales, dos tablas de usuarios

| Portal | Tabla | Login | Claim JWT `portal` |
|--------|-------|-------|---------------------|
| **aeg-core-admin** | `users` | `POST /api/auth/login` | `CORE_ADMIN` |
| **aeg-libros-fiscales** | `fiscal_book_users` | `POST /api/auth/fiscal-book/login` | `FISCAL_BOOK` |

Los tokens **no son intercambiables**: `PortalAuthorizationFilter` bloquea rutas del panel con token fiscal y viceversa.

### Roles del panel (`users.role`)

`ADMIN`, `DISTRIBUTOR`, `TECHNICIAN`, `SERVICE_CENTER`, `SENIAT` (lectura global legacy en APIs de datos).

### Roles del libro fiscal (`fiscal_book_users.role`)

| Rol | Uso |
|-----|-----|
| `FISCAL_ADMIN` | Operación completa en el portal de libros |
| `FISCAL_TECHNICIAN` | Consulta + altas; requiere `employee_id` |
| `FISCAL_AUDITOR` | Solo lectura (equivalente SENIAT del libro) |

Spring expone autoridades `ROLE_FISCAL_*` (distintas de `ROLE_ADMIN`, etc.).

## JWT

Claims comunes:

- `portal`: `CORE_ADMIN` | `FISCAL_BOOK`
- `role`: nombre del enum del portal
- Panel adicional: `branchId`, `distributorId`
- Libro fiscal adicional: `employeeId`, `distributorId` (derivado del empleado)

## Endpoints de autenticación

| Método | Ruta | Tabla |
|--------|------|-------|
| POST | `/api/auth/login` | `users` |
| GET | `/api/auth/me` | `users` (portal `CORE_ADMIN`) |
| POST | `/api/auth/fiscal-book/login` | `fiscal_book_users` |
| GET | `/api/auth/fiscal-book/me` | `fiscal_book_users` (portal `FISCAL_BOOK`) |

## Gestión ADMIN (solo panel)

| Método | Ruta |
|--------|------|
| CRUD | `/api/admin/users` |
| CRUD | `/api/admin/fiscal-book-users` |

Validaciones en alta fiscal:

- Email único en `fiscal_book_users` **y** no presente en `users` → 409
- `FISCAL_TECHNICIAN` requiere `employeeId` válido en `empleados`
- `FISCAL_AUDITOR` / `FISCAL_ADMIN` sin empleado

## Datos del libro fiscal

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/api/fiscal-books/**` | `FISCAL_ADMIN`, `FISCAL_TECHNICIAN`, `FISCAL_AUDITOR` |

`SecurityScopeService.findVisiblePrinters()` aplica alcance por rol fiscal (técnico → distribuidora del empleado).

## Migración desde Supabase

Ver `core/scripts/migrate_supabase_perfiles_to_fiscal_book_users.md` en aeg-core.

Mapeo `perfiles.rol_usuario`:

- `admin` → `FISCAL_ADMIN`
- `tecnico` → `FISCAL_TECHNICIAN`
- `seniat` → `FISCAL_AUDITOR`

## Autorización (panel)

```java
@PreAuthorize("hasRole('ADMIN')")
@DeleteMapping("/{id}")
public void deleteCompany(@PathVariable Long id) { ... }
```

## Alcance por JWT (panel)

Claims: `role`, `branchId`, `distributorId`.

| Verbo | Regla |
|-------|--------|
| GET colección | Filtrar en repositorio |
| GET `/{id}` | 404 si fuera de alcance |
| POST | Rol permitido + relaciones válidas |
| PUT / DELETE | Rol permitido + ownership |

## Endpoints críticos (panel)

- `/api/admin/users` — solo ADMIN (`CORE_ADMIN`)
- `/api/admin/fiscal-book-users` — solo ADMIN (`CORE_ADMIN`)
- `/api/distributor-contracts`, `/api/service-center-contracts` — solo ADMIN
- `/api/printer-models` GET — ADMIN, DISTRIBUTOR, TECHNICIAN
- `/api/employees` — según matriz de permisos del panel
- `/api/companies`, `/api/branches`, `/api/printers`, `/api/annual-inspections/**` — según `docs/permissions-matrix.md`

## Pruebas de integración

- Login panel con credencial fiscal → 401
- Login fiscal con credencial panel → 401
- Token fiscal → `GET /api/admin/users` → 403
- Token panel → `GET /api/auth/fiscal-book/me` → 403
- ADMIN panel crea usuario `FISCAL_AUDITOR` → login en libro fiscal OK
- `FISCAL_TECHNICIAN` sin `employeeId` en alta → 400
