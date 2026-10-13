import { randomUUID } from "node:crypto";
import { rename, unlink } from "node:fs/promises";
import path from "node:path";
import {
  classifyGraphExploration,
  graphFallbackUnavailable,
  type GraphHookDecision,
  type GraphHookEvent,
} from "./hooks.js";
import { withGraphLock } from "./locks.js";
import {
  graphStateDirectory,
  graphStateText,
  invalidGraphState,
  writeGraphLocalFile,
} from "./localFiles.js";
import {
  fullGraphState,
  readGraphSearchRecords,
  type PendingGraphSearch,
  type GrantedGraphSearch,
} from "./permissionRecords.js";
import { queryPreparedGraph } from "./runner.js";
import { runGraphProcess, type GraphProcess } from "./process.js";
import { assertGraphStoragePath } from "./storage.js";

export async function classifyStoredGraphExploration(
  root: string,
  event: GraphHookEvent,
): Promise<GraphHookDecision> {
  const decision = classifyGraphExploration(event);
  if (decision.decision !== "deny" || decision.state !== "configured") return decision;
  if (decision.exceptionEligible === false)
    return decision.fallbackUnavailable
      ? decision
      : graphFallbackUnavailable(
          decision,
          "The search target or operation cannot be scoped.",
          "Run a single search with one explicit project-relative target, then retry the denied action.",
        );
  if (!event.cwd || !graphStateText(event.session, 4096))
    return graphFallbackUnavailable(
      decision,
      "Observed session and worktree are required.",
      "Enable session and cwd in the host event, run qfai init, then retry the denied action from this project worktree.",
    );
  if (path.resolve(event.cwd) !== path.resolve(root))
    return graphFallbackUnavailable(
      decision,
      "The observed worktree differs from this project worktree.",
      "Run the denied action from this project worktree, or run qfai init in the intended worktree before retrying.",
    );
  if (event.workdir && path.resolve(event.cwd, event.workdir) !== path.resolve(root))
    return graphFallbackUnavailable(
      decision,
      "The requested workdir differs from this project worktree.",
      "Set workdir to this project worktree and retry the denied action.",
    );
  if (!decision.target || !decision.operation || !decision.domain) return decision;
  const worktree = path.resolve(root);
  const session = event.session;
  return withGraphLock<GraphHookDecision>(root, "state", async () => {
    const directory = await graphStateDirectory(root);
    const records = await readGraphSearchRecords(root, directory);
    const classified = classifyGraphExploration(event, (candidate) => {
      if (candidate.decision !== "deny" || candidate.exceptionEligible === false) return candidate;
      const grant = records.find(
        (item) =>
          !item.draft &&
          item.record.kind === "grant" &&
          item.record.target === candidate.target &&
          item.record.operation === candidate.operation &&
          item.record.domain === candidate.domain &&
          item.record.worktree === worktree &&
          item.record.session === session &&
          Date.now() < item.record.expiresAt,
      );
      return grant?.record.kind === "grant"
        ? {
            ...candidate,
            decision: "allow",
            message: `AI-decided search fallback: ${grant.record.reason}`,
          }
        : candidate;
    });
    if (
      classified.decision !== "deny" ||
      classified.state !== "configured" ||
      classified.exceptionEligible === false ||
      !classified.target ||
      !classified.operation ||
      !classified.domain
    )
      return classified;
    const observed = {
      target: classified.target,
      operation: classified.operation,
      domain: classified.domain,
      worktree,
      session,
    };
    if (records.length >= 128) throw fullGraphState();
    const createdAt = Date.now();
    const pending: PendingGraphSearch = {
      ...observed,
      id: randomUUID(),
      kind: "pending",
      createdAt,
      expiresAt: createdAt + 600000,
    };
    await writeGraphLocalFile(path.join(directory, `${pending.id}.pending.json`), pending);
    return { ...classified, message: `${classified.message} Observed attempt: ${pending.id}.` };
  });
}

export async function requestStoredGraphFallback(
  root: string,
  attemptId: string,
  question: string,
  reason: string,
  run: GraphProcess = runGraphProcess,
) {
  const observed = await withGraphLock(root, "state", async () => {
    const directory = await graphStateDirectory(root);
    const records = await readGraphSearchRecords(root, directory);
    const pending = records.find(
      (item) => item.record.kind === "pending" && item.record.id === attemptId,
    );
    if (!pending || pending.record.kind !== "pending") throw invalidGraphState();
    return pending.record;
  });
  const graph = await queryPreparedGraph(root, { domain: observed.domain, question }, run);
  const publication = await withGraphLock(root, "state", async () => {
    const directory = await graphStateDirectory(root);
    const records = await readGraphSearchRecords(root, directory);
    const pending = records.find(
      (item) => item.record.kind === "pending" && item.record.id === attemptId,
    );
    if (!pending || JSON.stringify(pending.record) !== JSON.stringify(observed))
      throw invalidGraphState();
    if (records.length >= 128) throw fullGraphState();
    const createdAt = Date.now();
    const grant: GrantedGraphSearch = {
      ...observed,
      kind: "grant",
      reason,
      createdAt,
      expiresAt: createdAt + 60000,
    };
    const draft = path.join(directory, `${grant.id}.draft.json`);
    await writeGraphLocalFile(draft, grant);
    await unlink(pending.file);
    return { directory, draft, grant };
  });
  await assertGraphStoragePath(root, publication.directory);
  if (Date.now() >= publication.grant.expiresAt) throw invalidGraphState();
  await rename(
    publication.draft,
    path.join(publication.directory, `${publication.grant.id}.grant.json`),
  );
  const { target, operation, worktree, session, expiresAt } = publication.grant;
  return {
    status: "ready",
    permitted: true,
    domain: observed.domain,
    scope: { target, operation, worktree, session, reason, expiresAt },
    graph,
  };
}
