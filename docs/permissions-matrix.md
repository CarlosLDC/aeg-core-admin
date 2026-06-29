# Matriz de permisos (panel + API)

Documento de referencia alineado con `src/lib/permissions/matrix.ts`. El backend Spring debe aplicar las mismas reglas en `@PreAuthorize` y filtrado por `distributorId`.

## Roles

| Rol | Descripción |
|-----|-------------|
| ADMIN | Acceso global; único que modifica/elimina catálogos sensibles y usuarios |
| TECHNICIAN | Operaciones de distribuidora: clientes, impresoras (lectura), servicios técnicos e inspecciones en alcance de su `distributorId`; identidad de campo con cédula (`nationalId`) |
| SENIAT | Auditor de libros fiscales: **solo** portal aeg-libros-fiscales, lectura global, sin altas ni edición |

Los roles históricos `DISTRIBUTOR` y `SERVICE_CENTER` se consolidaron en `TECHNICIAN`.

## Matriz recurso × acción

| Recurso | Leer (ruta) | Crear | Editar | Eliminar | Notas de alcance |
|---------|-------------|-------|--------|----------|------------------|
| dashboard | ADMIN, TECHNICIAN | — | — | — | SENIAT no accede al panel |
| companies | ADMIN, TECHNICIAN | ADMIN, TECHNICIAN | ADMIN, TECHNICIAN | ADMIN | TECH: API filtra por distribuidora |
| branches | ADMIN, TECHNICIAN | ADMIN, TECHNICIAN | ADMIN, TECHNICIAN | ADMIN | Wizard SENIAT: create company+branch |
| printers | ADMIN, TECHNICIAN | ADMIN | ADMIN | ADMIN | TECH: solo su cartera (`distributorId`); solo lectura |
| printerModels | ADMIN | ADMIN | ADMIN | ADMIN | Catálogo solo administrador; TECH resuelve modelos vía API al ver impresoras |
| seals | ADMIN (ruta `/seals`) | ADMIN, TECHNICIAN | Igual | Igual | TECH gestiona precintos en servicio técnico, no en el catálogo |
| technicalServices | ADMIN, TECHNICIAN | Igual | Igual | Igual | `userId` = técnico (`users.id`) |
| annualInspections | ADMIN, TECHNICIAN | Igual | Igual | Igual | Solo impresoras **asignada**; inspector = `userId` |
| contracts | ADMIN | ADMIN | ADMIN | ADMIN | |
| users | ADMIN | ADMIN | ADMIN | ADMIN | Incluye rol SENIAT (auditor libro, sin acceso panel) |
| remoto | ADMIN | ADMIN | — | — | |
| seniatExtract | ADMIN, TECHNICIAN | — | — | — | Solo API Next |
| uploads | Quien adjunta fotos en módulos permitidos | — | — | — | |

## Decisiones de negocio (v1)

1. **TECHNICIAN** puede crear empresas y sucursales (coherente con wizard SENIAT); no puede eliminar registros existentes del catálogo.
2. **PUT/DELETE** en empresas y sucursales: ADMIN y TECHNICIAN pueden editar; eliminar solo **ADMIN**.
3. **Impresoras**: TECHNICIAN solo **lee** las de su alcance y puede **enajenar** (`POST /api/printers/{id}/enajenar`) impresoras asignadas y pagadas de su distribuidora; crear, editar catálogo y eliminar: solo **ADMIN**.
4. Operaciones de campo (precintos, ST, inspección): roles con acceso al módulo pueden CRUD dentro del alcance que devuelva el API. El técnico logueado se asigna automáticamente en altas.

## Flujo técnico (Empresas `/branches`)

- Menú **Empresas** (TECHNICIAN): alta y gestión de clientes de su distribuidora como empresas.
- Alta **scan-first**: escaneo SENIAT (IA) → revisión de datos fiscales/ubicación → teléfono y correo editables.
- Al guardar: empresa + sucursal + rol **cliente** con `distributorId` del usuario que registra.
- Ediciones y eliminaciones de clientes existentes pasan por solicitud de revisión (ADMIN aprueba).

## Portal libro fiscal (aeg-libros-fiscales)

Usa la misma tabla `users` y roles unificados. Login con `POST /api/auth/login` y `portal=FISCAL_BOOK`.

| Rol | Libro | Escritura |
|-----|-------|-----------|
| ADMIN | Sí | Sí (global) |
| TECHNICIAN | Sí | Sí (alcance por distribuidora) |
| SENIAT | Sí | No (solo lectura global) |

Los usuarios del panel (`ADMIN`, `TECHNICIAN`) pueden abrir el libro fiscal con la misma cuenta. Los auditores `SENIAT` se gestionan en **Usuarios del panel** (solo ADMIN) pero no pueden iniciar sesión en aeg-core-admin.

Ver [backend-rbac.md](./backend-rbac.md).

## Backend (checklist)

Ver [backend-rbac.md](./backend-rbac.md).
