/**
 * A promotion that lands in a release is named in that release's notes.
 *
 * A rule inside a promotion window is reported at `warning` until the release
 * its pin names, and at `error` from then on. The severity follows the version
 * of the tool that is running, so on the release the pin names, a project that
 * upgraded and changed nothing goes from a passing `validate --fail-on error`
 * to a failing one.
 *
 * That is a breaking change for some existing tree, and the only thing that
 * tells an operator about it in advance is the finding's own message — which
 * reaches whoever ran the previous version, and nobody else. Someone upgrading
 * across several versions, or reading the notes to decide whether to upgrade at
 * all, is given nothing.
 *
 * `sunset.ts` decides when a rule changes severity. Until this file existed
 * nothing connected that decision to the release that carries it, so the notes
 * named a promotion only when the author remembered.
 *
 * The check is keyed on what has shipped: an entry whose `promoteAt` names a
 * released section owes that section its codes, and one pinned to a version
 * that has not been cut yet owes nothing — those notes are written when it is.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { RULE_PROMOTIONS } from "../../src/core/sunset.js";

// tests/unit/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const LEDGER = path.join(repoRoot, "packages/qfai/src/core/sunset.ts");
const CHANGELOG = path.join(repoRoot, "CHANGELOG.md");

/**
 * A finding code as the ledger writes one: backticked, and in the shape
 * `sunsetLedger.test.ts` reads. The ledger is written to that convention — an
 * entry that has a keyword to mention spells it out rather than quoting it, so
 * that a backticked all-caps word means a code and nothing else.
 */
const CODE_IN_DOC = /`([A-Z][A-Z0-9_.-]{2,})`/g;

/** A released section heading. `## [Unreleased]` carries no date and is not one. */
const RELEASED_HEADING = /^## \[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}\s*$/gm;

/** Any section heading, so a section can be sliced to the next one. */
const ANY_HEADING = /^## \[/gm;

/**
 * The registry text belonging to each key: its own doc comment plus its entry
 * line.
 *
 * The key is an identifier and the value is a pair of versions, so the codes an
 * entry governs are written only in its doc comment. Slicing per key is what
 * makes this "are *this* entry's codes in the notes for *this* entry's
 * release", rather than the weaker "does the changelog mention the code
 * somewhere".
 */
async function promotionBlocks(): Promise<Map<string, string>> {
  const body = await readFile(LEDGER, "utf-8");
  const decl = body.indexOf("export const RULE_PROMOTIONS");
  expect(decl, "RULE_PROMOTIONS declaration not found in sunset.ts").toBeGreaterThan(-1);
  const start = body.indexOf("{", decl);
  const end = body.indexOf("} as const;", decl);
  expect(end, "RULE_PROMOTIONS literal is not closed by `} as const;`").toBeGreaterThan(start);
  const entries = body.slice(start + 1, end);

  const blocks = new Map<string, string>();
  let cursor = 0;
  for (const key of Object.keys(RULE_PROMOTIONS)) {
    const at = entries.indexOf(`${key}:`, cursor);
    expect(at, `RULE_PROMOTIONS.${key} was not found in the object literal`).toBeGreaterThan(-1);
    const lineEnd = entries.indexOf("\n", at);
    const end = lineEnd === -1 ? entries.length : lineEnd;
    blocks.set(key, entries.slice(cursor, end));
    cursor = end;
  }
  return blocks;
}

/** The codes an entry's doc comment names, in the order it names them. */
function codesIn(block: string): string[] {
  return [...new Set([...block.matchAll(CODE_IN_DOC)].map((match) => match[1] ?? ""))].filter(
    (code) => code.length > 0,
  );
}

/** Order two `MAJOR.MINOR.PATCH` strings; negative when `a` is the earlier one. */
function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/**
 * The earliest released version at or above `promoteAt`, or `null` when none
 * has been cut.
 *
 * Not `sections.get(promoteAt)`. A pin names the version the escalation was
 * planned for, and that version need not be released — a project can go from
 * 1.11.0 straight to 1.13.0, and `newRuleSeverity` compares the running tool
 * against the pin, so 1.13.0 carries the escalation. Read by exact version,
 * the release that actually breaks an upgrade is the one release the check
 * skips.
 */
function carryingRelease(promoteAt: string, sections: ReadonlyMap<string, string>): string | null {
  const carrying = [...sections.keys()]
    .filter((version) => compareVersions(version, promoteAt) >= 0)
    .sort(compareVersions);
  return carrying[0] ?? null;
}

