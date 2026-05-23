"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnToggle } from "@/components/ui/data-table-toolbar";
import {
  META_COLUMN_DEFAULT_VISIBLE,
  META_COLUMN_LABELS,
  type MetaColumnId,
  storageKeyForTable,
} from "@/lib/table-meta-columns";

type VisibilityState = Partial<Record<MetaColumnId, boolean>>;

function readStoredVisibility(storageKey: string): VisibilityState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as VisibilityState;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function resolveVisible(
  stored: VisibilityState,
  columnId: MetaColumnId,
): boolean {
  if (stored[columnId] !== undefined) return Boolean(stored[columnId]);
  return META_COLUMN_DEFAULT_VISIBLE[columnId];
}

type UseTableColumnVisibilityOptions = {
  /** Mostrar toggle de «Editado el» cuando el recurso expone updatedAt. */
  showUpdatedAt?: boolean;
};

export function useTableColumnVisibility(
  tableId: string,
  options: UseTableColumnVisibilityOptions = {},
) {
  const storageKey = storageKeyForTable(tableId);
  const { showUpdatedAt = false } = options;

  const [stored, setStored] = useState<VisibilityState>(() =>
    readStoredVisibility(storageKey),
  );

  useEffect(() => {
    setStored(readStoredVisibility(storageKey));
  }, [storageKey]);

  const isVisible = useCallback(
    (columnId: MetaColumnId) => resolveVisible(stored, columnId),
    [stored],
  );

  const setColumnVisible = useCallback(
    (columnId: MetaColumnId, visible: boolean) => {
      setStored((prev) => {
        const next = { ...prev, [columnId]: visible };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* quota / private mode */
        }
        return next;
      });
    },
    [storageKey],
  );

  const toolbarColumns = useMemo((): ColumnToggle[] => {
    const columnIds: MetaColumnId[] = showUpdatedAt
      ? ["id", "createdAt", "updatedAt"]
      : ["id", "createdAt"];

    return columnIds.map((id) => ({
      id,
      label: META_COLUMN_LABELS[id],
      visible: isVisible(id),
      onVisibleChange: (visible) => setColumnVisible(id, visible),
    }));
  }, [isVisible, setColumnVisible, showUpdatedAt]);

  return {
    showId: isVisible("id"),
    showCreatedAt: isVisible("createdAt"),
    showUpdatedAt: showUpdatedAt && isVisible("updatedAt"),
    toolbarColumns,
  };
}
