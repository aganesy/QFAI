import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, readFile, realpath, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import fg from "fast-glob";

import { hashAssistantAssetText } from "../assistantAssetProvenance.js";
import { loadConfig, type QfaiConfig } from "../config.js";
import { gitStdout, uncommittedPaths } from "../gitChanges.js";
import { assistantLayerDir } from "../paths/assistantPaths.js";
import { readEffectiveRouting } from "../validators/agentDefinition.js";
import { validateProject } from "../validate.js";
import { resolveToolVersion } from "../version.js";
import { changedSinceStart } from "./boundary.js";
import { areaCovers, everyStageResult } from "./common.js";
import { isRecord } from "./parse.js";
import {
  checkPlans,
  loadBuiltInPlans,
  packagePlansDir,
  planDigestKey,
  WORKFLOW_ROUTES,
} from "./plans.js";
import { storyFactsOf } from "./storyFacts.js";
import type {
  WorkflowDependency,
  WorkflowFacts,
  WorkflowProposal,
  WorkflowResult,
  WorkflowSnapshot,
  WorkflowWorkOrder,
} from "./types.js";

type Digests = Record<string, string>;

// Each file the patterns match, by its project-relative path, digested after CRLF
// normalization so a Windows and a Linux checkout agree.
async function digestsOf(root: string, patterns: string[]): Promise<Digests> {
  const files = await fg(patterns, { cwd: root, dot: true, onlyFiles: true });
  const entries = await Promise.all(
    files
      .sort()
      .map(
        async (file) =>
          [file, hashAssistantAssetText(await readFile(path.join(root, file), "utf8"))] as const,
      ),
  );
  return Object.fromEntries(entries);
}

export async function policyDigestsOf(root: string): Promise<Digests> {
  return digestsOf(root, ["qfai.config.yaml", `${assistantLayerDir("rule")}/**`]);
}

// The digest of each plan the package ships, under its path in the package.
async function planDigestsOf(): Promise<Digests> {
  const entries = await Promise.all(
    WORKFLOW_ROUTES.map(async (route) => {
      const text = await readFile(path.join(packagePlansDir(), `${route}.yml`), "utf8");
      return [planDigestKey(route), hashAssistantAssetText(text)] as const;
    }),
  );
  return Object.fromEntries(entries);
}

// The digest of the CLI entry file this process runs, which `finish` compares with the one
// fixed at `start`.
export async function cliEntryDigest(): Promise<string> {
  const entry = process.argv[1];
  if (!entry) return "";
  const bytes = await readFile(entry).catch(() => Buffer.from(""));
  return createHash("sha256").update(bytes).digest("hex");
}

// The policy and plan digests a run is held to.
export async function policyNowOf(root: string): Promise<NonNullable<WorkflowFacts["policyNow"]>> {
  const [policyDigests, planDigests] = await Promise.all([policyDigestsOf(root), planDigestsOf()]);
  return { policyDigests, planDigests };
}

// The worktree real path and the branch checked out there, or `null` outside a branch.
export async function identityOf(root: string): Promise<NonNullable<WorkflowFacts["identity"]>> {
  const branch = gitStdout(root, ["rev-parse", "--abbrev-ref", "HEAD"])?.trim();
  return { worktree: await realpath(root), branch: branch && branch !== "HEAD" ? branch : null };
}

// What `start` fixes for the run: its ID and key, and the tool and policy it runs under. The run
// change boundary's starting state is recorded beside them, when the run is created.
export async function startFacts(
  root: string,
  config: QfaiConfig,
  runId: string,
): Promise<WorkflowFacts> {
  const [qfaiVersion, policyNow, plans] = await Promise.all([
    resolveToolVersion(),
    policyNowOf(root),
    checkPlans(root, config),
  ]);
  const digestKey = randomBytes(32).toString("hex");
  const start = { runId, qfaiVersion, digestKey, ...policyNow };
  if (!plans.cause) return { start };
  const causeSubjects = plans.refusals.map((refusal) => refusal.subject);
  return { start, cause: plans.cause, causeSubjects };
}

