"use client";

import { useCallback, useEffect, useState } from "react";
import { AlignLeft, AlignRight } from "lucide-react";
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

export function ToolsHeaderFooterPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.headerFooter;
  const [headerContent, setHeaderContent] = useState("");
  const [footerContent, setFooterContent] = useState("");
  const [loadingHeader, setLoadingHeader] = useState(false);
  const [loadingFooter, setLoadingFooter] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [savingFooter, setSavingFooter] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const isBusy = loadingHeader || loadingFooter || savingHeader || savingFooter;

  const loadHeader = useCallback(
    async (options?: { notify?: boolean }) => {
      setLoadingHeader(true);
      try {
        const result = await readToolsHeader(printer.id);
        setHeaderContent(result.content ?? "");
        if (options?.notify) {
          toast.success("Encabezado leído.");
        }
      } catch (err) {
        toast.error(getToolsMqttErrorMessage(err));
        throw err;
      } finally {
        setLoadingHeader(false);
      }
    },
    [printer.id, toast],
  );

  const loadFooter = useCallback(
    async (options?: { notify?: boolean }) => {
      setLoadingFooter(true);
      try {
        const result = await readToolsFooter(printer.id);
        setFooterContent(result.content ?? "");
        if (options?.notify) {
          toast.success("Pie de página leído.");
        }
      } catch (err) {
        toast.error(getToolsMqttErrorMessage(err));
        throw err;
      } finally {
        setLoadingFooter(false);
      }
    },
    [printer.id, toast],
  );

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
          <ToolsPanelSection
            title="Encabezado fiscal"
            icon={AlignLeft}
            tone={section.tone}
          >
            <textarea
              value={headerContent}
              onChange={(e) => setHeaderContent(e.target.value)}
              rows={6}
              className={formFieldTextareaClass}
              disabled={isBusy || !initialLoadDone}
            />
            <ToolsPanelActions className="mt-3">
              <ToolsActionButton
                loading={loadingHeader}
                disabled={isBusy}
                onClick={() => void loadHeader({ notify: true })}
              >
                Leer
              </ToolsActionButton>
              <ToolsActionButton
                variant="primary"
                loading={savingHeader}
                disabled={isBusy}
                onClick={() => void saveHeader()}
              >
                Guardar
              </ToolsActionButton>
            </ToolsPanelActions>
          </ToolsPanelSection>

          <ToolsPanelSection
            title="Pie de página"
            icon={AlignRight}
            tone={section.tone}
          >
            <textarea
              value={footerContent}
              onChange={(e) => setFooterContent(e.target.value)}
              rows={6}
              className={formFieldTextareaClass}
              disabled={isBusy || !initialLoadDone}
            />
            <ToolsPanelActions className="mt-3">
              <ToolsActionButton
                loading={loadingFooter}
                disabled={isBusy}
                onClick={() => void loadFooter({ notify: true })}
              >
                Leer
              </ToolsActionButton>
              <ToolsActionButton
                variant="primary"
                loading={savingFooter}
                disabled={isBusy}
                onClick={() => void saveFooter()}
              >
                Guardar
              </ToolsActionButton>
            </ToolsPanelActions>
          </ToolsPanelSection>
        </ToolsPanelGrid>
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
