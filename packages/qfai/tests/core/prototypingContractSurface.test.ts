/**
 * The prototyping CLI contract's non-goals, held against what it goes on to
 * specify.
 *
 * Its non-goals excluded the capture pipeline's PNG and HTML outright, and its
 * "Capture & Serve Flags" section specifies both — their paths, their writers
 * and the evidence obligation they carry under `--capture`. A reader
 * reconciling the two could classify the same output as required and as out of
 * scope, and the one who reached the non-goals first got the answer that is not
 * true where the flag is passed.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/core/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const CONTRACT = path.join(repoRoot, ".qfai", "spec", "03_contract", "cli", "qfai-prototyping.md");

describe("`qfai prototyping` CLI contract surface", () => {
  it("does not exclude in its non-goals what its capture section specifies", async () => {
    const contract = await readFile(CONTRACT, "utf-8");
    const nonGoals = contract.slice(contract.indexOf("## Non-goals (out of contract)"));

    // The section that specifies them has to still be there, or the non-goal
    // would be right and this case would be asserting a contradiction that is
    // gone.
    expect(contract, "the capture section must still specify the outputs").toContain(
      "## Capture & Serve Flags",
    );
    expect(contract, "and name the paths it writes").toContain(
      "Output paths (written when `--capture` is passed)",
    );

    expect(
      nonGoals,
      "the non-goals must not exclude the capture artifacts the contract specifies",
    ).not.toMatch(/Capture pipeline \(PNG \/ HTML/);
    expect(nonGoals, "they are out of contract on the default path, and say so").toContain(
      "Capture pipeline artifacts on the default path",
    );
    expect(nonGoals, "and the transcript is the one out of contract either way").toContain(
      "interaction transcript at any setting",
    );
  });
});
