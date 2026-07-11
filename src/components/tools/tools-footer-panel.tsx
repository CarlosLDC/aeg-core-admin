"use client";

import { useCallback, useEffect, useState } from "react";
import { ToolsHeaderFooterBlock } from "@/components/tools/tools-header-footer-block";
import { ToolsPage, ToolsSectionHeading, ToolsSectionStatusActions, ToolsConnectionWarning } from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { useToolsPrinterConnection } from "@/modules/tools/mqtt/use-tools-mqtt";
import { useToolsSectionRefresh } from "@/modules/tools/mqtt/use-tools-section-refresh";
import { useToolsTransport } from "@/modules/tools/transport/tools-transport-provider";
import { getToolsMqttErrorMessage } from "@/lib/tools-mqtt-api";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { useToast } from "@/context/toast-provider";

export function ToolsFooterPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const transport = useToolsTransport();
  const section = TOOLS_SECTIONS.footer;
  const {
    loading: statusLoading,
    refreshStatus,
    remoteActionsDisabled,
    connectionResolved,
    connectionIssue,
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
      const result = await transport.readFooter();
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
  }, [transport, toast]);

  const { refreshAll, refreshLoading } = useToolsSectionRefresh(
    refreshStatus,
    load,
    statusLoading,
  );

  useEffect(() => {
    void (async () => {
      await load().catch(() => {
        /* load already toasts errors */
      });
      await refreshStatus();
    })();
  }, [load, refreshStatus]);

  const save = async () => {
    setSaving(true);
    try {
      const result = await transport.writeFooter(content);
      setBaseline(content);
      toast.success(result.message ?? "Pie actualizado.");
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
                loading: refreshLoading,
                refreshStatus: refreshAll,
                mqttReady,
              }}
            />
          }
        />

        {connectionResolved && connectionIssue === "printer" ? (
          <ToolsConnectionWarning variant="printer" />
        ) : null}

        <ToolsHeaderFooterBlock
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
