/**
 * The cycle-0 frozen scope, and which of it still resolves (#1099).
 *
 * Read by both `QFAI-PROT-011` — which REPORTS a frozen surface that no longer
 * resolves — and `prototyping rescope`, which REMOVES one. They have to agree
 * about exactly which surfaces those are: computed separately they could
 * disagree, and either direction of disagreement is the hazard. `rescope`
 * refusing a surface the finding names leaves the operator with the reset the
 * finding exists to warn about; `rescope` removing one the finding does not
 * name is the lock drift the exit-2 rule exists to stop.
 *
 * Sharing the reader makes that a structural property instead of a documented
 * one: `rescope` removes from {@link FrozenScopeState.missing} and nowhere
 * else.
 */
import path from "node:path";
import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolveAllUiBearingSpecs } from "./specResolution.js";
import { PROTOTYPING_JSON_REL } from "./paths.js";

/** What the loop froze, and what of it a project can still resolve. */
export type FrozenScopeState = {
  /** `frozenSurfaceUnion` as recorded, in file order. */
  readonly frozen: readonly string[];
  /** Spec ids currently resolvable as UI-bearing. */
  readonly resolvable: ReadonlySet<string>;
  /** Frozen ids that no longer resolve, sorted. */
  readonly missing: readonly string[];
  /** Whether the loop is still iterating (`stopReason` empty). */
  readonly open: boolean;
};

/**
 * The frozen scope, or `null` when there is none to be wrong about.
 *
 * `null` covers a project with no prototyping loop, an unreadable or
 * non-JSON `prototyping.json`, and a loop that recorded no
 * `frozenSurfaceUnion` — three states in which neither the finding nor the
 * operation has a subject. Distinguishing them is `prototyping certify`'s job,
 * which refuses on an unreadable state with its own message.
 */
export async function readFrozenScopeState(
  root: string,
  config: QfaiConfig,
): Promise<FrozenScopeState | null> {
  const record = await readPrototypingRecord(root);
  if (record === null) return null;

  const frozen = readStringArray(record.frozenSurfaceUnion);
  if (frozen.length === 0) return null;

  const resolvable = new Set(await resolveAllUiBearingSpecs(root, config));
  // `frozenSurfaceUnion` stores bare spec numbers (`"0001"`) and the resolver
  // returns them the same way, so no normalisation is needed — a mismatch in
  // shape would make every entry look unreachable, which is why the comparison
  // is in one place rather than written twice.
  return {
    frozen,
    resolvable,
    missing: frozen.filter((id) => !resolvable.has(id)).sort(),
    // A closed loop is history, not a live claim. `stopReason` is what
    // `reviewerGate.ts` reads to decide the same question, so the three agree.
    open: !(typeof record.stopReason === "string" && record.stopReason.length > 0),
  };
}

type PrototypingRecord = {
  frozenSurfaceUnion?: unknown;
  stopReason?: unknown;
};

/** The parsed loop state, or `null` when it is absent or unreadable. */
async function readPrototypingRecord(root: string): Promise<PrototypingRecord | null> {
  let raw: string;
  try {
    raw = await readFile(path.join(root, PROTOTYPING_JSON_REL), "utf-8");
  } catch {
    // Absent is the normal state for a project with no prototyping loop, and an
    // unreadable one is `prototyping certify`'s to refuse — neither caller has
    // a frozen scope to work with either way.
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as PrototypingRecord) : null;
  } catch {
    return null;
  }
}

/** The string entries of `value`, or `[]` when it is not an array of strings. */
function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || entry.length === 0) return [];
    out.push(entry);
  }
  return out;
}
