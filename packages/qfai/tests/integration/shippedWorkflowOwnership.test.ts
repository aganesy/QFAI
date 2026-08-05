/**
 * Integration: shipped GitHub Actions workflow-set ownership.
 *
 * Covers the ownership boundary `qfai init` holds over an adopter's
 * `.github/workflows/` directory (contract:
 * `.qfai/contracts/cli/shipped-workflows.md`, CLI-WFSET). The reserved
 * `qfai-` filename prefix is a reservation notice, not a selector: writes
 * come from the shipped-name list and removals from the retired-name list,
 * never from globbing `qfai-*` on the adopter's disk.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import * as initModule from "../../src/cli/commands/init.js";

// tests/integration/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const INIT_MODULE_PATH = path.join(packageRoot, "src", "cli", "commands", "init.ts");

const readInitSource = (): Promise<string> => readFile(INIT_MODULE_PATH, "utf-8");

const PRUNE_CALLEE = "pruneMatchingEntries(";

/**
 * Extract the argument text of every `pruneMatchingEntries(...)` CALL site in
 * the given source. The `function pruneMatchingEntries(` definition itself is
 * excluded. Arguments are captured up to the balancing close paren by paren
 * counting; parens inside string literals are not special-cased, which is
 * acceptable because the call sites under test pass path segments and
 * predicates whose string literals contain no parentheses.
 */
function extractPruneCallSites(source: string): string[] {
  const sites: string[] = [];
  let from = 0;
  for (;;) {
    const idx = source.indexOf(PRUNE_CALLEE, from);
    if (idx === -1) {
      break;
    }
    const argStart = idx + PRUNE_CALLEE.length;
    from = argStart;
    const preceding = source.slice(Math.max(0, idx - "function ".length), idx);
    if (preceding === "function ") {
      // The definition, not a call.
      continue;
    }
    let depth = 1;
    let end = argStart;
    while (end < source.length && depth > 0) {
      const ch = source.charAt(end);
      if (ch === "(") {
        depth += 1;
      } else if (ch === ")") {
        depth -= 1;
      }
      end += 1;
    }
    sites.push(source.slice(argStart, end - 1));
  }
  return sites;
}

describe("TC-0003-0052 (TDD-0052): pruneMatchingEntries is exported and receives a retired-name predicate", () => {
  it("exports pruneMatchingEntries as a function (module-private would force a parallel re-implementation)", () => {
    // Membership is asserted via the namespace object so a missing export
    // fails THIS assertion instead of crashing module load.
    const exportNames = Object.keys(initModule);
    expect(exportNames).toContain("pruneMatchingEntries");

    const pruneExport: unknown = Reflect.get(initModule, "pruneMatchingEntries");
    expect(typeof pruneExport).toBe("function");
  });

  it("the workflows-directory prune call site uses RETIRED_WORKFLOW_NAMES membership, not a qfai- prefix glob", async () => {
    const source = await readInitSource();
    const callSites = extractPruneCallSites(source);
    const workflowsSites = callSites.filter((site) => site.includes("workflows"));

    // The reserved prefix is a reservation notice, never a deletion selector:
    // a `startsWith("qfai-")` predicate over the adopter-authored workflows
    // directory is forbidden (it would delete adopter-owned qfai-named files).
    const prefixGlobSites = workflowsSites.filter((site) => site.includes('startsWith("qfai-")'));
    expect(
      prefixGlobSites,
      "no workflows-directory pruneMatchingEntries call site may use a startsWith(\"qfai-\") prefix-glob predicate",
    ).toEqual([]);

    // The predicate must be name-set membership over the retired-name list.
    const membershipSites = workflowsSites.filter((site) =>
      site.includes("RETIRED_WORKFLOW_NAMES"),
    );
    expect(
      membershipSites.length,
      "expected a pruneMatchingEntries call site targeting the workflows directory whose predicate tests RETIRED_WORKFLOW_NAMES membership",
    ).toBeGreaterThanOrEqual(1);
  });

  it("no parallel removal helper: one pruneMatchingEntries definition and no second removal-flavoured export", async () => {
    const source = await readInitSource();

    // Exactly one definition of the removal primitive.
    const definitionCount = source.split(`function ${PRUNE_CALLEE}`).length - 1;
    expect(
      definitionCount,
      "init.ts must define pruneMatchingEntries exactly once",
    ).toBe(1);

    // The exported removal surface is exactly the one primitive: exporting a
    // second removal helper would be the parallel implementation the contract
    // forbids ("to be exported, not re-implemented").
    const removalExports = Object.keys(initModule)
      .filter((name) => /prune|remove|delete|unlink/i.test(name))
      .sort();
    expect(removalExports).toEqual(["pruneMatchingEntries"]);
  });
});
