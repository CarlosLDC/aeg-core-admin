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

## Fase 3 (completada)

- Documentos de prueba MQTT (`ToolsTestDocumentsService` + `tools-test-documents-panel`)
- Reimpresión NF/RX en `tools-reprint-panel`
- Endpoints `/api/mqtt/tools/test-documents/*`

## Módulos migrados

Ver [`tools-registry.ts`](tools-registry.ts) — operaciones MQTT de campo en estado `migrated`.

## Pendiente (Fase 3b)

- `tools-pdf` — descarga PDF desde preview ESC/POS
- Réplica visual Electron

## Notas

- `/printers` = catálogo CRUD; `/tools` = operaciones de campo MQTT
- `/remoto` = lab ADMIN (diagnóstico); no duplicar en Tools
- "Generar reporte X" (`impRepX`) es distinto de reimprimir reporte X (`reimRep` tipo RX)
- "Generar Z de prueba" (`genImpRepZ`) es distinto del Reporte Z operacional (`RepZ`)
