# RBAC en el API Spring (aeg-core)

Implementar en el repositorio **aeg-core** (no incluido en este workspace). Debe reflejar `docs/permissions-matrix.md`.

## Autorización

```java
// Ejemplo orientativo
@PreAuthorize("hasRole('ADMIN')")
@DeleteMapping("/{id}")
public void deleteCompany(@PathVariable Long id) { ... }

@PreAuthorize("hasAnyRole('ADMIN','DISTRIBUTOR')")
@PostMapping
public CompanyResponse create(@RequestBody CompanyRequest body) { ... }
```

## Alcance por JWT

Claims esperados por el panel: `role`, `branchId`, `distributorId`.

| Verbo | Regla |
|-------|--------|
| GET colección | Filtrar en repositorio (no confiar en el cliente) |
| GET `/{id}` | 404 si el recurso no pertenece al alcance del usuario |
| POST | Rol permitido + relaciones dentro del alcance (p. ej. `companyId` válido) |
| PUT / DELETE | Rol permitido + ownership |

## Endpoints críticos

- `/api/admin/users` — solo ADMIN
- `/api/distributor-contracts`, `/api/service-center-contracts` — solo ADMIN
- `/api/printer-models` GET — ADMIN, DISTRIBUTOR (solo modelos de sus impresoras), TECHNICIAN; POST/PUT/DELETE — solo ADMIN
- `/api/employees` GET/POST — DISTRIBUTOR: solo sucursal de la distribuidora (`assertDistributorStaffBranch`); PUT/DELETE — ADMIN
- `/api/companies` POST — ADMIN, DISTRIBUTOR (scope)
- `/api/companies/resolve?rif=` GET — ADMIN, DISTRIBUTOR (empresa por RIF aunque no esté en el listado filtrado)
- `/api/companies` PUT/DELETE — ADMIN
- `/api/branches` POST — ADMIN, DISTRIBUTOR; PUT/DELETE — ADMIN
- `/api/printers` GET — ADMIN, DISTRIBUTOR, TECHNICIAN (filtrado por scope); POST/PUT/DELETE — solo ADMIN

## Pruebas de integración

- Token TECHNICIAN → GET `/api/admin/users` → 403
- Token DISTRIBUTOR A → DELETE empresa de distribuidor B → 403
- Token SERVICE_CENTER → GET impresora fuera de sucursales asignadas → 404
