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

function toFiscalItem(parsed: Record<string, unknown>): FiscalMqttResponseItem {
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
}

export function tryParseFiscalResponse(payload: string): FiscalMqttResponseItem | null {
  const trimmed = payload.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return toFiscalItem(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** One object, or each object inside a response array (invoice, notes, Z). */
export function tryParseFiscalResponses(payload: string): FiscalMqttResponseItem[] {
  const trimmed = payload.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.flatMap((entry) => {
        if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
          return [];
        }
        return [toFiscalItem(entry as Record<string, unknown>)];
      });
    } catch {
      return [];
    }
  }

  const item = tryParseFiscalResponse(trimmed);
  return item == null ? [] : [item];
}
