import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveIssueFix } from "../../src/cli/commands/validate.js";
import {
  DELIBERATION_DIR_OUTSIDE_ROOT_MESSAGE,
  defaultConfig,
  loadConfig,
} from "../../src/core/config.js";
import type { Issue, ValidationProfile } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
import { validateDeliberationRecords } from "../../src/core/validators/deliberationRecord.js";

const HEADER =
  "| Background | Option 1 | Option 2 | Option 3 | Option 4 (other) | Chosen option number |";
const DELIMITER = "| --- | --- | --- | --- | --- | --- |";
const RECORD = path.join(".qfai", "deliberation", "20261112043225-login.md");

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-delib-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function table(header: string, ...rows: string[]): string {
  return [header, DELIMITER, ...rows].join("\n");
}

function record(interview: string, agentDecisions: string): string {
  return [
    "# Deliberation record",
    "",
    "## Subject",
    "",
    "Login flow.",
    "",
    "## Interview",
    "",
    interview,
    "",
    "## Agent decisions",
    "",
    agentDecisions,
    "",
  ].join("\n");
}

const INTERVIEW_ROW = "| Who signs in | Staff | Customers | Both | | 3 |";
const DECISION_ROW = "| Where to keep the rule | Baseline | Reference | Step | | 1 |";
const VALID = record(table(HEADER, INTERVIEW_ROW), table(HEADER, DECISION_ROW));
const LACKS_OPTION_4 = record(
  table("| Background | Option 1 | Option 2 | Option 3 | Chosen option number |", INTERVIEW_ROW),
  table(HEADER, DECISION_ROW),
);

async function put(relative: string, text: string): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text, "utf-8");
}

async function findings(): Promise<Issue[]> {
  return validateDeliberationRecords(root, defaultConfig);
}

describe("QFAI-DELIB-001 accepts a record of the stated layout", () => {
  // QFAI:AC-0001-0302-01
  // QFAI:EX-0001-0302-01
  it("raises nothing on a record with both sections and six-column tables", async () => {
    await put(RECORD, VALID);
    expect(await findings()).toEqual([]);
  });

  // QFAI:EX-0001-0302-02
  it("raises nothing on an Interview row that holds only a free answer and chooses 4", async () => {
    await put(
      RECORD,
      record(
        table(HEADER, '| Who are the main users | | | | "Support staff" | 4 |'),
        table(HEADER),
      ),
    );
    expect(await findings()).toEqual([]);
  });

  // QFAI:EX-0001-0302-03
  it("raises nothing on an Agent decisions row that fills two options", async () => {
    await put(
      RECORD,
      record(table(HEADER, INTERVIEW_ROW), table(HEADER, "| Name | A | B | | | 1 |")),
    );
    expect(await findings()).toEqual([]);
  });

  // QFAI:EX-0001-0302-04
  it("finds the sections under stage subheadings and accepts one that holds no table", async () => {
    const text = [
      "# Deliberation record",
      "## Subject",
      "Login.",
      "## discussion-interview",
      "### Interview",
      table(HEADER, INTERVIEW_ROW),
      "### Agent decisions",
      table(HEADER, DECISION_ROW),
      "## sdd",
      "### Interview",
      table(HEADER, INTERVIEW_ROW),
      "### Agent decisions",
      "None in this stage.",
      "",
    ].join("\n\n");
    await put(RECORD, text);
    expect(await findings()).toEqual([]);
  });
});

