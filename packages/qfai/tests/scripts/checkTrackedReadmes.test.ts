/**
 * A README outside the two pages this repository publishes.
 *
 * The cleanup that removed the others has happened before and they came back,
 * so the rule is held by a lane rather than by memory. These cases drive the
 * script over throwaway repositories: run against this one it would only ever
 * say what this tree happens to hold today.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../scripts/check-tracked-readmes.mjs",
);

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

/** A repository holding `files`, each tracked. */
async function repoWith(files: string[]): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-readmes-"));
  roots.push(root);
  execFileSync("git", ["init", "-q"], { cwd: root });
  for (const file of files) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), "# page\n", "utf-8");
  }
  execFileSync("git", ["add", "-A"], { cwd: root });
  return root;
}

function run(cwd: string): { status: number; output: string } {
  const child = spawnSync(process.execPath, [SCRIPT], { cwd, encoding: "utf-8" });
  return {
    status: child.status ?? 1,
    output: `${child.stdout ?? ""}${child.stderr ?? ""}`,
  };
}

const PUBLISHED = ["README.md", "packages/qfai/README.md"];

describe("check-tracked-readmes", () => {
  it("passes on a tree holding only the two published pages", async () => {
    const result = run(await repoWith(PUBLISHED));

    expect(result.status).toBe(0);
    expect(result.output).toContain("each one published");
  });

  it("fails on a README anywhere else, and says where the content belongs", async () => {
    const result = run(await repoWith([...PUBLISHED, "docs/README.md"]));

    expect(result.status).toBe(1);
    expect(result.output).toContain("docs/README.md");
    expect(result.output).toContain(".agents/rules/");
  });

  it("matches the name however it is cased", async () => {
    // `Readme.md` and `README.MD` are the same page to a reader, and on a
    // case-insensitive filesystem the same file.
    const result = run(await repoWith([...PUBLISHED, "tools/Readme.md"]));

    expect(result.status).toBe(1);
    expect(result.output).toContain("tools/Readme.md");
  });

  it("fails when a page it lists is no longer tracked", async () => {
    // The silent direction: without this the guard keeps passing over a page
    // nobody publishes any more.
    const result = run(await repoWith(["README.md"]));

    expect(result.status).toBe(1);
    expect(result.output).toContain("packages/qfai/README.md");
    expect(result.output).toContain("is listed as a published page and is not tracked");
  });

  it("reads the index, so an untracked README is not a finding", async () => {
    // A scratch file a build or a suite left behind is not something a commit
    // holds, and failing a lane for it reports nothing anyone can fix.
    const root = await repoWith(PUBLISHED);
    await mkdir(path.join(root, "scratch"), { recursive: true });
    await writeFile(path.join(root, "scratch", "README.md"), "# scratch\n", "utf-8");

    expect(run(root).status).toBe(0);
  });
});
