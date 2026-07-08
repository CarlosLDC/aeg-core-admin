# Tools MQTT core (fase 2)

Infraestructura MQTT para operaciones de campo. En **fase 1** solo existen tipos TypeScript (`types.ts`); no hay broker ni rutas API activas.

## Origen a portar

- `aeg-tools/aeg-tools-next/lib/mqtt/*`
- `aeg-tools/aeg-tools-next/app/api/mqtt/*`
- Referencia Electron: `shared/modules/mqttStatus.js`, `*Mqtt.js`

## Gap principal (fase 2)

`aeg-tools-next` publica comandos MQTT pero **no correlaciona** la respuesta del broker (`dataS`) con la petición original. La fase 2 debe implementar:

1. Proxy server-side bajo `/api/tools/mqtt/*` (sin exponer credenciales al cliente).
2. Correlación publish → respuesta (request id / timeout / cola de eventos).
3. `PrinterStatusBar` real en el detalle de impresora.
4. Paneles wifi, reporte-z, reimpresión y formas de pago con datos del broker.

## Auth

Reutilizar la sesión JWT del admin. **No** se usa `AEG_API_KEY` ni login Tools separado.

## Variables de entorno (fase 2)

Documentar en despliegue; no commitear secretos:

| Variable | Default | Uso |
|---|---|---|
| `MQTT_BROKER_URL` | `mqtt://13.51.138.105` | URL del broker |

## Dependencias nuevas (fase 2)

- `mqtt` — cliente broker en el proxy server-side
- `pdfkit` — generación PDF en flujos de reimpresión (cuando se active)

## Estado actual

- `src/modules/tools/mqtt/types.ts` — interfaces portadas desde `aeg-tools-next/types/mqtt.ts`
- Subrutas `/tools/printers/[serial]/wifi`, `reporte-z`, `formas-pago` — placeholder navegable desde el detalle
- Operaciones en detalle (Report X, reimpresión, header/footer) — deshabilitadas con mensaje "Próximamente"
