/**
 * A pinned file carrying merge conflict markers is named as one.
 *
 * The repository already scans tracked files for markers, and the scan works.
 * It runs in `ci:lint`, which is a later step of the lint job than the byte
 * guard — and a job stops at its first failure. A conflict block changes a
 * pinned file's bytes like any other edit, so the byte guard fails first, calls
 * it a digest mismatch, and names resealing as the repair. Resealing succeeds,
 * the next run reaches the marker scan, and the cause is reported a CI round
 * later than it was known.
 *
 * One pinned path is worse than that. `.github/pinned-bytes.txt` is rewritten
 * from the tree rather than edited, so a conflict inside it is discarded by the
 * reseal with nothing left for any later check to read.
 *
 * Both refusals are held here, because they are one rule with two enforcement
 * points: the guard that runs first in CI, and the program its old message sent
 * the operator to.
 */
import { execFile } from "node:child_process";
import { appendFile, cp, mkdir, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DIGESTED_LANE_INPUTS_REL } from "../helpers/shippedWorkflowFixtures.js";
import { removeTempTree } from "../helpers/tempTree.js";

const execFileP = promisify(execFile);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const GUARD = "scripts/check-toolchain-action.sh";
const PIN = "scripts/pin-guard-bytes.mjs";
const LIST_REL = ".github/pinned-bytes.txt";

/** A pinned file that is data rather than code, so a textual merge conflicts in it often. */
const PINNED_DATA_REL = "scripts/dogfood-backlog.json";

let staged: string;

/** Everything both programs read. */
async function stageTree(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-pinned-conflict-"));
  await cp(path.join(repoRoot, ".github"), path.join(dir, ".github"), { recursive: true });
  for (const input of [...DIGESTED_LANE_INPUTS_REL, ".prettierrc.json"]) {
    await mkdir(path.dirname(path.join(dir, input)), { recursive: true });
    await cp(path.join(repoRoot, input), path.join(dir, input), { recursive: true });
  }
  return dir;
}

type Run = { status: number; output: string };

/** One field of the error `execFile` rejects with. */
function fieldOf(cause: unknown, key: "code" | "stdout" | "stderr"): unknown {
  return typeof cause === "object" && cause !== null && key in cause
    ? Reflect.get(cause, key)
    : undefined;
}

async function run(command: string, args: string[]): Promise<Run> {
  try {
    const { stdout, stderr } = await execFileP(command, args, { cwd: repoRoot });
    return { status: 0, output: `${stdout}${stderr}` };
  } catch (cause) {
    return {
      status: typeof fieldOf(cause, "code") === "number" ? Number(fieldOf(cause, "code")) : 1,
      output: `${String(fieldOf(cause, "stdout") ?? "")}${String(fieldOf(cause, "stderr") ?? "")}`,
    };
  }
}

const runGuard = (): Promise<Run> => run("bash", [path.join(repoRoot, GUARD), staged]);
const runPin = (): Promise<Run> =>
  run(process.execPath, [path.join(repoRoot, PIN), "--root", staged]);

/** Git's own marker, label and all. */
async function plantConflict(relative: string): Promise<void> {
  await appendFile(
    path.join(staged, relative),
    ["<<<<<<< HEAD", "ours", "=======", "theirs", ">>>>>>> origin/main", ""].join("\n"),
    "utf-8",
  );
}

beforeEach(async () => {
  staged = await stageTree();
});

afterEach(async () => {
  await removeTempTree(staged);
});

describe("the byte guard, on a pinned file carrying conflict markers", () => {
  it("names the unresolved merge rather than the digest, and refuses", async () => {
    await plantConflict(PINNED_DATA_REL);

    const result = await runGuard();

    expect(result.status).toBe(1);
    expect(result.output).toContain("merge conflict markers");
    expect(result.output).toContain(PINNED_DATA_REL);
    // The digest message would send the operator to the wrong repair.
    expect(result.output).not.toContain("does not match its digest");
  });

  it("says resealing is not the repair", async () => {
    // The old message's remedy. Following it here pins the conflict block as
    // the reviewed bytes, which is the failure this refusal exists to prevent.
    await plantConflict(PINNED_DATA_REL);

    const result = await runGuard();

    expect(result.output).toContain("Do NOT reseal");
  });

  it("reads the list's own path, which the list does not name", async () => {
    // `.github/pinned-bytes.txt` pins `.github/actions/**` and `scripts/**`,
    // never itself — its digest lives in the workflow step. A conflict in it is
    // the case with no later reader at all, so this check is the only one.
    const listed = await readFile(path.join(staged, LIST_REL), "utf-8");
    expect(listed).not.toContain(`  ${LIST_REL}`);

    await plantConflict(LIST_REL);
    const result = await runGuard();

    expect(result.status).toBe(1);
    expect(result.output).toContain(LIST_REL);
    expect(result.output).toContain("merge conflict markers");
  });

  it("passes a tree whose pinned files are clean", async () => {
    // The refusal has to be quiet on the ordinary case, or it replaces one
    // misleading failure with another.
    const result = await runGuard();

    expect(result.output).not.toContain("merge conflict markers");
  });
});

describe("the re-pin program, on a pinned file carrying conflict markers", () => {
  it("writes nothing and says why", async () => {
    await plantConflict(PINNED_DATA_REL);
    const before = await readFile(path.join(staged, LIST_REL), "utf-8");

    const result = await runPin();

    expect(result.status).toBe(1);
    expect(result.output).toContain("nothing was pinned");
    expect(result.output).toContain(PINNED_DATA_REL);
    expect(await readFile(path.join(staged, LIST_REL), "utf-8")).toBe(before);
  });

  it("refuses a conflict in the list it would otherwise overwrite", async () => {
    // Without this the reseal regenerates the list from the tree, so the
    // conflict block leaves the repository through a commit that reads as a
    // routine re-pin.
    await plantConflict(LIST_REL);

    const result = await runPin();

    expect(result.status).toBe(1);
    expect(result.output).toContain(LIST_REL);
    expect(await readFile(path.join(staged, LIST_REL), "utf-8")).toContain("<<<<<<< HEAD");
  });

  it("pins as before when nothing is conflicted", async () => {
    const result = await runPin();

    expect(result.status).toBe(0);
    expect(result.output).toContain("pinned");
    expect(result.output).not.toContain("nothing was pinned");
  });
});
