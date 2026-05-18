# Matriz de permisos (panel + API)

Documento de referencia alineado con `src/lib/permissions/matrix.ts`. El backend Spring debe aplicar las mismas reglas en `@PreAuthorize` y filtrado por `distributorId` / `branchId`.

## Roles

| Rol | Descripción |
|-----|-------------|
| ADMIN | Acceso global; único que modifica/elimina catálogos sensibles y usuarios |
| DISTRIBUTOR | Empresas y sucursales de su distribuidora; impresoras de su cartera |
| TECHNICIAN | Impresoras, precintos, servicios e inspecciones en alcance de sucursales |
| SERVICE_CENTER | Precintos, servicios técnicos e inspecciones anuales |

## Matriz recurso × acción

| Recurso | Leer (ruta) | Crear | Editar | Eliminar | Notas de alcance |
|---------|-------------|-------|--------|----------|------------------|
| dashboard | Todos | — | — | — | |
| companies | ADMIN, DISTRIBUTOR | ADMIN, DISTRIBUTOR | ADMIN | ADMIN | DIST: API filtra por distribuidora |
| branches | Todos | ADMIN, DISTRIBUTOR | ADMIN | ADMIN | Wizard SENIAT: create company+branch |
| employees | Todos | ADMIN | ADMIN | ADMIN | `assignRoles`: ADMIN, TECHNICIAN, SERVICE_CENTER, DISTRIBUTOR |
| printers | ADMIN, DISTRIBUTOR, TECHNICIAN | ADMIN, DISTRIBUTOR, TECHNICIAN | ADMIN | ADMIN | DIST: `distributorId` |
| printerModels | ADMIN, DISTRIBUTOR, TECHNICIAN | ADMIN | ADMIN | ADMIN | Catálogo de consulta para quien opera impresoras |
| seals | ADMIN, TECHNICIAN, SERVICE_CENTER | Igual lectura | Igual | Igual | Impresoras en scope |
| technicalServices | ADMIN, TECHNICIAN, SERVICE_CENTER | Igual | Igual | Igual | |
| annualInspections | ADMIN, TECHNICIAN, SERVICE_CENTER | Igual | Igual | Igual | |
| contracts | ADMIN | ADMIN | ADMIN | ADMIN | |
| users | ADMIN | ADMIN | ADMIN | ADMIN | |
| mqtt | ADMIN | ADMIN | — | — | |
| seniatExtract | ADMIN, DISTRIBUTOR | — | — | — | Solo API Next |
| uploads | Quien adjunta fotos en módulos permitidos | — | — | — | |

## Decisiones de negocio (v1)

1. **DISTRIBUTOR** puede crear empresas y sucursales (coherente con descripción de rol y wizard SENIAT); no puede editar ni eliminar registros existentes del catálogo.
2. **PUT/DELETE** en empresas, sucursales y empleados: solo **ADMIN**.
3. **Impresoras**: operadores pueden registrar; solo **ADMIN** edita o elimina.
4. Operaciones de campo (precintos, ST, inspección): roles con acceso al módulo pueden CRUD dentro del alcance que devuelva el API.

## Backend (checklist)

Ver [backend-rbac.md](./backend-rbac.md).
