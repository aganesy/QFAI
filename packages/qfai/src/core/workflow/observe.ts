import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, readFile, realpath, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import fg from "fast-glob";

import { hashAssistantAssetText } from "../assistantAssetProvenance.js";
import { loadConfig, resolvePath } from "../config.js";
import { collectSpecEntries } from "../specLayout.js";
import { validateProject } from "../validate.js";
import { resolveToolVersion } from "../version.js";
import type { WorkflowFacts, WorkflowSnapshot } from "./decide.js";
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

// What `start` fixes for the run: its ID and key, and the tool and policy it runs under.
// SIMPLIFIED: fixes no git identity and takes no run change boundary snapshot.
// Lift when: the resume identity check and the change boundary observers land.
export async function startFacts(root: string, runId: string): Promise<WorkflowFacts> {
  const [qfaiVersion, policyDigests, manifestDigests, planDigests, plans] = await Promise.all([
    resolveToolVersion(),
    policyDigestsOf(root),
    digestsOf(root, [`${ASSISTANT}/manifest/**`]),
    digestsOf(root, [`${ASSISTANT}/process/workflows/**`]),
    checkInstalledPlans(root),
  ]);
  const digestKey = randomBytes(32).toString("hex");
  const start = { runId, qfaiVersion, digestKey, policyDigests, manifestDigests, planDigests };
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
