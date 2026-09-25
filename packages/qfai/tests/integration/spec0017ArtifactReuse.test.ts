/**
 * `BR-0017-0029`, as the conditional it is written as.
 *
 * ## What changed, and why it is not a weakening
 *
 * `TC-0017-0032` used to assert "the bundler invocation count **falls** against the recorded
 * baseline" — flatly, as an outcome. Its own business rule does not say that:
 *
 * > **When artifact reuse is adopted**, the bundler build MUST be produced once, uploaded, and
 * > downloaded by the matrix legs that rebuild today, and the recorded bundler-invocation count MUST
 * > fall against the captured baseline.
 *
 * The rule is a conditional and the case asserted its consequent, so the case could only be satisfied
 * by taking a branch `DR-0017-0002` explicitly says is optional — "the requirement is satisfied by
 * **either** landing the reuse (`AC-0017-0014`) **or** recording a measurement that shows a wall-clock
 * regression and keeping the rebuilds (`AC-0017-0015`)". A case that cannot be true unless one of two
 * permitted branches is chosen is not a test of the rule; it is a vote for the branch.
 *
 * `CR-20260823-0004`, approved 2026-08-23, option 3. The case now asserts the rule.
 *
 * **This does not say artifact reuse is done.** It is not: no leg downloads the build, no baseline has
 * been captured, and the requirement stays open in `10_Plan.md` and in `09_delta.md`'s follow-ups. What
 * this row now guarantees is that the day someone adopts reuse, they cannot adopt it without the
 * numbers — which is what `BR-0017-0030` asks for and what the old formulation could not check,
 * because it was red either way.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const CI = path.join(REPO_ROOT, ".github", "workflows", "ci.yml");
const ROOT_MANIFEST = path.join(REPO_ROOT, "package.json");

/**
 * The two builds the pack-verification lifecycle fires today. Artifact reuse cannot remove them, so
 * adopting it must leave this count as it is.
 */
const PACK_LIFECYCLE_BUILDS = 2;

/**
 * The helpers that reach `prepack -> npm run build`, and the npm call in each that does it.
 *
 * A `run:` line cannot show a build spawned inside a helper, so the helpers are named here and the
 * test reads each one's source for its call. A helper that stops making the call fails the case
 * rather than going on counting as a build.
 */
