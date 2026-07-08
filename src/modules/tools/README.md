# AEG Tools Migration Skeleton

Este directorio define el inventario y el esqueleto inicial para migrar `aeg-tools/aeg-tools-next` a `aeg-core-admin` sin portar lógica todavía.

## Alcance de esta fase

- Registrar los módulos que se migrarán.
- Reservar carpetas destino por dominio.
- Exponer rutas `\/tools` vacías y protegidas.
- Dejar documentados los TBD de auth, API y proxy MQTT para el siguiente prompt.

## Módulos registrados

| ID | Estado | Prioridad | Ruta | Destino |
|---|---|---|---|---|
| `tools-shared-formatters` | `skeleton` | `foundation` | — | `src/modules/tools/shared` |
| `tools-shared-escpos` | `skeleton` | `foundation` | — | `src/modules/tools/escpos` |
| `tools-shared-api` | `skeleton` | `foundation` | — | `src/modules/tools/shared` |
| `tools-auth` | `skeleton` | `foundation` | — | `src/modules/tools/auth` |
| `tools-printers-dashboard` | `skeleton` | `high` | `/tools` | `src/modules/tools/printers` |
| `tools-printers-table` | `planned` | `high` | `/tools` | `src/modules/tools/printers` |
| `tools-printer-detail` | `skeleton` | `high` | `/tools/printers/[serial]` | `src/modules/tools/printers` |
| `tools-mqtt-core` | `skeleton` | `foundation` | — | `src/modules/tools/mqtt` |
| `tools-reprint` | `skeleton` | `high` | `/tools/printers/[serial]` | `src/modules/tools/reprint` |
| `tools-reporte-z` | `skeleton` | `high` | `/tools/printers/[serial]/reporte-z` | `src/modules/tools/reporte-z` |
| `tools-report-x` | `planned` | `medium` | `/tools/printers/[serial]` | `src/modules/tools/report-x` |
| `tools-wifi` | `skeleton` | `high` | `/tools/printers/[serial]/wifi` | `src/modules/tools/wifi` |
| `tools-formas-pago` | `skeleton` | `high` | `/tools/printers/[serial]/formas-pago` | `src/modules/tools/formas-pago` |
| `tools-header-footer` | `planned` | `medium` | `/tools/printers/[serial]` | `src/modules/tools/header-footer` |
| `tools-pdf` | `planned` | `medium` | — | `src/modules/tools/pdf` |
| `tools-ui-kit` | `planned` | `low` | — | `src/modules/tools/shared` |
| `tools-test-documents` | `planned` | `medium` | `/tools/printers/[serial]` | `src/modules/tools/reprint` |
| `tools-theme` | `planned` | `low` | — | `src/modules/tools/shared` |
| `tools-pagination` | `planned` | `low` | `/tools` | `src/modules/tools/shared` |

## Fases sugeridas

1. Esqueleto, registry y rutas placeholder.
2. Decidir auth/API y forma final del proxy MQTT.
3. Portar shared libs (`formatters`, `escpos`, boundary de API).
4. Levantar dashboard de impresoras.
5. Levantar detalle de impresora.
6. Portar operaciones MQTT por dominio.
7. Cerrar pendientes (`report-x`, `header-footer`, `pdf`, `test-documents`).

## Notas

- `aeg-tools-next` es la fuente principal.
- El código Electron sigue siendo referencia secundaria para lo que aún no exista en `aeg-tools-next`.
- Los módulos `tools-auth`, `tools-shared-api` y `tools-mqtt-core` quedan documentados pero sin implementación funcional en esta fase.
- `/downloads` sigue fuera de alcance.
