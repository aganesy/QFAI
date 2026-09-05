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
 *
 * **The automerge policy and the check it rests on.** Every update type is automerged, and
 * platform-native automerge is what performs the merge — which means GitHub's branch protection,
 * not Renovate, decides whether anything was verified first. With no required status check
 * configured, GitHub merges a pull request whose checks never started. The repository setting is
 * unreadable from here, but the file that DECLARES which context is expected is not, and the two
 * halves of that pair are asserted together: automerge on with nothing declared is the
 * configuration this row exists to refuse.
 *
 * **The re-pin's branch lookup.** Automerge lets the pull request merge and its branch vanish
 * while the re-pin job is still computing — and a push to a deleted branch recreates it rather
 * than failing, leaving an orphan behind every automerged action bump.
 *
 * **The published presets.** `.github/renovate-presets/*.json` are consumed by OTHER repositories,
 * through a `github>` reference that names their path. Nothing else in this tree resolves that
 * reference, so a rename or a move breaks every adopter's Renovate run and reports nothing here.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const WORKFLOW_REL = ".github/workflows/renovate.yml";
const CONFIG_REL = ".github/renovate.json5";
const CONTEXTS_REL = ".github/required-status-contexts.json";
const BASE_PRESET_REL = ".github/renovate-presets/qfai.json";
const SELF_HOSTED_PRESET_REL = ".github/renovate-presets/qfai-self-hosted.json";

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

/**
 * One BARE token captured out of the JSON5 config — a boolean, a number, `null`.
 *
 * The sibling above unescapes a quoted string; this returns the token as written, because what
 * the rows below are about is which literal the key carries. `automerge: "true"` is a different
 * declaration from `automerge: true`, and a reader that normalised the two would report agreement
 * across the difference that matters.
 */
function tokenFromConfig(key: string): string {
  const found = new RegExp(`^\\s*${key}:\\s*([^,\\n]+?),?\\s*$`, "m").exec(configText());
  const token = found?.[1];
  expect(
    token,
    `${CONFIG_REL} must declare \`${key}\` at the top level — this row reads the config's own ` +
      "declaration rather than restating it, and an unmatched key means it read nothing",
  ).toBeDefined();
  return token ?? "";
}

/** A JSON file in this repository, parsed. Unlike the config, these carry no JSON5 syntax. */
function readJson(rel: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(path.join(REPO_ROOT, rel), "utf-8"));
  if (!isRecord(parsed)) throw new Error(`${rel} does not parse as an object`);
  return parsed;
}

