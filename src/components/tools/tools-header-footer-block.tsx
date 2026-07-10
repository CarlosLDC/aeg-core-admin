"use client";

import { useEffect, useState } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import {
  ToolsActionButton,
  ToolsPanelActions,
  ToolsPanelSection,
} from "@/components/tools/tools-ui";
import {
  parseToolsHeaderFooterContent,
  serializeToolsHeaderFooterLines,
  toolsHeaderFooterLinesEqual,
} from "@/lib/tools-header-footer-lines";
import type { ToolsSectionTone } from "@/lib/tools-sections";
import { ToolsHeaderFooterLinesEditor } from "./tools-header-footer-lines-editor";

type ToolsHeaderFooterBlockProps = {
  title: string;
  icon: LucideIcon;
  tone: ToolsSectionTone;
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
  title,
  icon,
  tone,
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

  return (
    <ToolsPanelSection title={title} icon={icon} tone={tone}>
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
          />
          <ToolsPanelActions className="mt-3">
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
          </ToolsPanelActions>
        </>
      )}
    </ToolsPanelSection>
  );
}
