/**
 * `QFAI-GRILL-001` — a stage whose mandatory grilling session left no trace.
 *
 * The failure it exists for leaves nothing else behind: a stage that ran its
 * session and one that skipped it produce the same pack, the same coverage, the
 * same work orders. The only difference is the record the stage was told to
 * write, so that record's absence is the finding.
 *
 * The quiet side is pinned as heavily as the loud one. A warning that fires
 * where nothing is owed is one people learn to scroll past, and then the one
 * that matters goes with it.
 */

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import { CANONICAL_TIMESTAMP_DIGITS } from "../../../../src/core/packLocator.js";
import {
  DISCUSSION_DIR_REL,
  GRILLING_COLUMNS,
  GRILLING_SECTIONS,
  GRILLING_TRACE_CODES,
  validateGrillingTrace,
} from "../../../../src/core/validators/grillingTrace.js";
import { removeTempTree } from "../../../helpers/tempTree.js";

// tests/unit/core/validators/<this file> -> ... -> packages/qfai
const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

const asset = (rel: string): string => path.join(packageRoot, "assets/init/.qfai/assistant", rel);

/** The evidence template `qfai init` ships, which a spec stage copies. */
const SPEC_EVIDENCE_TEMPLATE = asset("skills/qfai-sdd/templates/evidence/sdd-spec.md");

/** The discussion skill, whose `## Grilling Session` block a run copies. */
const DISCUSSION_SKILL = asset("skills/qfai-discussion/SKILL.md");

/** The review request the reviewer fills in, which ships the same table empty. */
const REVIEW_REQUEST = asset("skills/qfai-discussion/templates/review/review_request.md");

/**
 * The one table in `file` whose header names `marker`, as evidence would hold it.
 *
 * Three assertions guard the slice, because a wrong one is indistinguishable
 * from a right one otherwise: whatever three lines are taken, a block that is
 * not a table reports exactly the one finding a correct rejection reports.
 *
 *   - exactly one header names the marker, so a second table mentioning the
 *     same column fails the test rather than silently moving the slice;
 *   - the line under it is a delimiter;
 *   - at least one row follows, so a table the asset reduced to a header is not
 *     mistaken for the state under test.
 */
async function shippedTable(file: string, marker: string, heading: string): Promise<string> {
  const lines = (await readFile(file, "utf-8")).split(/\r?\n/);
  const headers = lines.flatMap((line, at) =>
    line.trim().startsWith("|") && line.includes(marker) ? [at] : [],
  );
  expect(headers, `${path.basename(file)} no longer shows one table naming ${marker}`).toHaveLength(
    1,
  );

  const rows: string[] = [];
  for (const line of lines.slice(headers[0] ?? 0)) {
    if (!line.trim().startsWith("|")) break;
    rows.push(line);
  }
  expect(rows.length, `the ${marker} table in ${path.basename(file)} has no rows`).toBeGreaterThan(
    2,
  );
  expect(rows[1]).toMatch(/^\s*\|[\s|:-]+\|\s*$/);
  return ["# Evidence", "", heading, "", ...rows, ""].join("\n");
}

/** A section with one phase row, which is what a run that grilled writes. */
const POPULATED = [
  "# Evidence",
  "",
  "## Pre-draft Grilling",
  "",
  "| Phase | Session | Ended at | Wrote at | Frontier | Evidence |",
  "| ----- | ------- | -------- | -------- | -------- | -------- |",
  "| 0 | run | 2026-01-01T00:00:00Z | 2026-01-01T00:01:00Z | 4 settled, 0 escalated | #work-orders-summary |",
  "",
].join("\n");

/** The discussion stage's record, as its skill states the row. */
const POPULATED_DISCUSSION = [
  "# Evidence",
  "",
  "## Grilling Session",
  "",
  "| Ended | Ended at | Authoring began | Frontier | Lookups | Decisions | Escalated |",
  "| ----- | -------- | --------------- | -------- | ------- | --------- | --------- |",
  "| confirmed | 2026-04-18T17:09:37Z | 2026-04-18T17:11:02Z | empty | none in flight | 12 | 0 |",
  "",
].join("\n");

