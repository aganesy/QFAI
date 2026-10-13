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
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
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

/**
 * What a finished guard process reports, or a thrown error naming why it has no verdict.
 *
 * A process that never started (`error`) or was ended by a signal comes back with a null
 * status, which reads as a failure with no cause. Either is thrown with its actual cause
 * before the usual status, stdout and stderr shape is returned.
 */
function guardResultOf(child: SpawnSyncReturns<string>): RunResult {
  if (child.error !== undefined) {
    throw new Error(`the guard did not run: ${child.error.message}`, { cause: child.error });
  }
  if (child.signal !== null) {
    throw new Error(`the guard was ended by ${child.signal} before it gave a verdict`);
  }
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

function runGuard(cwd: string, args: readonly string[] = []): RunResult {
  return guardResultOf(spawnSync("node", [SCRIPT, ...args], { cwd, encoding: "utf-8" }));
}

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/**
 * Throws unless a finished git process exited with status 0, and names the real cause.
 *
 * A git binary that cannot start (`error`) or is ended by a signal has a null status and
 * an empty stderr, which would read as an empty failure. Either is thrown with its cause.
 */
function requireGitSuccess(child: SpawnSyncReturns<string>, args: readonly string[]): void {
  const command = `git ${args.join(" ")}`;
  if (child.error !== undefined) {
    throw new Error(`${command} did not run: ${child.error.message}`, { cause: child.error });
  }
  if (child.signal !== null) {
    throw new Error(`${command} was ended by ${child.signal}`);
  }
  if (child.status !== 0) {
    throw new Error(`${command} failed: ${child.stderr ?? ""}`);
  }
}

function git(cwd: string, args: readonly string[]): void {
  requireGitSuccess(spawnSync("git", args, { cwd, encoding: "utf-8" }), args);
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

/**
 * The forbidden shapes, assembled from parts.
 *
 * A fixture that carried one whole would make this file one of the guard's own
 * findings — twice already, an example written to illustrate a pattern matched
 * it. Interpolating the half that carries the digits keeps every line here below
 * every pattern, and the fixture the same string once it is built.
 */
const REVIEW_ID = `codex ${"AG08r"}`;
const WRAPPED_REVIEW_ID = ["// as raised in the codex", `// ${"r3264500818"} thread`].join("\n");

describe("the guard runner's diagnostics", () => {
  it("names the launch failure instead of returning a cause-less null status", () => {
    const missing = path.join(os.tmpdir(), "qfai-clarity-missing-directory");

    expect(() => runGuard(missing)).toThrow(/the guard did not run: .*ENOENT/);
  });

  it("names the signal that ended the guard", () => {
    const ended: SpawnSyncReturns<string> = {
      pid: 0,
      output: [null, "", ""],
      stdout: "",
      stderr: "",
      status: null,
      signal: "SIGKILL",
    };

    expect(() => guardResultOf(ended)).toThrow(/ended by SIGKILL/);
  });

  it("returns the usual shape for a guard that gave a verdict", () => {
    const finished: SpawnSyncReturns<string> = {
      pid: 1,
      output: [null, "out", "err"],
      stdout: "out",
      stderr: "err",
      status: 1,
      signal: null,
    };

    expect(guardResultOf(finished)).toEqual({ status: 1, stdout: "out", stderr: "err" });
  });
});

describe("the git fixture helper's diagnostics", () => {
  it("names a launch failure and keeps it as the cause", () => {
    const missing = path.join(os.tmpdir(), "qfai-clarity-missing-directory");

    let thrown: unknown;
    try {
      git(missing, ["status"]);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown instanceof Error && thrown.message).toMatch(/git status did not run: .*ENOENT/);
    expect(thrown instanceof Error && thrown.cause).toBeInstanceOf(Error);
  });

  it("names the signal that ended git", () => {
    const ended: SpawnSyncReturns<string> = {
      pid: 0,
      output: [null, "", ""],
      stdout: "",
      stderr: "",
      status: null,
      signal: "SIGKILL",
    };

    expect(() => requireGitSuccess(ended, ["gc"])).toThrow(/git gc was ended by SIGKILL/);
  });

  it("reports the stderr of a git command that exited non-zero", () => {
    const failed: SpawnSyncReturns<string> = {
      pid: 1,
      output: [null, "", "fatal: nope"],
      stdout: "",
      stderr: "fatal: nope",
      status: 128,
      signal: null,
    };

    expect(() => requireGitSuccess(failed, ["add", "x"])).toThrow(/git add x failed: fatal: nope/);
  });
});

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

  it("reports a review reference in a test title, which ships in the run output", async () => {
    const dir = await newRepo({ "tests/a.test.ts": `it("fixed in ${REVIEW_ID}", () => {});\n` });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("tests/a.test.ts:1");
    expect(result.stderr).toContain("codex-review-id");
  });

  it("reports a review reference in an operator-facing message", async () => {
    const dir = await newRepo({ "src/run.ts": `console.error("refused — ${REVIEW_ID}");\n` });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("src/run.ts:1");
  });

  it("leaves a fixture inside a test body alone, where the string is data", async () => {
    // The window is the call line and the strings wrapped under it. A body that
    // ran to the closing bracket would read every fixture in the case as prose,
    // and a CSS colour in one of them as an issue number.
    const dir = await newRepo({
      "tests/b.test.ts": [
        'it("renders", () => {',
        `  const css = "color:${"#"}222222";`,
        "});",
        "",
      ].join("\n"),
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no local identifiers found");
  });

  it("reports a citation a line wrap split across two comments", async () => {
    const dir = await newRepo({
      "src/wrapped.ts": `${WRAPPED_REVIEW_ID}\nexport const a = 1;\n`,
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(1);
    // Reported at the first of the two, which is where the citation starts.
    expect(result.stderr).toContain("src/wrapped.ts:1");
    expect(result.stderr).toContain("codex-review-id");
  });

  it("does not invent a citation across two comment lines that carry none", async () => {
    const dir = await newRepo({
      "src/pair.ts": ["// the codex is a book", "// and 1234 pages long", "", ""].join("\n"),
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no local identifiers found");
  });

  it("counts a citation once when it sits on one line inside the window", async () => {
    const dir = await newRepo({
      "src/single.ts": `// ${REVIEW_ID} fixed it\n// and the next line is prose\nexport const a = 1;\n`,
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("1 local identifier(s) found");
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

  it("leaves a six-digit hex color in Markdown alone", async () => {
    const dir = await newRepo({ "docs/palette.md": "| Ink | #111111 |\n" });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
  });

  it("still reports a five-digit issue number in Markdown prose", async () => {
    const dir = await newRepo({ "docs/guide.md": `Not covered today — see #${"12345"}.\n` });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("docs/guide.md:1");
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
    // A four-letter word right after "review" reads like a shortcode's
    // first code, but the pattern needs a slash-joined second code too, and
    // ordinary prose has none. The separator is a slash, not a comma,
    // because that is what this codebase's real shortcode lists use.
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

  describe("historical story-tree decision records", () => {
    for (const scope of ["all", "changed"]) {
      it.each([
        ".qfai/spec/decisions.md",
        ".qfai/spec/decisions/page-0001.md",
        ".qfai/spec/decisions/page-9999.md",
      ])(`keeps historical provenance in %s under ${scope} scope`, async (recordPath) => {
        const dir = await newRepoWithHistory({ "src/base.ts": "export const baseline = true;\n" });
        git(dir, ["checkout", "--quiet", "-b", "topic"]);
        await writeFiles(dir, {
          [recordPath]: [
            "# Decisions",
            "",
            "## Decision register",
            "",
            "| ID | Content | Approach | Status |",
            "| --- | --- | --- | --- |",
            `| DEC-0001 | Change request: src/thing.ts | Historical provenance from #${"1234"}. | DONE |`,
            "",
          ].join("\n"),
        });
        git(dir, ["add", "--all"]);
        git(dir, ["commit", "--quiet", "-m", "add historical record"]);

        const result = runGuard(dir, ["--scope", scope]);

        expect(result.status).toBe(0);
        expect(result.stderr).not.toContain(recordPath);
        expect(result.stdout).toContain(
          scope === "changed"
            ? "no local identifiers in the changed lines"
            : "no local identifiers found",
        );
      });
    }

    it.each(["all", "changed"])(
      "still checks lookalike paths, ordinary story prose and source under %s scope",
      async (scope) => {
        const paths = [
          ".qfai/spec/decisions-extra.md",
          ".qfai/spec/decisions/README.md",
          ".qfai/spec/decisions/page-0000.md",
          ".qfai/spec/decisions/page-001.md",
          ".qfai/spec/decisions/page-00001.md",
          ".qfai/spec/decisions/page-0001-extra.md",
          ".qfai/spec/decisions/nested/page-0001.md",
          ".qfai/spec/decisions-other/page-0001.md",
          ".qfai/spec/02_business-flow/business-flow-0001/user-stories.md",
          ".qfai/spec/03_contract/cli/cli-0001-example.md",
          "src/thing.ts",
        ];
        const dir = await newRepoWithHistory({ "src/base.ts": "export const baseline = true;\n" });
        git(dir, ["checkout", "--quiet", "-b", "topic"]);
        const files: Record<string, string> = {};
        for (const relative of paths) {
          files[relative] = relative.endsWith(".ts")
            ? `// ${CITATION}, see #${"1234"}\nexport const a = 1;\n`
            : `${CITATION}, see #${"1234"}.\n`;
        }
        await writeFiles(dir, files);
        git(dir, ["add", "--all"]);
        git(dir, ["commit", "--quiet", "-m", "add ordinary prose"]);

        const result = runGuard(dir, ["--scope", scope]);

        expect(result.status).toBe(1);
        expect(result.stderr).toContain("issue-or-pr-number");
        for (const relative of paths) {
          expect(result.stderr).toContain(`${relative}:1:`);
        }
        expect(result.stderr).toContain(`${paths.length} local identifier(s) found`);
      },
    );
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

/**
 * The result of a guard run that reached a verdict: exit 0 (clean) or 1 (findings).
 *
 * Any other status is a usage or git error, or no run at all, and its output carries no
 * findings to filter. Reading such a run as "no shipped finding" would pass a guard that
 * never judged the tree, so it is thrown instead. A legitimate backlog failure (1) is kept.
 */
function requireVerdict(result: RunResult): RunResult {
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `the guard gave no verdict (exit ${String(result.status)}): ${result.stderr.trim()}`,
    );
  }
  return result;
}

describe("the guard verdict the shipped-surface check relies on", () => {
  it("refuses a usage error as if it were a clean tree", () => {
    const usageError = runGuard(REPO_ROOT, ["--scope", "no-such-scope"]);

    expect(usageError.status).toBe(2);
    expect(() => requireVerdict(usageError)).toThrow(/no verdict \(exit 2\)/);
  });

  it("accepts a clean verdict and a findings verdict", () => {
    const clean: RunResult = { status: 0, stdout: "", stderr: "" };
    const findings: RunResult = { status: 1, stdout: "", stderr: "a finding" };

    expect(requireVerdict(clean)).toBe(clean);
    expect(requireVerdict(findings)).toBe(findings);
  });
});

describe("the shipped surface", () => {
  it("carries no identifier that resolves to nothing in a consuming repository", () => {
    // The rule's stated harm lands here and only here: everything under
    // `assets/init/**` is copied into a project that cannot resolve any of
    // these numbers. `src/**` and `tests/**` have the same rule and a backlog
    // the default scope handles; this surface is held at zero.
    const result = requireVerdict(runGuard(REPO_ROOT, ["--scope", "all"]));

    const shipped = [...result.stderr.split("\n"), ...result.stdout.split("\n")].filter((line) =>
      line.startsWith("packages/qfai/assets/"),
    );

    expect(shipped).toEqual([]);
  });
});
