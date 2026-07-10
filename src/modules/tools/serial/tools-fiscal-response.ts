export type FiscalMqttResponseItem = {
  cmd?: string;
  code?: number;
  dataD?: number;
  dataS?: string;
};

export function cmdEquals(left: string | undefined, right: string): boolean {
  if (left == null) {
    return false;
  }
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function tryParseFiscalResponse(payload: string): FiscalMqttResponseItem | null {
  const trimmed = payload.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return {
      cmd: typeof parsed.cmd === "string" ? parsed.cmd : undefined,
      code: typeof parsed.code === "number" ? parsed.code : undefined,
      dataD: typeof parsed.dataD === "number" ? parsed.dataD : undefined,
      dataS:
        typeof parsed.dataS === "string"
          ? parsed.dataS
          : parsed.dataS != null
            ? JSON.stringify(parsed.dataS)
            : undefined,
    };
  } catch {
    return null;
  }
}
