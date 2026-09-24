/**
 * `Revision` is compared against the tree, not just read.
 *
 * `evidence-revision.md#what-makes-evidence-stale` has always defined staleness
 * mechanically — "a commit that changes any file the observation covered
 * invalidates it" — and nothing computed it. The field was written by hand,
 * required in three places, and compared against nothing: `QFAI-REVIEW-009`
 * asks whether `summary.json`'s field is PRESENT, never whether it is CURRENT.
 *
 * The failure is silent and self-consistent — a stale `Revision` looks exactly
 * like a fresh one, every command in the record is real, and nothing in the
 * record contradicts anything else. So the rows here are mostly about the
 * states that must stay SILENT, because a check that reported on all of them
 * would be turned off by its first false positive.
 *
 * Two seams rather than a ledger fixture: `changedFilesSince` is the git
 * question, `staleEvidenceFiles` is the decision. Reaching them through a whole
 * `tdd/test-list.md` plus evidence file would mostly test the fixture.
 */
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

// The module is imported dynamically below so the mock applies, but its TYPE
// comes from a static namespace import: `consistent-type-imports` forbids the
// inline form, and a namespace is not itself a type, so `typeof` makes one.
import type * as ChildProcessModule from "node:child_process";

type ChildProcess = typeof ChildProcessModule;

// Passed through, not stubbed: the fixtures build real repositories with it,
// and the cache row counts the `git diff` invocations that reach it — which is
// the property the cache exists for. `cache.size` is not: it is 1 after three
// same-revision calls whether or not `cache.get` is consulted, so a row
// asserting the size passed a cache that was written and never read.
//
// `vi.mock` rather than `vi.spyOn`: an ESM namespace export cannot be
// redefined (`Cannot redefine property: execFileSync`).
const { gitDiffArgs } = vi.hoisted(() => ({ gitDiffArgs: [] as string[][] }));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<ChildProcess>();
  return {
    ...actual,
    execFileSync: (...args: unknown[]) => {
      if (args[0] === "git" && Array.isArray(args[1]) && args[1][0] === "diff") {
        gitDiffArgs.push(args[1] as string[]);
      }
      return (actual.execFileSync as unknown as (...a: unknown[]) => unknown)(...args);
    },
  };
});

const { changedFilesSince } = await import("../../src/core/gitChanges.js");
const { staleEvidenceFiles } = await import("../../src/core/validators/tddList.js");
const { observationReach } = await import("../../src/core/observationReach.js");

const dirs: string[] = [];

afterEach(async () => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

const git = (cwd: string, ...args: string[]): void => {
  execFileSync("git", args, { cwd, stdio: ["ignore", "ignore", "ignore"] });
};

async function write(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content, "utf-8");
}

/** A repo with one commit, and the revision that commit is at. */
async function repoAtOneCommit(): Promise<{ root: string; head: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-revision-"));
  dirs.push(root);
  git(root, "init", "--initial-branch=main");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "test");
  await write(root, "src/lease.ts", "export const rate = 1;\n");
  await write(root, "tests/integration/lease.test.ts", "it('works', () => {});\n");
  await write(root, "docs/notes.md", "notes\n");
  git(root, "add", "-A");
  git(root, "commit", "-m", "seed");
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf-8" }).trim();
  return { root, head };
}

async function commit(root: string, rel: string, content: string): Promise<void> {
  await write(root, rel, content);
  git(root, "add", "-A");
  git(root, "commit", "-m", `edit ${rel}`);
}

/** A bare `- Revision:`, which a row may record. */
const section = (revision: string): string =>
  ["### TDD-0001", "", `- Revision: ${revision}`, "- Status: done", ""].join("\n");

/**
 * The shape completed evidence actually writes: the field is ROUND-SCOPED.
 *
 * A check reading `rowEvidenceFieldValue(section, "Revision")` would filter
 * `round === null` and so read only the bare form — making the whole check
 * a SILENT NO-OP on every real evidence file, undetectable by a suite whose
 * fixtures use the bare form too.
 */
const roundSection = (...revisions: string[]): string =>
  [
    "### TDD-0001",
    "",
    ...revisions.map((rev, i) => `- Round ${i + 1}: Revision: ${rev}`),
    "- Status: done",
    "",
  ].join("\n");

