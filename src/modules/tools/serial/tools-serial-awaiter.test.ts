import { describe, expect, it } from "vitest";
import {
  ToolsSerialAwaiter,
  createLineBuffer,
} from "@/modules/tools/serial/tools-serial-awaiter";

describe("ToolsSerialAwaiter", () => {
  it("completes object wait when expected cmd arrives", async () => {
    const awaiter = new ToolsSerialAwaiter();
    const future = awaiter.registerObject("StaInf", 1000);
    awaiter.handleLine('{"cmd":"StaInf","code":0,"dataS":"{}"}');
    await expect(future).resolves.toMatchObject({ cmd: "StaInf", code: 0 });
  });

  it("completes matcher wait for wifi scan payload", async () => {
    const awaiter = new ToolsSerialAwaiter();
    const future = awaiter.registerMatcher(
      (item) => item.cmd?.trim() === "StaInf" && (item.dataS?.includes("ssid") ?? false),
      1000,
    );
    awaiter.handleLine(
      '{"cmd":"StaInf","code":0,"dataS":"[{\\"ssid\\":\\"AP\\",\\"rssi\\":-50}]"}',
    );
    await expect(future).resolves.toMatchObject({ code: 0 });
  });

  it("completes text chunks after ack and -1 terminator", async () => {
    const awaiter = new ToolsSerialAwaiter();
    const future = awaiter.registerTextChunks("reimRep", 1000);
    awaiter.handleLine('{"cmd":"reimRep","code":0,"dataD":0}');
    awaiter.handleLine("LINEA 1");
    awaiter.handleLine("-1");
    await expect(future).resolves.toEqual({
      chunks: ["LINEA 1\n"],
      terminal: expect.objectContaining({ code: 0 }),
    });
  });

  it("rejects text chunks wait on error code", async () => {
    const awaiter = new ToolsSerialAwaiter();
    const future = awaiter.registerTextChunks("impRepX", 1000);
    awaiter.handleLine('{"cmd":"impRepX","code":48,"dataS":"No existe"}');
    await expect(future).resolves.toEqual({
      chunks: [],
      terminal: expect.objectContaining({ code: 48 }),
    });
  });
});

describe("createLineBuffer", () => {
  it("emits complete lines split by newline", () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));
    buffer.push('{"cmd":"StaInf"}\r\n{"cmd":"RepZ"}\n');
    expect(lines).toEqual(['{"cmd":"StaInf"}', '{"cmd":"RepZ"}']);
  });
});
