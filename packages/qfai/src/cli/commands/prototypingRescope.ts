/**
 * `qfai prototyping rescope` — retire a frozen surface without discarding the loop (#1099).
 *
 * Cycle 0 freezes the screen set into `prototyping.json#frozenSurfaceUnion` and
 * every later edit to it is lock drift, exit 2. Correct as a drift rule. But it
 * was the ONLY rule, and it also caught the legitimate case: a product decision
 * retired a screen while the loop was open. The only route the skill offered
 * was `iterate --cycle 0 --force`, which moves `iter-00` aside and discards
 * every cycle of review already paid for.
 *
 * This is the narrow operation that applies such a decision:
 *
 *     qfai prototyping rescope --remove 0011 --reason DELTA-022
 *
 * Three properties make it a scope reduction rather than a hole in the drift
 * rule:
 *
 * - **It can only remove what is already unreachable.** The removable set is
 *   `frozenScope.missing` — the same set `QFAI-PROT-011` reports — so a surface
 *   whose spec still declares a UI marker is refused. Widening is not
 *   expressible: there is no `--add`.
 * - **It requires a `--reason`.** A recorded delta or decision id is what
 *   separates an applied decision from the silent widening the exit-2 rule
 *   exists to stop, and it is what the audit entry preserves.
 * - **It never rewrites a critique.** What a reviewer saw at cycle N is a
 *   historical fact. Affected `review.json` entries are ANNOTATED as
 *   superseded; the prose is left exactly as written.
 *
 * The loop stays at its current cycle and `stopReason` is untouched: this
 * changes what the loop is about, not where it is.
 */
import path from "node:path";
import { readFile, writeFile, readdir } from "node:fs/promises";

import { loadConfig } from "../../core/config.js";
import { readFrozenScopeState } from "../../core/prototyping/frozenScope.js";
import { PROTOTYPING_JSON_REL } from "../../core/prototyping/paths.js";
import { info, warn } from "../lib/logger.js";

/** What the caller asked for. */
export type RescopeOptions = {
  readonly root: string;
  readonly remove: readonly string[];
  readonly reason: string;
  readonly dryRun: boolean;
};

/** One recorded reduction, appended to `prototyping.json#rescopeLog`. */
export type RescopeAuditEntry = {
  readonly surface: string;
  readonly reason: string;
  readonly cycle: number | null;
  readonly at: string;
};

/**
 * Apply a scope reduction, or refuse and say why.
 *
 * Returns the process exit code: `0` applied (or would apply, under
 * `--dryRun`), `2` refused. `2` rather than `1` to match the exit the drift
 * rule already uses for a frozen-scope problem — an operator who reaches this
 * refusal is in the same conversation.
 */
export async function runPrototypingRescope(options: RescopeOptions): Promise<number> {
  if (options.remove.length === 0) {
    warn("qfai prototyping rescope: --remove <surface-id> is required (repeatable).");
    return 2;
  }
  if (options.reason.trim().length === 0) {
    warn(
      "qfai prototyping rescope: --reason <delta-id> is required. A recorded decision id is " +
        "what separates an applied scope reduction from the lock drift the frozen union exists " +
        "to detect, and it is what the audit entry preserves.",
    );
    return 2;
  }

  // Warned, not refused. Resolving the id would need every place a delta or
  // decision can live — `.qfai/decisions/`, a spec's `09_delta.md`,
  // `_policies/10_delta.md`, and whatever a consuming project uses — and a
  // resolver that misses one refuses a LEGITIMATE reduction, which is worse
  // than a weak field: it blocks the operation this exists to provide. A shape
  // check has the same failure against a project whose id convention is its
  // own. The audit entry is the real control; this just means the operator
  // hears about a thin reason now rather than a reviewer reading the log later.
  if (!looksLikeDecisionId(options.reason)) {
    warn(
      `qfai prototyping rescope: --reason "${options.reason}" does not read as a recorded ` +
        "delta or decision id (e.g. DELTA-022, CR-20260904-0001). Proceeding — it is written " +
        "to rescopeLog as given — but an entry nobody can trace back is the audit trail this " +
        "operation exists to leave.",
    );
  }

  const configResult = await loadConfig(options.root);
  const state = await readFrozenScopeState(options.root, configResult.config);
  if (state === null) {
    warn(
      `qfai prototyping rescope: ${PROTOTYPING_JSON_REL} records no frozenSurfaceUnion, so ` +
        "there is no frozen scope to reduce. Cycle 0 is what freezes it.",
    );
    return 2;
  }
  if (!state.open) {
    warn(
      "qfai prototyping rescope: the loop is sealed (stopReason is set). A closed loop's scope " +
        "is history — reducing it would rewrite what the completed loop covered.",
    );
    return 2;
  }

  const refusal = refuseUnremovable(options.remove, state.frozen, state.missing);
  if (refusal !== null) {
    warn(refusal);
    return 2;
  }

  const protoAbs = path.join(options.root, PROTOTYPING_JSON_REL);
  const record = await readJsonObject(protoAbs);
  if (record === null) {
    warn(`qfai prototyping rescope: cannot read ${PROTOTYPING_JSON_REL} as a JSON object.`);
    return 2;
  }

  const cycle = typeof record.cycle === "number" ? record.cycle : null;
  const at = new Date().toISOString();
  const entries: RescopeAuditEntry[] = options.remove.map((surface) => ({
    surface,
    reason: options.reason,
    cycle,
    at,
  }));

  const planTouched = await rescopeIteratePlans(options);
  const reviewsTouched = await annotateReviews(options, entries);

  if (options.dryRun) {
    info(`qfai prototyping rescope: dry run — nothing written.`);
    reportPlan(options, entries, planTouched, reviewsTouched);
    return 0;
  }

  const remaining = state.frozen.filter((id) => !options.remove.includes(id));
  const nextRecord: Record<string, unknown> = {
    ...record,
    frozenSurfaceUnion: remaining,
    rescopeLog: [...readAuditLog(record.rescopeLog), ...entries],
  };
  await writeFile(protoAbs, `${JSON.stringify(nextRecord, null, 2)}\n`, "utf-8");

  info(`qfai prototyping rescope: ${PROTOTYPING_JSON_REL} updated.`);
  reportPlan(options, entries, planTouched, reviewsTouched);
  info(`  frozenSurfaceUnion: ${state.frozen.length} -> ${remaining.length}`);
  return 0;
}

