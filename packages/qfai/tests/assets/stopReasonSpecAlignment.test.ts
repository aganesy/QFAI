/**
 * No document may name a `stopReason` value the loop cannot write.
 *
 * `--check-convergence` was specified to exit 0 when
 * `stopReason === "axes-exceptional"`, and nothing has ever recorded that
 * value — `STOP_REASONS` carries `converged`. A consumer implementing from the
 * contract would have built for a state the tool cannot produce, and no test
 * compared the two lists.
 *
 * The enum is read out of the source here rather than restated, so adding a
 * stop reason needs no edit to this file and removing one reddens every
 * document that still names it.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

import { STOP_REASONS } from "../../src/core/prototyping/iteration.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const SCANNED = [".qfai/spec/**/*.md"];

/**
 * Documents that record what a value used to be. A delta, a TDD worklog row
 * and a change request all exist to hold superseded text, and rewriting them
 * would destroy the record they are for.
 */
const EXEMPT_FILE = /(^\.qfai\/spec\/decisions\.md$|09_delta\.md$)/;

/**
 * The retired vocabulary, matched bare rather than inside backticks: the value
 * is written `` `stopReason: "axes-exceptional"` `` as often as it is written
 * on its own, and a backtick-anchored pattern misses every one of those.
 */
const RETIRED_RE = /\b(axes-exceptional|axes-below-exceptional)\b/g;

/** Every way a document writes a value into the field, so a new one is caught by shape. */
const ASSIGNED_RE = /stopReason\s*(?::|===|==|is)\s*[`"']?([a-z][a-z-]*)[`"']?/g;

/** A schema block declares the field's TYPE on the same shape as a value. */
const TYPE_WORDS = new Set(["enum", "string", "null", "one", "either", "exactly"]);

/** The reported-but-not-gating categories the blocked summary prints. */
const BLOCKED_CATEGORIES = ["designMdViolations", "layoutAntiPatternsDetected", "blockingFindings"];

describe("the stop reasons a document names are the ones the loop writes", () => {
  it("the source enum carries `converged` and not the retired axis name", () => {
    // The premise every row below rests on. Asserting it here means a rename in
    // the source reddens this row rather than silently emptying the sweep.
    expect([...STOP_REASONS]).toContain("converged");
    expect([...STOP_REASONS]).not.toContain("axes-exceptional");
  });

  it("no current story or CLI contract names a stop reason the enum does not carry", async () => {
    const declared = new Set<string>(STOP_REASONS);
    const files = await fg(SCANNED, { cwd: repoRoot, absolute: false, dot: true });
    expect(files.length, "the sweep must have found documents to be about").toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const rel of files) {
      const posix = rel.replace(/\\/g, "/");
      if (EXEMPT_FILE.test(posix)) continue;
      const lines = (await readFile(path.join(repoRoot, rel), "utf-8")).split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? "";
        // A row that records a criterion as retired is a record, not a claim.
        if (/superseded by/i.test(line)) continue;
        for (const [, value] of line.matchAll(RETIRED_RE)) {
          offenders.push(`${posix}:${i + 1}: ${String(value)}`);
        }
        for (const [, value] of line.matchAll(ASSIGNED_RE)) {
          if (value === undefined || declared.has(value) || TYPE_WORDS.has(value)) continue;
          offenders.push(`${posix}:${i + 1}: assigned ${value}`);
        }
      }
    }

    expect(offenders, "a stop reason no run records").toEqual([]);
  });

  it("the blocked-cause summary names the three arrays the stop reads", async () => {
    // The third category was `axes-below-exceptional`, an axis score. The stop
    // reads three arrays, so an operator given an axis there looks for a cause
    // nothing consulted.
    const blocked = await readFile(
      path.join(
        repoRoot,
        "packages/qfai/assets/init/.qfai/assistant/skill/qfai-prototyping/references/review-payload-schema.md",
      ),
      "utf-8",
    );
    for (const category of BLOCKED_CATEGORIES) {
      expect(blocked ?? "").toContain(category);
    }
  });
});
