import type { AppNotification, NotificationKind } from "@/types/notification";

type BatchableRecord = {
  id: number;
  createdAt: string;
  creationBatchId?: string | null;
};

type BatchableNotificationConfig<T extends BatchableRecord> = {
  kind: NotificationKind;
  idPrefix: string;
  titleSingular: string;
  titlePlural: string;
  messageSingular: (item: T) => string;
  messagePlural: (count: number) => string;
  hrefForOne: (item: T) => string | null;
  hrefForBatch: string | null;
};

export function pushBatchableCreationNotifications<T extends BatchableRecord>(
  list: AppNotification[],
  items: T[],
  config: BatchableNotificationConfig<T>,
  push: (
    list: AppNotification[],
    input: Omit<AppNotification, "sortKey"> & { sortKey?: number },
  ) => void,
): void {
  const singles: T[] = [];
  const batches = new Map<string, T[]>();

  for (const item of items) {
    const batchId = item.creationBatchId?.trim();
    if (batchId) {
      const group = batches.get(batchId) ?? [];
      group.push(item);
      batches.set(batchId, group);
    } else {
      singles.push(item);
    }
  }

  for (const item of singles) {
    push(list, {
      id: `${config.idPrefix}-${item.id}`,
      kind: config.kind,
      title: config.titleSingular,
      message: config.messageSingular(item),
      href: config.hrefForOne(item),
      createdAt: item.createdAt,
    });
  }

  for (const [batchId, group] of batches) {
    const latest = group.reduce((acc, item) =>
      new Date(item.createdAt).getTime() > new Date(acc.createdAt).getTime()
        ? item
        : acc,
    );
    const count = group.length;
    push(list, {
      id: `${config.idPrefix}-batch-${batchId}`,
      kind: config.kind,
      title: count === 1 ? config.titleSingular : config.titlePlural,
      message:
        count === 1
          ? config.messageSingular(group[0]!)
          : config.messagePlural(count),
      href:
        count === 1 ? config.hrefForOne(group[0]!) : config.hrefForBatch,
      createdAt: latest.createdAt,
    });
  }
}