/**
 * Whether `reason` reads as an id rather than as prose.
 *
 * Deliberately loose and deliberately non-blocking: it looks for an
 * uppercase-prefixed token with a digit somewhere, which every id convention
 * in reach happens to satisfy (`DELTA-022`, `CR-20260904-0001`, and the
 * decision-record form). A project spelling its ids differently gets a warning
 * it can ignore, which is the failure mode a shape CHECK would not have had —
 * it would have refused them.
 *
 * The third example is described rather than spelled: `.agents/rules/
 * distributed-surface.md` forbids an internal design-rationale ID in `src/`
 * JSDoc, because tsup keeps JSDoc in `dist/*.d.ts` and it would ship.
 */
function looksLikeDecisionId(reason: string): boolean {
  return /[A-Z][A-Z0-9]*[-_]?\d/.test(reason.trim());
}

/**
 * Why `remove` cannot be applied, or `null` when it can.
 *
 * Exported for its own rows. The two refusals differ in their MESSAGE and not
 * in their exit code — an id outside the frozen union is also outside
 * `missing`, so the second check would refuse it anyway — and the difference
 * matters: for a typo, "remove the surface upstream first" is actively
 * misleading advice where "check the id" is not. A suite that only read the
 * exit code could not see the distinction, and a mutation deleting the first
 * check went undetected until these rows existed.
 *
 * Two refusals, and the second is the one that keeps this from being a hole in
 * the drift rule: a surface that STILL RESOLVES is not removable here. Removing
 * one would be the silent narrowing the exit-2 rule exists to stop, and the
 * operator's actual situation is that the decision has not been applied
 * upstream yet.
 */
export function refuseUnremovable(
  remove: readonly string[],
  frozen: readonly string[],
  missing: readonly string[],
): string | null {
  const notFrozen = remove.filter((id) => !frozen.includes(id));
  if (notFrozen.length > 0) {
    return (
      `qfai prototyping rescope: ${notFrozen.join(", ")} is not in frozenSurfaceUnion ` +
      `(${frozen.join(", ")}). Nothing to remove — check the id.`
    );
  }
  const stillResolves = remove.filter((id) => !missing.includes(id));
  if (stillResolves.length > 0) {
    return (
      `qfai prototyping rescope: ${stillResolves.join(", ")} still resolves as a UI-bearing ` +
      "spec, so it has not been retired anywhere but here. Remove the surface upstream first " +
      "(the spec, its UI contract and its route), then run this to bring the frozen union " +
      "into line. Dropping a surface that still exists is the lock drift the frozen union " +
      "exists to detect, and this operation will not do it."
    );
  }
  return null;
}

