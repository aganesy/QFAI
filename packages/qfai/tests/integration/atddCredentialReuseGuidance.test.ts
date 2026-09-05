/**
 * Integration: the shipped `/qfai-atdd` credential-reuse guidance artifact
 * (TC-0008-0015 .. TC-0008-0018).
 *
 * The deliverable of this obligation is prose, so every oracle below reads a
 * shipped file. That makes two failure modes worth naming, because both produce
 * a green suite over an artifact that says nothing:
 *
 *   - **A scan that matches nothing.** A deny-list is only evidence when it can
 *     fire, so the backend row runs the same predicate against a fixture with a
 *     planted name and requires a non-zero count. A green there is a checked
 *     green.
 *   - **A `toContain` over prose.** Substring checks on wording are brittle and
 *     shallow at once. The rule rows therefore assert the seven obligations as
 *     SEVEN DISTINCT statements — each matched by its own predicate, each
 *     required to land in a different section — which is the property the
 *     obligation actually names and which a single blob of prose mentioning all
 *     seven keywords fails.
 *
 * Read against the packaged asset, not the repository-root mirror: the mirror is
 * generated, and asserting there would pass on a tree whose source was never
 * edited.
 */
// QFAI:SPEC-0008:TC-0008-0015
// QFAI:SPEC-0008:TC-0008-0016
// QFAI:SPEC-0008:TC-0008-0017
// QFAI:SPEC-0008:TC-0008-0018

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { beforeAll, describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";

// tests/integration/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const skillDir = (): string =>
  path.join(getInitAssetsDir(), ".qfai", "assistant", "skills", "qfai-atdd");
const GUIDANCE_REL = "references/credential-reuse.md";

let guidance = "";
let skillEntry = "";

beforeAll(async () => {
  guidance = await readFile(path.join(skillDir(), "references", "credential-reuse.md"), "utf-8");
  skillEntry = await readFile(path.join(skillDir(), "SKILL.md"), "utf-8");
});

/** The `##`/`###` section bodies, so "distinct statement" can mean "its own section". */
function sections(markdown: string): string[] {
  return markdown
    .split(/^#{2,3} /m)
    .slice(1)
    .map((section) => section.trim())
    .filter((section) => section.length > 0);
}

describe("TC-0008-0015 (TDD-0015): the seven rules and the companion rule are stated and linked", () => {
  /**
   * One predicate per obligation, each keyed on the rule's own subject rather
   * than on a phrase. Seven `toContain`s over one sentence would pass on a
   * summary line; these have to find seven separate statements.
   */
  const RULES: ReadonlyArray<[string, RegExp]> = [
    ["never sign in per test", /never sign in per test/i],
    ["never share one account across parallel workers", /never share one account across parallel/i],
    ["key the cache by worker index and actor", /key(ed)? (the cached session )?by the pair/i],
    ["tear the cache down at worker exit", /tear the cache down at worker exit/i],
    ["re-authenticate and rewrite on rejection", /re-authenticate and rewrite the cache/i],
    ["a mutating test creates a dedicated account", /mutates its own account creates a dedicated/i],
    ["parallelism costs workers, not sign-ins", /costs more workers, not more sign-ins/i],
  ];

  it("states all seven session-reuse rules, each as its own statement", () => {
    const bodies = sections(guidance);
    const homes = new Map<string, number>();
    for (const [label, pattern] of RULES) {
      const index = bodies.findIndex((body) => pattern.test(body));
      expect(index, `the guidance does not state: ${label}`).toBeGreaterThanOrEqual(0);
      homes.set(label, index);
    }
    // DISTINCT: seven rules landing in seven different sections. Without this a
    // single paragraph naming all seven subjects satisfies every line above,
    // and the obligation is "seven distinct statements".
    expect(
      new Set(homes.values()).size,
      "two or more rules share one statement — they are not stated distinctly",
    ).toBe(RULES.length);
  });

  it("states the companion caller-injected-environment rule in the same artifact", () => {
    // Both halves of the prohibition. A guidance that forbade provisioning and
    // said nothing about teardown would leave the destructive half unstated.
    expect(guidance, "the companion rule does not forbid provisioning").toMatch(
      /must not provision/i,
    );
    expect(guidance, "the companion rule does not forbid teardown").toMatch(/must not.*tear/is);
    expect(guidance, "the companion rule does not name its trigger").toMatch(
      /injected by the caller|caller-injected/i,
    );
  });

  it("is cross-linked from the skill entry point by a path that resolves", async () => {
    expect(skillEntry, "SKILL.md does not link the guidance").toContain(GUIDANCE_REL);
    // The link is only a link while the target is there. Resolved from the
    // skill directory, exactly as a reader would follow it.
    const target = path.resolve(skillDir(), GUIDANCE_REL);
    await expect(readFile(target, "utf-8")).resolves.toContain("Credential reuse");
  });
});

describe("TC-0008-0016 (TDD-0016): the guidance names no browser backend, and the scan can prove it", () => {
  /**
   * Backend names, install-command shapes and version pins.
   *
   * The three classes are one list because the obligation is one: nothing in the
   * artifact may commit an adopter to a tool. `\b` boundaries throughout, so a
   * word that merely contains a backend's name is not a match.
   */
  const DENIED: ReadonlyArray<[string, RegExp]> = [
    [
      "browser backend name",
      /\b(playwright|cypress|puppeteer|selenium|webdriver|chromium|chrome|firefox|webkit|safari|nightwatch|testcafe)\b/i,
    ],
    [
      "install command",
      /\b(npm (i|install|ci)|pnpm (add|install)|yarn add|npx|pip install|brew install|cargo add|go get)\b/i,
    ],
    ["version pin", /(\bv\d+\.\d+|@\d+\.\d+\.\d+|[\^~]\d+\.\d+)/],
  ];

  it("returns zero matches against the shipped artifact", () => {
    for (const [label, pattern] of DENIED) {
      const hits = guidance.match(new RegExp(pattern.source, `${pattern.flags}g`)) ?? [];
      expect(hits, `the guidance carries a ${label}: ${hits.join(", ")}`).toEqual([]);
    }
  });

  it("returns a non-zero count against a planted fixture, so the zero above is checked", () => {
    // The same predicates, one planted violation each. A deny-list that matched
    // nothing would satisfy the row above while establishing nothing at all.
    const planted: ReadonlyArray<[string, string]> = [
      ["browser backend name", `${guidance}\nDrive it with Playwright.\n`],
      ["install command", `${guidance}\nRun npm install first.\n`],
      ["version pin", `${guidance}\nPin the runner to v3.11 exactly.\n`],
    ];
    for (const [label, text] of planted) {
      const pattern = DENIED.find((entry) => entry[0] === label)?.[1];
      expect(pattern, `no predicate is registered for ${label}`).toBeDefined();
      if (pattern === undefined) continue;
      expect(pattern.test(text), `the ${label} predicate cannot see a planted violation`).toBe(
        true,
      );
    }
  });

  it("frames its worked example as one illustration among possible backends", () => {
    // The example is permitted only under that framing, so the framing is part
    // of the obligation rather than a stylistic note.
    expect(guidance, "the worked example carries no among-possible-backends framing").toMatch(
      /one illustration among possible backends/i,
    );
  });
});

describe("TC-0008-0017 (TDD-0017): the guidance grows no vocabulary", () => {
  /** The ATDD finding codes the implementation declares, read from source. */
  async function atddFindingCodes(): Promise<string[]> {
    const files = await fg(["src/**/*.ts"], { cwd: packageRoot, absolute: true });
    const codes = new Set<string>();
    for (const file of files) {
      for (const match of (await readFile(file, "utf-8")).matchAll(/QFAI-ATDD-\d{3}/g)) {
        codes.add(match[0]);
      }
    }
    return [...codes].sort();
  }

  it("leaves the ATDD finding-code set at its baseline", async () => {
    // Enumerated, not counted: a set that lost one code and gained another
    // keeps its size. This is the row that reddens if the prose deliverable
    // quietly became a validator.
    //
    // `QFAI-ATDD-001` is absent by retirement, not by accident. It was the
    // ATDD coverage-ledger validator, which fired on the *absence* of
    // `<spec-dir>/atdd/coverage-ledger.md` — a file nothing produced — and was
    // removed with `src/core/validators/atddLedger.ts`. This baseline is what
    // the retirement has to move: it reads the codes out of `src/**`, so
    // leaving the code listed here would assert a declaration the tree no
    // longer holds. `validators-are-wired.test.ts` holds the row that keeps it
    // retired.
    //
    // `QFAI-ATDD-118` is in the baseline because a separate change added it
    // deliberately, with its own tests: it is the `info` finding that reports a
    // `US-*` deferred out of the current slice by `- x-qfai-status: planned`
    // (`tests/core/atddUsPlannedDeferral.test.ts`). Moving the baseline is the
    // correct response to a code someone meant to add; the row still reddens
    // for one nobody declared.
    //
    // `QFAI-ATDD-131`/`-132`/`-133` are present for the mirror-image reason:
    // the Coverage Depth Matrix gate (`src/core/validators/atddCoverageDepth.ts`)
    // is a validator, so its codes are declarations the tree now holds and the
    // baseline has to say so. What this row still guards is unchanged — the
    // set is enumerated, so the prose deliverable growing a code of its own
    // reddens it. Their promotion windows are held in `sunsetLedger.test.ts`.
    //
    // #1065 asked for a re-pin script per pinned guard, as the workflow-hygiene
    // lane ships. This row gets the re-derivation COMMAND and deliberately not
    // an auto-writer:
    //
    //     node -e "const fg=require('fast-glob');const fs=require('fs');\
    //       const c=new Set();for(const f of fg.sync('packages/qfai/src/**/*.ts'))\
    //       for(const m of fs.readFileSync(f,'utf8').matchAll(/QFAI-ATDD-\\d{3}/g))\
    //       c.add(m[0]);console.log([...c].sort().join('\\n'))"
    //
    // A tool that rewrote this list would defeat it. The list is ENUMERATED
    // rather than counted precisely so that a set which lost one code and
    // gained another — same size, different declarations — reddens; an
    // auto-writer would absorb that swap silently and the reviewer would never
    // see it. Compare `pin-stage-evidence-counts.mjs`, which is right for a
    // DERIVED NUMBER whose only correct value is a fresh measurement. Here the
    // freeze is the review artifact, so the command prints and a human edits.
    expect(await atddFindingCodes()).toEqual([
      "QFAI-ATDD-101",
      "QFAI-ATDD-102",
      "QFAI-ATDD-103",
      "QFAI-ATDD-104",
      "QFAI-ATDD-105",
      "QFAI-ATDD-111",
      "QFAI-ATDD-112",
      "QFAI-ATDD-113",
      "QFAI-ATDD-114",
      "QFAI-ATDD-115",
      "QFAI-ATDD-116",
      "QFAI-ATDD-117",
      "QFAI-ATDD-118",
      // Obligations referenced only from carriers that declare no test. 118 is
      // taken by the US planned-deferral finding on its own branch, so this one
      // holds the next free number rather than colliding with it.
      "QFAI-ATDD-119",
      "QFAI-ATDD-121",
      "QFAI-ATDD-122",
      "QFAI-ATDD-123",
      "QFAI-ATDD-131",
      "QFAI-ATDD-132",
      "QFAI-ATDD-133",
      "QFAI-ATDD-901",
    ]);
  });

  it("leaves the layer token set at its five members", async () => {
    const crosswalk = await readFile(
      path.join(getInitAssetsDir(), ".qfai", "assistant", "catalog", "test-layers.md"),
      "utf-8",
    );
    const tokens = [...crosswalk.matchAll(/`layer-([a-z0-9]+)`/g)].map((match) => match[1] ?? "");
    expect([...new Set(tokens)].sort()).toEqual(["api", "component", "e2e", "integration", "unit"]);
    // …and the guidance introduces no sixth. A heading naming a layer is how a
    // reference artifact would grow one without touching the crosswalk.
    for (const heading of guidance.match(/^#{1,6} .*$/gm) ?? []) {
      expect(heading, `the guidance declares a layer heading: ${heading}`).not.toMatch(
        /\blayer-[a-z]/i,
      );
    }
  });

  it("carries no annotation token and no finding code of its own", () => {
    // The annotation forms the scanner accepts, and the finding-code shape. An
    // artifact carrying either would be participating in a gate rather than
    // describing a practice.
    expect(guidance, "the guidance carries an annotation token").not.toMatch(/\bQFAI:SPEC-\d{4}:/);
    expect(guidance, "the guidance carries a finding code").not.toMatch(/\bQFAI-[A-Z]+-\d/);
    expect(guidance, "the guidance carries a scaffold-placeholder style code").not.toMatch(
      /\bD-[A-Z][A-Z-]+\b/,
    );
  });

  it("is referenced by no validator", async () => {
    // The deliverable is prose. A validator reading it would make it a checked
    // artifact, which is exactly the growth this obligation forbids.
    const validators = await fg(["src/core/validators/**/*.ts"], {
      cwd: packageRoot,
      absolute: true,
    });
    expect(validators.length, "no validator sources were scanned").toBeGreaterThan(0);
    for (const file of validators) {
      expect(
        await readFile(file, "utf-8"),
        `${path.basename(file)} reads the guidance artifact`,
      ).not.toContain("credential-reuse");
    }
  });
});

describe("TC-0008-0018 (TDD-0018): the script-naming rule is adopter-only and layer-scoped", () => {
  it("records the script-naming rule and states that QFAI adopts none of it", () => {
    // `\s+` between words rather than a literal space: the shipped prose is
    // hard-wrapped, so a rule stated across a line break is still stated.
    expect(guidance, "the script-naming rule is not stated").toMatch(
      /credential-free\s+lane\s+and\s+a\s+credentialed\s+lane[\s\S]*?different\s+script\s+names/i,
    );
    // Recorded as guidance, not as something done here. Both halves: QFAI keeps
    // its names, and its suite has no credentials — the second is what stops a
    // reader taking the rules as verified by execution in this repository.
    expect(guidance, "the guidance does not say QFAI keeps its own script names").toMatch(
      /QFAI keeps its own script names/i,
    );
    expect(guidance, "the guidance does not state that QFAI's suite has no credentials").toMatch(
      /own suite has zero credentials/i,
    );
    expect(guidance, "the guidance does not disclaim dogfooding").toMatch(
      /not dogfooded here|nothing in this repository signs in/i,
    );
  });

  it("obliges E2E / API / Integration only, and disclaims unit and component", () => {
    // The SCOPE section specifically, not the whole file: the obligation is
    // about what the scope statement says, and a mention elsewhere in the prose
    // would satisfy a whole-file scan while leaving the scope statement silent.
    const scope = guidance.split(/^## /m).find((body) => /^Scope\b/.test(body)) ?? "";
    expect(scope, "the guidance has no Scope section").not.toBe("");
    expect(scope, "the scope statement does not name the three ATDD layers").toMatch(
      /E2E,\s+API\s+and\s+Integration/i,
    );
    // The disclaimer is the load-bearing half: without it a reader adds the
    // rules to unit tests, which is the boundary this spec records as a
    // rejection rather than a simplification.
    expect(scope, "the scope statement does not disclaim unit and component").toMatch(
      /no unit or component obligation/i,
    );
  });
});
