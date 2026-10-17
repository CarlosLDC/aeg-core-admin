"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export const DEFAULT_PAGE_SIZE = 5;
export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const;

export interface UsePaginationOptions {
  page?: number;
  setPage?: React.Dispatch<React.SetStateAction<number>>;
  pageSize?: number;
  setPageSize?: React.Dispatch<React.SetStateAction<number>>;
  initialPage?: number;
}

export function usePagination<T>(
  items: T[],
  initialPageSize: number = DEFAULT_PAGE_SIZE,
  options?: UsePaginationOptions,
) {
  const [internalPage, setInternalPage] = useState(options?.initialPage ?? 1);
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);

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