/** Each released version, mapped to the text of its section. */
async function releasedSections(): Promise<Map<string, string>> {
  const changelog = await readFile(CHANGELOG, "utf-8");
  const sections = new Map<string, string>();
  for (const heading of changelog.matchAll(RELEASED_HEADING)) {
    const version = heading[1] ?? "";
    const from = heading.index + heading[0].length;
    ANY_HEADING.lastIndex = from;
    const next = ANY_HEADING.exec(changelog);
    sections.set(version, changelog.slice(from, next?.index ?? changelog.length));
  }
  return sections;
}

describe("a promotion is announced by the release that carries it", () => {
  it("finds the ledger and the released sections it is checked against", async () => {
    // Either read coming back empty satisfies the case below without asking
    // anything, and an empty read looks the same as a clean tree.
    const blocks = await promotionBlocks();
    const sections = await releasedSections();

    expect(blocks.size, "no promotion entries were read").toBeGreaterThan(0);
    expect(sections.size, "no released changelog sections were read").toBeGreaterThan(0);
    expect(
      [...sections.keys()],
      "`## [Unreleased]` is where an unshipped entry is written and is not a release",
    ).not.toContain("Unreleased");
  });

  it("names every code a released promotion escalates", async () => {
    const blocks = await promotionBlocks();
    const sections = await releasedSections();

    const missing: string[] = [];
    for (const [key, promotion] of Object.entries(RULE_PROMOTIONS)) {
      const version = carryingRelease(promotion.promoteAt, sections);
      if (version === null) {
        // Nothing at or above the pin has been cut. Those notes are written
        // when one is, and requiring them now would fail every open window.
        continue;
      }
      // Whole tokens, not substrings: `QFAI-CFG-0010` contains `QFAI-CFG-001`,
      // and the grammar the codes are read with admits both, so a section
      // naming only the longer one would answer for the shorter.
      const named = new Set(codesIn(sections.get(version) ?? ""));
      for (const code of codesIn(blocks.get(key) ?? "")) {
        if (!named.has(code)) {
          missing.push(`${version}: ${code} (RULE_PROMOTIONS.${key})`);
        }
      }
    }

    expect(
      missing,
      "a rule became an error in a release whose notes do not say so. An upgrade that changes " +
        "nothing else moves from a passing `validate --fail-on error` to a failing one, and the " +
        "finding's own deadline message only reached whoever ran the previous version. Name the " +
        "code in that release's section, with what clears it",
    ).toEqual([]);
  });

  it("reads the codes an entry states rather than the registry as a whole", async () => {
    // The slice is what makes the case above answerable per entry. Read against
    // the whole registry it would pass on any release naming any code.
    const blocks = await promotionBlocks();
    const retired = blocks.get("retiredTraceabilityKeys") ?? "";

    expect(codesIn(retired)).toContain("QFAI-CFG-001");
    expect(codesIn(retired), "another entry's code reached this block").not.toContain(
      "QFAI-TDDLIST-010",
    );
  });

  it("asks the first release at or above the pin, not the pinned version alone", () => {
    // A pin names the version an escalation was planned for, and that version
    // need not ship. `newRuleSeverity` compares the running tool against the
    // pin, so the first release past it carries the escalation — and reading
    // the pinned version alone skips exactly the release that breaks upgrades.
    const released = new Map([
      ["1.13.0", ""],
      ["1.11.0", ""],
      ["1.10.2", ""],
    ]);

    expect(carryingRelease("1.12.0", released)).toBe("1.13.0");
    // An exact match is still the earliest one at or above the pin.
    expect(carryingRelease("1.11.0", released)).toBe("1.11.0");
    // Nothing at or above it has been cut, so nothing owes the notes yet.
    expect(carryingRelease("1.14.0", released)).toBeNull();
  });

  it("orders versions by number rather than by string", () => {
    // `"1.9.0" > "1.10.0"` lexically, and the tree is past 1.9, so a string
    // comparison would pick the wrong release for every pin in that range.
    expect(compareVersions("1.9.0", "1.10.0")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "1.99.99")).toBeGreaterThan(0);
    expect(compareVersions("1.11.0", "1.11.0")).toBe(0);
  });

  it("reads a code as a whole token rather than a substring", () => {
    // A section naming `QFAI-CFG-0010` contains the text of `QFAI-CFG-001`,
    // and the grammar admits both lengths, so a substring test would let the
    // longer code answer for a promotion it has nothing to do with.
    const sections = new Map([["9.9.9", "- **`QFAI-CFG-0010`** and `QFAI-CFG-001-SUFFIX`.\n"]]);
    const named = new Set(codesIn(sections.get("9.9.9") ?? ""));

    expect(named).toContain("QFAI-CFG-0010");
    expect(named, "a longer code answered for a shorter one").not.toContain("QFAI-CFG-001");
  });
});
