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
  GRILLING_SECTIONS,
  GRILLING_TRACE_CODE,
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
      expect(issues[0]?.code).toBe(GRILLING_TRACE_CODE);
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
    // GFM writes them as a courtesy. Reading only the pipe-led form found no
    // rows in a written table and reported the record as missing.
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
    // A section may hold more than one table. Reading to the end of it let the
    // second table's own header stand in for the row, so adding any table under
    // a subsection satisfied the check.
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
        // Both are headings in CommonMark. Matching the line exactly reported a
        // written record as missing for each.
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
        // has been written, and dropping its row reported a record that is
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

      expect(await validateGrillingTrace(root)).toHaveLength(1);
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
      // The same shortcut the spec template had, on the other stage: an agent
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

  it("refuses a run list it cannot read rather than reporting clean", async () => {
    // The default collapses every read failure into an empty listing, which
    // leaves the owed-run branch inert and the run reporting the answer a
    // project that grilled every run gets.
    await withRoot(async (root) => {
      const notADir = path.join(root, "packs");
      await writeFile(notADir, "not a directory", "utf-8");

      await expect(validateGrillingTrace(root, { discussionDir: notADir })).rejects.toThrow();
    });
  });
});
