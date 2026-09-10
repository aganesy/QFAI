/**
 * Spawn-based tests for `scripts/check-doc-clarity.mjs`.
 *
 * The guard keeps identifiers that mean nothing outside this repository —
 * issue and pull-request numbers, review references — out of source comments
 * and Markdown prose. What it reads, what it exempts and what it gates on are
 * pinned below, and then the real tree is measured on the surface where the
 * rule's harm actually lands.
 *
 * The exemptions are the part worth testing. A file whose subject IS the
 * forbidden shapes has to be able to write them, and there are exactly two:
 * the changelog, where the writing rule sends those numbers, and the rule
 * document itself. Both are named by exact path rather than by directory, so
 * a case below writes a second document beside the rule and asserts it is
 * still checked — an exclusion widened to the directory would let every rule
 * master carry citations unseen.
 *
 * The default scope is the other half. A repository this size has a backlog
 * no single change should be blocked on, so only added and modified lines
 * fail. A test that ran the whole tree would pass for a guard that had lost
 * that distinction, which is why both directions are exercised against a real
 * git history rather than a fixture.
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
const SCRIPT = path.join(REPO_ROOT, "scripts/check-doc-clarity.mjs");

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runGuard(cwd: string, args: readonly string[] = []): RunResult {
  const child = spawnSync("node", [SCRIPT, ...args], { cwd, encoding: "utf-8" });
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function git(cwd: string, args: readonly string[]): void {
  const child = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (child.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${child.stderr ?? ""}`);
  }
}

async function writeFiles(dir: string, files: Record<string, string>): Promise<void> {
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(dir, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

/** A repository with tracked files, since the scan reads git's list. */
async function newRepo(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-check-doc-clarity-"));
  tempDirs.push(dir);
  git(dir, ["init", "--quiet", "-b", "main"]);
  git(dir, ["config", "user.email", "test@example.invalid"]);
  git(dir, ["config", "user.name", "test"]);
  await writeFiles(dir, files);
  git(dir, ["add", "--all"]);
  return dir;
}

/** The same, with the files committed on `main` so a diff scope has a base. */
async function newRepoWithHistory(files: Record<string, string>): Promise<string> {
  const dir = await newRepo(files);
  git(dir, ["commit", "--quiet", "-m", "base"]);
  return dir;
}

const CITATION = "an issue number a consuming repository cannot resolve";

