/**
 * The counts `atdd-spec-0017.md` states about its own artifacts, checked against the artifacts.
 *
 * This exists because one finding class recurred in every review round: a number typed into the
 * record that the tree did not hold. Rounds 2 and 3 each found four; round 4 found four more,
 * including a **recorded command output** ("Tests 9 passed (9)" for a file that ran eleven).
 * Correcting them one at a time did not work, so these derive them.
 *
 * The first version of this file was itself the round's worst defect, twice over, and both are kept in
 * view because they are the mistake this file exists to stop:
 *
 * 1. **It made the suite red at the commit that added it.** It required every pack directory to be
 *    named in `## Final status` *with a seal* — while the practice that fixed round 1's moving-tree
 *    problem creates a pack **before** its reviewers launch, and `SKILL.md` fixes the seal at "when
 *    the last reviewer response lands". An in-flight pack could never satisfy it, and
 *    `tests/assets/**` runs in the `e2e` project, which is a required CI leg. So it asserted something
 *    no honest edit could satisfy during a round.
 * 2. **`countCases` returned 6 for its own 4-test file** — it counted the `it(` and `test(` inside its
 *    own docstring. A counting function that cannot count its own file was checking every other number
 *    here, and was right elsewhere only by luck.
 *
 * Round 5's `qa-gatekeeper` then broke it seven more ways with a green control, including the recorded
 * vitest outputs — round 4's finding verbatim — and pointed out that seal **values** were never
 * compared, only counted. All of that is addressed below.
 */
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../../..");

/** The first review pack this stage opened; earlier directories belong to other stages. */
const FIRST_PACK = "review-20260820200000000";

async function source(relative: string): Promise<string> {
  return readFile(path.join(ROOT, relative), "utf8");
}

/**
 * A statement-initial test callsite: `it(`, `it.skip(`, `test.each(...)(` at the start of a line after
 * its indentation.
 *
 * Two attempts preceded this one and both were wrong in opposite directions. The first counted the
 * token anywhere and returned **6** for its own 4-test file, from the `it(` and `test(` in its own
 * docstring. The second stripped comments and string literals first and returned **8** for a 22-test
 * file: hand-rolling a JavaScript tokenizer with regexes goes wrong the moment a quote or a backtick
 * inside a stripped span leaves the next pass unbalanced, and then it swallows real code.
 *
 * Every test in this repository is written statement-initial, and a decoy is not: a docstring
 * continuation starts with `*`, a line comment with `//`, and a string occurrence has an assignment or
 * a call in front of it. So the position does the work no tokenizer needed to.
 */
const CALLSITE = /^[ \t]*(?:it|test)(?:\.\w+)*[\s(]/;

/** Count `it(` / `test(` callsites — the callsite, which is what vitest reports and prose means. */
function countCases(text: string): number {
  return text.split(/\r?\n/).filter((line) => CALLSITE.test(line)).length;
}

/** A git blob hash, computed rather than spawned: `sha1("blob " + size + "\0" + bytes)`. */
function blobHash(bytes: Buffer): string {
  const header = Buffer.from(`blob ${String(bytes.length)}\0`, "latin1");
  return createHash("sha1")
    .update(Buffer.concat([header, bytes]))
    .digest("hex");
}

/** The seal: sha256 over `<blob> <path>\n` lines, paths pack-relative in byte order. */
async function sealOf(packDir: string): Promise<string> {
  const found: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      found.push(path.relative(packDir, full).split(path.sep).join("/"));
    }
  };
  await walk(packDir);

  const lines: string[] = [];
  for (const relative of found.sort()) {
    const bytes = await readFile(path.join(packDir, relative));
    lines.push(`${blobHash(bytes)} ${relative}\n`);
  }
  return createHash("sha256").update(lines.join(""), "utf8").digest("hex");
}

