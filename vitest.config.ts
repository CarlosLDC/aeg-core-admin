import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/lib/permissions/**",
        "src/lib/serial-range.ts",
        "src/lib/batch-create.ts",
        "src/lib/api-error-message.ts",
        "src/lib/form-zod.ts",
        "src/lib/schemas/company-form-schema.ts",
      ],
      exclude: ["src/lib/**/*.test.ts"],
      thresholds: {
        lines: 50,
        functions: 50,
        statements: 50,
        branches: 40,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
