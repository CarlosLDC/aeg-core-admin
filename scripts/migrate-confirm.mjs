import fs from "node:fs";
import { execSync } from "node:child_process";

const files = execSync('grep -rl "window.confirm" src', { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

for (const file of files) {
  let c = fs.readFileSync(file, "utf8");
  if (c.includes("useConfirm")) continue;

  if (c.includes("useToast")) {
    if (!c.includes("confirm-provider")) {
      c = c.replace(
        'import { useToast } from "@/context/toast-provider";',
        'import { useToast } from "@/context/toast-provider";\nimport { useConfirm } from "@/context/confirm-provider";',
      );
    }
    c = c.replace(/const toast = useToast\(\);/, "const toast = useToast();\n  const confirm = useConfirm();");
  } else {
    const insertAt = c.indexOf("\n", c.indexOf('"use client"')) + 1;
    c =
      c.slice(0, insertAt) +
      'import { useConfirm } from "@/context/confirm-provider";\n' +
      c.slice(insertAt);
    const fnMatch = c.match(/export function \w+\([^)]*\)\s*\{/);
    if (fnMatch) {
      const idx = c.indexOf(fnMatch[0]) + fnMatch[0].length;
      c = c.slice(0, idx) + "\n  const confirm = useConfirm();" + c.slice(idx);
    }
  }

  c = c.replace(
    /if\s*\(\s*!window\.confirm\(\s*`((?:[^`\\]|\\.)*)`\s*\)\s*\)\s*return;/g,
    'if (!(await confirm({ title: "Confirmar", message: `$1`, destructive: true }))) return;',
  );

  c = c.replace(
    /if\s*\(\s*!window\.confirm\(\s*\n\s*`((?:[^`\\]|\\.)*)`\s*,?\s*\n\s*\)\s*\)\s*return;/g,
    'if (!(await confirm({ title: "Confirmar", message: `$1`, destructive: true }))) return;',
  );

  c = c.replace(
    /if\s*\(\s*!window\.confirm\(\s*`((?:[^`\\]|\\.)*)`\s*\)\s*\)\s*\{\s*return;\s*\}/g,
    'if (!(await confirm({ title: "Confirmar", message: `$1`, destructive: true }))) {\n      return;\n    }',
  );

  c = c.replace(
    /if\s*\(\s*!window\.confirm\(\s*\n\s*`((?:[^`\\]|\\.)*)`\s*,?\s*\n\s*\)\s*\)\s*\{\s*return;\s*\}/g,
    'if (!(await confirm({ title: "Confirmar", message: `$1`, destructive: true }))) {\n      return;\n    }',
  );

  c = c.replace(
    /function (handle\w+|onDelete\w*|confirm\w*)\(/g,
    (match, name) => {
      if (c.includes(`async function ${name}(`)) return match;
      return `async function ${name}(`;
    },
  );

  if (c.includes("await confirm")) {
    c = c.replace(
      /(\n\s+)function (handle\w+)\(/g,
      (full, indent, name) => {
        const re = new RegExp(`async function ${name}\\(`);
        if (re.test(c)) return full;
        return `${indent}async function ${name}(`;
      },
    );
  }

  fs.writeFileSync(file, c);
  console.log("updated", file);
}
