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

/**
 * Baseline codes whose emitters have since been deleted, in sorted order — the
 * assertion below compares against a `.sort()`ed set, so a new entry goes in
 * its collating position rather than at the end. An entry earns its place by
 * the validator that raised it being removed from the tree; it is not a place
 * to silence a code that still exists.
 */
const RETIRED_SINCE_BASELINE: string[] = [
  "QFAI-ATDD-001",
  "QFAI-BFLOW-001",
  "QFAI-BFLOW-002",
  "QFAI-BFLOW-004",
  "QFAI-DOC-CONVERGENCE-INCOMPLETE",
  "QFAI-DOC-CONVERGENCE-MISSING",
  "QFAI-DOC-VOCABULARY-CONTRADICTION",
  "QFAI-DOC-VOCABULARY-PROHIBITED",
  // `core/validators/mermaidFence.ts` was its sole emitter. This branch folds
  // that fence check into `mermaidEnforcement.ts` — which raises
  // `QFAI-MMD-001` over the same input — and deletes the file.
  "QFAI-MERMAID-001",
  "QFAI-REQCTX-000",
  "QFAI-REQCTX-001",
  "QFAI-REQCTX-002",
  "QFAI-REQCTX-003",
  "QFAI-REQCTX-004",
  "QFAI-REQCTX-010",
  "QFAI-REQCTX-020",
  "QFAI-REQCTX-021",
  "QFAI-REQINDEX-001",
  "QFAI-REQINDEX-002",
];

/**
 * Post-baseline codes that ship at `info` and stay there.
 *
 * P7's window is a ladder from `warning` to `error`: `newRuleSeverity` returns
 * exactly those two, so routing an `info` finding through it would RAISE its
 * severity on the day it is registered and turn it into a build failure at the
 * pin — the opposite of what a migration window is for. An `info` code is not a
 * softened error waiting to harden; it is off the ladder entirely, and each
 * line here is the reviewed statement that one particular code is.
 *
 * `warning` is deliberately NOT exempt. It is where P7 says a new code STARTS,
 * so a rule keyed on "cannot currently reach error" would excuse the whole
 * population this guard exists to cover: a new warning with no registration
 * would pass forever and never promote.
 *
 * The exemption is verified before it is applied ({@link verifiedInfoOnlyCodes}):
 * an entry must be a code `src/` still emits, must not be a baseline code, and
 * every one of its emissions must pass a literal `"info"`. A code that gains a
 * `warning`, an `error`, or a computed severity falls out of the exemption and
 * owes a promotion entry like any other new code.
 */
const INFO_ONLY_SINCE_BASELINE: readonly string[] = [
  // `.qfai/review/` holds a directory whose name is not a pack timestamp. The
  // finding tells the operator that directory is not inspected; it does not
  // claim the tree is wrong, and nothing about it is a gate waiting to close.
  "QFAI-REVIEW-010",
];

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

/**
 * The other way this codebase emits a finding: an `Issue` written out as an
 * object literal — `{ code: "…", severity: "error", … }` — instead of built by
 * `issue(...)`. `validators/uix/designSystemPresence.ts`, `core/validate.ts`
 * and `cli/commands/validate.ts` all ship findings this way, so an extractor
 * rooted at `issue(` alone leaves a whole emission shape outside the ratchet:
 * a new hard error added in the house style of those files reaches users while
 * appearing in neither the baseline nor `RULE_PROMOTIONS`.
 *
 * The property name plus a code-shaped literal is the whole test — it does not
 * try to prove the enclosing literal is an `Issue`. A `code:` of that shape
 * that turns out not to be a finding costs one baseline line, which is the
 * direction that fails loudly rather than silently, the same trade the opaque
 * files above are read under.
 */
const OBJECT_CODE_RE = new RegExp(`\\bcode:\\s*"(${CODE})"`, "g");

/** `RegExp`-safe form of a finding code: `.` is legal in {@link CODE}. */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The index of the closing quote of the string literal opening at `quoteAt`.
 *
 * Template literals are read as opaque up to their closing backtick: the
 * `${...}` holes in this codebase's finding messages hold quotes and commas,
 * and none of them holds a backtick that is not escaped.
 */
function endOfStringLiteral(body: string, quoteAt: number): number {
  const quote = body[quoteAt];
  for (let i = quoteAt + 1; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === quote) return i;
  }
  return body.length;
}

/**
 * The top-level arguments of the call whose `(` sits at `open`.
 *
 * `issue(...)` arguments are what the severity check has to read, and the
 * severity is the *third* one — a position no regex over the call text can
 * reach, because the message argument in between is a multi-line template
 * literal full of commas, parentheses and the occasional `//` inside a string.
 * Depth counting over the same three skips (string, line comment, block
 * comment) the compiler makes is what makes the position meaningful.
 */
