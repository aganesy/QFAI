import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, readFile, realpath, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import fg from "fast-glob";

import { hashAssistantAssetText } from "../assistantAssetProvenance.js";
import { loadConfig, resolvePath } from "../config.js";
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
  return {
    start,
    ...(plans.cause ? { cause: plans.cause } : {}),
    ...(plans.guidance ? { causeGuidance: plans.guidance } : {}),
  };
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

// SIMPLIFIED: the obligation fingerprint is the digest of the bound spec's user stories,
// acceptance criteria, business rules and examples as whole files, not of the items a row cites.
// Lift when: a receipt names the ledger rows it covers and an item's text can be read on its own.
async function obligationOf(root: string, specId: string): Promise<Dependency[]> {
  const { config } = await loadConfig(root);
  const pack = path.relative(root, path.join(resolvePath(root, config, "specsDir"), specId));
  const pattern = `${pack.split(path.sep).join("/")}/0[2-5]_*.md`;
  const digests = await digestsOf(root, [pattern]);
  return Object.entries(digests).map(([file, digest]) => ({
    path: file,
    digest,
    class: "normative",
  }));
}

const OBSERVED_TESTS = ["expected_red", "pass", "fail"];

// What an accepted result's receipt depends on. Every receipt holds its work order's inputs. A
// result that observed a test also holds the bound spec's obligation, and the files it changed:
// as the oracle it observed at RED, or as the files a GREEN or verify ran, with the membership of
// each glob write area covering one of them.
// SIMPLIFIED: holds no tool, skill, lockfile, lifecycle, contract owner or discussion pack digest,
// and a changed file that no longer exists is left out.
// Lift when: a stage's result is shown to depend on one of them, or a stage deletes a file.
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
  if (!OBSERVED_TESTS.includes(result.testObservation ?? "")) return inputs;
  const ran: Dependency["class"] =
    result.testObservation === "expected_red" ? "historical_observation" : "current_verification";
  const changed = (result.changedFiles ?? []).map((each) => each.path);
  const globs =
    ran === "current_verification"
      ? (workOrder.scope?.writeAreas ?? []).filter(
          (area) => GLOB.test(area) && changed.some((file) => areaCovers(area, file)),
        )
      : [];
  const observed = await Promise.all(
    [...changed, ...globs].map(async (each) => {
      const digest = await dependencyDigest(root, each);
      return digest === undefined ? [] : [{ path: each, digest, class: ran }];
    }),
  );
  const obligation = specId ? await obligationOf(root, specId) : [];
  return [...inputs, ...obligation, ...observed.flat()];
}

// A receipt with no dependency record, or one whose dependency cannot be read, is `unknown`; one
// whose rechecked dependency changed is `stale`. What a stage observed once is never rechecked.
async function validityOf(root: string, dependencies: readonly Dependency[] | undefined) {
  if (!dependencies) return "unknown";
  const checked = dependencies.filter((each) => each.class !== "historical_observation");
  const now = await Promise.all(checked.map((each) => dependencyDigest(root, each.path)));
  if (now.includes(undefined)) return "unknown";
  return now.every((digest, index) => digest === checked[index]?.digest) ? "valid" : "stale";
}

// Each accepted stage's receipt, classed against the tree now.
export async function receiptValidityOf(
  root: string,
  snapshot: WorkflowSnapshot,
): Promise<NonNullable<WorkflowFacts["receiptValidity"]>> {
  const stages = snapshot.acceptedStages ?? [];
  const classed = await Promise.all(
    stages.map(async (stage) =>
      stage.receiptRef
        ? [[stage.receiptRef, await validityOf(root, stage.dependencies)] as const]
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
