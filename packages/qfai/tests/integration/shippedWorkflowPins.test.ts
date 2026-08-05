/**
 * Integration: shipped GitHub Actions workflow-set action pinning.
 *
 * Covers the supply-chain pin half of the shipped-workflows contract
 * (`.qfai/contracts/cli/shipped-workflows.md`, CLI-WFSET §6): every `uses:`
 * reference in the shipped set is a bare 40-hex commit SHA pin with no
 * floating major / minor / branch reference anywhere, and no test in the
 * suite retains a floating-major expectation for the shipped workflows (the
 * DTC-26 co-change obligation, scanned tree-wide across
 * `packages/qfai/tests` after the class escaped a file-scoped scan once).
 * The readable version relocated into step `name:` values is the second
 * describe's surface.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { isRecord, loadShippedWorkflows } from "../helpers/shippedWorkflowFixtures.js";

// tests/integration/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TESTS_DIR = path.join(packageRoot, "tests");

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

  it("DTC-26 co-change: no test in the suite expects a floating-major reference for the shipped workflows", async () => {
    // The obligation, not a line pin: once the shipped set is SHA-pinned,
    // any surviving floating-major expectation (`@v<digits>`) would demand
    // the un-pinned form back and turn the pin change red elsewhere. The
    // scan covers the WHOLE tests tree, not just assets.test.ts: the class
    // escaped a file-scoped scan once (tests/cli/init.test.ts carried the
    // same floating expectations as assets.test.ts and stayed red on the
    // pinned tree until this scan was widened).
    const testFiles = (await fg(["**/*.ts"], { cwd: TESTS_DIR, absolute: true })).sort();
    const offending: string[] = [];
    for (const filePath of testFiles) {
      const source = await readFile(filePath, "utf-8");
      const relative = path.relative(TESTS_DIR, filePath).split(path.sep).join("/");
      source.split(/\r?\n/).forEach((line, index) => {
        if (/@v[0-9]/.test(line)) {
          offending.push(`${relative}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offending).toEqual([]);
  });
});

describe("TC-0003-0031 (TDD-0031): readable version lives in the step name without a leading letter", () => {
  // The readable form: digits-dot-digits(-dot-digits). This pattern asserts
  // version PRESENCE in each pinned step's name and nothing more — it can
  // match inside a leading-v string too (e.g. the "4.0" substring of
  // "v4.4.0"). The leading-v PROHIBITION is deliberately not this oracle's
  // job: it is enforced by the guard-pattern zero-match it below, per
  // TC-0003-0031 bullet 3 / CLI-WFSET §6 (presence and leading-v live in
  // separate oracles by the TC's own split).
  const READABLE_VERSION_RE = /\b[0-9]+\.[0-9]+(\.[0-9]+)?\b/;

  // The leakage guard's version regex, mirrored LITERALLY from
  // packages/qfai/scripts/check-no-internal-version-leakage.sh; the
  // tree-wide it below asserts the mirror is still in sync with the guard
  // before judging with it ("guard と同じ pattern" is the TC's requirement).
  const GUARD_VERSION_RE_SOURCE = String.raw`\bv[0-9]+\.[0-9]+(\.[0-9]+)?\b|\bv1\.x\b`;
  const guardVersionRe = (): RegExp => new RegExp(GUARD_VERSION_RE_SOURCE);
  const GUARD_SCRIPT_PATH = path.join(
    packageRoot,
    "scripts",
    "check-no-internal-version-leakage.sh",
  );

  type PinnedStep = { uses: string; name: string | undefined };

  /** Collects every step whose `uses:` suffix is a 40-hex SHA pin. */
  function collectPinnedSteps(doc: unknown): PinnedStep[] {
    const pinned: PinnedStep[] = [];
    if (!isRecord(doc)) {
      return pinned;
    }
    const jobs = doc["jobs"];
    if (!isRecord(jobs)) {
      return pinned;
    }
    for (const job of Object.values(jobs)) {
      if (!isRecord(job)) {
        continue;
      }
      const steps = job["steps"];
      if (!Array.isArray(steps)) {
        continue;
      }
      for (const step of steps) {
        if (!isRecord(step)) {
          continue;
        }
        const uses = step["uses"];
        if (typeof uses !== "string") {
          continue;
        }
        const suffix = refSuffix(uses);
        if (suffix !== undefined && SHA_PIN_RE.test(suffix)) {
          const stepName = step["name"];
          pinned.push({ uses, name: typeof stepName === "string" ? stepName : undefined });
        }
      }
    }
    return pinned;
  }

  it("every SHA-pinned step's name carries a readable version without a leading letter", async () => {
    const missing: string[] = [];
    let pinnedStepCount = 0;
    for (const [name, body] of await loadShippedWorkflows()) {
      for (const step of collectPinnedSteps(parse(body))) {
        pinnedStepCount += 1;
        if (step.name === undefined) {
          missing.push(`${name}: pinned step (uses: ${step.uses}) has no name`);
        } else if (!READABLE_VERSION_RE.test(step.name)) {
          missing.push(`${name}: pinned step name "${step.name}" carries no readable version`);
        }
      }
    }
    // Non-vacuity guard: the shipped set carries pinned steps today; zero
    // collected would mean this oracle stopped observing anything.
    expect(pinnedStepCount).toBeGreaterThanOrEqual(1);
    expect(missing).toEqual([]);
  });

  it("comment lines across the shipped set carry zero guard-pattern version markers", async () => {
    const offending: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      body.split(/\r?\n/).forEach((line, index) => {
        if (!line.trimStart().startsWith("#")) {
          return;
        }
        if (guardVersionRe().test(line)) {
          offending.push(`${name}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offending).toEqual([]);
  });

  it("the guard pattern matches zero times across the whole shipped tree", async () => {
    // SSOT sync first: judging "with the same pattern as the guard" is only
    // honest while the mirrored literal IS the guard's literal.
    const guardScript = await readFile(GUARD_SCRIPT_PATH, "utf-8");
    expect(guardScript).toContain(`INTERNAL_VERSION_RE='${GUARD_VERSION_RE_SOURCE}'`);

    const hits: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      body.split(/\r?\n/).forEach((line, index) => {
        if (guardVersionRe().test(line)) {
          hits.push(`${name}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });
});
