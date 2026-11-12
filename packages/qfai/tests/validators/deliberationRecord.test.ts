import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig, loadConfig } from "../../src/core/config.js";
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
  table(
    "| Background | Option 1 | Option 2 | Option 3 | Chosen option number |",
    "| Who signs in | Staff | Customers | Both | 3 |",
  ),
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
    expect(found[0]?.message).toContain("Interview");
    expect(found[0]?.message).toContain("Option 4 (other)");
  });

  // QFAI:EX-0001-0302-06
  it("names the file, Agent decisions and an added Notes column", async () => {
    await put(
      RECORD,
      record(
        table(HEADER, INTERVIEW_ROW),
        table(`${HEADER} Notes |`, "| Name | A | B | C | | 1 | none |"),
      ),
    );
    const found = await findings();
    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain("Agent decisions");
    expect(found[0]?.message).toContain("Notes");
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
    expect(found[0]?.message).toContain("Interview");
    expect(found[0]?.message).toContain("Chosen");
    expect(found[1]?.message).toContain("Agent decisions");
    expect(found[1]?.message).toContain("Option 1");
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
    expect(found[0]?.message).toContain("Agent decisions");
  });

  // QFAI:EX-0001-0302-09
  it("names the file, Agent decisions and a row of five cells", async () => {
    await put(
      RECORD,
      record(table(HEADER, INTERVIEW_ROW), table(HEADER, "| Name | A | B | C | 1 |")),
    );
    const found = await findings();
    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain("Agent decisions");
    expect(found[0]?.message).toMatch(/line \d+/);
    expect(found[0]?.message).toContain("5 cells");
  });
});

describe("QFAI-DELIB-001 reads nothing but the layout", () => {
  // QFAI:EX-0001-0302-10
  it("raises nothing with no directory and with a directory of no Markdown file", async () => {
    expect(await findings()).toEqual([]);
    await put(".qfai/deliberation/notes.txt", "not a record");
    await mkdir(path.join(root, ".qfai", "deliberation", "nested"), { recursive: true });
    await put(".qfai/deliberation/nested/old.md", "# Not read");
    expect(await findings()).toEqual([]);
  });

  // QFAI:EX-0001-0302-11
  it("accepts any file name and any cell content, and the document schema skips the record", async () => {
    await put(
      ".qfai/deliberation/notes.md",
      record(
        table(HEADER, "| | https://example.com/pricing | 月額 | 年額 | | 2 |"),
        table(HEADER, "| See https://example.com | 案A | 案B | 案C | | 3 |"),
      ),
    );
    const { issues } = await validateProject(root, undefined, { profile: "sdd" });
    const onRecord = issues.filter((item) => item.file?.includes("deliberation"));
    expect(onRecord.filter((item) => item.code === "QFAI-DELIB-001")).toEqual([]);
    expect(onRecord.filter((item) => item.code === "QFAI-DOCSCHEMA-001")).toEqual([]);
  });
});

describe("QFAI-DELIB-001 runs in the stated profiles", () => {
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
