/**
 * Integration: shipped GitHub Actions workflow-set action pinning.
 *
 * Covers the supply-chain pin half of the shipped-workflows contract
 * (`.qfai/contracts/cli/shipped-workflows.md`, CLI-WFSET §6): every `uses:`
 * reference in the shipped set is a bare 40-hex commit SHA pin with no
 * floating major / minor / branch reference anywhere, and the legacy
 * floating-major assertions in `tests/assets/assets.test.ts` are subsumed in
 * the same change (the DTC-26 co-change obligation). The human-readable
 * version relocation into step `name:` values is the sibling row's surface
 * and is deliberately not asserted here.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { isRecord, loadShippedWorkflows } from "../helpers/shippedWorkflowFixtures.js";

// tests/integration/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ASSETS_TEST_PATH = path.join(packageRoot, "tests", "assets", "assets.test.ts");

/**
 * Recursively collects every string value held under a `uses` key anywhere
 * in a parsed workflow document (step-level and job-level references alike).
 * YAML comments never reach the parse tree, so comment mentions of an action
 * are deliberately out of scope here — the comment surface belongs to the
 * version-marker rows.
 */
function collectUsesValues(node: unknown): string[] {
  const values: string[] = [];
  if (Array.isArray(node)) {
    for (const member of node) {
      values.push(...collectUsesValues(member));
    }
    return values;
  }
  if (!isRecord(node)) {
    return values;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "uses" && typeof value === "string") {
      values.push(value);
    } else {
      values.push(...collectUsesValues(value));
    }
  }
  return values;
}

/** The `@`-suffix of a `uses:` reference, or undefined when it has none. */
function refSuffix(usesValue: string): string | undefined {
  const at = usesValue.lastIndexOf("@");
  return at === -1 ? undefined : usesValue.slice(at + 1);
}

const SHA_PIN_RE = /^[0-9a-f]{40}$/;
// Floating forms the TC names: a major tag (v4), a minor tag (v4.1), or a
// branch reference. These are the mutable-pointer shapes; an exact-looking
// tag is still not a SHA pin and is caught by the 40-hex assertion.
const FLOATING_REF_RES: readonly RegExp[] = [/^v[0-9]+$/, /^v[0-9]+\.[0-9]+$/, /^(?:main|master)$/];

describe("TC-0003-0030 (TDD-0030): every shipped uses value is a 40-hex SHA pin", () => {
  it("every uses: value in every shipped workflow is pinned to a 40-hex commit SHA", async () => {
    const violations: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      for (const usesValue of collectUsesValues(parse(body))) {
        const suffix = refSuffix(usesValue);
        if (suffix === undefined || !SHA_PIN_RE.test(suffix)) {
          violations.push(`${name}: uses: ${usesValue} is not pinned to a 40-hex commit SHA`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("zero floating major / minor / branch references across the shipped set", async () => {
    const floating: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      for (const usesValue of collectUsesValues(parse(body))) {
        const suffix = refSuffix(usesValue) ?? "";
        if (FLOATING_REF_RES.some((re) => re.test(suffix))) {
          floating.push(`${name}: uses: ${usesValue} is a floating reference`);
        }
      }
    }
    expect(floating).toEqual([]);
  });

  it("DTC-26 co-change: no assertion in assets.test.ts expects a floating-major reference in shipped workflow content", async () => {
    // The obligation, not a line pin: once the shipped set is SHA-pinned,
    // the asset suite's floating-major expectations (`@v<digits>`) must be
    // subsumed in the same change — a surviving one would demand the
    // un-pinned form back and turn the pin change red elsewhere.
    const source = await readFile(ASSETS_TEST_PATH, "utf-8");
    const offending = source
      .split(/\r?\n/)
      .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
      .filter(({ line }) => /@v[0-9]/.test(line))
      .map(({ line, lineNumber }) => `assets.test.ts:${lineNumber}: ${line}`);
    expect(offending).toEqual([]);
  });
});
