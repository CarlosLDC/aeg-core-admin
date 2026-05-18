import type { NextRequest } from "next/server";
import { getRoleFromToken, isTokenExpired } from "@/lib/jwt";
import { can } from "@/lib/permissions/can";
import { forbiddenMessage } from "@/lib/permissions/messages";
import type { Action, Resource } from "@/lib/permissions/types";
import type { Role } from "@/types/user";

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return null;
}

export function getRoleFromRequest(request: NextRequest): Role | null {
  const token = getBearerToken(request);
  if (!token || isTokenExpired(token)) return null;
  return getRoleFromToken(token);
}

export function requireRole(
  request: NextRequest,
  resource: Resource,
  action: Action,
): { role: Role } | Response {
  const role = getRoleFromRequest(request);
  if (!role) {
    return Response.json({ error: "Sesión no válida." }, { status: 401 });
  }
  if (!can(role, resource, action)) {
    return Response.json(
      { error: forbiddenMessage(action, resource) },
      { status: 403 },
    );
  }
  return { role };
}
