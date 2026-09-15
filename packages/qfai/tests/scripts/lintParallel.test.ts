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
 * The lane each `pnpm` invocation in the helper stands for, and the short name
 * the stubs below record it under.
 *
 * A closed map, so a lane that is renamed or added reaches the stub's `*` arm
 * and fails the row rather than being run as something the stub understood.
 */
const LANES: ReadonlyArray<readonly [string, string]> = [
  ["-C packages/qfai lint:mirror-surface", "mirror"],
  ["format:check", "format"],
  ["lint", "eslint"],
  ["ci:lint:structure", "structure"],
  ["ci:lint:scans", "scans"],
];

const LANE_NAMES = LANES.map(([, name]) => name);

const laneCases = (): string =>
  LANES.map(([args, name]) => `    "${args}") lane=${name} ;;`).join("\n");

/**
 * A `pnpm` that holds every lane until all of them have started.
 *
 * The barrier is the concurrency oracle: under a serial chain the second lane
 * never starts, so the first one times out and returns 93 rather than the
 * status its row asked for.
 */
const barrierStub = `
LANE_NAMES="${LANE_NAMES.join(" ")}"

pnpm() {
  case "$*" in
${laneCases()}
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
const orderedStub = `
pnpm() {
  case "$*" in
${laneCases()}
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

/** Runs the real helper body under `stub`, in a throwaway directory. */
function runHelper(stub: string, env: Record<string, string>): HelperRun {
  const temp = mkdtempSync(path.join(os.tmpdir(), "qfai-lint-parallel-"));
  try {
    const body = readFileSync(helper, "utf-8");
    const result = spawnSync("bash", ["-c", `${stub}\n${body}`], {
      cwd: temp,
      encoding: "utf-8",
      timeout: 30_000,
      env: { ...process.env, ...env, GITHUB_ACTIONS: "true" },
    });
    expect(result.error).toBeUndefined();
    const calls = readFileSync(path.join(temp, "calls.txt"), "utf-8").trim().split("\n").sort();
    const finished = LANE_NAMES.filter((name) => {
      try {
        readFileSync(path.join(temp, `finished-${name}`), "utf-8");
        return true;
      } catch {
        return false;
      }
    }).sort();
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

/** Every lane invocation, as the helper starts them, in file order. */
function laneInvocations(): string[] {
  return readFileSync(helper, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^pnpm .+ &$/.test(line))
    .map((line) => line.slice(0, -1).trim());
}

function rootScripts(): Record<string, string> {
  const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8")) as {
    scripts: Record<string, string>;
  };
  return manifest.scripts;
}

/**
 * The commands each lane runs, resolved one level: a lane naming a `ci:lint:*`
 * aggregate expands to that aggregate's serial chain, and a lane naming a
 * single command stays as it is.
 */
function laneCommands(): string[][] {
  const scripts = rootScripts();
  return laneInvocations().map((invocation) => {
    const name = invocation.slice("pnpm ".length);
    if (!name.startsWith("ci:lint:")) {
      return [invocation];
    }
    const body = scripts[name];
    if (body === undefined) {
      throw new Error(`the helper starts ${invocation}, which the root manifest does not declare`);
    }
    return body.split(" && ");
  });
}

/**
 * Every command the lint gate runs, as one lane-independent set.
 *
 * This is the conservation obligation: a command dropped anywhere fails this
 * list, whichever lane it used to sit in. The per-lane grouping is pinned
 * separately, so regrouping touches that assertion and never this one.
 */
const CONSERVED_COMMANDS: readonly string[] = [
  "pnpm -C packages/qfai lint:mirror-surface",
  "pnpm format:check",
  "pnpm lint",
  "pnpm lint:md",
  "pnpm lint:mermaid",
  "pnpm lint:mdschema",
  "pnpm -C packages/qfai lint:shipping",
  "pnpm -C packages/qfai lint:workflow-shape",
  "node ./scripts/check-bidi.mjs",
  "node ./scripts/check-conflict-markers.mjs",
  "node ./scripts/check-tracked-scratch.mjs",
  "node ./scripts/check-readme-alignment.mjs",
  "node ./scripts/check-instructions-size.mjs",
  "node ./scripts/check-review-profile-consistency.mjs",
  "node ./scripts/check-prompt-scanner-pair.mjs",
  "node ./scripts/check-doc-clarity.mjs",
  "node ./scripts/check-simplification-ledger.mjs",
  "node ./scripts/check-atdd-annotation-ledger.mjs --spec 0017",
  "node ./packages/qfai/scripts/check-pack-locations.mjs",
];

describe("lint parallel execution", () => {
  it.each([
    [{}, 0],
    [{ STATUS_mirror: "2" }, 1],
    [{ STATUS_format: "7" }, 1],
    [{ STATUS_eslint: "143" }, 1],
    [{ STATUS_structure: "1" }, 1],
    [{ STATUS_scans: "3" }, 1],
    [{ STATUS_format: "2", STATUS_scans: "7" }, 1],
    [{ STATUS_mirror: "5", STATUS_eslint: "5", STATUS_structure: "5" }, 1],
  ])("awaits every concurrent lane with statuses %j and returns %i", (statuses, expected) => {
    const env: Record<string, string> = {};
    for (const name of LANE_NAMES) {
      env[`STATUS_${name}`] = "0";
    }
    const run = runHelper(barrierStub, { ...env, ...statuses });
    expect(run.status, run.output).toBe(expected);
    expect(run.calls).toEqual(LANES.map(([args]) => args).sort());
    // Every lane reached its end, so no lane was abandoned when another failed.
    expect(run.finished).toEqual([...LANE_NAMES].sort());
  });

  it.each(LANE_NAMES.flatMap((lane) => [[lane, "early"] as const, [lane, "late"] as const]))(
    "a %s lane failing %s still reaches the gate's exit status",
    (lane, when) => {
      const run = runHelper(orderedStub, {
        FAILING_LANE: lane,
        FAIL_WHEN: when,
        FAIL_STATUS: "42",
        LANE_SLEEP: "0.4",
      });
      expect(run.status, run.output).toBe(1);
      expect(run.calls).toEqual(LANES.map(([args]) => args).sort());
      expect(run.finished).toEqual([...LANE_NAMES].sort());
    },
  );

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
      "packages/qfai#lint:mirror-surface",
      "packages/qfai#prelint:mirror-surface",
    ]) {
      expect(
        bodies.some(([name]) => name === key),
        `${key} is not reachable from pnpm ci:lint`,
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

  it("retains every static lint command exactly once", () => {
    const flattened = laneCommands().flat();
    expect(flattened.length, "a command is named by two lanes").toBe(new Set(flattened).size);
    expect([...flattened].sort()).toEqual([...CONSERVED_COMMANDS].sort());
  });

  it("groups the retained commands into the measured lanes", () => {
    expect(laneCommands()).toEqual([
      ["pnpm -C packages/qfai lint:mirror-surface"],
      ["pnpm format:check"],
      ["pnpm lint"],
      [
        "pnpm lint:md",
        "pnpm lint:mermaid",
        "pnpm lint:mdschema",
        "pnpm -C packages/qfai lint:shipping",
        "pnpm -C packages/qfai lint:workflow-shape",
      ],
      [
        "node ./scripts/check-bidi.mjs",
        "node ./scripts/check-conflict-markers.mjs",
        "node ./scripts/check-tracked-scratch.mjs",
        "node ./scripts/check-readme-alignment.mjs",
        "node ./scripts/check-instructions-size.mjs",
        "node ./scripts/check-review-profile-consistency.mjs",
        "node ./scripts/check-prompt-scanner-pair.mjs",
        "node ./scripts/check-doc-clarity.mjs",
        "node ./scripts/check-simplification-ledger.mjs",
        "node ./scripts/check-atdd-annotation-ledger.mjs --spec 0017",
        "node ./packages/qfai/scripts/check-pack-locations.mjs",
      ],
    ]);
    // The lane set the stubs above understand is the lane set the helper starts.
    expect(laneInvocations()).toEqual(LANES.map(([args]) => `pnpm ${args}`));
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
});
