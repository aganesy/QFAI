import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, readFile, realpath, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import fg from "fast-glob";

import { hashAssistantAssetText } from "../assistantAssetProvenance.js";
import { loadConfig, resolvePath } from "../config.js";
import {
  ResolveActiveDiscussionPackError,
  resolveActiveDiscussionPack,
} from "../discussionPack.js";
import { gitStdout, uncommittedPaths } from "../gitChanges.js";
import { collectSpecEntries } from "../specLayout.js";
import { validateProject } from "../validate.js";
import { collectLedgerTables, isLedgerRow } from "../tddHelpers.js";
import { resolveToolVersion } from "../version.js";
import { areaCovers } from "./decide.js";
import type {
  WorkflowDependency,
  WorkflowFacts,
  WorkflowInput,
  WorkflowSnapshot,
  WorkflowWorkOrder,
} from "./decide.js";
import { obligationFingerprints } from "./obligation.js";
import { isRecord } from "./parse.js";
import { checkInstalledPlans, loadBuiltInPlans, WORKFLOW_ROUTES } from "./plans.js";

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

const ASSISTANT = ".qfai/assistant";

export async function policyDigestsOf(root: string): Promise<Digests> {
  return digestsOf(root, ["qfai.config.yaml", `${ASSISTANT}/constitution/**`]);
}

// The digest of the CLI entry file this process runs, which `finish` compares with the one
// fixed at `start`.
export async function cliEntryDigest(): Promise<string> {
  const entry = process.argv[1];
  if (!entry) return "";
  const bytes = await readFile(entry).catch(() => Buffer.from(""));
  return createHash("sha256").update(bytes).digest("hex");
}

// The policy, manifest and plan digests a run is held to.
export async function policyNowOf(root: string): Promise<NonNullable<WorkflowFacts["policyNow"]>> {
  const [policyDigests, manifestDigests, planDigests] = await Promise.all([
    policyDigestsOf(root),
    digestsOf(root, [`${ASSISTANT}/manifest/**`]),
    digestsOf(root, [`${ASSISTANT}/process/workflows/**`]),
  ]);
  return { policyDigests, manifestDigests, planDigests };
}

// The worktree real path and the branch checked out there, or `null` outside a branch.
export async function identityOf(root: string): Promise<NonNullable<WorkflowFacts["identity"]>> {
  const branch = gitStdout(root, ["rev-parse", "--abbrev-ref", "HEAD"])?.trim();
  return { worktree: await realpath(root), branch: branch && branch !== "HEAD" ? branch : null };
}

// What `start` fixes for the run: its ID and key, and the tool and policy it runs under.
// SIMPLIFIED: takes no run change boundary snapshot.
// Lift when: the change boundary observers land.
export async function startFacts(root: string, runId: string): Promise<WorkflowFacts> {
  const [qfaiVersion, policyNow, plans] = await Promise.all([
    resolveToolVersion(),
    policyNowOf(root),
    checkInstalledPlans(root),
  ]);
  const digestKey = randomBytes(32).toString("hex");
  const start = { runId, qfaiVersion, digestKey, ...policyNow };
  return { start, ...(plans.cause ? { cause: plans.cause } : {}) };
}

// Validate in process, as the project configures it, with the report files it writes sent to a
// temporary directory so the run changes nothing outside `.qfai/runs/`.
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
          operation: stage.operation,
          when: stage.when,
          ...(stage.effects.length > 0 ? { effects: stage.effects } : {}),
        })),
      },
    ]),
  );
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

async function specFacts(root: string): Promise<NonNullable<WorkflowFacts["specs"]>> {
  const { config } = await loadConfig(root);
  const entries = await collectSpecEntries(resolvePath(root, config, "specsDir"));
  return Object.fromEntries(
    entries.map((entry) => [path.basename(entry.dir), { lifecycle: entry.status ?? "active" }]),
  );
}

