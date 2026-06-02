/**
 * Read the canonical per-loop prototyping mode from
 * `.qfai/evidence/prototyping/prototyping.json#mode`. Pure file I/O
 * with defensive parsing — every malformed / missing class returns
 * `null` so validate-time consumers can fall through to the default
 * `convergence` posture without throwing.
 *
 * Kept as a tiny module of its own (instead of inlining into
 * `validate.ts`) so the surface is unit-testable in isolation and the
 * dynamic import in `validate.ts` can stay at the helper boundary
 * (TypeScript's import-graph cycle avoidance).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { PROTOTYPING_JSON_REL } from "./paths.js";

export type PrototypingMode = "convergence" | "exploration";

/**
 * Per-iteration view computed by `resolvePrototypingIterationViews`
 * with sticky-mode inheritance applied. The structural-typing match
 * with `core/validators/prototyping/explorationCertify.ts#
 * CertifyIterationView` is intentional — certify and the relax
 * helper consume the SAME view set so the two surfaces can never
 * disagree on the effective mode of any iteration (codex
 * r3338445364: one SSOT for cross-surface mode resolution).
 */
export type PrototypingIterationView = {
  readonly index: number;
  readonly mode?: PrototypingMode;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Forward-walk every iteration in `protoJson.iterations` and apply
 * sticky-mode inheritance: an iteration that omits `mode` (or has an
 * unknown value) inherits the most-recent prior explicit mode. The
 * returned views are in source order with `index` honored when the
 * iteration carries one (else fallback to array position).
 *
 * SSOT for cross-surface mode resolution. Both `qfai validate` (via
 * `readPrototypingModeForRelax` which inspects only the last view)
 * and `qfai prototyping certify` (via `extractIterationViewsForCertify`
 * which inspects every view to spot explicit/sticky exploration)
 * MUST consume this same view set so the "soft-relaxed exploration
 * loop sealed by certify" escape-hatch stays structurally closed.
 *
 * Defensive parsing: returns `[]` for any malformed shape (non-record
 * payload / `iterations` not an array / iterations[] empty); never
 * throws.
 */
export function resolvePrototypingIterationViews(
  protoJson: unknown,
): readonly PrototypingIterationView[] {
  if (!isPlainObject(protoJson)) return [];
  const iterations = protoJson.iterations;
  if (!Array.isArray(iterations)) return [];
  const views: PrototypingIterationView[] = [];
  let lastExplicit: PrototypingMode | undefined;
  for (let i = 0; i < iterations.length; i += 1) {
    const entry: unknown = iterations[i];
    let index = i;
    let mode: PrototypingMode | undefined;
    if (isPlainObject(entry)) {
      const rawIndex = entry.index;
      if (typeof rawIndex === "number" && Number.isInteger(rawIndex) && rawIndex >= 0) {
        index = rawIndex;
      }
      const rawMode = entry.mode;
      if (rawMode === "convergence" || rawMode === "exploration") {
        mode = rawMode;
        lastExplicit = rawMode;
      } else if (lastExplicit !== undefined) {
        mode = lastExplicit;
      }
    } else if (lastExplicit !== undefined) {
      mode = lastExplicit;
    }
    views.push(mode !== undefined ? { index, mode } : { index });
  }
  return views;
}

/**
 * Returns the recorded mode from prototyping.json, or `null` when the
 * file is missing / unparseable / no iteration carries a valid `mode`
 * value. Callers MUST interpret `null` as "no override → use the
 * convergence default".
 *
 * Read strategy: delegate to `resolvePrototypingIterationViews` (the
 * cross-surface SSOT) and return the LAST view's mode. With sticky
 * inheritance applied during view construction, the last view's mode
 * is structurally equivalent to "the most-recent explicit mode" —
 * which is the property `qfai validate` needs to decide whether the
 * loop is in exploration posture (warning-only soft gates) or in
 * convergence (default).
 *
 * The top-level `mode` slot is intentionally NOT consulted here
 * because it is an operator-defined object schema preserved verbatim
 * across cycle-0 resets (see iterate's writeSeedMetadata preservation
 * contract).
 */
export async function readPrototypingModeForRelax(root: string): Promise<PrototypingMode | null> {
  const abs = path.join(root, PROTOTYPING_JSON_REL);
  let raw: string;
  try {
    raw = await readFile(abs, "utf-8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const views = resolvePrototypingIterationViews(parsed);
  if (views.length === 0) return null;
  const last = views[views.length - 1];
  return last?.mode ?? null;
}