describe("QFAI-DELIB-001 reports each layout defect", () => {
  // QFAI:AC-0001-0302-02
  // QFAI:EX-0001-0302-05
  it("names the file, Interview and the missing Option 4 (other)", async () => {
    await put(RECORD, LACKS_OPTION_4);
    const found = await findings();
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      code: "QFAI-DELIB-001",
      severity: "error",
      file: ".qfai/deliberation/20261112043225-login.md",
    });
    expect(found[0]?.message).toContain("`Interview`");
    expect(found[0]?.message).toContain("`Option 4 (other)`");
  });

  // QFAI:EX-0001-0302-06
  it("names the file, Agent decisions and an added Notes column", async () => {
    await put(
      RECORD,
      record(table(HEADER, INTERVIEW_ROW), table(`${HEADER} Notes |`, DECISION_ROW)),
    );
    const found = await findings();
    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain("`Agent decisions`");
    expect(found[0]?.message).toContain("`Notes`");
  });

  // QFAI:EX-0001-0302-07
  it("names a renamed column and a moved column", async () => {
    const renamed = HEADER.replace("Chosen option number", "Chosen");
    const moved = HEADER.replace("Background | Option 1", "Option 1 | Background");
    await put(".qfai/deliberation/a.md", record(table(renamed, INTERVIEW_ROW), table(HEADER)));
    await put(".qfai/deliberation/b.md", record(table(HEADER), table(moved, DECISION_ROW)));
    const found = await findings();
    expect(found.map((item) => item.file)).toEqual([
      ".qfai/deliberation/a.md",
      ".qfai/deliberation/b.md",
    ]);
    expect(found[0]?.message).toContain("`Interview`");
    expect(found[0]?.message).toContain("`Chosen`");
    expect(found[1]?.message).toContain("`Agent decisions`");
    expect(found[1]?.message).toContain("`Option 1`");
    expect(found.every((item) => item.severity === "error")).toBe(true);
  });

  // QFAI:EX-0001-0302-08
  it("names the file and the missing Agent decisions section", async () => {
    await put(
      RECORD,
      ["## Subject", "Login.", "## Interview", table(HEADER, INTERVIEW_ROW)].join("\n\n"),
    );
    const found = await findings();
    expect(found).toHaveLength(1);
    expect(found[0]?.file).toBe(".qfai/deliberation/20261112043225-login.md");
    expect(found[0]?.message).toContain("`Agent decisions`");
  });

  it("names each section a record lacks when it has neither", async () => {
    await put(RECORD, ["# Deliberation record", "## Subject", "Login."].join("\n\n"));
    const found = await findings();
    expect(found.map((item) => item.message)).toEqual([
      expect.stringContaining("`Interview`"),
      expect.stringContaining("`Agent decisions`"),
    ]);
  });

  // QFAI:EX-0001-0302-09
  it("names the file, Agent decisions and a row of five cells", async () => {
    await put(
      RECORD,
      record(table(HEADER, INTERVIEW_ROW), table(HEADER, "| Name | A | B | C | 1 |")),
    );
    const found = await findings();
    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain("`Agent decisions`");
    expect(found[0]?.message).toMatch(/line \d+/);
    expect(found[0]?.message).toContain("5 cells");
  });

  it("reports a row of the wrong cell count under a wrong header as well as the header", async () => {
    await put(
      RECORD,
      record(
        table(HEADER, INTERVIEW_ROW),
        table(`${HEADER} Notes |`, "| Name | A | B | C | | 1 | none |"),
      ),
    );
    const found = await findings();
    expect(found).toHaveLength(2);
    expect(found[0]?.message).toContain("`Notes`");
    expect(found[1]?.message).toMatch(/row at line \d+ has 7 cells/);
  });

  // QFAI:EX-0001-0298-16
  it("gives the catalogued fix, which allows a committed record a layout repair only", async () => {
    await put(RECORD, LACKS_OPTION_4);
    const [found] = await findings();
    expect(found?.suggested_action).toBeUndefined();
    expect(found && resolveIssueFix(found)).toMatch(/table layout only, never its content/);
  });
});

describe("QFAI-DELIB-001 reads nothing but the layout", () => {
  it("counts an escaped pipe as part of its cell", async () => {
    await put(
      RECORD,
      record(
        table(HEADER, "| Pick a \\| b | a \\| b | c | d | | 1 |"),
        table(HEADER, DECISION_ROW),
      ),
    );
    expect(await findings()).toEqual([]);
  });

  it("skips a table inside a fenced code block", async () => {
    const fenced = ["```markdown", "| Background | Chosen |", "| --- | --- |", "| x | 1 |", "```"];
    await put(
      RECORD,
      record([...fenced, "", table(HEADER, INTERVIEW_ROW)].join("\n"), table(HEADER)),
    );
    expect(await findings()).toEqual([]);
  });

  // QFAI:AC-0001-0302-03
  // QFAI:EX-0001-0302-10
  it("raises nothing with no directory and with a directory of no Markdown file", async () => {
    expect(await findings()).toEqual([]);
    await put(".qfai/deliberation/notes.txt", "not a record");
    await mkdir(path.join(root, ".qfai", "deliberation", "nested"), { recursive: true });
    await put(".qfai/deliberation/nested/old.md", "# Not read");
    expect(await findings()).toEqual([]);
  });

  // The cells carry Japanese text, built from code points because this repository stores English.
  // QFAI:EX-0001-0302-11
  it("accepts any file name and any cell content, and the document schema skips the record", async () => {
    // "Monthly", "Yearly" and "Plan" in Japanese.
    const monthly = String.fromCodePoint(0x6708, 0x984d);
    const yearly = String.fromCodePoint(0x5e74, 0x984d);
    const plan = String.fromCodePoint(0x6848);
    await put(
      ".qfai/deliberation/notes.md",
      record(
        table(HEADER, `| | https://example.com/pricing | ${monthly} | ${yearly} | | 2 |`),
        table(HEADER, `| See https://example.com | ${plan}A | ${plan}B | ${plan}C | | 3 |`),
      ),
    );
    const { issues } = await validateProject(root, undefined, { profile: "sdd" });
    const onRecord = issues.filter((item) => item.file?.includes("deliberation"));
    expect(onRecord.filter((item) => item.code === "QFAI-DELIB-001")).toEqual([]);
    expect(onRecord.filter((item) => item.code === "QFAI-DOCSCHEMA-001")).toEqual([]);
  });
});

