/**
 * Spawn-based tests for `scripts/check-shipped-ci-parity.mjs`.
 *
 * The lane asks a change to this repository's CI what the shipped workflow
 * templates do with it. Every row below is a real throwaway repository with a
 * base commit and a head commit, because the whole subject is a diff: a fixture
 * that handed the guard a path list would leave the half CI actually runs —
 * which commits it compares, and which lines inside them — held by nothing.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { markersIn } from "../../../../scripts/check-shipped-ci-parity.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts → tests → packages/qfai → packages → repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/check-shipped-ci-parity.mjs");

const WORKFLOW = ".github/workflows/ci.yml";
const HELPER = "scripts/run-lint-checks.sh";
const ACTION = ".github/actions/setup/action.yml";
const LEDGER = ".github/shipped-ci-dispositions.md";
const SHIPPED = "packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml";

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

/**
 * The guard, with every `GITHUB_*` variable cleared.
 *
 * The suite itself runs inside this repository's CI, where `GITHUB_EVENT_NAME`
 * and `GITHUB_EVENT_PATH` are already set — and the push rows below decide
 * their outcome from exactly those. Inheriting them would make the rows pass or
 * fail according to the event that started the test run.
 */
function runGuard(cwd: string, args: string[] = [], extra: Record<string, string> = {}): RunResult {
  const env: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (name.startsWith("GITHUB_") || name === "BASE_REF" || value === undefined) continue;
    env[name] = value;
  }
  const child = spawnSync("node", [SCRIPT, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...env, ...extra },
  });
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** `null` deletes the path at that commit. */
type Tree = Record<string, string | null>;

