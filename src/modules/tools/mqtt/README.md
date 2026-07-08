# Tools MQTT core

Operaciones MQTT de campo expuestas por **aeg-core** en `/api/mqtt/tools/*`. El admin consume estas rutas vía [`src/lib/tools-mqtt-api.ts`](../../../lib/tools-mqtt-api.ts) con JWT.

## Roles

`ADMIN`, `DISTRIBUTOR`, `TECHNICIAN`, `SERVICE_CENTER` — configurado en `SecurityConfig` (`TOOLS_MQTT_ROLES`).

Cada endpoint valida `printerId` + `SecurityScopeService.assertPrinterInScope`.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/status` | Estado SENIAT / IP / WiFi |
| POST | `/wifi/scan` | Escaneo GetAccPoi |
| POST | `/wifi/connect` | Conexión wifiConf |
| POST | `/wifi/reset` | resetMF |
| POST | `/reports-z/list` | Último reporte Z |
| POST | `/reports-z/generate` | Generar RepZ |
| POST | `/reports-z/get` | Reporte Z por número |
| POST | `/reports-z/transmit` | UltZTxSeni |
| POST | `/report-x` | impRepX |
| POST | `/formas-pago/read` | MediosPagos |
| POST | `/formas-pago/write` | descFP |
| POST | `/header/read` | staEncFij |
| POST | `/header/write` | wFileSPIFF |
| POST | `/footer/read` | staPieFij |
| POST | `/footer/write` | pieTiF |
| POST | `/reprint` | reimRep (visualize / reprint) |

## Correlación

Backend: `ToolsMqttService` + `FiscalMqttSyncResponseAwaiter` (modos matcher y text-chunks para StaInf y reimpresión).

## Timeouts (configurables)

`app.mqtt.tools.timeout.*` en application properties (defaults: status 15s, wifi 30s, report-z 20s, reprint 60s).

## Cliente admin

- Hook: `useToolsMqtt`
- UI: `ToolsPrinterStatusBar`, paneles wifi / reporte-z / formas-pago / reimpresión
