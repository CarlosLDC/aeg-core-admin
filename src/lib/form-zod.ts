import type { z } from "zod";

export function zodFieldErrors<T extends Record<string, unknown>>(
  result: z.ZodSafeParseResult<T>,
): Partial<Record<keyof T, string>> | null {
  if (result.success) return null;
  const errors: Partial<Record<keyof T, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in errors)) {
      errors[key as keyof T] = issue.message;
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}