async function applyTree(dir: string, tree: Tree): Promise<void> {
  for (const [relative, content] of Object.entries(tree)) {
    const target = path.join(dir, relative);
    if (content === null) {
      await rm(target, { force: true });
      continue;
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

function commit(dir: string, message: string): string {
  spawnSync("git", ["add", "--all"], { cwd: dir, encoding: "utf-8" });
  spawnSync(
    "git",
    [
      "-c",
      "user.email=guard@example.test",
      "-c",
      "user.name=Guard",
      "commit",
      "--quiet",
      "--allow-empty",
      "-m",
      message,
    ],
    { cwd: dir, encoding: "utf-8" },
  );
  return (
    spawnSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf-8" }).stdout?.trim() ?? ""
  );
}

/** A repository whose `main` holds `base` and whose current branch adds `head`. */
async function branchRepo(base: Tree, head: Tree, branch = "feature"): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-shipped-ci-"));
  tempDirs.push(dir);
  spawnSync("git", ["-c", "init.defaultBranch=main", "init", "--quiet"], { cwd: dir });
  await applyTree(dir, base);
  commit(dir, "base");
  spawnSync("git", ["checkout", "--quiet", "-b", branch], { cwd: dir });
  await applyTree(dir, head);
  commit(dir, "head");
  return dir;
}

const BASE_WORKFLOW = [
  "name: CI",
  "jobs:",
  "  lint:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - uses: actions/checkout@1111111111111111111111111111111111111111 # v4.0.0",
  "      - run: pnpm ci:lint",
  "",
].join("\n");

/** One extra step: a structural change, and nothing derived about it. */
const CHANGED_WORKFLOW = BASE_WORKFLOW.replace(
  "      - run: pnpm ci:lint\n",
  "      - run: pnpm ci:lint\n      - run: pnpm check-types\n",
);

const MARKED_WORKFLOW = BASE_WORKFLOW.replace(
  "      - run: pnpm ci:lint\n",
  [
    "      - run: pnpm ci:lint",
    "      # SHIPPED-CI: not-applicable",
    "      # Because: the shipped set has no type-check lane for an adopter to inherit.",
    "      - run: pnpm check-types",
    "",
  ].join("\n"),
);

const manifest = (scans: string): string =>
  `${JSON.stringify(
    { name: "fixture", scripts: { "ci:lint:scans": scans, lint: "eslint ." } },
    null,
    2,
  )}\n`;

const LEDGER_HEADER = [
  "# Shipped CI dispositions",
  "",
  "An entry names the file it is about:",
  "",
  "```text",
  "- SHIPPED-CI: not-applicable for package.json",
  "  Because: <why the shipped templates do not take this change>",
  "```",
  "",
  "## Entries",
  "",
].join("\n");

describe("check-shipped-ci-parity", () => {
  it("refuses a change to this repository's CI that records no disposition", async () => {
    const dir = await branchRepo({ [WORKFLOW]: BASE_WORKFLOW }, { [WORKFLOW]: CHANGED_WORKFLOW });

    const result = runGuard(dir, ["--base", "main"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${WORKFLOW}: this change moves this repository's CI`);
    expect(result.stderr).toContain(`The place: a comment among the lines this change added`);
    expect(result.stderr).toContain("The missing half: the disposition and its reason.");
  });

  it("accepts a disposition with a reason, and prints it", async () => {
    const dir = await branchRepo({ [WORKFLOW]: BASE_WORKFLOW }, { [WORKFLOW]: MARKED_WORKFLOW });

    const result = runGuard(dir, ["--base", "main"]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("1 disposition(s) recorded");
    expect(result.stdout).toContain(`${WORKFLOW}:8  not-applicable`);
    expect(result.stdout).toContain(
      "because: the shipped set has no type-check lane for an adopter to inherit.",
    );
  });

  it("refuses a disposition with no reason, and names the missing half", async () => {
    const bare = BASE_WORKFLOW.replace(
      "      - run: pnpm ci:lint\n",
      "      - run: pnpm ci:lint\n      # SHIPPED-CI: not-applicable\n      - run: pnpm check-types\n",
    );
    const dir = await branchRepo({ [WORKFLOW]: BASE_WORKFLOW }, { [WORKFLOW]: bare });

    const result = runGuard(dir, ["--base", "main"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${WORKFLOW}:8: SHIPPED-CI names a disposition and no reason`);
    expect(result.stderr).toContain("Add a `Because:` line");
  });

  it("refuses a placeholder reason", async () => {
    const placeholder = MARKED_WORKFLOW.replace(
      "      # Because: the shipped set has no type-check lane for an adopter to inherit.",
      "      # Because: TBD",
    );
    const dir = await branchRepo({ [WORKFLOW]: BASE_WORKFLOW }, { [WORKFLOW]: placeholder });

    const result = runGuard(dir, ["--base", "main"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('a placeholder reason ("TBD")');
  });

  it("refuses a disposition outside the closed set", async () => {
    const invented = MARKED_WORKFLOW.replace("not-applicable", "yes");
    const dir = await branchRepo({ [WORKFLOW]: BASE_WORKFLOW }, { [WORKFLOW]: invented });

    const result = runGuard(dir, ["--base", "main"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SHIPPED-CI names "yes"');
    expect(result.stderr).toContain("transferred, not-applicable, deferred");
  });

  it("asks nothing when the shipped templates changed in the same change", async () => {
    const dir = await branchRepo(
      { [WORKFLOW]: BASE_WORKFLOW, [SHIPPED]: "name: QFAI tests\njobs: {}\n" },
      { [WORKFLOW]: CHANGED_WORKFLOW, [SHIPPED]: "name: QFAI tests\njobs:\n  a: {}\n" },
    );

    const result = runGuard(dir, ["--base", "main"]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("the shipped workflow templates changed in the same change");
    expect(result.stdout).toContain(SHIPPED);
  });

  it("asks nothing for a change that only reformats", async () => {
    const reformatted = BASE_WORKFLOW.replace(
      "jobs:",
      "# A comment nobody has to justify\n\njobs:",
    );
    const dir = await branchRepo({ [WORKFLOW]: BASE_WORKFLOW }, { [WORKFLOW]: reformatted });

    const result = runGuard(dir, ["--base", "main"]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("touches none of this repository's CI");
  });

  it("asks nothing for a resealed digest or a bumped action pin", async () => {
    const derived = BASE_WORKFLOW.replace(
      "actions/checkout@1111111111111111111111111111111111111111 # v4.0.0",
      "actions/checkout@2222222222222222222222222222222222222222 # v4.1.0",
    ).replace("jobs:", "jobs: # unchanged\n");
    const dir = await branchRepo(
      {
        [WORKFLOW]: BASE_WORKFLOW,
        [HELPER]: "#!/usr/bin/env bash\nset -eu\npnpm lint\n",
        ".github/pinned-bytes.txt": `${"0".repeat(64)}  scripts/run-lint-checks.sh\n`,
      },
      {
        [WORKFLOW]: BASE_WORKFLOW.replace(
          "actions/checkout@1111111111111111111111111111111111111111 # v4.0.0",
          "actions/checkout@2222222222222222222222222222222222222222 # v4.1.0",
        ),
        [HELPER]: "#!/usr/bin/env bash\nset -eu\npnpm lint\n",
      },
    );
    expect(derived).toBeDefined();

    const result = runGuard(dir, ["--base", "main"]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("touches none of this repository's CI");
  });

  it("asks for a disposition when a NEW action reference appears", async () => {
    const added = BASE_WORKFLOW.replace(
      "      - run: pnpm ci:lint\n",
      "      - uses: actions/cache@3333333333333333333333333333333333333333 # v4.0.0\n      - run: pnpm ci:lint\n",
    );
    const dir = await branchRepo({ [WORKFLOW]: BASE_WORKFLOW }, { [WORKFLOW]: added });

    const result = runGuard(dir, ["--base", "main"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${WORKFLOW}: this change moves this repository's CI`);
  });

  it("watches the composite action and the lint helper, not only the workflows", async () => {
    const base = {
      [ACTION]: "name: setup\nruns:\n  using: composite\n  steps: []\n",
      [HELPER]: "#!/usr/bin/env bash\npnpm lint &\nwait\n",
    };
    for (const [rel, changed] of [
      [ACTION, "name: setup\nruns:\n  using: composite\n  steps: []\n  extra: true\n"],
      [HELPER, "#!/usr/bin/env bash\npnpm lint &\npnpm format:check &\nwait\n"],
    ] as const) {
      const dir = await branchRepo(base, { [rel]: changed });

      const result = runGuard(dir, ["--base", "main"]);

      expect(result.status, `${rel}: ${result.stdout}`).toBe(1);
      expect(result.stderr).toContain(`${rel}: this change moves this repository's CI`);
    }
  });

  it("routes the root manifest to the ledger, because JSON carries no comment", async () => {
    const base = { "package.json": manifest("node ./scripts/a.mjs") };
    const head = { "package.json": manifest("node ./scripts/a.mjs && node ./scripts/b.mjs") };

    const unmarked = await branchRepo(base, head);
    const missing = runGuard(unmarked, ["--base", "main"]);
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain("package.json: this change moves this repository's CI");
    expect(missing.stderr).toContain(`The place: ${LEDGER}, as an entry naming package.json`);

    const marked = await branchRepo(base, {
      ...head,
      [LEDGER]: `${LEDGER_HEADER}- SHIPPED-CI: deferred for package.json\n  Because: the shipped document lane runs the same two checkers and should gain this one next.\n`,
    });
    const result = runGuard(marked, ["--base", "main"]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("deferred for package.json");
  });

  it("reads the manifest by value, so reformatting it is not a lane change", async () => {
    const dir = await branchRepo(
      { "package.json": manifest("node ./scripts/a.mjs") },
      {
        "package.json": JSON.stringify({
          name: "fixture",
          scripts: { "ci:lint:scans": "node ./scripts/a.mjs", lint: "eslint ." },
        }),
      },
    );

    const result = runGuard(dir, ["--base", "main"]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("touches none of this repository's CI");
  });

  it("routes a deleted CI file to the ledger too", async () => {
    const dir = await branchRepo(
      { [WORKFLOW]: BASE_WORKFLOW, ".github/workflows/extra.yml": BASE_WORKFLOW },
      { ".github/workflows/extra.yml": null },
    );

    const result = runGuard(dir, ["--base", "main"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(".github/workflows/extra.yml: this change moves");
    expect(result.stderr).toContain(`The place: ${LEDGER}, as an entry naming`);
  });

  it("does not read the ledger's own worked example as a live disposition", async () => {
    const dir = await branchRepo(
      { "package.json": manifest("node ./scripts/a.mjs") },
      {
        "package.json": manifest("node ./scripts/a.mjs && node ./scripts/b.mjs"),
        [LEDGER]: LEDGER_HEADER,
      },
    );

    const result = runGuard(dir, ["--base", "main"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("package.json: this change moves this repository's CI");
  });

  it("warns and passes when the base cannot be resolved", async () => {
    const dir = await branchRepo({ [WORKFLOW]: BASE_WORKFLOW }, { [WORKFLOW]: CHANGED_WORKFLOW });

    const result = runGuard(dir, ["--base", "no-such-branch"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("'no-such-branch' is not reachable in this clone");
    expect(result.stderr).toContain("was not checked in this run");
  });

  it("says so when the base is HEAD itself, instead of reporting an empty change", async () => {
    const dir = await branchRepo({ [WORKFLOW]: BASE_WORKFLOW }, { [WORKFLOW]: CHANGED_WORKFLOW });
    spawnSync("git", ["branch", "-f", "main", "HEAD"], { cwd: dir });

    const result = runGuard(dir, ["--base", "main"]);

    expect(result.stdout).toContain("HEAD is 'main' itself, so the range is HEAD^..HEAD");
    expect(result.status).toBe(1);
  });

  it("compares a push against the previous head, not against the branch it just moved", async () => {
    // Two commits pushed together, with the CI change in the FIRST. `HEAD^..HEAD`
    // sees only the second, so a range that is not the push's own range reports
    // a change nobody made and passes.
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-shipped-ci-push-"));
    tempDirs.push(dir);
    spawnSync("git", ["-c", "init.defaultBranch=main", "init", "--quiet"], { cwd: dir });
    await applyTree(dir, { [WORKFLOW]: BASE_WORKFLOW });
    const before = commit(dir, "base");
    await applyTree(dir, { [WORKFLOW]: CHANGED_WORKFLOW });
    commit(dir, "the CI change");
    await applyTree(dir, { "README.md": "unrelated\n" });
    commit(dir, "something else");

    const pushed = runGuard(dir, [], {
      GITHUB_EVENT_NAME: "push",
      GITHUB_EVENT_BEFORE: before,
    });
    expect(pushed.stdout).toContain("push event: the range is the previous head to HEAD");
    expect(pushed.status).toBe(1);
    expect(pushed.stderr).toContain(`${WORKFLOW}: this change moves this repository's CI`);
  });

  it("falls back to the parent commit when a push carries no previous head", async () => {
    const dir = await branchRepo({ [WORKFLOW]: BASE_WORKFLOW }, { [WORKFLOW]: CHANGED_WORKFLOW });

    const result = runGuard(dir, [], { GITHUB_EVENT_NAME: "push" });

    expect(result.stdout).toContain("the previous head does not resolve");
    expect(result.status).toBe(1);
  });
});

describe("the marker reader", () => {
  const LIVE = ["# SHIPPED-CI: not-applicable", "# Because: a reason long enough to count here."];

  it("reads a marker out of a watched file", () => {
    expect(markersIn(WORKFLOW, LIVE.join("\n"), new Set([1, 2]))).toHaveLength(1);
  });

  it("reads none out of the rule document, whose example is the specification", () => {
    expect(
      markersIn(".agents/rules/shipped-ci-parity.md", LIVE.join("\n"), new Set([1, 2])),
    ).toEqual([]);
    expect(
      markersIn(".claude/rules/shipped-ci-parity.md", LIVE.join("\n"), new Set([1, 2])),
    ).toEqual([]);
  });

  it("reads none out of a line this change did not add", () => {
    expect(markersIn(WORKFLOW, LIVE.join("\n"), new Set([2]))).toEqual([]);
  });
});
