import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateStoryTreeDrift } from "../../src/core/validators/upstreamSsotGuard.js";

let root: string;
const specs = ".qfai/spec";
const decisions = `${specs}/decisions.md`;
const glossary = `${specs}/01_policy/glossary.md`;
const table = "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";

function git(...args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

async function put(file: string, content: string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

function config() {
  const value = structuredClone(defaultConfig);
  value.paths.specsDir = specs;
  value.paths.contractsDir = `${specs}/03_contract`;
  value.baseBranch = "main";
  return value;
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-drift-"));
  git("init", "-b", "main");
  git("config", "user.email", "test@example.test");
  git("config", "user.name", "Test");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("story-tree drift", () => {
  // QFAI:EX-0001-0002-04
  // QFAI:EX-0001-0056-04
  it("reports each protected story-tree edit and excludes evidence", async () => {
    const protectedFiles = [
      `${specs}/02_business-flow/business-flow-0001/business-flow.md`,
      glossary,
      `${specs}/03_contract/cli/command.md`,
      `${specs}/open-questions.md`,
    ];
    await put(decisions, table);
    for (const file of protectedFiles) await put(file, "# Original\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    for (const file of protectedFiles) await put(file, "# Changed\n");
    await put(".qfai/evidence/notes.md", "new evidence\n");
    git("add", ".");
    git("commit", "-m", "edit protected files and evidence");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    for (const file of protectedFiles) {
      expect(
        findings.some((item) => item.file === file),
        file,
      ).toBe(true);
    }
    expect(findings.some((item) => item.file === ".qfai/evidence/notes.md")).toBe(false);
  });

  // QFAI:EX-0001-0056-05
  it("reports an unapproved protected edit but accepts an in-force change request", async () => {
    await put(decisions, table);
    await put(glossary, "# Terms\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(glossary, "# Terms\nUpdated\n");
    git("add", ".");
    git("commit", "-m", "edit glossary");
    expect(
      (await validateStoryTreeDrift(root, config(), "tdd")).some((item) => item.file === glossary),
    ).toBe(true);

    await put(decisions, `${table}| DEC-0001 | Change request: ${glossary} | Approved | WIP |\n`);
    expect(
      (await validateStoryTreeDrift(root, config(), "tdd")).some((item) => item.file === glossary),
    ).toBe(false);
  });

  // QFAI:EX-0001-0002-06
  it("keeps a DONE change request in force", async () => {
    await put(decisions, table);
    await put(glossary, "# Original\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(glossary, "# Changed\n");
    await put(decisions, `${table}| DEC-0001 | Change request: ${glossary} | Approved | DONE |\n`);
    git("add", ".");
    git("commit", "-m", "approved edit");
    expect(
      (await validateStoryTreeDrift(root, config(), "tdd")).some((item) => item.file === glossary),
    ).toBe(false);
  });

  // QFAI:EX-0001-0056-06
  // QFAI:EX-0001-0002-09
  // QFAI:EX-0001-0056-07
  it("allows only appended change-request rows without another authorisation", async () => {
    await put(decisions, table);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    for (const status of ["TODO", "WIP"]) {
      await put(
        decisions,
        `${table}| DEC-0001 | Change request: ${glossary} | Reason | ${status} |\n`,
      );
      git("add", ".");
      git("commit", "-m", `change request ${status}`);
      expect(
        (await validateStoryTreeDrift(root, config(), "drift")).some(
          (item) => item.file === decisions,
        ),
      ).toBe(false);
    }
    await put(decisions, `${table}| DEC-0001 | Ordinary decision | Reason | TODO |\n`);
    git("add", ".");
    git("commit", "-m", "ordinary decision");
    expect(
      (await validateStoryTreeDrift(root, config(), "drift")).some(
        (item) => item.file === decisions,
      ),
    ).toBe(true);
  });

  // QFAI:EX-0001-0056-08
  it("allows a change-request row to move from TODO to WIP", async () => {
    await put(decisions, `${table}| DEC-0001 | Change request: ${glossary} | Reason | TODO |\n`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(decisions, `${table}| DEC-0001 | Change request: ${glossary} | Reason | WIP |\n`);
    git("add", ".");
    git("commit", "-m", "approve request");
    expect(
      (await validateStoryTreeDrift(root, config(), "drift")).some(
        (item) => item.file === decisions,
      ),
    ).toBe(false);
  });

  // QFAI:EX-0001-0056-08
  it("reports a rewritten change-request row as an upstream edit and a rewritten row", async () => {
    await put(decisions, `${table}| DEC-0001 | Change request: ${glossary} | Reason | TODO |\n`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(
      decisions,
      `${table}| DEC-0001 | Change request: ${glossary}, ${specs}/01_policy/objective.md | Reason | TODO |\n`,
    );
    git("add", ".");
    git("commit", "-m", "rewrite request");
    const findings = await validateStoryTreeDrift(root, config(), "drift");
    expect(
      findings.some((item) => item.code === "QFAI-DRIFT-001" && item.file === decisions),
    ).toBe(true);
    expect(
      findings.some(
        (item) =>
          item.code === "QFAI-STORY-010" &&
          item.file === decisions &&
          item.message.includes("DEC-0001 content"),
      ),
    ).toBe(true);
  });

  // QFAI:EX-0001-0007-07
  // QFAI:EX-0001-0056-02
  it("reports a rewritten decision row in drift even when a change request names the file", async () => {
    const questions = `${specs}/open-questions.md`;
    const questionTable = "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
    await put(
      decisions,
      `${table}| DEC-0001 | Choice A | Reason | DONE |\n| DEC-0002 | Choice X | Reason | DONE |\n`,
    );
    await put(questions, `${questionTable}| OQ-0001 | Which layout | Pending | TODO |\n`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(
      decisions,
      `${table}| DEC-0001 | Choice B | Reason | DONE |\n| DEC-0009 | Choice X | Reason | DONE |\n| DEC-0003 | Change request: ${decisions} | Approved | DONE |\n`,
    );
    await put(questions, `${questionTable}| OQ-0001 | Which layout | Pending | DONE |\n`);
    git("add", ".");
    git("commit", "-m", "rewrite row");
    const findings = await validateStoryTreeDrift(root, config(), "drift");
    const rewritten = findings.filter((item) => item.code === "QFAI-STORY-010");
    expect(
      rewritten.some(
        (item) =>
          item.file === decisions && item.message.includes("DEC-0001 content"),
      ),
    ).toBe(true);
    expect(
      rewritten.some((item) => item.file === decisions && item.message.includes("DEC-0002 id")),
    ).toBe(true);
    expect(rewritten.some((item) => item.file === questions)).toBe(false);
  });

  // QFAI:EX-0001-0007-06
  it("accepts a status advance with an appended decision", async () => {
    await put(decisions, `${table}| DEC-0001 | Choice A | Reason | TODO |\n`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(
      decisions,
      `${table}| DEC-0001 | Choice A | Reason | DONE |\n| DEC-0002 | New choice | Reason | TODO |\n`,
    );
    git("add", ".");
    git("commit", "-m", "advance and append");
    const findings = await validateStoryTreeDrift(root, config(), "drift");
    expect(findings.some((item) => item.code === "QFAI-STORY-010")).toBe(false);
  });

  // QFAI:EX-0001-0007-08
  it("reports removal of an existing decision row", async () => {
    await put(decisions, `${table}| DEC-0001 | Choice A | Reason | TODO |\n`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(decisions, table);
    git("add", ".");
    git("commit", "-m", "remove row");
    const findings = await validateStoryTreeDrift(root, config(), "drift");
    expect(
      findings.some((item) => item.code === "QFAI-STORY-010" && item.message.includes("DEC-0001")),
    ).toBe(true);
  });

  it("does not accuse the migration branch when the base has no story tree", async () => {
    await put("README.md", "base\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(decisions, table);
    await put(glossary, "# Terms\n");
    git("add", ".");
    git("commit", "-m", "migration");
    expect(await validateStoryTreeDrift(root, config(), "drift")).toEqual([]);
  });

  it("does not report drift when the base ref or git repository is unavailable", async () => {
    await put(decisions, table);
    await put(glossary, "# Terms\n");
    const missing = config();
    missing.baseBranch = "missing/base";
    expect(await validateStoryTreeDrift(root, missing, "drift")).toEqual([]);
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-story-no-git-"));
    try {
      expect(await validateStoryTreeDrift(outside, config(), "drift")).toEqual([]);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  // QFAI:EX-0001-0056-04
  // QFAI:EX-0001-0056-05
  it("does not let a TODO change request authorise an edit and ignores unprotected tests", async () => {
    await put(decisions, table);
    await put(glossary, "# Terms\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(glossary, "# Terms\nUpdated\n");
    await put("tests/unit/example.test.ts", "test\n");
    await put(decisions, `${table}| DEC-0001 | Change request: ${glossary} | Pending | TODO |\n`);
    git("add", ".");
    git("commit", "-m", "edit without approval");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    expect(findings.some((item) => item.file === glossary)).toBe(true);
    expect(findings.some((item) => item.file?.includes("example.test.ts"))).toBe(false);
    expect(findings.some((item) => item.file === decisions)).toBe(false);
  });
});