describe("scripts/check-doc-clarity.mjs", () => {
  it("reports an issue number in a source comment", async () => {
    const dir = await newRepo({
      "src/thing.ts": `// ${CITATION}, see #1234\nexport const a = 1;\n`,
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("src/thing.ts:1");
    expect(result.stderr).toContain("issue-or-pr-number");
  });

  it("leaves the same shape alone outside a comment", async () => {
    // The rule covers comments and prose. A fragment in a string literal is
    // data the program uses, and rewriting it would change behaviour.
    const dir = await newRepo({ "src/thing.ts": 'export const anchor = "#1234";\n' });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no local identifiers found");
  });

  it("reports an issue number in Markdown prose", async () => {
    const dir = await newRepo({ "docs/guide.md": `Not covered today — see #1101.\n` });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("docs/guide.md:1");
  });

  it("reports the review tool's short alphanumeric-hash comment id", async () => {
    // The same tool that leaves a long digit-only id also leaves a short
    // alphanumeric hash — both are the same kind of citation.
    const dir = await newRepo({
      "src/thing.ts": "// codex AG08r: fixed here\nexport const a = 1;\n",
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("codex-review-id");
  });

  it("reports the numeric comment id even with 'review' inserted before it", async () => {
    const dir = await newRepo({
      "src/thing.ts": "// codex review r3264500818: fixed here\nexport const a = 1;\n",
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("codex-review-id");
  });

  it("leaves plain words after 'codex' alone", async () => {
    // "codex agent" and "codex review" (with nothing after) are ordinary
    // product vocabulary in this repository, not a citation. A citation
    // token always carries at least one digit.
    const dir = await newRepo({
      "src/thing.ts":
        "// the codex agent reads this file, and codex review runs it\nexport const a = 1;\n",
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
  });

  it("leaves a quoted hex color alone", async () => {
    // A quoted hex color and an issue number share the same shape; only the
    // trailing quote tells them apart.
    const dir = await newRepo({ "src/theme.ts": 'export const ink = "#111827";\n' });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
  });

  it("reports a review shortcode list joined by a slash", async () => {
    const dir = await newRepo({
      "src/thing.ts": "// fixed in review AB12/CD34\nexport const a = 1;\n",
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("review-shortcode-list");
  });

  it("leaves ordinary prose that happens to say 'review' before a comma alone", async () => {
    // A four-letter word after "review", followed by a comma and another
    // four-letter word, is ordinary English — not a shortcode list. The
    // pattern's separator is a slash for this reason: this codebase's real
    // shortcode lists never use a comma.
    const dir = await newRepo({
      "src/thing.ts": "// see the review gate, which runs after build\nexport const a = 1;\n",
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
  });

  describe("the files whose subject is the forbidden shapes", () => {
    it("exempts the rule document, which has to name what it forbids", async () => {
      const dir = await newRepo({
        ".agents/rules/documentation-clarity.md": "- issue and pull-request numbers (`#123`)\n",
      });

      const result = runGuard(dir, ["--scope", "all"]);

      expect(result.status).toBe(0);
    });

    it("exempts the copy of it that ships", async () => {
      // Shipped to projects that do not have this guard, so it cannot carry a
      // suppression marker either — the exemption is the only route.
      const dir = await newRepo({
        "packages/qfai/assets/init/root/.agents/rules/documentation-clarity.md":
          "- issue and pull-request numbers (`#123`, `GH-123`)\n",
      });

      const result = runGuard(dir, ["--scope", "all"]);

      expect(result.status).toBe(0);
    });

    it("exempts the changelog, where the writing rule sends those numbers", async () => {
      const dir = await newRepo({ "CHANGELOG.md": "- Fixed the thing (#1234)\n" });

      const result = runGuard(dir, ["--scope", "all"]);

      expect(result.status).toBe(0);
    });

    it("exempts a spec pack's own delta log, which records what changed", async () => {
      // Same case as the changelog by function: the record exists to keep the
      // citation. Matched by basename, so both spellings the packs use are
      // covered without listing every pack.
      const dir = await newRepo({
        ".qfai/specs/_policies/10_delta.md": "- Superseded by #1234.\n",
        ".qfai/specs/spec-0001/09_delta.md": "- Raised in #1234.\n",
      });

      const result = runGuard(dir, ["--scope", "all"]);

      expect(result.status).toBe(0);
    });

    it("still checks a spec document that is not a delta log", async () => {
      // The exemption is the basename, not the pack: a spec's own prose is
      // written for a reader who has neither the number nor the tracker.
      const dir = await newRepo({ ".qfai/specs/spec-0001/01_Spec.md": "Raised in #1234.\n" });

      const result = runGuard(dir, ["--scope", "all"]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(".qfai/specs/spec-0001/01_Spec.md:1");
    });

    it("still checks another rule document in the same directory", async () => {
      // The exemption is two exact paths. Widened to `.agents/rules/` it would
      // take every rule master with it, and those carry no such obligation.
      const dir = await newRepo({ ".agents/rules/version-discipline.md": "Raised in #1234.\n" });

      const result = runGuard(dir, ["--scope", "all"]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(".agents/rules/version-discipline.md:1");
    });

    it("skips the symlinked mirror, which cannot be edited where it is found", async () => {
      const dir = await newRepo({ ".claude/rules/documentation-clarity.md": "See #1234.\n" });

      const result = runGuard(dir, ["--scope", "all"]);

      expect(result.status).toBe(0);
    });
  });

  describe("the default scope", () => {
    it("passes on a backlog line no commit on this branch touched", async () => {
      const dir = await newRepoWithHistory({ "src/old.ts": `// legacy note, see #1234\n` });
      git(dir, ["checkout", "--quiet", "-b", "topic"]);
      await writeFiles(dir, { "src/new.ts": "// a note with no citation\n" });
      git(dir, ["add", "--all"]);
      git(dir, ["commit", "--quiet", "-m", "add"]);

      const result = runGuard(dir);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("no local identifiers in the changed lines");
      // The backlog is real; the default scope simply does not gate on it.
      expect(runGuard(dir, ["--scope", "all"]).status).toBe(1);
    });

    it("fails on a line this branch added", async () => {
      const dir = await newRepoWithHistory({ "src/old.ts": "// a note with no citation\n" });
      git(dir, ["checkout", "--quiet", "-b", "topic"]);
      await writeFiles(dir, {
        "src/old.ts": `// a note with no citation\n// and now, see #1234\n`,
      });
      git(dir, ["add", "--all"]);
      git(dir, ["commit", "--quiet", "-m", "add"]);

      const result = runGuard(dir);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("src/old.ts:2");
    });
  });
});

describe("the shipped surface", () => {
  it("carries no identifier that resolves to nothing in a consuming repository", () => {
    // The rule's stated harm lands here and only here: everything under
    // `assets/init/**` is copied into a project that cannot resolve any of
    // these numbers. `src/**` and `tests/**` have the same rule and a backlog
    // the default scope handles; this surface is held at zero.
    const result = runGuard(REPO_ROOT, ["--scope", "all"]);

    const shipped = [...result.stderr.split("\n"), ...result.stdout.split("\n")].filter((line) =>
      line.startsWith("packages/qfai/assets/"),
    );

    expect(shipped).toEqual([]);
  });
});
