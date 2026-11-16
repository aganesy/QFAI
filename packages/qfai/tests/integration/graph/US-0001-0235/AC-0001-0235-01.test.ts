// QFAI:AC-0001-0235-01

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const RULE = path.join(
  PACKAGE_ROOT,
  "assets",
  "init",
  "root",
  ".agents",
  "rules",
  "graph-exploration.md",
);

describe("AC-0001-0235-01", () => {
  // QFAI:EX-0001-0235-01
  it("names the graph CLIs first and keeps ordinary search acceptable", async () => {
    const text = (await readFile(RULE, "utf8")).replace(/\s+/g, " ");
    const opening = text.split(" ## ")[0] ?? "";
    expect(opening).toContain(
      "For searching, exploring and investigating code or documents, prefer the project graph CLIs first.",
    );
    expect(opening).toContain("is acceptable, and no tool blocks it.");
    expect(text).toContain('node .qfai/tools/graph-cli.mjs code "your code question"');
    expect(text).toContain('node .qfai/tools/graph-cli.mjs documents "your document question"');
  });
});
