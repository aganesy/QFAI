/**
 * The Renovate mechanism's load-bearing couplings, which nothing else in the tree checks.
 *
 * `.github/workflows/renovate.yml` and `.github/renovate.json5` are two files that have to agree
 * about three things, and every one of them fails SILENTLY when they stop agreeing: the bot goes
 * on running, opens pull requests, and reports green while doing less than it says. That is the
 * shape these rows exist for — the hygiene lane already checks pins, permissions and timeouts, and
 * `ownWorkflowTopology` already pins the file set.
 *
 * **The self-update regex.** `renovate-version` is pinned exactly, and Renovate's `github-actions`
 * manager cannot see that input: it reads `uses:` lines and the `node-version` inputs of three
 * `actions/setup-*` actions, and this is none of those. A `customManagers` entry teaches it the
 * line. Rename the input, reformat the line, move it — and the regex matches nothing, Renovate
 * reports no update for itself, and the pin quietly becomes the one version in this tree that
 * nothing keeps current. So the config's own regex is run against the workflow here, and is
 * required to capture the version the workflow actually pins.
 *
 * **The commit identity.** Renovate decides whether a branch was edited by hand by comparing its
 * commits against `gitAuthor`, and it stops updating a branch it believes someone else touched.
 * The `repin` job commits to Renovate's branches, so the two identities have to be the same
 * string; if they drift, the re-pin freezes exactly the branches it just fixed, and the symptom
 * appears a week later as "Renovate stopped updating things".
 *
 * **The two jobs' event partition.** One file carries a scheduled bot and a push-triggered
 * re-pin, split by `if:` on `github.event_name`. A condition that excludes both jobs from an event
 * produces a run that succeeds having done nothing, which is indistinguishable from a run with
 * nothing to do.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const WORKFLOW_REL = ".github/workflows/renovate.yml";
const CONFIG_REL = ".github/renovate.json5";

const workflowText = (): string => readFileSync(path.join(REPO_ROOT, WORKFLOW_REL), "utf-8");
const configText = (): string => readFileSync(path.join(REPO_ROOT, CONFIG_REL), "utf-8");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The parsed workflow.
 *
 * `on` is read under both spellings for the reason its sibling suite states: it is a boolean in
 * YAML 1.1, so a parser following that schema yields the key `true`. This one follows 1.2 and
 * gives `"on"`, and a row whose correctness depends on which schema a dependency chose is a row
 * that breaks silently on a bump.
 */
function workflow(): Record<string, unknown> {
  const doc: unknown = parseYaml(workflowText());
  if (!isRecord(doc)) throw new Error(`${WORKFLOW_REL} does not parse as a mapping`);
  return doc;
}

function triggers(): Record<string, unknown> {
  const doc = workflow();
  const under = doc["on"] ?? doc[String(true)] ?? doc["true"];
  return isRecord(under) ? under : {};
}

function jobs(): Record<string, Record<string, unknown>> {
  const declared = workflow()["jobs"];
  const out: Record<string, Record<string, unknown>> = {};
  if (!isRecord(declared)) return out;
  for (const [id, job] of Object.entries(declared)) {
    if (isRecord(job)) out[id] = job;
  }
  return out;
}

function stepsOf(id: string): Record<string, unknown>[] {
  const job = jobs()[id];
  const steps = job === undefined ? undefined : job["steps"];
  return Array.isArray(steps) ? steps.filter(isRecord) : [];
}

/** Every `run:` body in the workflow, joined — the whole shell surface of both jobs. */
function allRunBodies(): string {
  return Object.keys(jobs())
    .flatMap((id) => stepsOf(id))
    .map((step) => (typeof step["run"] === "string" ? step["run"] : ""))
    .join("\n");
}