describe("changedFilesSince", () => {
  it("reports the files that moved under the observation", async () => {
    const { root, head } = await repoAtOneCommit();
    await commit(root, "src/lease.ts", "export const rate = 2;\n");

    const result = changedFilesSince(root, head, ["tests/integration/lease.test.ts", "src"]);
    expect(result.kind).toBe("changed");
    expect(result.kind === "changed" ? result.files : []).toEqual(["src/lease.ts"]);
  });

  it("is silent when nothing under the pathspec moved", async () => {
    // The pathspec is the point: a commit to `docs/` is not a file the
    // observation covered, and reporting it would make the check noise.
    const { root, head } = await repoAtOneCommit();
    await commit(root, "docs/notes.md", "more notes\n");

    expect(changedFilesSince(root, head, ["tests/integration/lease.test.ts", "src"]).kind).toBe(
      "unchanged",
    );
  });

  it("says so when the revision cannot be resolved, rather than `unchanged`", async () => {
    // The whole reason this is three-valued. `getChangedFilesAgainstBase`
    // collapses every failure into an empty set, which its caller reads as
    // "nothing to check"; here that same collapse would read as "the evidence
    // is fresh" — a silent pass this check exists to prevent.
    const { root } = await repoAtOneCommit();
    expect(changedFilesSince(root, "0".repeat(40), ["src"]).kind).toBe("unresolvable");
  });

  it("says so when git rejects the pathspec, rather than `unchanged`", async () => {
    // The branch after `rev-parse` has already succeeded: a broken worktree or
    // a pathspec git will not take. `:(bogus)` is an unknown magic prefix, so
    // git exits non-zero with the revision perfectly resolvable — which is the
    // one way to reach that catch, and the reason this row exists.
    const { root, head } = await repoAtOneCommit();
    expect(changedFilesSince(root, head, [":(bogus)src"]).kind).toBe("unresolvable");
  });

  it("says so outside a git checkout too", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-revision-nogit-"));
    dirs.push(root);
    expect(changedFilesSince(root, "abc1234", ["src"]).kind).toBe("unresolvable");
  });
});

