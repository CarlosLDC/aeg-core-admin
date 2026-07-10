"use client";

import { useCallback, useEffect, useState } from "react";
import { AlignLeft } from "lucide-react";
import { ToolsHeaderFooterBlock } from "@/components/tools/tools-header-footer-block";
import { ToolsPage, ToolsSectionHeading, ToolsSectionStatusActions, ToolsConnectionWarning } from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { useToolsPrinterConnection } from "@/modules/tools/mqtt/use-tools-mqtt";
import {
  getToolsMqttErrorMessage,
  readToolsHeader,
  writeToolsHeader,
} from "@/lib/tools-mqtt-api";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { useToast } from "@/context/toast-provider";

export function ToolsHeaderPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.header;
  const {
    loading: statusLoading,
    refreshStatus,
    remoteActionsDisabled,
    connectionResolved,
    isOnline,
    mqttReady,
  } = useToolsPrinterConnection(printer.id, printer.macAddress);
  const [content, setContent] = useState("");
  const [baseline, setBaseline] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await readToolsHeader(printer.id);
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
    void refreshStatus();
  }, [load, refreshStatus]);

  const save = async () => {
    setSaving(true);
    try {
      const result = await writeToolsHeader(printer.id, content);
      setBaseline(content);
      toast.success(result.message ?? "Encabezado actualizado.");
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || saving || remoteActionsDisabled;

  return (
    <ToolsPrinterMacGuard macAddress={printer.macAddress}>
      <ToolsPage>
        <ToolsSectionHeading
          icon={section.icon}
          tone={section.tone}
          title={section.title}
          description={section.description}
          actions={
            <ToolsSectionStatusActions
              statusRefresh={{
                loading: statusLoading,
                refreshStatus,
                mqttReady,
              }}
            />
          }
        />

        {connectionResolved && !isOnline ? <ToolsConnectionWarning /> : null}

        <ToolsHeaderFooterBlock
          title="Encabezado fiscal"
          icon={AlignLeft}
          tone={section.tone}
          value={content}
          baseline={baseline}
          loading={loading && !initialLoadDone}
          saving={saving}
          busy={busy}
          loadingMessage="Leyendo encabezado de la impresora…"
          onChange={setContent}
          onSave={save}
          onRevert={() => setContent(baseline)}
        />
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
