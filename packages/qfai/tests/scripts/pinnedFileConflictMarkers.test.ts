/**
 * A pinned file carrying merge conflict markers is refused as a conflict, before
 * any digest is compared or written, by the byte guard and by the program that
 * reseals the digests. Both read markers as the tracked-file scan does, so a
 * fenced example in a Markdown file is not one.
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

/** Everything both programs read. A copy that fails part-way is removed before the error surfaces. */
async function stageTree(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-pinned-conflict-"));
  try {
    await cp(path.join(repoRoot, ".github"), path.join(dir, ".github"), { recursive: true });
    for (const input of [...DIGESTED_LANE_INPUTS_REL, ".prettierrc.json"]) {
      await mkdir(path.dirname(path.join(dir, input)), { recursive: true });
      await cp(path.join(repoRoot, input), path.join(dir, input), { recursive: true });
    }
  } catch (cause) {
    await removeTempTree(dir);
    throw cause;
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
  staged = "";
  staged = await stageTree();
});

afterEach(async () => {
  if (staged !== "") await removeTempTree(staged);
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
    // Resealing would pin the conflict block as the reviewed bytes.
    await plantConflict(PINNED_DATA_REL);

    const result = await runGuard();

    expect(result.output).toContain("do not reseal");
  });

  it("reads the list's own path, which the list does not name", async () => {
    // The list's digest lives in the workflow step, so the list is not among its own entries.
    const listed = await readFile(path.join(staged, LIST_REL), "utf-8");
    expect(listed).not.toContain(`  ${LIST_REL}`);

    await plantConflict(LIST_REL);
    const result = await runGuard();

    expect(result.status).toBe(1);
    expect(result.output).toContain(LIST_REL);
    expect(result.output).toContain("merge conflict markers");
  });

  it("passes a tree whose pinned files are clean", async () => {
    const result = await runGuard();

    expect(result.status).toBe(0);
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
    await plantConflict(LIST_REL);

    const result = await runPin();

    expect(result.status).toBe(1);
    expect(result.output).toContain(LIST_REL);
    expect(await readFile(path.join(staged, LIST_REL), "utf-8")).toContain("<<<<<<< HEAD");
  });

  it("refuses a conflict in a list only the workflow pins", async () => {
    // `command-files.txt` is sealed into the workflow step, not into the list.
    await plantConflict(".github/command-files.txt");
    const workflowBefore = await readFile(path.join(staged, ".github/workflows/ci.yml"), "utf-8");

    const result = await runPin();

    expect(result.status).toBe(1);
    expect(result.output).toContain(".github/command-files.txt");
    expect(await readFile(path.join(staged, ".github/workflows/ci.yml"), "utf-8")).toBe(
      workflowBefore,
    );
  });

  it("pins as before when nothing is conflicted", async () => {
    const result = await runPin();

    expect(result.status).toBe(0);
    expect(result.output).toContain("pinned");
    expect(result.output).not.toContain("nothing was pinned");
  });
});

describe("a fenced example in a pinned Markdown file", () => {
  it("is not a conflict to either program", async () => {
    const example = "scripts/conflict-example.md";
    await appendFile(
      path.join(staged, example),
      [
        "# Resolving a conflict",
        "",
        "```text",
        "<<<<<<< HEAD",
        "ours",
        "=======",
        "theirs",
        ">>>>>>> origin/main",
        "```",
        "",
      ].join("\n"),
      "utf-8",
    );

    const pinned = await runPin();
    expect(pinned.status).toBe(0);
    expect(pinned.output).not.toContain("nothing was pinned");

    const guarded = await runGuard();
    expect(guarded.status).toBe(0);
    expect(guarded.output).not.toContain("merge conflict markers");
  });

  it("is a conflict to both once it sits outside the fence", async () => {
    const example = "scripts/conflict-example.md";
    await appendFile(path.join(staged, example), "# Notes\n\n", "utf-8");
    await plantConflict(example);

    const pinned = await runPin();
    expect(pinned.status).toBe(1);
    expect(pinned.output).toContain(example);
  });
});

describe("the lint job's pre-flight step", () => {
  it("scans the workflow-pinned inputs before it checks their digests", async () => {
    // The step stops at its first failing command, so a digest check ahead of the
    // scan reports a conflict in these inputs as a mismatch and the scan never runs.
    const workflow = await readFile(path.join(repoRoot, ".github/workflows/ci.yml"), "utf-8");
    const lines = workflow.split("\n");
    const scan = lines.findIndex(
      (line) => line.includes("grep -lE") && line.includes(".github/command-files.txt"),
    );
    const digests = lines.findIndex((line) =>
      line.includes("sha256sum -c --quiet <<'PINNED_INPUTS'"),
    );

    expect(scan).toBeGreaterThan(-1);
    expect(scan).toBeLessThan(digests);
    for (const input of [
      "scripts/check-toolchain-action.sh",
      ".github/pinned-bytes.txt",
      ".github/lifecycle-manifests.txt",
      ".github/command-files.txt",
    ]) {
      expect(lines[scan]).toContain(input);
    }
  });
});
