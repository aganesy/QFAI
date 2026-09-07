import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped surface plus its root mirror. */
const REFERENCE_PATHS = [
  path.join(
    repoRoot,
    "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/selector-granularity.md",
  ),
  path.join(repoRoot, ".qfai/assistant/skills/qfai-implement/references/selector-granularity.md"),
];

/** The ledger schema summarises the same rule; shipped surface plus its root mirror. */
const LEDGER_PATHS = [
  path.join(
    repoRoot,
    "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/execution-ledger.md",
  ),
  path.join(repoRoot, ".qfai/assistant/skills/qfai-implement/references/execution-ledger.md"),
];

/** Markdown hard-wraps the summary, so compare on a single-spaced form. */
const unwrap = (content: string): string => content.replace(/\s+/g, " ");

describe("selector granularity guidance", () => {
  // The multi-selector example used to pack two independent rejection reasons
  // into one row, which the "one row per independently observable boundary" MUST
  // rule directly below it forbids — an agent following the example broke the
  // rule and an agent following the rule invalidated the example.
  it("illustrates multiple selectors on one shared boundary", async () => {
    for (const file of REFERENCE_PATHS) {
      const content = await readFile(file, "utf-8");

      expect(content).toContain("test_rejects_expired_token_via_header");
      expect(content).toContain("test_rejects_expired_token_via_cookie");
      expect(content).not.toContain("`test_rejects_expired_token, test_rejects_wrong_audience`");
    }
  });

  it("states which rule wins when the two seem to disagree", async () => {
    for (const file of REFERENCE_PATHS) {
      const content = await readFile(file, "utf-8");

      expect(content).toContain("One independently observable boundary per row");
      expect(content).toContain("the row-splitting rule wins");
      // The per-entry RED obligation must survive the rewording.
      expect(content).toContain("RED is still observed **per selector entry**");
    }
  });
});

describe("execution ledger selector-granularity summary", () => {
  // The summary counted boundaries per selector entry, which licenses exactly the
  // row selector-granularity.md forbids. The boundary count is per row; only the
  // RED observation is per entry.
  it("counts boundaries per row and RED observations per selector entry", async () => {
    for (const file of LEDGER_PATHS) {
      const content = unwrap(await readFile(file, "utf-8"));

      expect(content).toContain("**one independently observable boundary per row**");
      expect(content).toContain("with RED observed per selector entry");
      expect(content).not.toContain("boundary per selector entry**");
    }
  });

  it("carries the precedence sentence where the mistake is made", async () => {
    for (const file of LEDGER_PATHS) {
      const content = unwrap(await readFile(file, "utf-8"));

      expect(content).toContain(
        "If you cannot name the single boundary that every selector entry on a row observes, split the row.",
      );
    }
  });
});
