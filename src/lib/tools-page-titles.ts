export const TOOLS_PAGE_TITLE_BASE = "AEG Tools";

export function toolsPageTitle(suffix?: string | null): string {
  const trimmed = suffix?.trim();
  if (!trimmed) return TOOLS_PAGE_TITLE_BASE;
  return `${TOOLS_PAGE_TITLE_BASE} - ${trimmed}`;
}