const PACK_LIFECYCLE_HELPERS = [
  { script: "scripts/verify-pack.mjs", call: 'execFileSync("npm", ["pack"]' },
  { script: "scripts/check-publish-dry-run.mjs", call: 'runNpm(["publish", "--dry-run"]' },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface ReuseState {
  /** Matrix slices that invoke the bundler themselves. */
  readonly rebuildLegs: readonly string[];
  /** Steps in the test job that take the build from an artifact instead. */
  readonly downloadSteps: readonly string[];
  /** Builds the pack-verification lifecycle fires; outside reuse's reach (DTC-19). */
  readonly packLifecycleBuilds: number;
}

/**
 * `BR-0017-0029`. Vacuous while nothing downloads, and exact the moment something does.
 *
 * The `before`/`after` pair is an input rather than something read here: the numbers live in the
 * decision record and the pull-request description, per `BR-0017-0030`, and whoever adopts reuse is
 * the party that measured them.
 */
export function reuseRuleHolds(input: {
  readonly state: ReuseState;
  readonly recordedBefore: number | null;
  readonly recordedAfter: number | null;
}): { readonly holds: boolean; readonly reason: string } {
  const { state } = input;
  if (state.downloadSteps.length === 0) {
    return {
      holds: true,
      reason: "artifact reuse is not adopted, so the rule imposes nothing yet",
    };
  }
  if (state.rebuildLegs.length > 0) {
    return {
      holds: false,
      reason:
        `reuse is adopted but ${state.rebuildLegs.join(", ")} still invoke the bundler, so the build ` +
        "is not produced once",
    };
  }
  if (input.recordedBefore === null || input.recordedAfter === null) {
    return { holds: false, reason: "reuse is adopted with no recorded before-and-after count" };
  }
  if (input.recordedAfter >= input.recordedBefore) {
    return {
      holds: false,
      reason:
        `the recorded count did not fall: ${String(input.recordedBefore)} -> ` +
        String(input.recordedAfter),
    };
  }
  if (state.packLifecycleBuilds !== PACK_LIFECYCLE_BUILDS) {
    return {
      holds: false,
      reason:
        "the pack-verification lifecycle's builds are outside reuse's reach and must be unchanged; " +
        `expected ${String(PACK_LIFECYCLE_BUILDS)}, found ${String(state.packLifecycleBuilds)}`,
    };
  }
  return { holds: true, reason: "the build is produced once and the recorded count fell" };
}

/**
 * The leaf commands a `run:` line reaches, with every `pnpm <script>` resolved through the root
 * manifest's scripts. A script already being expanded is left as a leaf, so a cycle ends.
 */
export function expandRootScripts(
  command: string,
  scripts: Readonly<Record<string, string>>,
  expanding: ReadonlySet<string> = new Set(),
): string[] {
  const leaves: string[] = [];
  for (const raw of command.split("&&")) {
    const segment = raw.trim();
    if (segment === "") continue;
    const name = /^pnpm\s+(?:run\s+)?([\w:.-]+)$/.exec(segment)?.[1];
    const body = name !== undefined && Object.hasOwn(scripts, name) ? scripts[name] : undefined;
    if (name === undefined || body === undefined || expanding.has(name)) {
      leaves.push(segment);
      continue;
    }
    leaves.push(...expandRootScripts(body, scripts, new Set([...expanding, name])));
  }
  return leaves;
}

/** How many pack-lifecycle builds a `run:` line fires, once its root scripts are resolved. */
export function countPackLifecycleBuilds(
  command: string,
  scripts: Readonly<Record<string, string>>,
): number {
  return expandRootScripts(command, scripts).filter((leaf) => {
    const [runner, target] = leaf.split(/\s+/);
    const script = target?.replace(/^\.\//, "");
    return runner === "node" && PACK_LIFECYCLE_HELPERS.some((helper) => helper.script === script);
  }).length;
}

async function readRootScripts(): Promise<Record<string, string>> {
  const manifest: unknown = JSON.parse(await readFile(ROOT_MANIFEST, "utf8"));
  const scripts = isRecord(manifest) && isRecord(manifest["scripts"]) ? manifest["scripts"] : {};
  const out: Record<string, string> = {};
  for (const [name, body] of Object.entries(scripts)) {
    if (typeof body === "string") out[name] = body;
  }
  return out;
}

async function readState(): Promise<ReuseState> {
  const parsed: unknown = parseYaml(await readFile(CI, "utf8"));
  const jobs = isRecord(parsed) && isRecord(parsed["jobs"]) ? parsed["jobs"] : {};

  const stepsOf = (job: unknown): Record<string, unknown>[] => {
    if (!isRecord(job) || !Array.isArray(job["steps"])) return [];
    return job["steps"].filter(isRecord);
  };

  const rebuildLegs: string[] = [];
  const downloadSteps: string[] = [];
  for (const step of stepsOf(jobs["test"])) {
    const run = typeof step["run"] === "string" ? step["run"] : "";
    const uses = typeof step["uses"] === "string" ? step["uses"] : "";
    if (/packages\/qfai\s+build\b/.test(run)) {
      // The slices the build step is conditioned on. An UNCONDITIONAL build step means every slice
      // rebuilds, which is why the fallback is the whole matrix rather than an empty list.
      const guard = typeof step["if"] === "string" ? step["if"] : "";
      const named = [...guard.matchAll(/matrix\.slice\s*==\s*'([a-z0-9-]+)'/g)].map(
        (m) => m[1] ?? "",
      );
      rebuildLegs.push(...(named.length > 0 ? named : ["<every slice>"]));
    }
    if (/^actions\/download-artifact@/.test(uses)) {
      downloadSteps.push(typeof step["name"] === "string" ? step["name"] : uses);
    }
  }

  const scripts = await readRootScripts();
  let packLifecycleBuilds = 0;
  for (const step of stepsOf(jobs["build"])) {
    const run = typeof step["run"] === "string" ? step["run"] : "";
    packLifecycleBuilds += countPackLifecycleBuilds(run, scripts);
  }

  return { rebuildLegs: rebuildLegs.sort(), downloadSteps, packLifecycleBuilds };
}

// QFAI:SPEC-0017:TC-0017-0032
describe("the build-artifact reuse rule holds, and holds vacuously until reuse is adopted", () => {
  it("names the legs that would change, and binds the numbers to the moment one of them downloads", async () => {
    const state = await readState();

    // Non-vacuity, and the reason an empty `downloadSteps` means anything at all: the same emptiness
    // is what a scan that read the wrong job produces. Naming the legs proves the scan found the
    // build steps it is reasoning about.
    expect(
      state.rebuildLegs,
      "these are the legs artifact reuse would convert into downloads; a scan that cannot see them " +
        "would report reuse adopted the moment it was not",
    ).toEqual(["e2e", "integration"]);
    // The helpers are named rather than followed, so each one's call is read here: a helper that
    // stopped packing would otherwise go on counting as a build.
    for (const { script, call } of PACK_LIFECYCLE_HELPERS) {
      expect(
        await readFile(path.join(REPO_ROOT, script), "utf8"),
        `${script} must still fire the pack lifecycle for its leaf to count as a build`,
      ).toContain(call);
    }
    expect(
      state.packLifecycleBuilds,
      "the pack-verification lifecycle's builds are outside reuse's reach (DTC-19) and are the " +
        "baseline half that must not move: the build job's steps, resolved through the root scripts, " +
        "reach both of them",
    ).toBe(PACK_LIFECYCLE_BUILDS);

    // Removing one lifecycle build from the root script the build job calls must change the count.
    // The step's own `run:` line is the same either way, which is why the scripts are resolved.
    const scripts = await readRootScripts();
    const buildVerify = scripts["ci:build-verify"] ?? "";
    expect(buildVerify, "the build job's script must still call the pack verification").toContain(
      "pnpm verify:pack && ",
    );
    expect(
      countPackLifecycleBuilds("pnpm ci:build-verify", {
        ...scripts,
        "ci:build-verify": buildVerify.replace("pnpm verify:pack && ", ""),
      }),
      "a build job that no longer runs the pack verification fires one lifecycle build, not two",
    ).toBe(1);

    const live = reuseRuleHolds({ state, recordedBefore: null, recordedAfter: null });
    expect(live.holds, live.reason).toBe(true);
    expect(
      live.reason,
      "and it holds because reuse is NOT adopted — the requirement is open, not met",
    ).toContain("not adopted");

    // The adopted branch, which the live tree cannot exercise. Without these the conditional above is
    // satisfied by `() => true` and this row would report coverage of a rule it never evaluated.
    const adopted: ReuseState = {
      rebuildLegs: [],
      downloadSteps: ["Download qfai build"],
      packLifecycleBuilds: PACK_LIFECYCLE_BUILDS,
    };
    expect(
      reuseRuleHolds({ state: adopted, recordedBefore: 4, recordedAfter: 2 }).holds,
      "reuse adopted, nothing rebuilding, and a recorded fall is the accepting shape",
    ).toBe(true);
    const missing = reuseRuleHolds({ state: adopted, recordedBefore: null, recordedAfter: null });
    expect(missing.holds, "adopting it without the numbers is what BR-0017-0030 forbids").toBe(
      false,
    );
    // The REASON, not just the verdict. Deleting the null check leaves `null >= null`, which is `true`
    // in JavaScript, so the comparison below returns the same `false` for a different reason and a
    // verdict-only assertion cannot tell the two apart. The falsification pass found exactly that.
    expect(
      missing.reason,
      "the rejection must be about the absent numbers, not about a comparison of two nulls",
    ).toContain("no recorded before-and-after count");
    expect(
      reuseRuleHolds({ state: adopted, recordedBefore: 2, recordedAfter: 2 }).holds,
      "a count that did not move did not fall",
    ).toBe(false);
    expect(
      reuseRuleHolds({
        state: { ...adopted, rebuildLegs: ["integration"] },
        recordedBefore: 4,
        recordedAfter: 3,
      }).holds,
      "downloading in one leg while another still builds is not producing the build once",
    ).toBe(false);
    for (const packLifecycleBuilds of [PACK_LIFECYCLE_BUILDS - 1, PACK_LIFECYCLE_BUILDS + 1]) {
      expect(
        reuseRuleHolds({
          state: { ...adopted, packLifecycleBuilds },
          recordedBefore: 4,
          recordedAfter: 2,
        }).holds,
        `the pack lifecycle's builds must be unchanged; ${String(packLifecycleBuilds)} is a different change`,
      ).toBe(false);
    }
  });
});
