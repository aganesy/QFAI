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

/**
 * The test files whose sizes this record states — ONE list, read by all three guards below.
 *
 * They used to be three independent literals (`CLAIMS`, `OWED`, `COUNTED`), naming the same six files
 * with nothing tying them together. A file added to one and not the others would have had its count
 * checked while its `.each` / `.for` precondition went unchecked — and that precondition is the whole
 * reason `countCases` is allowed to count callsites. The pairing is the invariant; three lists could
 * not express it.
 */
const TRACKED = [
  "packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts",
  "packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts",
  "packages/qfai/tests/assets/coverageDepthMatrix.test.ts",
  "packages/qfai/tests/assets/retractedClaims.test.ts",
  "packages/qfai/tests/assets/stageEvidenceCounts.test.ts",
  "packages/qfai/tests/unit/buildCommand.test.ts",
  // Added round 11. It was the one new test file outside this list, so its count was checked by the
  // recorded-vitest-output rule and its `.each` / `.for` precondition was not — and that
  // precondition is the only thing making callsite counting valid. The A7 repair unified three
  // lists and then omitted a file from the one list that remained.
  "packages/qfai/tests/unit/shippedLaneCommands.test.ts",
  // Added round 12, both of them the files that closed the two open obligations. They were outside
  // this list for one round, so their counts were unrecorded and their `.each` precondition
  // unchecked — which is exactly what round 11 added the list to prevent, one round later.
  "packages/qfai/tests/e2e/spec0017RunnerParallelismE2E.test.ts",
  "packages/qfai/tests/integration/spec0017OwnWorkflowScope.test.ts",
] as const;

