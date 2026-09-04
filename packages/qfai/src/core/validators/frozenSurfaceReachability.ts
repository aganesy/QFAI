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
 * A `warning` behind a promotion window. The route out is
 * `prototyping rescope --remove <id> --reason <delta-id>` (#1099), which is
 * non-destructive and leaves the loop at its cycle — so unlike the first
 * revision of this finding, the window is justified on its own terms rather
 * than as an apology for having no remedy to offer. What it needs the window
 * for is the ordinary reason: a project already carrying the state has never
 * been told, and gets a minor to run the operation before the gate closes.
 *
 * The finding and the operation read ONE reader,
 * `core/prototyping/frozenScope.ts`. `rescope` removes only what this finding
 * reports, which is what keeps the operation from becoming a way to widen the
 * frozen scope or to drop a surface whose spec still declares a UI marker —
 * the drift the exit-2 rule exists to stop.
 */
import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { readFrozenScopeState } from "../prototyping/frozenScope.js";
import { newRuleSeverity, RULE_PROMOTIONS } from "../sunset.js";
import { resolveToolVersion } from "../version.js";
import { issue } from "./utils.js";
import { PROTOTYPING_JSON_REL } from "../prototyping/paths.js";

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
  const state = await readFrozenScopeState(root, config);
  if (state === null) return [];
  if (!state.open) return [];

  const { frozen, resolvable, missing } = state;
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
        "`iterate` hard-stops on. A scope reduction has an in-loop route: " +
        "`qfai prototyping rescope --remove <id> --reason <delta-id>` drops the surface from " +
        "the frozen union, records why, and leaves the loop at its current cycle." +
        windowNote,
      severity,
      PROTOTYPING_JSON_REL,
      "prototyping.frozenSurfaceUnreachable",
      [...missing],
      "canonical",
      "Run `npx qfai prototyping rescope --remove <id> --reason <delta-id>` for each id above, " +
        "citing the decision that retired it. If the surface was NOT meant to be retired, " +
        "restore its UI-bearing marker instead — `rescope` refuses a surface that still " +
        "resolves, so it cannot be used to drop one by mistake. The cycle-0 `--force` reset " +
        "remains available and remains destructive: it moves the recorded iterations to " +
        "`iter-00.backup-<ISO>`.",
    ),
  ];
}
