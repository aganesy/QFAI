/**
 * The guard that `sunsetEnforcement.test.ts` was supposed to be.
 *
 * That file's docstring says "a future sunset cannot be announced without being
 * enforced", but its two assertions are
 *
 *   expect(typeof deprecationSeverity(v, s)).toBe("string");
 *   expect(isAtOrPastSunset(v, s)).toBe(deprecationSeverity(v, s) === "error");
 *
 * and `deprecationSeverity` is *defined* as `isAtOrPastSunset(...) ? "error" :
 * "warning"`. The second is a tautology over the function's own body; the first
 * checks that a function typed `"warning" | "error"` returns a string. Neither
 * observes a call site. Worse, it iterates `Object.entries(SUNSETS)` — its
 * domain is keys that already exist, while every gap found across five review
 * rounds of the 1.10.0 release was a **missing** key. It is structurally blind
 * to the only failure mode it was written for.
 *
 * These assertions look at the two places a sunset can go wrong instead:
 * a key with no consumer (declared, never wired) and a constraint row naming a
 * finding code that no code emits (promised, never built).
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { RULE_PROMOTIONS, SUNSETS } from "../../src/core/sunset.js";
import { FINDING_CODES_BEFORE_PROMOTION_POLICY } from "./findingCodeBaseline.js";

// tests/core/<this file> -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const SRC = path.join(packageRoot, "src");
const CONSTRAINTS = path.join(repoRoot, ".qfai", "specs", "_policies", "07_Constraints.md");

async function collectSources(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectSources(full)));
    } else if (entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * A finding code as written at its `issue(...)` call site — the first argument,
 * a bare literal. Wrapper helpers that pass a code through are out of the
 * ratchet's reach on purpose: this is a ratchet, not a proof.
 */
