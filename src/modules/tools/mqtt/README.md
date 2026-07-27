# Tools MQTT core

Operaciones de campo sobre impresoras fiscales. Hay dos modos de transporte:

- **WiFi / MQTT:** proxy REST en aeg-core (`/api/mqtt/tools/*`) vía `MqttTransport` (requiere MAC).
- **USB:** Web Serial en el navegador (`UsbSerialTransport`) con el mismo JSON de integración; no requiere MAC ni backend MQTT.

Modo seleccionable en la ficha de impresora (`ToolsTransportProvider`).

## WiFi / MQTT (aeg-core)

El admin consume estas rutas vía [`src/lib/tools-mqtt-api.ts`](../../../lib/tools-mqtt-api.ts) con JWT.

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
| POST | `/report-x` | impRepX con `data.impFis` (`mode: visualize` → 0, solo contenido; `mode: print` → 1, impresión física) |
| POST | `/formas-pago/read` | MediosPagos |
| POST | `/formas-pago/write` | descFP |
| POST | `/header/read` | staEncFij |
| POST | `/header/write` | wFileSPIFF |
| POST | `/footer/read` | staPieFij |
| POST | `/footer/write` | pieTiF |
| POST | `/reprint` | reimRep (`tipoRe` + `nroReg[]`; FAC/NC/ND/NF/Z) |
| POST | `/test-documents/invoice` | Factura de prueba (secuencia proF/endFac) |
| POST | `/test-documents/credit-note` | NC de prueba (requiere serial fiscal) |
| POST | `/test-documents/debit-note` | ND de prueba (requiere serial fiscal) |
| POST | `/test-documents/generate-z` | genImpRepZ (distinto de RepZ operacional) |

## Correlación

Backend: `ToolsMqttService` + `ToolsTestDocumentsService` + `FiscalMqttSyncResponseAwaiter` (modos matcher y text-chunks para StaInf y reimpresión).

Visualización (`/reprint` con `mode: visualize`): la impresora confirma en `Respuesta` y envía fragmentos ESC/POS en `/{mac}/AEG_Fiscal/Integracion/Documento` hasta el marcador `-1`. El admin convierte el contenido acumulado en PDF.

## Timeouts (configurables)

`app.mqtt.tools.timeout.*` en application properties (defaults: status 15s, wifi 30s, report-z 20s, reprint 60s, test-invoice 5s, test-note 6s, test-generate-z 5s).

## Cliente admin

- Hook: `useToolsMqtt`
- UI: `ToolsPrinterStatusBar`, paneles wifi / reporte-z / formas-pago / reimpresión / documentos de prueba
