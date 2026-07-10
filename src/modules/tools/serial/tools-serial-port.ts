import {
  TOOLS_SERIAL_COMMAND_DELAY_MS,
  TOOLS_SERIAL_DEFAULT_BAUD_RATE,
} from "@/modules/tools/serial/tools-serial-constants";
import {
  ToolsSerialAwaiter,
  createLineBuffer,
} from "@/modules/tools/serial/tools-serial-awaiter";
import type { FiscalMqttResponseItem } from "@/modules/tools/serial/tools-fiscal-response";
import type { ToolsSerialTextChunksResult } from "@/modules/tools/serial/tools-serial-awaiter";
import type { ResponseMatcher } from "@/modules/tools/serial/tools-response-parser";

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator && navigator.serial != null;
}

export class ToolsSerialPortSession {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private awaiter = new ToolsSerialAwaiter();
  private readLoopActive = false;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private lineBuffer = createLineBuffer((line) => this.awaiter.handleLine(line));
  private operationLock: Promise<void> = Promise.resolve();

  get isConnected(): boolean {
    return this.port != null;
  }

  async requestAndOpen(baudRate = TOOLS_SERIAL_DEFAULT_BAUD_RATE): Promise<void> {
    if (!isWebSerialSupported()) {
      throw new Error("Este navegador no admite Web Serial. Use Chrome o Edge.");
    }
    await this.close();
    const port = await navigator.serial!.requestPort();
    await port.open({ baudRate });
    this.port = port;
    this.writer = port.writable?.getWriter() ?? null;
    this.reader = port.readable?.getReader() ?? null;
    void this.startReadLoop();
  }

  async close(): Promise<void> {
    this.awaiter.cancel();
    this.readLoopActive = false;
    this.lineBuffer.reset();

    try {
      await this.reader?.cancel();
    } catch {
      // ignore
    }
    try {
      this.reader?.releaseLock();
    } catch {
      // ignore
    }
    try {
      await this.writer?.close();
    } catch {
      // ignore
    }
    try {
      this.writer?.releaseLock();
    } catch {
      // ignore
    }
    try {
      await this.port?.close();
    } catch {
      // ignore
    }

    this.reader = null;
    this.writer = null;
    this.port = null;
  }

  private async startReadLoop(): Promise<void> {
    if (this.reader == null || this.readLoopActive) {
      return;
    }
    this.readLoopActive = true;

    while (this.readLoopActive && this.reader != null) {
      try {
        const { value, done } = await this.reader.read();
        if (done) {
          break;
        }
        if (value) {
          this.lineBuffer.push(this.decoder.decode(value));
        }
      } catch {
        break;
      }
    }

    this.readLoopActive = false;
  }

  private async writePayload(payload: string): Promise<void> {
    if (this.writer == null) {
      throw new Error("Puerto USB no conectado.");
    }
    await this.writer.write(this.encoder.encode(`${payload}\n`));
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.operationLock.then(operation, operation);
    this.operationLock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async publishAndAwaitObject(
    payload: string,
    expectedCmd: string,
    timeoutMs: number,
  ): Promise<FiscalMqttResponseItem> {
    return this.withLock(async () => {
      const future = this.awaiter.registerObject(expectedCmd, timeoutMs);
      try {
        await this.writePayload(payload);
        return await future;
      } finally {
        this.awaiter.cancel();
      }
    });
  }

  async publishAndAwaitMatcher(
    payload: string,
    matcher: ResponseMatcher,
    timeoutMs: number,
  ): Promise<FiscalMqttResponseItem> {
    return this.withLock(async () => {
      const future = this.awaiter.registerMatcher(matcher, timeoutMs);
      try {
        await this.writePayload(payload);
        return await future;
      } finally {
        this.awaiter.cancel();
      }
    });
  }

  async publishAndAwaitTextChunks(
    payload: string,
    terminalCmd: string,
    timeoutMs: number,
  ): Promise<ToolsSerialTextChunksResult> {
    return this.withLock(async () => {
      const future = this.awaiter.registerTextChunks(terminalCmd, timeoutMs);
      try {
        await this.writePayload(payload);
        return await future;
      } finally {
        this.awaiter.cancel();
      }
    });
  }

  async publishSequence(
    payloads: string[],
    terminalCmd: string,
    timeoutMs: number,
  ): Promise<FiscalMqttResponseItem> {
    return this.withLock(async () => {
      const future = this.awaiter.registerObject(terminalCmd, timeoutMs);
      try {
        for (let index = 0; index < payloads.length; index++) {
          await this.writePayload(payloads[index]);
          if (index < payloads.length - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, TOOLS_SERIAL_COMMAND_DELAY_MS),
            );
          }
        }
        return await future;
      } finally {
        this.awaiter.cancel();
      }
    });
  }

  async publishFireAndForget(payload: string): Promise<void> {
    return this.withLock(async () => {
      await this.writePayload(payload);
    });
  }
}
