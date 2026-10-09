/**
 * Acceptance of what `qfai validate --profile sdd` reports about a story tree
 * written to disk: the entry set of a story directory, the shape, uniqueness
 * and placement of IDs, the decision and open-question tables, and the edges
 * between acceptance criteria, examples and business rules.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import { readStoryTreeModel } from "../../src/core/storyTree/tree.js";
import type { Issue } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";

const roots: string[] = [];
const specs = ".qfai/spec";
const flow = `${specs}/02_business-flow/business-flow-0001`;
const story = `${flow}/user-story-0001-0001`;
const contract = `${specs}/03_contract`;

/** A `decisions.md` or `open-questions.md` document holding one table. */
function register(title: string, columns: string[], rows: string[] = []): string {
  const head = `| ${columns.join(" | ")} |\n| ${columns.map(() => "---").join(" | ")} |\n`;
  return `# ${title}\n\n## ${title}\n\n${head}${rows.join("\n")}${rows.length > 0 ? "\n" : ""}`;
}

const COLUMNS = ["ID", "Content", "Approach", "Status"];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

/** One flow with one story, one criterion, one example and one rule that cites it. */
function validTree(): Map<string, string> {
  return new Map([
    [
      `${specs}/02_business-flow/business-flows.md`,
      "| BF-ID | Title |\n| --- | --- |\n| BF-0001 | Checkout |\n",
    ],
    [
      `${flow}/business-flow.md`,
      "# BF-0001: Checkout\n\n```mermaid\nflowchart LR\n  A --> B\n```\n",
    ],
    [`${flow}/user-stories.md`, "| US-ID | Title |\n| --- | --- |\n| US-0001-0001 | Pay |\n"],
    [`${story}/01_User-story.md`, "# US-0001-0001: Pay\n"],
    [
      `${story}/02_Acceptance-Criteria.md`,
      "```gherkin\n# AC-0001-0001-01\nScenario: Pay\n  Given a cart\n  When it is paid\n  Then a receipt exists\n```\n",
    ],
    [
      `${story}/03_Example.md`,
      "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-01 | one item | receipt |\n",
    ],
    [
      `${contract}/cli/cli-0001-check.md`,
      "# CLI-0001: Check\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001-0001 | A paid cart has a receipt | EX-0001-0001-01 |\n",
    ],
    [`${specs}/decisions.md`, register("Decisions", COLUMNS)],
    [`${specs}/open-questions.md`, register("Open Questions", COLUMNS)],
  ]);
}

/** Writes the tree under a fresh project and reads the findings of the sdd profile. */
async function validateTree(
  files: Map<string, string>,
): Promise<{ root: string; config: QfaiConfig; issues: Issue[] }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-accept-"));
  roots.push(root);
  for (const [file, text] of files) {
    const target = path.join(root, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, text, "utf8");
  }
  const config = structuredClone(defaultConfig);
  config.paths.specsDir = specs;
  config.paths.contractsDir = contract;
  const result = await validateProject(
    root,
    { config, issues: [], configPath: path.join(root, "qfai.config.yaml") },
    { profile: "sdd" },
  );
  return { root, config, issues: result.issues };
}

function only(issues: Issue[], code: string): Issue[] {
  return issues.filter((found) => found.code === code);
}

function errorsNaming(issues: Issue[], code: string, id: string): Issue[] {
  return only(issues, code).filter(
    (found) => found.severity === "error" && (found.refs ?? []).includes(id),
  );
}

/** The valid tree with the given files replaced, and with every `null` entry removed. */
function changed(overrides: Record<string, string | null>): Map<string, string> {
  const files = validTree();
  for (const [file, text] of Object.entries(overrides)) {
    if (text === null) files.delete(file);
    else files.set(file, text);
  }
  return files;
}

function criterion(id: string): string {
  return `\`\`\`gherkin\n# ${id}\nScenario: Pay\n  Given a cart\n  When it is paid\n  Then a receipt exists\n\`\`\`\n`;
}

function examples(...rows: Array<[string, string]>): string {
  const lines = rows.map(([example, acRef]) => `| ${example} | ${acRef} | one item | receipt |`);
  return `| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n${lines.join("\n")}\n`;
}

function rules(...rows: Array<[string, string]>): string {
  const lines = rows.map(([rule, cited]) => `| ${rule} | A paid cart has a receipt | ${cited} |`);
  return `# CLI-0001: Check\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n${lines.join("\n")}\n`;
}

