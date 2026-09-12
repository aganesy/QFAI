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
 * The prompt half is scoped smaller still: one of its sections states the
 * compliance contract and the rest of the file does not, so an edit elsewhere
 * in it owes the scanner nothing. The last group holds that boundary from both
 * sides.
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

/** The shape the real prompt has: one section states the contract, others do not. */
const SCOPE_HEADING = "## Hard constraints (enforced by the compliance gate)";
const PROMPT_WITH_SECTIONS = [
  "# Generator prompt",
  "",
  "## Read order",
  "",
  "1. The frozen design document.",
  "",
  SCOPE_HEADING,
  "",
  "- No color literal outside the design document.",
  "",
  "## Output layout",
  "",
  "- One file per screen.",
  "",
].join("\n");

describe("the prompt half is scoped to the section that states the contract", () => {
  beforeEach(async () => {
    await seed(PROMPT_REL, PROMPT_WITH_SECTIONS);
    await git("add", "-A");
    await git("commit", "-qm", "give the prompt its real section structure");
  });

  it("passes on an edit outside that section", async () => {
    // The case the whole-path pairing got wrong: an edit to the read order
    // demanded a scanner edit, and the only way to supply one is to touch the
    // scanner without a reason to.
    const edited = PROMPT_WITH_SECTIONS.replace(
      "1. The frozen design document.",
      "1. The frozen design document.\n2. The session record.",
    );

    expect(await commitAndRun(PROMPT_REL, edited)).not.toMatch(/R-PROMPT-SCANNER-DRIFT/);
  });

  it("fires on an edit inside that section", async () => {
    const edited = PROMPT_WITH_SECTIONS.replace(
      "- No color literal outside the design document.",
      "- No color literal outside the design document.\n- No font family either.",
    );

    expect(await commitAndRun(PROMPT_REL, edited)).toMatch(/R-PROMPT-SCANNER-DRIFT/);
  });

  it("passes when the section only moved down the file", async () => {
    // Compared as text rather than by line number, so content inserted above
    // the section does not read as a change to it.
    const edited = PROMPT_WITH_SECTIONS.replace(
      "## Read order",
      "## Preface\n\nSomething new.\n\n## Read order",
    );

    expect(await commitAndRun(PROMPT_REL, edited)).not.toMatch(/R-PROMPT-SCANNER-DRIFT/);
  });

  it("fires when the heading is gone, since the contract is then out of sight", async () => {
    const edited = PROMPT_WITH_SECTIONS.replace(SCOPE_HEADING, "## Constraints");

    expect(await commitAndRun(PROMPT_REL, edited)).toMatch(/R-PROMPT-SCANNER-DRIFT/);
  });

  it("still pairs an edit inside the section with a scanner edit", async () => {
    await seed(
      PROMPT_REL,
      PROMPT_WITH_SECTIONS.replace(
        "- No color literal outside the design document.",
        "- No color literal outside the design document.\n- No font family either.",
      ),
    );

    expect(
      await commitAndRun(SCANNER_REL, `${SCANNER_SEED}export const THIRD = "radius";\n`),
    ).not.toMatch(/R-PROMPT-SCANNER-DRIFT/);
  });
});
