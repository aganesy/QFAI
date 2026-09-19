import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { invokedScriptBodies } from "../../../../scripts/check-workflow-hygiene.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const helper = path.join(root, "scripts/run-lint-checks.sh");

/**
 * One lane profile: the argument that selects it, the lanes it starts, and what
 * each lane runs.
 *
 * Two profiles, because two aggregates run overlapping but unequal sets of these
 * checks. The alternative was a second helper, which is a second copy of the
 * wait-and-collect loop — the drift a single helper exists to prevent.
 */
interface Profile {
  readonly name: string;
  /**
   * The arguments of each `pnpm` invocation, and the short name the stubs record
   * it under.
   *
   * A CLOSED map, so a lane that is renamed or added reaches the stub's `*` arm
   * and fails the row rather than being run as something the stub understood.
   */
  readonly lanes: ReadonlyArray<readonly [string, string]>;
  /**
   * Every command the profile runs, as one lane-independent set.
   *
   * This is the conservation obligation: a command dropped anywhere fails this
   * list, whichever lane it used to sit in. The per-lane grouping is pinned
   * separately, so regrouping touches that assertion and never this one.
   */
  readonly conserved: readonly string[];
  /** The same commands, grouped as the measured lanes group them. */
  readonly groups: readonly (readonly string[])[];
}

const LINT_PROFILE: Profile = {
  name: "lint",
  lanes: [
    ["format:check", "format"],
    ["lint", "eslint"],
    ["ci:lint:structure", "structure"],
    ["ci:lint:scans", "scans"],
  ],
  conserved: [
    "pnpm format:check",
    "pnpm lint",
    "pnpm lint:md",
    "pnpm -C packages/qfai lint:md:shipped",
    "pnpm lint:mermaid",
    "pnpm lint:mdschema",
    "pnpm -C packages/qfai lint:shipping",
    "pnpm -C packages/qfai lint:workflow-shape",
    "node ./scripts/link-assistant-tree.mjs --check",
    "node ./scripts/check-bidi.mjs",
    "node ./scripts/check-conflict-markers.mjs",
    "node ./scripts/check-tracked-scratch.mjs",
    "node ./scripts/check-tracked-symlinks.mjs",
    "node ./scripts/check-tracked-readmes.mjs",
    "node ./scripts/check-readme-alignment.mjs",
    "node ./scripts/check-instructions-size.mjs",
    "node ./scripts/check-review-profile-consistency.mjs",
    "node ./scripts/check-prompt-scanner-pair.mjs",
    "node ./scripts/check-shipped-ci-parity.mjs",
    "node ./scripts/check-doc-clarity.mjs",
    "node ./scripts/check-simplification-ledger.mjs",
    "node ./scripts/check-atdd-annotation-ledger.mjs --spec 0017",
    "node ./packages/qfai/scripts/check-pack-locations.mjs",
  ],
  groups: [
    ["pnpm format:check"],
    ["pnpm lint"],
    [
      "pnpm lint:md",
      "pnpm -C packages/qfai lint:md:shipped",
      "pnpm lint:mermaid",
      "pnpm lint:mdschema",
      "pnpm -C packages/qfai lint:shipping",
      "pnpm -C packages/qfai lint:workflow-shape",
    ],
    [
      "node ./scripts/link-assistant-tree.mjs --check",
      "node ./scripts/check-bidi.mjs",
      "node ./scripts/check-conflict-markers.mjs",
      "node ./scripts/check-tracked-scratch.mjs",
      "node ./scripts/check-tracked-symlinks.mjs",
      "node ./scripts/check-tracked-readmes.mjs",
      "node ./scripts/check-readme-alignment.mjs",
      "node ./scripts/check-instructions-size.mjs",
      "node ./scripts/check-review-profile-consistency.mjs",
      "node ./scripts/check-prompt-scanner-pair.mjs",
      "node ./scripts/check-shipped-ci-parity.mjs",
      "node ./scripts/check-doc-clarity.mjs",
      "node ./scripts/check-simplification-ledger.mjs",
      "node ./scripts/check-atdd-annotation-ledger.mjs --spec 0017",
      "node ./packages/qfai/scripts/check-pack-locations.mjs",
    ],
  ],
};

