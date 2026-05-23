import { describe, expect, it } from "vitest";
import {
  META_COLUMN_DEFAULT_VISIBLE,
  META_COLUMN_LABELS,
} from "@/lib/table-meta-columns";

describe("table meta columns", () => {
  it("hides created and updated columns by default", () => {
    expect(META_COLUMN_DEFAULT_VISIBLE.createdAt).toBe(false);
    expect(META_COLUMN_DEFAULT_VISIBLE.updatedAt).toBe(false);
  });

  it("uses Spanish labels", () => {
    expect(META_COLUMN_LABELS.createdAt).toBe("Creado el");
    expect(META_COLUMN_LABELS.updatedAt).toBe("Editado el");
  });
});
