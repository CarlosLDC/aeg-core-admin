"use client";

import { useParams } from "next/navigation";

export function useResourceId(): number | null {
  const params = useParams();
  const raw = params?.id;
  const id = typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}
