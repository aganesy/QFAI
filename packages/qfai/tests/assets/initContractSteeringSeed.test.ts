/**
 * The `qfai init` contract locates the steering seed where it really lives (#700).
 *
 * `.qfai/contracts/cli/qfai-init.md` stated a MUST-level leakage-guard
 * obligation for the seeded `.qfai/steering/README.md` and
 * `_templates/entry.md`, and in the same sentence said both ship "under
 * `assets/init/.qfai/steering/`". That directory has never existed: both
 * bodies are built in TypeScript by `buildProjectSteeringReadmeBody` /
 * `buildProjectSteeringEntryTemplate` and reach the distributed surface only
 * as string literals inside `dist/`. Anyone auditing the obligation looked for
 * artifacts at the stated path, found none, and could not tell whether the seed
 * was uncovered or the contract was stale.
 */
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const CONTRACT = ".qfai/contracts/cli/qfai-init.md";
const INIT_SRC = "packages/qfai/src/cli/commands/init.ts";
const SEED_BUILDERS = ["buildProjectSteeringReadmeBody", "buildProjectSteeringEntryTemplate"];

const readRepo = (rel: string): Promise<string> => readFile(path.join(repoRoot, rel), "utf-8");

const exists = async (rel: string): Promise<boolean> => {
  try {
    await access(path.join(repoRoot, rel));
    return true;
  } catch {
    return false;
  }
};

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("qfai init contract: steering seed provenance", () => {
  it("names no steering directory under assets/init that does not exist", async () => {
    const contract = await readRepo(CONTRACT);

    expect(contract).not.toContain("assets/init/.qfai/steering");
    // The premise of the assertion above: the path really is absent, so the
    // contract must not be repaired by creating the directory instead.
    expect(await exists("packages/qfai/assets/init/.qfai/steering")).toBe(false);
  });

  it("locates the two seed bodies in the source that builds them", async () => {
    const contract = flat(await readRepo(CONTRACT));

    for (const builder of SEED_BUILDERS) {
      expect(contract).toContain(`\`${builder}\``);
    }
    expect(contract).toContain(`\`${INIT_SRC}\``);
    expect(contract).toContain("ship as string literals inside `dist/`");
  });

  it("says when the leakage guard actually covers the seed bodies", async () => {
    const contract = flat(await readRepo(CONTRACT));

    // Coverage through `dist/` is build-dependent; the contract used to read as
    // if it were unconditional.
    expect(contract).toContain("post-build guard run");
    expect(contract).toContain("lint-only run skips `dist/` by design");
    // The layer that does cover the bodies unconditionally.
    expect(contract).toContain("packages/qfai/tests/integration/distributedSurfaceLeakage.test.ts");
  });

  it("keeps the builders it names resolvable in init.ts", async () => {
    const init = await readRepo(INIT_SRC);

    for (const builder of SEED_BUILDERS) {
      expect(init).toContain(`function ${builder}(`);
    }
  });
});
