import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/server-request-auth";

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.forged`;
}

function makeRequest(token?: string): NextRequest {
  const headers = new Headers();
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return { headers } as unknown as NextRequest;
}

describe("requireRole", () => {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects missing bearer token with 401 without calling upstream", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await requireRole(makeRequest(), "uploads", "read");
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects forged JWT when backend /api/auth/me returns 401", async () => {
    const forgedToken = makeFakeJwt({ role: "ADMIN", exp: futureExp });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
    );

    const result = await requireRole(makeRequest(forgedToken), "uploads", "read");
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("rejects disabled user even if /api/auth/me returns 200", async () => {
    const token = makeFakeJwt({ role: "ADMIN", exp: futureExp });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ id: 1, role: "ADMIN", enabled: false }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await requireRole(makeRequest(token), "uploads", "read");
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("fails closed with 502 when upstream /api/auth/me fails or is unreachable", async () => {
    const token = makeFakeJwt({ role: "ADMIN", exp: futureExp });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    const result = await requireRole(makeRequest(token), "uploads", "read");
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(502);
  });

  it("uses verified backend role (rejecting with 403 even if forged JWT claims ADMIN)", async () => {
    const forgedToken = makeFakeJwt({ role: "ADMIN", exp: futureExp });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ id: 9, role: "SENIAT", enabled: true }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await requireRole(makeRequest(forgedToken), "uploads", "read");
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it("returns verified context when /api/auth/me confirms active authorized role", async () => {
    const token = makeFakeJwt({ role: "DISTRIBUTOR", exp: futureExp });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 5,
          role: "DISTRIBUTOR",
          distributorId: 12,
          branchId: null,
          enabled: true,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await requireRole(makeRequest(token), "uploads", "read");
    expect(result).not.toBeInstanceOf(Response);
    expect(result).toEqual({
      role: "DISTRIBUTOR",
      userId: 5,
      distributorId: 12,
      branchId: null,
    });
  });
});