function posix(value: string | undefined): string {
  return (value ?? "").replace(/\\/g, "/");
}

describe("story-tree validation acceptance", () => {
  it("raises no story finding for the valid tree the cases below start from", async () => {
    const { issues } = await validateTree(validTree());

    expect(issues.filter((found) => found.code.startsWith("QFAI-STORY-"))).toEqual([]);
    expect(only(issues, "QFAI-SPACK-102")).toEqual([]);
  });

  // QFAI:AC-0001-0051-02
  // QFAI:EX-0001-0051-02
  it("names a story directory that lacks a file or holds an extra file or subdirectory", async () => {
    const files = changed({ [`${story}/03_Example.md`]: null });
    files.set(`${story}/notes.md`, "Notes.\n");
    files.set(`${story}/drafts/draft.md`, "Draft.\n");
    const { root, issues } = await validateTree(files);

    const reported = only(issues, "QFAI-STORY-001");
    expect(reported).toHaveLength(1);
    expect(reported[0]?.severity).toBe("error");
    expect(posix(reported[0]?.file)).toBe(posix(path.join(root, story)));
    expect(reported[0]?.message).toContain("missing 03_Example.md");
    expect(reported[0]?.message).toContain("notes.md");
    expect(reported[0]?.message).toContain("drafts");

    const exact = await validateTree(validTree());
    expect(only(exact.issues, "QFAI-STORY-001")).toEqual([]);
  });

  // QFAI:AC-0001-0051-03
  it("names an ID that does not have its shape, and the file that defines it", async () => {
    const { root, issues } = await validateTree(
      changed({
        [`${story}/02_Acceptance-Criteria.md`]: criterion("AC-0001-0001-001"),
        [`${story}/03_Example.md`]: examples(["EX-0001-0001-1", "AC-0001-0001-001"]),
        [`${specs}/decisions.md`]: register("Decisions", COLUMNS, ["| DEC-1 | A | B | DONE |"]),
        [`${specs}/open-questions.md`]: register("Open Questions", COLUMNS, [
          "| OQ-12345 | A | B | DONE |",
        ]),
      }),
    );

    expect(
      errorsNaming(issues, "QFAI-STORY-002", "DEC-1").map((found) => posix(found.file)),
    ).toEqual([posix(path.join(root, specs, "decisions.md"))]);
    expect(
      errorsNaming(issues, "QFAI-STORY-002", "OQ-12345").map((found) => posix(found.file)),
    ).toEqual([posix(path.join(root, specs, "open-questions.md"))]);
    const ac = errorsNaming(issues, "QFAI-STORY-002", "AC-0001-0001-001");
    expect(ac.map((found) => posix(found.file))).toContain(
      posix(path.join(root, story, "02_Acceptance-Criteria.md")),
    );
    const example = errorsNaming(issues, "QFAI-STORY-002", "EX-0001-0001-1");
    expect(example.map((found) => posix(found.file))).toContain(
      posix(path.join(root, story, "03_Example.md")),
    );
    expect(ac[0]?.message).toContain("AC-0001-0001-001");
    expect(example[0]?.message).toContain("EX-0001-0001-1");
  });

  // QFAI:AC-0001-0051-04
  it("reports an ID declared in two places once, naming every file that declares it", async () => {
    const second = `${flow}/user-story-0001-0002`;
    const { root, issues } = await validateTree(
      changed({
        [`${second}/01_User-story.md`]: "# US-0001-0001: Pay again\n",
        [`${second}/02_Acceptance-Criteria.md`]: criterion("AC-0001-0001-01"),
        [`${second}/03_Example.md`]: examples(),
      }),
    );

    const duplicates = only(issues, "QFAI-STORY-002").filter((found) =>
      found.message.includes("is defined more than once"),
    );
    const byId = (id: string) => duplicates.filter((found) => (found.refs ?? []).includes(id));
    expect(byId("US-0001-0001")).toHaveLength(1);
    expect(byId("AC-0001-0001-01")).toHaveLength(1);
    const user = byId("US-0001-0001")[0];
    expect(user?.severity).toBe("error");
    expect(user?.message).toContain(posix(path.join(root, story, "01_User-story.md")));
    expect(user?.message).toContain(posix(path.join(root, second, "01_User-story.md")));
  });

  // QFAI:AC-0001-0051-05
  it("names a story ID, an AC ID and a directory name that disagree with where they sit", async () => {
    const wrongFlow = await validateTree(
      changed({ [`${story}/01_User-story.md`]: "# US-0002-0001: Pay\n" }),
    );
    expect(errorsNaming(wrongFlow.issues, "QFAI-STORY-002", "US-0002-0001")).not.toEqual([]);

    const wrongStory = await validateTree(
      changed({
        [`${story}/02_Acceptance-Criteria.md`]: criterion("AC-0001-0002-01"),
        [`${story}/03_Example.md`]: examples(["EX-0001-0002-01", "AC-0001-0002-01"]),
      }),
    );
    const criteria = errorsNaming(wrongStory.issues, "QFAI-STORY-002", "AC-0001-0002-01");
    expect(posix(criteria[0]?.file)).toBe(
      posix(path.join(wrongStory.root, story, "02_Acceptance-Criteria.md")),
    );
    expect(errorsNaming(wrongStory.issues, "QFAI-STORY-002", "EX-0001-0002-01")).not.toEqual([]);

    const misnamed = changed({});
    const heading = misnamed.get(`${flow}/business-flow.md`) ?? "";
    misnamed.delete(`${flow}/business-flow.md`);
    misnamed.set(`${specs}/02_business-flow/business-flow-0002/business-flow.md`, heading);
    const wrongDirectory = await validateTree(misnamed);
    const flows = errorsNaming(wrongDirectory.issues, "QFAI-STORY-002", "BF-0001");
    expect(flows.map((found) => posix(found.file))).toContain(
      posix(
        path.join(
          wrongDirectory.root,
          specs,
          "02_business-flow/business-flow-0002/business-flow.md",
        ),
      ),
    );

    const clean = await validateTree(validTree());
    expect(only(clean.issues, "QFAI-STORY-002")).toEqual([]);
  });

  // QFAI:AC-0001-0053-02
  it("names the row of a Status outside the vocabulary of its table", async () => {
    const { issues } = await validateTree(
      changed({
        [`${specs}/decisions.md`]: register("Decisions", COLUMNS, [
          "| DEC-0001 | A | B | SUPERSEDED |",
          "| DEC-0002 | A | B | DEFERRED |",
          "| DEC-0003 | A | B | Done |",
          "| DEC-0004 | A | B | TODO |",
          "| DEC-0005 | A | B | WIP |",
          "| DEC-0006 | A | B | REJECTED |",
          "| DEC-0007 | A | B | SUPERSEDED (by DEC-0004) |",
          "| DEC-0008 | A | B | PARTLY SUPERSEDED (by DEC-0004) |",
        ]),
        [`${specs}/open-questions.md`]: register("Open Questions", COLUMNS, [
          "| OQ-0001 | A | B | REJECTED |",
          "| OQ-0002 | A | B | DEFERRED |",
          "| OQ-0003 | A | B | SUPERSEDED (by DEC-0004) |",
          "| OQ-0004 | A | B | DONE |",
        ]),
      }),
    );

    const invalid = only(issues, "QFAI-STORY-003")
      .filter((found) => found.message.includes("has an invalid Status"))
      .map((found) => ({
        severity: found.severity,
        file: path.basename(found.file ?? ""),
        row: /row (\S+) has an invalid Status/.exec(found.message)?.[1],
      }))
      .sort((left, right) => (left.row ?? "").localeCompare(right.row ?? ""));
    expect(invalid).toEqual([
      { severity: "error", file: "decisions.md", row: "DEC-0001" },
      { severity: "error", file: "decisions.md", row: "DEC-0002" },
      { severity: "error", file: "decisions.md", row: "DEC-0003" },
      { severity: "error", file: "open-questions.md", row: "OQ-0001" },
      { severity: "error", file: "open-questions.md", row: "OQ-0003" },
    ]);
  });

  // QFAI:AC-0001-0053-03
  it("names a row whose ID has the shape of the other table", async () => {
    const { issues } = await validateTree(
      changed({
        [`${specs}/decisions.md`]: register("Decisions", COLUMNS, ["| OQ-0001 | A | B | DONE |"]),
        [`${specs}/open-questions.md`]: register("Open Questions", COLUMNS, [
          "| DEC-0001 | A | B | DONE |",
        ]),
      }),
    );

    const invalid = only(issues, "QFAI-STORY-003")
      .filter((found) => found.message.includes("has an invalid ID"))
      .map((found) => ({
        severity: found.severity,
        file: path.basename(found.file ?? ""),
        id: /invalid ID: (\S+)/.exec(found.message)?.[1],
      }))
      .sort((left, right) => left.file.localeCompare(right.file));
    expect(invalid).toEqual([
      { severity: "error", file: "decisions.md", id: "OQ-0001" },
      { severity: "error", file: "open-questions.md", id: "DEC-0001" },
    ]);
  });

  // QFAI:AC-0001-0053-05
  it("raises an error for an open Unadjudicated question and none once it is closed", async () => {
    const question = (id: string, status: string): string =>
      `| ${id} | Unadjudicated: the user was asked and never answered | Ask again | ${status} |`;
    const { root, issues } = await validateTree(
      changed({
        [`${specs}/open-questions.md`]: register("Open Questions", COLUMNS, [
          question("OQ-0001", "TODO"),
          question("OQ-0002", "WIP"),
          question("OQ-0003", "DONE"),
          question("OQ-0004", "DEFERRED"),
        ]),
      }),
    );

    const open = only(issues, "QFAI-SPACK-102");
    expect(open.map((found) => [found.severity, found.refs])).toEqual([
      ["error", ["OQ-0001"]],
      ["error", ["OQ-0002"]],
    ]);
    expect(open.map((found) => posix(found.file))).toEqual([
      posix(path.join(root, specs, "open-questions.md")),
      posix(path.join(root, specs, "open-questions.md")),
    ]);
  });

  // QFAI:AC-0001-0149-01
  // QFAI:EX-0001-0149-01
  it("gates a story of two criteria and three examples on the criterion each example names", async () => {
    const files = (rows: Array<[string, string]>): Map<string, string> =>
      changed({
        [`${story}/02_Acceptance-Criteria.md`]: `${criterion("AC-0001-0001-01")}\n${criterion("AC-0001-0001-02")}`,
        [`${story}/03_Example.md`]: examples(...rows),
        [`${contract}/cli/cli-0001-check.md`]: rules([
          "BR-0001-0001",
          "EX-0001-0001-01, EX-0001-0001-02, EX-0001-0001-03",
        ]),
      });
    const errors = (issues: Issue[]): Issue[] =>
      issues.filter((found) => found.severity === "error" && found.code.startsWith("QFAI-STORY-"));

    const passing = await validateTree(
      files([
        ["EX-0001-0001-01", "AC-0001-0001-01"],
        ["EX-0001-0001-02", "AC-0001-0001-02"],
        ["EX-0001-0001-03", "AC-0001-0001-01"],
      ]),
    );
    expect(errors(passing.issues)).toEqual([]);

    const empty = await validateTree(
      files([
        ["EX-0001-0001-01", ""],
        ["EX-0001-0001-02", "AC-0001-0001-02"],
        ["EX-0001-0001-03", "AC-0001-0001-01"],
      ]),
    );
    const emptyReport = errorsNaming(empty.issues, "QFAI-STORY-004", "EX-0001-0001-01");
    expect(emptyReport).toHaveLength(1);
    expect(posix(emptyReport[0]?.file)).toBe(posix(path.join(empty.root, story, "03_Example.md")));

    const both = await validateTree(
      files([
        ["EX-0001-0001-01", "AC-0001-0001-01, AC-0001-0001-02"],
        ["EX-0001-0001-02", "AC-0001-0001-02"],
        ["EX-0001-0001-03", "AC-0001-0001-01"],
      ]),
    );
    expect(errorsNaming(both.issues, "QFAI-STORY-004", "EX-0001-0001-01")).toHaveLength(1);

    const unnamed = await validateTree(
      files([
        ["EX-0001-0001-01", "AC-0001-0001-01"],
        ["EX-0001-0001-02", "AC-0001-0001-01"],
        ["EX-0001-0001-03", "AC-0001-0001-01"],
      ]),
    );
    const unnamedReport = errorsNaming(unnamed.issues, "QFAI-STORY-004", "AC-0001-0001-02");
    expect(unnamedReport).toHaveLength(1);
    expect(posix(unnamedReport[0]?.file)).toBe(
      posix(path.join(unnamed.root, story, "02_Acceptance-Criteria.md")),
    );
  });

  // QFAI:EX-0001-0149-02
  it("gates a contract of two rules on the examples each rule names", async () => {
    const rows = [
      ["EX-0001-0001-01", "AC-0001-0001-01"],
      ["EX-0001-0001-02", "AC-0001-0001-01"],
      ["EX-0001-0001-03", "AC-0001-0001-01"],
    ] as Array<[string, string]>;
    const files = (...contractRows: Array<[string, string]>): Map<string, string> =>
      changed({
        [`${story}/03_Example.md`]: examples(...rows),
        [`${contract}/cli/cli-0001-check.md`]: rules(...contractRows),
      });
    const errors = (issues: Issue[]): Issue[] =>
      issues.filter((found) => found.severity === "error" && found.code.startsWith("QFAI-STORY-"));

    const passing = await validateTree(
      files(
        ["BR-0001-0001", "EX-0001-0001-01, EX-0001-0001-02"],
        ["BR-0001-0002", "EX-0001-0001-02, EX-0001-0001-03"],
      ),
    );
    expect(errors(passing.issues)).toEqual([]);

    const noExamples = await validateTree(
      files(
        ["BR-0001-0001", "EX-0001-0001-01, EX-0001-0001-02, EX-0001-0001-03"],
        ["BR-0001-0002", ""],
      ),
    );
    const noExamplesReport = errorsNaming(noExamples.issues, "QFAI-STORY-005", "BR-0001-0002");
    expect(noExamplesReport).toHaveLength(1);
    expect(posix(noExamplesReport[0]?.file)).toBe(
      posix(path.join(noExamples.root, contract, "cli/cli-0001-check.md")),
    );

    const uncited = await validateTree(
      files(["BR-0001-0001", "EX-0001-0001-01"], ["BR-0001-0002", "EX-0001-0001-02"]),
    );
    const uncitedReport = errorsNaming(uncited.issues, "QFAI-STORY-005", "EX-0001-0001-03");
    expect(uncitedReport).toHaveLength(1);
    expect(posix(uncitedReport[0]?.file)).toBe(
      posix(path.join(uncited.root, story, "03_Example.md")),
    );

    const unknown = await validateTree(
      files(
        ["BR-0001-0001", "EX-0001-0001-01, EX-0001-0001-02, EX-0001-0001-03"],
        ["BR-0001-0002", "EX-0001-0001-99"],
      ),
    );
    const unknownReport = errorsNaming(unknown.issues, "QFAI-STORY-005", "BR-0001-0002");
    expect(unknownReport).toHaveLength(1);
    expect(unknownReport[0]?.message).toContain("cites unknown EX-0001-0001-99");
  });

  // QFAI:AC-0001-0055-01
  it("names an example whose criterion reference is empty, repeated, undefined or of another story", async () => {
    const other = `${flow}/user-story-0001-0002`;
    const { root, issues } = await validateTree(
      changed({
        [`${flow}/user-stories.md`]:
          "| US-ID | Title |\n| --- | --- |\n| US-0001-0001 | Pay |\n| US-0001-0002 | Refund |\n",
        [`${other}/01_User-story.md`]: "# US-0001-0002: Refund\n",
        [`${other}/02_Acceptance-Criteria.md`]: criterion("AC-0001-0002-01"),
        [`${other}/03_Example.md`]: examples(["EX-0001-0002-01", "AC-0001-0002-01"]),
        [`${story}/02_Acceptance-Criteria.md`]: `${criterion("AC-0001-0001-01")}\n${criterion("AC-0001-0001-02")}`,
        [`${story}/03_Example.md`]: examples(
          ["EX-0001-0001-01", ""],
          ["EX-0001-0001-02", "AC-0001-0001-01, AC-0001-0001-02"],
          ["EX-0001-0001-03", "AC-0001-0001-09"],
          ["EX-0001-0001-04", "AC-0001-0002-01"],
          ["EX-0001-0001-05", "AC-0001-0001-01"],
        ),
      }),
    );

    for (const example of [
      "EX-0001-0001-01",
      "EX-0001-0001-02",
      "EX-0001-0001-03",
      "EX-0001-0001-04",
    ]) {
      const reported = errorsNaming(issues, "QFAI-STORY-004", example);
      expect(reported).toHaveLength(1);
      expect(posix(reported[0]?.file)).toBe(posix(path.join(root, story, "03_Example.md")));
      expect(reported[0]?.message).toContain(example);
    }
    expect(errorsNaming(issues, "QFAI-STORY-004", "EX-0001-0001-05")).toEqual([]);
  });

  // QFAI:AC-0001-0055-02
  it("names a criterion that no example's reference names", async () => {
    const { root, issues } = await validateTree(
      changed({
        [`${story}/02_Acceptance-Criteria.md`]: `${criterion("AC-0001-0001-01")}\n${criterion("AC-0001-0001-02")}`,
      }),
    );

    const reported = errorsNaming(issues, "QFAI-STORY-004", "AC-0001-0001-02");
    expect(reported).toHaveLength(1);
    expect(posix(reported[0]?.file)).toBe(
      posix(path.join(root, story, "02_Acceptance-Criteria.md")),
    );
    expect(errorsNaming(issues, "QFAI-STORY-004", "AC-0001-0001-01")).toEqual([]);
  });

  // QFAI:AC-0001-0055-03
  // QFAI:EX-0001-0055-04
  it("reads a rule alike in a Markdown, a YAML and a SQL contract", async () => {
    const { config, root, issues } = await validateTree(
      changed({
        [`${story}/03_Example.md`]: examples(
          ["EX-0001-0001-01", "AC-0001-0001-01"],
          ["EX-0001-0001-02", "AC-0001-0001-01"],
          ["EX-0001-0001-03", "AC-0001-0001-01"],
        ),
        [`${contract}/api/api-0002-orders.yaml`]:
          "# QFAI-CONTRACT-ID: API-0002\nx-qfai-rules:\n  - id: BR-0002-0001\n    statement: An order has a total\n    examples: [EX-0001-0001-02]\n",
        [`${contract}/db/db-0003-orders.sql`]:
          "-- QFAI-CONTRACT-ID: DB-0003\n-- Rule BR-0003-0001: An order row is saved\n-- Examples: EX-0001-0001-03\nSELECT 1;\n",
      }),
    );

    const model = await readStoryTreeModel(root, config);
    expect(
      model.rules
        .map(({ id, statement, examples: cited }) => ({ id, statement, cited }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    ).toEqual([
      {
        id: "BR-0001-0001",
        statement: "A paid cart has a receipt",
        cited: ["EX-0001-0001-01"],
      },
      { id: "BR-0002-0001", statement: "An order has a total", cited: ["EX-0001-0001-02"] },
      { id: "BR-0003-0001", statement: "An order row is saved", cited: ["EX-0001-0001-03"] },
    ]);
    expect(only(issues, "QFAI-STORY-005")).toEqual([]);
  });

  // QFAI:AC-0001-0055-04
  it("names a rule that has no example or cites one the tree does not define", async () => {
    const { root, issues } = await validateTree(
      changed({
        [`${contract}/cli/cli-0001-check.md`]: rules(["BR-0001-0001", ""]),
        [`${contract}/api/api-0002-orders.yaml`]:
          "# QFAI-CONTRACT-ID: API-0002\nx-qfai-rules:\n  - id: BR-0002-0001\n    statement: An order has a total\n    examples: [EX-0001-0001-99]\n",
        [`${contract}/db/db-0003-orders.sql`]:
          "-- QFAI-CONTRACT-ID: DB-0003\n-- Rule BR-0003-0001: An order row is saved\nSELECT 1;\n",
      }),
    );

    for (const [rule, file] of [
      ["BR-0001-0001", "cli/cli-0001-check.md"],
      ["BR-0002-0001", "api/api-0002-orders.yaml"],
      ["BR-0003-0001", "db/db-0003-orders.sql"],
    ] as const) {
      const reported = errorsNaming(issues, "QFAI-STORY-005", rule);
      expect(reported).toHaveLength(1);
      expect(posix(reported[0]?.file)).toBe(posix(path.join(root, contract, file)));
    }
    expect(errorsNaming(issues, "QFAI-STORY-005", "BR-0001-0001")[0]?.message).toContain(
      "has no examples",
    );
    expect(errorsNaming(issues, "QFAI-STORY-005", "BR-0002-0001")[0]?.message).toContain(
      "cites unknown EX-0001-0001-99",
    );
    expect(errorsNaming(issues, "QFAI-STORY-005", "BR-0003-0001")[0]?.message).toContain(
      "has no examples",
    );
  });

  // QFAI:AC-0001-0055-05
  it("names an example that no rule cites", async () => {
    const { root, issues } = await validateTree(
      changed({ [`${contract}/cli/cli-0001-check.md`]: null }),
    );

    const reported = errorsNaming(issues, "QFAI-STORY-005", "EX-0001-0001-01");
    expect(reported).toHaveLength(1);
    expect(posix(reported[0]?.file)).toBe(posix(path.join(root, story, "03_Example.md")));
    expect(reported[0]?.message).toContain("is not cited");
  });
});
