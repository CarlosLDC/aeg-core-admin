# AEG Tools — módulo admin

Migración de `aeg-tools/aeg-tools-next` a `aeg-core-admin`. Prioriza **comportamiento** (lógica Tools) sobre apariencia Electron; reutiliza componentes y auth del admin.

## Fase 1 (completada)

- Lógica compartida: `shared/types.ts`, `shared/formatters.ts`, `escpos/esc-pos-to-html.ts`
- Adaptador aeg-core → Tools: `shared/map-core-printer.ts`
- Hook de datos: `printers/use-tools-printers.ts` (fetch aeg-core + scope + búsqueda)
- UI funcional:
  - `/tools` — `ToolsPrintersManager` (tabla, búsqueda, contadores distribuidor)
  - `/tools/printers/[serial]` — detalle con cliente y enlaces a submódulos
- Auth: sesión JWT admin existente (sin login Tools ni API Seenode)
- MQTT: solo tipos + documentación del gap; broker en fase 2

## Módulos registrados

| ID | Estado | Ruta |
|---|---|---|
| `tools-shared-formatters` | `migrated` | — |
| `tools-shared-escpos` | `migrated` | — |
| `tools-shared-api` | `migrated` | — |
| `tools-auth` | `migrated` | — |
| `tools-printers-dashboard` | `migrated` | `/tools` |
| `tools-printers-table` | `migrated` | `/tools` |
| `tools-printer-detail` | `migrated` | `/tools/printers/[serial]` |
| `tools-mqtt-core` | `skeleton` | — |
| `tools-reprint` | `skeleton` | `/tools/printers/[serial]` |
| `tools-reporte-z` | `skeleton` | `/tools/printers/[serial]/reporte-z` |
| `tools-wifi` | `skeleton` | `/tools/printers/[serial]/wifi` |
| `tools-formas-pago` | `skeleton` | `/tools/printers/[serial]/formas-pago` |
| Resto | `planned` | ver `tools-registry.ts` |

## API pública

Importar desde `@/modules/tools`:

```ts
import {
  useToolsPrinters,
  filterPrinters,
  mapCorePrinterToTools,
  escPosToHtml,
} from "@/modules/tools";
```

## Fase 2 (siguiente)

1. Proxy MQTT `/api/tools/mqtt/*` y correlación publish → respuesta
2. `PrinterStatusBar` real y paneles wifi / reporte-z / reimpresión / formas de pago
3. PDF + ESC/POS en flujos de visualización

Ver `mqtt/README.md` para el gap documentado.

## Notas

- `/printers` = catálogo CRUD aeg-core; `/tools` = operaciones de campo
- Scope: `filterPrintersForUser` igual que catálogo
- `/downloads` fuera de alcance
