# Tools — Reporte X

## Estado: INCOMPLETO

La UI ya tiene el flujo **vista previa → confirmar → imprimir**, pero el comando MQTT
de vista previa **sin impresión física** sigue pendiente.

- Hoy se usa `impRepX` (con `impFis: 0|1`). En práctica, generar/visualizar **imprime**.
- Cuando el usuario aporte el comando definitivo, actualizar:
  - `buildReportXPayload` (`tools-command-builder.ts`)
  - `ToolsMqttPayloadBuilder.reportXPayload` / `ToolsMqttService.reportX` (aeg-core)
  - el call site en `tools-reporte-z-section.tsx`

Buscar `TODO(tools-report-x)` en el código.
