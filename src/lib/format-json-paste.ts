/**
 * Pretty-prints pasted text when it is valid JSON (object or array).
 * Returns null if the text is empty or not valid JSON.
 */
export function formatJsonText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== "object") {
      return null;
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return null;
  }
}
