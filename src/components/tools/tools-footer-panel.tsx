"use client";

import { useCallback, useEffect, useState } from "react";
import { AlignRight } from "lucide-react";
import { ToolsHeaderFooterBlock } from "@/components/tools/tools-header-footer-block";
import { ToolsPage, ToolsSectionHeading } from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import {
  getToolsMqttErrorMessage,
  readToolsFooter,
  writeToolsFooter,
} from "@/lib/tools-mqtt-api";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { useToast } from "@/context/toast-provider";

export function ToolsFooterPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.footer;
  const [content, setContent] = useState("");
  const [baseline, setBaseline] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await readToolsFooter(printer.id);
      const nextContent = result.content ?? "";
      setContent(nextContent);
      setBaseline(nextContent);
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [printer.id, toast]);

  useEffect(() => {
    void load().catch(() => {
      /* load already toasts errors */
    });
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const result = await writeToolsFooter(printer.id, content);
      setBaseline(content);
      toast.success(result.message ?? "Pie actualizado.");
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || saving;

  return (
    <ToolsPrinterMacGuard macAddress={printer.macAddress}>
      <ToolsPage>
        <ToolsSectionHeading
          icon={section.icon}
          tone={section.tone}
          title={section.title}
          description={section.description}
        />

        <ToolsHeaderFooterBlock
          title="Pie de página"
          icon={AlignRight}
          tone={section.tone}
          value={content}
          baseline={baseline}
          loading={loading && !initialLoadDone}
          saving={saving}
          busy={busy}
          loadingMessage="Leyendo pie de página de la impresora…"
          onChange={setContent}
          onSave={save}
          onRevert={() => setContent(baseline)}
        />
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