/** `packages/qfai/tests/x.test.ts` -> `tests/x.test.ts`, the spelling the recorded commands use. */
const asRecorded = (file: string): string => file.replace(/^packages\/qfai\//, "");

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

/**
 * A git blob hash, computed rather than spawned: `sha1("blob " + size + "\0" + bytes)`.
 *
 * **Line endings are normalised to LF first**, and that is not cosmetic. `.gitattributes` carries
 * `* text=auto eol=lf`, so a file written with CRLF on Windows is stored LF-only and every checkout
 * sees LF — while `git status` stays clean, because the filter runs on the way in. Round 8 measured the
 * consequence: exactly one pack file — round 7's `R03` — holds 423 CRLF in this working tree and 0 in
 * its blob,
 * so hashing the working-tree bytes gave a seal that reproduced **only on this machine**. On
 * `ubuntu-latest` — and `tests/assets/**` runs in the `e2e` project, a required CI leg — the same test
 * would have failed from a clean checkout.
 *
 * That was the third time this one file reddened a required leg, and the second time the repair made it
 * worse: round 8's predecessor recorded the machine-local value on purpose, having reasoned that
 * `--no-filters` was the honest hash. The honest hash is the one every checkout agrees on.
 */
function blobHash(bytes: Buffer): string {
  const lf = Buffer.from(bytes.toString("binary").replace(/\r\n/g, "\n"), "binary");
  const header = Buffer.from(`blob ${String(lf.length)}\0`, "latin1");
  return createHash("sha1")
    .update(Buffer.concat([header, lf]))
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
  it("states the size of the mechanism corpus it cites as its falsification", async () => {
    // The sweep section cites this number twice — "N mechanisms pinned" and "the pre-repair
    // helper lets all N through" — and the corpus grows every round a reviewer proves a new escape.
    // A numeral that moves every round is the shape this file exists for, and round 14 found one two
    // rounds stale in a neighbouring section for exactly this reason.
    const corpus = await source("packages/qfai/tests/unit/shippedLaneCommands.test.ts");
    const start = corpus.indexOf("const MECHANISMS = [");
    const end = corpus.indexOf("\n];", start);
    expect(
      start,
      "the mechanism corpus must be findable by the name the record cites",
    ).toBeGreaterThan(-1);
    // Entries are one per line at indent two, opening with either quote character — prettier picks
    // whichever avoids escaping, and the first version of this count read only the double.
    const held = (corpus.slice(start, end).match(/^ {2}["']/gm) ?? []).length;

    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");
    const wrong: string[] = [];
    for (const match of evidence.matchAll(/(\d+) mechanisms pinned/g)) {
      if (Number(match[1]) !== held)
        wrong.push(
          `mechanisms pinned: record says ${match[1] ?? "?"}, corpus holds ${String(held)}`,
        );
    }
    for (const match of evidence.matchAll(/lets all (\d+) through/g)) {
      if (Number(match[1]) !== held)
        wrong.push(
          `lets all N through: record says ${match[1] ?? "?"}, corpus holds ${String(held)}`,
        );
    }
    for (const match of evidence.matchAll(/with all (\d+) listed/g)) {
      if (Number(match[1]) !== held)
        wrong.push(
          `with all N listed: record says ${match[1] ?? "?"}, corpus holds ${String(held)}`,
        );
    }
    expect(wrong, "a mechanism-corpus size the record states and the corpus does not hold").toEqual(
      [],
    );
  });

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
        file: "packages/qfai/tests/unit/shippedLaneCommands.test.ts",
        pattern: /shippedLaneCommands\.test\.ts` — (\d+) tests/,
        label: "the shipped-lane allowlist's test count, in Work performed",
      },
      {
        file: "packages/qfai/tests/e2e/spec0017RunnerParallelismE2E.test.ts",
        pattern: /spec0017RunnerParallelismE2E\.test\.ts` — (\d+) tests/,
        label: "the parallelism E2E's test count, in Work performed",
      },
      {
        file: "packages/qfai/tests/integration/spec0017OwnWorkflowScope.test.ts",
        pattern: /spec0017OwnWorkflowScope\.test\.ts` — (\d+) tests/,
        label: "the own-workflow-scope test count, in Work performed",
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

    // Every tracked file is claimed, and nothing else is. Without this the list below could drift from
    // `TRACKED` in either direction: a file whose count is checked but whose `.each` precondition is
    // not, or a file counted for a precondition whose count nothing reads.
    expect(
      [...new Set(CLAIMS.map((claim) => claim.file))].sort(),
      "the claimed files and the tracked files are the same set",
    ).toEqual([...TRACKED].sort());

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
    // Derived from `TRACKED`, not retyped. This file is in it — absent for two rounds, so the one
    // guard that requires every other guard's run to be recorded was the guard whose own run could go
    // unrecorded.
    const OWED = TRACKED.map(asRecorded);
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

  it("only counts files where the callsite rule is valid, which excludes `.each` and `.for`", async () => {
    // `countCases` counts CALLSITES, and vitest reports one test per CASE — so `it.each([a, b, c])`
    // is one callsite and three tests. Round 6 raised it, and noted that `describe.each` is the
    // prevailing idiom in this very directory. Rather than emulate the runner, the rule's precondition
    // is asserted: none of the files whose counts this record states may use it.
    //
    // **`.for` too, and behind any modifier chain.** vitest here is 2.1.9, where `test.for` / `it.for`
    // expands one callsite into many cases exactly as `.each` does. Round 8 measured that live at a
    // 2-test divergence with all three guards green, and round 9 measured the repair one link deeper:
    // requiring the expander to be the FIRST modifier let `it.concurrent.each`, `it.sequential.each`,
    // `test.skip.each` and `it.concurrent.for` straight through, while `countCases` counts an arbitrary
    // chain via `(?:\.\w+)*`. `.concurrent` is not exotic here — this repository's knobs set
    // `maxConcurrency`. The pattern now matches whatever `countCases` matches, which is the invariant
    // the pair needs.
    const offenders: string[] = [];
    for (const file of TRACKED) {
      const text = await source(file);
      if (/^[ \t]*(?:it|test|describe)(?:\.\w+)*\.(?:each|for)\b/m.test(text)) offenders.push(file);
    }
    expect(
      offenders,
      "a counted file using `.each` or `.for`, where one callsite is many tests and this rule stops " +
        "holding",
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

  it("keeps the e2e sequence's last row current with the callsites it counts", async () => {
    // The two `P7` suite totals were stale for the SIXTH time this round: 1437 recorded against 1439
    // measured, 1206 against 1212. Five previous rounds each found the same sentence a round behind, and
    // each repair re-typed the number.
    //
    // A test cannot derive the totals — that would mean running the suite from inside it. It CAN derive
    // the thing that invalidates them. The sequence's rows carry a CALLSITE count beside each total, and
    // the record's own stated rule is that a commit changing an `it` / `test` callsite under the e2e
    // project's two globs owes a row. So the last row's callsite figure is compared with the measured
    // one: a commit that adds a callsite reddens this until its row is written, and until then the total
    // beside it is known to be wrong rather than assumed to be right.
    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");

    // The globs are the e2e project's, read from the workspace file rather than assumed, because a
    // guard over "the e2e project's callsites" that hardcodes the directories is one include away from
    // measuring something else.
    const workspace = await source("packages/qfai/vitest.workspace.ts");
    const globs = [...workspace.matchAll(/"(tests\/(?:e2e|assets)\/[^"]*)"/g)].map(
      (m) => m[1] ?? "",
    );
    expect(globs.length, "the e2e project must declare its includes").toBeGreaterThan(0);

    const CALLSITE_LINE = /^[ \t]*(?:it|test)(?:\.\w+)*[\s(]/;
    let measured = 0;
    for (const dir of ["packages/qfai/tests/e2e", "packages/qfai/tests/assets"]) {
      const walk = async (at: string): Promise<void> => {
        for (const entry of await readdir(at, { withFileTypes: true })) {
          const full = path.join(at, entry.name);
          if (entry.isDirectory()) {
            await walk(full);
            continue;
          }
          if (!/\.test\.ts$/.test(entry.name)) continue;
          const text = await readFile(full, "utf8");
          measured += text.split(/\r?\n/).filter((line) => CALLSITE_LINE.test(line)).length;
        }
      };
      await walk(path.join(ROOT, dir));
    }

    // Compared against a line describing the WORKING TREE, not against the table's last row. A row
    // cannot name the commit it is written in — that is round 10's `m1`, and pointing this guard at the
    // last row would have made it red at exactly the commit that corrects it, or made the row false.
    // The table stays as history, where every row names a revision a reader can check; what has to be
    // current is the count the two totals are valid FOR, which is a property of the tree.
    const stated = /^e2e callsites at this tree: (\d+)$/m.exec(evidence);
    expect(
      stated,
      "the record must state its own e2e callsite count, in the form " +
        "`e2e callsites at this tree: N`, because the two suite totals above it are only valid for that " +
        "count and nothing else pins them",
    ).not.toBeNull();
    expect(
      Number(stated?.[1]),
      `the record states ${stated?.[1] ?? "?"} e2e callsites; the tree holds ${String(measured)}. ` +
        "A commit that changes one invalidates both suite totals, which is the defect six rounds have " +
        "reported and five repairs have re-typed",
    ).toBe(measured);
  });

  it("derives the round and response counts `## Final status` certifies with", async () => {
    // The three numbers in "**ten** rounds, **29** reviewer responses, **28 REVISE and one PASS**"
    // were correct when checked and derived by nothing — and their correctness has a lifetime of ONE
    // ROUND. That is not a hypothetical: rounds 4, 5, 6, 7 and 10 each found this sentence a round
    // behind, five findings of one shape, which is the strongest signal in this record that a number
    // nothing derives goes stale on schedule.
    //
    // Two of the three are mechanically derivable and are derived here. The verdict split is not:
    // reviewers do not write their verdict in one parseable form (two of twenty-nine use
    // `**Verdict: REVISE**`), so inventing a marker now would only pin the reports written after it.
    // What IS pinnable is the arithmetic — the split must SUM to the derived response count — and that
    // is exactly the failure mode all five findings had: a round landed, the total moved, and the
    // split stayed where it was.
    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");
    const packs = await packsOnDisk();
    // **Responses are counted over CLOSED packs only.** Counting the in-flight one made this row red for
    // the duration of every round: a reviewer's report lands, the certified total is stale, and the
    // required `e2e` leg exits 1 until the round ends — which the stage cannot fix without editing the
    // subject mid-round, the one thing the round's own rules forbid. Round 15's gatekeeper measured this
    // tree green and then red four minutes later with nothing between but a sibling's report landing.
    //
    // The sentence certifies rounds that are OVER, so that is what it counts. The newest pack is excluded
    // for the same reason the seal rule below excludes it: it is not finished. The ROUND count still
    // covers every pack, because opening one is what makes a round exist.
    const closed = packs.slice(0, -1);
    const responses = (
      await Promise.all(
        closed.map(async (pack) => {
          const entries = await readdir(path.join(ROOT, ".qfai/review", pack));
          return entries.filter((name) => /^R0\d+_.*\.md$/.test(name)).length;
        }),
      )
    ).reduce((sum, count) => sum + count, 0);

    const certified =
      /\*\*(\w+)\*\* rounds, \*\*(\d+)\*\* reviewer responses, \*\*(\d+) REVISE and (\w+) PASS\*\*/.exec(
        evidence,
      );
    expect(
      certified,
      "`## Final status` states the three counts in the pinned form",
    ).not.toBeNull();
    if (certified === null) return;

    // Spelled-out numerals, because that is how the sentence reads. The table ran out at `fifteen`
    // until round 15's gatekeeper pointed out that round 16 was therefore red whatever the record said —
    // a pin whose needle is a closed enumeration, which is the defect the retracted-claims guard names in
    // its own words about its own alternation. The table's job is to READ a numeral, not to bound one, so
    // it now covers every value this stage could reach and an unreadable word is reported rather than
    // treated as a mismatch.
    const WORDS: Record<string, number> = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      eleven: 11,
      twelve: 12,
      thirteen: 13,
      fourteen: 14,
      fifteen: 15,
      sixteen: 16,
      seventeen: 17,
      eighteen: 18,
      nineteen: 19,
      twenty: 20,
      "twenty-one": 21,
      "twenty-two": 22,
      "twenty-three": 23,
      "twenty-four": 24,
      "twenty-five": 25,
      "twenty-six": 26,
      "twenty-seven": 27,
      "twenty-eight": 28,
      "twenty-nine": 29,
      thirty: 30,
    };
    const wrong: string[] = [];
    const statedRounds = WORDS[certified[1] ?? ""];
    if (statedRounds !== packs.length) {
      wrong.push(
        `rounds: record says ${certified[1] ?? "?"}, ${String(packs.length)} packs on disk`,
      );
    }
    const statedResponses = Number(certified[2]);
    if (statedResponses !== responses) {
      wrong.push(
        `responses: record says ${String(statedResponses)}, disk holds ${String(responses)}`,
      );
    }
    const revise = Number(certified[3]);
    const pass = WORDS[certified[4] ?? ""] ?? Number.NaN;
    if (revise + pass !== responses) {
      wrong.push(
        `the verdict split sums to ${String(revise + pass)} against ${String(responses)} responses`,
      );
    }
    expect(wrong, "a count in `## Final status` that the packs on disk do not support").toEqual([]);
  });

  it("derives the ledger cross-tabulation from the ledger", async () => {
    // Five numbers over a file this stage READS and `/qfai-implement` WRITES, so every one can move
    // without this stage touching anything — and the record already carries the scar: it once said
    // "63 refactor" in one place and "74 refactor" in another, in the same file.
    const ledger = await source(".qfai/specs/spec-0017/tdd/test-list.md");
    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");

    // The ledger is a markdown table. Rows are the lines whose first cell is a TDD id, which avoids
    // re-implementing anything about the ledger's own semantics.
    const rows = [...ledger.matchAll(/^\|\s*(TDD-\d+)\s*\|(.*)$/gm)].map(([, id, rest]) => ({
      id: id ?? "",
      cells: (rest ?? "").split("|").map((cell) => cell.trim()),
    }));
    expect(rows.length, "the ledger must have rows in the pinned form").toBeGreaterThan(0);

    const tally = (values: string[]): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const value of values) out[value] = (out[value] ?? 0) + 1;
      return out;
    };
    const layers = tally(
      rows.flatMap((row) =>
        row.cells.filter((c) => /^(Unit|Integration|E2E|API|Component)$/.test(c)),
      ),
    );
    const statuses = tally(
      rows.flatMap((row) =>
        row.cells.filter((c) => /^(todo|red|green|refactor|blocked|exception)$/.test(c)),
      ),
    );

    const stated =
      /(\d+) rows: (\d+) `Integration`,\s*(\d+) `Unit`; \*\*(\d+) `refactor`, (\d+) `blocked`, (\d+) `todo`\*\*/.exec(
        evidence,
      );
    expect(
      stated,
      "the record must state the ledger cross-tabulation in the pinned form: " +
        "`N rows: N `Integration`, N `Unit`; **N `refactor`, N `blocked`, N `todo`**`",
    ).not.toBeNull();
    expect(
      [
        Number(stated?.[1]),
        Number(stated?.[2]),
        Number(stated?.[3]),
        Number(stated?.[4]),
        Number(stated?.[5]),
        Number(stated?.[6]),
      ],
      "the stated cross-tabulation must be the ledger's own",
      // The order is rows, Integration, Unit, refactor, blocked, todo.
    ).toEqual([
      rows.length,
      layers["Integration"] ?? 0,
      layers["Unit"] ?? 0,
      statuses["refactor"] ?? 0,
      statuses["blocked"] ?? 0,
      statuses["todo"] ?? 0,
    ]);
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
