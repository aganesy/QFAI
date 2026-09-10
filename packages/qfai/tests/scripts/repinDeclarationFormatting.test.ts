/**
 * The re-pin scripts write a declaration `format:check` accepts.
 *
 * `.github/required-status-contexts.json` is rewritten by two programs, and the dependency-update
 * job runs both and pushes the result. So whatever shape they write is the shape that arrives on a
 * pull request, and `format:check` is the first lane in `ci:lint`.
 *
 * `JSON.stringify(value, null, 2)` is not that shape: it puts every array element on its own line
 * where Prettier keeps a short array on one. The disagreement is entirely whitespace, which is why
 * it survived — the digests were right, the hygiene lane passed, and the lane that rejected the
 * file was a different one.
 *
 * Staged rather than run against the repository, because the scripts write four files and a test
 * must not edit the tree it is checking. `.prettierrc.json` is staged with the rest: `printWidth`
 * is 100 here and 80 by default, and a run that resolved no configuration would be checking a
 * formatting rule this repository does not use.
 */
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import * as prettier from "prettier";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DIGESTED_LANE_INPUTS_REL } from "../helpers/shippedWorkflowFixtures.js";
import { removeTempTree } from "../helpers/tempTree.js";

const execFileP = promisify(execFile);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const DECLARATION_REL = ".github/required-status-contexts.json";

/** The two, in the order the dependency-update job runs them. */
const REPIN_SCRIPTS = ["scripts/pin-guard-bytes.mjs", "scripts/pin-verification-bodies.mjs"];

let staged: string;

/** Everything the two scripts read, plus the formatting rules they are held to. */
async function stageTree(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-repin-format-"));
  await cp(path.join(repoRoot, ".github"), path.join(dir, ".github"), { recursive: true });
  for (const input of [...DIGESTED_LANE_INPUTS_REL, ".prettierrc.json"]) {
    await mkdir(path.dirname(path.join(dir, input)), { recursive: true });
    await cp(path.join(repoRoot, input), path.join(dir, input), { recursive: true });
  }
  return dir;
}

/**
 * The repository's own copy of the script, pointed at the staged tree through `--root`.
 *
 * That is how the dependency-update job runs it — from a checkout whose dependencies are
 * installed. A staged tree carries no `node_modules`, so a copy executed from inside it could not
 * resolve the formatter at all.
 */
async function runRepin(script: string): Promise<void> {
  await execFileP(process.execPath, [path.join(repoRoot, script), "--root", staged], {
    cwd: repoRoot,
  });
}

async function declarationText(): Promise<string> {
  return readFile(path.join(staged, DECLARATION_REL), "utf-8");
}

/** The same question `format:check` asks, against the same configuration. */
async function isFormatted(text: string): Promise<boolean> {
  const file = path.join(staged, DECLARATION_REL);
  const options = await prettier.resolveConfig(file);
  return prettier.check(text, { ...(options ?? {}), filepath: file });
}

beforeEach(async () => {
  staged = await stageTree();
});

afterEach(async () => {
  await removeTempTree(staged);
});

describe("the re-pin scripts", () => {
  it("leave the declaration formatted, after each one and after both", async () => {
    // Each on its own, because the job runs them in sequence and either can be the last writer
    // on a branch whose other half had nothing to change.
    for (const script of REPIN_SCRIPTS) {
      await runRepin(script);
      expect(
        await isFormatted(await declarationText()),
        `${script} wrote an unformatted file`,
      ).toBe(true);
    }
  });

  it("correct a stale digest, and leave the correction formatted", async () => {
    // The staged tree is already correctly pinned, so every row above would also pass on a script
    // that wrote nothing at all. Staling one digest gives the run something to change, which is
    // what makes "the file it wrote is formatted" a claim about a write.
    const file = path.join(staged, DECLARATION_REL);
    const stale = JSON.parse(await declarationText());
    const pinned: Record<string, string> = stale.contexts[0].pinnedBytes;
    const victim = Object.keys(pinned)[0] ?? "";
    pinned[victim] = "0".repeat(64);
    await writeFile(file, JSON.stringify(stale, null, 2), "utf-8");

    await runRepin(REPIN_SCRIPTS[0] ?? "");

    const written = await declarationText();
    expect(JSON.parse(written).contexts[0].pinnedBytes[victim]).not.toBe("0".repeat(64));
    expect(await isFormatted(written)).toBe(true);
  });

  it("reach the same text twice, so a re-run adds no diff", async () => {
    for (const script of REPIN_SCRIPTS) await runRepin(script);
    const once = await declarationText();

    for (const script of REPIN_SCRIPTS) await runRepin(script);

    expect(await declarationText()).toBe(once);
  });
});
