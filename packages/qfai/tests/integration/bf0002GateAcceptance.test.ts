/**
 * Acceptance tests for two repository gates the pull request workflow relies on:
 * the pack-location lane and the shape table that tells a contributor what the
 * distributed-surface guards reject.
 *
 * The lane is run as a child process, the way `pnpm ci:lint` reaches it. The shape
 * table is read from the rule file and every example it lists is put through the
 * same scan the smoke test applies to a shipped tree.
 */
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { scanDistributedSurface } from "../helpers/distributedSurfaceScan.js";
import { removeTempTree } from "../helpers/tempTree.js";
import { isRecord, REPO_ROOT } from "../scripts/helpers/hygieneTree.js";

const execFileP = promisify(execFile);

const PACK_LANE = path.join(REPO_ROOT, "packages", "qfai", "scripts", "check-pack-locations.mjs");
const SHAPE_RULE = path.join(REPO_ROOT, ".agents", "rules", "distributed-surface.local.md");

interface LaneRun {
  code: number;
  output: string;
}

/** Runs the pack-location lane over an explicit change list from `cwd`. */
async function runPackLane(cwd: string, changed: string[]): Promise<LaneRun> {
  try {
    const result = await execFileP(process.execPath, [PACK_LANE, "--changed", changed.join(",")], {
      cwd,
    });
    return { code: 0, output: `${result.stdout}${result.stderr}` };
  } catch (error: unknown) {
    if (!isRecord(error)) throw error;
    const { code, stdout, stderr } = error;
    return {
      code: typeof code === "number" ? code : -1,
      output: `${typeof stdout === "string" ? stdout : ""}${typeof stderr === "string" ? stderr : ""}`,
    };
  }
}

async function packageScripts(manifest: string): Promise<Record<string, string>> {
  const parsed: unknown = JSON.parse(await readFile(manifest, "utf8"));
  const scripts = isRecord(parsed) ? parsed["scripts"] : undefined;
  if (!isRecord(scripts)) throw new Error(`${manifest} declares no scripts`);
  const entries: Record<string, string> = {};
  for (const [name, value] of Object.entries(scripts)) {
    if (typeof value === "string") entries[name] = value;
  }
  return entries;
}

/** The lane is reachable from `pnpm ci:lint` through the scan script that names it. */
async function expectLaneWiredIntoLint(): Promise<void> {
  const scripts = await packageScripts(path.join(REPO_ROOT, "package.json"));
  expect(scripts["ci:lint"]).toContain("run-lint-checks.sh");
  const runner = await readFile(path.join(REPO_ROOT, "scripts", "run-lint-checks.sh"), "utf8");
  expect(runner).toContain("pnpm ci:lint:scans");
  expect(scripts["ci:lint:scans"]).toContain("check-pack-locations.mjs");
}

describe("BF-0002 pack-location lane", () => {
  // QFAI:AC-0002-0011-01
  it("fails a pack directory outside the allowed roots, cites the rule and proposes the allowed root", async () => {
    await expectLaneWiredIntoLint();
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qfai-bf2-pack-lane-"));
    try {
      const misplaced = await runPackLane(cwd, ["discussion-2026-05-27/PLAN.md"]);
      expect(misplaced.code).toBe(1);
      expect(misplaced.output).toContain("R-PACK-LOCATION-DRIFT");
      expect(misplaced.output).toContain(".agents/rules/root-additions-policy.md");
      expect(misplaced.output).toContain(".qfai/discussion/discussion-2026-05-27/");

      const review = await runPackLane(cwd, ["review-2026-05-27/PLAN.md"]);
      expect(review.code).toBe(1);
      expect(review.output).toContain(".qfai/review/review-2026-05-27/");
    } finally {
      await removeTempTree(cwd);
    }
  });

  // QFAI:AC-0002-0011-02
  it("passes silently for packs under the allowed roots and does not re-flag an untouched legacy pack", async () => {
    await expectLaneWiredIntoLint();
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qfai-bf2-pack-lane-"));
    try {
      await mkdir(path.join(cwd, "review-old"), { recursive: true });
      await writeFile(path.join(cwd, "review-old", "stale.md"), "legacy pack\n", "utf8");

      const allowed = await runPackLane(cwd, [
        ".qfai/discussion/discussion-20260527075558258/index.md",
        "tmp/discussion-scratch/notes.md",
        "README.md",
      ]);
      expect(allowed.code).toBe(0);
      expect(allowed.output).not.toContain("R-PACK-LOCATION-DRIFT");

      const unrelated = await runPackLane(cwd, ["docs/guide.md"]);
      expect(unrelated.code).toBe(0);
      expect(unrelated.output).not.toContain("R-PACK-LOCATION-DRIFT");
      expect(unrelated.output).not.toContain("review-old");

      const untouched = await runPackLane(cwd, []);
      expect(untouched.code).toBe(0);
      expect(untouched.output).not.toContain("R-PACK-LOCATION-DRIFT");
    } finally {
      await removeTempTree(cwd);
    }
  });
});

