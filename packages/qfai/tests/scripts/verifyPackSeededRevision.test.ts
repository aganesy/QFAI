/**
 * The review pack `verify-pack` seeds names a commit that resolves.
 *
 * The sandbox it validates lives under this repository's own work tree, so the
 * check behind `revision` resolves the value against this repository. A
 * placeholder resolves to nothing and reports a warning on every release run —
 * one no change to the product can remove, in the list a reader scans before
 * shipping — and the branch that runs when a revision does resolve never runs.
 *
 * `verify-pack` itself is the behavioural check: it now fails when the seeded
 * pack produces any finding about itself, and that runs on every `ci:gate`.
 * These cases are the cheap half — they read the script rather than packing the
 * tarball, so a placeholder put back is caught in the ordinary test run instead
 * of minutes later.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SCRIPT = path.join(repoRoot, "scripts", "verify-pack.mjs");

const source = async (): Promise<string> => readFile(SCRIPT, "utf-8");

describe("the seeded review pack's revision", () => {
  it("comes from the checkout rather than a literal", async () => {
    const text = await source();

    expect(text).toContain(`revision: seededRevision,`);
    expect(text).toContain(`execFileSync("git", ["rev-parse", "HEAD"]`);
  });

  it("is not a hex literal anywhere in the script", async () => {
    // Any 7-64 hex run passes the field's form check and then resolves to
    // nothing, so the placeholder shape is what has to stay out — not one
    // particular value of it.
    const text = await source();

    const literals = [...text.matchAll(/revision:\s*"([0-9a-f]{7,64})"/gi)].map(
      (match) => match[1],
    );

    expect(literals).toEqual([]);
  });

  it("fails the run when the seeded pack is the subject of a finding", async () => {
    // `--fail-on error` lets a warning past, so without this the run stays
    // green while the fixture keeps reporting itself.
    const text = await source();

    expect(text).toContain("the seeded review pack produced findings about itself");
  });
});