/**
 * One quoted string captured out of the JSON5 config, unescaped by `JSON.parse`.
 *
 * The config is JSON5 and this package depends on no JSON5 parser; adding one to read two values
 * in a test is a dependency bought for a test's convenience. What a hand-rolled parser would buy
 * instead is worse — it would mis-read some shape and report agreement that is not there.
 *
 * So the capture is textual and the UNESCAPING is not: the matched token is still a JSON string
 * literal, and `JSON.parse` is what turns `\\s` into `\s` rather than a second regex guessing at
 * it. Every caller asserts the capture succeeded, so a config edit that moves the key out of this
 * shape fails the row rather than skipping it.
 */
function quotedFromConfig(pattern: RegExp): string {
  const found = pattern.exec(configText());
  const literal = found?.[1];
  expect(
    literal,
    `${CONFIG_REL} must carry a value matching ${String(pattern)} — this row reads the config's ` +
      `own declaration rather than restating it, and an unmatched pattern means it read nothing`,
  ).toBeDefined();
  const parsed: unknown = JSON.parse(literal ?? '""');
  if (typeof parsed !== "string") throw new Error(`${String(pattern)} did not capture a string`);
  return parsed;
}

describe("the Renovate config's self-update manager still matches the workflow it is written for", () => {
  it("captures the exact version the workflow pins", () => {
    // The config's own regex, taken from the config. A copy restated here would pass while the
    // real one matched nothing — the failure this row exists to catch.
    const source = quotedFromConfig(/matchStrings:\s*\[\s*("(?:[^"\\]|\\.)*")/);
    const matched = new RegExp(source).exec(workflowText());

    expect(
      matched,
      `the customManager regex in ${CONFIG_REL} matches nothing in ${WORKFLOW_REL}. Renovate has ` +
        "no built-in extractor for `renovate-version`, so nothing else would report the pin as " +
        "stale: it would sit at whatever version it was written with, indefinitely",
    ).not.toBeNull();

    const captured = matched?.groups?.["currentValue"];
    expect(
      captured,
      "and it must capture through the named group `currentValue`, which is the group Renovate " +
        "reads the version out of — a regex that matches the line without capturing it is inert " +
        "in exactly the same way",
    ).toBeDefined();

    // An EXACT version, not the floating major the action defaults to. `44` is a different image
    // from one week to the next, inside a job whose every `uses:` is an immutable ref.
    expect(
      captured,
      "the pin must be an exact X.Y.Z: a floating major is not pinned, and the customManager " +
        "above would then keep a value that was never the thing being pinned",
    ).toMatch(/^\d+\.\d+\.\d+$/);

    // And the file it is told to look in is the file it was just run against.
    const patterns = quotedFromConfig(/managerFilePatterns:\s*\[\s*("(?:[^"\\]|\\.)*")/);
    expect(patterns, "the customManager must be pointed at the workflow that carries the pin").toBe(
      WORKFLOW_REL,
    );
  });
});

describe("the re-pin commits under the identity Renovate recognises as its own", () => {
  it("uses the config's gitAuthor name and address verbatim", () => {
    // `Name <address>` — the shape Renovate's own `gitAuthor` takes.
    const author = quotedFromConfig(/gitAuthor:\s*("(?:[^"\\]|\\.)*")/);
    const parts = /^(.+?)\s*<([^>]+)>$/.exec(author);
    expect(parts, `gitAuthor in ${CONFIG_REL} must be \`Name <address>\``).not.toBeNull();

    const body = allRunBodies();
    // Non-vacuity: a `toContain` over an empty string fails, but an extractor that stopped
    // finding steps would make every claim below fail for the wrong reason. Say so first.
    expect(body.length, "the workflow must have step bodies for this to be about").toBeGreaterThan(
      0,
    );

    expect(
      body,
      "the re-pin must commit under the same name Renovate compares branches against: a commit " +
        "under any other identity reads to Renovate as a hand edit, and it stops updating a " +
        "branch it thinks someone edited — freezing the branches the re-pin just fixed",
    ).toContain(`git config user.name "${parts?.[1] ?? ""}"`);
    expect(body, "and under the same address, for the same reason").toContain(
      `git config user.email "${parts?.[2] ?? ""}"`,
    );
  });

  it("never forces a push", () => {
    // A rejected push means Renovate moved the branch while this ran, and its next run rebuilds
    // that branch from scratch. Losing the re-pin commit is the correct outcome; overwriting
    // Renovate's newer work is not — and `.agents/rules/version-discipline.md` forbids force
    // outright besides.
    expect(allRunBodies()).not.toMatch(/push[^\n]*(--force|--force-with-lease|\s-f\b)/);
  });
});

describe("the re-pin runs the two scripts in the order the first one's output requires", () => {
  it("writes the pinned bytes before digesting the step body that carries them", () => {
    const body = allRunBodies();
    const guardAt = body.indexOf("scripts/pin-guard-bytes.mjs");
    const bodiesAt = body.indexOf("scripts/pin-verification-bodies.mjs");

    expect(guardAt, "the re-pin must run scripts/pin-guard-bytes.mjs").toBeGreaterThanOrEqual(0);
    expect(
      bodiesAt,
      "the re-pin must run scripts/pin-verification-bodies.mjs",
    ).toBeGreaterThanOrEqual(0);
    expect(
      guardAt,
      "pin-guard-bytes writes `.github/pinned-bytes.txt` AND the ci.yml step that carries that " +
        "file's digest; pin-verification-bodies digests that step's body. Run the other way " +
        "round, the second pins a body the first is about to rewrite, and the lane stays red " +
        "with both scripts reported as having run",
    ).toBeLessThan(bodiesAt);

    // And the result is checked rather than assumed. Without this the job pushes whatever the
    // two scripts produced, and the branch it was fixing stays red with a commit on it claiming
    // otherwise.
    expect(
      body,
      "the re-pin must verify its own output against the lane the update would have failed",
    ).toContain("scripts/check-workflow-hygiene.mjs");
  });
});

describe("the two jobs partition the events this workflow declares", () => {
  it("routes every declared trigger to exactly one job", () => {
    const declared = Object.keys(triggers());
    expect(
      declared.sort(),
      "the workflow's trigger set is what these conditions partition",
    ).toEqual(["push", "schedule", "workflow_dispatch"]);

    // The conditions as written, evaluated the way GitHub would for each event. `!=` and `==`
    // against one field is a partition only if both halves are present and opposite — two `==`
    // conditions on `push` would leave the scheduled run matching nothing, and a scheduled run
    // that ran no job reports success.
    const conditions = Object.fromEntries(
      Object.entries(jobs()).map(([id, job]) => [id, String(job["if"] ?? "")]),
    );
    expect(
      Object.keys(conditions).sort(),
      "this row is written for the two-job shape; a third job means the partition needs stating " +
        "again rather than extending by accident",
    ).toEqual(["renovate", "repin"]);

    for (const event of declared) {
      const runs = Object.entries(conditions).filter(([, condition]) => {
        const isPush = event === "push";
        if (condition.includes("!= 'push'")) return !isPush;
        if (condition.includes("== 'push'")) return isPush;
        // An unrecognised condition is not evidence of anything; treat it as always running so
        // the count below reports the ambiguity as a failure rather than resolving it.
        return true;
      });
      expect(
        runs.map(([id]) => id),
        `exactly one job may run on \`${event}\`: a run matching none succeeds having done ` +
          "nothing, and a run matching both re-pins a branch that has no update on it yet",
      ).toHaveLength(1);
    }
  });

  it("scopes the bot to this repository rather than to whatever its token can reach", () => {
    const step = stepsOf("renovate").find(
      (candidate) =>
        typeof candidate["uses"] === "string" && candidate["uses"].startsWith("renovatebot/"),
    );
    expect(step, "the renovate job must run the Renovate action").toBeDefined();

    const env = isRecord(step?.["env"]) ? step["env"] : {};
    expect(
      env["RENOVATE_REPOSITORIES"],
      "without this, Renovate discovers every repository the token can see and processes all of " +
        "them. The scope is stated rather than inherited from how the token happened to be cut",
    ).toBe("${{ github.repository }}");
  });
});
