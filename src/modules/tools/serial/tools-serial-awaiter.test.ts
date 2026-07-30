import { describe, expect, it } from "vitest";
import {
  ToolsSerialAwaiter,
  createLineBuffer,
  extractLeadingJsonObject,
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

describe("extractLeadingJsonObject", () => {
  it("extracts a complete object and leaves the rest", () => {
    expect(extractLeadingJsonObject('{"cmd":"A"}{"cmd":"B"}')).toEqual({
      object: '{"cmd":"A"}',
      rest: '{"cmd":"B"}',
    });
  });

  it("ignores braces inside strings", () => {
    expect(
      extractLeadingJsonObject('{"dataS":"has } brace","code":0} trailing'),
    ).toEqual({
      object: '{"dataS":"has } brace","code":0}',
      rest: " trailing",
    });
  });

  it("returns null while incomplete", () => {
    expect(extractLeadingJsonObject('{"cmd":"StaInf","dataS":{')).toBeNull();
  });
});

describe("createLineBuffer", () => {
  it("emits complete lines split by newline", () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));
    buffer.push('{"cmd":"StaInf"}\r\n{"cmd":"RepZ"}\n');
    expect(lines).toEqual(['{"cmd":"StaInf"}', '{"cmd":"RepZ"}']);
  });

  it("emits complete JSON objects without a trailing newline", () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));
    buffer.push('{"cmd":"StaInf","code":0,"dataS":{"EstatusSeniat":"EN LINEA"}}');
    expect(lines).toEqual([
      '{"cmd":"StaInf","code":0,"dataS":{"EstatusSeniat":"EN LINEA"}}',
    ]);
  });

  it("emits JSON across chunk boundaries without newline", () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));
    buffer.push('{"cmd":"StaInf","code":0,');
    expect(lines).toEqual([]);
    buffer.push('"dataS":{"NroUltZEmit":8}}');
    expect(lines).toEqual(['{"cmd":"StaInf","code":0,"dataS":{"NroUltZEmit":8}}']);
  });
});
