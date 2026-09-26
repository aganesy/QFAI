/**
 * The prototyping CLI contract keeps capture artifacts conditional on the
 * opt-in flag, including the evidence each captured screen requires.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/core/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const CONTRACT = path.join(repoRoot, ".qfai", "spec", "03_contract", "cli", "qfai-prototyping.md");

describe("`qfai prototyping` CLI contract surface", () => {
  it("specifies capture outputs and evidence only for the opt-in path", async () => {
    const contract = await readFile(CONTRACT, "utf-8");
    expect(contract).toContain("## Capture and serve flags");
    expect(contract).toContain("Without either flag, the reviewer writes the");
    expect(contract).toContain("iterate neither captures screenshots and");
    expect(contract).toContain("Output paths (written when `--capture` is passed)");
    expect(contract).toContain("When `--capture` is **not** passed for an iteration");
    expect(contract).toContain("When `--capture` IS passed, `evidenceRefs[]` MUST contain");
  });
});