describe("staleEvidenceFiles", () => {
  it("names the files that moved", async () => {
    const { root, head } = await repoAtOneCommit();
    await commit(root, "src/lease.ts", "export const rate = 2;\n");

    expect(
      staleEvidenceFiles(root, "src", section(head), "tests/integration/lease.test.ts"),
    ).toEqual(["src/lease.ts"]);
  });

  it("names a change to the test file itself", async () => {
    // "Any file the observation covered" starts with the test that was run.
    const { root, head } = await repoAtOneCommit();
    await commit(root, "tests/integration/lease.test.ts", "it('works differently', () => {});\n");

    expect(
      staleEvidenceFiles(root, "src", section(head), "tests/integration/lease.test.ts"),
    ).toEqual(["tests/integration/lease.test.ts"]);
  });

  it("stays silent when the observation is current", async () => {
    const { root, head } = await repoAtOneCommit();
    expect(
      staleEvidenceFiles(root, "src", section(head), "tests/integration/lease.test.ts"),
    ).toBeNull();
  });

  it("stays silent when the row records no Revision", async () => {
    // That absence belongs to `QFAI-TDDLIST-008`'s completed-evidence field
    // list. Two findings on one state with two remedies help nobody.
    const { root } = await repoAtOneCommit();
    const noRevision = ["### TDD-0001", "", "- Status: done", ""].join("\n");
    expect(
      staleEvidenceFiles(root, "src", noRevision, "tests/integration/lease.test.ts"),
    ).toBeNull();
  });

  it("stays silent for a content-address revision, which names no commit", async () => {
    // `working-tree+<hash>` is a different contract with no interval to
    // compute; `QFAI-REVIEW-007` / `-009` own its shape.
    const { root } = await repoAtOneCommit();
    const contentAddress = section(`working-tree+${"a".repeat(64)}`);
    expect(
      staleEvidenceFiles(root, "src", contentAddress, "tests/integration/lease.test.ts"),
    ).toBeNull();
  });

  it("stays silent when the revision cannot be resolved", async () => {
    // Deliberate, and the residual is stated in the source: `actions/checkout`
    // is depth-1 by default, so sharing this code's window would error on every
    // row of every CI run on a shallow clone, and `QFAI-REVIEW-009` already
    // reports an unresolvable revision.
    const { root } = await repoAtOneCommit();
    expect(
      staleEvidenceFiles(root, "src", section("0".repeat(40)), "tests/integration/lease.test.ts"),
    ).toBeNull();
  });

  it("reads the ROUND-SCOPED field completed evidence actually writes", async () => {
    // The row that would have caught the silent no-op.
    const { root, head } = await repoAtOneCommit();
    await commit(root, "src/lease.ts", "export const rate = 2;\n");

    expect(
      staleEvidenceFiles(root, "src", roundSection(head), "tests/integration/lease.test.ts"),
    ).toEqual(["src/lease.ts"]);
  });

  it("takes the NEWEST round, because a re-verify re-takes the observation", async () => {
    // Round 1 is stale by construction; round 2 is current. Reading round 1
    // would report a row whose latest observation is fine.
    const { root, head } = await repoAtOneCommit();
    await commit(root, "src/lease.ts", "export const rate = 2;\n");
    const second = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf-8",
    }).trim();

    expect(
      staleEvidenceFiles(
        root,
        "src",
        roundSection(head, second),
        "tests/integration/lease.test.ts",
      ),
    ).toBeNull();
  });

  it("reads the refactor verify revision, which observed the refactor's own changes", async () => {
    // The refactor is committed after the round's GREEN, and the re-run after it
    // names the new commit. Measured from the round, its own edit read as stale.
    const { root, head } = await repoAtOneCommit();
    await commit(root, "src/lease.ts", "export const rate = 2;\n");
    const refactored = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf-8",
    }).trim();
    const refactorSection = [
      "### TDD-0001",
      "",
      `- Round 1: Revision: ${head}`,
      `- Refactor verify revision: ${refactored}`,
      "- Status: done",
      "",
    ].join("\n");

    expect(
      staleEvidenceFiles(root, "src", refactorSection, "tests/integration/lease.test.ts"),
    ).toBeNull();
    await commit(root, "src/lease.ts", "export const rate = 3;\n");
    expect(
      staleEvidenceFiles(root, "src", refactorSection, "tests/integration/lease.test.ts"),
    ).toEqual(["src/lease.ts"]);
  });

  it("still reports when the newest round is itself stale", async () => {
    const { root, head } = await repoAtOneCommit();
    await commit(root, "src/lease.ts", "export const rate = 2;\n");
    const second = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf-8",
    }).trim();
    await commit(root, "src/lease.ts", "export const rate = 3;\n");

    expect(
      staleEvidenceFiles(
        root,
        "src",
        roundSection(head, second),
        "tests/integration/lease.test.ts",
      ),
    ).toEqual(["src/lease.ts"]);
  });

  it("asks git once per revision, not once per row", async () => {
    // Two git processes per ledger row cost ~200 ms each here — 104 invocations
    // for 52 rows, ~10.5 s — and rows share revisions, because an observation
    // revision is per spec and per round rather than per row. Without this a
    // 500-row project would add ~100 s to the completion gate.
    //
    // Counted at `execFileSync`, because that is the cost. An earlier version of
    // this row asserted `cache.size`, which is 1 after three same-revision calls
    // whether or not `cache.get` is consulted — it passed a cache that was
    // written and never read.
    const { root, head } = await repoAtOneCommit();
    await commit(root, "src/lease.ts", "export const rate = 2;\n");
    const cache = new Map<string, ReturnType<typeof changedFilesSince>>();

    gitDiffArgs.length = 0;
    for (const testFile of ["a.test.ts", "b.test.ts", "c.test.ts"]) {
      staleEvidenceFiles(root, "src", section(head), `tests/integration/${testFile}`, cache);
    }

    expect(gitDiffArgs).toHaveLength(1);
    expect(cache.size).toBe(1);
  });

  it("keeps a second revision separate", async () => {
    // The direction a cache keyed on nothing would break: two revisions must
    // not share an answer.
    const { root, head } = await repoAtOneCommit();
    await commit(root, "src/lease.ts", "export const rate = 2;\n");
    const second = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf-8",
    }).trim();
    const cache = new Map<string, ReturnType<typeof changedFilesSince>>();

    expect(
      staleEvidenceFiles(root, "src", section(head), "tests/integration/a.test.ts", cache),
    ).toEqual(["src/lease.ts"]);
    expect(
      staleEvidenceFiles(root, "src", section(second), "tests/integration/a.test.ts", cache),
    ).toBeNull();
    expect(cache.size).toBe(2);
  });

  it("reports a source file under the configured directory, not just any path", async () => {
    // Filtering moved from git's pathspec into memory when the diff became
    // whole-tree, so this is where a mistake now lives: `docs/` changed too and
    // must stay out, while `src/` must come through.
    const { root, head } = await repoAtOneCommit();
    await commit(root, "docs/notes.md", "more\n");
    await commit(root, "src/lease.ts", "export const rate = 2;\n");

    expect(
      staleEvidenceFiles(root, "src", section(head), "tests/integration/lease.test.ts"),
    ).toEqual(["src/lease.ts"]);
  });

  it("does not treat a sibling directory as the source directory", async () => {
    // `srcRelDir` is matched as a path PREFIX, so `src` must not swallow
    // `srcgen/`. A `startsWith(srcRelDir)` without the separator would.
    const { root, head } = await repoAtOneCommit();
    await commit(root, "srcgen/generated.ts", "export const x = 1;\n");

    expect(
      staleEvidenceFiles(root, "src", section(head), "tests/integration/lease.test.ts"),
    ).toBeNull();
  });

  it("reports an observation taken on a line the branch has since abandoned", async () => {
    // Two-dot and three-dot agree on a straight line, so every other row here
    // would pass either way. They differ when the recorded revision is not an
    // ancestor of HEAD — which is what a rebase leaves behind, and routine in
    // this workflow.
    //
    // Two-dot compares the trees: the one the observation ran against is not
    // this one, so it is stale. Three-dot would compare from the merge base
    // forward and miss a change that existed only on the abandoned line — an
    // under-report, and a silent one.
    const { root, head } = await repoAtOneCommit();

    // The observation is taken on a commit that changes the source...
    await commit(root, "src/lease.ts", "export const rate = 2;\n");
    const observedOn = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf-8",
    }).trim();

    // ...and the branch is then rebuilt without it.
    execFileSync("git", ["reset", "--hard", head], {
      cwd: root,
      stdio: ["ignore", "ignore", "ignore"],
    });
    await commit(root, "docs/notes.md", "a different line\n");

    expect(
      staleEvidenceFiles(root, "src", section(observedOn), "tests/integration/lease.test.ts"),
    ).toEqual(["src/lease.ts"]);
  });

  it("stays silent when a commit touched neither the test nor the source", async () => {
    const { root, head } = await repoAtOneCommit();
    await commit(root, "docs/notes.md", "more notes\n");
    expect(
      staleEvidenceFiles(root, "src", section(head), "tests/integration/lease.test.ts"),
    ).toBeNull();
  });
});

