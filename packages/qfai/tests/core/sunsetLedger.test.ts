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

import { isAtOrPastSunset, RULE_PROMOTIONS, SUNSETS } from "../../src/core/sunset.js";
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

/** The shape of a finding code, shared by every regex below. */
const CODE = "[A-Z][A-Z0-9_.-]{2,}";

/**
 * The first argument of an `issue(...)` call: a bare literal, or an identifier
 * to be resolved. A literal-only regex would have missed every code emitted the
 * way `validators/handoffSchemaDrift.ts` and `saasPackage/profile.ts` emit
 * theirs — `const FINDING_CODE = "…"; issue(FINDING_CODE, …)` — which is enough
 * of the codebase that a new hard error could have followed the house style
 * straight past the ratchet.
 */
const ISSUE_ARG_RE = new RegExp(
  `\\bissue\\(\\s*\\n?\\s*(?:"(${CODE})"|([A-Za-z_$][\\w$]*))\\s*,`,
  "g",
);

/**
 * `const NAME = "CODE";` — with an optional type annotation, an optional
 * `as const`, and the `cond ? "A" : "B"` pair that `validators/designFidelity.ts`
 * uses to pick between two codes.
 */
const CODE_CONST_RE = new RegExp(
  `\\bconst\\s+([A-Za-z_$][\\w$]*)\\s*(?::[^=;\\n]+)?=\\s*(?:[^;\\n]*?\\?\\s*)?"(${CODE})"(?:\\s*:\\s*"(${CODE})")?(?:\\s+as\\s+const)?\\s*;`,
  "g",
);

/** The same, exported — visible to every importer, so it resolves globally. */
const EXPORTED_CODE_CONST_RE = new RegExp(
  `\\bexport\\s+const\\s+([A-Za-z_$][\\w$]*)\\s*(?::[^=;\\n]+)?=\\s*"(${CODE})"(?:\\s+as\\s+const)?\\s*;`,
  "g",
);

/** Any code-shaped literal, for files whose emissions cannot be followed. */
const CODE_LITERAL_RE = new RegExp(`"(${CODE})"`, "g");

/** A clean GA release: no prerelease tag, no build metadata, no leading zeros. */
const GA_SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/**
 * Every finding code `src/` emits, resolved through the constant when the call
 * site names one.
 *
 * A file whose `issue(...)` first argument is neither a literal nor a resolvable
 * constant — a code destructured out of a table of tuples
 * (`validators/agentDefinition.ts`), or one read back off an already-parsed
 * finding (`validators/reviewerJustification.ts`) — is read as opaque: every
 * code-shaped literal in it joins the set. The over-read costs a handful of
 * baseline lines once; skipping the file is the hole this ratchet exists to
 * close, and it is the direction that fails loudly rather than silently.
 */
async function collectIssueCodes(): Promise<Set<string>> {
  const bodies = new Map<string, string>();
  for (const file of await collectSources(SRC)) {
    bodies.set(file, await readFile(file, "utf-8"));
  }

  const exported = new Map<string, string[]>();
  for (const body of bodies.values()) {
    for (const m of body.matchAll(EXPORTED_CODE_CONST_RE)) {
      const [, name, code] = m;
      if (name && code) exported.set(name, [code]);
    }
  }

  const codes = new Set<string>();
  for (const body of bodies.values()) {
    // File-local first: `FINDING_CODE` is declared once per validator with a
    // different value in each, so a global map would resolve most of them to
    // whichever file was read last.
    const local = new Map<string, string[]>();
    for (const m of body.matchAll(CODE_CONST_RE)) {
      const [, name, first, second] = m;
      if (!name || !first) continue;
      local.set(name, second ? [first, second] : [first]);
    }

    let opaque = false;
    for (const m of body.matchAll(ISSUE_ARG_RE)) {
      const [, literal, identifier] = m;
      if (literal) {
        codes.add(literal);
        continue;
      }
      const bound = identifier ? (local.get(identifier) ?? exported.get(identifier)) : undefined;
      if (bound) {
        for (const code of bound) codes.add(code);
        continue;
      }
      opaque = true;
    }

    if (opaque) {
      for (const m of body.matchAll(CODE_LITERAL_RE)) {
        const code = m[1];
        if (code) codes.add(code);
      }
    }
  }
  return codes;
}

