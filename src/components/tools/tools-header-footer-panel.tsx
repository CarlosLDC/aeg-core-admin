"use client";

import { useCallback, useEffect, useState } from "react";
import { AlignLeft, AlignRight, Loader2 } from "lucide-react";
import {
  ToolsActionButton,
  ToolsPage,
  ToolsPanelActions,
  ToolsPanelGrid,
  ToolsPanelSection,
  ToolsSectionHeading,
} from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import {
  getToolsMqttErrorMessage,
  readToolsFooter,
  readToolsHeader,
  writeToolsFooter,
  writeToolsHeader,
} from "@/lib/tools-mqtt-api";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { formFieldTextareaClass } from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";

type HeaderFooterBlockProps = {
  title: string;
  icon: typeof AlignLeft;
  tone: (typeof TOOLS_SECTIONS)["headerFooter"]["tone"];
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

function HeaderFooterBlock({
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
}: HeaderFooterBlockProps) {
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

export function ToolsHeaderFooterPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.headerFooter;
  const [headerContent, setHeaderContent] = useState("");
  const [headerBaseline, setHeaderBaseline] = useState("");
  const [footerContent, setFooterContent] = useState("");
  const [footerBaseline, setFooterBaseline] = useState("");
  const [loadingHeader, setLoadingHeader] = useState(false);
  const [loadingFooter, setLoadingFooter] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [savingFooter, setSavingFooter] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const isBusy = loadingHeader || loadingFooter || savingHeader || savingFooter;

  const loadHeader = useCallback(async () => {
    setLoadingHeader(true);
    try {
      const result = await readToolsHeader(printer.id);
      const content = result.content ?? "";
      setHeaderContent(content);
      setHeaderBaseline(content);
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
      throw err;
    } finally {
      setLoadingHeader(false);
    }
  }, [printer.id, toast]);

  const loadFooter = useCallback(async () => {
    setLoadingFooter(true);
    try {
      const result = await readToolsFooter(printer.id);
      const content = result.content ?? "";
      setFooterContent(content);
      setFooterBaseline(content);
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
      throw err;
    } finally {
      setLoadingFooter(false);
    }
  }, [printer.id, toast]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await loadHeader();
        if (cancelled) return;
        await loadFooter();
      } catch {
        /* loadHeader/loadFooter already toast errors */
      } finally {
        if (!cancelled) {
          setInitialLoadDone(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadHeader, loadFooter]);

  const saveHeader = async () => {
    setSavingHeader(true);
    try {
      const result = await writeToolsHeader(printer.id, headerContent);
      setHeaderBaseline(headerContent);
      toast.success(result.message ?? "Encabezado actualizado.");
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setSavingHeader(false);
    }
  };

  const saveFooter = async () => {
    setSavingFooter(true);
    try {
      const result = await writeToolsFooter(printer.id, footerContent);
      setFooterBaseline(footerContent);
      toast.success(result.message ?? "Pie actualizado.");
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setSavingFooter(false);
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
        />

        <ToolsPanelGrid className="xl:grid-cols-2">
          <HeaderFooterBlock
            title="Encabezado fiscal"
            icon={AlignLeft}
            tone={section.tone}
            value={headerContent}
            baseline={headerBaseline}
            loading={loadingHeader && !initialLoadDone}
            saving={savingHeader}
            busy={isBusy}
            loadingMessage="Leyendo encabezado de la impresora…"
            onChange={setHeaderContent}
            onSave={saveHeader}
            onRevert={() => setHeaderContent(headerBaseline)}
          />

          <HeaderFooterBlock
            title="Pie de página"
            icon={AlignRight}
            tone={section.tone}
            value={footerContent}
            baseline={footerBaseline}
            loading={!initialLoadDone}
            saving={savingFooter}
            busy={isBusy}
            loadingMessage="Leyendo pie de página de la impresora…"
            onChange={setFooterContent}
            onSave={saveFooter}
            onRevert={() => setFooterContent(footerBaseline)}
          />
        </ToolsPanelGrid>
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
