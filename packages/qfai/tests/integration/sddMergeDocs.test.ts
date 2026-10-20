// QFAI:AC-0001-0238-01
// QFAI:AC-0001-0238-02
// QFAI:AC-0001-0238-03

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { run } from "../../src/cli/main.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { removeTempTree } from "../helpers/tempTree.js";

const EXAMPLES =
  ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md";
const CONTRACT = ".qfai/spec/03_contract/cli/cli-0001-sample.md";

const exampleHead =
  "# Examples\n\n## Examples\n\n| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n";
const firstRow =
  "| EX-0001-0001-01 | AC-0001-0001-01 | Two sides edit one row. | The row keeps the first edit. It keeps the second edit. |\n";
const secondRow = "| EX-0001-0001-02 | AC-0001-0001-01 | Another row. | It stays. |\n";
const examples = exampleHead + firstRow + secondRow;

// A contract statement of many sentences on one line, as in the reported 6,945-character case.
const sentences = Array.from(
  { length: 40 },
  (_, index) => `Sentence ${index + 1} of the statement says one thing.`,
);
function contract(statement: string[]): string {
  return [
    "# CLI-0001: Sample",
    "",
    "## Ownership boundary",
    "",
    "This contract decides one sample behaviour.",
    "",
    "## Business rules",
    "",
    "| BR-ID | Statement | Examples |",
    "| --- | --- | --- |",
    `| BR-0001-0001 | ${statement.join(" ")} | EX-0001-0001-01 |`,
    "",
  ].join("\n");
}

let root: string;

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

