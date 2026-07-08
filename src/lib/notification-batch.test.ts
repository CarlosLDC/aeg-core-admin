import { describe, expect, it } from "vitest";
import type { AppNotification } from "@/types/notification";
import { pushBatchableCreationNotifications } from "@/lib/notification-batch";

function collect(
  items: Array<{
    id: number;
    createdAt: string;
    creationBatchId?: string | null;
    serial: string;
  }>,
) {
  const list: AppNotification[] = [];
  pushBatchableCreationNotifications(
    list,
    items,
    {
      kind: "seal",
      idPrefix: "seal",
      titleSingular: "Nuevo precinto",
      titlePlural: "Nuevos precintos",
      messageSingular: (s) => `Precinto ${s.serial} registrado en inventario.`,
      messagePlural: (count) =>
        `Se crearon ${count} precinto${count === 1 ? "" : "s"}.`,
      hrefForOne: (s) => `/seals/${s.id}`,
      hrefForBatch: "/seals",
    },
    (target, input) => {
      const sortKey = input.sortKey ?? new Date(input.createdAt).getTime();
      target.push({ ...input, sortKey });
    },
  );
  return list;
}

describe("pushBatchableCreationNotifications", () => {
  it("groups items with the same creationBatchId into one notification", () => {
    const batchId = "11111111-1111-4111-8111-111111111111";
    const notifications = collect([
      {
        id: 1,
        serial: "A001",
        creationBatchId: batchId,
        createdAt: "2026-07-08T12:00:00.000Z",
      },
      {
        id: 2,
        serial: "A002",
        creationBatchId: batchId,
        createdAt: "2026-07-08T12:00:01.000Z",
      },
    ]);

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.id).toBe(`seal-batch-${batchId}`);
    expect(notifications[0]?.title).toBe("Nuevos precintos");
    expect(notifications[0]?.message).toBe("Se crearon 2 precintos.");
    expect(notifications[0]?.href).toBe("/seals");
  });

  it("keeps single creates without batch id as individual notifications", () => {
    const notifications = collect([
      {
        id: 10,
        serial: "Z999",
        createdAt: "2026-07-08T12:00:00.000Z",
      },
    ]);

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.id).toBe("seal-10");
    expect(notifications[0]?.message).toBe("Precinto Z999 registrado en inventario.");
  });
});