describe("QFAI-DELIB-001 runs in the stated profiles", () => {
  // QFAI:AC-0001-0302-04
  // QFAI:EX-0001-0302-12
  it("is reported once in discussion, sdd, full and verify, and not in the other five", async () => {
    await put(RECORD, LACKS_OPTION_4);
    const count = async (profile: ValidationProfile): Promise<number> =>
      (await validateProject(root, undefined, { profile })).issues.filter(
        (item) => item.code === "QFAI-DELIB-001",
      ).length;
    for (const profile of ["discussion", "sdd", "full", "verify"] as const) {
      expect(await count(profile), profile).toBe(1);
    }
    for (const profile of ["prototyping", "atdd", "tdd", "drift", "saas-package"] as const) {
      expect(await count(profile), profile).toBe(0);
    }
  });

  // QFAI:AC-0001-0302-05
  // QFAI:EX-0001-0302-13
  it("reads the directory paths.deliberationDir names, with a backslash taken as a separator", async () => {
    await put(path.join("docs", "delib", "r.md"), LACKS_OPTION_4);
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  deliberationDir: 'docs\\delib'\n",
      "utf-8",
    );
    const configured = await loadConfig(root);
    expect(configured.config.paths.deliberationDir).toBe("docs/delib");
    const first = await validateDeliberationRecords(root, configured.config);
    expect(first.map((item) => item.file)).toEqual(["docs/delib/r.md"]);

    await rm(path.join(root, "qfai.config.yaml"));
    await put(RECORD, LACKS_OPTION_4);
    const unset = await loadConfig(root);
    expect(unset.config.paths.deliberationDir).toBe(".qfai/deliberation");
    const second = await validateDeliberationRecords(root, unset.config);
    expect(second.map((item) => item.file)).toEqual([".qfai/deliberation/20261112043225-login.md"]);
  });

  it("raises QFAI-CFG-002 and keeps the default for a value that is not a non-empty string", async () => {
    await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  deliberationDir: 7\n", "utf-8");
    const loaded = await loadConfig(root);
    expect(loaded.config.paths.deliberationDir).toBe(".qfai/deliberation");
    expect(loaded.issues.map((item) => item.code)).toContain("QFAI-CFG-002");
  });

  // QFAI:AC-0001-0302-05
  // QFAI:EX-0001-0302-14
  it("raises QFAI-CFG-002 and keeps the default for a value naming the project root or a directory outside it", async () => {
    await put(RECORD, LACKS_OPTION_4);
    const values = [
      ".",
      "./",
      "docs/..",
      "'.\\'",
      "../records",
      "'docs\\..\\..'",
      "'...'",
      "'docs. '",
    ];
    for (const value of values) {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        `paths:\n  deliberationDir: ${value}\n`,
        "utf-8",
      );
      const loaded = await loadConfig(root);
      expect(loaded.config.paths.deliberationDir, value).toBe(".qfai/deliberation");
      expect(
        loaded.issues.some(
          (item) =>
            item.code === "QFAI-CFG-002" && item.message === DELIBERATION_DIR_OUTSIDE_ROOT_MESSAGE,
        ),
        value,
      ).toBe(true);
      const found = await validateDeliberationRecords(root, loaded.config);
      expect(
        found.map((item) => item.file),
        value,
      ).toEqual([".qfai/deliberation/20261112043225-login.md"]);
    }
  });

  it("keeps an absolute paths.deliberationDir that lies inside the project root", async () => {
    const absolute = path.join(root, "docs", "delib");
    await put(path.join("docs", "delib", "r.md"), LACKS_OPTION_4);
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      `paths:\n  deliberationDir: '${absolute}'\n`,
      "utf-8",
    );
    const loaded = await loadConfig(root);
    expect(loaded.issues.map((item) => item.message)).not.toContain(
      DELIBERATION_DIR_OUTSIDE_ROOT_MESSAGE,
    );
    const found = await validateDeliberationRecords(root, loaded.config);
    expect(found.map((item) => item.file)).toEqual(["docs/delib/r.md"]);
  });
});

describe("the shipped deliberation record template", () => {
  const template = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "assets",
    "init",
    ".qfai",
    "assistant",
    "rule",
    "references",
    "deliberation-record-template.md",
  );

  // QFAI:AC-0001-0298-02
  // QFAI:EX-0001-0298-04
  it("holds Subject, Interview and Agent decisions, and a record written from it passes the layout check", async () => {
    const text = await readFile(template, "utf-8");
    for (const heading of ["Subject", "Interview", "Agent decisions"]) {
      expect(text).toMatch(new RegExp(`^#{2,6} ${heading}$`, "m"));
    }
    expect(text.split(HEADER).length - 1).toBe(2);
    await put(RECORD, text);
    expect(await findings()).toEqual([]);
  });

  // QFAI:AC-0001-0299-03
  // QFAI:EX-0001-0299-04
  it("opens with a note that the record is history, keeps twists, is not the current state and is not read end to end", async () => {
    const text = await readFile(template, "utf-8");
    const firstHeading = text.search(/^## /m);
    const opening = text.slice(0, firstHeading);
    expect(opening).toMatch(/history/i);
    expect(opening).toMatch(/twists/i);
    expect(opening).toMatch(/not the current state/i);
    expect(opening).toMatch(/not read end to end/i);
  });
});