/**
 * A `done` row is measured over what its test reached.
 *
 * Over the whole source directory, every completed row in an active repository
 * went stale within hours whatever changed, and "the change was unrelated" was
 * a judgement the rule forbade. Measured over the test's imports it is a
 * computed fact. The in-flight question is unchanged, and the last row here
 * holds it.
 */
describe("staleness at rest, over what the test reached", () => {
  const TEST = "tests/unit/login.test.ts";

  /**
   * The test imports `src/login.ts` (written the ESM way, as `.js`), which
   * imports `src/session.ts`. `src/billing.ts` is imported by nothing.
   */
  async function repoWithImports(
    testBody?: string,
    extraFiles: Readonly<Record<string, string>> = {},
  ): Promise<{ root: string; head: string }> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-reach-"));
    dirs.push(root);
    git(root, "init", "--initial-branch=main");
    git(root, "config", "user.email", "test@example.com");
    git(root, "config", "user.name", "test");
    await write(
      root,
      "src/login.ts",
      'import { open } from "./session";\nexport const login = open;\n',
    );
    await write(root, "src/session.ts", "export const open = 1;\n");
    await write(root, "src/billing.ts", "export const charge = 1;\n");
    await write(root, "tests/fixtures/user.json", "{}\n");
    await write(
      root,
      TEST,
      testBody ?? 'import { login } from "../../src/login.js";\nit("logs in", () => login);\n',
    );
    for (const [rel, content] of Object.entries(extraFiles)) await write(root, rel, content);
    git(root, "add", "-A");
    git(root, "commit", "-m", "seed");
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf-8",
    }).trim();
    return { root, head };
  }

  async function reachOf(root: string, manifest: string[] = []): Promise<ReadonlySet<string>> {
    const reach = await observationReach(root, "src", TEST, manifest);
    if (reach.kind !== "reach") throw new Error(`expected a reach, got: ${reach.reason}`);
    return reach.files;
  }

  it("names the test file and the source files it imports, directly and transitively", async () => {
    const { root } = await repoWithImports();
    expect([...(await reachOf(root))].sort()).toEqual(["src/login.ts", "src/session.ts", TEST]);
  });

  it("stays clean when only a source file the test does not import changed", async () => {
    const { root, head } = await repoWithImports();
    await commit(root, "src/billing.ts", "export const charge = 2;\n");

    expect(
      staleEvidenceFiles(root, "src", section(head), TEST, new Map(), await reachOf(root)),
    ).toBeNull();
  });

  it("goes stale when a file the test imports directly changed", async () => {
    const { root, head } = await repoWithImports();
    await commit(
      root,
      "src/login.ts",
      'import { open } from "./session";\nexport const login = 2;\n',
    );

    expect(
      staleEvidenceFiles(root, "src", section(head), TEST, new Map(), await reachOf(root)),
    ).toEqual(["src/login.ts"]);
  });

  it("goes stale when a file the test reaches only transitively changed", async () => {
    const { root, head } = await repoWithImports();
    await commit(root, "src/session.ts", "export const open = 2;\n");

    expect(
      staleEvidenceFiles(root, "src", section(head), TEST, new Map(), await reachOf(root)),
    ).toEqual(["src/session.ts"]);
  });

  it("counts the files the RED test manifest lists", async () => {
    const { root, head } = await repoWithImports();
    await commit(root, "tests/fixtures/user.json", '{ "name": "a" }\n');

    const reach = await reachOf(root, [TEST, "tests/fixtures/user.json"]);
    expect(staleEvidenceFiles(root, "src", section(head), TEST, new Map(), reach)).toEqual([
      "tests/fixtures/user.json",
    ]);
  });

  it("treats a runtime built-in and an installed package as outside the project", async () => {
    const { root } = await repoWithImports(
      [
        'import path from "node:path";',
        'import pad from "left-pad";',
        'import { login } from "../../src/login.js";',
        'it("logs in", () => [path, pad, login]);',
        "",
      ].join("\n"),
    );
    await write(root, "node_modules/left-pad/package.json", '{ "name": "left-pad" }\n');

    expect([...(await reachOf(root))].sort()).toEqual(["src/login.ts", "src/session.ts", TEST]);
  });

  it("falls back, and says why, when an import names no installed package", async () => {
    // A path alias may lead anywhere under the source directory. Treating it as
    // external would clear a row whose test reaches the changed file.
    const { root } = await repoWithImports(
      'import { login } from "@/login";\nit("logs in", () => login);\n',
    );

    const reach = await observationReach(root, "src", TEST, []);
    expect(reach.kind).toBe("unfollowed");
    expect(reach.kind === "unfollowed" ? reach.reason : "").toContain("@/login");
  });

  describe("an import through a path alias", () => {
    const ALIASED_TEST = 'import { format } from "@/lib/format";\nit("formats", () => format);\n';
    // JSONC, as the compiler reads it: a comment and a trailing comma. The first
    // target names nothing, so the second has to be tried.
    const TSCONFIG = [
      "{",
      "  // Next.js writes its alias like this.",
      '  "compilerOptions": {',
      '    "paths": { "@/*": ["./generated/*", "./src/*"], },',
      "  },",
      "}",
      "",
    ].join("\n");
    const FORMAT = "src/lib/format.ts";

    it("follows the alias to the file it names", async () => {
      const { root } = await repoWithImports(ALIASED_TEST, {
        "tsconfig.json": TSCONFIG,
        [FORMAT]: "export const format = 1;\n",
      });

      expect([...(await reachOf(root))].sort()).toEqual([FORMAT, TEST]);
    });

    it("stays clean when a file the alias does not reach changed", async () => {
      const { root, head } = await repoWithImports(ALIASED_TEST, {
        "tsconfig.json": TSCONFIG,
        [FORMAT]: "export const format = 1;\n",
      });
      await commit(root, "src/billing.ts", "export const charge = 2;\n");

      expect(
        staleEvidenceFiles(root, "src", section(head), TEST, new Map(), await reachOf(root)),
      ).toBeNull();
    });

    it("goes stale when the aliased file changed", async () => {
      const { root, head } = await repoWithImports(ALIASED_TEST, {
        "tsconfig.json": TSCONFIG,
        [FORMAT]: "export const format = 1;\n",
      });
      await commit(root, FORMAT, "export const format = 2;\n");

      expect(
        staleEvidenceFiles(root, "src", section(head), TEST, new Map(), await reachOf(root)),
      ).toEqual([FORMAT]);
    });

    it("reads the aliases from the config the root one extends", async () => {
      const { root } = await repoWithImports(ALIASED_TEST, {
        "tsconfig.json": '{ "extends": "./tsconfig.base.json" }\n',
        "tsconfig.base.json": '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }\n',
        [FORMAT]: "export const format = 1;\n",
      });

      expect([...(await reachOf(root))].sort()).toEqual([FORMAT, TEST]);
    });

    it("reads jsconfig.json where there is no tsconfig.json", async () => {
      const { root } = await repoWithImports(ALIASED_TEST, {
        "jsconfig.json":
          '{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["src/*"] } } }\n',
        [FORMAT]: "export const format = 1;\n",
      });

      expect([...(await reachOf(root))].sort()).toEqual([FORMAT, TEST]);
    });

    it("still falls back for an alias no pattern matches", async () => {
      const { root } = await repoWithImports(
        'import { format } from "~/lib/format";\nit("formats", () => format);\n',
        { "tsconfig.json": TSCONFIG, [FORMAT]: "export const format = 1;\n" },
      );

      const reach = await observationReach(root, "src", TEST, []);
      expect(reach.kind).toBe("unfollowed");
      expect(reach.kind === "unfollowed" ? reach.reason : "").toContain("~/lib/format");
    });

    it("falls back, naming the pattern, when a matched alias names no file", async () => {
      const { root } = await repoWithImports(
        'import { gone } from "@/lib/gone";\nit("formats", () => gone);\n',
        { "tsconfig.json": TSCONFIG },
      );

      const reach = await observationReach(root, "src", TEST, []);
      expect(reach.kind).toBe("unfollowed");
      expect(reach.kind === "unfollowed" ? reach.reason : "").toContain("`@/*` in tsconfig.json");
    });
  });

  it("falls back when an import's path is computed", async () => {
    const { root } = await repoWithImports(
      'const name = "login";\nit("logs in", async () => import(`../../src/${name}.js`));\n',
    );

    expect((await observationReach(root, "src", TEST, [])).kind).toBe("unfollowed");
  });

  it("falls back when a relative import names no file", async () => {
    const { root } = await repoWithImports(
      'import { gone } from "../../src/gone.js";\nit("logs in", () => gone);\n',
    );

    expect((await observationReach(root, "src", TEST, [])).kind).toBe("unfollowed");
  });

  it("still measures an in-flight row over the whole source directory", async () => {
    // No reach is the in-flight question: the code under test is still being
    // written, so a file the test does not import yet is covered too.
    const { root, head } = await repoWithImports();
    await commit(root, "src/billing.ts", "export const charge = 2;\n");

    expect(staleEvidenceFiles(root, "src", section(head), TEST)).toEqual(["src/billing.ts"]);
  });
});
