"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { VenezuelanFiscalInvoicePreview } from "@/components/printers/venezuelan-fiscal-invoice-preview";
import {
  ToolsActionButton,
  ToolsConnectionWarning,
  ToolsPage,
  ToolsSectionHeading,
  ToolsSectionStatusActions,
  toolsPanelSectionClass,
} from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import { useToast } from "@/context/toast-provider";
import { getToolsMqttErrorMessage } from "@/lib/tools-mqtt-api";
import {
  buildToolsHeaderFooterInvoiceData,
  serializeToolsInvoiceFooter,
  serializeToolsInvoiceHeader,
  toolsInvoiceFooterDirty,
  toolsInvoiceHeaderDirty,
} from "@/lib/tools-header-footer-invoice";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import type { VenezuelanFiscalInvoiceData } from "@/lib/venezuelan-fiscal-invoice";
import { cn } from "@/lib/utils";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { useToolsPrinterConnection } from "@/modules/tools/mqtt/use-tools-mqtt";
import { useToolsSectionRefresh } from "@/modules/tools/mqtt/use-tools-section-refresh";
import { useToolsTransport } from "@/modules/tools/transport/tools-transport-provider";

export function ToolsHeaderFooterPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const transport = useToolsTransport();
  const section = TOOLS_SECTIONS.headerFooter;
  const {
    loading: statusLoading,
    refreshStatus,
    remoteActionsDisabled,
    connectionResolved,
    connectionIssue,
    mqttReady,
  } = useToolsPrinterConnection(printer.id, printer.macAddress);

  const [baselineHeader, setBaselineHeader] = useState("");
  const [baselineFooter, setBaselineFooter] = useState("");
  const [draft, setDraft] = useState<VenezuelanFiscalInvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const applyLoadedContent = useCallback(
    (headerContent: string, footerContent: string) => {
      setBaselineHeader(headerContent);
      setBaselineFooter(footerContent);
      setDraft(
        buildToolsHeaderFooterInvoiceData({
          headerContent,
          footerContent,
          printerSerial: printer.serial,
        }),
      );
    },
    [printer.serial],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [headerResult, footerResult] = await Promise.all([
        transport.readHeader(),
        transport.readFooter(),
      ]);
      applyLoadedContent(
        headerResult.content ?? "",
        footerResult.content ?? "",
      );
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [transport, toast, applyLoadedContent]);

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

  const headerDirty = useMemo(
    () => (draft ? toolsInvoiceHeaderDirty(draft, baselineHeader) : false),
    [draft, baselineHeader],
  );
  const footerDirty = useMemo(
    () => (draft ? toolsInvoiceFooterDirty(draft, baselineFooter) : false),
    [draft, baselineFooter],
  );
  const hasChanges = headerDirty || footerDirty;
  const busy = loading || saving || remoteActionsDisabled;

  const revert = useCallback(() => {
    setDraft(
      buildToolsHeaderFooterInvoiceData({
        headerContent: baselineHeader,
        footerContent: baselineFooter,
        printerSerial: printer.serial,
      }),
    );
  }, [baselineHeader, baselineFooter, printer.serial]);

  const save = async () => {
    if (!draft || !hasChanges) return;
    setSaving(true);
    try {
      const nextHeader = serializeToolsInvoiceHeader(draft);
      const nextFooter = serializeToolsInvoiceFooter(draft);
      const writes: Promise<{ message?: string | null }>[] = [];
      if (headerDirty) {
        writes.push(transport.writeHeader(nextHeader));
      }
      if (footerDirty) {
        writes.push(transport.writeFooter(nextFooter));
      }
      const results = await Promise.all(writes);
      setBaselineHeader(nextHeader);
      setBaselineFooter(nextFooter);
      const message =
        results.find((result) => result.message)?.message ??
        (headerDirty && footerDirty
          ? "Encabezado y pie actualizados."
          : headerDirty
            ? "Encabezado actualizado."
            : "Pie actualizado.");
      toast.success(message);
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

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

        {connectionResolved && connectionIssue !== "none" ? (
          <ToolsConnectionWarning variant={connectionIssue} />
        ) : null}

        <section className={cn(toolsPanelSectionClass)}>
          {loading && !initialLoadDone ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Leyendo encabezado y pie de la impresora…
            </div>
          ) : draft ? (
            <>
              <VenezuelanFiscalInvoicePreview
                data={draft}
                editable={!busy}
                hasChanges={hasChanges}
                lockIdentityLines={false}
                onChange={setDraft}
                onRevert={revert}
              />
              <div className="mx-auto mt-4 grid w-full max-w-md grid-cols-2 gap-2">
                <ToolsActionButton
                  variant="primary"
                  loading={saving}
                  disabled={busy || !hasChanges}
                  onClick={() => void save()}
                >
                  Guardar
                </ToolsActionButton>
                <ToolsActionButton
                  disabled={busy || !hasChanges}
                  onClick={revert}
                >
                  Revertir
                </ToolsActionButton>
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted">
              No se pudo cargar el encabezado y el pie.
            </p>
          )}
        </section>
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