const ISSUE_CODE_RE = /\bissue\(\s*\n?\s*"([A-Z][A-Z0-9_.-]{2,})"\s*,/g;

/**
 * The `RULE_PROMOTIONS` object literal, JSDoc included. A promotion entry names
 * the finding code it governs in its doc comment, because the key is an
 * identifier and the value is the version `newRuleSeverity` compares against —
 * neither can hold `TDDLIST_EVIDENCE_EMPTY`.
 */
async function readRulePromotionsBlock(): Promise<string> {
  const body = await readFile(path.join(SRC, "core", "sunset.ts"), "utf-8");
  const start = body.indexOf("export const RULE_PROMOTIONS");
  expect(start, "RULE_PROMOTIONS declaration not found in sunset.ts").toBeGreaterThan(-1);
  const docStart = body.lastIndexOf("/**", start);
  const end = body.indexOf("} as const;", start);
  expect(end, "RULE_PROMOTIONS literal is not closed by `} as const;`").toBeGreaterThan(-1);
  return body.slice(docStart === -1 ? start : docStart, end);
}

/** Every `src/` file, minus `sunset.ts` — the declaration is not a consumer. */
async function readConsumerSources(): Promise<string> {
  const files = (await collectSources(SRC)).filter(
    (f) => path.basename(f) !== "sunset.ts" && !f.endsWith(path.join("core", "sunset.ts")),
  );
  const bodies = await Promise.all(files.map((f) => readFile(f, "utf-8")));
  return bodies.join("\n");
}

describe("sunset ledger", () => {
  it("every SUNSETS key is read by something outside sunset.ts", async () => {
    // Catches the half-landed state each of these fixes can produce: the key is
    // added, the call site is forgotten, and `sunsetEnforcement.test.ts` goes on
    // passing because the key exists.
    const sources = await readConsumerSources();
    const unused = Object.keys(SUNSETS).filter((key) => !sources.includes(`SUNSETS.${key}`));

    expect(unused, `declared in SUNSETS but never read: ${unused.join(", ")}`).toEqual([]);
  });

  it("every RULE_PROMOTIONS key is read by something outside sunset.ts", async () => {
    // Same half-landed state, mirrored: a new finding code gets its promotion
    // pin added here and keeps emitting a hard-coded `"error"` at its call
    // site, which is exactly the shape that latched a consuming repository's
    // gate on upgrade. A pin nothing reads is a policy nothing applies.
    const sources = await readConsumerSources();
    const unused = Object.keys(RULE_PROMOTIONS).filter(
      (key) => !sources.includes(`RULE_PROMOTIONS.${key}`),
    );

    expect(unused, `declared in RULE_PROMOTIONS but never read: ${unused.join(", ")}`).toEqual([]);
  });

  it("every finding code introduced after P7 is named by a RULE_PROMOTIONS entry", async () => {
    // The other direction, and the one the registry cannot see on its own: the
    // assertion above iterates `RULE_PROMOTIONS`, so its domain is keys that
    // already exist — the same structural blindness this file's docstring
    // charges `sunsetEnforcement.test.ts` with. The failure P7 exists to stop
    // (a new `issue("NEW_CODE", …, "error", …)` whose promotion was never
    // registered) writes nothing into the registry, so it has to be found from
    // the emitting side, measured against a frozen baseline.
    const codes = new Set<string>();
    for (const file of await collectSources(SRC)) {
      const body = await readFile(file, "utf-8");
      for (const m of body.matchAll(ISSUE_CODE_RE)) {
        const code = m[1];
        if (code) codes.add(code);
      }
    }
    expect(
      codes.size,
      "no issue codes extracted — did the `issue(...)` shape change?",
    ).toBeGreaterThan(FINDING_CODES_BEFORE_PROMOTION_POLICY.length);

    // The association is the promotion entry naming its code: `newRuleSeverity`
    // takes a version, so the key alone cannot carry `TDDLIST_EVIDENCE_EMPTY`.
    const promotions = await readRulePromotionsBlock();
    const baseline = new Set(FINDING_CODES_BEFORE_PROMOTION_POLICY);
    const unregistered = [...codes]
      .filter((code) => !baseline.has(code) && !promotions.includes(code))
      .sort();

    expect(
      unregistered,
      `introduced after P7 but given no RULE_PROMOTIONS entry in sunset.ts: ${unregistered.join(", ")} — ` +
        "a new finding code ships behind a promotion window (docs/design-principles.md P7); " +
        "do not add it to findingCodeBaseline.ts, which is frozen at the codes that predate the policy",
    ).toEqual([]);
  });

  it("every finding code named by a sunset-bearing constraint row exists in src/", async () => {
    // The assertion that would have caught three of the five review rounds:
    // `D-DEPRECATED-SCHEMA` and `D-HANDOFF-LEGACY-FORMAT` were both named in a
    // constraint as escalating at 1.10.0 while no code emitted them at all.
    const constraints = await readFile(CONSTRAINTS, "utf-8");
    const rows = constraints.split("\n").filter((line) => /^\|/.test(line) && /sunset/i.test(line));
    expect(
      rows.length,
      "no sunset-bearing constraint rows found — did the table move?",
    ).toBeGreaterThan(0);

    const codes = new Set<string>();
    for (const row of rows) {
      for (const m of row.matchAll(/`(QFAI-[A-Z]+-\d+|[A-Z]-[A-Z][A-Z-]+)`/g)) {
        const code = m[1];
        if (code) codes.add(code);
      }
    }
    expect(codes.size, "sunset rows named no finding codes — check the regex").toBeGreaterThan(0);

    const sources = await readConsumerSources();
    const missing = [...codes].filter((code) => !sources.includes(`"${code}"`));

    expect(
      missing,
      `named by a sunset constraint but emitted by nothing in src/: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("no source file hand-rolls a sunset comparison", async () => {
    // Three separate comparators had grown around the one pin that `sunset.ts`
    // could not parse, and two of them ignored the patch and prerelease fields.
    // A version regex next to a sunset literal is the shape that produced them.
    const files = (await collectSources(SRC)).filter((f) => path.basename(f) !== "sunset.ts");
    const offenders: string[] = [];
    for (const file of files) {
      const body = await readFile(file, "utf-8");
      const hasVersionRegex =
        /\/\^?\\\(?d\+\\?\)?\./.test(body) || /\(\\d\+\)\\\.\(\\d\+\)/.test(body);
      const mentionsSunset = /sunset/i.test(body);
      if (hasVersionRegex && mentionsSunset) {
        offenders.push(path.relative(packageRoot, file));
      }
    }

    expect(
      offenders,
      `parses a version next to a sunset instead of calling deprecationSeverity: ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});
