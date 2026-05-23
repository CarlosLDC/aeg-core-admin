import type { ReactNode } from "react";
import {
  TableCreatedAtCell,
  TableCreatedAtHeader,
} from "@/components/ui/table-created-at";
import { TableIdCell, TableIdHeader } from "@/components/ui/table-id";
import type { SortDirection } from "@/lib/table-sort";

export type MetaColumnSortProps = {
  sortDirection?: SortDirection | null;
  onSortToggle?: () => void;
};

type TableRowMetaHeadersProps = {
  showId: boolean;
  showCreatedAt: boolean;
  idSort?: MetaColumnSortProps;
  createdAtSort?: MetaColumnSortProps;
  children: ReactNode;
  actions?: ReactNode;
};

/** ID first, optional data columns, createdAt last, then actions. */
export function TableRowMetaHeaders({
  showId,
  showCreatedAt,
  idSort,
  createdAtSort,
  children,
  actions,
}: TableRowMetaHeadersProps) {
  return (
    <>
      {showId ? (
        <TableIdHeader
          sortDirection={idSort?.sortDirection ?? null}
          onSortToggle={idSort?.onSortToggle}
        />
      ) : null}
      {children}
      {showCreatedAt ? (
        <TableCreatedAtHeader
          sortDirection={createdAtSort?.sortDirection ?? null}
          onSortToggle={createdAtSort?.onSortToggle}
        />
      ) : null}
      {actions}
    </>
  );
}

type TableRowMetaCellsProps = {
  showId: boolean;
  showCreatedAt: boolean;
  id?: number;
  createdAt?: string;
  children: ReactNode;
  actions?: ReactNode;
};

/** ID first, optional data cells, createdAt last, then actions. */
export function TableRowMetaCells({
  showId,
  showCreatedAt,
  id,
  createdAt,
  children,
  actions,
}: TableRowMetaCellsProps) {
  return (
    <>
      {showId && id != null ? <TableIdCell value={id} /> : null}
      {children}
      {showCreatedAt && createdAt ? (
        <TableCreatedAtCell value={createdAt} />
      ) : null}
      {actions}
    </>
  );
}
