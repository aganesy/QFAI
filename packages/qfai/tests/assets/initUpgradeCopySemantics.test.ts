/**
 * `--upgrade-assistant-tree` copies; the contract must say so (#717).
 *
 * `.qfai/contracts/cli/qfai-init.md` described the per-file operation three
 * times and one of the three said "move". The exit-code table uses the copy
 * semantics as the stated reason exit 65 is left unimplemented, and the
 * deprecation-window bullet says the old paths survive — so the "move" bullet
 * contradicted both its own file and `runUpgradeAssistantTree`, which reads
 * each legacy file and writes it to the new path without ever unlinking it.
 *
 * This test pins the contract's wording to the implementation it describes.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const readRepo = (rel: string): Promise<string> => readFile(path.join(repoRoot, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

const CONTRACT = ".qfai/contracts/cli/qfai-init.md";
const IMPL = "packages/qfai/src/cli/commands/init.ts";

/**
 * The body of `runUpgradeAssistantTree`, from its declaration to the first
 * column-0 `}` that closes it. Returns `undefined` when the function is
 * renamed or restructured so the assertion fails loudly instead of silently
 * passing on an empty slice.
 */
const upgradeHelperBody = (source: string): string | undefined => {
  const start = source.indexOf("async function runUpgradeAssistantTree(");
  if (start < 0) return undefined;
  const end = source.indexOf("\n}\n", start);
  if (end < 0) return undefined;
  return source.slice(start, end);
};

describe("--upgrade-assistant-tree contract wording (#717)", () => {
  it("describes the per-file operation as a copy that leaves the original in place", async () => {
    const contract = flat(await readRepo(CONTRACT));

    expect(contract).toContain(
      "For each file in the relocation table, copy the existing user-edited content to the new path.",
    );
    expect(contract).not.toContain("move the existing user-edited content to the new path");
    // The deliberate retention is stated where the operation is described,
    // not only in the deprecation-window bullet three lines later.
    expect(contract).toContain("The original is left in place on purpose");
  });

  it("keeps the rest of the Behavior list on copy vocabulary", async () => {
    const contract = flat(await readRepo(CONTRACT));

    expect(contract).not.toContain("After the move");
    expect(contract).toContain("After the copy, run `qfai init` default flow");
    // The section's lead sentence set the reader's expectation before the
    // bullets did, so it carries the same semantics.
    expect(contract).toContain("The pre-recut files stay where they are.");
  });

  it("keeps the premise the reserved exit 65 rests on", async () => {
    const contract = flat(await readRepo(CONTRACT));

    // Exit 65 is unimplemented *because* the helper never clears the legacy
    // layout. A move would invalidate that reasoning.
    expect(contract).toContain("`--upgrade-assistant-tree` copies and never deletes");
    expect(contract).toContain(
      "Old paths are not deleted within the deprecation window (NFR-0002)",
    );
  });

  it("matches the implementation: the helper never removes a legacy file", async () => {
    const body = upgradeHelperBody(await readRepo(IMPL));

    expect(body).toBeDefined();
    // A move would need one of these; the helper has none of them.
    for (const remover of ["unlink(", "rename(", "rmdir(", "rm("]) {
      expect(body).not.toContain(remover);
    }
    expect(body).toContain("await writeFile(newPath, body,");
  });
});
