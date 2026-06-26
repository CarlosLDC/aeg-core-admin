# RBAC en el API Spring (aeg-core)

Debe reflejar `docs/permissions-matrix.md` para el **panel** y las reglas del **libro fiscal** descritas abajo.

## Un solo catálogo de usuarios

| Portal | Tabla | Login | Claim JWT `portal` |
|--------|-------|-------|---------------------|
| **aeg-core-admin** | `users` | `POST /api/auth/login` (default `portal=CORE_ADMIN`) | `CORE_ADMIN` |
| **aeg-libros-fiscales** | `users` | `POST /api/auth/login` con `portal=FISCAL_BOOK` | `FISCAL_BOOK` |

Ambos portales autentican contra la misma tabla `users`. El login del panel acepta cuentas `SENIAT` y emite JWT con `portal=FISCAL_BOOK`; el panel las redirige al libro fiscal.

### Roles unificados (`users.role`)

| Rol | Panel | Libro fiscal | Escritura libro | Alcance |
|-----|-------|--------------|-----------------|---------|
| `ADMIN` | Sí | Sí | Sí | Global |
| `TECHNICIAN` | Sí | Sí | Sí | Distribuidora (`distributorId`) + cédula (`nationalId`) |
| `SENIAT` | **No** | Sí (auditor) | **No** (solo lectura) | Global |

Los roles históricos `DISTRIBUTOR` y `SERVICE_CENTER` se migraron a `TECHNICIAN` (Flyway V24).

Spring expone autoridades `ROLE_*` según el enum `Role`.

## JWT

Claims comunes:

- `portal`: `CORE_ADMIN` | `FISCAL_BOOK`
- `role`: `ADMIN`, `TECHNICIAN`, `SENIAT`
- `userId`: id del usuario (`users.id`)
- `distributorId`: distribuidora operativa (técnicos)
- `nationalId`: cédula del técnico (operaciones de campo)

## Endpoints de autenticación

| Método | Ruta | Notas |
|--------|------|-------|
| POST | `/api/auth/login` | Body opcional `{ "portal": "CORE_ADMIN" \| "FISCAL_BOOK" }`. Default: `CORE_ADMIN`. |
| GET | `/api/auth/me` | Perfil del usuario autenticado (`users`) |

Reglas de login:

- `role == SENIAT` + login sin `portal` (panel) → **200** con JWT `portal=FISCAL_BOOK` (el backend normaliza el portal).
- Cualquier otro rol puede iniciar sesión en ambos portales (el JWT lleva el `portal` solicitado).

## Gestión ADMIN (solo panel)

| Método | Ruta |
|--------|------|
| CRUD | `/api/admin/users` |

Validaciones en alta/edición:

- `ADMIN` y `SENIAT`: sin `distributorId` ni `nationalId`.
- `TECHNICIAN`: requiere `distributorId` y `nationalId` (cédula única).

## Datos del libro fiscal

| Método | Ruta | Roles lectura | Roles escritura |
|--------|------|---------------|-----------------|
| GET | `/api/fiscal-books/**` | Todos los roles | — |
| POST/PUT/DELETE | servicios técnicos, inspecciones, precintos, etc. | — | `ADMIN`, `TECHNICIAN` (excluye `SENIAT`) |

Servicios técnicos e inspecciones anuales referencian `users.id` (`userId` / `id_usuario`), no tablas de empleados.

`SecurityScopeService` aplica alcance por rol (`isGlobalReader()` para `ADMIN` y `SENIAT`; `TECHNICIAN` por `distributorId`).

## Autorización por portal

`PortalAuthorizationFilter`:

- Usuario `SENIAT`: solo rutas del libro fiscal y `GET /api/auth/me`; cualquier ruta del panel → 403.
- Usuario con rol distinto de `SENIAT` y JWT `portal=CORE_ADMIN`: acceso al panel **y** a APIs del libro (lectura/escritura según rol).

Rutas del libro (prefijos):

- `/api/fiscal-books/**`
- `/api/technical-services/**`, `/api/annual-inspections/**`, `/api/seals/**`, `/api/service-centers/**`

## Migraciones relevantes

- `V23__unify_fiscal_book_users_into_users.sql`: unifica auditores/técnicos del libro en `users`.
- `V24__users_as_technicians_drop_employees.sql`: `national_id` en `users`, `id_usuario` en ST/inspecciones, elimina `empleados`/`tecnicos`/`distribuidores` (personas).

## Autorización (panel)

```java
@PreAuthorize("hasRole('ADMIN')")
@DeleteMapping("/{id}")
public void deleteCompany(@PathVariable Long id) { ... }
```

## Alcance por JWT

Claims: `role`, `distributorId`, `nationalId`, `userId`.

| Verbo | Regla |
|-------|--------|
| GET colección | Filtrar en repositorio |
| GET `/{id}` | 404 si fuera de alcance |
| POST | Rol permitido + relaciones válidas |
| PUT / DELETE | Rol permitido + ownership |

## Endpoints críticos (panel)

- `/api/admin/users` — solo ADMIN
- `/api/distributor-contracts`, `/api/service-center-contracts` — solo ADMIN
- `/api/printer-models` GET — ADMIN, TECHNICIAN
- `/api/companies`, `/api/branches`, `/api/printers`, `/api/annual-inspections/**` — según `docs/permissions-matrix.md`
- `POST /api/printers/{id}/enajenar` — `ADMIN`, `TECHNICIAN` (alcance por `distributorId`)
- `POST`/`PUT` `/api/annual-inspections` — la impresora debe existir, estar en alcance y tener estatus `asignada` (400 si no)

## Pruebas de integración

Ver `UnifiedAuthRbacIT`:

- Login panel con usuario `SENIAT` → OK (token con `portal=FISCAL_BOOK`; el panel transfiere la sesión al libro y **no conserva** sesión en aeg-admin.tech)
- Login libro con `SENIAT` + `portal=FISCAL_BOOK` → OK
- Token ADMIN panel → `GET /api/fiscal-books/**` → OK
- Token `SENIAT` → `GET /api/admin/users` → 403
