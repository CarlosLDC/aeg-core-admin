"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getStoredTablePage,
  isPathInSection,
  setStoredTablePage,
} from "@/lib/table-search-storage";

export const DEFAULT_PAGE_SIZE = 5;
export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const;

export interface UsePaginationOptions {
  page?: number;
  setPage?: React.Dispatch<React.SetStateAction<number>>;
  pageSize?: number;
  setPageSize?: React.Dispatch<React.SetStateAction<number>>;
  initialPage?: number;
  /** Section path prefix (e.g. `/printers`) to persist page number across navigation within the section. */
  section?: string;
}

export function usePagination<T>(
  items: T[],
  initialPageSize: number = DEFAULT_PAGE_SIZE,
  options?: UsePaginationOptions,
) {
  const pathname = usePathname();
  const section = options?.section;

  const [internalPage, setInternalPageState] = useState(() => {
    if (section && pathname && isPathInSection(pathname, section)) {
      const stored = getStoredTablePage(section);
      if (stored != null && stored >= 1) return stored;
    }
    return options?.initialPage ?? 1;
  });
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);

  const setInternalPage = useCallback(
    (action: React.SetStateAction<number>) => {
      setInternalPageState((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        if (section) {
          setStoredTablePage(section, next);
        }
        return next;
      });
    },
    [section],
  );

  const page = options?.page ?? internalPage;
  const setPage = options?.setPage ?? setInternalPage;
  const pageSize = options?.pageSize ?? internalPageSize;
  const setPageSize = options?.setPageSize ?? setInternalPageSize;

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (totalItems > 0) {
      setPage((current) => Math.min(current, totalPages));
    }
  }, [totalPages, totalItems, setPage]);

  const prevPageSizeRef = useRef(pageSize);
  useEffect(() => {
    if (prevPageSizeRef.current !== pageSize) {
      prevPageSizeRef.current = pageSize;
      setPage(1);
    }
  }, [pageSize, setPage]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalItems);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    paginatedItems,
  };
}

export type UsePaginationReturn<T> = ReturnType<typeof usePagination<T>>;
