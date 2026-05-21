import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RESOURCE_FIELD_PARITY_SPECS } from "@/lib/ui-field-parity";

function hasAnyLabel(content: string, labels: string[]): boolean {
  return labels.some((label) => content.includes(label));
}

function hasAnyBinding(content: string, bindings?: string[]): boolean {
  if (!bindings || bindings.length === 0) return true;
  return bindings.some((binding) => content.includes(binding));
}

describe("ui field parity", () => {
  it("ensures modal fields are represented in detail views", () => {
    for (const spec of RESOURCE_FIELD_PARITY_SPECS) {
      const formPaths = Array.isArray(spec.formPath)
        ? spec.formPath
        : [spec.formPath];
      const formContent = formPaths
        .map((formPath) => readFileSync(resolve(process.cwd(), formPath), "utf8"))
        .join("\n");
      const viewContent = readFileSync(resolve(process.cwd(), spec.viewPath), "utf8");

      for (const field of spec.fields) {
        expect(
          hasAnyLabel(formContent, field.formLabels),
          `[${spec.resource}] form is missing one of: ${field.formLabels.join(" | ")}`,
        ).toBe(true);
        expect(
          hasAnyBinding(formContent, field.formBindings),
          `[${spec.resource}] form binding is missing one of: ${(field.formBindings ?? []).join(" | ")}`,
        ).toBe(true);
        expect(
          hasAnyLabel(viewContent, field.viewLabels),
          `[${spec.resource}] view is missing one of: ${field.viewLabels.join(" | ")}`,
        ).toBe(true);
        expect(
          hasAnyBinding(viewContent, field.viewBindings),
          `[${spec.resource}] view binding is missing one of: ${(field.viewBindings ?? []).join(" | ")}`,
        ).toBe(true);
      }
    }
  });
});
