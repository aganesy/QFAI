/**
 * Spawn-based tests for `scripts/check-readme-alignment.mjs`.
 *
 * The guard backs the claim both READMEs make in their "Contributing"
 * section: the repository root `README.md` and the published
 * `packages/qfai/README.md` stay aligned. Its contract:
 *   - every line outside an ignore block identical -> exit 0
 *   - any line differs, or one file is longer      -> exit 1
 *   - malformed ignore markers                     -> exit 1
 *   - unreadable file                              -> exit 1
 *   - unknown flag / empty flag value              -> exit 2
 *
 * An ignore block is an HTML-comment pair
 * (`readme-align:ignore-start` / `readme-align:ignore-end`) and also
 * absorbs the blank line Prettier inserts directly above it.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts → tests → packages/qfai → packages → repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/check-readme-alignment.mjs");

const START = "<!-- readme-align:ignore-start -->";
const END = "<!-- readme-align:ignore-end -->";

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runGuard(args: string[], cwd: string = REPO_ROOT): RunResult {
  const child = spawnSync("node", [SCRIPT, ...args], { cwd, encoding: "utf-8" });
  return {
    status: child.status,
    stdout: child.stdout ?? "",
    stderr: child.stderr ?? "",
  };
}

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-readme-align-"));
  tempDirs.push(dir);
  return dir;
}

/** Writes a root/package README pair and returns the guard flags for them. */
async function writePair(root: string, pkg: string): Promise<string[]> {
  const dir = await newTempDir();
  const rootPath = path.join(dir, "root-README.md");
  const packagePath = path.join(dir, "package-README.md");
  await writeFile(rootPath, root, "utf-8");
  await writeFile(packagePath, pkg, "utf-8");
  return ["--root", rootPath, "--package", packagePath];
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("check-readme-alignment.mjs", () => {
  it("exit 0 for the repository's own README pair (regression guard)", () => {
    const r = runGuard([]);
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/aligned/);
  });

  it("exit 0 when both files are identical", async () => {
    const body = "# Title\n\n## Section\n\nSame prose.\n";
    const r = runGuard(await writePair(body, body));
    expect(r.status).toBe(0);
  });

  it("exit 1 when a shared line drifts, naming both line numbers", async () => {
    const r = runGuard(
      await writePair(
        "# Title\n\n- exit codes 0 / 64 / 65 / 2\n",
        "# Title\n\n- exit codes 0 / 64 / 65 / 66 / 2\n",
      ),
    );
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/diverged/);
    expect(r.stderr).toMatch(/root-README\.md:3/);
    expect(r.stderr).toMatch(/package-README\.md:3/);
  });

  it("exit 1 when one file carries an extra unmarked section", async () => {
    const r = runGuard(
      await writePair("# Title\n\nShared.\n", "# Title\n\nShared.\n\n### Steering surface\n"),
    );
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/Steering surface/);
    expect(r.stderr).toMatch(/end of file/);
  });

  it("exit 0 when the divergence sits inside an ignore block", async () => {
    const r = runGuard(
      await writePair(
        `# Title\n\n- shared bullet\n\n${START}\n\n- root-only note\n\n${END}\n\n## Next\n`,
        "# Title\n\n- shared bullet\n\n## Next\n",
      ),
    );
    expect(r.status).toBe(0);
  });

  it("exit 1 when an ignore block is never closed", async () => {
    const r = runGuard(await writePair(`# Title\n\n${START}\n\n- note\n`, "# Title\n"));
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/never closed/);
    expect(r.stderr).toMatch(/root-README\.md:3/);
  });

  it("exit 1 when an ignore-end appears without a matching start", async () => {
    const r = runGuard(await writePair("# Title\n", `# Title\n\n${END}\n`));
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/without a matching/);
  });

  it("exit 1 when an ignore block is nested", async () => {
    const r = runGuard(await writePair(`# Title\n\n${START}\n\n${START}\n\n${END}\n`, "# Title\n"));
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/nested/);
  });

  it("exit 1 when a README path does not exist", async () => {
    const flags = await writePair("# Title\n", "# Title\n");
    flags[1] = path.join(REPO_ROOT, "no-such-README.md");
    const r = runGuard(flags);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/cannot read file/);
  });

  it("exit 2 when invoked with an unknown flag", () => {
    const r = runGuard(["--bogus-flag"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/unknown/i);
  });

  it("exit 2 when --root is given an empty value", () => {
    const r = runGuard(["--root", ""]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/root/);
  });

  it("exit 2 when --package is given no value at all", () => {
    const r = runGuard(["--package"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/package/);
  });
});

describe("README content the guard now keeps in sync", () => {
  it("documents the steering surface, exit code 66 and the review.json evidence in both files", async () => {
    const { readFile } = await import("node:fs/promises");
    const [root, pkg] = await Promise.all([
      readFile(path.join(REPO_ROOT, "README.md"), "utf-8"),
      readFile(path.join(REPO_ROOT, "packages/qfai/README.md"), "utf-8"),
    ]);
    for (const body of [root, pkg]) {
      expect(body).toMatch(/\.qfai\/steering\//);
      expect(body).toMatch(/worklog-entry\.schema\.md/);
      expect(body).toMatch(/66 license-verify failure/);
      expect(body).toMatch(/<screen>\.review\.json/);
    }
    // The stale root README promised artifacts the CLI never writes.
    expect(root).not.toMatch(/`screenshot\.png` \+ `index\.html`/);
  });

  it("lists the plan and context files the CLI writes every cycle, not just the review", async () => {
    // `prototypingIterate.ts` writes `iter-NN/iterate-plan.json`
    // unconditionally (right after the iteration dir is created, before any
    // opt-in capture), and from cycle 1 onward it also writes the advisory
    // `iterate-context.json`. Calling `<screen>.review.json` "the only
    // per-cycle artifact" told operators to collect a subset of the
    // directory and drop the plan/context the next cycle reads.
    const { readFile } = await import("node:fs/promises");
    const [root, pkg] = await Promise.all([
      readFile(path.join(REPO_ROOT, "README.md"), "utf-8"),
      readFile(path.join(REPO_ROOT, "packages/qfai/README.md"), "utf-8"),
    ]);
    for (const body of [root, pkg]) {
      expect(body).toMatch(/`iterate-plan\.json`/);
      expect(body).toMatch(/`iterate-context\.json`/);
      // The refuted claim must not come back in either file.
      expect(body).not.toMatch(/is the only per-cycle artifact/);
      // Over-correction pin: the opt-in capture artifacts stay documented
      // as opt-in (thread r3832734116) and `interaction.json` stays denied.
      expect(body).toMatch(/`--capture`/);
      expect(body).toMatch(/`interaction\.json` is written on any path/);
    }
  });
});
