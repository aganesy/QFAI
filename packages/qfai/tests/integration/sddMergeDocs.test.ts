// QFAI:AC-0001-0238-01
// QFAI:AC-0001-0238-02
// QFAI:AC-0001-0238-03
// QFAI:AC-0001-0238-04

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { run } from "../../src/cli/main.js";
import type * as DocumentSchema from "../../src/core/validators/documentSchema.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { removeTempTree } from "../helpers/tempTree.js";

const schema = vi.hoisted(() => ({ unavailable: false }));

// The shipped checker cannot be made to fail from a fixture, so one test withholds it.
vi.mock("../../src/core/validators/documentSchema.js", async (importOriginal) => {
  const original = await importOriginal<typeof DocumentSchema>();
  return {
    ...original,
    validateDocumentSchema: (...args: Parameters<typeof original.validateDocumentSchema>) =>
      schema.unavailable
        ? Promise.resolve(
            original.documentSchemaIssues(
              { ok: false, reason: "the checker was withheld" },
              args[0],
              path.join(args[0], ".qfai", "spec"),
            ),
          )
        : original.validateDocumentSchema(...args),
  };
});

const EXAMPLES =
  ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md";
const CONTRACT = ".qfai/spec/03_contract/cli/cli-0001-sample.md";

const exampleHead =
  "# Examples\n\n## Examples\n\n| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n";
const firstRow =
  "| EX-0001-0001-01 | AC-0001-0001-01 | Two sides edit one row. | The row keeps the first edit. It keeps the second edit. |\n";
const secondRow = "| EX-0001-0001-02 | AC-0001-0001-01 | Another row. | It stays. |\n";
const examples = exampleHead + firstRow + secondRow;
const bothEdits = examples
  .replace("first edit", "first wording")
  .replace("second edit. |", "second edit. It adds a clause. |");

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

function crlf(text: string): string {
  return text.replace(/\n/g, "\r\n");
}

let root: string;

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