async function put(file: string, content: string | null): Promise<void> {
  const target = path.join(root, file);
  if (content === null) {
    await rm(target, { force: true });
    return;
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

/** Commits each file's base, then ours on main and theirs on a branch, and merges the branch. */
async function conflict(
  files: Record<string, [string, string | null, string | null]>,
): Promise<void> {
  for (const [file, [base]] of Object.entries(files)) await put(file, base);
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  git("checkout", "-q", "-b", "theirs");
  for (const [file, [, , theirs]] of Object.entries(files)) await put(file, theirs);
  git("add", "-A");
  git("commit", "-q", "-m", "theirs");
  git("checkout", "-q", "main");
  for (const [file, [, ours]] of Object.entries(files)) await put(file, ours);
  git("add", "-A");
  git("commit", "-q", "-m", "ours");
  expect(() => git("merge", "-q", "--no-edit", "theirs")).toThrow();
}

async function mergeDocs(): Promise<{ code: number | string | undefined; stdout: string }> {
  const previous = process.exitCode;
  const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
  const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  process.exitCode = undefined;
  try {
    await run(["sdd", "merge-docs", "--root", root], root);
    return {
      code: process.exitCode,
      stdout: [...stdout.mock.calls, ...stderr.mock.calls].map((call) => String(call[0])).join(""),
    };
  } finally {
    stdout.mockRestore();
    stderr.mockRestore();
    process.exitCode = previous;
  }
}

function read(file: string): Promise<string> {
  return readFile(path.join(root, file), "utf8");
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-merge-docs-"));
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@example.test");
  git("config", "user.name", "Test");
  git("config", "core.autocrlf", "false");
  await put(
    "qfai.config.yaml",
    "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
  );
});

afterEach(async () => {
  await removeTempTree(root);
});

describe("qfai sdd merge-docs", () => {
  // QFAI:EX-0001-0238-01
  it("merges a one-word change and an appended clause in one example row", async () => {
    await conflict({
      [EXAMPLES]: [
        examples,
        examples.replace("first edit", "first wording"),
        examples.replace("second edit. |", "second edit. It adds a clause. |"),
      ],
    });
    const result = await mergeDocs();
    expect(result.stdout).toContain(`${EXAMPLES}: merged`);
    expect(await read(EXAMPLES)).toBe(
      examples
        .replace("first edit", "first wording")
        .replace("second edit. |", "second edit. It adds a clause. |"),
    );
    expect(result.code).toBe(0);
  });

  // QFAI:EX-0001-0238-02
  it("keeps the rows both sides appended to one table, ours first", async () => {
    const ourRow = "| EX-0001-0001-03 | AC-0001-0001-01 | Ours. | Kept first. |\n";
    const theirRow = "| EX-0001-0001-04 | AC-0001-0001-01 | Theirs. | Kept second. |\n";
    await conflict({ [EXAMPLES]: [examples, examples + ourRow, examples + theirRow] });
    const result = await mergeDocs();
    expect(await read(EXAMPLES)).toBe(examples + ourRow + theirRow);
    expect(result.code).toBe(0);
  });

  // QFAI:EX-0001-0238-03
  it("merges edits to different sentences of one long contract statement", async () => {
    const ours = sentences.map((s, i) => (i === 3 ? s.replace("one thing", "our thing") : s));
    const theirs = sentences.map((s, i) => (i === 30 ? `${s} Theirs adds one.` : s));
    await conflict({ [CONTRACT]: [contract(sentences), contract(ours), contract(theirs)] });
    const result = await mergeDocs();
    const merged = ours.map((s, i) => (i === 30 ? `${s} Theirs adds one.` : s));
    expect(await read(CONTRACT)).toBe(contract(merged));
    expect(result.code).toBe(0);
  });

  // QFAI:EX-0001-0238-04
  it("says there is nothing to merge when no story-tree document is unmerged", async () => {
    await put(EXAMPLES, examples);
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    const result = await mergeDocs();
    expect(result.stdout).toContain("nothing to merge");
    expect(await read(EXAMPLES)).toBe(examples);
    expect(result.code).toBe(0);
  });

  // QFAI:EX-0001-0238-05
  it("leaves a working file that no longer holds conflict markers unchanged", async () => {
    await conflict({
      [EXAMPLES]: [
        examples,
        examples.replace("Another row.", "Ours row."),
        examples.replace("Another row.", "Theirs row."),
      ],
    });
    const resolved = examples.replace("Another row.", "Resolved by hand.");
    await put(EXAMPLES, resolved);
    const result = await mergeDocs();
    expect(await read(EXAMPLES)).toBe(resolved);
    expect(result.code).toBe(0);
  });

  // QFAI:EX-0001-0238-06
  it("leaves a sentence both sides rewrote between conflict markers and merges the rest", async () => {
    await conflict({
      [EXAMPLES]: [
        examples,
        examples.replace("Another row.", "Ours row.").replace("first edit", "first wording"),
        examples.replace("Another row.", "Theirs row."),
      ],
    });
    const result = await mergeDocs();
    const text = await read(EXAMPLES);
    expect(text).toContain("The row keeps the first wording.");
    expect(text).toContain(
      [
        "<<<<<<< ours",
        secondRow.replace("Another row.", "Ours row.").trimEnd(),
        "=======",
        secondRow.replace("Another row.", "Theirs row.").trimEnd(),
        ">>>>>>> theirs",
      ].join("\n"),
    );
    expect(result.stdout).toContain("1 conflict(s) left between markers");
    expect(result.code).toBe(1);
  });

  // QFAI:EX-0001-0238-07
  it("leaves a document one side deleted as it is and names it", async () => {
    await conflict({
      [EXAMPLES]: [examples, examples.replace("Another row.", "Ours row."), null],
    });
    const before = await read(EXAMPLES);
    const result = await mergeDocs();
    expect(result.stdout).toContain(`${EXAMPLES}: left as is; one side deleted it`);
    expect(await read(EXAMPLES)).toBe(before);
    expect(result.code).toBe(1);
  });

  // QFAI:EX-0001-0238-08
  it("reports a document-schema finding when the merged row holds a raw line break", async () => {
    await conflict({
      [EXAMPLES]: [
        examples,
        examples.replace("first edit", "first wording"),
        examples.replace("Another row. | It stays. |", "Another row. |\nIt stays. |"),
      ],
    });
    const result = await mergeDocs();
    expect(await read(EXAMPLES)).toContain("Another row. |\nIt stays. |");
    expect(result.stdout).toContain(`QFAI-DOCSCHEMA-001 ${EXAMPLES}:`);
    expect(result.code).toBe(1);
  });
});

describe("the shipped sdd triage reference", () => {
  it("points a conflicted story-tree merge at qfai sdd merge-docs before hand resolution", async () => {
    const triage = await readFile(
      path.join(getInitAssetsDir(), ".qfai/assistant/skill/qfai-sdd/references/sdd-triage.md"),
      "utf8",
    );
    expect(triage).toContain("run `npx qfai sdd merge-docs`");
    expect(triage).toContain("it stages nothing itself");
  });
});