/**
 * The **entries** of the `RULE_PROMOTIONS` object literal — the text between
 * its braces, per-entry JSDoc included. An entry names the finding code it
 * governs in its doc comment, because the key is an identifier and the value is
 * the version `newRuleSeverity` compares against; neither can hold
 * `TDDLIST_EVIDENCE_EMPTY`.
 *
 * The declaration's own docstring is deliberately excluded. It explains the
 * policy by narrating the code that motivated it, so including it would make
 * that code look registered no matter what the entries say — a check that
 * cannot fail is the failure this file exists to stop.
 */
async function readRulePromotionEntries(): Promise<string> {
  const body = await readFile(path.join(SRC, "core", "sunset.ts"), "utf-8");
  const decl = body.indexOf("export const RULE_PROMOTIONS");
  expect(decl, "RULE_PROMOTIONS declaration not found in sunset.ts").toBeGreaterThan(-1);
  const start = body.indexOf("{", decl);
  const end = body.indexOf("} as const;", decl);
  expect(start, "RULE_PROMOTIONS is not an object literal").toBeGreaterThan(-1);
  expect(end, "RULE_PROMOTIONS literal is not closed by `} as const;`").toBeGreaterThan(start);
  return body.slice(start + 1, end);
}

/** The version this package ships as — the ceiling on any `introducedIn`. */
async function readShippedVersion(): Promise<string> {
  const raw: unknown = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf-8"));
  const version =
    typeof raw === "object" && raw !== null && "version" in raw && typeof raw.version === "string"
      ? raw.version
      : "";
  expect(version, "package.json#version is not a readable string").toMatch(GA_SEMVER_RE);
  return version;
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
    const codes = await collectIssueCodes();
    expect(
      codes.size,
      "no issue codes extracted — did the `issue(...)` shape change?",
    ).toBeGreaterThan(FINDING_CODES_BEFORE_PROMOTION_POLICY.length);

    // The association is the promotion entry naming its code: `newRuleSeverity`
    // takes a version, so the key alone cannot carry `TDDLIST_EVIDENCE_EMPTY`.
    const promotions = await readRulePromotionEntries();
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

  it("every RULE_PROMOTIONS entry opens a window at least one minor wide", async () => {
    // Naming a code in the registry is not the same as giving it a window. A
    // pin at or before the release that introduced the code makes
    // `newRuleSeverity` return `error` from day one — the exact regression P7
    // was written after — and a pin that is not parseable semver makes the
    // conservative fallback in `isAtOrPastSunset` return `warning` forever, so
    // the promotion never happens at all. Both read as "registered" to the
    // assertion above.
    const shipped = await readShippedVersion();

    for (const [key, window] of Object.entries(RULE_PROMOTIONS)) {
      const introduced = GA_SEMVER_RE.exec(window.introducedIn);
      const promoted = GA_SEMVER_RE.exec(window.promoteAt);

      expect(
        introduced,
        `${key}.introducedIn is not a GA release: ${window.introducedIn}`,
      ).not.toBeNull();
      expect(
        promoted,
        `${key}.promoteAt is not a GA release: ${window.promoteAt} — ` +
          "an unparseable pin leaves the finding a warning forever, because " +
          "`isAtOrPastSunset` treats what it cannot read as pre-sunset",
      ).not.toBeNull();
      if (!introduced || !promoted) continue;

      const from = { major: Number(introduced[1]), minor: Number(introduced[2]) };
      const to = { major: Number(promoted[1]), minor: Number(promoted[2]) };
      expect(
        to.major > from.major || (to.major === from.major && to.minor >= from.minor + 1),
        `${key} promotes at ${window.promoteAt}, less than one minor past the ` +
          `${window.introducedIn} release that introduced the code — P7 requires a window ` +
          "the consuming repository can actually migrate inside of",
      ).toBe(true);

      // The other way the distance can be faked: backdate `introducedIn` to
      // buy a pin that has already passed. A code cannot have shipped in a
      // release this package has not cut yet.
      expect(
        isAtOrPastSunset(shipped, window.introducedIn),
        `${key}.introducedIn (${window.introducedIn}) is ahead of the shipped ` +
          `version ${shipped} — record the release the code actually shipped in`,
      ).toBe(true);
    }
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
