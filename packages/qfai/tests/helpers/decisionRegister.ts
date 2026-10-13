import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * This repository's decision register as one text: every listed historical page in
 * name order, then the root append tail. The root lists its pages in the same order.
 */
export function readRepositoryDecisions(repoRoot: string): string {
  const specs = path.join(repoRoot, ".qfai", "spec");
  const pages = path.join(specs, "decisions");
  const names = existsSync(pages)
    ? readdirSync(pages)
        .filter((name) => /^page-\d{4}\.md$/.test(name))
        .sort()
    : [];
  return [...names.map((name) => path.join(pages, name)), path.join(specs, "decisions.md")]
    .map((file) => readFileSync(file, "utf-8"))
    .join("\n");
}