interface ShapeRow {
  kind: string;
  shapes: string[];
  examples: string[];
}

/** Every backtick-quoted token of a table cell. */
function quoted(cell: string): string[] {
  return [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "");
}

/** The rows of the table that lists the shapes the guards reject. */
function shapeRows(markdown: string): ShapeRow[] {
  const start = markdown.indexOf("## The shapes that must not appear");
  const end = markdown.indexOf("### Three exceptions");
  if (start < 0 || end < start) throw new Error("the shape table section is missing");
  const rows: ShapeRow[] = [];
  for (const line of markdown.slice(start, end).split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    const [kind, shape, example] = cells;
    if (cells.length !== 3 || kind === undefined || shape === undefined || example === undefined) {
      continue;
    }
    if (kind === "Kind" || /^-+$/.test(kind)) continue;
    rows.push({ kind, shapes: quoted(shape), examples: quoted(example) });
  }
  return rows;
}

/** The story-tree shapes the guards were taught, one row each. */
const STORY_TREE_SHAPES = [
  "DEC-NNNN",
  "OQ-NNNN",
  "BF-NNNN",
  "US-NNNN-NNNN",
  "AC-NNNN-NNNN-NN",
  "EX-NNNN-NNNN-NN",
  "BR-NNNN",
];

/** The shapes the table listed before the story-tree rows were added. */
const EARLIER_SHAPES = [
  "spec-0010",
  "CAP-0010",
  "DEC-NNNN-NNNN",
  "DR-NNNN",
  "OQ-NNNN-NNNN",
  "CHG-NNN",
  "QFAI-PROT2-NNN",
  "vN.M",
  '"schemaVersion"',
];

describe("BF-0002 distributed-surface shape table", () => {
  // QFAI:AC-0002-0023-01
  // QFAI:EX-0002-0023-01
  it("lists every story-tree shape and the sample band, and each example it gives is rejected by the guard patterns", async () => {
    const markdown = await readFile(SHAPE_RULE, "utf8");
    const rows = shapeRows(markdown);

    for (const shape of [...STORY_TREE_SHAPES, ...EARLIER_SHAPES]) {
      const holding = rows.filter((row) => row.shapes.includes(shape));
      expect(
        holding.map((row) => row.kind),
        `rows listing ${shape}`,
      ).toHaveLength(1);
    }

    const flat = markdown.replace(/\s+/g, " ");
    expect(flat).toContain(
      "every four-digit segment is `0001` to `0009` and every two-digit tail is `01` to `09`",
    );

    const examples = rows.flatMap((row) => row.examples);
    expect(examples.length).toBeGreaterThanOrEqual(STORY_TREE_SHAPES.length);
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-bf2-shape-table-"));
    try {
      await writeFile(path.join(dir, "examples.md"), `${examples.join("\n")}\n`, "utf8");
      const scan = await scanDistributedSurface(dir);
      const flaggedLines = new Set(scan.hits.map((hit) => hit.line));
      const unflagged = examples.filter((_, index) => !flaggedLines.has(index + 1));
      expect(unflagged, "table examples the guard patterns do not reject").toEqual([]);
    } finally {
      await removeTempTree(dir);
    }
  });
});
