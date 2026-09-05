/**
 * Spawn-based tests for `scripts/check-mermaid.mjs`.
 *
 * The lane's contract:
 *   - every Mermaid block parses                     -> exit 0
 *   - any block Mermaid refuses                      -> exit 1, naming file:line
 *   - a ```mermaid nested inside a wider fence       -> not a diagram
 *   - `<!-- mermaid-lint:ignore -->` above a fence   -> that block is skipped
 *   - unknown flag / unreadable path                 -> exit 2
 *
 * Spawned rather than imported: the exit code is half the contract, and a lane
 * that reports failures on stdout while exiting 0 is the failure mode a CI check
 * exists to prevent. `extractMermaidBlocks` is imported separately for the fence
 * cases, where the question is which blocks were SEEN rather than what Mermaid
 * said about them — that one needs no Mermaid boot at all.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

// @ts-expect-error -- a plain .mjs guard with no type declarations
import { extractMermaidBlocks } from "../../../../scripts/check-mermaid.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts -> tests -> packages/qfai -> packages -> repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/check-mermaid.mjs");

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runLane(args: string[]): RunResult {
  const child = spawnSync("node", [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    // Mermaid boots a jsdom window and registers every diagram type, which is
    // slower than a plain module import but still far below this bound.
    timeout: 120_000,
  });
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-mermaid-lane-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

const GOOD_DIAGRAM = ["```mermaid", "flowchart TD", "  A[Start] --> B[End]", "```"].join("\n");

const BROKEN_DIAGRAM = ["```mermaid", "flowchart TD", "  A[Start] -->--> B{{{oops", "```"].join(
  "\n",
);

describe("check-mermaid lane", () => {
  it("exits 0 and counts the diagrams when every block parses", async () => {
    const dir = await newTempDir();
    await writeFile(path.join(dir, "ok.md"), `# Fine\n\n${GOOD_DIAGRAM}\n`, "utf-8");

    const result = runLane([dir]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1 diagram(s) parsed");
  });

  it("exits 1 and names the file and the opening fence line for a broken diagram", async () => {
    const dir = await newTempDir();
    // Two leading lines, so a report that guessed line 1 would pass by accident.
    await writeFile(path.join(dir, "broken.md"), `# Broken\n\n${BROKEN_DIAGRAM}\n`, "utf-8");

    const result = runLane([dir]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("broken.md:3");
    expect(result.stderr).toContain("1 of 1 diagram(s) failed to parse");
  });

  it("reports every broken diagram rather than stopping at the first", async () => {
    const dir = await newTempDir();
    await writeFile(path.join(dir, "a.md"), `# A\n\n${BROKEN_DIAGRAM}\n`, "utf-8");
    await writeFile(path.join(dir, "b.md"), `# B\n\n${BROKEN_DIAGRAM}\n`, "utf-8");

    const result = runLane([dir]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("a.md:3");
    expect(result.stderr).toContain("b.md:3");
    expect(result.stderr).toContain("2 of 2 diagram(s) failed to parse");
  });

  it("skips a block marked with the ignore comment", async () => {
    const dir = await newTempDir();
    await writeFile(
      path.join(dir, "template.md"),
      `# Template\n\n<!-- mermaid-lint:ignore -->\n${BROKEN_DIAGRAM}\n`,
      "utf-8",
    );

    const result = runLane([dir]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no Mermaid diagrams found");
  });

  it("exits 2 on an unknown flag rather than silently scanning nothing", () => {
    const result = runLane(["--no-such-flag"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown flag");
  });

  it("exits 2 when a named path does not exist", async () => {
    const dir = await newTempDir();

    const result = runLane([path.join(dir, "absent")]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("cannot read");
  });

  it("counts one diagram when the same file is named twice", async () => {
    const dir = await newTempDir();
    const file = path.join(dir, "ok.md");
    await writeFile(file, `# Fine\n\n${GOOD_DIAGRAM}\n`, "utf-8");

    const result = runLane([file, file]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1 diagram(s) parsed");
  });
});

describe("check-mermaid fence scanning", () => {
  it("finds a plain block and reports its opening fence line", () => {
    const blocks = extractMermaidBlocks(`# Title\n\n${GOOD_DIAGRAM}\n`);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].line).toBe(3);
    expect(blocks[0].body).toContain("flowchart TD");
  });

  it("does not treat a nested ```mermaid as a diagram", () => {
    // A wider fence around it: this is documentation ABOUT Mermaid, which the
    // assistant templates contain, and its body is not a diagram to validate.
    const source = [
      "# Documenting the syntax",
      "",
      "````markdown",
      "```mermaid",
      "this is prose -> -> not a diagram",
      "```",
      "````",
      "",
    ].join("\n");

    expect(extractMermaidBlocks(source)).toHaveLength(0);
  });

  it("keeps a shorter run of the fence character as diagram content", () => {
    // A ``` inside a ```` block closes nothing; ending the block there would cut
    // the diagram in half and report a parse error against a body nobody wrote.
    const source = ["````mermaid", "flowchart TD", "```", "  A --> B", "````", ""].join("\n");

    const blocks = extractMermaidBlocks(source);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].body).toContain("A --> B");
  });

  it("reads an unterminated fence to end of document", () => {
    // What CommonMark says and what GitHub renders. Dropping it would hide a
    // real diagram from the lane.
    const source = ["# Title", "", "```mermaid", "flowchart TD", "  A --> B", ""].join("\n");

    const blocks = extractMermaidBlocks(source);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].body).toContain("A --> B");
  });

  it("marks a block whose preceding line is the ignore comment", () => {
    const source = ["<!-- mermaid-lint:ignore -->", "```mermaid", "flowchart TD", "```", ""].join(
      "\n",
    );

    const blocks = extractMermaidBlocks(source);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].ignored).toBe(true);
  });

  it("does not let an ignore comment two lines up cover the block", () => {
    // Per-block and adjacent, so a marker cannot drift onto a diagram somebody
    // adds beneath the one it was written for.
    const source = [
      "<!-- mermaid-lint:ignore -->",
      "",
      "```mermaid",
      "flowchart TD",
      "```",
      "",
    ].join("\n");

    expect(extractMermaidBlocks(source)[0].ignored).toBe(false);
  });

  it("recognises the mmd info string as well as mermaid", () => {
    const source = ["```mmd", "flowchart TD", "  A --> B", "```", ""].join("\n");

    expect(extractMermaidBlocks(source)).toHaveLength(1);
  });

  it("ignores a fence whose info string is another language", () => {
    const source = ["```ts", "const a = 1;", "```", ""].join("\n");

    expect(extractMermaidBlocks(source)).toHaveLength(0);
  });
});
