# Matriz de permisos (panel + API)

Documento de referencia alineado con `src/lib/permissions/matrix.ts`. El backend Spring debe aplicar las mismas reglas en `@PreAuthorize` y filtrado por `distributorId` / `branchId`.

## Roles

| Rol | Descripción |
|-----|-------------|
| ADMIN | Acceso global; único que modifica/elimina catálogos sensibles y usuarios |
| DISTRIBUTOR | Alta de **clientes** vía `/clients`; **empleados** solo en su sucursal (no los de clientes); **impresoras** de su cartera; **inspecciones anuales** en su cartera con personal interno; **modelos fiscales** solo lectura de los usados en sus impresoras (sin menú de catálogo) |
| TECHNICIAN | Impresoras, precintos, servicios e inspecciones en alcance de sucursales |
| SERVICE_CENTER | Precintos, servicios técnicos e inspecciones anuales |
| SENIAT | Auditor de libros fiscales: **solo** portal aeg-libros-fiscales, lectura global, sin altas ni edición |

## Matriz recurso × acción

| Recurso | Leer (ruta) | Crear | Editar | Eliminar | Notas de alcance |
|---------|-------------|-------|--------|----------|------------------|
| dashboard | Todos (panel) | — | — | — | SENIAT no accede al panel |
| companies | ADMIN, DISTRIBUTOR | ADMIN, DISTRIBUTOR | ADMIN | ADMIN | DIST: API filtra por distribuidora |
| branches | Todos (panel) | ADMIN, DISTRIBUTOR | ADMIN | ADMIN | Wizard SENIAT: create company+branch |
| employees | Todos (panel) | ADMIN, DISTRIBUTOR | ADMIN | ADMIN | DIST: alta solo en **su sucursal**; no edita/elimina fichas |
| printers | ADMIN, DISTRIBUTOR, TECHNICIAN | ADMIN | ADMIN | ADMIN | DIST: solo su cartera (`distributorId`); solo lectura |
| printerModels | ADMIN, DISTRIBUTOR, TECHNICIAN | ADMIN | ADMIN | ADMIN | DIST: lectura de modelos de **sus** impresoras; sin página `/printer-models` |
| seals | ADMIN, TECHNICIAN, SERVICE_CENTER | Igual lectura | Igual | Igual | Impresoras en scope |
| technicalServices | ADMIN, TECHNICIAN, SERVICE_CENTER | Igual | Igual | Igual | |
| annualInspections | ADMIN, DISTRIBUTOR, TECHNICIAN, SERVICE_CENTER | Igual | Igual | Igual | Solo impresoras con estatus **asignada**; DIST: impresoras de su inventario; empleado inspector en sucursal de la distribuidora |
| contracts | ADMIN | ADMIN | ADMIN | ADMIN | |
| users | ADMIN | ADMIN | ADMIN | ADMIN | Incluye rol SENIAT (auditor libro, sin acceso panel) |
| mqtt | ADMIN | ADMIN | — | — | |
| seniatExtract | ADMIN, DISTRIBUTOR | — | — | — | Solo API Next |
| uploads | Quien adjunta fotos en módulos permitidos | — | — | — | |

## Decisiones de negocio (v1)

1. **DISTRIBUTOR** puede crear empresas y sucursales (coherente con descripción de rol y wizard SENIAT); no puede editar ni eliminar registros existentes del catálogo.
2. **PUT/DELETE** en empresas, sucursales y empleados: solo **ADMIN**.
3. **Impresoras**: DISTRIBUTOR y TECHNICIAN solo **leen** las de su alcance; crear, editar y eliminar: solo **ADMIN**.
4. Operaciones de campo (precintos, ST, inspección): roles con acceso al módulo pueden CRUD dentro del alcance que devuelva el API.

## Flujo distribuidor (`/clients`)

- Menú **Clientes** (solo DISTRIBUTOR): sustituye Empresas + Sucursales en la navegación.
- Alta **scan-first**: escaneo SENIAT (IA) → revisión de datos fiscales/ubicación (bloqueados si vienen del PDF) → teléfono y correo siempre editables.
- Opción **Ingresar sin documento** para modo manual completo.
- Al guardar (`createClientOnboarding`):
  - **RIF nuevo** → `createCompany` + `createBranch` + rol **cliente** con `distributorId` del usuario que registra.
  - **RIF existente** → reutiliza la empresa (`resolve` / listado / error duplicado) + `createBranch` + rol **cliente** con el mismo `distributorId`.
- La sucursal nueva queda siempre vinculada al distribuidor que la creó; no se reasignan sucursales ajenas.
- Sin edición ni eliminación de clientes existentes (solo ADMIN).

## Portal libro fiscal (aeg-libros-fiscales)

Usa la misma tabla `users` y roles unificados. Login con `POST /api/auth/login` y `portal=FISCAL_BOOK`.

| Rol | Libro | Escritura |
|-----|-------|-----------|
| ADMIN | Sí | Sí (global) |
| DISTRIBUTOR, TECHNICIAN, SERVICE_CENTER | Sí | Sí (alcance) |
| SENIAT | Sí | No (solo lectura global) |

Los usuarios del panel (`ADMIN`, `DISTRIBUTOR`, `TECHNICIAN`, `SERVICE_CENTER`) pueden abrir el libro fiscal con la misma cuenta. Los auditores `SENIAT` se gestionan en **Usuarios del panel** (solo ADMIN) pero no pueden iniciar sesión en aeg-core-admin.

Ver [backend-rbac.md](./backend-rbac.md).

## Backend (checklist)

Ver [backend-rbac.md](./backend-rbac.md).
