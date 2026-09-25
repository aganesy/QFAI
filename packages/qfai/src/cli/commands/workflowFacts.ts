import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { hashAssistantAssetText } from "../../core/assistantAssetProvenance.js";
import { loadConfig } from "../../core/config.js";
import { flowOfRun } from "../../core/workflow/issue.js";
import {
  completionFacts,
  identityOf,
  policyNowOf,
  receiptValidityOf,
  reviewerRolesOf,
  routingFacts,
} from "../../core/workflow/observe.js";
import { isRecord } from "../../core/workflow/parse.js";
import { storyFactsOf } from "../../core/workflow/storyFacts.js";
import type {
  WorkflowFacts,
  WorkflowInput,
  WorkflowResult,
  WorkflowSnapshot,
} from "../../core/workflow/types.js";

// One refusal of the adapter's own, in the shape of the output document's `error`.
export interface Refusal {
  code: string;
  message: string;
  reasons?: { reason: string; subject: string }[];
  cause?: string;
}

export function isRefusal(value: object): value is Refusal {
  return "code" in value && "message" in value;
}

export type Payload = { ok: true; value: Record<string, unknown>; digest: string } | Refusal;

export function parsePayload(text: string): Payload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  if (!isRecord(parsed)) {
    const message = "The input file is not a JSON object. Write the payload again.";
    return { code: "invalid-input", message, reasons: [{ reason: "schema", subject: "--in" }] };
  }
  const digest = createHash("sha256").update(JSON.stringify(parsed)).digest("hex");
  return { ok: true, value: parsed, digest };
}

// An `--in` file: a regular file whose real path lies under the inbox it belongs to.
export async function readPayload(
  root: string,
  inPath: string | undefined,
  inbox: string,
): Promise<Payload> {
  const refusal: Refusal = {
    code: "invalid-input",
    message: "The input file must sit in the run's inbox under .qfai/run. Write it there.",
    reasons: [{ reason: "in-path", subject: "--in" }],
  };
  if (!inPath) return refusal;
  const real = await realpath(path.resolve(root, inPath)).catch(() => "");
  const realInbox = await realpath(path.join(root, inbox)).catch(() => "");
  const inside = realInbox !== "" && real.startsWith(`${realInbox}${path.sep}`);
  if (!inside || !(await stat(real)).isFile()) return refusal;
  return parsePayload(await readFile(real, "utf8"));
}

// The paths a result submits as changed, whatever shape the rest of the payload has.
function changedPathsOf(result: WorkflowResult | undefined): string[] {
  const changed: unknown = result?.changedFiles;
  return (Array.isArray(changed) ? changed : []).flatMap((entry: unknown) =>
    isRecord(entry) && typeof entry.path === "string" ? [entry.path] : [],
  );
}

// Where each submitted changed path really is: a link or a case variant is judged by the file it
// names, and a path that resolves outside the project's real root is `null`.
async function realPathsOf(
  root: string,
  result: WorkflowResult | undefined,
): Promise<Record<string, string | null>> {
  const realRoot = await realpath(root);
  const entries = await Promise.all(
    changedPathsOf(result).map(async (each): Promise<[string, string | null][]> => {
      const real = await realpath(path.resolve(root, each)).catch(() => undefined);
      if (real === undefined) return [];
      const inside = real.startsWith(`${realRoot}${path.sep}`);
      return [[each, inside ? path.relative(realRoot, real).split(path.sep).join("/") : null]];
    }),
  );
  return Object.fromEntries(entries.flat());
}

// The core's own digest of each file a result or a work order names, after CRLF
// normalization. A file that cannot be read has none.
async function fileDigestsOf(root: string, files: readonly string[]) {
  const entries = await Promise.all(
    [...new Set(files)].map(async (file): Promise<[string, string][]> => {
      const text = await readFile(path.join(root, file), "utf8").catch(() => undefined);
      return text === undefined ? [] : [[file, hashAssistantAssetText(text)]];
    }),
  );
  return Object.fromEntries(entries.flat());
}

// What a stage operation reads: the story tree of the flow the run binds, the reviewer roles a
// work order names, and at `accept` where each changed path really is and its digest.
async function stageFacts(root: string, snapshot: WorkflowSnapshot, input: WorkflowInput) {
  const { config } = await loadConfig(root);
  const accepting = input.operation === "accept";
  const reproduction = snapshot.diagnosis?.reproductionRef;
  const changed = changedPathsOf(input.result);
  const [story, reviewerRoles, changedRealPaths, fileDigests, receiptValidity] = await Promise.all([
    storyFactsOf(root, config, flowOfRun(snapshot), snapshot.diagnosis),
    reviewerRolesOf(config),
    accepting ? realPathsOf(root, input.result) : undefined,
    fileDigestsOf(root, [...changed, ...(reproduction ? [reproduction] : [])]),
    input.operation === "resume" ? receiptValidityOf(root, snapshot) : undefined,
  ]);
  return {
    ...story,
    reviewerRoles,
    fileDigests,
    ...(changedRealPaths ? { changedRealPaths } : {}),
    ...(receiptValidity ? { receiptValidity } : {}),
  };
}

// The facts one operation is decided on, observed now.
export async function factsOf(
  root: string,
  runDir: string,
  snapshot: WorkflowSnapshot,
  input: WorkflowInput,
): Promise<WorkflowFacts> {
  if (input.operation === "finish") return completionFacts(root, runDir, snapshot);
  if (input.operation === "decision") return { now: new Date().toISOString() };
  const [identity, policyNow] = await Promise.all([identityOf(root), policyNowOf(root)]);
  if (input.operation === "accept" && snapshot.run.state === "routing") {
    const { config } = await loadConfig(root);
    return { ...(await routingFacts(root, config, input.result?.proposal)), identity, policyNow };
  }
  return { ...(await stageFacts(root, snapshot, input)), identity, policyNow };
}
