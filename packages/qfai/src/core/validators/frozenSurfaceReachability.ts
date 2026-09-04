/**
 * Whether the cycle-0 frozen scope still exists (#1099).
 *
 * Cycle 0 records the screen set in `prototyping.json#frozenSurfaceUnion`, and
 * every later edit to it is lock drift — `qfai-prototyping/SKILL.md:120-123`
 * makes that exit 2. Correct as a drift rule: nobody should quietly widen the
 * frozen surface mid-loop.
 *
 * But it was the only rule, and it only fires when the loop tries to move.
 * A product decision that RETIRES a screen while the loop is open leaves the
 * frozen union naming a spec that no longer exists, and nothing says so:
 * `validate` reports `error=0` over a loop describing a screen that is gone.
 * The operator finds out at the next `iterate`, which is the point of no
 * return — the only route the skill offers is a full cycle-0 reset that
 * discards every cycle of review already paid for.
 *
 * `iterate` already hard-stops when **every** UI-bearing spec disappears
 * (`prototypingIterate.ts:529-573`). This is the partial case, which that
 * branch cannot see: some of the frozen scope is unreachable and the rest is
 * fine, so the precheck's "zero UI-bearing specs resolved" condition is false.
 *
 * A `warning`, not an `error`. The state is real and worth reporting, but the
 * in-loop way out does not exist yet (#1099 proposes a `rescope` operation), so
 * an `error` would fail a gate for a condition whose only remedy is the reset
 * this finding exists to warn about in advance. It says what the loop still
 * believes and what is actually resolvable, which is what the operator needs to
 * decide between reset and restore.
 */
import path from "node:path";
import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { resolveAllUiBearingSpecs } from "../prototyping/specResolution.js";
import { newRuleSeverity, RULE_PROMOTIONS } from "../sunset.js";
import { resolveToolVersion } from "../version.js";
import { issue } from "./utils.js";

const PROTOTYPING_JSON_REL = ".qfai/evidence/prototyping/prototyping.json";

/** The finding code, exported so a consumer can name it without a literal. */
export const FROZEN_SURFACE_UNREACHABLE_CODE = "QFAI-PROT-011";

/**
 * `frozenSurfaceUnion` entries no longer resolvable as UI-bearing specs.
 *
 * Silent unless there is a loop to be wrong about: no `prototyping.json`, an
 * unreadable one, no `frozenSurfaceUnion`, or a closed loop all mean there is no
 * frozen scope this run can contradict.
 */
export async function validateFrozenSurfaceReachability(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const record = await readPrototypingJson(root);
  if (record === null) return [];

  const frozen = readStringArray(record.frozenSurfaceUnion);
  if (frozen.length === 0) return [];

  // A closed loop is history, not a live claim. `stopReason` is what
  // `reviewerGate.ts` reads to decide the same question, so the two agree.
  if (typeof record.stopReason === "string" && record.stopReason.length > 0) return [];

  const resolvable = new Set(await resolveAllUiBearingSpecs(root, config));
  // `frozenSurfaceUnion` stores bare spec numbers (`"0001"`) where the resolver
  // returns them the same way, so the comparison needs no normalisation — but
  // it is asserted rather than assumed, because a mismatch in shape would make
  // every entry look unreachable and turn this finding into noise on every run.
  const missing = frozen.filter((id) => !resolvable.has(id)).sort();
  if (missing.length === 0) return [];
  if (missing.length === frozen.length && resolvable.size === 0) {
    // Every UI signal is gone. `iterate` hard-stops on exactly this with a
    // diagnostic naming the frozen union, and reporting it here as well would
    // put two findings on one state with two different remedies.
    return [];
  }

  // The severity comes from the promotion window, which `sunsetLedger.test.ts`
  // requires of any registered entry — a fixed severity beside a registration
  // is rejected, and rightly: the registry would then claim to decide something
  // it does not.
  const promoteAt = RULE_PROMOTIONS.frozenSurfaceUnreachable.promoteAt;
  const severity = newRuleSeverity(await resolveToolVersion(), promoteAt);
  const windowNote =
    severity === "warning" ? ` (${promoteAt} までは warning、以降は error になります)` : "";

  return [
    issue(
      FROZEN_SURFACE_UNREACHABLE_CODE,
      `prototyping.json#frozenSurfaceUnion names ${missing.length} spec(s) that no longer ` +
        `resolve as UI-bearing: ${missing.join(", ")}. The loop is still open ` +
        `(stopReason=null) and ${resolvable.size} of the frozen scope remains reachable, so ` +
        "this is a scope reduction rather than the all-markers-removed drift " +
        "`iterate` hard-stops on. Retiring a surface mid-loop has no in-loop path today: " +
        "`iterate --cycle 0 --force` refreezes the scope but moves `iter-00` aside and " +
        "discards the review already paid for. Restore the removed spec's UI marker to keep " +
        `the loop, or reset deliberately.${windowNote}`,
      severity,
      PROTOTYPING_JSON_REL,
      "prototyping.frozenSurfaceUnreachable",
      missing,
      "canonical",
      "Either restore the retired spec's UI-bearing marker so the frozen scope resolves again, " +
        "or re-run `qfai prototyping iterate --cycle 0 --target-url <url> --force` and accept " +
        "that the recorded iterations move to `iter-00.backup-<ISO>`.",
    ),
  ];
}

type PrototypingRecord = {
  frozenSurfaceUnion?: unknown;
  stopReason?: unknown;
};

/** The record, or `null` when there is no readable loop state. */
async function readPrototypingJson(root: string): Promise<PrototypingRecord | null> {
  let raw: string;
  try {
    raw = await readFile(path.join(root, PROTOTYPING_JSON_REL), "utf-8");
  } catch {
    // Absent is the normal state for a project with no prototyping loop, and an
    // unreadable one is `prototyping certify`'s to refuse — this validator has
    // no frozen scope to check either way.
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