function topLevelArgs(body: string, open: number): string[] {
  const args: string[] = [];
  let depth = 0;
  let start = open + 1;
  for (let i = open; i < body.length; i += 1) {
    const ch = body[i];
    const next = body[i + 1];
    if (ch === "/" && next === "/") {
      const nl = body.indexOf("\n", i);
      i = nl === -1 ? body.length : nl;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = body.indexOf("*/", i + 2);
      i = end === -1 ? body.length : end + 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      i = endOfStringLiteral(body, i);
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      if (depth === 0) {
        args.push(body.slice(start, i).trim());
        return args;
      }
      continue;
    }
    if (ch === "," && depth === 1) {
      args.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  return args;
}

/**
 * Every expression `body` uses as the severity of `code`, in either emission
 * shape: the third argument of an `issue(...)` naming it (directly or through
 * the file-local `const`), and the `severity:` sibling of a `code: "…"`
 * property.
 *
 * The object-literal half reads the two properties adjacent, which is how all
 * three files that use the shape write them. A future literal that separates
 * them yields no expression here, and the assertion below fails for want of a
 * wired one — the direction that reports a gap instead of assuming one is not
 * there.
 */
function severityExpressionsFor(body: string, code: string): string[] {
  const found: string[] = [];

  const aliases = new Set<string>();
  for (const m of body.matchAll(CODE_CONST_RE)) {
    const [, name, first, second] = m;
    if (name && (first === code || second === code)) aliases.add(name);
  }

  for (const m of body.matchAll(/\bissue\(/g)) {
    const open = (m.index ?? 0) + m[0].length - 1;
    const args = topLevelArgs(body, open);
    const first = args[0];
    if (first === undefined) continue;
    if (first !== `"${code}"` && !aliases.has(first)) continue;
    const severity = args[2];
    if (severity !== undefined) found.push(severity);
  }

  const escaped = escapeForRegExp(code);
  for (const re of [
    new RegExp(`\\bcode:\\s*"${escaped}"\\s*,\\s*severity:\\s*([^,\\n]+)`, "g"),
    new RegExp(`\\bseverity:\\s*([^,\\n]+),\\s*code:\\s*"${escaped}"`, "g"),
  ]) {
    for (const m of body.matchAll(re)) {
      const severity = m[1];
      if (severity) found.push(severity.trim().replace(/,$/, ""));
    }
  }
  return found;
}

/**
 * The identifiers in `body` that hold the result of a `newRuleSeverity(...)`
 * call reading `RULE_PROMOTIONS.<key>` — through the member expression itself
 * or through a `const` bound to it, which is how `validators/tddList.ts` lifts
 * the pin out of the row loop.
 */
function promotionSeverityBindings(body: string, key: string): Set<string> {
  const aliases = new Set<string>([`RULE_PROMOTIONS.${key}`]);
  const aliasRe = new RegExp(
    `\\bconst\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*RULE_PROMOTIONS\\.${escapeForRegExp(key)}\\b[^;]*;`,
    "g",
  );
  for (const m of body.matchAll(aliasRe)) {
    if (m[1]) aliases.add(m[1]);
  }

  const bound = new Set<string>();
  for (const m of body.matchAll(
    /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?newRuleSeverity\(/g,
  )) {
    const name = m[1];
    const open = (m.index ?? 0) + m[0].length - 1;
    const args = topLevelArgs(body, open).join(",");
    if (name && [...aliases].some((alias) => args.includes(alias))) bound.add(name);
  }
  return bound;
}

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
 *
 * Findings written as object literals join the set too ({@link OBJECT_CODE_RE}):
 * `issue(...)` is a convenience, not the only door out, and the door it is not
 * covering is the one three shipped files already use.
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

    for (const m of body.matchAll(OBJECT_CODE_RE)) {
      const code = m[1];
      if (code) codes.add(code);
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

/**
 * The registry text belonging to each key: its own JSDoc plus its entry line.
 *
 * The key is an identifier and the value is a pair of versions, so the finding
 * code an entry governs is written only in its doc comment. Slicing per key is
 * what lets the severity assertion below ask "is *this* entry's code wired to
 * *this* entry's pin", instead of the weaker "does the registry mention the
 * code somewhere".
 */
async function readPromotionEntryBlocks(): Promise<Map<string, string>> {
  const entries = await readRulePromotionEntries();
  const blocks = new Map<string, string>();
  let cursor = 0;
  for (const key of Object.keys(RULE_PROMOTIONS)) {
    const at = entries.indexOf(`${key}:`, cursor);
    expect(at, `RULE_PROMOTIONS.${key} was not found in the object literal`).toBeGreaterThan(-1);
    if (at < 0) continue;
    const lineEnd = entries.indexOf("\n", at);
    const end = lineEnd === -1 ? entries.length : lineEnd;
    blocks.set(key, entries.slice(cursor, end));
    cursor = end;
  }
  return blocks;
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

/**
 * {@link INFO_ONLY_SINCE_BASELINE}, checked against the tree before any code is
 * excused by it. Severities are read with this file's own extractor, the same
 * one the "entry decides the severity" assertion above follows the pin with —
 * an exemption measured by a second reader could disagree with the rule it is
 * exempting a code from.
 */
async function verifiedInfoOnlyCodes(baseline: ReadonlySet<string>): Promise<Set<string>> {
  const files = (await collectSources(SRC)).filter(
    (f) => !f.endsWith(path.join("core", "sunset.ts")),
  );
  const bodies = await Promise.all(files.map((f) => readFile(f, "utf-8")));

  const exempt = new Set<string>();
  for (const code of INFO_ONLY_SINCE_BASELINE) {
    expect(
      baseline.has(code),
      `${code} predates the promotion policy, so the baseline already covers it — ` +
        "this list is for codes introduced after P7",
    ).toBe(false);

    const severities = [...new Set(bodies.flatMap((body) => severityExpressionsFor(body, code)))];
    expect(
      severities,
      `${code} is listed as info-only but nothing in src/ emits it — retire the line`,
    ).not.toEqual([]);
    expect(
      severities.sort(),
      `${code} is listed as info-only but is emitted with ${severities.join(", ")} — ` +
        "only a finding that is `info` at every site is off P7's ladder; anything that " +
        "can reach `warning` or `error` owes a RULE_PROMOTIONS entry",
    ).toEqual(['"info"']);
    exempt.add(code);
  }
  return exempt;
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

  it("every RULE_PROMOTIONS entry decides the severity of the finding it names", async () => {
    // The assertion above only proves the *key* is mentioned outside
    // `sunset.ts`. A contributor can satisfy that by quoting the pin in a
    // message or a comment while the emission keeps a literal
    // `issue("NEW_CODE", …, "error", …)` beside it — and the registration check
    // below passes too, because the code is named in the entry's JSDoc. That is
    // the half-landed state P7 exists to stop: a promotion declared, and a hard
    // error from day one anyway. So follow the pin to the severity: the code the
    // entry names must take its severity from a `newRuleSeverity(...)` reading
    // *this* entry, and must not carry a hard-coded one anywhere.
    const blocks = await readPromotionEntryBlocks();
    const files = (await collectSources(SRC)).filter(
      (f) => !f.endsWith(path.join("core", "sunset.ts")),
    );
    const bodies = new Map<string, string>();
    for (const file of files) bodies.set(file, await readFile(file, "utf-8"));

    const BACKTICKED_CODE = new RegExp(`\`(${CODE})\``, "g");

    for (const key of Object.keys(RULE_PROMOTIONS)) {
      const block = blocks.get(key) ?? "";
      const named = [...new Set([...block.matchAll(BACKTICKED_CODE)].map((m) => m[1]))].filter(
        (code): code is string => code !== undefined,
      );
      expect(
        named,
        `RULE_PROMOTIONS.${key} names no finding code in its doc comment — the key ` +
          "and the two versions cannot carry it, so the entry governs nothing this test can follow",
      ).not.toEqual([]);

      for (const code of named) {
        const wired: string[] = [];
        const literal: string[] = [];
        for (const [file, body] of bodies) {
          const bound = promotionSeverityBindings(body, key);
          for (const severity of severityExpressionsFor(body, code)) {
            const followsPin =
              bound.has(severity) ||
              (severity.includes("newRuleSeverity(") && severity.includes(key));
            const where = `${path.relative(packageRoot, file)}: ${severity}`;
            if (followsPin) wired.push(where);
            else literal.push(where);
          }
        }

        expect(
          literal,
          `${code} is registered under RULE_PROMOTIONS.${key} but emitted with a severity ` +
            `that does not come from its pin: ${literal.join("; ")} — a promotion whose ` +
            "severity is decided beside the call is a window that never opens",
        ).toEqual([]);
        expect(
          wired.length,
          `${code} is named by RULE_PROMOTIONS.${key}, but no emission of it takes its ` +
            "severity from `newRuleSeverity(…, RULE_PROMOTIONS." +
            `${key}…)` +
            "` — mentioning the pin in a message or a comment is not wiring it",
        ).toBeGreaterThan(0);
      }
    }
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
    // Non-vacuity, stated as the RETIRED SET rather than as `size > baseline`.
    // The baseline is a frozen historical record, so the old form assumed the
    // code set only ever grows — and it went red the moment retiring a dead
    // validator legitimately removed codes from the tree. Pinning what is gone
    // keeps the check non-vacuous (a broken extractor reports every baseline
    // code as retired) while making each retirement a reviewed line.
    const retired = FINDING_CODES_BEFORE_PROMOTION_POLICY.filter((code) => !codes.has(code)).sort();
    expect(
      retired,
      "a baseline code no longer emitted: retire it here in the same change, or " +
        "the `issue(...)` shape changed and extraction is silently returning less",
    ).toEqual(RETIRED_SINCE_BASELINE);

    // The association is the promotion entry naming its code: `newRuleSeverity`
    // takes a version, so the key alone cannot carry `TDDLIST_EVIDENCE_EMPTY`.
    const promotions = await readRulePromotionEntries();
    const baseline = new Set(FINDING_CODES_BEFORE_PROMOTION_POLICY);
    const infoOnly = await verifiedInfoOnlyCodes(baseline);
    const unregistered = [...codes]
      .filter((code) => !baseline.has(code) && !promotions.includes(code) && !infoOnly.has(code))
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
