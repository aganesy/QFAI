/**
 * The ATDD skill reference tells the operator that the scaffold-placeholder
 * escalation is tunable and names the key: `atdd.scaffoldEscalateCycles` in
 * `qfai.config.yaml`. The config `qfai init` seeds must therefore carry that
 * key, at the value the code falls back to, or the reference sends the reader
 * to a file where the knob is invisible — its name, its nesting depth and its
 * default all have to be guessed.
 *
 * The load-bearing assertion is the round trip: the seeded asset is parsed by
 * the production loader, so a key written at the wrong nesting depth (under
 * `validation:`, say) or with a value the normalizer rejects fails here rather
 * than silently reverting to the in-code default at runtime.
 */

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_SCAFFOLD_ESCALATE_CYCLES } from "../../src/core/atdd/scaffoldEscalation.js";
import { loadConfig } from "../../src/core/config.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const INIT_CONFIG = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  "root",
  "qfai.config.yaml",
);
const SCAFFOLDING_REFERENCE = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-atdd",
  "references",
  "scaffolding.md",
);

let tempRoot: string | null = null;

afterEach(async () => {
  if (tempRoot !== null) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
});

describe("the seeded config exposes the ATDD scaffold tunable the skill documents", () => {
  it("loads atdd.scaffoldEscalateCycles from the init config at the in-code default", async () => {
    const seeded = await readFile(INIT_CONFIG, "utf-8");
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-seed-"));
    await writeFile(path.join(tempRoot, "qfai.config.yaml"), seeded, "utf-8");

    const { config, issues } = await loadConfig(tempRoot);

    expect(
      issues.filter((issue) => issue.severity === "error"),
      "the seeded qfai.config.yaml does not load cleanly",
    ).toEqual([]);
    expect(
      config.atdd?.scaffoldEscalateCycles,
      "packages/qfai/assets/init/root/qfai.config.yaml must seed atdd.scaffoldEscalateCycles " +
        "at the in-code default, or the reference names a key the operator cannot find",
    ).toBe(DEFAULT_SCAFFOLD_ESCALATE_CYCLES);
  });

  it("keeps the seeded key and the reference that advertises it spelled the same", async () => {
    const [reference, seeded] = await Promise.all([
      readFile(SCAFFOLDING_REFERENCE, "utf-8"),
      readFile(INIT_CONFIG, "utf-8"),
    ]);

    expect(
      reference,
      "scaffolding.md no longer points at qfai.config.yaml#atdd.scaffoldEscalateCycles",
    ).toContain("qfai.config.yaml#atdd.scaffoldEscalateCycles");
    expect(seeded, "the seeded config no longer names scaffoldEscalateCycles").toContain(
      "scaffoldEscalateCycles",
    );
  });
});