/** The `packageRules` entries of a preset that match one dependency by exact name. */
function rulesMatching(
  preset: Record<string, unknown>,
  depName: string,
): Record<string, unknown>[] {
  const rules = preset["packageRules"];
  if (!Array.isArray(rules)) return [];
  return rules.filter(isRecord).filter((rule) => {
    const names = rule["matchPackageNames"];
    return Array.isArray(names) && names.includes(depName);
  });
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

  it("declines to resurrect a branch that was merged out from under it", () => {
    const body = allRunBodies();
    const lookupAt = body.indexOf("git ls-remote --exit-code --heads");
    const pushAt = body.indexOf('git push "$remote"');

    // The lookup exists at all. Every update automerges, so the pull request this branch belongs
    // to can be merged and its branch deleted while the re-pin is still computing — and
    // `git push HEAD:refs/heads/<name>` to a deleted branch does not fail, it recreates it.
    expect(
      lookupAt,
      "the push step must check the branch still exists on the remote before pushing: a push to " +
        "a branch that was deleted by an automerge recreates it, leaving an orphan branch behind " +
        "every automerged action bump",
    ).toBeGreaterThanOrEqual(0);
    expect(pushAt, "the re-pin must push to the branch it was given").toBeGreaterThanOrEqual(0);

    // …and BEFORE the push, which is the whole content of the guard. A lookup after the fact
    // reports on a branch this job has already recreated.
    expect(
      lookupAt,
      "the existence check must run before the push, not after it — afterwards the branch it is " +
        "asking about is one this job has already brought back",
    ).toBeLessThan(pushAt);
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

describe("automerge is declared together with the check that decides whether anything was verified", () => {
  it("keeps the platform-automerge pair complete: merge without review, but not without a check", () => {
    // CLAIM 1 — the policy is on, and on for everything. Read from the config rather than
    // restated: a `matchUpdateTypes` rule that narrowed it later would leave this row passing
    // against a top-level key that no longer decides anything, so the pins below are what the
    // file says at the level the file says it.
    expect(
      tokenFromConfig("automerge"),
      "the top-level automerge declaration is what makes every update type — major included — " +
        "merge without a human. This suite is written for that policy; narrowing it is a change " +
        "worth restating here rather than one that should slip through green",
    ).toBe("true");

    // CLAIM 2 — the merge is performed by GitHub, which is why CLAIM 3 exists at all. Renovate
    // merging on its own next run would answer to `ignoreTests` and nothing else; platform
    // automerge answers to branch protection.
    expect(
      tokenFromConfig("platformAutomerge"),
      "platform-native automerge is what merges the moment CI goes green rather than at the next " +
        "weekly Renovate run — and it is also what hands the decision to branch protection",
    ).toBe("true");

    // CLAIM 3 — and tests are not ignored on the fallback path. `ignoreTests: true` would merge a
    // branch whose checks failed, on the one route platform automerge does not cover.
    expect(
      tokenFromConfig("ignoreTests"),
      "`ignoreTests` must stay false: it is the single knob that would turn the automerge policy " +
        "above into merging red branches, and it is stated in the config so it cannot drift by " +
        "way of a changed default",
    ).toBe("false");

    // CLAIM 4 — and a required context is DECLARED. This is the half that makes the three above
    // safe, and the half no file here can enforce: with platform automerge on and branch
    // protection requiring nothing, GitHub merges a pull request whose checks never started.
    // `.github/required-status-contexts.json` is where the expectation lives, so an empty
    // declaration is the reachable failure — the setting itself is not readable from a pull
    // request, which is the reason that file exists.
    const declared = readJson(CONTEXTS_REL)["contexts"];
    expect(
      Array.isArray(declared) ? declared : [],
      `${CONTEXTS_REL} must declare at least one required status context. Automerge is enabled ` +
        "above and performed by the platform, so the branch-protection setting that file " +
        "describes is the only thing standing between a dependency bump and the default branch",
    ).not.toHaveLength(0);
  });
});

describe("the token the setup document asks for can do what the config asks of it", () => {
  it("names the workflow permission, because both the config and the re-pin write workflow files", () => {
    // The premise, read rather than assumed: the config really does manage workflow files. If a
    // later edit drops that packageRule, this row should stop demanding the permission rather than
    // keep asking for one nothing needs.
    expect(
      configText(),
      "this row is about the workflow-file permission; it is written for a config that manages " +
        "workflow files, and the rule that does so is where that starts",
    ).toContain(".github/workflows/**");

    // …and the re-pin job writes one too. `pin-guard-bytes.mjs` rewrites the `ci.yml` step that
    // carries the pinned-bytes digest, so the push at the end of that job is a workflow-file push
    // whatever the update itself touched.
    expect(
      allRunBodies(),
      "the re-pin runs the program that rewrites the ci.yml step, so its push needs the same " +
        "permission the config's own updates do",
    ).toContain("scripts/pin-guard-bytes.mjs");

    // The claim. A GitHub token without the workflow permission is refused AT PUSH TIME, and only
    // for the commits that touch `.github/workflows/**` — so every other package updates normally
    // while the actions group alone fails, which is a symptom that does not name its cause. The
    // setup document is the only place that can prevent it, so it has to say so.
    const setup = readFileSync(path.join(REPO_ROOT, ".github/renovate.md"), "utf-8");
    expect(
      setup,
      "`.github/renovate.md` must name the fine-grained token's `Workflows` permission: without " +
        "it the actions group is rejected at push time while everything else succeeds",
    ).toMatch(/\*\*Workflows:\*\*/);
    expect(
      setup,
      "and the classic-token equivalent, since the document offers that route too",
    ).toMatch(/`workflow`/);
  });
});

describe("the presets other repositories extend still resolve to the files they name", () => {
  /** `owner/repo`, from the manifest rather than restated — the reference below embeds it. */
  const slug = (): string => {
    const manifest = readJson("package.json")["repository"];
    const url = isRecord(manifest) ? manifest["url"] : undefined;
    const matched = /github\.com\/([^/]+\/[^/.]+)/.exec(typeof url === "string" ? url : "");
    expect(
      matched,
      "the root manifest must name the GitHub repository these presets live in",
    ).not.toBeNull();
    return matched?.[1] ?? "";
  };

  it("points the self-hosted preset at the path the base preset actually occupies", () => {
    // The one coupling nothing else in this tree resolves. A `github>` preset reference is a
    // PATH: move or rename the base file and every adopter extending the self-hosted one gets a
    // config-resolution error on their next Renovate run, while this repository stays green.
    //
    // `.json` is dropped because that is the extension Renovate appends to a path preset by
    // default — the reference names the file without it, and spelling it out would resolve to
    // `qfai.json.json`.
    const expected = `github>${slug()}//${BASE_PRESET_REL.replace(/\.json$/, "")}`;
    const extended = readJson(SELF_HOSTED_PRESET_REL)["extends"];

    expect(
      Array.isArray(extended) ? extended : [],
      `${SELF_HOSTED_PRESET_REL} must extend the base preset by the path it is stored at`,
    ).toContain(expected);
  });

  it("holds a qfai bump back in the base preset and releases it only in the self-hosted one", () => {
    // The difference between the two files, and the only one. It is a safety property rather
    // than a preference: the regeneration command runs only where an administrator allow-listed
    // it, and a `qfai` bump that automerged without it leaves the adopter on a version whose
    // skills their repository does not have.
    const baseRules = rulesMatching(readJson(BASE_PRESET_REL), "qfai");
    expect(baseRules, "the base preset must carry a rule for the qfai package").toHaveLength(1);
    expect(
      baseRules[0]?.["automerge"],
      "the base preset must NOT automerge a qfai bump: whether the assistant tree was " +
        "regenerated alongside it depends on an administrator setting this file cannot see",
    ).toBe(false);

    // …and the regeneration itself is declared there, so the self-hosted preset inherits it
    // rather than carrying a second copy that could drift from this one.
    const tasks = baseRules[0]?.["postUpgradeTasks"];
    const commands = isRecord(tasks) ? tasks["commands"] : undefined;
    const regenerating = (Array.isArray(commands) ? commands : []).filter(
      (entry): entry is string => typeof entry === "string" && /\binit\b.*--force/.test(entry),
    );
    expect(
      regenerating,
      "the base preset must declare the command that regenerates the assistant tree, so a " +
        "Renovate that is allowed to run it does so whichever preset is extended. `--force` is " +
        "the operative half: a plain `init` is create-only and would leave every existing skill " +
        "and wrapper at the version that wrote it",
    ).not.toHaveLength(0);

    const selfHostedRules = rulesMatching(readJson(SELF_HOSTED_PRESET_REL), "qfai");
    expect(
      selfHostedRules,
      "the self-hosted preset must carry the rule that undoes the hold",
    ).toHaveLength(1);
    expect(
      selfHostedRules[0]?.["automerge"],
      "and it must be the release of the hold — a self-hosted preset that did not flip this is " +
        "the base preset with an extra file to keep in sync",
    ).toBe(true);
  });
});
