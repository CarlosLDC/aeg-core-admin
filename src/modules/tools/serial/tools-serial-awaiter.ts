import {
  cmdEquals,
  tryParseFiscalResponse,
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

    const item = tryParseFiscalResponse(line);
    if (item == null) {
      return;
    }

    if (wait.mode === "matcher") {
      if (wait.matcher?.(item)) {
        this.complete(wait, item);
      }
      return;
    }

    if (wait.expectedCmd != null && cmdEquals(item.cmd, wait.expectedCmd)) {
      this.complete(wait, item);
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

    const item = tryParseFiscalResponse(line);
    if (item != null && wait.expectedCmd != null && cmdEquals(item.cmd, wait.expectedCmd)) {
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
 * Extracts one complete top-level JSON object from the start of `text`,
 * respecting braces inside quoted strings. Returns null if incomplete.
 */
export function extractLeadingJsonObject(
  text: string,
): { object: string; rest: string } | null {
  const start = text.search(/\S/);
  if (start < 0 || text[start] !== "{") {
    return null;
  }

  let depth = 0;
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
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          object: text.slice(start, index + 1),
          rest: text.slice(index + 1),
        };
      }
    }
  }

  return null;
}

export function createLineBuffer(onLine: (line: string) => void): {
  push: (chunk: string) => void;
  reset: () => void;
} {
  let buffer = "";

  function flushNewlines(): void {
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
      buffer = buffer.slice(newlineIndex + 1);
      if (line.trim() !== "") {
        onLine(line);
      }
      newlineIndex = buffer.indexOf("\n");
    }
  }

  function flushJsonObjects(): void {
    while (true) {
      const extracted = extractLeadingJsonObject(buffer);
      if (extracted == null) {
        return;
      }
      buffer = extracted.rest.replace(/^\r?\n/, "");
      onLine(extracted.object);
    }
  }

  return {
    push(chunk: string) {
      buffer += chunk;
      flushNewlines();
      // USB printers often send a single JSON object without a trailing newline.
      flushJsonObjects();
    },
    reset() {
      buffer = "";
    },
  };
}