// What `accept` of a routing result checks the proposal against.
// SIMPLIFIED: no contract ID is known, so a `contract-id` reference is refused `unknown-id`.
// Lift when: a routing result naming a contract ID is accepted by a row that needs it.
export async function routingFacts(root: string, proposal: unknown): Promise<WorkflowFacts> {
  const realRoot = await realpath(root);
  const refs = [...new Set(pathReferences(proposal))];
  const existence = await Promise.all(
    refs.map(async (ref) => [ref, await isProjectFile(realRoot, root, ref)] as const),
  );
  const [plans, specs] = await Promise.all([planFacts(), specFacts(root)]);
  return { pathExistence: Object.fromEntries(existence), plans, specs, contractIds: [] };
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

// The bound spec's ledger rows, read with the ledger parser: each row's ID, status and a digest
// of its cells. None when the spec has no ledger file.
export async function ledgerFactsOf(root: string, specId: string) {
  const { config } = await loadConfig(root);
  const file = path.join(resolvePath(root, config, "specsDir"), specId, "tdd", "test-list.md");
  const text = await readFile(file, "utf8").catch(() => undefined);
  if (text === undefined) return undefined;
  const rows = collectLedgerTables(text).flatMap((scan) => {
    const statusIndex = scan.headers.indexOf("Status");
    return scan.table.rows
      .filter((row) => isLedgerRow(scan, row))
      .map((row) => ({
        rowId: (row[scan.tddIdIndex] ?? "").trim(),
        status: (row[statusIndex] ?? "").trim(),
        digest: hashAssistantAssetText(row.map((cell) => cell.trim()).join("|")),
        layer: (row[scan.layerIndex] ?? "").trim(),
      }));
  });
  return { specId, rows };
}

type Dependency = WorkflowDependency;
const GLOB = /[*?[{]/;
// The digest recorded for a file that does not exist, which stays valid while it still does not.
const ABSENT = "absent";
// A dependency that is not a project path is a fact the core recomputes: `qfai:<kind>[:<subject>]`.
const FACT = "qfai:";
const TOOL = "qfai:tool";
const DISCUSSION = "qfai:discussion";
const OBLIGATION = /^qfai:obligation:([^:]+):(.+)$/;
const LIFECYCLE = /^qfai:lifecycle:(.+)$/;
// SIMPLIFIED: the lockfiles these package managers write at the project root, and no other.
// Lift when: a project keeps its lockfile below the root or uses another package manager.
const LOCKFILES = [
  "pnpm-lock.yaml",
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "bun.lock",
];

// What one validity check reads once, however many receipts depend on it.
interface FactReads {
  obligations: Map<string, Promise<Map<string, string> | undefined>>;
  specs?: Promise<NonNullable<WorkflowFacts["specs"]>>;
  tool?: Promise<string>;
  discussion?: Promise<{ digest: string; pack?: string }>;
}

async function toolDigest(): Promise<string> {
  const [version, entry] = await Promise.all([resolveToolVersion(), cliEntryDigest()]);
  return hashAssistantAssetText(`${version}\n${entry}`);
}

// The selected discussion pack's project-relative path and its digest; none selected is `""`.
async function discussionOf(root: string): Promise<{ digest: string; pack?: string }> {
  const selected = await resolveActiveDiscussionPack(root).catch((error: unknown) => {
    if (error instanceof ResolveActiveDiscussionPackError) return undefined;
    throw error;
  });
  const pack = selected && path.relative(root, selected).split(path.sep).join("/");
  return { digest: hashAssistantAssetText(pack ?? ""), ...(pack ? { pack } : {}) };
}

async function lifecycleDigest(root: string, specId: string, reads: FactReads): Promise<string> {
  reads.specs ??= specFacts(root);
  return hashAssistantAssetText((await reads.specs)[specId]?.lifecycle ?? ABSENT);
}

async function obligationDigests(root: string, specId: string, reads: FactReads) {
  const known = reads.obligations.get(specId) ?? obligationFingerprints(root, specId);
  reads.obligations.set(specId, known);
  return known;
}

async function factDigest(root: string, fact: string, reads: FactReads) {
  const [, specId = "", rowId = ""] = OBLIGATION.exec(fact) ?? [];
  if (rowId) {
    const rows = await obligationDigests(root, specId, reads);
    return rows && (rows.get(rowId) ?? ABSENT);
  }
  const lifecycle = LIFECYCLE.exec(fact)?.[1];
  if (lifecycle !== undefined) return lifecycleDigest(root, lifecycle, reads);
  if (fact === TOOL) return (reads.tool ??= toolDigest());
  if (fact === DISCUSSION) return (reads.discussion ??= discussionOf(root)).then((d) => d.digest);
  return undefined;
}

// A file's digest, or undefined when it cannot be read; a glob's, the digest of its sorted
// member list, so an added or removed member changes it while no member's bytes do; a fact's,
// the digest the core computes for it now.
async function dependencyDigest(
  root: string,
  dependency: string,
  reads: FactReads,
): Promise<string | undefined> {
  if (dependency.startsWith(FACT)) return factDigest(root, dependency, reads);
  if (GLOB.test(dependency)) return membershipDigest(root, dependency);
  const text = await readFile(path.join(root, dependency), "utf8").catch(() => undefined);
  return text === undefined ? undefined : hashAssistantAssetText(text);
}

async function membershipDigest(root: string, glob: string): Promise<string> {
  const members = await fg(glob, { cwd: root, dot: true, onlyFiles: true });
  return hashAssistantAssetText(members.sort().join("\n"));
}

// The obligation fingerprint of each ledger row the work order covers; every row of the bound
// spec's ledger when the work order names none.
async function obligationOf(
  root: string,
  specId: string,
  workOrder: WorkflowWorkOrder,
): Promise<Dependency[]> {
  const rows = await obligationFingerprints(root, specId);
  if (!rows) return [];
  const ledger = workOrder.ledger;
  const covered = ledger?.specId === specId ? ledger.rowIds : [...rows.keys()];
  return covered.map((rowId) => ({
    path: `${FACT}obligation:${specId}:${rowId}`,
    digest: rows.get(rowId) ?? ABSENT,
    class: "normative",
  }));
}

// Each file the patterns match, and the membership of each pattern.
async function treeOf(root: string, patterns: string[]): Promise<Dependency[]> {
  const files = await digestsOf(root, patterns);
  const members = await Promise.all(
    patterns.map(async (glob) => ({ path: glob, digest: await membershipDigest(root, glob) })),
  );
  return [
    ...Object.entries(files).map(([file, digest]) => ({ path: file, digest })),
    ...members,
  ].map((each): Dependency => ({ ...each, class: "normative" }));
}

// What every receipt depends on besides its inputs: the config and the lockfiles, the policy and
// the executor skill, the tool, the selected discussion pack, and the bound spec's lifecycle.
async function contextOf(
  root: string,
  workOrder: WorkflowWorkOrder,
  specId: string | undefined,
): Promise<Dependency[]> {
  const reads: FactReads = { obligations: new Map() };
  const discussion = await discussionOf(root);
  const skill = workOrder.executor?.skill;
  const patterns = [
    `${ASSISTANT}/constitution/**`,
    ...(skill ? [`${ASSISTANT}/skills/${skill}/**`] : []),
    ...(discussion.pack ? [`${discussion.pack}/**`] : []),
  ];
  const named = ["qfai.config.yaml", ...LOCKFILES].map(async (file) => ({
    path: file,
    digest: (await dependencyDigest(root, file, reads)) ?? ABSENT,
  }));
  const facts = [
    { path: TOOL, digest: await toolDigest() },
    { path: DISCUSSION, digest: discussion.digest },
    ...(specId
      ? [{ path: `${FACT}lifecycle:${specId}`, digest: await lifecycleDigest(root, specId, reads) }]
      : []),
  ];
  const files = [...(await Promise.all(named)), ...facts].map((each): Dependency => ({
    ...each,
    class: "normative",
  }));
  return [...files, ...(await treeOf(root, patterns))];
}

const OBSERVED_TESTS = ["expected_red", "pass", "fail"];

// What an accepted result's receipt depends on. Every receipt holds its work order's inputs and
// the context it ran in. A result that observed a test also holds the obligation of the ledger
// rows it covers, and the files it changed: as the oracle it observed at RED, or as the files a
// GREEN or verify ran, with the membership of each glob write area covering one of them. A
// changed file that no longer exists is held as absent.
export async function receiptDependenciesOf(
  root: string,
  workOrder: WorkflowWorkOrder,
  result: NonNullable<WorkflowInput["result"]>,
  specId: string | undefined,
): Promise<Dependency[]> {
  const inputs = (workOrder.inputs ?? []).map((input): Dependency => ({
    ...input,
    class: "normative",
  }));
  const context = await contextOf(root, workOrder, specId);
  if (!OBSERVED_TESTS.includes(result.testObservation ?? "")) return [...inputs, ...context];
  const ran: Dependency["class"] =
    result.testObservation === "expected_red" ? "historical_observation" : "current_verification";
  const changed = (result.changedFiles ?? []).map((each) => each.path);
  const globs =
    ran === "current_verification"
      ? (workOrder.scope?.writeAreas ?? []).filter(
          (area) => GLOB.test(area) && changed.some((file) => areaCovers(area, file)),
        )
      : [];
  const reads: FactReads = { obligations: new Map() };
  const observed = await Promise.all(
    [...changed, ...globs].map(async (each) => ({
      path: each,
      digest: (await dependencyDigest(root, each, reads)) ?? ABSENT,
      class: ran,
    })),
  );
  const obligation = specId ? await obligationOf(root, specId, workOrder) : [];
  return [...inputs, ...context, ...obligation, ...observed];
}

// A receipt with no dependency record, or one whose dependency cannot be read, is `unknown`; one
// whose rechecked dependency changed is `stale`. What a stage observed once is never rechecked.
async function validityOf(
  root: string,
  dependencies: readonly Dependency[] | undefined,
  reads: FactReads,
) {
  if (!dependencies) return "unknown";
  const checked = dependencies.filter((each) => each.class !== "historical_observation");
  const now = await Promise.all(
    checked.map(
      async (each) =>
        (await dependencyDigest(root, each.path, reads)) ??
        (each.digest === ABSENT ? ABSENT : undefined),
    ),
  );
  if (now.includes(undefined)) return "unknown";
  return now.every((digest, index) => digest === checked[index]?.digest) ? "valid" : "stale";
}

// Each accepted stage's receipt, classed against the tree now.
export async function receiptValidityOf(
  root: string,
  snapshot: WorkflowSnapshot,
): Promise<NonNullable<WorkflowFacts["receiptValidity"]>> {
  const stages = snapshot.acceptedStages ?? [];
  const reads: FactReads = { obligations: new Map() };
  const classed = await Promise.all(
    stages.map(async (stage) =>
      stage.receiptRef
        ? [[stage.receiptRef, await validityOf(root, stage.dependencies, reads)] as const]
        : [],
    ),
  );
  return Object.fromEntries(classed.flat());
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
// policy it runs under, and the working tree's uncommitted paths.
// SIMPLIFIED: the run's changed paths are the uncommitted ones, so a change committed during the
// run is not counted; and under `failOn: never` no finding is reported, so no debt stays open.
// Lift when: `start` fixes the commit the run began at, and a `never` project runs a workflow.
export async function completionFacts(
  root: string,
  runDir: string,
  snapshot: WorkflowSnapshot,
): Promise<WorkflowFacts> {
  const [result, loaded, toolVersion, entryDigest, policyDigests, verifyReport] = await Promise.all(
    [
      validateQuietly(root),
      loadConfig(root),
      resolveToolVersion(),
      cliEntryDigest(),
      policyDigestsOf(root),
      verifyReportOf(runDir, snapshot),
    ],
  );
  const failOn = loaded.config.validation.failOn;
  const findings = result.issues.map((issue) => ({
    code: issue.code,
    file: issue.file ?? "",
    refs: [...(issue.refs ?? [])].sort(),
    severity: issue.severity,
  }));
  const changed = uncommittedPaths(root) ?? [];
  const validate =
    failOn === "never" ? { failOn: "error" as const, findings: [] } : { failOn, findings };
  const completion = {
    validate,
    ...(verifyReport ? { verifyReport } : {}),
    toolVersion,
    cliEntryDigest: entryDigest,
    policyDigests,
    changedPaths: changed,
    uncommittedPaths: changed,
  };
  return { completion };
}