/**
 * The release profile, which is not the lint profile with a filter.
 *
 * The two shipped-surface gates are absent because their home is the pull-request
 * aggregate: a divergence they catch has to red a pull request, and one caught
 * here arrives after the pull request is already green. The mirror lane is absent
 * from both profiles now — it runs in a job of its own, for the same reason and
 * on a runner nothing else contends for.
 */
const GATE_PROFILE: Profile = {
  name: "gate",
  lanes: [
    ["format:check", "format"],
    ["lint", "eslint"],
    ["ci:gate:structure", "structure"],
    ["ci:gate:scans", "scans"],
  ],
  conserved: [
    "pnpm format:check",
    "pnpm lint",
    "pnpm lint:md",
    "pnpm -C packages/qfai lint:md:shipped",
    "pnpm lint:mermaid",
    "pnpm lint:mdschema",
    "node ./scripts/check-bidi.mjs",
    "node ./scripts/check-readme-alignment.mjs",
    "node ./scripts/check-instructions-size.mjs",
  ],
  groups: [
    ["pnpm format:check"],
    ["pnpm lint"],
    [
      "pnpm lint:md",
      "pnpm -C packages/qfai lint:md:shipped",
      "pnpm lint:mermaid",
      "pnpm lint:mdschema",
    ],
    [
      "node ./scripts/check-bidi.mjs",
      "node ./scripts/check-readme-alignment.mjs",
      "node ./scripts/check-instructions-size.mjs",
    ],
  ],
};

const PROFILES: readonly Profile[] = [LINT_PROFILE, GATE_PROFILE];

const laneNames = (profile: Profile): string[] => profile.lanes.map(([, name]) => name);

const laneCases = (profile: Profile): string =>
  profile.lanes.map(([args, name]) => `    "${args}") lane=${name} ;;`).join("\n");

/**
 * A `pnpm` that holds every lane until all of them have started.
 *
 * The barrier is the concurrency oracle: under a serial chain the second lane
 * never starts, so the first one times out and returns 93 rather than the
 * status its row asked for.
 */
const barrierStub = (profile: Profile): string => `
LANE_NAMES="${laneNames(profile).join(" ")}"

pnpm() {
  case "$*" in
${laneCases(profile)}
    *) return 94 ;;
  esac
  printf '%s\\n' "$*" >> calls.txt
  touch "started-$lane"
  for attempt in {1..400}; do
    pending=0
    for other in $LANE_NAMES; do
      if [ ! -f "started-$other" ]; then pending=1; fi
    done
    if [ "$pending" = 0 ]; then break; fi
    sleep 0.02
  done
  for other in $LANE_NAMES; do
    if [ ! -f "started-$other" ]; then return 93; fi
  done
  touch "finished-$lane"
  status_var="STATUS_$lane"
  return "\${!status_var}"
}
`;

/**
 * A `pnpm` with no barrier, so one lane can fail while the others are still
 * being started (`early`) or long after they have all finished (`late`).
 *
 * The two orderings are separate rows because they fail the helper at different
 * points: `early` returns before the remaining lanes have been spawned at all,
 * and `late` returns after every other child has already been reaped.
 */
const orderedStub = (profile: Profile): string => `
pnpm() {
  case "$*" in
${laneCases(profile)}
    *) return 94 ;;
  esac
  printf '%s\\n' "$*" >> calls.txt
  if [ "$lane" = "$FAILING_LANE" ]; then
    if [ "$FAIL_WHEN" = late ]; then sleep "$LANE_SLEEP"; fi
    touch "finished-$lane"
    return "$FAIL_STATUS"
  fi
  if [ "$FAIL_WHEN" = early ]; then sleep "$LANE_SLEEP"; fi
  touch "finished-$lane"
  return 0
}
`;

interface HelperRun {
  readonly status: number | null;
  readonly calls: string[];
  readonly finished: string[];
  readonly output: string;
}

/**
 * Runs the real helper body under `stub`, in a throwaway directory.
 *
 * `argv` is what follows the script name, so a caller can exercise the DEFAULT
 * by passing none. `bash -c <body> <$0> <$1…>` is how the arguments reach a
 * body read from a file.
 */
