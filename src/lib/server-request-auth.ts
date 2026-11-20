import type { NextRequest } from "next/server";
import { isTokenExpired } from "@/lib/jwt";
import { can } from "@/lib/permissions/can";
import { forbiddenMessage } from "@/lib/permissions/messages";
import type { Action, Resource } from "@/lib/permissions/types";
import { ROLES, type Role } from "@/types/user";

const DEFAULT_API_UPSTREAM = "https://core-xgfvw.ondigitalocean.app";
const AUTH_VERIFY_TIMEOUT_MS = 10_000;

export type VerifiedSessionContext = {
  role: Role;
  userId: number | null;
  distributorId: number | null;
  branchId: number | null;
};

export function resolveServerApiUpstream(): string {
  const raw =
    process.env.API_UPSTREAM_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    DEFAULT_API_UPSTREAM;
  return raw.replace(/\/$/, "");
}

export function normalizeVerifiedRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/^ROLE_/, "");
  return ROLES.includes(normalized as Role) ? (normalized as Role) : null;
}

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
  }
  return null;
}

export async function requireRole(
  request: NextRequest,
  resource: Resource,
  action: Action,
): Promise<VerifiedSessionContext | Response> {
  const token = getBearerToken(request);
  if (!token || isTokenExpired(token)) {
    return Response.json({ error: "Sesión no válida." }, { status: 401 });
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(`${resolveServerApiUpstream()}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(AUTH_VERIFY_TIMEOUT_MS),
    });
  } catch {
    return Response.json(
      { error: "No se pudo verificar la sesión con el servidor." },
      { status: 502 },
    );
  }

  if (upstreamRes.status === 401 || upstreamRes.status === 403) {
    return Response.json({ error: "Sesión no válida." }, { status: 401 });
  }

  if (!upstreamRes.ok) {
    return Response.json(
      { error: "No se pudo verificar la sesión con el servidor." },
      { status: 502 },
    );
  }

  let data: Record<string, unknown>;
  try {
    const parsed = (await upstreamRes.json()) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return Response.json({ error: "Sesión no válida." }, { status: 401 });
    }
    data = parsed as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: "No se pudo verificar la sesión con el servidor." },
      { status: 502 },
    );
  }

  if (data.enabled === false) {
    return Response.json({ error: "Sesión no válida." }, { status: 401 });
  }

  const role = normalizeVerifiedRole(data.role);
  if (!role) {
    return Response.json({ error: "Sesión no válida." }, { status: 401 });
  }

  if (!can(role, resource, action)) {
    return Response.json(
      { error: forbiddenMessage(action, resource) },
      { status: 403 },
    );
  }

  return {
    role,
    userId: typeof data.id === "number" && Number.isFinite(data.id) ? data.id : null,
    distributorId:
      typeof data.distributorId === "number" && Number.isFinite(data.distributorId)
        ? data.distributorId
        : null,
    branchId:
      typeof data.branchId === "number" && Number.isFinite(data.branchId)
        ? data.branchId
        : null,
  };
}
