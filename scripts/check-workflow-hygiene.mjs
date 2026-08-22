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
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { argv, exit, stderr, stdout } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

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
    "declaration",
    "required-context",
    "the declared required-status-context job exists, is unskippable through its whole `needs` closure, and still performs its verification set",
  ],
];

/** The scopes, in print order, with the heading each one is announced under. */
const SCOPES = [
  ["structural", "Rules run over both workflow trees:"],
  ["shipped", "Rules run over the shipped workflow tree only:"],
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

/** Every `*.yml` / `*.yaml` under a directory, recursively, repo-relative. */
function yamlFilesUnder(root, rel) {
  const abs = path.join(root, rel);
  if (!existsSync(abs)) return [];
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.ya?ml$/.test(e.name)) out.push(path.relative(root, p).replace(/\\/g, "/"));
    }
  };
  walk(abs);
  return out;
}

function parseFile(root, rel) {
  try {
    const doc = parseYaml(readFileSync(path.join(root, rel), "utf-8"));
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
  for (const { rel, tree } of WORKFLOW_ROOTS) {
    // A root that resolves to no YAML is reported, not skipped. `yamlFilesUnder` returns an
    // empty list for a directory that does not exist — deliberately, so the walk is not a
    // crash — and the consequence is that a deleted or renamed tree yields no jobs, no
    // findings, and a green run that still PRINTS every rule as one it evaluated. That is the
    // advertised-but-unevaluated shape `TC-0017-0047` catches for a rule; this catches it for
    // a whole tree.
    const files = yamlFilesUnder(root, rel);
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
      if (!step.uses.startsWith("actions/checkout@")) continue;
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
  for (const file of yamlFilesUnder(root, path.join(".github", "actions"))) {
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

function checkActionPins(uses) {
  // A LOCAL reference (`./.github/actions/setup`) has no pin to check and must
  // not be reported: it resolves inside the repository at the same commit, which
  // is the property pinning exists to buy.
  return uses
    .filter((u) => !u.uses.startsWith("./") && !/@[0-9a-f]{40}$/.test(u.uses))
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
  let text;
  try {
    text = readFileSync(path.join(root, DECLARATION_REL), "utf-8");
  } catch (error) {
    return {
      contexts: [],
      findings: [
        {
          rule: "required-context",
          file: DECLARATION_REL,
          job: "(whole file)",
          detail: `could not be read: ${error instanceof Error ? error.message : String(error)}`,
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

    // PROPERTY 2 — and it is not skippable, counting the whole `needs` closure. A job whose
    // dependency is skipped is itself skipped, and a skipped job reports SUCCESS to branch
    // protection — so a condition two edges away is as fatal as one on the job itself.
    for (const key of needsClosure(jobsByKey, declaredJob)) {
      const job = jobsByKey.get(key);
      if (job !== undefined && job.if !== undefined) {
        findings.push({
          rule: "required-context",
          file: rel,
          job: declaredJob,
          detail:
            key === declaredJob
              ? `carries a condition of its own (if: ${String(job.if)}), so it can be skipped and report success`
              : `is skippable through its dependency ${key}, which carries a condition (if: ${String(job.if)})`,
        });
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
    for (const key of needsClosure(jobsByKey, declaredJob)) {
      const job = jobsByKey.get(key);
      const steps = job !== undefined && Array.isArray(job.steps) ? job.steps : [];
      for (const step of steps) {
        if (!isRecord(step) || typeof step.name !== "string") continue;
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
        // `continue-on-error: true` disqualifies for the same reason a condition
        // does, and it is the WORSE of the two: the step still runs, still shows
        // its name in the log, and its failure is discarded — so the required
        // context stays green while the verification it names establishes
        // nothing. It is recorded as the reason, not merged into the `if` case.
        if (step["continue-on-error"] === true) {
          if (!performed.has(step.name)) {
            conditional.set(step.name, "continue-on-error: true");
          }
        } else if (step.if === undefined) performed.add(step.name);
        else if (!performed.has(step.name)) conditional.set(step.name, `if: ${String(step.if)}`);
      }
    }
    for (const item of wanted) {
      if (performed.has(item)) continue;
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

export function runHygieneLane(root) {
  const { jobs, findings: structural } = collectJobs(root);
  const uses = collectUses(root, jobs);
  return [
    ...structural,
    ...checkJobGuardrails(jobs),
    ...checkMatrixFailFast(jobs),
    ...checkSecretInheritance(jobs),
    ...checkCheckoutCredentials(root, jobs),
    ...checkActionPins(uses),
    ...checkShippedThirdParty(uses),
    ...checkRequiredContexts(root, jobs),
  ];
}

function main(argv) {
  const rootFlag = argv.indexOf("--root");
  const root =
    rootFlag >= 0 && argv[rootFlag + 1] !== undefined
      ? path.resolve(argv[rootFlag + 1])
      : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

  const findings = runHygieneLane(root);

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
    "Not covered here: runner-label rules, secret-reference rules, and the shipped set’s own contract shape, which lint:workflow-shape owns.\n",
  );
  return 0;
}

if (argv[1] !== undefined && import.meta.url === pathToFileURL(argv[1]).href) {
  exit(main(argv.slice(2)));
}
