#!/usr/bin/env node
/**
 * Workflow hygiene lane for QFAI's OWN CI trees — `.github/workflows/**` and
 * `.github/actions/**`.
 *
 * Scope is the own tree ONLY. The shipped set under
 * `packages/qfai/assets/init/root/.github/workflows/**` is governed by
 * `.qfai/contracts/cli/shipped-workflows.md` §5/§6 and by a different spec; the
 * rules that reach it arrive with the shipped-file half of this lane, not here.
 * A lane that quietly scanned both would enforce this repository's conventions on
 * every adopter's tree.
 *
 * ## Why a script rather than an off-the-shelf workflow linter
 *
 * `OQ-0017` deferred adopting one, and the honest condition on that deferral is
 * that the coverage boundary stays visible. So on success this lane PRINTS the
 * rules it ran: a green result has to read as a list of checks rather than as a
 * blanket assurance. The contract states that requirement in those terms.
 *
 * ## Usage
 *
 *   node scripts/check-workflow-hygiene.mjs [--root <dir>]
 *
 * `--root` exists for the tests. They plant violations into a COPY of the tree in
 * a temp directory and point the lane at it, rather than editing `.github/` in
 * place: a mutation in the shared working tree produced a false red for a
 * concurrent reviewer earlier in this repository's history, and a test that edits
 * the repository it runs inside leaves it broken if it dies between edit and
 * restore.
 *
 * Exit 0 when every rule passes; exit 1 with `R-WORKFLOW-HYGIENE-DRIFT` on
 * stderr, carrying the offending file, job and rule name, otherwise. The code
 * follows the existing bare-`R-` lint namespace rather than the `QFAI-XXX-NNN`
 * grammar, which is why the three-digit waiver alias rule does not reach it.
 */
import { mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { closeSync, fstatSync, lstatSync, openSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { argv, exit, stderr, stdout } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readBoundedText } from "./lib/bounded-read.mjs";

// pnpm hoists `yaml` under the qfai workspace; resolve from there so this
// root-level script works without adding yaml to the root package.json. Same
// pattern and same reason as `scripts/check-review-profile-consistency.mjs` —
// a bare `import ... from "yaml"` here fails with ERR_MODULE_NOT_FOUND, because
// every other root script imports `node:*` built-ins only.
const require = createRequire(import.meta.url);
const { parse: parseYaml } = require("./../packages/qfai/node_modules/yaml");

const CODE = "R-WORKFLOW-HYGIENE-DRIFT";

/**
 * The rule set, SCOPED, and printed on success so a green run names its own coverage.
 *
 * The scope is load-bearing rather than decorative. `BR-0017-0037` closes the set over
 * `.github/workflows/**` at exactly five obligations, and the declaration rule is not one of
 * them — its subject is a JSON file checked against the workflows and it comes from a
 * different criterion. Printing the two groups separately is what makes "exactly five"
 * reproducible from the output instead of a number a reader has to take on trust.
 *
 * `job-guardrails` and not `permissions-reachable`: the first obligation is "every job
 * declares permissions AND `timeout-minutes`", one rule covering two keys. The narrower id
 * described half of it, and an id that names half of what it fails on sends the operator to
 * the wrong line.
 */
const RULES = [
  [
    "structural",
    "job-guardrails",
    "every job has a reachable permission block whose scopes and levels are known values, and declares timeout-minutes",
  ],
  ["structural", "checkout-credentials", "every checkout step sets persist-credentials: false"],
  ["structural", "action-pin", "every `uses:` reference is a full 40-hex commit SHA"],
  ["structural", "matrix-fail-fast", "every matrix strategy sets fail-fast: false"],
  ["structural", "secret-inheritance", "no job inherits the caller's secrets"],
  [
    "shipped",
    "shipped-third-party",
    "every third-party `uses:` owner in the shipped set is in the closed sanctioned list",
  ],
  [
    "shipped",
    "shipped-version-marker",
    "no `vN.M[.P]` version marker anywhere in a shipped file, comments included",
  ],
  [
    "shipped",
    "shipped-runner-label",
    "every `runs-on` label in the shipped set is a public GitHub-hosted runner",
  ],
  [
    "supply",
    "global-install-pin",
    "every global package install names the registry it comes from and runs no install scripts",
  ],
  [
    "declaration",
    "required-context",
    "the declared required-status-context job exists, its workflow starts on every pull request, it is unskippable through its whole `needs` closure, and it still performs its verification set",
  ],
];

/** The scopes, in print order, with the heading each one is announced under. */
const SCOPES = [
  ["structural", "Rules run over both workflow trees:"],
  ["shipped", "Rules run over the shipped workflow tree only:"],
  ["supply", "Rules run over every step body in both trees:"],
  ["declaration", "Rules run over the required-status-context declaration:"],
];

/**
 * The two workflow trees the structural rules cover.
 *
 * Two roots rather than copying the shipped files into the workflows directory inside the CI
 * checkout. Both satisfy `BR-0017-0044`, and the copy makes the reported path ambiguous — an
 * adopter told to look at `.github/workflows/qfai-tests.yml` is being sent to a file they do
 * not have. The rule requires the shipped path to be named AS the shipped path.
 */
/** The composite-action tree, scanned for `steps:` and for `uses:` pins. */
const ACTIONS_ROOT_REL = path.join(".github", "actions");

const WORKFLOW_ROOTS = [
  { rel: path.join(".github", "workflows"), tree: "own" },
  {
    rel: path.join("packages", "qfai", "assets", "init", "root", ".github", "workflows"),
    tree: "shipped",
  },
];

/**
 * The third-party action owners the shipped set may reference.
 *
 * A closed sanctioned SET, not a count of zero. `BR-0017-0046` rejects the count formulation
 * by name, and for a concrete reason: the shipped pin policy legitimately keeps the
 * package-manager setup action, so "zero third-party references" would fail the lane on the
 * one entry it is supposed to allow.
 *
 * `actions` and `github` are first-party and are not third-party references at all, so they
 * are excluded from the question rather than added to the allow-list.
 */
const SANCTIONED_THIRD_PARTY = ["pnpm"];
const FIRST_PARTY_OWNERS = ["actions", "github"];

/**
 * Where the expected-required-context declaration lives, relative to the root.
 *
 * A file and not a constant in this script: which checks branch protection requires is a
 * repository SETTING, and a pull request cannot read it. The declaration moves the
 * expectation into the tree so a change that invalidates it fails before it merges.
 */
const DECLARATION_REL = ".github/required-status-contexts.json";

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether a permission block is REACHABLE from this job — declared on the job or
 * on its workflow.
 *
 * `"permissions" in x` rather than a truthiness test: an EMPTY map is a valid and
 * deliberate declaration ("this job needs nothing"), and truthiness would read it
 * as missing. That distinction is the whole reason the aggregate verdict declares
 * one.
 *
 * Exported because a `unit` row compares this against the declaration-only
 * counter below. The row imports the lane rather than re-implementing the
 * predicate, so a wrong counter here cannot be masked by a right one in a test.
 */
export function hasReachablePermissions(entry) {
  if (!isRecord(entry)) return false;
  const job = isRecord(entry.job) ? entry.job : {};
  const workflow = isRecord(entry.workflow) ? entry.workflow : {};
  return "permissions" in job || "permissions" in workflow;
}

/**
 * Declaration-only counting — job-level blocks alone.
 *
 * Kept and exported deliberately, even though no rule judges by it:
 * `BR-0017-0014` forbids declaration-only counting *because* it cannot falsify a
 * requirement written against reachability, and the cheapest way to keep that
 * claim honest is for both counters to exist and be compared by a test.
 */
export function hasDeclaredPermissions(entry) {
  if (!isRecord(entry)) return false;
  return isRecord(entry.job) && "permissions" in entry.job;
}

/**
 * The GitHub Actions permission scopes, and the values a scope may take.
 *
 * A closed list on both axes, because the rule this backs is a LEAST-PRIVILEGE one and a
 * reachability test alone cannot carry it: `permissions: write-all` is valid syntax, is
 * reachable, and hands every scope write access — so a predicate that only asks whether a
 * block exists reports PASS on the one value the rule exists to reject. An unknown scope
 * name is reported too: GitHub ignores it silently, so a typo'd scope is a permission the
 * author believes they granted or withheld and did neither.
 */
const PERMISSION_SCOPES = [
  "actions",
  "attestations",
  "checks",
  "contents",
  "deployments",
  "discussions",
  "id-token",
  "issues",
  "models",
  "packages",
  "pages",
  "pull-requests",
  "repository-projects",
  "security-events",
  "statuses",
];
const PERMISSION_LEVELS = ["read", "write", "none"];

/**
 * Whether one `permissions:` value is a well-formed least-privilege declaration.
 *
 * `{}` (an empty map) is legal and deliberate — "this job needs nothing". A blanket
 * string is not: `write-all` grants every scope, and `read-all` grants read on scopes
 * the job never names, which is the same class of unaudited grant one scope wider than
 * anyone reviewing the diff would notice.
 */
function permissionsBlockFindings(where, value) {
  if (typeof value === "string") {
    return [
      `${where} declares the blanket permission value \`${value}\`; every scope has to be named with an explicit ${PERMISSION_LEVELS.join(" / ")} level`,
    ];
  }
  if (!isRecord(value)) {
    return [`${where} declares a \`permissions:\` value that is neither a mapping nor a string`];
  }
  const details = [];
  for (const [scope, level] of Object.entries(value)) {
    if (!PERMISSION_SCOPES.includes(scope)) {
      details.push(
        `${where} declares the unknown permission scope \`${scope}\`, which GitHub ignores silently`,
      );
      continue;
    }
    if (!PERMISSION_LEVELS.includes(level)) {
      details.push(
        `${where} declares \`${scope}: ${String(level)}\`, which is not one of ${PERMISSION_LEVELS.join(" / ")}`,
      );
    }
  }
  return details;
}

/**
 * Both permission blocks reachable from one job — the job's own and its workflow's.
 *
 * `reportedWorkflows` carries the files whose workflow-level block has already been
 * reported, so a workflow with eight jobs raises one finding for its own block rather
 * than eight copies of it.
 */
function permissionValueFindings(entry, reportedWorkflows) {
  const details = [];
  const job = isRecord(entry.job) ? entry.job : {};
  const workflow = isRecord(entry.workflow) ? entry.workflow : {};
  if ("permissions" in workflow && !reportedWorkflows.has(entry.file)) {
    const workflowDetails = permissionsBlockFindings(
      "the workflow-level block",
      workflow.permissions,
    );
    if (workflowDetails.length > 0) {
      reportedWorkflows.add(entry.file);
      details.push(...workflowDetails);
    }
  }
  if ("permissions" in job) {
    details.push(...permissionsBlockFindings("the job-level block", job.permissions));
  }
  return details;
}

/**
 * A digest of what one step DOES: its `run`, its `uses`, its `with`, its `env`, the shell and
 * working directory it runs under, the package scripts it invokes, and the contents of the
 * repository's own guard scripts it reaches.
 *
 * `name` is deliberately absent — the name is the key this is looked up by, and including it would
 * make the digest agree with itself by construction. `if` is absent too: a condition is rejected
 * before a body is ever digested, by the branch above.
 *
 * Line endings and trailing whitespace are normalized, so a checkout that rewrites newlines does
 * not read as an edited verification.
 *
 * `env` is IN the digest. Review finding [24], second escape: the verdict step's whole input is
 * `NEEDS_JSON: ${{ toJSON(needs) }}`, so replacing that expression with a hardcoded all-success
 * map neuters the aggregate verdict while `run` is untouched and every pin still matches.
 * Measured: the lane exited 0. A step's environment is what it runs on, not decoration.
 *
 * The INVOKED SCRIPTS are in it for the same reason, one level further out. Review finding [36]:
 * `run: pnpm ci:build-verify` is a reference, and pinning a reference pins the pointer rather
 * than the work — deleting `node ./scripts/check-publish-dry-run.mjs` from that script in the
 * root manifest left this step's digest and its declaration in perfect agreement while the pack
 * verification it names stopped happening, and the required context still went green. Resolving
 * the reference is what makes the declaration a pin on the work.
 *
 * Transitive, because a script that calls another script moves the same problem one hop. Every
 * name reached is recorded with the manifest directory it was resolved against, and a name the
 * manifest does not define is recorded as `null` — an absence is a fact about the tree too, and
 * a digest that silently ignored it would agree across the edit that introduced it.
 *
 * The SHELL and the WORKING DIRECTORY are in it, each resolved through the workflow-level and
 * job-level `defaults.run` that a step inherits when it declares neither. Review finding [41]:
 * neither was read at all, and both change what the step does without touching a byte of `run`.
 * A `shell` is a command template — `bash {0} || true` wraps the body and returns 0 whatever it
 * did — and a `working-directory` changes which manifest `pnpm ci:build-verify` resolves against,
 * so pointing it at a package whose manifest defines a shorter `ci:build-verify` ran different
 * work while the pin over the root manifest still matched. The working directory is also what the
 * script resolution starts from now, rather than the repository root unconditionally.
 *
 * The CONTENTS of the repository's own guard scripts are in it too. Review finding [42]: pinning
 * `run: bash packages/qfai/scripts/check-no-internal-version-leakage.sh` pins the invocation, and
 * replacing that file's body with `exit 0` left the step's name, its `run` and its digest all
 * unchanged — so the same neutered guard went green in `lint` and in `build`.
 *
 * Content, but only inside `VERIFIED_SOURCE_ROOTS`. Outside them the PATH is recorded and the
 * bytes are not, and that boundary is deliberate rather than a shortcut: two of the declared
 * verification steps run `packages/qfai/dist/cli/index.mjs`, whose bytes change on every build,
 * and a digest over those would need re-pinning after every compile and would say nothing about
 * whether the verification still happens. Recording the path still catches the reference moving.
 */
export function verificationBodyDigest(step, root, runDefaults = {}) {
  const normalize = (value) =>
    typeof value === "string"
      ? value
          .replace(/\r\n/g, "\n")
          .replace(/[ \t]+$/gm, "")
          .trimEnd()
      : value;
  const shell = step.shell ?? runDefaults.shell;
  const workingDirectory = step["working-directory"] ?? runDefaults.workingDirectory;
  const baseDir = typeof workingDirectory === "string" ? workingDirectory : ".";
  const shape = {
    run: normalize(step.run),
    uses: normalize(step.uses),
    with: step["with"],
    // The EFFECTIVE env, merged workflow < job < step.
    //
    // Review finding [51]: only the step's own `env` was in the digest, and a step inherits its
    // job's and its workflow's. `BASH_ENV: ${{ github.workspace }}/scripts/noop.sh` declared at
    // job level is sourced by the non-interactive bash GitHub runs BEFORE the step body — with
    // `exit 0` in that file the body never runs and the step reports success, while `run`,
    // `shell`, `working-directory` and every pinned digest are untouched. Two lines somewhere
    // else in the file turned every declared verification into a no-op.
    env: effectiveEnv(runDefaults.env, step["env"]),
    shell: normalize(shell),
    workingDirectory: normalize(workingDirectory),
    scripts: invokedScriptBodies(step.run, root, baseDir),
    files: invokedFileDigests(step.run, root, baseDir),
  };
  return createHash("sha256").update(JSON.stringify(shape)).digest("hex").slice(0, 16);
}

/**
 * The `defaults.run` a step inherits: the job's value where it has one, the workflow's otherwise.
 *
 * GitHub resolves step > job > workflow, and only the two outer levels are invisible from the step
 * object — which is why they are resolved here rather than left to the caller.
 */
export function effectiveRunDefaults(workflow, job) {
  const runBlock = (owner) => {
    const defaults = isRecord(owner) ? owner.defaults : undefined;
    return isRecord(defaults) && isRecord(defaults.run) ? defaults.run : {};
  };
  const envBlock = (owner) => (isRecord(owner) && isRecord(owner.env) ? owner.env : {});
  const fromWorkflow = runBlock(workflow);
  const fromJob = runBlock(job);
  return {
    shell: fromJob.shell ?? fromWorkflow.shell,
    workingDirectory: fromJob["working-directory"] ?? fromWorkflow["working-directory"],
    env: { ...envBlock(workflow), ...envBlock(job) },
  };
}

/**
 * The environment a step runs under: workflow, then job, then the step's own.
 *
 * Returned as a SORTED array of pairs, so the digest does not depend on which level happened to
 * declare a name first — an object's key order is a property of the merge, and a pin that moved
 * because a variable was hoisted to the job level is a pin that fails for no reason.
 */
function effectiveEnv(inherited, own) {
  const merged = { ...(isRecord(inherited) ? inherited : {}), ...(isRecord(own) ? own : {}) };
  return Object.keys(merged)
    .sort()
    .map((name) => [name, merged[name]]);
}

/**
 * Environment names that make an interpreter or a loader RUN something before the thing it
 * was asked to run — or stop it running at all.
 *
 * `BASH_ENV` is sourced by non-interactive bash before the script it was given, so a file it
 * names can exit before the step body starts while the step reports success. `ENV` is its
 * POSIX-sh equivalent, and `SHELLOPTS` / `BASHOPTS` can turn off the `-e` GitHub invokes bash
 * with. `NODE_OPTIONS` does the same one layer down: `--require=<file>` is preloaded before
 * the entry point, so a preload calling `process.exit(0)` makes every `node` and every `pnpm`
 * in the closure succeed without running — review finding [57] measured exactly that on Node
 * 24. `LD_PRELOAD` and `DYLD_INSERT_LIBRARIES` are the native equivalents. `PATH` is the
 * same capability by another route — review finding [60]: a workspace directory holding an
 * executable named `bash`, put first, means every `run:` body in the closure is handed to a
 * shell the pull request wrote, which can return 0 having run nothing. It is not a preload,
 * but it decides WHICH program receives the body, which is the same question.
 *
 * A REFUSAL and not only a digest input, and the distinction is the point. A digest makes a
 * change visible to a reviewer, and the pin tool is committed — so a pull request that adds
 * one of these can recompute the pin in the same commit and the lane stays green. What stops
 * that is a rule that says no, which is why this list exists beside the digest rather than
 * instead of it.
 */
/**
 * The command files a step writes to set the environment of LATER steps.
 *
 * Review finding [69]: the env checks read what the YAML DECLARES — workflow, job and step —
 * and a step can set a variable for every step after it by appending to `$GITHUB_ENV`, or
 * prepend to `PATH` through `$GITHUB_PATH`. `echo "BASH_ENV=…/noop.sh" >> "$GITHUB_ENV"`
 * before the verdict step neuters it with no declared env anywhere and no pinned digest
 * moved. It is the same capability arriving through a file instead of a key.
 *
 * Inside the required closure this repository writes to neither, so a write there is a
 * finding whatever it sets — reading the assignment out of a shell body would be a second,
 * worse parser, and "no step in this closure sets the environment of the next one" is a rule
 * that can be stated and checked. A step that genuinely needs to is a change to this file.
 */
/** Where the command-file names live, for both readers. */
const COMMAND_FILES_REL = path.posix.join(".github", "command-files.txt");

/**
 * The script names a package manager runs at install time.
 *
 * A closed list, and short: these are the hooks `pnpm install` honours, and each of them runs in
 * every job before every verification in that job. Review finding [105].
 */
/** Where the manifests allowed to run code at install time are listed, for both readers. */
const LIFECYCLE_MANIFESTS_REL = path.posix.join(".github", "lifecycle-manifests.txt");

/**
 * The manifests allowed to declare a package-manager lifecycle hook.
 *
 * Read from the tree, and read by `scripts/check-toolchain-action.sh` too — which enforces it
 * BEFORE `pnpm install`, the only moment that helps. Review finding [110]: this was a literal
 * array here, and `pnpm-workspace.yaml` is not that array, so a pull request adding a package
 * with a `prepare` hook had it run before every verification in a manifest nothing examined.
 *
 * `undefined` for absent or empty, which the caller turns into a finding: a list of what may run
 * code at install time that names nothing is not a permission, it is a gap.
 *
 * @param {string} root repository root
 * @returns {string[] | undefined} the declared manifests
 */
function lifecycleManifests(root) {
  const text = readBoundedText(path.join(root, LIFECYCLE_MANIFESTS_REL), MAX_WORKFLOW_BYTES);
  if (text === undefined) return undefined;
  const names = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    // Each entry is `<sha256>  <path>`, the digest being of that manifest's lifecycle
    // projection — review finding [124], which the pre-flight enforces before `pnpm install`.
    // The lane reads only the PATH half: what it checks is that the declaration pins an install
    // lifecycle for every manifest the list names, which is a question about the declaration and
    // not about hook bodies. A bare path is still read, so a hand-edited list that has not been
    // resealed yet is understood rather than silently emptied.
    .map((line) => /^[0-9a-f]{64} {2}(.+)$/.exec(line)?.[1] ?? line);
  return names.length === 0 ? undefined : names;
}

const INSTALL_LIFECYCLE = ["preinstall", "install", "postinstall", "prepare", "prepublishOnly"];
/** Where the pinned local-action bytes live, for the pre-flight and for this lane. */
const PINNED_BYTES_REL = path.posix.join(".github", "pinned-bytes.txt");

/**
 * The workflow command files, read from the tree rather than written here.
 *
 * `scripts/check-toolchain-action.sh` needs the same list — it refuses a composite action that
 * reaches one, before any action runs — and this repository's reviewers have flagged two copies
 * of one rule often enough that the list is a file both read. It is also why the shell script can
 * exist at all: this lane refuses a step whose surface NAMES a command file, and that script's
 * step is inside the required closure, so spelling the names in its body would make the lane
 * report its own pre-flight as a writer. Splicing them together to dodge that is precisely the
 * evasion the by-name rule exists to refuse.
 *
 * `undefined` for absent or empty, which the caller turns into a finding: a check that knows
 * nothing to look for must not report PASS.
 *
 * @param {string} root repository root
 * @returns {string[] | undefined} the declared names, or `undefined` if the list is unusable
 */
function commandFileNames(root) {
  const text = readBoundedText(path.join(root, COMMAND_FILES_REL), MAX_WORKFLOW_BYTES);
  if (text === undefined) return undefined;
  const names = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
  return names.length === 0 ? undefined : names;
}

/**
 * The marker a nested EXTERNAL `uses:` is reported under.
 *
 * A string rather than a second return channel: the scan already answers a list of refusals,
 * and the caller distinguishes this one by the marker because the answer is not `refused` but
 * `check this against the declared set`.
 */
const EXTERNAL_ACTION_NOTE = "is an external action";

/** How deep a chain of local composite actions this lane will follow. */
const MAX_LOCAL_ACTION_DEPTH = 4;

/**
 * Command files written by a LOCAL composite action, and by any local action it invokes.
 *
 * Review finding [77]. `.github/actions/**` is not inside `VERIFIED_SOURCE_ROOTS`, so a
 * composite action's bytes are in no pinned digest — the `uses:` string is the whole of what a
 * verification body records about it — and its own steps were scanned by nothing. Every
 * toolchain job in `ci.yml` opens with `uses: ./.github/actions/setup`, so one
 * `echo "BASH_ENV=…" >> $GITHUB_ENV` in there sets the environment of every step after it in
 * every job, with no declared `env:` anywhere and no digest moved. That is finding [69]'s
 * capability arriving through the one door the step scan does not open.
 *
 * An unreadable or unparseable local action is reported too, for the reason the root-refusal
 * checks exist: a reference this lane cannot follow is a reference whose steps are checked by
 * nothing, and reporting `no writes found` for it would be the fail-open rather than the
 * finding.
 *
 * @param {string} root repository root
 * @param {string} reference a `uses:` value beginning `./`
 * @param {string[]} commandFiles the declared command-file names
 * @param {Set<string>} seen action files already examined, so a cycle terminates
 * @param {number} depth how many local actions deep this call is
 * @returns {{ file: string, step: string, note: string }[]} one entry per refusal
 */
function localActionCommandFileWrites(root, reference, commandFiles, seen = new Set(), depth = 0) {
  /** @type {{ file: string, step: string, note: string }[]} */
  const out = [];
  const rel = reference.replace(/^\.\//, "").replace(/[/\\]+$/, "");
  if (rel === "" || rel.split(/[/\\]/).includes("..")) {
    out.push({ file: reference, step: "(whole action)", note: "is unresolvable" });
    return out;
  }
  if (depth > MAX_LOCAL_ACTION_DEPTH) {
    out.push({
      file: rel,
      step: "(whole action)",
      note: "is nested deeper than this lane follows",
    });
    return out;
  }

  let read = false;
  for (const name of ["action.yml", "action.yaml"]) {
    const relFile = path.posix.join(rel.split(path.sep).join(path.posix.sep), name);
    if (seen.has(relFile)) {
      read = true;
      continue;
    }
    const text = readBoundedText(path.join(root, relFile), MAX_WORKFLOW_BYTES);
    if (text === undefined) continue;
    seen.add(relFile);
    read = true;
    let doc;
    try {
      doc = parseYaml(text);
    } catch {
      out.push({ file: relFile, step: "(whole action)", note: "is unparseable" });
      continue;
    }
    // COMPOSITE, or refused. Review finding [84]: a local action is not necessarily a list of
    // steps — `runs: { using: node20, main: index.js }` is a JavaScript action, and GitHub runs
    // that entrypoint in the job like any other step. `index.js` appending `BASH_ENV` to the
    // environment file sets the environment of every step after it, and the scan below found no
    // `runs.steps` array, reported nothing, and left the lane green. A program this lane cannot
    // read is not a program it may pass over.
    //
    // Refused rather than scanned: reading a JavaScript entrypoint for what it writes would be a
    // second and worse parser, while `the required closure invokes only composite local actions`
    // is a rule that can be stated, checked, and satisfied.
    const runs = isRecord(doc) ? doc.runs : undefined;
    const using = isRecord(runs) ? runs.using : undefined;
    if (String(using) !== "composite") {
      out.push({
        file: relFile,
        step: "(whole action)",
        note: `is not a composite action (runs.using: ${
          using === undefined ? "absent" : JSON.stringify(String(using))
        }), so what it runs is a program this lane cannot scan`,
      });
      continue;
    }
    const steps = isRecord(runs) ? runs.steps : undefined;
    if (!Array.isArray(steps)) {
      out.push({
        file: relFile,
        step: "(whole action)",
        note: "declares `using: composite` and no `runs.steps` list, so what it runs is not readable here",
      });
      continue;
    }
    for (const step of steps) {
      if (!isRecord(step)) continue;
      const body = typeof step.run === "string" ? step.run : "";
      for (const file of commandFiles) {
        if (body.includes(file)) {
          out.push({
            file: relFile,
            step: String(step.name ?? body.split(/\r?\n/)[0] ?? "(unnamed)").slice(0, 80),
            note: `reaches ${file}`,
          });
        }
      }
      const nested = typeof step.uses === "string" ? step.uses : "";
      if (nested.startsWith("./")) {
        out.push(...localActionCommandFileWrites(root, nested, commandFiles, seen, depth + 1));
      } else if (nested !== "") {
        // An EXTERNAL action, reported so the caller can check it against the declared set.
        // Review finding [88]: the recursion followed `./` and nothing else, so
        // `uses: attacker/action@<sha>` inside a local action ran in the closure with nothing
        // in this repository reading it — `action-pin` proves the reference is immutable and
        // says nothing about what it does, and the pre-flight reads the checkout rather than
        // the action.
        out.push({ file: relFile, step: `uses ${nested}`, note: EXTERNAL_ACTION_NOTE });
      }
    }
  }
  if (!read) {
    out.push({ file: rel, step: "(whole action)", note: "is unreadable" });
  }
  return out;
}

const PRELOAD_HIJACK_ENV = new Set([
  "BASH_ENV",
  "ENV",
  "SHELLOPTS",
  "BASHOPTS",
  "NODE_OPTIONS",
  "LD_PRELOAD",
  "DYLD_INSERT_LIBRARIES",
  "PATH",
]);

/**
 * The shells GitHub names, which run the step body and return ITS status.
 *
 * Anything else is a command template: `shell: bash {0} || true` runs the body through a wrapper
 * whose exit status is 0 whatever the body did. Review finding [41] — the shipped-workflow suite
 * already rejects that shape for the set QFAI ships; a declared verification in this repository's
 * own tree is exactly the place it must not be available either. A closed list, for the same
 * reason the runner-label rule uses one: the property is membership, and any predicate over the
 * string admits the next spelling of the same trick.
 */
const NAMED_SHELLS = new Set(["bash", "sh", "pwsh", "powershell", "cmd", "python", "node"]);

/**
 * The directories whose file CONTENTS the digest pins: the repository's own guard and lifecycle
 * scripts, POSIX-separated and repository-relative.
 *
 * Everything a verification step or a package script it invokes reaches inside these is hashed;
 * outside them only the reference is recorded. `dist/` is the reason the boundary exists — see
 * `verificationBodyDigest`.
 */
const VERIFIED_SOURCE_ROOTS = ["scripts/", "packages/qfai/scripts/"];

/** How many local files one verification may reach before the walk stops and says so. */
const MAX_VERIFIED_FILES = 200;

/** Extensions that make a token a reference to code rather than to data or to a flag value. */
const CODE_EXTENSIONS = [
  ".mjs",
  ".cjs",
  ".js",
  ".ts",
  ".mts",
  ".cts",
  ".sh",
  ".bash",
  ".py",
  ".ps1",
];

/**
 * Every repository-local code file one shell body names, as repository-relative POSIX paths.
 *
 * A token counts when it ends in a code extension and resolves, inside the root, to a readable
 * regular file. Quotes and shell punctuation are stripped first, so `import "./x.js"` and
 * `node ./x.js` are both seen — a file's own imports are how a guard's real body is reached when
 * the entry point is a two-line wrapper.
 */
function collectFileReferences(text, baseDir, root, out) {
  if (typeof text !== "string") return;
  for (const raw of text.split(/[\s;|&()<>,]+/)) {
    const token = raw.replace(/^["'`]+|["'`]+$/g, "");
    if (token.length === 0) continue;
    if (!CODE_EXTENSIONS.some((extension) => token.endsWith(extension))) continue;
    if (path.isAbsolute(token)) continue; // outside the tree by construction
    // A reference names a PATH. Requiring a separator is what keeps `Node.js` in a comment from
    // reading as a file next to the script that mentions it — measured, and the same scan also
    // reached `dist/*.d.ts` out of a prose line, which the glob exclusion below drops. The cost is
    // that `bash build.sh` beside the caller is not seen; every invocation in this tree names a
    // path, and a reference that starts being written the other way is a change to this scan.
    if (!token.includes("/")) continue;
    if (/[*?[\]]/.test(token)) continue; // a glob is a pattern, not a file
    const resolved = path.resolve(root, baseDir, token);
    const relative = path.relative(root, resolved).split(path.sep).join(path.posix.sep);
    if (relative.length === 0 || relative.startsWith("..")) continue;
    out.add(relative);
  }
}

/**
 * The local files a `run:` body reaches, as a sorted list of `[path, digest-or-marker]`.
 *
 * Inside `VERIFIED_SOURCE_ROOTS` the value is a sha256 over the file's bytes, and the walk
 * continues into that file's own references. Outside them the value is the string `outside`: the
 * reference is pinned, the bytes are not.
 *
 * A path that resolves to nothing readable is recorded as `absent`, so deleting a guard a
 * verification runs is a change to the digest rather than a silent removal from it.
 *
 * Sorted, and the truncation flag is part of the value, so the digest never depends on the order
 * the walk found things in and a walk that hit the ceiling cannot read as a complete one.
 */
export function invokedFileDigests(runText, root, baseDir) {
  const pending = new Set();
  collectFileReferences(runText, baseDir, root, pending);
  for (const [, body] of invokedScriptBodies(runText, root, baseDir)) {
    if (body === null) continue;
    collectFileReferences(body, baseDir, root, pending);
  }
  const resolved = [];
  const seen = new Set();
  let truncated = false;
  while (pending.size > 0) {
    const [relative] = pending;
    pending.delete(relative);
    if (seen.has(relative)) continue;
    seen.add(relative);
    if (seen.size > MAX_VERIFIED_FILES) {
      truncated = true;
      break;
    }
    const inside = VERIFIED_SOURCE_ROOTS.some((prefix) => relative.startsWith(prefix));
    if (!inside) {
      resolved.push([relative, "outside"]);
      continue;
    }
    const text = readBoundedText(path.resolve(root, relative), MAX_WORKFLOW_BYTES);
    if (text === undefined) {
      resolved.push([relative, "absent"]);
      continue;
    }
    const normalized = text.replace(/\r\n/g, "\n");
    resolved.push([relative, createHash("sha256").update(normalized).digest("hex").slice(0, 16)]);
    collectFileReferences(normalized, path.posix.dirname(relative), root, pending);
  }
  resolved.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return truncated ? [...resolved, ["(truncated)", String(MAX_VERIFIED_FILES)]] : resolved;
}

/** A script name as a manifest may hold it: no leading dash, no shell metacharacters. */
const SCRIPT_NAME_RE = /^[A-Za-z0-9_][\w:.-]*$/;

/** Flags that name the directory whose manifest a package-manager invocation resolves against. */
const MANIFEST_DIR_FLAGS = new Set(["-C", "--dir", "--prefix"]);

/**
 * The `pnpm` / `npm` script invocations in one shell body, as `{ dir, name }` pairs.
 *
 * A deliberately small shell reading: fragments split on the separators a CI `run:` actually
 * uses, and only a fragment whose first word is the package manager is considered. `pnpm x` and
 * `pnpm run x` are the same invocation to pnpm and are treated as one here; `-C` / `--dir` /
 * `--prefix` move the manifest. Anything this does not recognise resolves to nothing, which
 * costs coverage and never costs correctness — the digest still pins the `run:` text itself.
 */
function collectScriptInvocations(text, defaultDir, out) {
  if (typeof text !== "string") return;
  for (const fragment of text.split(/&&|\|\||[;\n|]/)) {
    const tokens = fragment
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 0);
    if (tokens[0] !== "pnpm" && tokens[0] !== "npm") continue;
    let dir = defaultDir;
    let index = 1;
    for (; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (MANIFEST_DIR_FLAGS.has(token)) {
        dir = tokens[index + 1] ?? dir;
        index += 1;
        continue;
      }
      if (token === "run" || token === "run-script") continue;
      if (token.startsWith("-")) continue;
      break;
    }
    const name = tokens[index];
    if (name === undefined || !SCRIPT_NAME_RE.test(name)) continue;
    out.push({ dir, name });
  }
}

/**
 * `scripts` of the manifest at `<root>/<dir>`, or `undefined` when there is no readable one.
 *
 * Through the bounded reader: this lane runs on a pull request, and every path it opens is one
 * the pull request can turn into a symlink, a FIFO or a very large file. The ceiling is named
 * for workflows because that is where it came from; a manifest is the same order of size.
 */
function manifestScripts(root, dir, cache) {
  const key = path.posix.normalize(dir.split(path.sep).join(path.posix.sep));
  if (cache.has(key)) return cache.get(key);
  const text = readBoundedText(path.resolve(root, dir, "package.json"), MAX_WORKFLOW_BYTES);
  let scripts;
  try {
    const parsed = text === undefined ? undefined : JSON.parse(text);
    scripts = isRecord(parsed) && isRecord(parsed.scripts) ? parsed.scripts : undefined;
  } catch {
    scripts = undefined;
  }
  cache.set(key, scripts);
  return scripts;
}

/**
 * Every package script a `run:` body reaches, transitively, as a sorted `[key, body]` list.
 *
 * Sorted and array-shaped so the digest does not depend on the order the walk happened to find
 * them in — an object's key order is a property of the traversal, and a pin whose value moved
 * because a script was reached by a different route is a pin that fails for no reason.
 */
export function invokedScriptBodies(runText, root, baseDir = ".") {
  const pending = [];
  collectScriptInvocations(runText, baseDir, pending);
  const cache = new Map();
  const seen = new Set();
  const resolved = [];
  while (pending.length > 0) {
    const { dir, name } = pending.shift();
    const scripts = manifestScripts(root, dir, cache);
    const body = scripts !== undefined && typeof scripts[name] === "string" ? scripts[name] : null;
    // The LIFECYCLE SIBLINGS run with it. `pnpm run x` runs `prex` before and `postx` after,
    // and neither was resolved — so a `preci:lint` added beside the script a verification
    // invokes ran in the required lane while every pinned digest stayed equal. Queued rather
    // than read inline, so their own invocations are followed too, and recorded as `null` when
    // absent for the reason every other name is: an ADDED one has to move the digest.
    if (!name.startsWith("pre") && !name.startsWith("post")) {
      pending.push({ dir, name: `pre${name}` }, { dir, name: `post${name}` });
    }
    const key = `${path.posix.normalize(dir.split(path.sep).join(path.posix.sep))}#${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push([key, body === null ? null : body.replace(/\r\n/g, "\n").trim()]);
    if (body !== null) collectScriptInvocations(body, dir, pending);
  }
  return resolved.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}
/**
 * Read ceiling for one workflow or composite action. A real one is a few kilobytes; anything
 * past this is not one, and reading it is the exhaustion this lane must not be vulnerable to.
 */
const MAX_WORKFLOW_BYTES = 1_048_576;

/**
 * How many directory entries one workflow tree may hold before the walk stops.
 *
 * A thousand, not five. The bound exists so a tree a pull request controls cannot make this
 * lane walk forever, and it is only useful if it is far above anything legitimate and far below
 * anything hostile: this repository's own workflow tree holds about fifteen entries and the
 * shipped one holds two, so a thousand is already two orders of magnitude of headroom.
 *
 * Lowered deliberately, and the reason is worth recording because it is not a security argument.
 * The rows that prove the lane REPORTS a truncated walk have to build a tree past this number,
 * and at five thousand each of them wrote and deleted ten thousand files — twenty seconds a row,
 * the two heaviest in the suite. `node-floor` runs every test in one pool, and that job died on
 * a worker RPC timeout with all 5,620 tests passing. A bound nothing legitimate approaches is
 * not made stronger by being larger, and the cost of proving it works is real.
 */
const MAX_WALKED_ENTRIES = 1_000;

/**
 * Whether a root is present but cannot be walked — a link, or something that is not a
 * directory.
 *
 * `yamlFilesUnder` answers the empty list for BOTH "absent" and "refused", which is right for a
 * walk and wrong for a report. Review finding [63]: `.github/actions` replaced by a link to a
 * fake composite action inside the repository produced an empty list, no finding, and a green
 * lane — while `ci.yml`'s toolchain jobs all run `./.github/actions/setup`, so that action could
 * write `BASH_ENV` into `$GITHUB_ENV` and every verification after it would report success
 * having run nothing. The empty-tree check that would have caught it is applied to the workflow
 * roots only.
 *
 * So the two answers are separated: absent is `false` here and stays a matter for whoever cares
 * whether the tree exists; refused is `true` and is a finding wherever a root is scanned.
 */
export function rootIsRefused(root, rel) {
  const abs = path.join(root, rel);
  let inspected;
  try {
    inspected = lstatSync(abs);
  } catch {
    return false; // absent, not refused
  }
  return inspected.isSymbolicLink() || !inspected.isDirectory();
}

/**
 * Every `*.yml` / `*.yaml` under a directory, recursively, repo-relative.
 *
 * The ROOT is `lstat`ed and refused unless it is a real directory, and no directory ENTRY is
 * descended into unless it is one either. Review finding [45]: this lane runs on a pull request,
 * over paths the pull request itself controls, and `readdirSync` follows a link — so replacing
 * `.github/workflows` (or `.github/actions`, or the shipped root) with a symlink to `/proc` or to
 * a huge external tree started an unbounded traversal. Every guard downstream is per-FILE and
 * descriptor-based, and none of them is reached until the walk finishes; a required lane that can
 * be made to hang or throw instead of producing a finding blocks nothing.
 *
 * `readdirSync(..., { withFileTypes: true })` reports a symlinked directory as `isSymbolicLink()`
 * and NOT `isDirectory()`, so the entry test is already the refusal — it is written explicitly
 * rather than left implicit, because a later `{ recursive: true }` or a `statSync` would quietly
 * undo it.
 *
 * And a ceiling on top, because refusing links is not the same as bounding the walk: a tree that
 * is merely enormous, or a filesystem that presents one, is still a lane that never finishes.
 * The ceiling is a PARAMETER with the production value as its default, so a row can reach it
 * without laying down five thousand files to do it.
 *
 * Hitting it is a PARTIAL SCAN, and `truncated` is how the caller learns so. Review finding
 * [74]: the ceiling used to stop the recursion and say nothing, so a tree carrying five thousand
 * irrelevant entries followed by an unpinned action — or a YAML that weakens the required
 * context — had that YAML never parsed while every rule reported PASS. A short walk is not a
 * finished one, and the lane must not pass on one.
 *
 * Reported rather than thrown, because a throw is the crash the ceiling exists to avoid: the
 * caller pushes the root's name into `truncated` and turns it into a fatal finding beside its
 * other whole-tree checks.
 */
/**
 * Every FILE under `rel`, repo-relative and POSIX-separated, links refused.
 *
 * `yamlFilesUnder` answers only `.yml` and `.yaml`, and the local-action pin covers whatever the
 * tree holds — an `index.js`, a shell helper, anything a composite action reads. Same refusals as
 * that walk: a linked root or a linked entry is a door out of the tree and is not taken.
 *
 * @param {string} root repository root
 * @param {string} rel directory to walk, repo-relative
 * @returns {string[]} repo-relative POSIX paths
 */
function filesUnder(root, rel) {
  const abs = path.join(root, rel);
  let inspected;
  try {
    inspected = lstatSync(abs);
  } catch {
    return [];
  }
  if (inspected.isSymbolicLink() || !inspected.isDirectory()) return [];
  const out = [];
  let seen = 0;
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (seen >= MAX_WALKED_ENTRIES) return;
      seen += 1;
      const p = path.join(dir, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push(path.relative(root, p).replace(/\\/g, "/"));
    }
  };
  walk(abs);
  return out;
}
export function yamlFilesUnder(root, rel, limit = MAX_WALKED_ENTRIES, truncated) {
  const abs = path.join(root, rel);
  let inspected;
  try {
    inspected = lstatSync(abs);
  } catch {
    return []; // absent: nothing to walk
  }
  if (inspected.isSymbolicLink() || !inspected.isDirectory()) return [];

  const out = [];
  let seen = 0;
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (seen >= limit) {
        if (truncated !== undefined) truncated.push(rel);
        return;
      }
      seen += 1;
      const p = path.join(dir, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && /\.ya?ml$/.test(e.name)) {
        out.push(path.relative(root, p).replace(/\\/g, "/"));
      }
    }
  };
  walk(abs);
  return out;
}

function parseFile(root, rel) {
  const text = readBoundedText(path.join(root, rel), MAX_WORKFLOW_BYTES);
  if (text === undefined) {
    // Present in the walk and not readable as a regular file within the ceiling: a symlink, a
    // FIFO, a device, or something too large to be a workflow. Reported with the same shape a
    // parse error gets, so the operator is told which path to look at rather than being handed
    // a hang.
    return {
      __parseError:
        "not a readable regular file within the size ceiling (a symlink, device, FIFO or oversized file)",
    };
  }
  try {
    const doc = parseYaml(text);
    return isRecord(doc) ? doc : null;
  } catch (error) {
    // A malformed workflow is reported as a finding rather than crashing the
    // lane: a parse error that surfaces as a stack trace reads as a broken tool,
    // and the operator then has no idea which file to look at.
    return { __parseError: error instanceof Error ? error.message : String(error) };
  }
}

/** `{ file, job, jobKey, workflow }` for every job in the own workflows tree. */
function collectJobs(root) {
  const jobs = [];
  const findings = [];
  // The composite-action root, which is scanned by `collectStepSites` and by nothing that
  // reports on the root itself. Review finding [63]: `ci.yml`'s toolchain jobs all run
  // `./.github/actions/setup`, so a link there pointing at a fake composite action inside the
  // repository is the whole toolchain — and the scan answered an empty list, silently.
  if (rootIsRefused(root, ACTIONS_ROOT_REL)) {
    findings.push({
      rule: "job-guardrails",
      file: ACTIONS_ROOT_REL.replace(/\\/g, "/"),
      job: "(whole tree)",
      detail:
        "is present but is not a real directory this lane may walk (a symlink, or not a directory), so the composite actions every toolchain job runs are scanned by nothing",
    });
  }
  // And the same root's CEILING, reported here because `collectStepSites` walks it for its
  // steps and returns sites only — this is the one place that can report a partial scan of it.
  const actionsTruncated = [];
  yamlFilesUnder(root, ACTIONS_ROOT_REL, MAX_WALKED_ENTRIES, actionsTruncated);
  if (actionsTruncated.length > 0) {
    findings.push({
      rule: "job-guardrails",
      file: ACTIONS_ROOT_REL.replace(/\\/g, "/"),
      job: "(whole tree)",
      detail: `holds more than ${String(MAX_WALKED_ENTRIES)} entries, so this lane stopped walking it — a composite action past the ceiling is never parsed, and every toolchain job runs one`,
    });
  }
  for (const { rel, tree } of WORKFLOW_ROOTS) {
    // A root that resolves to no YAML is reported, not skipped. `yamlFilesUnder` returns an
    // empty list for a directory that does not exist — deliberately, so the walk is not a
    // crash — and the consequence is that a deleted or renamed tree yields no jobs, no
    // findings, and a green run that still PRINTS every rule as one it evaluated. That is the
    // advertised-but-unevaluated shape `TC-0017-0047` catches for a rule; this catches it for
    // a whole tree.
    if (rootIsRefused(root, rel)) {
      findings.push({
        rule: "job-guardrails",
        file: rel.replace(/\\/g, "/"),
        job: "(whole tree)",
        detail: `is present but is not a real directory this lane may walk (a symlink, or not a directory), so every rule scoped to it would report PASS having evaluated nothing`,
      });
    }
    const truncated = [];
    const files = yamlFilesUnder(root, rel, MAX_WALKED_ENTRIES, truncated);
    if (truncated.length > 0) {
      findings.push({
        rule: "job-guardrails",
        file: rel.replace(/\\/g, "/"),
        job: "(whole tree)",
        detail: `holds more than ${String(MAX_WALKED_ENTRIES)} entries, so this lane stopped walking it — every rule scoped to it then reports on the part that was read, and a file past the ceiling is never parsed at all`,
      });
    }
    if (files.length === 0) {
      findings.push({
        rule: "job-guardrails",
        file: rel.replace(/\\/g, "/"),
        job: "(whole tree)",
        detail: `the ${tree} workflow tree holds no YAML files, so every rule scoped to it would report PASS having evaluated nothing`,
      });
    }
    for (const file of files) {
      const doc = parseFile(root, file);
      if (doc === null || typeof doc.__parseError === "string") {
        findings.push({
          rule: "job-guardrails",
          file,
          job: "(whole file)",
          detail: `could not be parsed: ${doc?.__parseError ?? "not a mapping"}`,
        });
        continue;
      }
      if (!isRecord(doc.jobs)) {
        findings.push({
          rule: "job-guardrails",
          file,
          job: "(whole file)",
          detail: "declares no `jobs:` mapping",
        });
        continue;
      }
      for (const [jobKey, job] of Object.entries(doc.jobs)) {
        if (!isRecord(job)) continue;
        jobs.push({ file, jobKey, job, workflow: doc, tree });
      }
    }
  }
  return { jobs, findings };
}

/**
 * The first obligation, both halves.
 *
 * Permissions by REACHABILITY (a job with no block of its own is governed by the workflow's)
 * and `timeout-minutes` by declaration on the job — the runner has no workflow-level default
 * for it, so reachability would be the wrong test and would pass a job that can hang for six
 * hours.
 */
function checkJobGuardrails(jobs) {
  const findings = [];
  const reportedWorkflows = new Set();
  for (const entry of jobs) {
    if (!hasReachablePermissions(entry)) {
      findings.push({
        rule: "job-guardrails",
        file: entry.file,
        job: entry.jobKey,
        detail: "has no permission block reachable from it, at the job or the workflow level",
      });
    }
    for (const detail of permissionValueFindings(entry, reportedWorkflows)) {
      findings.push({ rule: "job-guardrails", file: entry.file, job: entry.jobKey, detail });
    }
    if (entry.job["timeout-minutes"] === undefined) {
      findings.push({
        rule: "job-guardrails",
        file: entry.file,
        job: entry.jobKey,
        detail:
          "declares no timeout-minutes; the runner has no workflow-level default, so an unbounded job can hold a runner for six hours",
      });
    }
  }
  return findings;
}

/**
 * The registries a global install may name.
 *
 * A closed set, and short on purpose. `--registry` was added because a pinned version names WHAT
 * to fetch and not WHERE from; a rule that accepted the flag whatever it pointed at would have
 * accepted `--registry=https://attacker.example` and changed nothing at all. Review finding [91].
 */
const TRUSTED_REGISTRIES = ["https://registry.npmjs.org"];

/**
 * Every spelling of `npm install` that npm itself accepts, with a global flag.
 *
 * Review finding [92]: the first version enumerated `install`, `i` and `add`, and npm's own
 * `install --help` lists `in`, `ins`, `inst`, `insta`, `instal`, `isnt`, `isnta`, `isntal` and
 * `isntall` besides — `npm in -g corepack` is a global install this rule did not look at. A
 * partial enumeration of an alias table is the same defect as a partial enumeration of the ways
 * a shell can spell a variable, one file over.
 *
 * The flag can sit anywhere after the subcommand, and `-g` is the same request as `--global`.
 * The optional group ENDS in whitespace, so the flag is always matched at a token start:
 * measured, the first version anchored `-g` on `(?:^|\s)` after a `\s+` that had already eaten
 * the separator, so `npm i -g corepack` matched nothing at all.
 */
const GLOBAL_INSTALL =
  /(?:^|[;&|(]\s*)npm\s+(?:install|add|i|in|ins|inst|insta|instal|isnt|isnta|isntal|isntall)\s+(?:[^\n]*\s)?(?:--global|-g)(?:\s|$)/;

/**
 * A step body's command lines: comments dropped, continuations joined.
 *
 * Review finding [91], and it is the sharpest kind — the rule was defeated by its own
 * documentation. The pin was checked by asking whether the BODY contained `--registry` and
 * `--ignore-scripts` anywhere, and the body it was written for explains both flags in a comment
 * directly above the command. So reverting the command itself to an unpinned install left every
 * substring in place and the rule green.
 *
 * A flag belongs to an invocation, so the invocation is what is read: a line whose first
 * non-space character is `#` is prose, and a line ending in `\\` is half of one command.
 *
 * Not a shell parser, and it does not need to be: what it must not do is accept a pin that is
 * not on the command. A `#` inside a quoted string truncates that line early, which can only
 * lose flags and produce a finding — the safe direction.
 *
 * @param {string} body a step's `run`
 * @returns {string[]} the command lines, joined and stripped of comments
 */
function shellCommandLines(body) {
  const out = [];
  let pending = "";
  for (const raw of body.split(/\r?\n/)) {
    const withoutComment = raw.replace(/(^|\s)#.*$/, "$1");
    const trimmed = withoutComment.trim();
    if (trimmed === "") {
      if (pending !== "") {
        out.push(pending);
        pending = "";
      }
      continue;
    }
    if (trimmed.endsWith("\\")) {
      pending += `${trimmed.slice(0, -1)} `;
      continue;
    }
    out.push(pending + trimmed);
    pending = "";
  }
  if (pending !== "") out.push(pending);
  return out;
}
/**
 * Every global package install names where the package comes from.
 *
 * A SIXTH scope, deliberately, and not a sixth structural rule. `BR-0017-0037` closes the set over
 * `.github/workflows/**` at exactly five obligations and `TC-0017-0045` pins that count — this rule
 * comes from a different criterion, the way the declaration rule does, so it is announced under its
 * own heading and counted separately. A green run stays readable and the five stay five.
 *
 * Review finding [87], and the finding before it. A pinned VERSION is a name, not a source:
 * `npm` resolves its registry from `NPM_CONFIG_REGISTRY` or from a project `.npmrc`, both of
 * which a pull request controls, so `npm install --global corepack@0.35.0` is a request an
 * attacker's registry can answer with a different package — whose bin then runs in a job that
 * bootstraps the toolchain everything else is verified with.
 *
 * Two conjuncts, because they close different halves: `--registry` on the command line outranks
 * both configuration sources, and `--ignore-scripts` stops the package running during
 * installation rather than when it is invoked. Neither implies the other.
 *
 * Textual on purpose. This lane parses YAML, not shell, and the question it answers is whether a
 * reader of the diff can see where the package came from. A body that reaches a registry some
 * other way — `curl | sh`, a vendored tarball — is outside what this rule can see and inside what
 * the verification-body digest already pins.
 */
function checkGlobalInstallPins(root, jobs) {
  const findings = [];
  for (const site of collectStepSites(root, jobs)) {
    for (const step of site.steps) {
      if (!isRecord(step)) continue;
      const body = typeof step.run === "string" ? step.run : "";
      for (const line of shellCommandLines(body)) {
        if (!GLOBAL_INSTALL.test(line)) continue;
        const missing = [];
        // The VALUE, not the presence. `--registry=https://attacker.example` carries the flag and
        // answers a different registry, which is the whole of what the flag was added to stop.
        // Both spellings, because `--registry x` and `--registry=x` are one flag.
        //
        // EVERY occurrence, because npm takes the LAST one. Review finding [99]: reading only the
        // first accepted `--registry=<trusted> --registry=<attacker>`, which npm resolves to the
        // attacker (verified against `npm config get registry` carrying both). A duplicate is
        // refused outright rather than resolved: two answers to one question is not a pin,
        // whichever end this lane were to read from.
        const registries = [...line.matchAll(/--registry[=\s]+(\S+)/g)].map((m) =>
          (m[1] ?? "").replace(/^["']|["']$/g, ""),
        );
        if (registries.length > 1) {
          missing.push(
            `one --registry (found ${String(registries.length)}, and npm takes the last: ${registries
              .map((r) => JSON.stringify(r))
              .join(", ")})`,
          );
        } else {
          const registry = registries[0] ?? "";
          const resolved = registry.replace(/\/+$/, "");
          if (!TRUSTED_REGISTRIES.includes(resolved)) {
            missing.push(
              registry === ""
                ? "--registry"
                : `--registry naming a trusted registry (found ${JSON.stringify(registry)})`,
            );
          }
        }
        // …and `--ignore-scripts=false` is the flag present and turned off.
        const ignore = /--ignore-scripts(?:[=\s]+(\S+))?/.exec(line);
        const ignoreValue = ignore?.[1];
        const ignoresScripts =
          ignore !== null && (ignoreValue === undefined || !/^(?:false|0|no)$/i.test(ignoreValue));
        if (!ignoresScripts) missing.push("--ignore-scripts");
        if (missing.length === 0) continue;
        findings.push({
          rule: "global-install-pin",
          file: site.file,
          job: site.job,
          detail: `installs a package globally without ${missing.join(" and ")} — a pinned version names WHAT to fetch and not WHERE from, and \`npm\` takes its registry from \`NPM_CONFIG_REGISTRY\` or a project \`.npmrc\`, both of which a pull request controls`,
        });
      }
    }
  }
  return findings;
}

/**
 * Every matrix disables fail-fast.
 *
 * `=== false` and not "falsy": the key's ABSENCE means fail-fast is ON, which is the default
 * this rule exists to override. A missing key and an explicit `true` are the same failure, and
 * a truthiness test would let the missing one through.
 */
function checkMatrixFailFast(jobs) {
  const findings = [];
  for (const entry of jobs) {
    const strategy = entry.job.strategy;
    // The PRESENCE of `strategy.matrix`, not its parsed shape. A dynamic matrix
    // (`matrix: ${{ fromJSON(needs.prepare.outputs.matrix) }}`) is a STRING at
    // parse time, and a mapping test skips it — leaving the one matrix form
    // whose leg count is unknown ahead of time as the one this rule never sees.
    if (!isRecord(strategy) || strategy.matrix === undefined) continue;
    if (strategy["fail-fast"] !== false) {
      findings.push({
        rule: "matrix-fail-fast",
        file: entry.file,
        job: entry.jobKey,
        detail: `declares a matrix with fail-fast: ${String(strategy["fail-fast"])}; one failing leg would cancel the rest and hide which others would have failed`,
      });
    }
  }
  return findings;
}

/**
 * Secret inheritance appears nowhere.
 *
 * `secrets: inherit` hands a called workflow every secret the caller holds, which is the
 * opposite of the least-privilege posture the permission blocks establish — a job restricted
 * to `contents: read` while inheriting the full secret set is restricted in name only.
 *
 * The literal `inherit` ALONE, and not the presence of a `secrets:` key. An explicit
 * mapping (`secrets: { token: ${{ secrets.TOKEN }} }`) is the least-privilege form the
 * spec asks a caller to use — enumerate what the called workflow needs — so failing on
 * the key would forbid the very construction the rule exists to steer callers toward.
 */
function checkSecretInheritance(jobs) {
  const findings = [];
  for (const entry of jobs) {
    if (entry.job.secrets === "inherit") {
      findings.push({
        rule: "secret-inheritance",
        file: entry.file,
        job: entry.jobKey,
        detail: `declares secrets: ${String(entry.job.secrets)}; inheriting the caller's secrets undoes the permission block above it`,
      });
    }
  }
  return findings;
}

/**
 * Every checkout step sets `persist-credentials: false` — in a workflow job AND in a
 * composite action.
 *
 * The composite half is not decorative: moving the checkout into
 * `.github/actions/<name>/action.yml` and dropping the input leaves the token in the
 * Git config of every job that `uses:` it, and a rule scanning `jobs[*].steps` alone
 * reports PASS on exactly that relocation.
 */
function checkCheckoutCredentials(root, jobs) {
  const findings = [];
  for (const entry of collectStepSites(root, jobs)) {
    for (const step of entry.steps) {
      if (!isRecord(step) || typeof step.uses !== "string") continue;
      // Case-INSENSITIVE on the action half. GitHub resolves owner and repository
      // names without regard to case, so `Actions/Checkout@<sha>` runs the same
      // checkout — while a case-sensitive test reads it as some other action and
      // stops asking about `persist-credentials`. The pin rule accepts it either
      // way, so the credential rule was the only thing standing between that
      // spelling and a writable token left in the work tree of a `contents: write`
      // job. The REF keeps its case: it is a git ref, and refs are case-sensitive.
      if (!/^actions\/checkout@/i.test(step.uses)) continue;
      const withBlock = isRecord(step.with) ? step.with : {};
      if (withBlock["persist-credentials"] === false) continue;
      findings.push({
        rule: "checkout-credentials",
        file: entry.file,
        job: entry.job,
        detail: "a checkout step does not set `persist-credentials: false`",
      });
    }
  }
  return findings;
}

/**
 * Every place a `steps:` list lives — the workflow jobs plus the composite actions
 * under `.github/actions/**` — as `{ file, job, steps }`.
 *
 * One collector, so a rule cannot pick up the workflow half and silently omit the
 * composite one. `collectUses` reads it too, which is what keeps the pinning rule and
 * the credentials rule looking at the same set of steps.
 */
function collectStepSites(root, jobs) {
  const sites = jobs.map((entry) => ({
    file: entry.file,
    job: entry.jobKey,
    tree: entry.tree,
    steps: Array.isArray(entry.job.steps) ? entry.job.steps : [],
  }));
  for (const file of yamlFilesUnder(root, ACTIONS_ROOT_REL)) {
    const doc = parseFile(root, file);
    if (doc === null || typeof doc.__parseError === "string") continue;
    const steps = isRecord(doc.runs) ? doc.runs.steps : undefined;
    if (!Array.isArray(steps)) continue;
    sites.push({ file, job: "(composite action)", tree: "own", steps });
  }
  return sites;
}

/**
 * Every `uses:` across the workflows AND actions trees, with where it came from —
 * step-level references and JOB-level ones both.
 *
 * A job-level `uses:` calls a whole reusable workflow
 * (`uses: owner/repo/.github/workflows/check.yml@main`). It is the same class of
 * external-code reference a step `uses:` is, it runs with the caller's context, and a
 * collector that reads `job.steps[*].uses` alone reports "every `uses:` reference is
 * pinned" while a floating ref executes above it.
 */
function collectUses(root, jobs) {
  const out = [];
  for (const entry of jobs) {
    if (typeof entry.job.uses === "string") {
      out.push({ file: entry.file, job: entry.jobKey, uses: entry.job.uses, tree: entry.tree });
    }
  }
  for (const site of collectStepSites(root, jobs)) {
    for (const step of site.steps) {
      if (isRecord(step) && typeof step.uses === "string") {
        out.push({ file: site.file, job: site.job, uses: step.uses, tree: site.tree });
      }
    }
  }
  return out;
}

/**
 * Whether a `uses:` reference is pinned to a full 40-hex commit SHA.
 *
 * The reference splits at the FIRST `@`: the grammar is
 * `{owner}/{repo}{/path}@{ref}`, and everything after that `@` is one ref. A
 * trailing-match test (`/@[0-9a-f]{40}$/`) reads `owner/repo@release@<40-hex>`
 * as pinned, but the ref actually resolved there is the mutable branch
 * `release@<40-hex>` — a legal ref name, as `git check-ref-format
 * refs/heads/release@<40-hex>` confirms with exit 0. So the whole ref has to be
 * the SHA, not merely end with one.
 */
function isShaPinned(uses) {
  const at = uses.indexOf("@");
  if (at < 0) return false;
  return /^[0-9a-f]{40}$/.test(uses.slice(at + 1));
}

function checkActionPins(uses) {
  // A LOCAL reference (`./.github/actions/setup`) has no pin to check and must
  // not be reported: it resolves inside the repository at the same commit, which
  // is the property pinning exists to buy.
  return uses
    .filter((u) => !u.uses.startsWith("./") && !isShaPinned(u.uses))
    .map((u) => ({
      rule: "action-pin",
      file: u.file,
      job: u.job,
      detail: `reference \`${u.uses}\` is not pinned to a full 40-hex commit SHA`,
    }));
}

/**
 * The declared contexts, or a finding explaining why they could not be read.
 *
 * A missing or malformed declaration is a FINDING and not a crash, for the same reason a
 * malformed workflow is: a stack trace reads as a broken tool, and the operator is then left
 * guessing which file to open. It is also not a silent pass — a lane that skipped its own
 * check when the declaration went missing would be worse than one that never had it.
 */
function readDeclaration(root) {
  // Through the SAME bounded reader the workflows use, and for the same reason.
  //
  // Review finding [64]: this was a plain `readFileSync`, which follows a link. This lane runs
  // on a pull request over paths the pull request itself adds, so replacing the declaration with
  // a symlink to `/dev/zero` or to a FIFO made this read forever — measured on Node 24 — and the
  // `ci:lint` lane held the runner until the job timed out without ever reaching the
  // missing-or-malformed branch below. A required lane that can be made to hang blocks nothing.
  //
  // `readBoundedText` refuses a link by name, opens once with `O_NOFOLLOW` where the
  // platform has it, decides regular-file and size from the DESCRIPTOR, and compares its
  // identity with what was inspected. Its refusal is `undefined`, which becomes the finding
  // below rather than a hang.
  const text = readBoundedText(path.join(root, DECLARATION_REL), MAX_WORKFLOW_BYTES);
  if (text === undefined) {
    return {
      contexts: [],
      findings: [
        {
          rule: "required-context",
          file: DECLARATION_REL,
          job: "(whole file)",
          detail:
            "is absent, or is not a readable regular file within the size ceiling (a symlink, device, FIFO or oversized file); the declaration is what says which job carries the required status context, so a run that cannot read it has checked nothing",
        },
      ],
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      contexts: [],
      findings: [
        {
          rule: "required-context",
          file: DECLARATION_REL,
          job: "(whole file)",
          detail: `is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.contexts) || parsed.contexts.length === 0) {
    return {
      contexts: [],
      findings: [
        {
          rule: "required-context",
          file: DECLARATION_REL,
          job: "(whole file)",
          detail: "declares no non-empty `contexts` array",
        },
      ],
    };
  }

  // Every element has to be a mapping, and a non-mapping one is a FINDING rather than
  // something to filter away. A silent filter turns `{"contexts": [null]}` into an empty
  // list that passes the non-empty test above and then iterates nothing, so the rule
  // reports PASS having checked no context at all — which is how a malformed declaration
  // disables the guard protecting the required check.
  const malformed = parsed.contexts.filter((context) => !isRecord(context));
  if (malformed.length > 0) {
    return {
      contexts: [],
      findings: [
        {
          rule: "required-context",
          file: DECLARATION_REL,
          job: "(whole file)",
          detail: `declares ${malformed.length} \`contexts\` element(s) that are not mappings, so the rule would verify fewer contexts than the file appears to declare`,
        },
      ],
    };
  }

  return { contexts: parsed.contexts, findings: [] };
}

/** Every job reachable from `jobKey` through `needs`, including itself. */
/**
 * One job's declared dependencies, in declaration order.
 *
 * `needs: build` and `needs: [build]` are both legal, and a reader that handled only the array
 * form would report the string form as no dependencies at all — which is the direction that
 * fails open. Same normalisation `needsClosure` performs; kept in one place so the two cannot
 * disagree about what a dependency list is.
 *
 * @param {unknown} job one job mapping
 * @returns {string[]} its dependency job keys
 */
function declaredDependencyList(job) {
  const needs = isRecord(job) ? job.needs : undefined;
  const list = typeof needs === "string" ? [needs] : Array.isArray(needs) ? needs : [];
  return list.filter((name) => typeof name === "string");
}

function needsClosure(jobsByKey, jobKey) {
  const seen = new Set();
  const walk = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    const job = jobsByKey.get(key);
    if (job === undefined) return;
    const needs = job.needs;
    const list = typeof needs === "string" ? [needs] : Array.isArray(needs) ? needs : [];
    for (const next of list) {
      if (typeof next === "string") walk(next);
    }
  };
  walk(jobKey);
  return [...seen];
}

/**
 * The shipped set references no unsanctioned third-party action.
 *
 * Scoped to the shipped tree because that is what `BR-0017-0046` governs: the own tree's
 * third-party posture is a different question and is not decided here.
 */
function checkShippedThirdParty(uses) {
  const findings = [];
  // The SAME reference set the pinning rule reads, so a job-level reusable-workflow
  // call cannot be pinned-but-unsanctioned or sanctioned-but-unpinned depending on
  // which rule happens to look at it.
  for (const reference of uses) {
    if (reference.tree !== "shipped") continue;
    // A local path is not a third-party reference; it resolves inside the repository at the
    // same commit.
    if (reference.uses.startsWith("./")) continue;
    const owner = reference.uses.split("/")[0];
    if (FIRST_PARTY_OWNERS.includes(owner)) continue;
    if (SANCTIONED_THIRD_PARTY.includes(owner)) continue;
    findings.push({
      rule: "shipped-third-party",
      file: reference.file,
      job: reference.job,
      detail: `references the unsanctioned third-party owner \`${owner}\` (${reference.uses}); the sanctioned set is ${SANCTIONED_THIRD_PARTY.join(", ")}`,
    });
  }
  return findings;
}

/**
 * The declared workflow starts on EVERY pull request, unconditionally.
 *
 * Properties 1-3 all search inside the file and say nothing about whether the file
 * runs. Delete `on.pull_request`, or add a `paths` / `paths-ignore` filter that
 * excludes some pull requests, and the job, its `needs` closure and its whole
 * verification set stay exactly as declared — while the required status context is
 * simply never created for the pull requests the filter drops. Branch protection
 * then waits for a check that will never report, which is a pending state no local
 * `pnpm ci:lint` can reproduce.
 *
 * `branches` / `branches-ignore` are deliberately NOT rejected: a required context
 * is required on the protected branch's pull requests, and restricting the trigger
 * to those branches is the normal, correct shape. It is the PATH axis that drops
 * pull requests the protection still gates.
 *
 * YAML 1.1's `on` -> `true` folding does not reach here: the parser this lane uses
 * reads the key as the string `on` (measured against `.github/workflows/ci.yml`),
 * and a document where it did fold would surface as a missing trigger — the
 * conservative direction.
 */
function pullRequestTriggerFindings(rel, declaredJob, workflow) {
  const on = isRecord(workflow) ? workflow.on : undefined;
  const finding = (detail) => [{ rule: "required-context", file: rel, job: declaredJob, detail }];
  if (typeof on === "string") {
    return on === "pull_request"
      ? []
      : finding(`declares \`on: ${on}\`, so no pull request creates the required status context`);
  }
  if (Array.isArray(on)) {
    return on.includes("pull_request")
      ? []
      : finding(
          "lists no `pull_request` trigger, so no pull request creates the required status context",
        );
  }
  if (!isRecord(on) || !("pull_request" in on)) {
    return finding(
      "declares no `pull_request` trigger, so no pull request creates the required status context",
    );
  }
  const trigger = on.pull_request;
  if (!isRecord(trigger)) return [];
  const filters = ["paths", "paths-ignore"].filter((key) => key in trigger);
  if (filters.length > 0) {
    return finding(
      `filters its \`pull_request\` trigger by ${filters.join(" / ")}, so a pull request touching none of those paths never creates the required status context and branch protection stays pending`,
    );
  }
  // And the ACTIVITY types, which review finding [N1] on PR #794 named as the other half of the same
  // hole. A path filter stops the workflow starting on some pull requests; a `types` filter stops it
  // starting on some EVENTS of a pull request that did start it. `types: [opened]` is the common
  // shape: the context is created on the first push and never again, so every later push leaves
  // branch protection pending against a SHA that has no required check at all.
  //
  // A superset is fine — the three defaults are what must be present, not an exact list — because
  // adding `ready_for_review` to them removes nothing.
  if (!("types" in trigger)) return [];
  const declaredTypes = Array.isArray(trigger.types) ? trigger.types.map(String) : [];
  const missing = ["opened", "synchronize", "reopened"].filter((t) => !declaredTypes.includes(t));
  return missing.length === 0
    ? []
    : finding(
        `filters its \`pull_request\` trigger to types [${declaredTypes.join(", ") || "(none)"}], omitting ${missing.join(" / ")}, so some pull request events create no required status context and branch protection stays pending on that SHA`,
      );
}

function checkRequiredContexts(root, jobs) {
  const { contexts, findings } = readDeclaration(root);
  for (const context of contexts) {
    const workflow = typeof context.workflow === "string" ? context.workflow : "(unnamed)";
    const declaredJob = typeof context.job === "string" ? context.job : "(unnamed)";
    // Same reasoning as the mapping check on `contexts`: a non-string item is
    // reported, never dropped. Dropping it lets a declaration whose items were
    // replaced with `null` keep one real string and pass both the non-empty
    // test below and the intactness check, while the verification set it
    // appears to declare has quietly shrunk.
    const declaredItems = Array.isArray(context.verificationSet) ? context.verificationSet : [];
    const wanted = declaredItems.filter((item) => typeof item === "string" && item.length > 0);
    if (wanted.length !== declaredItems.length) {
      findings.push({
        rule: "required-context",
        file: DECLARATION_REL,
        job: declaredJob,
        detail: `declares ${declaredItems.length - wanted.length} verificationSet item(s) that are not non-empty strings, so the intactness check would run against fewer items than the file declares`,
      });
    }
    // POSIX separators, matching what `yamlFilesUnder` returns. `path.join` here made
    // the comparison fail on Windows and the rule report every job as missing.
    const rel = `.github/workflows/${workflow}`;

    const inFile = jobs.filter((entry) => entry.file === rel);
    const jobsByKey = new Map(inFile.map((entry) => [entry.jobKey, entry.job]));

    // PROPERTY 1 — the declared context resolves to an existing job.
    if (!jobsByKey.has(declaredJob)) {
      findings.push({
        rule: "required-context",
        file: rel,
        job: declaredJob,
        detail: `is named in ${DECLARATION_REL} but ${workflow} declares no such job (declared jobs: ${inFile.map((e) => e.jobKey).join(", ") || "none"})`,
      });
      continue;
    }

    // PROPERTY 1b — and the workflow holding it actually starts on a pull request.
    findings.push(...pullRequestTriggerFindings(rel, declaredJob, inFile[0]?.workflow));

    // PROPERTY 2 — and it is not skippable, counting the whole `needs` closure. A job whose
    // dependency is skipped is itself skipped, and a skipped job reports SUCCESS to branch
    // protection — so a condition two edges away is as fatal as one on the job itself.
    //
    // `if: always()` is the ONE exception, and excluding it was a real cost rather than a nicety.
    // "Any condition can skip" is a sound approximation for every condition except this one, which
    // exists precisely to guarantee the job runs — and it barred the aggregate verdict from ever
    // holding the context, which left the declaration naming a job with no `needs` at all. Review
    // finding [28] on PR #794 measured the consequence: with only `build` required, every test lane
    // could fail and the merge condition was still satisfied, because nothing connects them.
    //
    // So `always()` on the DECLARED job satisfies property 2 by itself, and its dependencies'
    // conditions are then not faults: a skipped dependency is the state `always()` is for, and the
    // job's own verdict logic is what must classify it. Any OTHER condition on the declared job stays
    // fatal, and the closure is still walked whenever the declared job carries no condition.
    const bodies = new Map();
    const pinnedBodies = isRecord(context.verificationBodies) ? context.verificationBodies : {};
    const declared = jobsByKey.get(declaredJob);
    const declaredCondition = declared?.if;
    const runsUnconditionally =
      declaredCondition !== undefined &&
      /^\s*(\$\{\{\s*)?always\(\)\s*(\}\})?\s*$/.test(String(declaredCondition));
    if (declaredCondition !== undefined && !runsUnconditionally) {
      findings.push({
        rule: "required-context",
        file: rel,
        job: declaredJob,
        detail: `carries a condition of its own (if: ${String(declaredCondition)}), so it can be skipped and report success`,
      });
    } else if (!runsUnconditionally) {
      for (const key of needsClosure(jobsByKey, declaredJob)) {
        const job = jobsByKey.get(key);
        if (job !== undefined && key !== declaredJob && job.if !== undefined) {
          findings.push({
            rule: "required-context",
            file: rel,
            job: declaredJob,
            detail: `is skippable through its dependency ${key}, which carries a condition (if: ${String(job.if)})`,
          });
        }
      }
    }

    // PROPERTY 2b — and the set of jobs it depends on is the declared one, exactly.
    //
    // Review finding [80]: `${{ toJSON(needs) }}` contains only the jobs still listed in
    // `needs:`, so deleting a name removes a whole lane from the verdict while the lane keeps
    // running and keeps failing. Property 3 does not notice, because the seven declared items
    // stay reachable through `detect` and `build` — and the topology test that would notice
    // runs inside the `test` job, which is one of the names an attacker deletes.
    //
    // Equality in both directions. A missing name is the attack; an extra one is a lane that
    // now gates the merge and whose addition nobody declared.
    const declaredDependencies = Array.isArray(context.dependencies)
      ? context.dependencies.filter((name) => typeof name === "string" && name.length > 0)
      : undefined;
    if (declaredDependencies === undefined) {
      findings.push({
        rule: "required-context",
        file: DECLARATION_REL,
        job: declaredJob,
        detail:
          "declares no `dependencies` array, so the set of lanes whose results reach the required context is pinned by nothing",
      });
    } else {
      const actual = declaredDependencyList(jobsByKey.get(declaredJob));
      for (const name of declaredDependencies) {
        if (!actual.includes(name)) {
          findings.push({
            rule: "required-context",
            file: rel,
            job: declaredJob,
            detail: `no longer depends on ${name}, which ${DECLARATION_REL} declares it must — that lane still runs and can still fail, but its result never enters the serialized needs map the verdict reads`,
          });
        }
      }
      for (const name of actual) {
        if (!declaredDependencies.includes(name)) {
          findings.push({
            rule: "required-context",
            file: rel,
            job: declaredJob,
            detail: `depends on ${name}, which ${DECLARATION_REL} does not declare — a lane whose result gates the merge is a change to what this context means, so declare it there in the same change`,
          });
        }
      }
    }

    // PROPERTY 2c — and each dependency may be skipped only on the declared condition.
    //
    // The verdict accepts `skipped`, because a documentation-only pull request legitimately
    // runs none of the gated lanes. That makes the skip decision load-bearing: review finding
    // [81] pointed at `if: false` on `test`, which skips the lane, is accepted by the verdict,
    // and is noticed by nothing else in the tree. A job the declaration lists must carry its
    // condition verbatim; a job it does not list must carry none.
    const declaredConditions = isRecord(context.dependencyConditions)
      ? context.dependencyConditions
      : {};
    for (const name of declaredDependencyList(jobsByKey.get(declaredJob))) {
      const job = jobsByKey.get(name);
      if (job === undefined) continue;
      const declared = declaredConditions[name];
      const carried = job.if === undefined ? undefined : String(job.if);
      const expected = typeof declared === "string" ? declared : undefined;
      if (carried !== expected) {
        findings.push({
          rule: "required-context",
          file: rel,
          job: declaredJob,
          detail: `depends on ${name}, whose condition is ${carried === undefined ? "absent" : JSON.stringify(carried)} where ${DECLARATION_REL} declares ${expected === undefined ? "none" : JSON.stringify(expected)} — the verdict accepts a skip, so which lanes may skip and on what is part of what this context means`,
        });
      }
    }

    // PROPERTY 2d — and the outputs those conditions read are wired to steps that exist.
    //
    // Review finding [81]'s other half: rewiring `detect.outputs.full` to `${{ false }}`, or to
    // a step output nobody produces, skips every gated lane without touching a condition or a
    // line of the classifier. The classifier's own tests are inside one of the lanes that skips.
    // ABSENT is a finding, and so is empty, and so is an entry that is not a mapping. An audit
    // of this file found all three: `gateOutputs` deleted, `{}`, or `{"detect": null}` each
    // made this property iterate nothing while a reviewer grepping the file still saw the job
    // named. Every other declared input in this context reports when it goes missing; this one
    // did not, and it is the one that pins the value five lanes are skipped on.
    const declaredOutputs = isRecord(context.gateOutputs) ? context.gateOutputs : undefined;
    if (declaredOutputs === undefined || Object.keys(declaredOutputs).length === 0) {
      findings.push({
        rule: "required-context",
        file: DECLARATION_REL,
        job: declaredJob,
        detail:
          "declares no `gateOutputs` mapping, so the outputs the skippable lanes are gated on are pinned by nothing — rewiring one to a constant skips them all, and the verdict accepts a skip",
      });
    }
    for (const [name, mapping] of Object.entries(declaredOutputs ?? {})) {
      if (!isRecord(mapping)) {
        findings.push({
          rule: "required-context",
          file: DECLARATION_REL,
          job: declaredJob,
          detail: `pins the outputs of ${name} as something this lane cannot read as a mapping, so that job's wiring is checked against nothing`,
        });
      }
    }
    for (const [name, mapping] of Object.entries(declaredOutputs ?? {})) {
      if (!isRecord(mapping)) continue;
      const job = jobsByKey.get(name);
      if (job === undefined) {
        findings.push({
          rule: "required-context",
          file: rel,
          job: declaredJob,
          detail: `${DECLARATION_REL} pins the outputs of ${name}, which ${workflow} declares no such job`,
        });
        continue;
      }
      const carried = isRecord(job.outputs) ? job.outputs : {};
      const stepIds = new Set(
        (Array.isArray(job.steps) ? job.steps : [])
          .filter((step) => isRecord(step) && typeof step.id === "string")
          .map((step) => String(step.id)),
      );
      for (const key of new Set([...Object.keys(mapping), ...Object.keys(carried)])) {
        const want = mapping[key];
        const got = carried[key];
        if (typeof want !== "string" || String(got) !== want) {
          findings.push({
            rule: "required-context",
            file: rel,
            job: declaredJob,
            detail: `${name} wires its output ${JSON.stringify(key)} to ${got === undefined ? "nothing" : JSON.stringify(String(got))} where ${DECLARATION_REL} declares ${typeof want === "string" ? JSON.stringify(want) : "no such output"} — every lane gated on this value skips when it changes, and the verdict accepts a skip`,
          });
          continue;
        }
        // …and the step it reads has to be one this job declares. A mapping that reads an `id`
        // nobody defines always answers empty, which is the same skip by a quieter route.
        const reference = /^\$\{\{\s*steps\.([A-Za-z0-9_-]+)\.outputs\.[A-Za-z0-9_-]+\s*\}\}$/.exec(
          want,
        );
        if (reference !== null && !stepIds.has(reference[1])) {
          findings.push({
            rule: "required-context",
            file: rel,
            job: declaredJob,
            detail: `${name} wires its output ${JSON.stringify(key)} to a step with id ${JSON.stringify(reference[1])}, which that job does not declare — the value is always empty, so every lane gated on it always skips`,
          });
        }
      }
    }

    // PROPERTY 2e — and the declared pre-flight refusal runs before anything can disable it.
    //
    // Review finding [82]. The lane's own report of a poisoned composite action is unreachable
    // when the poison is in the action the lane's job runs first: `BASH_ENV` makes every later
    // `shell: bash` step exit 0 without running its body. So the refusal moved ahead of the
    // action, and this keeps it there — the step exists, nothing that does work precedes it, and
    // its body is pinned like every other required verification.
    const preflight = isRecord(context.preflight) ? context.preflight : undefined;
    if (preflight === undefined) {
      findings.push({
        rule: "required-context",
        file: DECLARATION_REL,
        job: declaredJob,
        detail:
          "declares no `preflight` step, so nothing requires a refusal of the local composite actions to run before the job that verifies them invokes one",
      });
    } else {
      const preflightJob = typeof preflight.job === "string" ? preflight.job : "(unnamed)";
      const preflightStep = typeof preflight.step === "string" ? preflight.step : "(unnamed)";
      const host = jobsByKey.get(preflightJob);
      const steps = isRecord(host) && Array.isArray(host.steps) ? host.steps : [];
      const at = steps.findIndex((step) => isRecord(step) && String(step.name) === preflightStep);

      // The job has to be one the poison would REACH, and one whose result reaches the verdict.
      // An audit of this file found the check was internally consistent and nothing more: the
      // declaration could be repointed at any job whose first step happens to satisfy the order
      // rule — `ci-pass` itself, say — while the real refusal moved behind the composite action
      // it exists to precede. Every property still passed, and nothing refused a poisoned action.
      //
      // So: the named job must be a declared dependency (its failure has to reach the aggregate),
      // and it must itself invoke a local composite action (otherwise the refusal is stationed
      // where the attack does not pass).
      if (!declaredDependencyList(jobsByKey.get(declaredJob)).includes(preflightJob)) {
        findings.push({
          rule: "required-context",
          file: DECLARATION_REL,
          job: declaredJob,
          detail: `stations the pre-flight refusal in ${preflightJob}, which the aggregate does not depend on — a refusal whose failure never reaches the verdict refuses nothing`,
        });
      }
      const invokesLocalAction = steps.some(
        (step) => isRecord(step) && typeof step.uses === "string" && step.uses.startsWith("./"),
      );
      if (!invokesLocalAction) {
        findings.push({
          rule: "required-context",
          file: DECLARATION_REL,
          job: declaredJob,
          detail: `stations the pre-flight refusal in ${preflightJob}, which invokes no local composite action — the refusal has to stand in front of the thing it refuses, and there is nothing in front of it there`,
        });
      }
      if (at === -1) {
        findings.push({
          rule: "required-context",
          file: rel,
          job: preflightJob,
          detail: `declares no step named ${JSON.stringify(preflightStep)}, which ${DECLARATION_REL} requires it to run before any local composite action`,
        });
      } else {
        // What may run before it, and nothing else. Review finding [94]: this counted `run:` and
        // local `uses:` as work and treated every other step as inert, so an EXTERNAL action could
        // sit ahead of the refusal — `action-pin` proves such a reference is immutable and says
        // nothing about what it does. One ahead of the pre-flight can write a command file, or
        // replace the script the pre-flight is about to run, out of the checkout it just made.
        //
        // A closed list, in the declaration, because the pre-flight genuinely needs the checkout to
        // have anything to read.
        const mayPrecede = Array.isArray(preflight.mayPrecede)
          ? preflight.mayPrecede.filter((name) => typeof name === "string")
          : [];
        for (const step of steps.slice(0, at)) {
          if (!isRecord(step)) continue;
          const uses = typeof step.uses === "string" ? step.uses : "";
          const does = typeof step.run === "string" || (uses !== "" && !mayPrecede.includes(uses));
          if (!does) continue;
          findings.push({
            rule: "required-context",
            file: rel,
            job: preflightJob,
            detail: `runs ${JSON.stringify(String(step.name ?? uses))} before ${JSON.stringify(preflightStep)}, which must come first — a step ahead of it can write a workflow command file, and every step after that one runs under an environment it chose`,
          });
        }
      }
      if (!Array.isArray(preflight.mayPrecede)) {
        findings.push({
          rule: "required-context",
          file: DECLARATION_REL,
          job: declaredJob,
          detail:
            "declares a `preflight` with no `mayPrecede` list, so what is allowed to run before the refusal is decided by nothing",
        });
      }
      if (!wanted.includes(preflightStep)) {
        findings.push({
          rule: "required-context",
          file: DECLARATION_REL,
          job: declaredJob,
          detail: `declares ${JSON.stringify(preflightStep)} as the pre-flight refusal but leaves it out of verificationSet, so its body is pinned by nothing and can be replaced with anything`,
        });
      }
    }

    // PROPERTY 3b — and the work of the lanes that MAY skip is pinned too.
    //
    // Review finding [89]: a gated lane was a declared dependency by name and condition, and
    // nothing else. Replacing `pnpm ci:coverage` with `true` left this lane silent, the job
    // green and the aggregate green — while no other job in the repository runs that script, so
    // the coverage floor stopped being checked at all. Being IN the aggregate is not the same
    // claim as still doing the work.
    //
    // Not in `verificationSet`, because that set's property is UNCONDITIONAL performance and
    // these steps sit in jobs that are allowed to skip. The obligation here is narrower and
    // exact: whatever the step does when it runs is what the declaration says it does.
    // Same, and with a reverse check the others do not need. An audit found that deleting one
    // KEY unpinned that lane's whole body while leaving its digest behind in
    // `verificationBodies` — so the diff still looked pinned, and `pnpm ci:coverage` could be
    // replaced with `true` with every check green. A digest nothing consults is worse than no
    // digest: it reads as a pin.
    const gated = isRecord(context.gatedVerifications) ? context.gatedVerifications : undefined;
    if (gated === undefined || Object.keys(gated).length === 0) {
      findings.push({
        rule: "required-context",
        file: DECLARATION_REL,
        job: declaredJob,
        detail:
          "declares no `gatedVerifications` mapping, so the work of every lane that may skip is pinned by nothing — being in the aggregate is not the same claim as still doing the work",
      });
    }
    for (const item of Object.keys(pinnedBodies)) {
      if (wanted.includes(item)) continue;
      if (Object.prototype.hasOwnProperty.call(gated ?? {}, item)) continue;
      findings.push({
        rule: "required-context",
        file: DECLARATION_REL,
        job: declaredJob,
        detail: `pins a body digest for ${JSON.stringify(item)}, which is in neither verificationSet nor gatedVerifications — nothing consults it, and a digest nothing consults reads as a pin while pinning nothing`,
      });
    }
    for (const [item, jobKey] of Object.entries(gated ?? {})) {
      const host = typeof jobKey === "string" ? jobsByKey.get(jobKey) : undefined;
      if (host === undefined) {
        findings.push({
          rule: "required-context",
          file: rel,
          job: declaredJob,
          detail: `declares the gated verification ${JSON.stringify(item)} in ${String(jobKey)}, which ${workflow} declares no such job`,
        });
        continue;
      }
      const steps = Array.isArray(host.steps) ? host.steps : [];
      const runDefaults = effectiveRunDefaults(inFile[0]?.workflow, host);
      const seen = [];
      for (const step of steps) {
        if (!isRecord(step) || String(step.name) !== item) continue;
        seen.push(step);
      }
      if (seen.length === 0) {
        findings.push({
          rule: "required-context",
          file: rel,
          job: String(jobKey),
          detail: `declares no step named ${JSON.stringify(item)}, which ${DECLARATION_REL} pins as this lane's work`,
        });
        continue;
      }
      // A condition or a discarded failure ON THE STEP is a second gate the declaration does not
      // know about: the job's own condition is pinned in `dependencyConditions`, and a step that
      // adds one can stop doing the work on runs where the lane did not skip.
      for (const step of seen) {
        if (step.if !== undefined) {
          findings.push({
            rule: "required-context",
            file: rel,
            job: String(jobKey),
            detail: `carries ${JSON.stringify(item)} behind its own condition (if: ${String(step.if)}) — the lane's skip is declared, a second gate inside it is not`,
          });
        }
        if (step["continue-on-error"] !== undefined && step["continue-on-error"] !== false) {
          findings.push({
            rule: "required-context",
            file: rel,
            job: String(jobKey),
            detail: `runs ${JSON.stringify(item)} with continue-on-error: ${String(step["continue-on-error"])}, so the lane reports success whatever the work concluded`,
          });
        }
      }
      // EVERY body seen under the name, for the reason `verificationBodies` gives: a name is not
      // a step, and a second step wearing it must not be able to stand in for the first.
      const pinned = pinnedBodies[item];
      if (typeof pinned !== "string") {
        findings.push({
          rule: "required-context",
          file: DECLARATION_REL,
          job: declaredJob,
          detail: `pins ${JSON.stringify(item)} as a gated verification but records no body digest for it, so what it does is pinned by nothing`,
        });
        continue;
      }
      for (const step of seen) {
        const digest = verificationBodyDigest(step, root, runDefaults);
        if (digest !== pinned) {
          findings.push({
            rule: "required-context",
            file: rel,
            job: String(jobKey),
            detail: `performs ${JSON.stringify(item)} with a body digest of ${digest} where ${DECLARATION_REL} pins ${pinned} — recompute with \`node scripts/pin-verification-bodies.mjs\` and land it in the same change`,
          });
        }
      }
    }

    // PROPERTY 2f — and the values a gated lane expands over are the declared ones.
    //
    // Review finding [97]: a step named `Run tests (${{ matrix.slice }})` is digested with the
    // EXPRESSION in it, so its digest says nothing about what the expression expands to. A value
    // rewritten to `unit || true #` hands the shell a command that succeeds whatever the tests
    // did; values removed from the list drop whole slices. Neither moves a pinned body, and
    // `matrix-fail-fast` looks only at `fail-fast`.
    const declaredMatrices = isRecord(context.dependencyMatrices)
      ? context.dependencyMatrices
      : undefined;
    if (declaredMatrices === undefined) {
      findings.push({
        rule: "required-context",
        file: DECLARATION_REL,
        job: declaredJob,
        detail:
          "declares no `dependencyMatrices` mapping, so the values a gated lane expands over — which reach the shell and are invisible to a body digest — are pinned by nothing",
      });
    }
    for (const [jobKey, axes] of Object.entries(declaredMatrices ?? {})) {
      const job = jobsByKey.get(jobKey);
      if (job === undefined || !isRecord(axes)) {
        findings.push({
          rule: "required-context",
          file: rel,
          job: declaredJob,
          detail: `pins a matrix for ${jobKey}, which ${workflow} declares no such job or which this lane cannot read as a mapping of axes`,
        });
        continue;
      }
      const strategy = isRecord(job.strategy) ? job.strategy : undefined;
      const matrix = strategy !== undefined && isRecord(strategy.matrix) ? strategy.matrix : {};
      for (const axis of new Set([...Object.keys(axes), ...Object.keys(matrix)])) {
        const want = axes[axis];
        const got = matrix[axis];
        const wantList = Array.isArray(want) ? want.map((v) => String(v)) : undefined;
        const gotList = Array.isArray(got) ? got.map((v) => String(v)) : undefined;
        if (
          wantList === undefined ||
          gotList === undefined ||
          wantList.length !== gotList.length ||
          wantList.some((value, index) => value !== gotList[index])
        ) {
          findings.push({
            rule: "required-context",
            file: rel,
            job: jobKey,
            detail: `expands its matrix axis ${JSON.stringify(axis)} over ${gotList === undefined ? "something this lane cannot read as a list" : JSON.stringify(gotList)} where ${DECLARATION_REL} declares ${wantList === undefined ? "no such axis" : JSON.stringify(wantList)} — every value reaches the shell of a step whose digest holds the expression and not what it expands to`,
          });
        }
      }
    }

    // PROPERTY 2g — and every local action hashes to what the pre-flight will check.
    //
    // Review finding [95]: the pre-flight refused a command-file NAME and nothing else, so a step
    // added to the toolchain action could `printf 'process.exit(0)' > <the hygiene lane>` and
    // replace this program before it ran — or rewrite any verification source, in every job that
    // uses the action. Enumerating what a step may DO is the losing side of that argument; what
    // the action IS can be pinned, and an edit then has to arrive with its digest.
    //
    // Three agreements, because two of them can drift apart on their own: the declaration and the
    // data file the pre-flight reads, the data file and the bytes on disk, and the data file and
    // the set of files present.
    const pinnedActions = isRecord(context.pinnedBytes) ? context.pinnedBytes : undefined;
    if (pinnedActions === undefined || Object.keys(pinnedActions).length === 0) {
      findings.push({
        rule: "required-context",
        file: DECLARATION_REL,
        job: declaredJob,
        detail:
          "declares no `pinnedBytes` mapping, so the composite actions that run before every verification in every job are pinned by nothing",
      });
    } else {
      const listed = new Map();
      const listText = readBoundedText(path.join(root, PINNED_BYTES_REL), MAX_WORKFLOW_BYTES);
      if (listText === undefined) {
        findings.push({
          rule: "required-context",
          file: PINNED_BYTES_REL,
          job: declaredJob,
          detail:
            "is missing or not a readable regular file, and the pre-flight refusal reads it before any action runs — without it that refusal has nothing to check",
        });
      } else {
        for (const line of listText.split(/\r?\n/)) {
          const match = /^([0-9a-f]{64})\s\s(.+)$/.exec(line.trim());
          if (match !== null) listed.set(match[2], match[1]);
        }
      }

      for (const [rel_, digest] of Object.entries(pinnedActions)) {
        if (listed.get(rel_) !== digest) {
          findings.push({
            rule: "required-context",
            file: PINNED_BYTES_REL,
            job: declaredJob,
            detail: `pins ${rel_} as ${String(listed.get(rel_))} where ${DECLARATION_REL} declares ${String(digest)} — the pre-flight reads the file and this reads the declaration, and a refusal that checks a different list from the one it was given is no refusal`,
          });
        }
      }
      for (const rel_ of listed.keys()) {
        if (!Object.prototype.hasOwnProperty.call(pinnedActions, rel_)) {
          findings.push({
            rule: "required-context",
            file: PINNED_BYTES_REL,
            job: declaredJob,
            detail: `pins ${rel_}, which ${DECLARATION_REL} does not declare`,
          });
        }
      }

      // …and the bytes on disk. The pre-flight checks this too, on the runner; this checks it
      // where a reviewer reads, and catches a list that drifted from the tree in a pull request
      // that never reached the runner.
      const present = new Set();
      for (const pinnedRoot of [ACTIONS_ROOT_REL, "scripts"]) {
        for (const rel_ of filesUnder(root, pinnedRoot)) present.add(rel_);
      }
      for (const [rel_, digest] of Object.entries(pinnedActions)) {
        const bytes = readBoundedText(path.join(root, rel_), MAX_WORKFLOW_BYTES);
        if (bytes === undefined) {
          findings.push({
            rule: "required-context",
            file: rel_,
            job: declaredJob,
            detail:
              "is pinned as a local action but is not a readable regular file, so what runs before every verification cannot be checked against its digest",
          });
          continue;
        }
        const actual = createHash("sha256").update(bytes, "utf-8").digest("hex");
        if (actual !== digest) {
          findings.push({
            rule: "required-context",
            file: rel_,
            job: declaredJob,
            detail: `hashes to ${actual} where ${DECLARATION_REL} pins ${String(digest)} — a local action runs before every verification in every job that uses it, so an edit arrives with its digest or not at all`,
          });
        }
      }
      for (const rel_ of present) {
        if (!Object.prototype.hasOwnProperty.call(pinnedActions, rel_)) {
          findings.push({
            rule: "required-context",
            file: rel_,
            job: declaredJob,
            detail: `sits in the composite-action tree and is pinned by nothing — a file the list does not name is a local action nobody reviewed the bytes of`,
          });
        }
      }
    }

    // PROPERTY 2h — and the install lifecycle every job runs is the declared one.
    //
    // Review finding [105]: `pnpm install --frozen-lockfile` runs `preinstall`, `install`,
    // `postinstall` and `prepare` from the manifests — in EVERY job, inside the composite action,
    // before every verification in that job. They are invoked by the package manager rather than
    // by a step body, so the resolution that follows `pnpm ci:lint` into its script never reaches
    // them, and no verification digest covers them. This repository already declares a
    // `preinstall`, so the hole was occupied rather than theoretical.
    const declaredLifecycle = isRecord(context.installLifecycle)
      ? context.installLifecycle
      : undefined;
    if (declaredLifecycle === undefined) {
      findings.push({
        rule: "required-context",
        file: DECLARATION_REL,
        job: declaredJob,
        detail:
          "declares no `installLifecycle` mapping, so the scripts the package manager runs in every job before every verification are pinned by nothing",
      });
    }
    // The manifest SET first. Review finding [107]: this loop walked the manifests the
    // declaration names, so deleting a key here and adding a `prepare` to that manifest
    // reported nothing — and `pnpm install --frozen-lockfile` runs a workspace package's
    // lifecycle exactly as it runs the root's.
    const workspaceManifests = lifecycleManifests(root);
    if (workspaceManifests === undefined) {
      findings.push({
        rule: "required-context",
        file: LIFECYCLE_MANIFESTS_REL,
        job: declaredJob,
        detail:
          "is missing or empty, and the pre-flight reads it before `pnpm install` to decide which manifests may run code at install time — without it that refusal permits everything",
      });
    }
    for (const manifestRel of workspaceManifests ?? []) {
      if (!Object.prototype.hasOwnProperty.call(declaredLifecycle ?? {}, manifestRel)) {
        findings.push({
          rule: "required-context",
          file: DECLARATION_REL,
          job: declaredJob,
          detail: `pins no install lifecycle for ${manifestRel}, which the workspace installs — the package manager runs its hooks in every job before every verification`,
        });
      }
    }
    for (const [manifestRel, declaredScripts] of Object.entries(declaredLifecycle ?? {})) {
      if (!isRecord(declaredScripts)) {
        findings.push({
          rule: "required-context",
          file: DECLARATION_REL,
          job: declaredJob,
          detail: `pins the install lifecycle of ${manifestRel} as something this lane cannot read as a mapping`,
        });
        continue;
      }
      const text = readBoundedText(path.join(root, manifestRel), MAX_WORKFLOW_BYTES);
      if (text === undefined) {
        findings.push({
          rule: "required-context",
          file: manifestRel,
          job: declaredJob,
          detail:
            "is pinned for its install lifecycle but is not a readable regular file, so what the package manager runs before every verification cannot be checked",
        });
        continue;
      }
      let manifest;
      try {
        manifest = JSON.parse(text);
      } catch {
        findings.push({
          rule: "required-context",
          file: manifestRel,
          job: declaredJob,
          detail: "does not parse as JSON, so its install lifecycle cannot be read",
        });
        continue;
      }
      const scripts = isRecord(manifest) && isRecord(manifest.scripts) ? manifest.scripts : {};
      for (const name of INSTALL_LIFECYCLE) {
        const want = declaredScripts[name];
        const got = scripts[name];
        if (want === undefined && got === undefined) continue;
        if (String(want) !== String(got)) {
          findings.push({
            rule: "required-context",
            file: manifestRel,
            job: declaredJob,
            detail: `declares ${name} as ${got === undefined ? "absent" : JSON.stringify(String(got))} where ${DECLARATION_REL} pins ${want === undefined ? "absent" : JSON.stringify(String(want))} — the package manager runs it in every job before every verification, and no body digest reaches it`,
          });
        }
      }
    }
    // PROPERTY 3 PRECONDITION — there is something to check. A context that names a real,
    // unskippable job and enumerates nothing passes properties 1 and 2 and then iterates an
    // empty list, so the rule reports PASS having verified the one property that carries the
    // obligation against nothing. An empty verification set is a declaration that the job
    // verifies nothing, which is not a state this repository has any use for.
    if (wanted.length === 0) {
      findings.push({
        rule: "required-context",
        file: rel,
        job: declaredJob,
        detail: `is declared in ${DECLARATION_REL} with an empty or missing verificationSet, so the third property is checked against nothing`,
      });
    }

    // PROPERTY 3 — and its enumerated verification set is intact, where intact means
    // UNCONDITIONALLY performed. An item may live in the declared job or in any job it
    // depends on; relocating work into a dependency is legal, relocating it out of reach is
    // not — and putting it behind a step condition relocates it out of reach on every run
    // where that condition is false, while leaving the name in the diff for a reviewer to
    // read as still present.
    const performed = new Set();
    const conditional = new Map();
    /** Declared items whose effective shell is a command template rather than a named shell. */
    const templateShells = new Map();
    /** Declared items whose effective environment can replace what the shell runs. */
    const hijackedEnv = new Map();
    /** Steps anywhere in the closure that set the environment of the steps after them. */
    const environmentWriters = new Map();
    /** The same, inside a local composite action the closure invokes. */
    const actionWriters = new Map();
    // Read once per context, and a list this lane cannot read is a finding rather than an
    // empty search: a by-name rule with no names reports PASS over every step there is.
    const closureActionsAllowed = Array.isArray(context.closureActions)
      ? context.closureActions.filter((name) => typeof name === "string")
      : [];
    if (!Array.isArray(context.closureActions)) {
      findings.push({
        rule: "required-context",
        file: DECLARATION_REL,
        job: declaredJob,
        detail:
          "declares no `closureActions` array, so the external actions a step in this closure may invoke are pinned by nothing",
      });
    }
    const nestedActionsAllowed = Array.isArray(context.nestedActions)
      ? context.nestedActions.filter((name) => typeof name === "string")
      : [];
    const commandFiles = commandFileNames(root) ?? [];
    if (commandFiles.length === 0) {
      findings.push({
        rule: "required-context",
        file: COMMAND_FILES_REL,
        job: declaredJob,
        detail:
          "is missing, empty, or not a readable regular file, so the rule that refuses a step reaching a workflow command file has no names to look for — and the pre-flight refusal in the lint job reads the same list",
      });
    }
    // …and it holds what the declaration says it holds. This is the one input neither pin
    // covers on its own: the pre-flight step's body digest hashes the SCRIPT, not the data file
    // the script opens at runtime, so dropping one name from the file leaves both readers
    // narrowed and every check reporting PASS. Equality, in both directions.
    const pinnedCommandFiles = Array.isArray(context.commandFiles)
      ? context.commandFiles.filter((name) => typeof name === "string" && name.length > 0)
      : undefined;
    if (pinnedCommandFiles === undefined) {
      findings.push({
        rule: "required-context",
        file: DECLARATION_REL,
        job: declaredJob,
        detail: `declares no \`commandFiles\` array, so the list in ${COMMAND_FILES_REL} that both the by-name rule and the pre-flight refusal read is pinned by nothing`,
      });
    } else {
      for (const name of pinnedCommandFiles) {
        if (!commandFiles.includes(name)) {
          findings.push({
            rule: "required-context",
            file: COMMAND_FILES_REL,
            job: declaredJob,
            detail: `no longer names ${name}, which ${DECLARATION_REL} declares it must — both the by-name rule and the pre-flight refusal read this file, so a name removed here is a refusal removed from two places at once`,
          });
        }
      }
      for (const name of commandFiles) {
        if (!pinnedCommandFiles.includes(name)) {
          findings.push({
            rule: "required-context",
            file: COMMAND_FILES_REL,
            job: declaredJob,
            detail: `names ${name}, which ${DECLARATION_REL} does not declare — an added name widens what both readers refuse, which is a change to what this context means`,
          });
        }
      }
    }
    for (const key of needsClosure(jobsByKey, declaredJob)) {
      const job = jobsByKey.get(key);
      const steps = job !== undefined && Array.isArray(job.steps) ? job.steps : [];
      // Resolved once per job: the two outer `defaults.run` levels a step inherits are not
      // visible from the step object, and both change what it does. Review finding [41].
      const runDefaults = effectiveRunDefaults(inFile[0]?.workflow, job);
      // A DEPENDENCY that can be skipped performs nothing, whatever its steps say. Review
      // finding [37]: `always()` on the declared job stands down property 2 for the whole
      // closure — correctly, since a skipped dependency is the state `always()` is for — and
      // property 3 then went on counting that dependency's steps as unconditionally
      // performed. Measured: `if: false` on `build` left the six build-side verification
      // items reading as performed, the aggregate verdict accepts `skipped`, and the required
      // context went green with the pack verification and all three self-validates never run.
      //
      // So the `always()` exception stays where it belongs — on the aggregate job itself, so
      // that it can classify what its dependencies did — and a condition on a dependency
      // disqualifies the items that dependency carries. Relocating a verification into a
      // conditional job is relocating it out of reach, which is the same fault as putting it
      // behind a step condition and is reported the same way.
      const jobGuard =
        key !== declaredJob && job !== undefined && job.if !== undefined
          ? `job ${key} if: ${String(job.if)}`
          : undefined;
      // A JOB-level `continue-on-error` discards that job's failure the way a step-level one
      // discards a step's, and it was checked only on steps. Review finding [52]: putting it on
      // `ci-pass` itself — the one aggregate the required context sits on — means the verdict can
      // exit 1 and the context still passes, with every pinned digest and every rule below
      // unchanged. Only absent or the literal `false` is accepted, for the same reason as the
      // step-level rule: an expression reaches the parser as a string, and this lane evaluates
      // none.
      const jobContinueOnError = job?.["continue-on-error"];
      if (jobContinueOnError !== undefined && jobContinueOnError !== false) {
        findings.push({
          rule: "required-context",
          file: rel,
          job: declaredJob,
          detail: `is carried by the job ${key}, which declares continue-on-error: ${String(jobContinueOnError)} — that job's failure is discarded, so everything it verifies can fail while this context reports success`,
        });
      }
      // A `container:` replaces the machine every `run:` in that job executes on. Review finding
      // [65]: an image whose `/bin/sh` returns 0 having done nothing makes every step in the
      // closure succeed — including the aggregate verdict — with `run`, `shell`, `env` and every
      // pinned digest untouched, because the digest describes the step and this describes where
      // it runs. It is the `PATH` and `BASH_ENV` question one level further out, and it takes the
      // same answer: refused, not merely recorded, because the pin tool is committed and a
      // digest a pull request can recompute is not a refusal.
      //
      // Refused outright rather than allow-listed by image digest. This repository's own CI runs
      // no job in a container, so a closed list would have no members — and an empty allow-list
      // is a rule nobody can read. A verification that genuinely needs one is a change to this
      // file, which is the point.
      const jobContainer = job?.["container"];
      if (jobContainer !== undefined) {
        findings.push({
          rule: "required-context",
          file: rel,
          job: declaredJob,
          detail: `is carried by the job ${key}, which declares a container (${JSON.stringify(jobContainer)}) — that image replaces the machine every \`run:\` in the job executes on, so an image whose shell returns 0 having done nothing passes every verification this context enumerates`,
        });
      }
      for (const [index, step] of steps.entries()) {
        if (!isRecord(step)) continue;

        // ── Two checks that do not care whether the step has a NAME ──────────────────────
        //
        // Review finding [78]: everything below keys on `step.name`, because property 3 is about
        // DECLARED items and a declaration names one — so the guard skipping unnamed steps was
        // right for that and wrong for these. A step needs no name to write `$GITHUB_ENV`, and
        // `- run: echo "BASH_ENV=…" >> "$GITHUB_ENV"` with no `name:` went past the writer check
        // untouched. Measured while testing the composite-action scan below: `ci.yml`'s seven
        // `- uses: ./.github/actions/setup` steps are all unnamed, so the scan was unreachable.
        //
        // A step that writes one of the workflow command files sets the environment of every step
        // AFTER it, which no declared-env check can see. Review finding [69]. Recorded against
        // the JOB rather than against a declared item: the writer need not be a declared
        // verification itself — it only has to run before one.
        //
        // The NAME of the file, anywhere in the body — not an enumeration of the ways a shell can
        // spell a reference to it. Review finding [72]: the first version matched `$GITHUB_ENV`
        // and `${{ env.GITHUB_ENV }}`, and `>> "${GITHUB_ENV}"` — the ordinary brace form — went
        // straight through. There is no end to that list: a variable holding the path,
        // `printenv`, a here-doc. Reaching the file at all is the thing to refuse.
        //
        // Conservative on purpose: a step that merely MENTIONS the name in a comment is flagged
        // too. Inside a required verification's closure that is the right direction, and this
        // repository's closure mentions neither.
        //
        // Outside the conditional chain below, too: a writer that carries an `if:` still writes on
        // the runs where its condition holds.
        const body = typeof step.run === "string" ? step.run : "";
        const site =
          typeof step.name === "string"
            ? `named ${JSON.stringify(step.name)}`
            : `#${String(index + 1)} (unnamed)`;
        // The `run:` text is not the only place a step can name one. Review finding [79]: a
        // `with:` value reaches a composite action's own `run:` through `${{ inputs.… }}`, and an
        // `env:` value can carry the path for a body to append to under a different name —
        // `env: { OUT: $GITHUB_ENV }` and then `echo … >> "$OUT"`. Neither appears in the text
        // this used to search, and both write the same file. The whole surface the step supplies
        // is searched instead: its body, its inputs, and its effective environment's VALUES.
        //
        // (The environment's NAMES are a different rule — `PRELOAD_HIJACK_ENV`, below — because
        // those replace what the step runs rather than what the next one inherits.)
        const surface = [
          body,
          JSON.stringify(step["with"] ?? null),
          ...[...effectiveEnv(runDefaults.env, step["env"])].map(([, value]) => String(value)),
        ].join("\n");
        for (const file of commandFiles) {
          if (surface.includes(file)) environmentWriters.set(site, file);
        }
        // …and the same refusal for a LOCAL composite action the step invokes, whose steps no
        // pinned digest covers. See `localActionCommandFileWrites`.
        const invoked = typeof step.uses === "string" ? step.uses : "";
        // An EXTERNAL action invoked DIRECTLY by a step in this closure is examined by nothing:
        // the scan below opens an action only when the reference starts with `./`, and
        // `nestedActions` covers what a local action reaches rather than what the closure
        // itself invokes. Review finding [106]. A SHA pin makes a reference immutable and says
        // nothing about what it does.
        if (invoked !== "" && !invoked.startsWith("./")) {
          if (!closureActionsAllowed.includes(invoked)) {
            actionWriters.set(
              `${rel} step ${JSON.stringify(site)}`,
              `invokes the external action ${invoked}, which ${DECLARATION_REL} does not enumerate — its code runs in this closure before the verdict, and nothing in this repository reads it`,
            );
          }
        }
        if (invoked.startsWith("./")) {
          for (const write of localActionCommandFileWrites(root, invoked, commandFiles)) {
            if (write.note === EXTERNAL_ACTION_NOTE) {
              // Against the declared set, exactly. The allow-list lives in the declaration
              // because the preamble legitimately needs an external action to get a Node, and
              // the SHA is part of the entry so a bump is read here too.
              const reference = write.step.replace(/^uses /, "");
              if (!nestedActionsAllowed.includes(reference)) {
                actionWriters.set(
                  `${write.file} step ${JSON.stringify(write.step)}`,
                  `invokes an external action ${DECLARATION_REL} does not enumerate — its code runs in this closure and nothing in this repository reads it`,
                );
              }
              continue;
            }
            actionWriters.set(`${write.file} step ${JSON.stringify(write.step)}`, write.note);
          }
        }

        // ── and from here on, the declared-item properties, which need one ────────────────
        if (typeof step.name !== "string") continue;
        // ANY `if` disqualifies, and the lane does not sort conditions into harmless and
        // harmful. It evaluates no GitHub expressions — at parse time `always()` and
        // `${{ inputs.deep }}` are the same shape — and property 2 one level up already
        // applies exactly this rule to a job-level condition. A verification item that has
        // to be conditional is an item that has to stop being declared, which is a visible
        // edit to this file rather than an invisible one to the workflow.
        //
        // A name appearing both ways still counts as performed: the unconditional
        // occurrence is the one that runs.
        //
        // A `continue-on-error` that is not the literal `false` disqualifies for the same
        // reason a condition does, and it is the WORSE of the two: the step still runs,
        // still shows its name in the log, and its failure is discarded — so the required
        // context stays green while the verification it names establishes nothing. It is
        // recorded as the reason, not merged into the `if` case.
        //
        // Only `false` is accepted, never `!== true`. `continue-on-error: ${{ true }}` and
        // `${{ matrix.experimental }}` reach the parser as STRINGS, and a strict comparison
        // against `true` waves both of them through — the step then discards its failure at
        // runtime while this lane records it as performed. This lane evaluates no GitHub
        // expressions, and it does not need to: an expression here is exactly the invisible
        // conditionality property 2 rejects, whatever it evaluates to.

        const continueOnError = step["continue-on-error"];
        if (continueOnError !== undefined && continueOnError !== false) {
          if (!performed.has(step.name)) {
            conditional.set(step.name, `continue-on-error: ${String(continueOnError)}`);
          }
        } else if (jobGuard !== undefined) {
          if (!performed.has(step.name)) conditional.set(step.name, jobGuard);
        } else if (step.if === undefined) {
          performed.add(step.name);
          // EVERY digest seen under this name, not the last one. Review finding [24], first escape:
          // `needsClosure` yields the declaring job first, so hollowing out `ci-pass`'s verdict step
          // and pasting the original — same name — into `lint` let last-write-wins restore the
          // pinned digest with no edit to the declaration at all. Measured: the lane exited 0.
          //
          // A name is not a step. Collecting the set and requiring every member to match is what
          // makes a second step wearing the name a finding rather than a substitute for the first.
          const seen = bodies.get(step.name) ?? new Set();
          seen.add(verificationBodyDigest(step, root, runDefaults));
          // …and the shell it runs under must be one that returns the BODY's status. A command
          // template wraps the body, so `bash {0} || true` performs the step's name and
          // discards its result — which the digest records but nothing else would reject.
          const effectiveShell = step.shell ?? runDefaults.shell;
          if (effectiveShell !== undefined && !NAMED_SHELLS.has(String(effectiveShell))) {
            templateShells.set(step.name, String(effectiveShell));
          }
          for (const [name] of effectiveEnv(runDefaults.env, step["env"])) {
            if (PRELOAD_HIJACK_ENV.has(name)) hijackedEnv.set(step.name, name);
          }
          bodies.set(step.name, seen);
        } else if (!performed.has(step.name)) conditional.set(step.name, `if: ${String(step.if)}`);
      }
    }
    for (const [site, note] of actionWriters) {
      findings.push({
        rule: "required-context",
        file: rel,
        job: declaredJob,
        detail: `invokes a local action, and ${site} ${note} — a local action's bytes are in no pinned verification digest, so what it does sets the environment of every step after it in every job that runs it, invisibly`,
      });
    }
    for (const [site, file] of environmentWriters) {
      findings.push({
        rule: "required-context",
        file: rel,
        job: declaredJob,
        detail: `depends on a step ${site} that reaches $${file}, which sets the environment of every step after it — a value no declared \`env:\` carries and no pinned body digest moves, and one that can stop the later steps running at all`,
      });
    }

    for (const item of wanted) {
      const hijackName = hijackedEnv.get(item);
      if (hijackName !== undefined) {
        findings.push({
          rule: "required-context",
          file: rel,
          job: declaredJob,
          detail: `performs the declared verification item "${item}" with ${hijackName} in its effective environment (its own, its job's or its workflow's) — that name makes an interpreter or a loader run something before the thing it was asked to run, so the step body can be skipped entirely while the step reports success`,
        });
      }
      const templateShell = templateShells.get(item);
      if (templateShell !== undefined) {
        findings.push({
          rule: "required-context",
          file: rel,
          job: declaredJob,
          detail: `performs the declared verification item "${item}" under the shell ${JSON.stringify(templateShell)}, which is a command template rather than one of GitHub's named shells (${[...NAMED_SHELLS].join(", ")}) — a template wraps the body and reports its OWN status, so the step performs the name and discards the result`,
        });
      }
      if (performed.has(item)) {
        // Performed, unconditionally. The remaining question is whether it still DOES anything:
        // membership was decided by the step's NAME alone, so review finding [03] pointed out
        // that replacing `run: pnpm ci:build-verify` with `run: true` under the same name left
        // this lane green while the required context verified nothing. The declaration pins the
        // body, and a body that moves is a change to read — which is what every other pin in
        // this repository means too.
        const pinned = pinnedBodies[item];
        const actual = bodies.get(item);
        if (pinned === undefined) {
          // Review finding [24]. `pinned !== undefined && …` skipped the comparison entirely for
          // an item with no digest, so the repair for [03] could be undone in one move: replace a
          // step's `run:` with `true` AND delete that item's key from `verificationBodies`. Done to
          // "Derive the verdict from the serialized needs map", the aggregate job every required
          // context depends on would succeed while lint, test and build failed under it.
          //
          // A declared item with no pinned body is therefore a finding in its own right. The
          // declaration names what the context verifies; a name with nothing behind it is the
          // shape this whole rule exists to reject, one level up.
          findings.push({
            rule: "required-context",
            file: rel,
            job: declaredJob,
            detail: `declares the verification item ${JSON.stringify(item)} but pins no body digest for it in \`verificationBodies\`; a named item with no pinned body is verified by nothing`,
          });
        } else {
          // EVERY step wearing the item's name has to carry the pinned body — not merely one of
          // them. A mismatch is reported with the whole set, because "expected X, found Y" is
          // misleading when the tree holds both.
          const seen = [...(actual ?? new Set())].sort();
          if (seen.length !== 1 || seen[0] !== pinned) {
            findings.push({
              rule: "required-context",
              file: rel,
              job: declaredJob,
              detail: `performs the declared verification item "${item}" with ${seen.length === 0 ? "no body at all" : `body digest(s) ${JSON.stringify(seen)}`} rather than exactly the pinned ${pinned}; update "verificationBodies" in the declaration in the same change if the edit is intended, and note that a SECOND step sharing the name does not stand in for the first`,
            });
          }
        }
        continue;
      }
      const guard = conditional.get(item);
      findings.push({
        rule: "required-context",
        file: rel,
        job: declaredJob,
        detail:
          guard === undefined
            ? `no longer performs the declared verification item "${item}", and no job it depends on performs it either`
            : `performs the declared verification item "${item}" only under a guard (${guard}), so its result does not reach every run this context is required for`,
      });
    }
  }
  return findings;
}

/**
 * `[10]`: a version marker anywhere in a shipped file, comments included.
 *
 * This is the ONE rule in the lane that reads raw bytes rather than the parsed tree, and it has to.
 * `.agents/rules/distributed-surface.md` forbids `vN.M[.P]` across the whole distributed surface,
 * and the post-build leakage guard matches it with `grep -rnE` over entire files — but neither of
 * this repository's PARSING gates can see a YAML comment: `lint:shipping` skips comment lines
 * before its shipped-runtime rules apply, and the shape gate loses comments at parse time. So
 * `# v9.9.9` appended to a shipped workflow passed `pnpm ci:lint` and produced no
 * `R-WORKFLOW-HYGIENE-DRIFT` payload at all — the shipped-workflows contract requires the hygiene
 * lane to be the rule that catches the comment case, precisely because the others are comment-blind.
 *
 * The pattern is the leakage guard's `INTERNAL_VERSION_RE`, deliberately identical: the operative
 * property is a leading `v`, not where the text sits. A step name reading `Setup pnpm v10.15.0`
 * fails exactly as a trailer comment does, and the contract's adopted resolution is to drop the `v`.
 */
const SHIPPED_VERSION_MARKER = /\bv[0-9]+\.[0-9]+(?:\.[0-9]+)?\b/;

function checkShippedVersionMarkers(root) {
  const findings = [];
  for (const { rel, tree } of WORKFLOW_ROOTS) {
    if (tree !== "shipped") continue;
    for (const file of yamlFilesUnder(root, rel)) {
      const text = readBoundedText(path.join(root, file), MAX_WORKFLOW_BYTES);
      if (text === undefined) continue; // `parseFile` already reports an unreadable path
      text.split(/\r?\n/).forEach((line, index) => {
        const marker = SHIPPED_VERSION_MARKER.exec(line);
        if (marker === null) return;
        findings.push({
          rule: "shipped-version-marker",
          file,
          job: `line ${index + 1}`,
          detail:
            `carries the version marker ${JSON.stringify(marker[0])}, which the distributed-surface ` +
            "rule forbids anywhere in a shipped file; drop the leading `v` (the contract's adopted " +
            "resolution) or remove the text",
        });
      });
    }
  }
  return findings;
}

/**
 * The runner labels a shipped workflow may name.
 *
 * A closed set of PUBLIC GitHub-hosted runners. `[14]`: switching a shipped `runs-on` to
 * `self-hosted`, or to an organization's private label, produced no finding — the lane applied only
 * the third-party rule to the shipped tree, and said so in its own coverage boundary. The
 * shipped-workflows contract requires a non-public label literal to be rejected under this code,
 * with the file/job/rule payload, and for a concrete reason: a workflow QFAI ships runs in the
 * adopter's repository, where a private label either does not resolve or resolves to a machine
 * QFAI knows nothing about.
 *
 * `-latest` images and the pinned-version forms are both here, because an adopter pinning
 * `ubuntu-22.04` is naming a public runner just as much as one taking the moving label.
 */
const PUBLIC_RUNNER_LABELS = new Set([
  "ubuntu-latest",
  "ubuntu-24.04",
  "ubuntu-22.04",
  "windows-latest",
  "windows-2025",
  "windows-2022",
  "macos-latest",
  "macos-15",
  "macos-14",
]);

/**
 * Every runner LABEL LITERAL a shipped file names, from one `runs-on` value.
 *
 * The contract forbids a non-public label LITERAL, and the shipped set deliberately writes
 * `${{ vars.QFAI_CI_RUNNER || 'ubuntu-latest' }}` — the adopter selects their own runner through a
 * repository variable, with a public default. Judging the whole string would reject that sanctioned
 * selector on every job, which is a rule failing on the one arrangement it is supposed to allow.
 *
 * So an expression contributes the literals INSIDE it. An expression naming no literal ships no
 * literal and passes: what the adopter puts in their own variable is their repository's business,
 * and it is not a value QFAI ships. A literal of `self-hosted`, or an organization's private label,
 * is a value QFAI ships and is exactly what this rejects.
 */
function runnerLabelLiterals(runsOn) {
  if (typeof runsOn === "string") {
    if (!runsOn.includes("${{")) return [runsOn];
    return [...runsOn.matchAll(/'([^']*)'|"([^"]*)"/g)].map((match) => match[1] ?? match[2] ?? "");
  }
  if (Array.isArray(runsOn)) return runsOn.flatMap((entry) => runnerLabelLiterals(entry));
  // A mapping, a number, anything else: not a literal this lane can read, and an unreadable
  // `runs-on` in a SHIPPED file is reported rather than skipped — a closed set is only closed if
  // everything is measured against it.
  return [`<unreadable> ${JSON.stringify(runsOn)}`];
}

function checkShippedRunnerLabels(jobs) {
  const findings = [];
  for (const { file, job, jobKey, tree } of jobs) {
    if (tree !== "shipped") continue;
    const runsOn = isRecord(job) ? job["runs-on"] : undefined;
    if (runsOn === undefined) continue;
    for (const label of runnerLabelLiterals(runsOn)) {
      if (PUBLIC_RUNNER_LABELS.has(label)) continue;
      findings.push({
        rule: "shipped-runner-label",
        file,
        job: jobKey,
        detail:
          `names the runner label ${JSON.stringify(label)}, which is not one of the public ` +
          "GitHub-hosted runners a shipped workflow may ship; a private or self-hosted literal " +
          "does not resolve in an adopter's repository",
      });
    }
  }
  return findings;
}
export function runHygieneLane(root) {
  const { jobs, findings: structural } = collectJobs(root);
  const uses = collectUses(root, jobs);
  return [
    ...structural,
    ...checkJobGuardrails(jobs),
    ...checkMatrixFailFast(jobs),
    ...checkGlobalInstallPins(root, jobs),
    ...checkSecretInheritance(jobs),
    ...checkCheckoutCredentials(root, jobs),
    ...checkActionPins(uses),
    ...checkShippedThirdParty(uses),
    ...checkShippedVersionMarkers(root),
    ...checkShippedRunnerLabels(jobs),
    ...checkRequiredContexts(root, jobs),
  ];
}

/**
 * Write the findings where the Reviewer Gate can read them.
 *
 * Review finding [15]: the lane wrote its findings to stderr as prose, and
 * `validateReviewerJustification` ingests only `{ findings: [...] }` JSON under `.qfai/review/**`.
 * There was no production bridge between the two anywhere in the repository — the E2E test that
 * demonstrates the ingestion parsed stderr and hand-built the JSON itself, which proves the GATE
 * works and proves nothing about the path reaching it. So a hygiene violation failed the CI log and
 * never once reached the reviewer the shipped-workflows contract promises it reaches.
 *
 * The lane writes it, rather than a workflow step converting it: a converter in YAML would be a
 * second parser for this lane's own output, and the first wording change would silently empty it.
 *
 * Written on every run, INCLUDING a clean one. An empty `findings` array is the statement that the
 * bridge ran and found nothing; a missing file then means the bridge did not run, which is a
 * different fact and worth being able to tell apart. It also overwrites a stale artifact from an
 * earlier run rather than leaving one to be read as current.
 *
 * `justification` is deliberately absent. `R-WORKFLOW-HYGIENE-DRIFT` sits in
 * `DEFERRED_CATALOG_REGISTRATION_CODES`, so the gate recognizes it as ingested-and-exempt and does
 * not require one; inventing a justification here would be this lane answering a question the
 * reviewer is there to answer.
 */
function writeReviewerArtifact(root, reportDir, findings) {
  // BEFORE the mkdir and again after it. `mkdirSync(..., { recursive: true })` follows an existing
  // component and creates nothing there, so checking only afterwards means the missing directories
  // have already been created on the far side of the link. Checking only beforehand leaves the
  // window in which one appears. Both, then — the first walk skips components that do not exist
  // yet, because the mkdir is what creates them and a directory it creates is not a link.
  refuseLinkedDescent(root, reportDir);
  mkdirSync(reportDir, { recursive: true });
  refuseLinkedDescent(root, reportDir);
  const payload = {
    findings: findings.map((f) => ({
      code: CODE,
      rule: f.rule,
      file: f.file,
      job: f.job,
      detail: f.detail,
    })),
  };
  const target = path.join(reportDir, WORKFLOW_HYGIENE_REPORT_FILE);
  writeExclusivelyThenRename(target, `${JSON.stringify(payload, null, 2)}\n`);
  return target;
}

/**
 * Refuses a report directory reached through a link.
 *
 * Every component between `root` and `dir` must be a real directory. Review finding [48]:
 * `.qfai/review/**` is gitignored but not unwritable, and a pull request can force-add a path
 * under it — including a directory component that is a symlink, which `mkdirSync` follows
 * without creating anything. This lane runs on an untrusted checkout, from `ci:lint` and from
 * the `build` bridge, so a followed component puts the write wherever the pull request says.
 */
function refuseLinkedDescent(root, dir) {
  // Inside the checkout, every component is checked: that is the surface a pull request can
  // write. A report directory the OPERATOR named outside it is their own path, and only its final
  // component is inspected — the exclusive create and rename below is what stops the artifact's
  // own name from being a link either way.
  const relative = path.relative(root, dir);
  const inside = relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
  const segments = inside ? relative.split(path.sep) : [path.basename(dir)];
  let current = inside ? root : path.dirname(dir);
  for (const segment of segments) {
    current = path.join(current, segment);
    let inspected;
    try {
      inspected = lstatSync(current);
    } catch {
      return; // not there yet: the mkdir creates it, and everything below it, as real directories
    }
    if (inspected.isSymbolicLink() || !inspected.isDirectory()) {
      throw new Error(
        `check-workflow-hygiene: ${current} is not a real directory; refusing to write the ` +
          "reviewer artifact through it",
      );
    }
  }
}

/**
 * Writes `text` to `target` without ever writing THROUGH `target`.
 *
 * `writeFileSync` follows a symlink and truncates whatever it points at, and this artifact's
 * name sits in a gitignored — not unwritable — directory on an untrusted checkout. So the
 * bytes go to an exclusive temp name beside it and a `rename` puts them in place: `rename`
 * REPLACES the name, link and all, rather than writing through it. It is the same shape the
 * provenance record writer uses, and for the same reason.
 */
function writeExclusivelyThenRename(target, text) {
  // The parent's IDENTITY — device and inode — pinned across the whole write.
  //
  // Review finding [71]: comparing only `dev` proves the staging file and the verified directory
  // are on one filesystem, which a checkout and any other directory on the same volume already
  // are. So swapping `reportDir` for a link to a sibling directory after the descent check
  // passed this test, and the rename then replaced an artifact over there.
  //
  // The inode is what says it is the SAME directory. It is read before the open and again after
  // it, and once more before the rename — Node has no `openat` or `renameat`, so the identity is
  // compared rather than the operation being made relative to a held descriptor. What that buys
  // is that a swap is a refusal instead of a silent write, and that the window is one syscall
  // rather than the span between the descent check and the rename.
  const parentPath = path.dirname(target);
  const sameDirectory = (a, b) => a.dev === b.dev && a.ino === b.ino;
  const parent = lstatSync(parentPath);
  const staging = `${target}.${randomBytes(12).toString("hex")}.tmp`;
  const handle = openSync(staging, "wx");
  try {
    const opened = fstatSync(handle);
    if (opened.dev !== parent.dev || !sameDirectory(lstatSync(parentPath), parent)) {
      throw new Error(
        `check-workflow-hygiene: ${parentPath} is not the directory that was verified; refusing ` +
          "to write the reviewer artifact",
      );
    }
    writeFileSync(handle, text, "utf-8");
  } catch (error) {
    closeSync(handle);
    try {
      unlinkSync(staging);
    } catch {
      // the original failure is the one worth reporting
    }
    throw error;
  }
  closeSync(handle);
  if (!sameDirectory(lstatSync(parentPath), parent)) {
    try {
      unlinkSync(staging);
    } catch {
      // going away with the run
    }
    throw new Error(
      `check-workflow-hygiene: ${parentPath} changed while the reviewer artifact was being ` +
        "written; refusing to rename into it",
    );
  }
  try {
    renameSync(staging, target);
  } catch (error) {
    try {
      unlinkSync(staging);
    } catch {
      // the rename is the failure worth reporting
    }
    throw error;
  }
}

/** The artifact's filename, exported so the gate's tests can name it without a second literal. */
export const WORKFLOW_HYGIENE_REPORT_FILE = "workflow-hygiene.json";
function main(argv) {
  const rootFlag = argv.indexOf("--root");
  const root =
    rootFlag >= 0 && argv[rootFlag + 1] !== undefined
      ? path.resolve(argv[rootFlag + 1])
      : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

  const reportFlag = argv.indexOf("--report-dir");
  const reportDir =
    reportFlag >= 0 && argv[reportFlag + 1] !== undefined
      ? path.resolve(root, argv[reportFlag + 1])
      : undefined;

  const findings = runHygieneLane(root);

  // BEFORE the exit-code branch, so a violating run — the only run whose findings matter to a
  // reviewer — is the run that produces the artifact rather than the one that returns early.
  if (reportDir !== undefined) {
    try {
      const target = writeReviewerArtifact(root, reportDir, findings);
      stdout.write(`workflow hygiene: wrote ${findings.length} finding(s) to ${target}\n`);
    } catch (error) {
      // A failed write must not turn a clean tree red, and must not let a dirty one look clean:
      // the exit code below still comes from the findings. It is reported, because a silently
      // absent artifact is the defect this whole bridge exists to remove.
      stderr.write(
        `workflow hygiene: could not write the reviewer artifact to ${reportDir}: ` +
          `${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  }

  if (findings.length > 0) {
    for (const f of findings) {
      stderr.write(`${CODE}: ${f.rule} — ${f.file} job ${f.job}: ${f.detail}\n`);
    }
    stderr.write(
      `\n${CODE}: ${findings.length} violation(s) across ${new Set(findings.map((f) => f.file)).size} file(s).\n`,
    );
    return 1;
  }

  // The coverage boundary, printed because a green result must not read as a
  // blanket assurance — `OQ-0017`'s deferral of an external linter is only honest
  // while this list is visible.
  stdout.write("workflow hygiene: PASS.\n");
  for (const [scope, heading] of SCOPES) {
    stdout.write(`${heading}\n`);
    for (const [ruleScope, id, description] of RULES) {
      if (ruleScope === scope) stdout.write(`  - ${id}: ${description}\n`);
    }
  }
  stdout.write(
    "Not covered here: secret-reference rules and the shipped set’s own contract shape, which " +
      "lint:workflow-shape owns.\n",
  );
  return 0;
}

if (argv[1] !== undefined && import.meta.url === pathToFileURL(argv[1]).href) {
  exit(main(argv.slice(2)));
}
