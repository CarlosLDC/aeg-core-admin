"use client";

import { useState } from "react";
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

type HeaderFooterAction =
  | "header-read"
  | "header-write"
  | "footer-read"
  | "footer-write";

export function ToolsHeaderFooterPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.headerFooter;
  const [headerContent, setHeaderContent] = useState("");
  const [footerContent, setFooterContent] = useState("");
  const [loading, setLoading] = useState<HeaderFooterAction | null>(null);

  const run = async (kind: HeaderFooterAction) => {
    setLoading(kind);
    try {
      if (kind === "header-read") {
        const result = await readToolsHeader(printer.id);
        setHeaderContent(result.content ?? "");
        toast.success("Encabezado leído.");
      } else if (kind === "footer-read") {
        const result = await readToolsFooter(printer.id);
        setFooterContent(result.content ?? "");
        toast.success("Pie de página leído.");
      } else if (kind === "header-write") {
        const result = await writeToolsHeader(printer.id, headerContent);
        toast.success(result.message ?? "Encabezado actualizado.");
      } else {
        const result = await writeToolsFooter(printer.id, footerContent);
        toast.success(result.message ?? "Pie actualizado.");
      }
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setLoading(null);
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
            />
            <ToolsPanelActions className="mt-3">
              <ToolsActionButton
                loading={loading === "header-read"}
                disabled={loading != null}
                onClick={() => void run("header-read")}
              >
                Leer
              </ToolsActionButton>
              <ToolsActionButton
                variant="primary"
                loading={loading === "header-write"}
                disabled={loading != null}
                onClick={() => void run("header-write")}
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
            />
            <ToolsPanelActions className="mt-3">
              <ToolsActionButton
                loading={loading === "footer-read"}
                disabled={loading != null}
                onClick={() => void run("footer-read")}
              >
                Leer
              </ToolsActionButton>
              <ToolsActionButton
                variant="primary"
                loading={loading === "footer-write"}
                disabled={loading != null}
                onClick={() => void run("footer-write")}
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
