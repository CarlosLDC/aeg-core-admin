import {
  cmdEquals,
  tryParseFiscalResponses,
  type FiscalMqttResponseItem,
} from "@/modules/tools/serial/tools-fiscal-response";
import type { ResponseMatcher } from "@/modules/tools/serial/tools-response-parser";

export type ToolsSerialTextChunksResult = {
  chunks: string[];
  terminal: FiscalMqttResponseItem;
};

type WaitMode = "object" | "matcher" | "text_chunks";

type PendingWait = {
  mode: WaitMode;
  expectedCmd: string | null;
  matcher: ResponseMatcher | null;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  textChunks: string[];
  terminalAck: FiscalMqttResponseItem | null;
  documentoSeen: boolean;
  timeoutId: ReturnType<typeof setTimeout>;
};

export class ToolsSerialAwaiter {
  private pending: PendingWait | null = null;

  handleLine(rawLine: string): void {
    const line = rawLine.trim();
    if (line === "" || this.pending == null) {
      return;
    }

    const wait = this.pending;

    if (wait.mode === "text_chunks") {
      this.handleTextChunksLine(wait, line);
      return;
    }

    const items = tryParseFiscalResponses(line);
    if (items.length === 0) {
      return;
    }

    if (wait.mode === "matcher") {
      const match = items.find((item) => wait.matcher?.(item));
      if (match) {
        this.complete(wait, match);
      }
      return;
    }

    if (wait.expectedCmd == null) {
      return;
    }
    const match = items.find((item) => cmdEquals(item.cmd, wait.expectedCmd));
    if (match) {
      this.complete(wait, match);
    }
  }

  private handleTextChunksLine(wait: PendingWait, line: string): void {
    if (line === "-1") {
      wait.documentoSeen = true;
      const terminal =
        wait.terminalAck ??
        ({ cmd: wait.expectedCmd ?? undefined, code: 0 } satisfies FiscalMqttResponseItem);
      this.complete(wait, {
        chunks: [...wait.textChunks],
        terminal,
      } satisfies ToolsSerialTextChunksResult);
      return;
    }

    const items = tryParseFiscalResponses(line);
    const item = items.find(
      (entry) => wait.expectedCmd != null && cmdEquals(entry.cmd, wait.expectedCmd),
    );
    if (item != null && wait.expectedCmd != null) {
      wait.terminalAck = item;
      if (item.code != null && item.code !== 0) {
        this.complete(wait, {
          chunks: [],
          terminal: item,
        } satisfies ToolsSerialTextChunksResult);
        return;
      }
      if (!wait.documentoSeen && wait.textChunks.length > 0) {
        this.complete(wait, {
          chunks: [...wait.textChunks],
          terminal: item,
        } satisfies ToolsSerialTextChunksResult);
      }
      return;
    }

    if (line.trim().startsWith("[")) {
      return;
    }

    if (line !== "") {
      wait.documentoSeen = true;
      wait.textChunks.push(`${line}\n`);
    }
  }

  registerObject(expectedCmd: string, timeoutMs: number): Promise<FiscalMqttResponseItem> {
    return this.register("object", expectedCmd, null, timeoutMs) as Promise<FiscalMqttResponseItem>;
  }

  registerMatcher(
    matcher: ResponseMatcher,
    timeoutMs: number,
  ): Promise<FiscalMqttResponseItem> {
    return this.register("matcher", null, matcher, timeoutMs) as Promise<FiscalMqttResponseItem>;
  }

  registerTextChunks(
    terminalCmd: string,
    timeoutMs: number,
  ): Promise<ToolsSerialTextChunksResult> {
    return this.register(
      "text_chunks",
      terminalCmd,
      null,
      timeoutMs,
    ) as Promise<ToolsSerialTextChunksResult>;
  }

  cancel(): void {
    if (this.pending == null) {
      return;
    }
    clearTimeout(this.pending.timeoutId);
    this.pending.reject(new Error("Operación serial cancelada."));
    this.pending = null;
  }

  private register(
    mode: WaitMode,
    expectedCmd: string | null,
    matcher: ResponseMatcher | null,
    timeoutMs: number,
  ): Promise<unknown> {
    this.cancel();
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (this.pending != null) {
          this.pending = null;
          reject(new Error("La impresora no respondió a tiempo."));
        }
      }, timeoutMs);

      this.pending = {
        mode,
        expectedCmd,
        matcher,
        resolve,
        reject,
        textChunks: [],
        terminalAck: null,
        documentoSeen: false,
        timeoutId,
      };
    });
  }

  private complete(wait: PendingWait, value: unknown): void {
    clearTimeout(wait.timeoutId);
    this.pending = null;
    wait.resolve(value);
  }
}

/**
 * Extracts one complete top-level JSON object or array from the start of `text`,
 * respecting braces inside quoted strings. Returns null if incomplete.
 */
export function extractLeadingJsonValue(
  text: string,
): { value: string; rest: string } | null {
  const start = text.search(/\S/);
  if (start < 0) {
    return null;
  }
  const opener = text[start];
  if (opener !== "{" && opener !== "[") {
    return null;
  }

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index++) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }
    if (char === "}" || char === "]") {
      const expected = char === "}" ? "{" : "[";
      if (stack.length === 0 || stack[stack.length - 1] !== expected) {
        return null;
      }
      stack.pop();
      if (stack.length === 0) {
        return {
          value: text.slice(start, index + 1),
          rest: text.slice(index + 1),
        };
      }
    }
  }

  return null;
}

export function extractLeadingJsonObject(
  text: string,
): { object: string; rest: string } | null {
  const start = text.search(/\S/);
  if (start < 0 || text[start] !== "{") {
    return null;
  }
  const extracted = extractLeadingJsonValue(text);
  if (extracted == null) {
    return null;
  }
  return { object: extracted.value, rest: extracted.rest };
}

function findLaterCompleteJson(text: string): number {
  for (let index = 1; index < text.length; index++) {
    const char = text[index];
    if (char !== "{" && char !== "[") {
      continue;
    }
    if (extractLeadingJsonValue(text.slice(index)) != null) {
      return index;
    }
  }
  return -1;
}

export function createLineBuffer(onLine: (line: string) => void): {
  push: (chunk: string) => void;
  reset: () => void;
} {
  let buffer = "";

  function drain(): void {
    while (buffer.length > 0) {
      const contentStart = buffer.search(/\S/);
      if (contentStart < 0) {
        buffer = "";
        return;
      }

      const first = buffer[contentStart];
      if (first === "{" || first === "[") {
        const extracted = extractLeadingJsonValue(buffer.slice(contentStart));
        if (extracted == null) {
          if (contentStart > 0) {
            buffer = buffer.slice(contentStart);
          }
          return;
        }
        buffer = extracted.rest;
        onLine(extracted.value);
        continue;
      }

      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex < 0) {
        const laterJson = findLaterCompleteJson(buffer);
        if (laterJson > 0) {
          buffer = buffer.slice(laterJson);
          continue;
        }
        return;
      }

      const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
      buffer = buffer.slice(newlineIndex + 1);
      if (line.trim() !== "") {
        onLine(line);
      }
    }
  }

  return {
    push(chunk: string) {
      buffer += chunk;
      drain();
    },
    reset() {
      buffer = "";
    },
  };
}
