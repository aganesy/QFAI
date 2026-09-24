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

  it("reports a rewritten decision row in drift even when a change request names the file", async () => {
    await put(decisions, `${table}| DEC-0001 | Choice A | Reason | DONE |\n`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(
      decisions,
      `${table}| DEC-0001 | Choice B | Reason | DONE |\n| DEC-0002 | Change request: ${decisions} | Approved | DONE |\n`,
    );
    git("add", ".");
    git("commit", "-m", "rewrite row");
    const findings = await validateStoryTreeDrift(root, config(), "drift");
    expect(
      findings.some((item) => item.code === "QFAI-STORY-010" && item.message.includes("content")),
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
