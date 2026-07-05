# Campo `branchAddress` en ClientResponse (aeg-core)

El encabezado fiscal de enajenación debe mostrar la dirección de la **empresa cliente** (sucursal enajenada), no la del distribuidor ni la guardada previamente en la impresora.

## Cambio requerido en Spring

Incluir `branchAddress` en el DTO de respuesta de clientes, con el mismo criterio que `branchCity` y `branchState`:

| Campo JSON | Origen |
|------------|--------|
| `branchAddress` | `branches.address` de la sucursal del cliente |

Endpoints afectados (mínimo):

- `GET /api/clients`
- `GET /api/clients/{id}`

Ejemplo de fragmento JSON:

```json
{
  "id": 42,
  "branchId": 15,
  "branchCity": "Valencia",
  "branchState": "Carabobo",
  "branchAddress": "Av. Bolívar Norte, Edif. Centro, Local 3"
}
```

## Motivo

Los técnicos de distribuidora no siempre tienen la sucursal del cliente en el catálogo de `GET /api/branches` (alcance por empresa). Sin `branchAddress` embebido en el cliente, el panel no puede armar la dirección fiscal hasta resolver la sucursal con `GET /api/branches/{id}`.