function runHelper(
  profile: Profile,
  stub: string,
  env: Record<string, string>,
  argv: readonly string[] = [profile.name],
): HelperRun {
  const temp = mkdtempSync(path.join(os.tmpdir(), "qfai-lint-parallel-"));
  try {
    const body = readFileSync(helper, "utf-8");
    const result = spawnSync("bash", ["-c", `${stub}\n${body}`, "run-lint-checks", ...argv], {
      cwd: temp,
      encoding: "utf-8",
      timeout: 30_000,
      env: { ...process.env, ...env, GITHUB_ACTIONS: "true" },
    });
    expect(result.error).toBeUndefined();
    const calls = readFileSync(path.join(temp, "calls.txt"), "utf-8").trim().split("\n").sort();
    const finished = laneNames(profile)
      .filter((name) => {
        try {
          readFileSync(path.join(temp, `finished-${name}`), "utf-8");
          return true;
        } catch {
          return false;
        }
      })
      .sort();
    return {
      status: result.status,
      calls,
      finished,
      output: `${result.stdout}\n${result.stderr}`,
    };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

/** The helper's source, as lines. */
function helperLines(): string[] {
  return readFileSync(helper, "utf-8").split("\n");
}

/** Whether a line starts a lane in the background. */
const startsALane = (line: string): boolean => /^pnpm .+ &$/.test(line.trim());

/** The lines of one profile's `case` arm, between its pattern and its `;;`. */
function profileBlock(name: string): string[] {
  const lines = helperLines();
  const start = lines.findIndex((line) => line.trim() === `${name})`);
  if (start < 0) throw new Error(`the helper declares no \`${name}\` profile`);
  const end = lines.findIndex((line, index) => index > start && line.trim() === ";;");
  if (end < 0) throw new Error(`the helper's \`${name}\` profile is not terminated`);
  return lines.slice(start + 1, end);
}

/** Every lane invocation one profile starts, in file order. */
function laneInvocations(name: string): string[] {
  return profileBlock(name)
    .map((line) => line.trim())
    .filter(startsALane)
    .map((line) => line.slice(0, -1).trim());
}

function rootScripts(): Record<string, string> {
  const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8")) as {
    scripts: Record<string, string>;
  };
  return manifest.scripts;
}

/**
 * The commands one profile's lanes run, resolved one level: a lane naming an
 * aggregate expands to that aggregate's serial chain, and a lane naming a single
 * command stays as it is.
 */
function laneCommands(name: string): string[][] {
  const scripts = rootScripts();
  return laneInvocations(name).map((invocation) => {
    const script = invocation.slice("pnpm ".length);
    if (!script.startsWith("ci:lint:") && !script.startsWith("ci:gate:")) {
      return [invocation];
    }
    const body = scripts[script];
    if (body === undefined) {
      throw new Error(`the helper starts ${invocation}, which the root manifest does not declare`);
    }
    return body.split(" && ");
  });
}

interface StatusRow {
  readonly first?: string;
  readonly last?: string;
}

for (const profile of PROFILES) {
  describe(`lint parallel execution (${profile.name} profile)`, () => {
    it.each<[StatusRow, number]>([
      [{}, 0],
      [{ first: "2" }, 1],
      [{ last: "7" }, 1],
      [{ first: "5", last: "5" }, 1],
    ])("awaits every concurrent lane with statuses %j and returns %i", (statuses, expected) => {
      const names = laneNames(profile);
      const env: Record<string, string> = {};
      for (const name of names) env[`STATUS_${name}`] = "0";
      // Named by POSITION, so one row covers profiles whose lane sets differ. The
      // per-lane sweep below is what covers each lane individually.
      const first = names[0];
      const last = names[names.length - 1];
      if (statuses.first !== undefined && first !== undefined) {
        env[`STATUS_${first}`] = statuses.first;
      }
      if (statuses.last !== undefined && last !== undefined) {
        env[`STATUS_${last}`] = statuses.last;
      }
      const run = runHelper(profile, barrierStub(profile), env);
      expect(run.status, run.output).toBe(expected);
      expect(run.calls).toEqual(profile.lanes.map(([args]) => args).sort());
      // Every lane reached its end, so no lane was abandoned when another failed.
      expect(run.finished).toEqual([...names].sort());
    });

    it("lets any single lane's failure reach the exit status", () => {
      const names = laneNames(profile);
      for (const failing of names) {
        const env: Record<string, string> = {};
        for (const name of names) env[`STATUS_${name}`] = "0";
        env[`STATUS_${failing}`] = "3";
        const run = runHelper(profile, barrierStub(profile), env);
        expect(run.status, `${failing}: ${run.output}`).toBe(1);
        expect(run.finished).toEqual([...names].sort());
      }
    });

    it.each(
      laneNames(profile).flatMap((lane) => [[lane, "early"] as const, [lane, "late"] as const]),
    )("a %s lane failing %s still reaches the gate's exit status", (lane, when) => {
      const run = runHelper(profile, orderedStub(profile), {
        FAILING_LANE: lane,
        FAIL_WHEN: when,
        FAIL_STATUS: "42",
        LANE_SLEEP: "0.4",
      });
      expect(run.status, run.output).toBe(1);
      expect(run.calls).toEqual(profile.lanes.map(([args]) => args).sort());
      expect(run.finished).toEqual([...laneNames(profile)].sort());
    });

    it("retains every static command exactly once", () => {
      const flattened = laneCommands(profile.name).flat();
      expect(flattened.length, "a command is named by two lanes").toBe(new Set(flattened).size);
      expect([...flattened].sort()).toEqual([...profile.conserved].sort());
    });

    it("groups the retained commands into the measured lanes", () => {
      expect(laneCommands(profile.name)).toEqual(profile.groups.map((group) => [...group]));
      // The lane set the stubs above understand is the lane set the helper starts.
      expect(laneInvocations(profile.name)).toEqual(profile.lanes.map(([args]) => `pnpm ${args}`));
    });
  });
}

describe("the lane profile", () => {
  it("starts no lane outside a declared profile", () => {
    // Every background lane in the file belongs to a profile this suite knows. A
    // lane added outside the `case` would run on every profile and be covered by
    // none of the rows above, which is the one shape a per-profile reader cannot
    // see.
    const inFile = helperLines().filter(startsALane).length;
    const inProfiles = PROFILES.reduce(
      (total, profile) => total + laneInvocations(profile.name).length,
      0,
    );
    expect(inFile, "a lane is started outside every declared profile").toBe(inProfiles);
  });

  it("defaults to the lint profile, so the pull-request aggregate needs no argument", () => {
    const env: Record<string, string> = {};
    for (const name of laneNames(LINT_PROFILE)) env[`STATUS_${name}`] = "0";
    // NO argument, which is the whole subject of this row: `pnpm ci:lint` passes
    // none, so a default that stopped working would leave the pull-request
    // aggregate exiting 2 with nothing run.
    const run = runHelper(LINT_PROFILE, barrierStub(LINT_PROFILE), env, []);
    expect(run.status, run.output).toBe(0);
    expect(run.calls).toEqual(LINT_PROFILE.lanes.map(([args]) => args).sort());
  });

  it("refuses an unknown profile instead of running nothing and reporting success", () => {
    // The failure this rejects is silent: a `case` with no `*` arm falls through,
    // the `pids` array stays empty, every `wait` is skipped and the helper exits
    // 0 having run no check at all.
    const temp = mkdtempSync(path.join(os.tmpdir(), "qfai-lint-profile-"));
    try {
      const body = readFileSync(helper, "utf-8");
      const result = spawnSync("bash", ["-c", body, "run-lint-checks", "typo"], {
        cwd: temp,
        encoding: "utf-8",
        timeout: 30_000,
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(2);
      expect(`${result.stdout}${result.stderr}`).toContain("typo");
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
});

describe("script resolution through the helper", () => {
  it("keeps workflow hygiene ahead of every independent lane", () => {
    expect(rootScripts()["ci:lint"]).toBe(
      "node ./scripts/check-workflow-hygiene.mjs --report-dir .qfai/review/workflow-hygiene && bash ./scripts/run-lint-checks.sh",
    );
    const bodies = invokedScriptBodies("pnpm ci:lint", root);
    for (const key of [
      ".#ci:lint:structure",
      ".#preci:lint:structure",
      ".#ci:lint:scans",
      ".#preci:lint:scans",
      ".#format:check",
      ".#lint",
    ]) {
      expect(
        bodies.some(([name]) => name === key),
        `${key} is not reachable from pnpm ci:lint`,
      ).toBe(true);
    }
  });

  it("resolves the mirror lane through the command its own job runs", () => {
    // The lane left the aggregate for a runner of its own, so `pnpm ci:lint` no longer
    // reaches it. Its body still has to be reachable from something: a workflow's
    // verification digest covers the package scripts a step invokes, and a lane nothing
    // resolves is a lane whose body no digest covers. What resolves it now is the step
    // command in the `mirror-surface` job, which is what this row reads.
    const bodies = invokedScriptBodies("pnpm -C packages/qfai lint:mirror-surface", root);
    for (const key of [
      "packages/qfai#lint:mirror-surface",
      "packages/qfai#prelint:mirror-surface",
    ]) {
      expect(
        bodies.some(([name]) => name === key),
        `${key} is not reachable from the mirror-surface job's step`,
      ).toBe(true);
    }
  });

  it("resolves the release profile's lanes through the same helper", () => {
    // The lanes are written out as literal `pnpm <script>` lines rather than read
    // from a list because THIS is what reads them: a workflow's verification
    // digest covers the package scripts a step invokes, and a lane reached
    // through a variable is a lane whose body no digest covers.
    const bodies = invokedScriptBodies("pnpm ci:gate:checks", root);
    for (const key of [
      ".#ci:gate:structure",
      ".#preci:gate:structure",
      ".#ci:gate:scans",
      ".#preci:gate:scans",
      ".#format:check",
      ".#lint",
      ".#check-types",
      ".#verify:pack",
    ]) {
      expect(
        bodies.some(([name]) => name === key),
        `${key} is not reachable from pnpm ci:gate:checks`,
      ).toBe(true);
    }
  });

  it("pins package scripts reached through a local Bash helper, including absent hooks", () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), "qfai-lint-pin-"));
    try {
      mkdirSync(path.join(temp, "scripts"));
      writeFileSync(
        path.join(temp, "package.json"),
        JSON.stringify({ scripts: { check: "node check.mjs" } }),
      );
      const script = path.join(temp, "scripts/checks.sh");
      writeFileSync(script, "pnpm check &\nwait\n");
      const run = "bash ./scripts/checks.sh";
      expect(invokedScriptBodies(run, temp)).toContainEqual([".#check", "node check.mjs"]);
      expect(invokedScriptBodies(run, temp)).toContainEqual([".#precheck", null]);
      writeFileSync(script, "true\n");
      expect(invokedScriptBodies(run, temp).some(([key]) => key === ".#check")).toBe(false);
      rmSync(script);
      expect(invokedScriptBodies(run, temp)).toContainEqual([".#bash:scripts/checks.sh", null]);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  it("bounds Bash traversal and records unreadable helpers without following them", () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), "qfai-lint-bounds-"));
    try {
      mkdirSync(path.join(temp, "scripts"));
      const script = path.join(temp, "scripts/checks.sh");
      writeFileSync(script, "bash ./scripts/checks.sh\n");
      expect(invokedScriptBodies("bash ./scripts/checks.sh", temp)).toHaveLength(1);
      expect(invokedScriptBodies("bash ./scripts/../outside.sh", temp)).toEqual([]);
      writeFileSync(script, "x".repeat(1_048_577));
      expect(invokedScriptBodies("bash ./scripts/checks.sh", temp)).toEqual([
        [".#bash:scripts/checks.sh", null],
      ]);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  /**
   * The lanes start together, so one lane's temporary files are in the tree while
   * another lane walks it. Vitest writes a bundle beside a TypeScript config while
   * it loads one and deletes it straight after, and the formatting check listed that
   * file and then failed to read it — a red job that depended on timing and on
   * nothing the change contained.
   *
   * Asserted through `--file-info`, which answers for a path rather than for a file,
   * so the case needs no file on disk and no race of its own to reproduce. The
   * control path is asserted beside it: an ignore rule that swallowed the config
   * itself would satisfy the first expectation on its own.
   */
  it("keeps the formatting check off the bundle vitest writes while loading a config", () => {
    const fileInfo = (relative: string): { ignored?: boolean } => {
      const result = spawnSync("npx", ["prettier", "--file-info", relative], {
        cwd: root,
        encoding: "utf-8",
        shell: process.platform === "win32",
      });
      expect(result.status, result.stderr).toBe(0);
      const parsed: unknown = JSON.parse(result.stdout);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error(`prettier --file-info did not answer with an object: ${result.stdout}`);
      }
      return parsed;
    };

    expect(
      fileInfo("packages/qfai/vitest.config.ts.timestamp-1789704611720-073b9378a4c25.mjs").ignored,
    ).toBe(true);
    expect(fileInfo("packages/qfai/vitest.config.ts").ignored).toBe(false);
  });
});