/**
 * Drop the removed surfaces from every cycle's `iterate-plan.json#screens`.
 *
 * Returns the relative paths that changed. `screens` is present only when a
 * cycle ran with `--capture`, so most loops have none and this is a no-op.
 */
async function rescopeIteratePlans(options: RescopeOptions): Promise<string[]> {
  const evidenceRel = path.posix.dirname(PROTOTYPING_JSON_REL);
  const evidenceAbs = path.join(options.root, evidenceRel);
  let names: string[];
  try {
    names = await readdir(evidenceAbs);
  } catch {
    return [];
  }
  const touched: string[] = [];
  for (const name of names.filter((entry) => /^iter-\d{2,}$/.test(entry)).sort()) {
    const rel = `${evidenceRel}/${name}/iterate-plan.json`;
    const abs = path.join(options.root, rel);
    const plan = await readJsonObject(abs);
    if (plan === null || !Array.isArray(plan.screens)) continue;
    const kept = plan.screens.filter((screen) => !namesRemovedSurface(screen, options.remove));
    if (kept.length === plan.screens.length) continue;
    touched.push(rel);
    if (!options.dryRun) {
      await writeFile(abs, `${JSON.stringify({ ...plan, screens: kept }, null, 2)}\n`, "utf-8");
    }
  }
  return touched;
}

/** Whether a plan `screens` entry belongs to one of the removed surfaces. */
function namesRemovedSurface(screen: unknown, remove: readonly string[]): boolean {
  if (typeof screen !== "object" || screen === null) return false;
  const spec = (screen as { specId?: unknown }).specId;
  return typeof spec === "string" && remove.includes(spec);
}

/**
 * Mark the affected `review.json` entries superseded, WITHOUT touching prose.
 *
 * What a reviewer saw at cycle N is a historical fact. Editing `proseCritique`
 * to match a scope it never described would be fabricating the critique — the
 * issue's second point, and the reason this writes an annotation instead:
 * `retiredSurfaces` records which ids the critique still mentions and why they
 * are gone, so a reader of `iter-NN/review.json` can tell a stale claim from a
 * wrong one.
 */
async function annotateReviews(
  options: RescopeOptions,
  entries: readonly RescopeAuditEntry[],
): Promise<string[]> {
  const evidenceRel = path.posix.dirname(PROTOTYPING_JSON_REL);
  let names: string[];
  try {
    names = await readdir(path.join(options.root, evidenceRel));
  } catch {
    return [];
  }
  const touched: string[] = [];
  for (const name of names.filter((entry) => /^iter-\d{2,}$/.test(entry)).sort()) {
    const rel = `${evidenceRel}/${name}/review.json`;
    const abs = path.join(options.root, rel);
    const review = await readJsonObject(abs);
    if (review === null) continue;
    const already = readAuditLog(review.retiredSurfaces);
    const additions = entries.filter(
      (entry) => !already.some((prior) => prior.surface === entry.surface),
    );
    if (additions.length === 0) continue;
    touched.push(rel);
    if (!options.dryRun) {
      await writeFile(
        abs,
        `${JSON.stringify({ ...review, retiredSurfaces: [...already, ...additions] }, null, 2)}\n`,
        "utf-8",
      );
    }
  }
  return touched;
}

/** Echo what was done, or would be. */
function reportPlan(
  options: RescopeOptions,
  entries: readonly RescopeAuditEntry[],
  plans: readonly string[],
  reviews: readonly string[],
): void {
  for (const entry of entries) {
    info(`  retired: ${entry.surface} (reason: ${entry.reason})`);
  }
  for (const rel of plans) {
    info(`  screens pruned: ${rel}`);
  }
  for (const rel of reviews) {
    // Said explicitly, because the natural assumption about a tool that
    // "updates the review" is that it edited the critique.
    info(`  marked superseded (prose untouched): ${rel}`);
  }
  if (reviews.length === 0) {
    info("  no review.json needed an annotation.");
  }
}

/** A JSON object at `abs`, or `null` when it is absent or not an object. */
async function readJsonObject(abs: string): Promise<Record<string, unknown> | null> {
  let raw: string;
  try {
    raw = await readFile(abs, "utf-8");
  } catch {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Existing audit entries, or `[]` when the field is absent or malformed. */
function readAuditLog(value: unknown): RescopeAuditEntry[] {
  if (!Array.isArray(value)) return [];
  const out: RescopeAuditEntry[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.surface !== "string" || typeof record.reason !== "string") continue;
    out.push({
      surface: record.surface,
      reason: record.reason,
      cycle: typeof record.cycle === "number" ? record.cycle : null,
      at: typeof record.at === "string" ? record.at : "",
    });
  }
  return out;
}