/** Pack directories this stage opened, oldest first. No date window: round 5 found one there. */
async function packsOnDisk(): Promise<string[]> {
  const entries = await readdir(path.join(ROOT, ".qfai/review"), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && /^review-\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .filter((name) => name >= FIRST_PACK)
    .sort();
}

describe("the stage evidence's counts are derived, not typed", () => {
  it("states the number of tests each new test file actually holds", async () => {
    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");

    const CLAIMS: ReadonlyArray<{ file: string; pattern: RegExp; label: string }> = [
      {
        file: "packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts",
        pattern: /`scripts\/check-atdd-annotation-ledger\.mjs` with (\d+) tests/,
        label: "the ledger guard's test count, in Decision 4",
      },
      {
        file: "packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts",
        pattern: /checkAtddAnnotationLedger\.test\.ts` — (\d+) tests/,
        label: "the ledger guard's test count, in Work performed",
      },
      {
        file: "packages/qfai/tests/unit/buildCommand.test.ts",
        pattern: /buildCommand\.test\.ts` — (\d+) tests/,
        label: "the build classifier's test count, in Work performed",
      },
      {
        file: "packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts",
        pattern: /spec0017LayeredCiScaffoldE2E\.test\.ts` — (\d+) tests across/,
        label: "the E2E file's test count, in Work performed",
      },
      {
        file: "packages/qfai/tests/assets/stageEvidenceCounts.test.ts",
        pattern: /stageEvidenceCounts\.test\.ts` — (\d+) tests/,
        label: "this file's own test count, in Work performed",
      },
      {
        file: "packages/qfai/tests/assets/coverageDepthMatrix.test.ts",
        pattern: /coverageDepthMatrix\.test\.ts` — (\d+) tests/,
        label: "the matrix pinning test's count, in Work performed",
      },
      {
        file: "packages/qfai/tests/assets/retractedClaims.test.ts",
        pattern: /retractedClaims\.test\.ts` — (\d+) tests/,
        label: "the retracted-claims guard's count, in Work performed",
      },
    ];

    // EVERY occurrence, not the first. Round 6 found `## Work performed` stating one file's size three
    // times — "four tests", "5 tests", "4 tests", for a file holding 5 — with two of them wrong and
    // invisible, because `exec` returns only the first match. A duplicate bullet was how the third got
    // there, so the count of matches is pinned too: a size stated twice is a size that can disagree
    // with itself.
    const wrong: string[] = [];
    for (const claim of CLAIMS) {
      const matches = [...evidence.matchAll(new RegExp(claim.pattern.source, "g"))];
      if (matches.length === 0) {
        wrong.push(`${claim.label}: the record no longer states it in the pinned form`);
        continue;
      }
      const actual = countCases(await source(claim.file));
      for (const match of matches) {
        if (Number(match[1]) !== actual) {
          wrong.push(
            `${claim.label}: record says ${match[1] ?? "?"}, file holds ${String(actual)}`,
          );
        }
      }
      if (matches.length > 1 && new Set(matches.map((match) => match[1])).size > 1) {
        wrong.push(
          `${claim.label}: stated ${String(matches.length)} times with disagreeing values ` +
            `(${matches.map((match) => match[1] ?? "?").join(", ")})`,
        );
      }
    }
    expect(wrong, "a count in the record that the tree does not hold").toEqual([]);
  });

  it("records vitest outputs the named files can actually produce", async () => {
    // Round 4 found `-> Tests 9 passed (9)` recorded for a file that ran eleven; round 5 found this
    // file blind to exactly that. `## Commands executed` quotes a command and its output, and the
    // output must match the file the command names.
    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");
    const RECORDED = /vitest run[^\n]*?(tests\/[\w./-]+\.test\.ts)\n\s*-> Tests (\d+) passed/g;

    const rows = [...evidence.matchAll(RECORDED)];

    // The floor is per FILE, not per match. Round 6 pointed out that dropping the `-> ` from one
    // recorded output removes it from coverage while a bare `rows.length > 2` stays satisfied, so the
    // files this stage added are named and each must appear.
    const OWED = [
      "tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts",
      "tests/integration/scripts/checkAtddAnnotationLedger.test.ts",
      "tests/assets/coverageDepthMatrix.test.ts",
      "tests/assets/retractedClaims.test.ts",
      "tests/unit/buildCommand.test.ts",
    ];
    const quoted = new Set(rows.map((row) => row[1] ?? ""));
    expect(
      OWED.filter((file) => !quoted.has(file)),
      "a file this stage added whose recorded run is no longer quoted in the pinned form",
    ).toEqual([]);

    const wrong: string[] = [];
    for (const row of rows) {
      const relative = row[1] ?? "";
      const actual = countCases(await source(`packages/qfai/${relative}`));
      if (Number(row[2]) !== actual) {
        wrong.push(`${relative}: recorded ${row[2] ?? "?"} passed, file holds ${String(actual)}`);
      }
    }
    expect(wrong, "a recorded vitest output the file cannot produce").toEqual([]);
  });

  it("only counts files where the callsite rule is valid, which excludes `.each`", async () => {
    // `countCases` counts CALLSITES, and vitest reports one test per CASE — so `it.each([a, b, c])`
    // is one callsite and three tests. Round 6 raised it, and noted that `describe.each` is the
    // prevailing idiom in this very directory. Rather than emulate the runner, the rule's precondition
    // is asserted: none of the files whose counts this record states may use `.each`.
    const COUNTED = [
      "packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts",
      "packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts",
      "packages/qfai/tests/assets/coverageDepthMatrix.test.ts",
      "packages/qfai/tests/assets/retractedClaims.test.ts",
      "packages/qfai/tests/assets/stageEvidenceCounts.test.ts",
      "packages/qfai/tests/unit/buildCommand.test.ts",
    ];
    const offenders: string[] = [];
    for (const file of COUNTED) {
      const text = await source(file);
      if (/^[ \t]*(?:it|test|describe)\.each\b/m.test(text)) offenders.push(file);
    }
    expect(
      offenders,
      "a counted file using `.each`, where one callsite is many tests and this rule stops holding",
    ).toEqual([]);
  });

  it("counts its own callsites correctly, which two earlier versions did not", () => {
    // The regression guard for defect 2 above: one version returned 6 for a 4-test file by counting
    // tokens in its own docstring, and its replacement returned 8 for a 22-test file by stripping so
    // hard it swallowed real code.
    const decoys = [
      "/** Count `it(` and `test(` callsites. */",
      " * it( in a docstring continuation",
      "// it( in a line comment",
      'const label = "it( inside a string";',
      "const tpl = `test( inside a template`;",
      'it("one", () => {});',
      'test.each([1])("two", () => {});',
      'describe("nested", () => {',
      '  it.skip("three", () => {});',
      "});",
    ].join("\n");
    expect(countCases(decoys), "three callsites, five decoys").toBe(3);
  });

  it("states the number of annotated describes the E2E file actually carries", async () => {
    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");
    const e2e = await source("packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts");

    const annotations = [...e2e.matchAll(/^\/\/ QFAI:SPEC-0017:US-0017-\d{4}$/gm)].length;
    // Every occurrence, like the others: round 6 required first-match removed and round 7 found a third
    // site still using `exec`.
    const stated = [...evidence.replace(/\s+/g, " ").matchAll(/(\d+)\s*annotated\s+describes/g)];
    expect(
      stated.length,
      "Work performed must state the describe count in the pinned form",
    ).toBeGreaterThan(0);
    expect(
      stated.map((match) => Number(match[1])).filter((value) => value !== annotations),
      "the annotated-describe count: round 4 found this saying eight when there were nine",
    ).toEqual([]);
  });

  it("records a guard output the guard itself produces", async () => {
    // Round 5 found the previous version comparing the record against a transcription of the ledger
    // and never invoking the guard, so a change in what the guard COUNTS was invisible. It runs now.
    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");
    const guard: {
      checkLedger: (
        ledger: string,
        sources: Map<string, string>,
        options?: { spec?: string },
      ) => { checked: number };
      collectTestSources: (dir: string) => Promise<Map<string, string>>;
    } = await import("../../../../scripts/check-atdd-annotation-ledger.mjs");

    const ledger = await source("tests/e2e/qfai-traceability.md");
    const sources = new Map<string, string>();
    for (const dir of ["tests/e2e", "packages/qfai/tests/e2e"]) {
      for (const [file, text] of await guard.collectTestSources(path.join(ROOT, dir))) {
        sources.set(file, text);
      }
    }
    const scoped = guard.checkLedger(ledger, sources, { spec: "0017" });

    // Every occurrence. Round 7 demonstrated this green: the phrase appears twice, `exec` read only
    // the first, and changing the second from `8 claim(s)` to `7` left all three guards passing.
    const recorded = [...evidence.matchAll(/(\d+) claim\(s\) backed by a test annotation/g)];
    expect(
      recorded.length,
      "the guard's recorded output must be present in the pinned form",
    ).toBeGreaterThan(0);
    expect(
      recorded.map((match) => Number(match[1])).filter((value) => value !== scoped.checked),
      `every recorded guard output must be what the guard reports (${String(scoped.checked)})`,
    ).toEqual([]);
  });

  it("names every pack on disk, with a recomputing seal for each closed one", async () => {
    // Two rules, because a seal is fixed at "when the last reviewer response lands" while the request
    // is committed BEFORE the reviewers launch — the practice that stopped the tree moving under
    // round 1's reviewers. The newest pack is in flight: it must be DISCLOSED and cannot carry a seal
    // yet. Every older pack is closed and must carry one that recomputes.
    //
    // The first version required a seal for all of them, which made this suite red at the commit that
    // added it, in a required CI leg, and no honest edit could green it during a round.
    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");
    const packs = await packsOnDisk();
    expect(packs.length, "this stage has opened at least one pack").toBeGreaterThan(0);

    const named = [...evidence.matchAll(/Review pack:\s+`?\.qfai\/review\/(review-\d+)\/?`?/g)].map(
      (match) => match[1] ?? "",
    );
    expect(
      [...named].sort(),
      "every pack this stage opened must be named — round 4 found the record saying three against four",
    ).toEqual(packs);

    // Seal VALUES, compared. Round 5 found the previous version counting them with `.length`, so a
    // wrong hash was invisible.
    const sealed = new Map(
      [
        ...evidence.matchAll(
          /Review pack:\s+`?\.qfai\/review\/(review-\d+)\/?`?[^\n]*\nReview pack seal:\s+`?([0-9a-f]{64})`?/g,
        ),
      ].map((match) => [match[1] ?? "", match[2] ?? ""]),
    );

    // Three rules, and the third one replaces a rule that was wrong in the other direction. The
    // previous version REQUIRED the newest pack to be unsealed — which meant it went red exactly when
    // that pack was correctly sealed, i.e. at the completion gate, and stayed red until a further
    // round opened a directory. Round 6 measured that. The newest pack may be sealed or not; what must
    // hold is that every OLDER pack has a seal, and that every seal recorded — newest included —
    // recomputes.
    const wrong: string[] = [];
    for (const pack of packs.slice(0, -1)) {
      if (!sealed.has(pack)) wrong.push(`${pack}: closed and carries no recorded seal`);
    }
    for (const [pack, recorded] of sealed) {
      const actual = await sealOf(path.join(ROOT, ".qfai/review", pack));
      if (recorded !== actual) {
        wrong.push(
          `${pack}: recorded ${recorded.slice(0, 12)}…, recomputes ${actual.slice(0, 12)}…`,
        );
      }
    }
    expect(
      wrong,
      "a closed pack with no seal, or any recorded seal that does not recompute",
    ).toEqual([]);
  });
});