/** A stamp of the width a pack resolves at, ending in `tail`. */
const stamp = (tail: string): string => `2026${tail.padStart(CANONICAL_TIMESTAMP_DIGITS - 4, "0")}`;

const OLDER = stamp("1");
const NEWER = stamp("2");

async function withRoot(body: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-grilling-trace-"));
  try {
    await body(root);
  } finally {
    await removeTempTree(root);
  }
}

/** `.qfai/evidence/<name>` with `body`. */
async function evidence(root: string, name: string, body: string): Promise<void> {
  const dir = path.join(root, ".qfai", "evidence");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), body, "utf-8");
}

/** `.qfai/discussion/<name>/`, the stage's own record that a run happened. */
async function pack(root: string, name: string): Promise<void> {
  await mkdir(path.join(root, ".qfai", "discussion", name), { recursive: true });
}

/** `POPULATED` with its last cell replaced, for the cases about one cell. */
const withLastCell = (cell: string): string => POPULATED.replace("#work-orders-summary", cell);

describe("validateGrillingTrace", () => {
  it("reports spec evidence with no session section", async () => {
    await withRoot(async (root) => {
      await evidence(root, "sdd-spec-0007.md", "# Evidence\n\n## Work Orders Summary\n");

      const issues = await validateGrillingTrace(root);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe(GRILLING_TRACE_CODES.spec);
      // The finding names the spec, not a generic message: an operator with
      // three of them needs to know which one.
      expect(issues[0]?.message).toContain("spec-0007");
      expect(issues[0]?.message).toContain("## Pre-draft Grilling");
      // The rule key is what a project silences or routes on, so it is part of
      // the finding rather than an implementation detail.
      expect(issues[0]?.rule).toBe("grilling.traceMissing");
    });
  });

  it("reports a section whose table is a header and nothing else", async () => {
    // The delimiter is what makes a table a table. Without the check, a header
    // row alone reads as a record — and a header is what a section copied and
    // abandoned halfway holds.
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        "# Evidence\n\n## Pre-draft Grilling\n\n| Phase | Session |\n",
      );

      const issues = await validateGrillingTrace(root);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain("no table under it");
    });
  });

  it("reports a section that carries no row", async () => {
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        "# Evidence\n\n## Pre-draft Grilling\n\n| Phase | Session |\n| ----- | ------- |\n",
      );

      const issues = await validateGrillingTrace(root);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain("at least one phase row");
      // Not the placeholder wording: no row was read, so none was rejected, and
      // telling the operator to replace placeholders sends them looking for
      // something that is not there.
      expect(issues[0]?.message).not.toContain("still holds the template's placeholders");
    });
  });

  it("reports the shipped template, copied and filled in with nothing", async () => {
    // The template carries worked rows, so the state this check is for — the
    // section copied and nothing replaced — has three table rows under it. A
    // row test that counted any row would take the template for the record it
    // is a template for, which is the cheapest route to the second without the
    // first.
    await withRoot(async (root) => {
      const template = await readFile(SPEC_EVIDENCE_TEMPLATE, "utf-8");
      // The template still holds a table under the heading. Replaced with
      // prose, the finding below would be raised for the other reason and the
      // placeholder rejection would go untested without anything saying so.
      expect(template).toMatch(/## Pre-draft Grilling[\s\S]*?\n\|[^\n]+\n\|[\s|:-]+\|\n\|/);
      await evidence(root, "sdd-spec-0007.md", template);

      const issues = await validateGrillingTrace(root);

      expect(issues).toHaveLength(1);
      // The operator is told which of the states they are in: a section that is
      // missing, one with no table, and one whose rows are all the template's
      // need different edits.
      expect(issues[0]?.message).toContain("still holds the template's placeholders");
    });
  });

  it("accepts a populated section", async () => {
    await withRoot(async (root) => {
      await evidence(root, "sdd-spec-0007.md", POPULATED);

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  it("reads a table that leaves its outer pipes off", async () => {
    // GFM writes them as a courtesy. Reading only the pipe-led form would find
    // no rows in a written table and report the record as missing.
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        [
          "## Pre-draft Grilling",
          "",
          "Phase | Session | Ended at",
          "----- | ------- | --------",
          "0 | run | 2026-01-01T00:00:00Z",
          "",
        ].join("\n"),
      );

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  it("does not take a later table in the section for the record", async () => {
    // A section may hold more than one table. Reading to the end of it would let
    // the second table's own header stand in for the row, so adding any table
    // under a subsection would satisfy the check.
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        [
          "## Pre-draft Grilling",
          "",
          "| Phase | Session | Ended at |",
          "| ----- | ------- | -------- |",
          "| <n> | <state> | <ISO8601> |",
          "",
          "### Notes",
          "",
          "| Note | Detail |",
          "| ---- | ------ |",
          "| a | b |",
          "",
        ].join("\n"),
      );

      expect(await validateGrillingTrace(root)).toHaveLength(1);
    });
  });

  describe("the heading", () => {
    for (const [name, heading] of [
      ["a closing run of hashes", "## Pre-draft Grilling ##"],
      ["up to three leading spaces", "   ## Pre-draft Grilling"],
    ] as const) {
      it(`admits ${name}`, async () => {
        // Both are headings in CommonMark. Matching the line exactly would
        // report a written record as missing for each.
        await withRoot(async (root) => {
          await evidence(
            root,
            "sdd-spec-0007.md",
            POPULATED.replace("## Pre-draft Grilling", heading),
          );

          expect(await validateGrillingTrace(root)).toEqual([]);
        });
      });
    }

    it("does not take a closing run glued to the text", async () => {
      // CommonMark needs whitespace before a closing run, so `## Title###` is a
      // heading whose text is `Title###`. Accepting it would match a heading
      // nobody writes and pass a file with no section of its own.
      await withRoot(async (root) => {
        await evidence(
          root,
          "sdd-spec-0007.md",
          POPULATED.replace("## Pre-draft Grilling", "## Pre-draft Grilling###"),
        );

        expect(await validateGrillingTrace(root)).toHaveLength(1);
      });
    });

    it("does not take a deeper heading for the section", async () => {
      // A subsection of something else that happens to end in those words is
      // not the section, and reading the heading as a substring accepts one.
      await withRoot(async (root) => {
        await evidence(
          root,
          "sdd-spec-0007.md",
          POPULATED.replace("## Pre-draft Grilling", "### Pre-draft Grilling"),
        );

        expect(await validateGrillingTrace(root)).toHaveLength(1);
      });
    });
  });

  describe("a cell that is one angle-bracketed token", () => {
    for (const [name, cell, findings] of [
      ["a placeholder", "<ISO8601>", 1],
      ["an autolink", "<https://example.invalid/run>", 0],
      ["an HTML comment", "<!-- none -->", 0],
      ["two placeholders run together", "<ISO8601><ISO8601>", 0],
    ] as const) {
      it(`${name} reports ${String(findings)}`, async () => {
        // Only the first is a placeholder. A cell carrying a link or a comment
        // has been written, and dropping its row would report a record that is
        // there as missing — against a stage that did the work.
        await withRoot(async (root) => {
          await evidence(root, "sdd-spec-0007.md", withLastCell(cell));

          expect(await validateGrillingTrace(root)).toHaveLength(findings);
        });
      });
    }

    it("leaves a row carrying a link inside a sentence alone", async () => {
      await withRoot(async (root) => {
        await evidence(
          root,
          "sdd-spec-0007.md",
          withLastCell("see <https://example.invalid/run> <br> and #wos"),
        );

        expect(await validateGrillingTrace(root)).toEqual([]);
      });
    });
  });

  it("reports a row whose cells are all empty", async () => {
    // The review request ships the table with an empty row for the reviewer to
    // fill. Copied into the evidence and left as it is, it holds a row and says
    // nothing, which is the state a placeholder scan alone misses.
    await withRoot(async (root) => {
      await evidence(
        root,
        `discussion-${NEWER}.md`,
        await shippedTable(REVIEW_REQUEST, "Authoring began", GRILLING_SECTIONS.discussion),
      );

      const issues = await validateGrillingTrace(root);

      expect(issues).toHaveLength(1);
      // Named for what it is. There are no placeholders in a blank row, and
      // telling the operator to replace them sends them looking for nothing.
      expect(issues[0]?.message).toContain("every row is empty");
      expect(issues[0]?.message).not.toContain("still holds the template's placeholders");
    });
  });

  it("names both shapes when the table holds one of each", async () => {
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        [
          "## Pre-draft Grilling",
          "",
          "| Phase | Session |",
          "| ----- | ------- |",
          "|       |         |",
          "| <n> | <state> |",
          "",
        ].join("\n"),
      );

      const issues = await validateGrillingTrace(root);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain(
        "every row is empty or still holds the template's placeholders",
      );
    });
  });

  describe("the discussion stage", () => {
    it("is read like the spec stage", async () => {
      // The run opens its evidence under its own stamp before it writes
      // anything else, and writes the row at every ending it admits. So an
      // evidence file with no section is a stage that wrote no record.
      await withRoot(async (root) => {
        await evidence(root, `discussion-${OLDER}.md`, POPULATED_DISCUSSION);
        await evidence(root, `discussion-${NEWER}.md`, "# Evidence\n");

        const issues = await validateGrillingTrace(root);

        expect(issues).toHaveLength(1);
        expect(issues[0]?.file).toBe(`.qfai/evidence/discussion-${NEWER}.md`);
        // Its own code: a profile that runs one stage must not be recorded as
        // having evaluated the other's family.
        expect(issues[0]?.code).toBe(GRILLING_TRACE_CODES.discussion);
        expect(issues[0]?.message).toContain(GRILLING_SECTIONS.discussion);
        expect(issues[0]?.message).toContain("at least one session row");
      });
    });

    it("writes the section its skill shows", async () => {
      // Two spellings of one heading drift silently: the skill keeps writing
      // one and the check keeps reading the other, and the run reads clean.
      const skill = await readFile(DISCUSSION_SKILL, "utf-8");
      expect(skill).toContain(GRILLING_SECTIONS.discussion);
    });

    it("reports the shipped example, copied and filled in with nothing", async () => {
      // The same shortcut as the spec template's, on the other stage: an agent
      // copies the block the skill shows and replaces none of it.
      await withRoot(async (root) => {
        await evidence(
          root,
          `discussion-${NEWER}.md`,
          await shippedTable(DISCUSSION_SKILL, "Authoring began", GRILLING_SECTIONS.discussion),
        );

        expect(await validateGrillingTrace(root)).toHaveLength(1);
      });
    });

    it("keeps its run list where the config says", () => {
      // Two literals for one path drift in silence: the project keeps its runs
      // in one place and the check looks in the other, finding no packs at all.
      expect(DISCUSSION_DIR_REL).toBe(defaultConfig.paths.discussionDir);
    });

    it("takes an absolute run list as it stands", async () => {
      // `paths.discussionDir` may be absolute, and the discussion CLI resolves
      // it that way. Joining it to the project root points at a directory
      // nobody wrote, so every run there reads as having no packs.
      await withRoot(async (root) => {
        await withRoot(async (elsewhere) => {
          await mkdir(path.join(elsewhere, `discussion-${NEWER}`), { recursive: true });

          const issues = await validateGrillingTrace(root, { discussionDir: elsewhere });

          expect(issues).toHaveLength(1);
          expect(issues[0]?.file).toBe(`.qfai/evidence/discussion-${NEWER}.md`);
        });
      });
    });

    it("ignores a stamp of the wrong width", async () => {
      // The width is the one a pack resolves at. A name outside it names a run
      // no pack will be found for, so holding it to the contract reports a file
      // nothing reads.
      await withRoot(async (root) => {
        await evidence(root, `discussion-${OLDER.slice(1)}.md`, "# Evidence\n");
        await evidence(root, `discussion-${OLDER}0.md`, "# Evidence\n");
        await evidence(root, "discussion-draft.md", "# Evidence\n");

        expect(await validateGrillingTrace(root)).toEqual([]);
      });
    });
  });

  describe("the run to ask about", () => {
    it("comes from the pack tree when no record names it", async () => {
      // Read from the evidence files alone, a run that wrote none is invisible,
      // and the run before it answers in its place with a record that is not
      // about it.
      await withRoot(async (root) => {
        await evidence(root, `discussion-${OLDER}.md`, POPULATED_DISCUSSION);
        await pack(root, `discussion-${OLDER}`);
        await pack(root, `discussion-${NEWER}`);

        const issues = await validateGrillingTrace(root);

        expect(issues).toHaveLength(1);
        expect(issues[0]?.file).toBe(`.qfai/evidence/discussion-${NEWER}.md`);
        expect(issues[0]?.message).toContain("does not exist");
        // Which run is owed, not just that one is: an operator with several
        // packs cannot act on the second without it.
        expect(issues[0]?.message).toContain(`discussion-${NEWER}`);
      });
    });

    it("is the newest record when it is newer than the newest pack", async () => {
      // A record newer than any pack is the record of a run whose pack is not
      // there to be read. It answers for itself, and reporting its file as
      // missing would be a finding against a run that wrote one.
      await withRoot(async (root) => {
        await evidence(root, `discussion-${NEWER}.md`, POPULATED_DISCUSSION);
        await pack(root, `discussion-${OLDER}`);

        expect(await validateGrillingTrace(root)).toEqual([]);
      });
    });

    it("is the newest pack even when an older record is unwritten", async () => {
      await withRoot(async (root) => {
        await evidence(root, `discussion-${OLDER}.md`, "# Evidence\n");
        await pack(root, `discussion-${OLDER}`);
        await pack(root, `discussion-${NEWER}`);

        const issues = await validateGrillingTrace(root);

        expect(issues).toHaveLength(1);
        expect(issues[0]?.file).toBe(`.qfai/evidence/discussion-${NEWER}.md`);
      });
    });

    it("reads an owed file that exists for its rows", async () => {
      await withRoot(async (root) => {
        await evidence(root, `discussion-${NEWER}.md`, "# Evidence\n");
        await pack(root, `discussion-${NEWER}`);

        const issues = await validateGrillingTrace(root);

        expect(issues).toHaveLength(1);
        expect(issues[0]?.message).toContain("records no grilling session");
      });
    });

    it("is no pack at all when none resolves", async () => {
      // `latestPack` reads only a canonical stamp. A directory under another
      // name is not a run this check can place, and inventing an owed file for
      // it would name a record no stage was ever told to write.
      await withRoot(async (root) => {
        await pack(root, "discussion-0001");
        await pack(root, "discussion-draft");

        expect(await validateGrillingTrace(root)).toEqual([]);
      });
    });
  });

  describe("the stages a caller names", () => {
    it("are the only ones read, pack path included", async () => {
      // Two runners dispatch this and a full run calls both, so a call reading
      // every stage would report each finding twice.
      await withRoot(async (root) => {
        await evidence(root, "sdd-spec-0007.md", "# Evidence\n");
        await pack(root, `discussion-${NEWER}`);

        const spec = await validateGrillingTrace(root, { subjects: ["spec"] });
        const discussion = await validateGrillingTrace(root, { subjects: ["discussion"] });

        expect(spec.map((i) => i.file)).toEqual([".qfai/evidence/sdd-spec-0007.md"]);
        expect(discussion.map((i) => i.file)).toEqual([`.qfai/evidence/discussion-${NEWER}.md`]);
        expect(await validateGrillingTrace(root)).toHaveLength(2);
      });
    });

    it("keeps a run that names no spec inside a scoped run", async () => {
      // `core/specScope.ts#isFindingInSpecScope` keeps an unattributed finding
      // in every slice, and `reviewArtifactsScope` says so of a discussion pack
      // by name. A sibling spec is the other case and is left alone.
      await withRoot(async (root) => {
        await evidence(root, "sdd-spec-0007.md", "# Evidence\n");
        await evidence(root, "sdd-spec-0009.md", "# Evidence\n");
        await pack(root, `discussion-${NEWER}`);

        const scoped = await validateGrillingTrace(root, { specScope: new Set(["0007"]) });

        expect(scoped.map((i) => i.file)).toEqual([
          `.qfai/evidence/discussion-${NEWER}.md`,
          ".qfai/evidence/sdd-spec-0007.md",
        ]);
      });
    });
  });

  it("warns rather than failing", async () => {
    // It reads a record the agent wrote about its own run, so it establishes
    // that the record exists and not that a session happened. An error would
    // claim the second.
    await withRoot(async (root) => {
      await evidence(root, "sdd-spec-0007.md", "# Evidence\n");

      expect((await validateGrillingTrace(root))[0]?.severity).toBe("warning");
    });
  });

  it("reports in a stable order", async () => {
    // `readdir` promises none, and a findings list that reshuffles between two
    // runs over one tree reads as churn in a diff.
    await withRoot(async (root) => {
      for (const id of ["0009", "0007", "0008"]) {
        await evidence(root, `sdd-spec-${id}.md`, "# Evidence\n");
      }

      const files = (await validateGrillingTrace(root)).map((finding) => finding.file);

      expect(files).toEqual([
        ".qfai/evidence/sdd-spec-0007.md",
        ".qfai/evidence/sdd-spec-0008.md",
        ".qfai/evidence/sdd-spec-0009.md",
      ]);
    });
  });

  it("says nothing about a project with no evidence tree", async () => {
    await withRoot(async (root) => {
      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  it("ignores evidence another stage wrote", async () => {
    // `implement-*`, `atdd-*` and the prototyping loop's own record are not a
    // per-run session record, and a finding on one is a finding nobody can act
    // on. The prototyping file is written before cycle 0 whether or not the
    // session settled anything, and an empty one is written as prose.
    await withRoot(async (root) => {
      await evidence(root, "implement-spec-0007.md", "# Evidence\n");
      await evidence(root, "atdd-spec-0007.md", "# Evidence\n");
      await mkdir(path.join(root, ".qfai", "evidence", "prototyping"), { recursive: true });
      await writeFile(
        path.join(root, ".qfai", "evidence", "prototyping", "grilling.md"),
        "# Grilling\n\n## Session\n\nnone\n",
        "utf-8",
      );

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  it("ignores a name that is not the canonical one", async () => {
    // The contract is on `sdd-spec-NNNN.md`. A file a project called
    // `sdd-notes.md` never entered it.
    await withRoot(async (root) => {
      await evidence(root, "sdd-notes.md", "# Notes\n");
      await evidence(root, "sdd-spec-7.md", "# Evidence\n");

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  it("ignores a directory named like the evidence file", async () => {
    // `readdir` returns both kinds, and reading a directory throws EISDIR
    // rather than reporting anything useful.
    await withRoot(async (root) => {
      await mkdir(path.join(root, ".qfai", "evidence", "sdd-spec-0007.md"), { recursive: true });

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  describe("a table shown rather than written", () => {
    const fenced = ["```text", "| Phase | Session |", "| ----- | ------- |", "| 0 | run |", "```"];

    it("is not the record", async () => {
      // A fenced block is an example of a table, not one. Read as content, a
      // section that shows what to write and writes nothing read as a record.
      await withRoot(async (root) => {
        await evidence(
          root,
          "sdd-spec-0007.md",
          ["## Pre-draft Grilling", "", ...fenced, ""].join("\n"),
        );

        expect(await validateGrillingTrace(root)).toHaveLength(1);
      });
    });

    it("does not answer for the table under it", async () => {
      await withRoot(async (root) => {
        await evidence(
          root,
          "sdd-spec-0007.md",
          [
            "## Pre-draft Grilling",
            "",
            ...fenced,
            "",
            "| Phase | Session |",
            "| ----- | ------- |",
            "| <n> | <state> |",
            "",
          ].join("\n"),
        );

        expect(await validateGrillingTrace(root)).toHaveLength(1);
      });
    });
  });

  describe("a table that is not the record", () => {
    it("does not answer for one", async () => {
      // A section may hold a table about something else. Taken for the record,
      // it says a row is there, which is true, and that the row is the
      // session's, which is not.
      await withRoot(async (root) => {
        await evidence(
          root,
          "sdd-spec-0007.md",
          [
            "## Pre-draft Grilling",
            "",
            "| Note | Detail |",
            "| ---- | ------ |",
            "| a | b |",
            "",
          ].join("\n"),
        );

        expect(await validateGrillingTrace(root)).toHaveLength(1);
      });
    });

    for (const [stage, file, marker] of [
      ["spec", SPEC_EVIDENCE_TEMPLATE, "Phase"],
      ["discussion", DISCUSSION_SKILL, "Authoring began"],
    ] as const) {
      it(`${stage}: the columns named are the ones the asset writes`, async () => {
        // Two spellings of one column drift in silence: the stage keeps writing
        // its table and the check stops recognising it, and the run reads clean.
        const header = (await shippedTable(file, marker, GRILLING_SECTIONS[stage])).split("\n")[4];
        for (const column of GRILLING_COLUMNS[stage]) {
          expect(header).toContain(column);
        }
      });
    }
  });

  describe("what Markdown reads, not what a line looks like", () => {
    const table = ["| Phase | Session |", "| ----- | ------- |", "| 0 | run |"];
    const under = (...body: string[]): string =>
      ["## Pre-draft Grilling", "", ...body, ""].join("\n");

    it("closes a fence only on its own marker", async () => {
      // A `~~~` block quoting a backtick line is one block. A toggle on any
      // fence-looking line would end it at the inner line and hide the table
      // that follows the real closer.
      await withRoot(async (root) => {
        await evidence(root, "sdd-spec-0007.md", under("~~~text", "```", "~~~", "", ...table));

        expect(await validateGrillingTrace(root)).toEqual([]);
      });
    });

    it("reads a tab as the four columns it is", async () => {
      await withRoot(async (root) => {
        await evidence(
          root,
          "sdd-spec-0007.md",
          under("\t| Phase | Session |", "\t| ----- | ------- |", "\t| 0 | run |"),
        );

        expect(await validateGrillingTrace(root)).toHaveLength(1);
      });
    });

    it("counts an escaped pipe as cell content", async () => {
      // `\\|` is content, and counting it as a separator would make the header
      // wider than its own delimiter, so a written table would fail the arity
      // check and its record would be reported as missing.
      await withRoot(async (root) => {
        await evidence(
          root,
          "sdd-spec-0007.md",
          under(
            "| Phase | Session | Notes \\| evidence |",
            "| ----- | ------- | ---------------- |",
            "| 0 | run | see the log |",
          ),
        );

        expect(await validateGrillingTrace(root)).toEqual([]);
      });
    });

    it("leaves a cell holding an email autolink alone", async () => {
      // Every autolink CommonMark admits carries a character a placeholder does
      // not — a URL its scheme colon, an email its `@` — and reading one as a
      // placeholder would drop its row.
      await withRoot(async (root) => {
        await evidence(
          root,
          "sdd-spec-0007.md",
          under(
            "| Phase | Session | Who |",
            "| ----- | ------- | --- |",
            "| 0 | run | <operator@example.com> |",
          ),
        );

        expect(await validateGrillingTrace(root)).toEqual([]);
      });
    });

    it("ends the section at a heading with no text", async () => {
      // CommonMark admits an empty heading, so a bare `###` opens a subsection
      // whose title is nothing. Requiring a title would read it as prose and
      // carry on into the table below it.
      await withRoot(async (root) => {
        await evidence(root, "sdd-spec-0007.md", under("###", "", ...table));

        expect(await validateGrillingTrace(root)).toHaveLength(1);
      });
    });

    it("does not end the section inside an HTML comment", async () => {
      // A comment's contents are an example of a document rather than part of
      // one, so a `### Example` inside one must not end the section before the
      // table.
      await withRoot(async (root) => {
        await evidence(root, "sdd-spec-0007.md", under("<!--", "### Example", "-->", "", ...table));

        expect(await validateGrillingTrace(root)).toEqual([]);
      });
    });
  });

  it("does not take an indented example for the record", async () => {
    // Four spaces makes a block an example of a document rather than part of
    // one, exactly as a fence does.
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        [
          "## Pre-draft Grilling",
          "",
          "    | Phase | Session |",
          "    | ----- | ------- |",
          "    | 0 | run |",
          "",
        ].join("\n"),
      );

      expect(await validateGrillingTrace(root)).toHaveLength(1);
    });
  });

  it("does not splice a table across a fence", async () => {
    // Dropping the fenced lines would close the gap over them, so a header
    // written above a fence and a delimiter written below it would become
    // adjacent and read as a table the document does not contain.
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        [
          "## Pre-draft Grilling",
          "",
          "| Phase | Session |",
          "```text",
          "an example",
          "```",
          "| ----- | ------- |",
          "| 0 | run |",
          "",
        ].join("\n"),
      );

      expect(await validateGrillingTrace(root)).toHaveLength(1);
    });
  });

  it("does not take a subsection's table for the record", async () => {
    // A subsection's content belongs to the subsection. The record's rows go
    // directly under the section heading, so reading past a `###` would let a
    // table that belongs to something else stand in for one the stage never
    // wrote.
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        [
          "## Pre-draft Grilling",
          "",
          "No table here.",
          "",
          "### Notes",
          "",
          "| Note | Detail |",
          "| ---- | ------ |",
          "| a | b |",
          "",
        ].join("\n"),
      );

      expect(await validateGrillingTrace(root)).toHaveLength(1);
    });
  });

  it("does not open the section on a heading inside a fence", async () => {
    // A fence holds an example of a document rather than part of one. Located
    // before the fences are dropped, a fenced copy of the heading would open the
    // section in the middle of a fence and invert the tracking below it.
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        [
          "```text",
          "## Pre-draft Grilling",
          "",
          "| Phase | Session |",
          "| ----- | ------- |",
          "| 0 | run |",
          "```",
          "",
        ].join("\n"),
      );

      expect(await validateGrillingTrace(root)).toHaveLength(1);
    });
  });

  it("does not take a break under a line that happens to hold a pipe", async () => {
    // GFM reads a delimiter only under a header of the same width, and a `---`
    // under a paragraph is a setext heading rather than a table. Matched on
    // shape alone, the break would take the role and what follows would read as
    // rows.
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        ["## Pre-draft Grilling", "", "Phase | Session", "---", "0 | run", ""].join("\n"),
      );

      expect(await validateGrillingTrace(root)).toHaveLength(1);
    });
  });

  it("does not take a thematic break for a delimiter", async () => {
    // GFM puts a delimiter under a header and nowhere else. Matched anywhere,
    // a break would take the role and whatever follows it would read as the
    // table's rows.
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        ["## Pre-draft Grilling", "", "The session ran.", "---", "See the table | below.", ""].join(
          "\n",
        ),
      );

      expect(await validateGrillingTrace(root)).toHaveLength(1);
    });
  });

  it("does not take a repeated delimiter for a row", async () => {
    // A second delimiter is the table's furniture. Its cells are neither empty
    // nor placeholders, so counting it would let a copied table with two
    // delimiters and no data of its own satisfy the check.
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        [
          "## Pre-draft Grilling",
          "",
          "| Phase | Session |",
          "| ----- | ------- |",
          "| ----- | ------- |",
          "",
        ].join("\n"),
      );

      expect(await validateGrillingTrace(root)).toHaveLength(1);
    });
  });

  it("reports an owed record that is a directory rather than throwing", async () => {
    // An owed name comes from the stage's run list rather than from the
    // listing, so it can be anything on disk. Reading it unconditionally would
    // throw `EISDIR` out of the whole command — a crash where the finding is
    // what an operator needs.
    await withRoot(async (root) => {
      await pack(root, `discussion-${NEWER}`);
      await mkdir(path.join(root, ".qfai", "evidence", `discussion-${NEWER}.md`), {
        recursive: true,
      });

      const issues = await validateGrillingTrace(root);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain("does not exist");
    });
  });

  it("carries on when the run list is not a directory", async () => {
    // `doctor` is where a `paths.discussionDir` that is not a directory is
    // reported, and the readers that meet it carry on rather than stopping. A
    // warning-severity check must not be the one thing that ends the run over
    // it — so the records that are there are still read, and only the owed-run
    // branch goes quiet.
    await withRoot(async (root) => {
      const notADir = path.join(root, "packs");
      await writeFile(notADir, "not a directory", "utf-8");
      await evidence(root, `discussion-${NEWER}.md`, "# Evidence\n");

      const issues = await validateGrillingTrace(root, { discussionDir: notADir });

      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain("records no grilling session");
    });
  });
});
