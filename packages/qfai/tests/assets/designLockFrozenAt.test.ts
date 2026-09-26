import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skill/qfai-sdd";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, SKILL, rel), "utf-8");

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (text: string): string => text.replace(/\s*\n\s*#?\s*/g, " ");

describe("the lock's frozenAt says what it is and what checks it", () => {
  for (const tree of TREES) {
    it(`${tree}: a re-freeze writes every field, and no gate reads frozenAt`, async () => {
      // A freeze that rewrote only the hash passed every gate, and a green run
      // read as evidence the timestamp had moved with it.
      const skill = unwrap(await read(tree, "SKILL.md"));
      expect(skill).toContain("complete the root `DESIGN.md` and design-lock checks");

      const authoring = unwrap(await read(tree, "references/design-md-authoring.md"));
      expect(authoring).toContain("freezes its sha256");

      const sample = unwrap(await read(tree, "templates/contracts/design-md-lock.sample.yaml"));
      expect(sample).toContain("Every freeze rewrites the whole file");
      expect(sample).toContain("none reads frozenAt");
    });
  }
});
