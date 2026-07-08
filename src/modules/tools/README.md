# AEG Tools — módulo admin

Migración de `aeg-tools/aeg-tools-next` a `aeg-core-admin`. Prioriza **comportamiento** sobre apariencia Electron.

## Fase 1 (completada)

- Lógica compartida, adapter aeg-core, dashboard y detalle shell
- Auth admin JWT

## Fase 2 (completada)

- Proxy MQTT en **aeg-core** (`/api/mqtt/tools/*`)
- Correlación publish → respuesta vía `FiscalMqttSyncResponseAwaiter`
- `tools-mqtt-api.ts`, `useToolsMqtt`, `ToolsPrinterStatusBar`
- Paneles operativos: WiFi, Reporte Z, formas de pago, reimpresión + header/footer
- Preview ESC/POS en modal (`escPosToHtml`)

## Módulos migrados

Ver [`tools-registry.ts`](tools-registry.ts) — `tools-mqtt-core`, wifi, reporte-z, formas-pago, reprint, report-x, header-footer en estado `migrated`.

## Pendiente

- `tools-pdf` — descarga PDF (preview HTML disponible)
- Réplica visual Electron

## Notas

- `/printers` = catálogo CRUD; `/tools` = operaciones de campo MQTT
- `/remoto` = lab ADMIN (diagnóstico); no duplicar en Tools
