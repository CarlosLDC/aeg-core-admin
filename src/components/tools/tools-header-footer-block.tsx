"use client";

import { Loader2, type LucideIcon } from "lucide-react";
import {
  ToolsActionButton,
  ToolsPanelActions,
  ToolsPanelSection,
} from "@/components/tools/tools-ui";
import type { ToolsSectionTone } from "@/lib/tools-sections";
import { formFieldTextareaClass } from "@/lib/toggle-button-styles";

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
  const isDirty = value !== baseline;

  return (
    <ToolsPanelSection title={title} icon={icon} tone={tone}>
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {loadingMessage}
        </div>
      ) : (
        <>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={6}
            className={formFieldTextareaClass}
            disabled={busy}
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
