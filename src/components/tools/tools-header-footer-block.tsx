"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  ToolsActionButton,
  toolsPanelSectionClass,
} from "@/components/tools/tools-ui";
import {
  parseToolsHeaderFooterContent,
  serializeToolsHeaderFooterLines,
  toolsHeaderFooterLinesEqual,
} from "@/lib/tools-header-footer-lines";
import { ToolsHeaderFooterLinesEditor } from "./tools-header-footer-lines-editor";
import { cn } from "@/lib/utils";

type ToolsHeaderFooterBlockProps = {
  value: string;
  baseline: string;
  loading: boolean;
  saving: boolean;
  busy: boolean;
  loadingMessage: string;
  onChange: (value: string) => void;
  onSave: () => void | Promise<void>;
  onRevert: () => void;
};

export function ToolsHeaderFooterBlock({
  value,
  baseline,
  loading,
  saving,
  busy,
  loadingMessage,
  onChange,
  onSave,
  onRevert,
}: ToolsHeaderFooterBlockProps) {
  const [lines, setLines] = useState(() => parseToolsHeaderFooterContent(value));

  useEffect(() => {
    setLines(parseToolsHeaderFooterContent(value));
  }, [value]);

  const baselineLines = parseToolsHeaderFooterContent(baseline);
  const isDirty = !toolsHeaderFooterLinesEqual(lines, baselineLines);

  function updateLines(nextLines: string[]) {
    setLines(nextLines);
    onChange(serializeToolsHeaderFooterLines(nextLines));
  }

  function handleChangeLine(index: number, lineValue: string) {
    updateLines(
      lines.map((line, lineIndex) => (lineIndex === index ? lineValue : line)),
    );
  }

  function handleRemoveLine(index: number) {
    updateLines(lines.filter((_, lineIndex) => lineIndex !== index));
  }

  function handleAddLine() {
    updateLines([...lines, ""]);
  }

  function handleMoveLine(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) {
      return;
    }

    const nextLines = [...lines];
    const [movedLine] = nextLines.splice(fromIndex, 1);
    nextLines.splice(toIndex, 0, movedLine);
    updateLines(nextLines);
  }

  return (
    <section className={cn(toolsPanelSectionClass)}>
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {loadingMessage}
        </div>
      ) : (
        <>
          <ToolsHeaderFooterLinesEditor
            lines={lines}
            disabled={busy}
            onChangeLine={handleChangeLine}
            onRemoveLine={handleRemoveLine}
            onAddLine={handleAddLine}
            onMoveLine={handleMoveLine}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ToolsActionButton
              variant="primary"
              loading={saving}
              disabled={busy || !isDirty}
              onClick={() => void onSave()}
            >
              Guardar
            </ToolsActionButton>
            <ToolsActionButton disabled={busy || !isDirty} onClick={onRevert}>
              Revertir
            </ToolsActionButton>
          </div>
        </>
      )}
    </section>
  );
}
