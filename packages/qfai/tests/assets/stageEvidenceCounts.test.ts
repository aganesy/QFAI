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

import { nextHeadingAt, NUMERAL_PATTERN, numeralValue, WORDS } from "../helpers/recordProse.js";

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

/**
 * The two helpers this stage added, which `TRACKED` does not hold.
 *
 * `TRACKED` is a list of TEST files, because its other rule counts `it` callsites. The Delta Rejected
 * Guard tie below is a different question — has this stage reasoned about every artifact it added
 * against the rejected options — and the artifacts the spec's central claim rests on are these two.
 * Checking `TRACKED` alone would have left them exactly where round 15 found them.
 */
const HELPERS = [
  "packages/qfai/tests/helpers/buildCommand.ts",
  "packages/qfai/tests/helpers/shippedLaneCommands.ts",
  "packages/qfai/tests/helpers/recordProse.ts",
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
 *
 * A callsite ends in `(`, and requiring it closed the third direction. `[\s(]` accepted a line
 * beginning `test !== null &&` — a statement-initial identifier that happens to be spelled `test`,
 * inside a type guard — and counted it as a case. The file then read as one longer than vitest
 * ran it, and the recorded command output beneath it became a number no run produces. Measured
 * over every tracked file: exactly that one line moves, and it moves to the number vitest reports.
 */
const CALLSITE = /^[ \t]*(?:it|test)(?:\.\w+)*\s*\(/;

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
  it("reasons about every file it added against the rejected options", async () => {
    // The Delta Rejected Guard table promised to cover "every artifact added since" for five rounds and
    // covered the round-1 and round-2 set, because nothing tied its rows to the files this stage added.
    // The section disclosed that in its own words rather than papering over it, and round 15 found the
    // two artifacts the spec's central claim rests on still missing — so the promise is a check now.
    //
    // `TRACKED` is the list, already here for a different rule. One assertion, no new list, and the
    // failure mode it closes is a table that reads as exhaustive and is not.
    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");
    const start = evidence.indexOf("### Delta Rejected Guard");
    expect(start, "the Delta Rejected Guard section must be findable").toBeGreaterThan(-1);
    // The next TOP-LEVEL heading, not a named one. The first version of this ended the slice at
    // "## Inputs reviewed", which precedes this section rather than following it — so the search found
    // nothing, the slice ran to the end of the file, and every file this stage added matched somewhere
    // in the record. Deleting a row from the table left it green, which is how it was caught: the check
    // written to close a disclosed gap could not fail, one round after three others of that shape.
    const rest = evidence.slice(start + 1);
    const next = rest.search(/\n## [^#]/);
    const section = next === -1 ? rest : rest.slice(0, next);
    // The TABLE's first column, not the section's text. Reading the section made the check vacuous a
    // second time: every tracked file is also named in the prose below the table, so deleting a row
    // left it green. Two vacuous versions of one check, both caught by deleting the row it guards —
    // which is the procedure this record argues for and the reason it is written down.
    // FENCED regions removed, and a row must have the columns of a row. The first version read any
    // line beginning `| ` + a backticked path, so a fenced sample carrying the path satisfied it
    // with the real table row deleted — a check over prose that prose can satisfy by accident.
    // BOTH fence markers. Stripping only backticks let a `~~~`-fenced decoy table satisfy this with
    // the real row deleted — and the sibling guard in this same stage's work already carried the
    // tilde form, so this was one rule in two copies with only one of them corrected.
    // UP TO THREE SPACES of indent, because CommonMark says a fence is still a fence there and
    // renders it as code. `^` under `m` requires column zero, so a one-space-indented decoy table
    // survived the strip and satisfied this with the real row deleted — the fifth spelling in five
    // rounds, and the second time the fence pattern itself was the hole. It also cut the other way:
    // a true, complete table went RED when an ordinary four-line EXCERPT of it was quoted above in a
    // one-space-indented fence, so the verdict on an unchanged table depended on the indentation of
    // an unrelated code block.
    const unfenced = section.replace(/^ {0,3}(?:```|~~~)[\s\S]*?^ {0,3}(?:```|~~~)/gm, "");
    // And the TABLE, found by its header row, rather than any pipe-line in the section: round 17
    // deleted the real row and satisfied this with a sentence two paragraphs below it. Third version,
    // third time vacuous, and the third time for the same reason — the check read a wider region than
    // the claim it was making. That is now the stated failure mode of this whole family.
    // THE table, not the first thing shaped like one. `indexOf` took the first header it found, so a
    // plain second copy of the table pasted above the live one satisfied this with the live row
    // deleted — no fence needed at all. Round 18 fixed the fence delimiter and left this, which is the
    // wider-region defect one more time: the check read `some table in this section` where the claim
    // is about `the table`. Two of them is not a table this check can be about, so two is a failure.
    // Case-INsensitively: round 20 renamed the live header to `| Artifact |` and pasted a complete
    // stale copy above it, and the count came to one because the needle could not see the live one.
    // Markdown does not care about the capital and neither can this.
    const headers = [...unfenced.matchAll(/^\|\s*artifact\s+\|/gim)];
    expect(
      headers.length,
      "the section must hold exactly one artifact table — a second one makes `the table` ambiguous, and taking the first is how a decoy satisfied this with the real row deleted",
    ).toBe(1);
    const header = headers[0]?.index ?? -1;
    expect(header, "the table must be findable by its header row").toBeGreaterThan(-1);
    const afterHeader = unfenced.slice(header);
    const blank = afterHeader.search(/\n[ \t]*\n/);
    const table = blank === -1 ? afterHeader : afterHeader.slice(0, blank);
    const listed = new Set(
      [...table.matchAll(/^\|\s*`([^`]+)`\s*\|[^\n]*\|/gm)].map((match) => match[1] ?? ""),
    );
    expect(listed.size, "the table must have a first column to read").toBeGreaterThan(5);
    const missing = [...TRACKED, ...HELPERS].filter(
      (file) => !listed.has(file.replace("packages/qfai/", "")),
    );
    expect(
      missing,
      "a file this stage added that the Delta Rejected Guard table does not reason about",
    ).toEqual([]);
  });

  it("keeps the governance scan pointed at every helper this stage wrote", async () => {
    // `HELPERS` and `GOVERNANCE` are two lists of the same thing — files this stage authored that
    // carry claims — maintained in two files, and round 20 found them disagreeing about the newest
    // one. A helper outside `GOVERNANCE` is a file the retracted-claims guard cannot see, which is
    // the guard whose entire subject is a refuted wording standing as an assertion.
    const guard = await source("packages/qfai/tests/assets/retractedClaims.test.ts");
    const declared = guard.slice(
      guard.indexOf("const GOVERNANCE"),
      guard.indexOf("];", guard.indexOf("const GOVERNANCE")),
    );
    const missing = HELPERS.filter((file) => !declared.includes(`"${file}"`));
    expect(
      missing,
      "a helper this stage wrote that the retracted-claims scan does not read",
    ).toEqual([]);
  });

  it("states the size of the mechanism corpus it cites as its falsification", async () => {
    // The sweep block cites this number four times, and the corpus grows every round a reviewer
    // proves a new escape — so it is derived rather than typed.
    //
    // **The first version had no floor**, which is the defect this record names about the pack-count
    // pin in almost these words: it matched three fixed phrasings, so rewording the sentences and
    // setting them all to 31 was green, and so was moving a fourth `29` that none of the three
    // reached while the record described it as derived. A pin whose needle is a closed enumeration
    // cannot be falsified from outside that enumeration.
    //
    // So this reads EVERY numeral adjacent to the word, and requires the number of sites to be the
    // number the record commits to. Rewording a sentence away now drops a site and reddens.
    const corpus = await source("packages/qfai/tests/unit/shippedLaneCommands.test.ts");
    const start = corpus.indexOf("const MECHANISMS = [");
    const end = corpus.indexOf("\n];", start);
    expect(
      start,
      "the mechanism corpus must be findable by the name the record cites",
    ).toBeGreaterThan(-1);
    // Entries are one per line at indent two, opening with ANY of the three quote characters. The
    // first version read only the double, the second added the single, and a template literal — the
    // style `ROOT_CAUSES` already uses in this same file — would have made a corpus of thirty require
    // the record to say twenty-nine.
    const held = (corpus.slice(start, end).match(/^ {2}["'`]/gm) ?? []).length;
    expect(held, "the corpus must hold something for this row to be about").toBeGreaterThan(20);

    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");
    // Emphasis stripped first. The record writes numerals as `**31**` all through, and matching
    // only whitespace-adjacent digits made two wrong sizes in that style invisible — the same
    // needle-shaped blindness this check was written to close, one style along.
    const prose = evidence.replaceAll("**", "");
    // How many sites there are is READ FROM THE RECORD, not typed here. `SITES = 4` was a literal
    // the record never stated while its nearest sentence said three, so adding one true sentence
    // reddened this row and a reader had no way to know which number was authoritative.
    const stated = /corpus size appears (\w+) times in this section/.exec(prose);
    expect(stated, "the record must say how many times it states the corpus size").not.toBeNull();
    const SITES = WORDS[stated?.[1] ?? ""] ?? -1;
    expect(
      SITES,
      `the record's word for the site count must be readable: ${stated?.[1] ?? "?"}`,
    ).toBeGreaterThan(0);
    // IN THIS SECTION, and ADJACENT to the word. The previous version searched the whole file for a
    // numeral up to three words from `mechanisms`, so `29 of the 31 mechanisms` satisfied it while
    // stating two numbers — and a true sentence added in a different section reddened a row whose own
    // claim is scoped to one. A claim about a section is checked over that section.
    // The section ends at the next heading of ANY level. Ending it at `\n### ` did not stop at a `## `,
    // so the "section" ran 186 lines across three headings — a true corpus size elsewhere reddened this
    // row and two false ones inside the region passed. And the previous repair answered that by
    // narrowing the NEEDLE instead, which lost `29 escape mechanisms`, a spelling the version before it
    // caught. The region and the needle are two problems; fixing one with the other lost ground.
    const sectionStart = prose.lastIndexOf("### ", prose.indexOf(stated?.[0] ?? ""));
    // ANY heading level terminates the region, not an enumerated set of them. Each of these three
    // terminators was correct for today's document and one heading away from round 17's defect —
    // a region that ran past its section because the pattern did not match the heading that ended
    // it. "The region is part of the claim" was written into the record as a lesson while three
    // terminators still enumerated levels.
    // …and a heading is a heading only OUTSIDE a fence. Round 19 widened this from an enumeration of
    // levels to any level, and round 20 showed the widening opened the hole it closed: a `# comment`
    // inside a ```text block ended the section, so a phantom member hidden behind one was invisible —
    // round 15's finding, restored by the repair for round 19's. `nextHeadingAt` is the one place
    // that is decided now, and all three regions read it.
    const sectionEnd = nextHeadingAt(prose, sectionStart);
    const section = prose.slice(
      sectionStart === -1 ? 0 : sectionStart,
      sectionEnd === -1 ? prose.length : sectionEnd,
    );

    // **Round 20: widening the needle lost a site the narrow one caught.** Round 19 replaced four
    // fixed phrasings with a general sweep, and `with all 42 listed` — one of the four the record
    // states — fell outside every one of the three patterns: it names no noun after the numeral and
    // sits 189 characters from the previous `mechanisms`. Changing it to 47 was green, and deleting
    // it was green. Meanwhile the sweep counted one occurrence twice (`corpus … 42` and `42
    // mechanisms` at adjacent indices), so the site total still came to four and nothing showed.
    //
    // Two questions were being asked with one instrument again. **Which sentences state the size** is
    // a closed list, and it is the record's own list, so it is DECLARED and each entry is read
    // directly. **Whether any other numeral near the nouns disagrees** is open, and that is what the
    // sweep is for. Neither can do the other's job: round 18's enumeration missed new phrasings,
    // round 19's sweep missed a stated one.
    const CORPUS_SITES: ReadonlyArray<RegExp> = [
      /(\d+) mechanisms, 0 still open/,
      /(\d+) mechanisms pinned/,
      /lets all (\d+) through/,
      /with all (\d+) listed/,
    ];
    expect(
      CORPUS_SITES.length,
      "the record says how many times it states the corpus size, and this list is that many",
    ).toBe(SITES);
    const declared: Array<readonly [number, number]> = [];
    const wrong: string[] = [];
    for (const site of CORPUS_SITES) {
      const global = new RegExp(site.source, "g");
      const hits = [...section.matchAll(global)];
      if (hits.length !== 1) {
        wrong.push(`${String(site)}: appears ${String(hits.length)} times, expected once`);
        continue;
      }
      const hit = hits[0];
      if (hit === undefined || hit.index === undefined) continue;
      declared.push([hit.index, hit.index + hit[0].length]);
      if (Number(hit[1]) !== held) {
        wrong.push(`${hit[0]}: corpus holds ${String(held)}`);
      }
    }

    // Sentences carrying a numeral near either noun that is NOT the corpus total, enumerated because
    // the sweep cannot tell a rate or a class count from a total, and narrowing it until it could is
    // what lost five spellings across rounds 16 to 18.
    const NOT_THE_TOTAL: ReadonlyArray<RegExp> = [
      // A RATE — twenty agents, one mechanism each.
      /one mechanism per agent/,
      // A DE-DUPLICATION into classes, which is a different quantity from the corpus size.
      /De-duplicated by mechanism rather than by spelling they are six classes on three levels/,
      // How many of the forty-two are STILL OPEN. Quoted without the leading `42 `, which is one of
      // the declared sites above: an exemption spanning a site swallows it.
      /mechanisms, 0 still open/,
      // The SITE-COUNT sentence, which `SITES` is read out of four lines up. **By shape, not by its
      // current wording**: round 19 pinned the literal "appears four times", which is the very thing
      // the comment above it says was removed for being a hard-coded count — so adding a fifth site
      // and honestly updating the sentence to "five" reddened with "an exempted phrase that is no
      // longer in the section".
      /corpus size appears \w+ times in this section/,
    ];
    const stale = NOT_THE_TOTAL.filter((phrase) => !phrase.test(section));
    expect(
      stale.map(String),
      "an exempted phrase that is no longer in the section — a dead entry here is a hole this guard " +
        "would keep open for whatever is written next at that spot",
    ).toEqual([]);
    const exempt = NOT_THE_TOTAL.flatMap((phrase) => {
      const hit = new RegExp(phrase.source).exec(section);
      return hit === null || hit.index === undefined
        ? []
        : [[hit.index, hit.index + hit[0].length] as const];
    });

    // …and the open half. `\b` before the group, because without it `None of the mechanisms` was read
    // as stating a corpus size of one.
    // A match is located by its NUMERAL, not by where the needle happened to start. `corpus … 42`
    // begins 31 characters before the `42` that a declared site already covers, so filtering on the
    // match start left the same occurrence counted twice — the double-count round 20 found, which is
    // what made the old site total come to four while one true site was never read at all.
    const numeralAt = (match: RegExpMatchArray): number =>
      (match.index ?? 0) + match[0].lastIndexOf(match[1] ?? "");
    const sweep = [
      ...section.matchAll(
        new RegExp(`\\b(${NUMERAL_PATTERN})(?:\\s+\\S+){0,3}\\s+mechanisms?\\b`, "gi"),
      ),
      ...section.matchAll(
        new RegExp(`\\bmechanisms?\\b[^.\\n]{0,40}?\\b(${NUMERAL_PATTERN})\\b`, "gi"),
      ),
      ...section.matchAll(new RegExp(`\\bcorpus\\b[^.\\n]{0,40}?\\b(${NUMERAL_PATTERN})\\b`, "gi")),
    ].filter((match) => {
      const at = numeralAt(match);
      const covered = (spans: ReadonlyArray<readonly [number, number]>): boolean =>
        spans.some(([from, to]) => at >= from && at < to);
      return !covered(exempt) && !covered(declared);
    });
    for (const match of sweep) {
      if (numeralValue(match[1] ?? "") !== held) {
        wrong.push(`${match[0]}: corpus holds ${String(held)}`);
      }
    }
    expect(wrong, "a mechanism-corpus size the record states and the corpus does not hold").toEqual(
      [],
    );
    // A sweep match whose value IS the total is another statement of it, and the record says how
    // many statements there are. Without this, adding a true fifth sentence left the record's own
    // "appears four times" false and the row green — the count property the declared list alone
    // does not carry. Deduplicated by the NUMERAL's position, because two needles reach the same
    // numeral from different starts and round 20 found that pair inflating the old site count.
    const alsoStated = new Set(
      sweep.filter((match) => numeralValue(match[1] ?? "") === held).map(numeralAt),
    );
    expect(
      declared.length + alsoStated.size,
      "the record states how many times it gives the corpus size; this is how many times it does",
    ).toBe(SITES);
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
    //
    // That comment was FALSE for three rounds: the globs were read, asserted non-empty and then never
    // used, while the walk below iterated two hardcoded directory names — the exact failure the sentence
    // claims is prevented, in the file whose subject is claims of that kind. The roots are derived from
    // the globs now, so a third include added to the project changes what this measures.
    const workspace = await source("packages/qfai/vitest.workspace.ts");
    // The `e2e` project's OWN include list, not every glob in the file: the first version of this
    // repair matched `tests/…` anywhere and measured the whole tests tree, 4562 against 880. The
    // block is found by the project name, which is the thing the record's rule names.
    const project = /name:\s*"e2e",\s*include:\s*\[([^\]]*)\]/.exec(workspace);
    expect(
      project,
      "the workspace must declare an `e2e` project with an include list",
    ).not.toBeNull();
    // EVERY include is read, and one this pattern cannot parse is reported rather than dropped.
    // Silently skipping one would take the walk back to measuring less than the project runs, which
    // is the failure the derivation replaced — a guard that narrows itself is worse than one that
    // hardcodes, because the hardcoding is visible.
    const declared = [...(project?.[1] ?? "").matchAll(/"([^"]+)"/g)].map(
      (match) => match[1] ?? "",
    );
    const globs = declared
      .map((include) => /^(tests\/[^"*]+)\/\*/.exec(include)?.[1])
      .filter((root): root is string => root !== undefined);
    expect(
      declared.length - globs.length,
      `an include this walk cannot turn into a root: ${JSON.stringify(declared)}`,
    ).toBe(0);
    expect(globs.length, "the e2e project must declare its includes").toBeGreaterThan(0);
    const roots = [...new Set(globs)].map((glob) => `packages/qfai/${glob}`).sort();

    const CALLSITE_LINE = /^[ \t]*(?:it|test)(?:\.\w+)*\s*\(/;
    let measured = 0;
    for (const dir of roots) {
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
    // reviewers do not write their verdict in one parseable form. Measured over this stage's 17 closed
    // packs and their 50 reports — 5 carry `**Verdict: X**`, 14 carry `Verdict: **X**`, and 46 carry a
    // line holding both the word and a token. The figure that stood here, "two of twenty-nine", was
    // wrong in numerator and denominator; round 18 filed it and it was not applied. Inventing a marker
    // now would only pin the reports written after it.
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