// Validate in process, as the project configures it, with the report files it writes sent to a
// temporary directory so the run changes nothing outside `.qfai/run/`.
export async function validateQuietly(root: string) {
  const loaded = await loadConfig(root);
  const outDir = await mkdtemp(path.join(os.tmpdir(), "qfai-workflow-validate-"));
  try {
    const paths = { ...loaded.config.paths, outDir };
    return await validateProject(root, { ...loaded, config: { ...loaded.config, paths } });
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

// The finding identities validate reports now: code, file and sorted refs.
async function findingsNow(root: string) {
  const result = await validateQuietly(root);
  return result.issues.map((issue) => ({
    code: issue.code,
    file: issue.file ?? "",
    refs: [...(issue.refs ?? [])].sort(),
  }));
}

// The `cli_observed` baseline `finish` reports each remaining finding against.
export async function baselineOf(root: string): Promise<NonNullable<WorkflowSnapshot["baseline"]>> {
  const [findings, toolVersion, entryDigest, policyDigests] = await Promise.all([
    findingsNow(root),
    resolveToolVersion(),
    cliEntryDigest(),
    policyDigestsOf(root),
  ]);
  return { findings, toolVersion, cliEntryDigest: entryDigest, policyDigests };
}

// The built-in plans, in the form the decision function reads.
export async function planFacts(): Promise<NonNullable<WorkflowFacts["plans"]>> {
  const plans = await loadBuiltInPlans();
  return Object.fromEntries(
    WORKFLOW_ROUTES.map((route) => [
      route,
      {
        route,
        stages: plans[route].stages.map((stage) => ({
          stageInstanceId: stage.id,
          stageKind: stage.kind,
          ...(stage.skills[0] ? { skill: stage.skills[0] } : {}),
          ...(stage.skills.length > 1 ? { skills: stage.skills } : {}),
          operation: stage.operation,
          when: stage.when,
          ...(stage.effects.length > 0 ? { effects: stage.effects } : {}),
        })),
      },
    ]),
  );
}

// The always-required reviewers of the review profile the effective routing gives each skill.
export async function reviewerRolesOf(config: QfaiConfig): Promise<Record<string, string[]>> {
  const { routing, profiles } = await readEffectiveRouting(config);
  const roles: Record<string, string[]> = {};
  for (const [skill, entry] of routing ?? []) {
    const profile = entry.reviewProfile ? profiles?.get(entry.reviewProfile) : undefined;
    if (!profile) continue;
    roles[skill] = [...profile.reviewers]
      .filter(([, binding]) => binding === "required")
      .map(([reviewer]) => reviewer);
  }
  return roles;
}

// Whether a path names a regular file whose real path stays under the project's real root.
async function isProjectFile(realRoot: string, root: string, ref: string): Promise<boolean> {
  if (/[*?[{]/.test(ref) || path.isAbsolute(ref)) return false;
  try {
    const real = await realpath(path.join(root, ref));
    const inside = real === realRoot || real.startsWith(`${realRoot}${path.sep}`);
    return inside && (await stat(real)).isFile();
  } catch {
    return false;
  }
}

function pathReferences(proposal: unknown): string[] {
  if (!isRecord(proposal)) return [];
  const refs = [proposal.expectedBehaviorRefs, proposal.observedRefs].flatMap((list): unknown[] =>
    Array.isArray(list) ? list : [],
  );
  return refs.flatMap((entry) =>
    isRecord(entry) &&
    (entry.kind === "path" || entry.kind === "evidence") &&
    typeof entry.ref === "string"
      ? [entry.ref]
      : [],
  );
}

// What `accept` of a routing result checks the proposal against.
export async function routingFacts(
  root: string,
  config: QfaiConfig,
  proposal: unknown,
): Promise<WorkflowFacts> {
  const realRoot = await realpath(root);
  const refs = [...new Set(pathReferences(proposal))];
  const existence = await Promise.all(
    refs.map(async (ref) => [ref, await isProjectFile(realRoot, root, ref)] as const),
  );
  const [plans, story] = await Promise.all([planFacts(), storyFactsOf(root, config, undefined)]);
  return {
    pathExistence: Object.fromEntries(existence),
    plans,
    flows: story.flows,
    specsDir: story.specsDir,
  };
}

// The JSON object the text holds, or an empty one: a report that says nothing passes nothing.
function parsedRecord(text: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

const GLOB = /[*?[{]/;

// A file's digest, or undefined when it cannot be read; a glob's, the digest of its sorted
// member list, so an added or removed member changes it while no member's bytes do.
async function dependencyDigest(root: string, dependency: string): Promise<string | undefined> {
  if (!GLOB.test(dependency)) {
    const text = await readFile(path.join(root, dependency), "utf8").catch(() => undefined);
    return text === undefined ? undefined : hashAssistantAssetText(text);
  }
  const members = await fg(dependency, { cwd: root, dot: true, onlyFiles: true });
  return hashAssistantAssetText(members.sort().join("\n"));
}

const OBSERVED_TESTS = ["expected_red", "pass", "fail"];

// What an accepted result's receipt depends on. Every receipt holds its work order's inputs. A
// result that observed a test also holds the bound flow's obligation digest, and the files it
// changed: as the oracle it observed at RED, or as the files a GREEN or verify ran, with the
// membership of each glob write area covering one of them. The obligation digest is held as the
// digest of each file that declares an item of the bound flow or a rule citing its examples.
// SIMPLIFIED: holds no tool, skill, lockfile or discussion pack digest, and a changed file that
// no longer exists is left out.
// Lift when: a stage's result is shown to depend on one of them, or a stage deletes a file.
export async function receiptDependenciesOf(
  root: string,
  workOrder: WorkflowWorkOrder,
  result: WorkflowResult,
  obligationFiles: readonly string[] = [],
): Promise<WorkflowDependency[]> {
  const inputs = (workOrder.inputs ?? []).map((input): WorkflowDependency => ({
    ...input,
    class: "normative",
  }));
  if (!OBSERVED_TESTS.includes(result.testObservation ?? "")) return inputs;
  const ran: WorkflowDependency["class"] =
    result.testObservation === "expected_red" ? "historical_observation" : "current_verification";
  const changed = (result.changedFiles ?? []).map((each) => each.path);
  const globs =
    ran === "current_verification"
      ? (workOrder.scope?.writeAreas ?? []).filter(
          (area) => GLOB.test(area) && changed.some((file) => areaCovers(area, file)),
        )
      : [];
  const digested = async (each: string, cls: WorkflowDependency["class"]) => {
    const digest = await dependencyDigest(root, each);
    return digest === undefined ? [] : [{ path: each, digest, class: cls }];
  };
  const [obligation, observed] = await Promise.all([
    Promise.all(obligationFiles.map((each) => digested(each, "normative"))),
    Promise.all([...changed, ...globs].map((each) => digested(each, ran))),
  ]);
  return [...inputs, ...obligation.flat(), ...observed.flat()];
}

// A receipt with no dependency record, or one whose dependency cannot be read, is `unknown`; one
// whose rechecked dependency changed is `stale`. What a stage observed once is never rechecked.
async function validityOf(root: string, dependencies: readonly WorkflowDependency[] | undefined) {
  if (!dependencies) return "unknown";
  const checked = dependencies.filter((each) => each.class !== "historical_observation");
  const now = await Promise.all(checked.map((each) => dependencyDigest(root, each.path)));
  if (now.includes(undefined)) return "unknown";
  return now.every((digest, index) => digest === checked[index]?.digest) ? "valid" : "stale";
}

// Every receipt the run holds, classed against the tree now: routing's, and each stage result's
// of every plan the run has had.
export async function receiptValidityOf(
  root: string,
  snapshot: WorkflowSnapshot,
): Promise<NonNullable<WorkflowFacts["receiptValidity"]>> {
  const routing = snapshot.routingReceiptRef
    ? [{ receiptRef: snapshot.routingReceiptRef, dependencies: snapshot.routingDependencies }]
    : [];
  const classed = await Promise.all(
    [...routing, ...everyStageResult(snapshot)].map(async (stage) =>
      stage.receiptRef
        ? [[stage.receiptRef, await validityOf(root, stage.dependencies)] as const]
        : [],
    ),
  );
  return Object.fromEntries(classed.flat());
}

// What the routing receipt depends on: every path and evidence file the proposal cites outside
// the write scope it proposes. A file inside that scope is the run's to change, so its change
// is the run's own work rather than a premise of the route going stale.
export async function routingDependenciesOf(
  root: string,
  proposal: WorkflowProposal | undefined,
): Promise<WorkflowDependency[]> {
  const refs = [...(proposal?.expectedBehaviorRefs ?? []), ...(proposal?.observedRefs ?? [])];
  const scope = proposal?.proposedWriteScope ?? [];
  const paths = [
    ...new Set(
      refs.flatMap((each) => (each.kind === "path" || each.kind === "evidence" ? [each.ref] : [])),
    ),
  ].filter((each) => !scope.some((area) => areaCovers(area, each)));
  const digested = await Promise.all(
    paths.map(async (each) => {
      const digest = await dependencyDigest(root, each);
      return digest === undefined ? [] : [{ path: each, digest, class: "normative" as const }];
    }),
  );
  return digested.flat();
}

// This run's copy of the verify report, read from the stage that accepted it. A copy whose bytes
// are not the ones that stage recorded is another run's, and counts as no report.
async function verifyReportOf(runDir: string, snapshot: WorkflowSnapshot) {
  const verifies = (snapshot.acceptedStages ?? []).filter((each) => each.stageKind === "verify");
  const stage = verifies.at(-1);
  const copy = `reports/${stage?.stageInstanceId ?? ""}/verify.json`;
  const recorded = stage?.reports?.find((report) => report.path === copy)?.digest;
  if (!stage || !recorded) return undefined;
  const bytes = await readFile(path.join(runDir, ...copy.split("/"))).catch(() => undefined);
  if (!bytes || createHash("sha256").update(bytes).digest("hex") !== recorded) return undefined;
  const { status, scope } = parsedRecord(bytes.toString("utf8"));
  return {
    runId: snapshot.run.id,
    stageInstanceId: stage.stageInstanceId,
    status: typeof status === "string" ? status : "",
    scope: typeof scope === "string" ? scope : "",
  };
}

// What `finish` observes: validate run in process, this run's verify report, the tool and
// policy it runs under, the run's changes since `start` and those not yet committed, the change
// requests in force and the bound flow's obligations.
// SIMPLIFIED: under `failOn: never` no finding is reported, so no debt stays open.
// Lift when: a `never` project runs a workflow.
export async function completionFacts(
  root: string,
  runDir: string,
  snapshot: WorkflowSnapshot,
): Promise<WorkflowFacts> {
  const loaded = await loadConfig(root);
  const [result, toolVersion, entryDigest, policyDigests, verifyReport, story] = await Promise.all([
    validateQuietly(root),
    resolveToolVersion(),
    cliEntryDigest(),
    policyDigestsOf(root),
    verifyReportOf(runDir, snapshot),
    storyFactsOf(root, loaded.config, snapshot.flowBinding?.flowId),
  ]);
  const failOn = loaded.config.validation.failOn;
  const findings = result.issues.map((issue) => ({
    code: issue.code,
    file: issue.file ?? "",
    refs: [...(issue.refs ?? [])].sort(),
    severity: issue.severity,
  }));
  const uncommitted = uncommittedPaths(root) ?? [];
  const changed = snapshot.boundary
    ? await changedSinceStart(root, snapshot.boundary)
    : uncommitted;
  const validate =
    failOn === "never" ? { failOn: "error" as const, findings: [] } : { failOn, findings };
  const completion = {
    validate,
    ...(verifyReport ? { verifyReport } : {}),
    toolVersion,
    cliEntryDigest: entryDigest,
    policyDigests,
    changedPaths: changed,
    uncommittedPaths: uncommitted,
  };
  const digests = await Promise.all(
    changed.map(async (file) => [file, await dependencyDigest(root, file)] as const),
  );
  return {
    completion,
    changeRequests: story.changeRequests,
    ...(story.acceptanceObligationsUnmet !== undefined
      ? { acceptanceObligationsUnmet: story.acceptanceObligationsUnmet }
      : {}),
    ...(story.prototypeDecisionNeeded !== undefined
      ? { prototypeDecisionNeeded: story.prototypeDecisionNeeded }
      : {}),
    fileDigests: Object.fromEntries(
      digests.flatMap(([file, digest]) => (digest ? [[file, digest]] : [])),
    ),
    ...(story.obligations ? { obligations: story.obligations } : {}),
  };
}
