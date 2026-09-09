/**
 * The pair-drift lane scopes itself by changed text, not changed bytes.
 *
 * The lane asks whether a branch changed the prompt or the scanner without the
 * other half. `git diff --name-only` answers a different question: it selects
 * by blob identity and ignores the whitespace flags, so a commit that
 * re-normalises line endings across the tree lists whichever half it touched
 * and the lane asks for a pairing edit nobody owes. `--numstat` with
 * `--ignore-cr-at-eol` answers the question that was asked.
 *
 * The flag is narrow on purpose. `--ignore-all-space` would also hide an
 * indentation change, and indentation carries meaning in the Markdown half of
 * this pair.
 *
 * The lane's other tests hand it a path list through `--changed`, which is the
 * shape a fixture can build without a repository. That leaves the git half —
 * the half CI actually runs — with nothing holding it, so these cases go
 * through a real repository and a real base ref.
 */
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { failureOf } from "../../helpers/childFailure.js";
import { removeTempTree } from "../../helpers/tempTree.js";

const execFileP = promisify(execFile);

const CHECK_SCRIPT = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "scripts",
  "check-prompt-scanner-pair.mjs",
);

const SCANNER_REL = "packages/qfai/src/core/prototyping/designMdViolations.ts";
const PROMPT_REL =
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/generator-prompt.md";

/** Two lines each, so a rewrite has something to re-terminate. */
const SCANNER_SEED = 'export const KIND = "color";\nexport const OTHER = "font";\n';
const PROMPT_SEED = "# Generator prompt\n\n- No color literal outside the design document.\n";

let repo: string;

async function git(...args: string[]): Promise<void> {
  await execFileP("git", args, { cwd: repo });
}

async function seed(rel: string, text: string): Promise<void> {
  const abs = path.join(repo, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, text, "utf-8");
}

/** Writes the half, commits it, and runs the lane against the commit before. */
async function commitAndRun(rel: string, text: string): Promise<string> {
  await seed(rel, text);
  await git("add", "-A");
  await git("commit", "-qm", "the change under test");
  try {
    const r = await execFileP(process.execPath, [CHECK_SCRIPT, "--base", "HEAD~1"], { cwd: repo });
    return r.stdout + r.stderr;
  } catch (err: unknown) {
    return failureOf(err).output;
  }
}

beforeEach(async () => {
  repo = await mkdtemp(path.join(os.tmpdir(), "qfai-pair-text-scope-"));
  await git("init", "-q", ".");
  await git("config", "user.email", "test@example.invalid");
  await git("config", "user.name", "test");
  // Pin the line-ending policy so the fixture's CRLF is the file's own, not
  // something the checkout rewrote.
  await git("config", "core.autocrlf", "false");
  await seed(SCANNER_REL, SCANNER_SEED);
  await seed(PROMPT_REL, PROMPT_SEED);
  await git("add", "-A");
  await git("commit", "-qm", "seed both halves of the pair");
});

afterEach(async () => {
  await removeTempTree(repo);
});

describe("a rewrite that moves bytes and not text", () => {
  it("leaves the prompt out of scope when only its line endings changed", async () => {
    const crlf = PROMPT_SEED.replace(/\n/g, "\r\n");

    expect(await commitAndRun(PROMPT_REL, crlf)).not.toMatch(/R-PROMPT-SCANNER-DRIFT/);
  });

  it("leaves the scanner out of scope when only its line endings changed", async () => {
    const crlf = SCANNER_SEED.replace(/\n/g, "\r\n");

    expect(await commitAndRun(SCANNER_REL, crlf)).not.toMatch(/R-PROMPT-SCANNER-DRIFT/);
  });
});

describe("a rewrite that moves text", () => {
  it("keeps an indentation-only change in scope, since indentation means something", async () => {
    const indented = PROMPT_SEED.replace("- No color literal", "  - No color literal");

    expect(await commitAndRun(PROMPT_REL, indented)).toMatch(/R-PROMPT-SCANNER-DRIFT/);
  });

  it("keeps an ordinary edit to one half in scope", async () => {
    const edited = `${PROMPT_SEED}- No font family outside the design document.\n`;

    expect(await commitAndRun(PROMPT_REL, edited)).toMatch(/R-PROMPT-SCANNER-DRIFT/);
  });
});

describe("a change that carries both halves", () => {
  it("passes, because the pair moved together", async () => {
    await seed(PROMPT_REL, `${PROMPT_SEED}- No font family outside the design document.\n`);

    expect(
      await commitAndRun(SCANNER_REL, `${SCANNER_SEED}export const THIRD = "radius";\n`),
    ).not.toMatch(/R-PROMPT-SCANNER-DRIFT/);
  });
});
