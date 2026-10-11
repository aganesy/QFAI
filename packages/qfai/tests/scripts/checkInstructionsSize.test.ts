/**
 * Spawn-based tests for `scripts/check-instructions-size.mjs`.
 *
 * The check holds the files an agent loads on its own to a size. An entry file
 * is read at every session start, so each line costs on every turn, and a
 * longer file lowers how well each instruction in it is followed. The ceiling
 * is 200 lines. A file above it is pinned at its length and may not get
 * longer; one that is shorter than its pin passes and says which length to pin.
 *
 * The cases build a small tree with a pin file of their own, so they do not
 * move when the real files change. The last case runs the real tree against
 * the real pins.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts → tests → packages/qfai → packages → repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/check-instructions-size.mjs");

interface RunResult {
  status: number | null;
  output: string;
}

function run(cwd: string): RunResult {
  const child = spawnSync("node", [SCRIPT], { cwd, encoding: "utf-8" });
  return { status: child.status, output: `${child.stdout ?? ""}${child.stderr ?? ""}` };
}

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** A directory holding the given files, with the pin file the check reads. */
async function newTree(
  files: Record<string, string>,
  pins: Record<string, unknown> | string = {},
): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-size-"));
  tempDirs.push(dir);
  const all: Record<string, string> = {
    ...files,
    "scripts/entry-file-size-pins.json": typeof pins === "string" ? pins : JSON.stringify(pins),
  };
  for (const [relative, content] of Object.entries(all)) {
    const target = path.join(dir, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return dir;
}

const lines = (count: number, width = 20): string =>
  Array.from({ length: count }, () => "x".repeat(width)).join("\n") + "\n";

describe("check-instructions-size entry files", () => {
  it("passes a file at the target without a note", async () => {
    const dir = await newTree({ "AGENTS.md": lines(100) });
    const result = run(dir);
    expect(result.status).toBe(0);
    expect(result.output).not.toMatch(/above the 100-line target/);
  });

  it("notes a file one line above the target without failing", async () => {
    const dir = await newTree({ "AGENTS.md": lines(101) });
    const result = run(dir);
    expect(result.status).toBe(0);
    expect(result.output).toMatch(/AGENTS\.md: 101 lines, above the 100-line target/);
  });

  it("passes an unpinned file at the ceiling", async () => {
    const dir = await newTree({ "AGENTS.md": lines(200) });
    expect(run(dir).status).toBe(0);
  });

  it("fails an unpinned file one line above the ceiling and names its length", async () => {
    const dir = await newTree({ ".github/copilot-instructions.md": lines(201) });
    const result = run(dir);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/copilot-instructions\.md: 201 lines, over the 200-line ceiling/);
  });

  it("counts a final line with no newline, and CRLF line ends", async () => {
    const noNewline = await newTree({ "AGENTS.md": `${lines(200)}last line` });
    const noNewlineResult = run(noNewline);
    expect(noNewlineResult.status).toBe(1);
    expect(noNewlineResult.output).toMatch(/AGENTS\.md: 201 lines/);

    const crlf = await newTree({ "AGENTS.md": lines(200).replaceAll("\n", "\r\n") });
    expect(run(crlf).status).toBe(0);
  });

  it("holds a pinned file at its pin", async () => {
    const dir = await newTree({ "AGENTS.md": lines(250) }, { "AGENTS.md": 250 });
    const result = run(dir);
    expect(result.status).toBe(0);
    expect(result.output).toMatch(/AGENTS\.md: 250 lines, held at its pin/);
  });

  it("fails a pinned file that grew past its pin", async () => {
    const dir = await newTree({ "AGENTS.md": lines(251) }, { "AGENTS.md": 250 });
    const result = run(dir);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/AGENTS\.md: 251 lines, over its pin of 250/);
  });

  it("passes a pinned file that got shorter and says which length to pin", async () => {
    const dir = await newTree({ "AGENTS.md": lines(240) }, { "AGENTS.md": 250 });
    const result = run(dir);
    expect(result.status).toBe(0);
    expect(result.output).toMatch(
      /AGENTS\.md: 240 lines, under its pin of 250; lower the pin to 240/,
    );
  });

  it("fails a pin that a file no longer needs", async () => {
    const dir = await newTree({ "AGENTS.md": lines(180) }, { "AGENTS.md": 250 });
    const result = run(dir);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/AGENTS\.md: 180 lines, within the ceiling; remove its pin/);
  });

  it("fails a pin for a file that no longer exists", async () => {
    const dir = await newTree({}, { "CLAUDE.md": 250 });
    const result = run(dir);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/CLAUDE\.md: pinned at 250 lines but the file is absent/);
  });

  it("skips an entry file that does not exist", async () => {
    const dir = await newTree({ "AGENTS.md": lines(10) });
    expect(run(dir).status).toBe(0);
  });

  it.each([
    "CLAUDE.md",
    ".github/copilot-instructions.md",
    "packages/qfai/assets/init/root/AGENTS.md",
    "packages/qfai/assets/init/root/CLAUDE.md",
  ])("holds %s to the ceiling", async (file) => {
    const dir = await newTree({ [file]: lines(201) });
    const result = run(dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain(`${file}: 201 lines`);
  });
});

describe("check-instructions-size pin file", () => {
  it("fails a pin file that is not JSON, and says so", async () => {
    const dir = await newTree({ "AGENTS.md": lines(10) }, "{ not json");
    const result = run(dir);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/entry-file-size-pins\.json/);
  });

  it("fails a pin that is not a line count above the ceiling", async () => {
    const dir = await newTree({ "AGENTS.md": lines(10) }, { "AGENTS.md": "371" });
    const result = run(dir);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/AGENTS\.md: pin "371" is not a line count above 200/);
  });

  it("fails a pin for a file that is not an entry file", async () => {
    const dir = await newTree({ "AGENTS.md": lines(10) }, { "docs/OTHER.md": 300 });
    const result = run(dir);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/docs\/OTHER\.md: pinned but not an entry file/);
  });
});

describe("check-instructions-size Codex byte limit", () => {
  it.each(["AGENTS.md", "packages/qfai/assets/init/root/AGENTS.md"])(
    "fails %s one byte above 32 KiB even when its lines are few",
    async (file) => {
      const dir = await newTree({ [file]: `${"x".repeat(32768)}\n` });
      const result = run(dir);
      expect(result.status).toBe(1);
      expect(result.output).toMatch(/AGENTS\.md: 32769 bytes, over the 32768-byte limit/);
    },
  );

  it("passes a root AGENTS.md at the limit", async () => {
    const dir = await newTree({ "AGENTS.md": `${"x".repeat(32767)}\n` });
    expect(run(dir).status).toBe(0);
  });
});

describe("check-instructions-size path-scoped instruction files", () => {
  it("still fails an instructions file above 4000 characters", async () => {
    const dir = await newTree({ ".github/instructions/big.instructions.md": "x".repeat(4001) });
    const result = run(dir);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/big\.instructions\.md: 4001 chars/);
  });

  it("passes one at 4000 characters", async () => {
    const dir = await newTree({ ".github/instructions/ok.instructions.md": "x".repeat(4000) });
    expect(run(dir).status).toBe(0);
  });
});

describe("check-instructions-size on this repository", () => {
  it("passes against the committed pins", () => {
    expect(run(REPO_ROOT).status).toBe(0);
  });
});
