"use client";

import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlignLeft, AlignRight, Loader2 } from "lucide-react";
import {
  ToolsActionButton,
  ToolsPage,
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
import type { ToolsSectionTone } from "@/lib/tools-sections";
import { formFieldTextareaClass } from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";
import { cn } from "@/lib/utils";

type HeaderFooterKind = "header" | "footer";

type HeaderFooterBlockProps = {
  title: string;
  icon: LucideIcon;
  tone: ToolsSectionTone;
  content: string;
  loading: boolean;
  saving: boolean;
  initialLoadDone: boolean;
  onReload: () => void;
  onSave: (value: string) => Promise<void>;
};

function HeaderFooterBlock({
  title,
  icon,
  tone,
  content,
  loading,
  saving,
  initialLoadDone,
  onReload,
  onSave,
}: HeaderFooterBlockProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEditing = () => {
    setDraft(content);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(content);
    setEditing(false);
  };

  const save = async () => {
    await onSave(draft);
    setEditing(false);
  };

  return (
    <ToolsPanelSection title={title} icon={icon} tone={tone}>
      {loading && !initialLoadDone ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Leyendo contenido de la impresora…
        </div>
      ) : editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className={formFieldTextareaClass}
            disabled={saving}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <ToolsActionButton
              variant="primary"
              loading={saving}
              disabled={saving}
              onClick={() => void save()}
            >
              Guardar
            </ToolsActionButton>
            <ToolsActionButton disabled={saving} onClick={cancelEditing}>
              Cancelar
            </ToolsActionButton>
          </div>
        </>
      ) : (
        <>
          <pre
            className={cn(
              "min-h-[9rem] overflow-auto rounded-lg border border-border bg-foreground/[0.03] p-3",
              "whitespace-pre-wrap font-mono text-xs text-card-foreground",
            )}
          >
            {content.trim() ? content : "Sin contenido registrado."}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <ToolsActionButton
              variant="primary"
              disabled={loading || saving}
              onClick={startEditing}
            >
              Editar
            </ToolsActionButton>
            <ToolsActionButton
              loading={loading}
              disabled={loading || saving}
              onClick={onReload}
            >
              Actualizar
            </ToolsActionButton>
          </div>
        </>
      )}
    </ToolsPanelSection>
  );
}

export function ToolsHeaderFooterPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.headerFooter;
  const [headerContent, setHeaderContent] = useState("");
  const [footerContent, setFooterContent] = useState("");
  const [loadingHeader, setLoadingHeader] = useState(false);
  const [loadingFooter, setLoadingFooter] = useState(false);
  const [savingKind, setSavingKind] = useState<HeaderFooterKind | null>(null);
  const [initialHeaderLoadDone, setInitialHeaderLoadDone] = useState(false);
  const [initialFooterLoadDone, setInitialFooterLoadDone] = useState(false);

  const loadHeader = useCallback(
    async (options?: { notify?: boolean }) => {
      setLoadingHeader(true);
      try {
        const result = await readToolsHeader(printer.id);
        setHeaderContent(result.content ?? "");
        if (options?.notify) {
          toast.success("Encabezado actualizado.");
        }
      } catch (err) {
        toast.error(getToolsMqttErrorMessage(err));
      } finally {
        setLoadingHeader(false);
        setInitialHeaderLoadDone(true);
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
          toast.success("Pie de página actualizado.");
        }
      } catch (err) {
        toast.error(getToolsMqttErrorMessage(err));
      } finally {
        setLoadingFooter(false);
        setInitialFooterLoadDone(true);
      }
    },
    [printer.id, toast],
  );

  useEffect(() => {
    void loadHeader();
    void loadFooter();
  }, [loadHeader, loadFooter]);

  const saveHeader = async (value: string) => {
    setSavingKind("header");
    try {
      const result = await writeToolsHeader(printer.id, value);
      setHeaderContent(value);
      toast.success(result.message ?? "Encabezado actualizado.");
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
      throw err;
    } finally {
      setSavingKind(null);
    }
  };

  const saveFooter = async (value: string) => {
    setSavingKind("footer");
    try {
      const result = await writeToolsFooter(printer.id, value);
      setFooterContent(value);
      toast.success(result.message ?? "Pie actualizado.");
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
      throw err;
    } finally {
      setSavingKind(null);
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <HeaderFooterBlock
            title="Encabezado fiscal"
            icon={AlignLeft}
            tone={section.tone}
            content={headerContent}
            loading={loadingHeader}
            saving={savingKind === "header"}
            initialLoadDone={initialHeaderLoadDone}
            onReload={() => void loadHeader({ notify: true })}
            onSave={saveHeader}
          />
          <HeaderFooterBlock
            title="Pie de página"
            icon={AlignRight}
            tone={section.tone}
            content={footerContent}
            loading={loadingFooter}
            saving={savingKind === "footer"}
            initialLoadDone={initialFooterLoadDone}
            onReload={() => void loadFooter({ notify: true })}
            onSave={saveFooter}
          />
        </div>
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