function unmerged(): string {
  return git("ls-files", "-u");
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

/**
 * Commits each file's base, then ours on main and theirs on a branch, and merges the branch. The
 * branch is not named `theirs`, so Git's markers differ from the ones merge-docs writes.
 */
async function conflict(
  files: Record<string, [string, string | null, string | null]>,
): Promise<void> {
  for (const [file, [base]] of Object.entries(files)) await put(file, base);
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  git("checkout", "-q", "-b", "topic");
  for (const [file, [, , theirs]] of Object.entries(files)) await put(file, theirs);
  git("add", "-A");
  git("commit", "-q", "-m", "theirs");
  git("checkout", "-q", "main");
  for (const [file, [, ours]] of Object.entries(files)) await put(file, ours);
  git("add", "-A");
  git("commit", "-q", "-m", "ours");
  expect(() => git("merge", "-q", "--no-edit", "topic")).toThrow();
}

/** Both sides rewrite the same sentence of the second row. */
function sameSentence(text = examples): Promise<void> {
  return conflict({
    [EXAMPLES]: [
      text,
      text.replace("Another row.", "Ours row."),
      text.replace("Another row.", "Theirs row."),
    ],
  });
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
  schema.unavailable = false;
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
    expect(await read(EXAMPLES)).toBe(bothEdits);
    expect(unmerged()).toContain(EXAMPLES);
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
    await sameSentence();
    const resolved = examples.replace("Another row.", "Resolved by hand.");
    await put(EXAMPLES, resolved);
    const result = await mergeDocs();
    expect(await read(EXAMPLES)).toBe(resolved);
    expect(result.stdout).toContain(
      `${EXAMPLES}: left as is; the working file holds no conflict markers`,
    );
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
    expect(result.stdout).toContain("1 conflict(s), left between markers");
    expect(unmerged()).toContain(EXAMPLES);
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

  // QFAI:EX-0001-0238-09
  it("merges a CRLF document and keeps its CRLF line ends", async () => {
    await conflict({
      [EXAMPLES]: [
        crlf(examples),
        crlf(examples.replace("first edit", "first wording")),
        crlf(examples.replace("second edit. |", "second edit. It adds a clause. |")),
      ],
    });
    const result = await mergeDocs();
    expect(await read(EXAMPLES)).toBe(crlf(bothEdits));
    expect(result.code).toBe(0);
  });

  // QFAI:EX-0001-0238-10
  it("leaves a sentence both sides rewrote in a CRLF document between conflict markers", async () => {
    await sameSentence(crlf(examples));
    const result = await mergeDocs();
    const text = await read(EXAMPLES);
    expect(text).toContain("\r\n<<<<<<< ours\r\n");
    expect(text).toContain("\r\n>>>>>>> theirs\r\n");
    expect(result.stdout).not.toContain(`${EXAMPLES}: merged\n`);
    expect(result.code).toBe(1);
  });

  // QFAI:EX-0001-0238-11
  it("leaves a document an earlier run or a person already edited unchanged", async () => {
    await sameSentence();
    const gitOutput = await read(EXAMPLES);
    const handFixed = gitOutput.replace("Two sides edit one row.", "Fixed by hand.");
    await put(EXAMPLES, handFixed);
    const edited = await mergeDocs();
    expect(edited.stdout).toContain("does not match Git's conflict output for its stages");
    expect(await read(EXAMPLES)).toBe(handFixed);
    expect(edited.code).toBe(1);

    await put(EXAMPLES, gitOutput);
    expect((await mergeDocs()).code).toBe(1);
    const firstRun = await read(EXAMPLES);
    const rerun = await mergeDocs();
    expect(rerun.stdout).toContain("markers of an earlier merge-docs run");
    expect(await read(EXAMPLES)).toBe(firstRun);
    expect(rerun.code).toBe(1);
  });

  // QFAI:EX-0001-0238-16
  it("leaves a half-resolved file whose closing marker remains as it is", async () => {
    await sameSentence();
    const halfResolved = (await read(EXAMPLES)).replace(/^<<<<<<< .*\n/mu, "");
    expect(halfResolved).not.toMatch(/^<{7}/mu);
    await put(EXAMPLES, halfResolved);
    const result = await mergeDocs();
    expect(result.stdout).toContain(`${EXAMPLES}: left as is; the working file does not match`);
    expect(result.stdout).not.toContain("holds no conflict markers");
    expect(await read(EXAMPLES)).toBe(halfResolved);
    expect(result.code).toBe(1);
  });

  // QFAI:EX-0001-0238-12
  it("leaves a document holding a line that reads as a merge marker as it is", async () => {
    await sameSentence(`${examples}\n=======\n`);
    const before = await read(EXAMPLES);
    const result = await mergeDocs();
    expect(result.stdout).toContain(
      `${EXAMPLES}: left as is; a line in it reads as a merge marker`,
    );
    expect(await read(EXAMPLES)).toBe(before);
    expect(result.code).toBe(1);
  });

  // QFAI:EX-0001-0238-13
  it("reports a document-schema check that could not run and exits 1", async () => {
    await conflict({
      [EXAMPLES]: [
        examples,
        examples.replace("first edit", "first wording"),
        examples.replace("second edit. |", "second edit. It adds a clause. |"),
      ],
    });
    schema.unavailable = true;
    const result = await mergeDocs();
    expect(await read(EXAMPLES)).toBe(bothEdits);
    expect(result.stdout).toContain("QFAI-DOCSCHEMA-002");
    expect(result.stdout).toContain("document-schema check: did not run");
    expect(result.code).toBe(1);
  });

  // QFAI:EX-0001-0238-14
  it("exits 2 outside a Git work tree", async () => {
    const inside = root;
    root = await mkdtemp(path.join(os.tmpdir(), "qfai-merge-docs-outside-"));
    try {
      await put("qfai.config.yaml", "paths:\n  specsDir: .qfai/spec\n");
      expect((await mergeDocs()).code).toBe(2);
    } finally {
      await removeTempTree(root);
      root = inside;
    }
  });

  // QFAI:EX-0001-0238-15
  it("exits 2 and writes nothing when the configuration has issues", async () => {
    await sameSentence();
    const before = await read(EXAMPLES);
    await put("qfai.config.yaml", "paths: [\n");
    const result = await mergeDocs();
    expect(result.stdout).toContain("qfai.config.yaml");
    expect(await read(EXAMPLES)).toBe(before);
    expect(result.code).toBe(2);
  });
});

describe("the shipped sdd triage reference", () => {
  it("points a conflicted story-tree merge at qfai sdd merge-docs before hand resolution", async () => {
    const triage = await readFile(
      path.join(getInitAssetsDir(), ".qfai/assistant/skill/qfai-sdd/references/sdd-triage.md"),
      "utf8",
    );
    expect(triage).toContain("## Conflicted story-tree documents");
    expect(triage).toContain("run `npx qfai sdd merge-docs`");
    expect(triage).toContain("it stages nothing itself");
  });
});
