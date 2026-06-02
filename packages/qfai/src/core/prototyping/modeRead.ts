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
 * Returns the recorded mode from prototyping.json, or `null` when the
 * file is missing / unparseable / no iteration carries a valid `mode`
 * value. Callers MUST interpret `null` as "no override → use the
 * convergence default".
 *
 * Read strategy: walk iterations from highest-indexed to lowest, and
 * return the first iteration whose `mode` is a known value
 * (`"convergence"` | `"exploration"`). This makes the most-recently-
 * recorded mode "sticky" so that a later iteration writer that omits
 * the `mode` slot does NOT silently revert an exploration loop to
 * convergence (which would flip the intended warning-only soft gates
 * back to error). Iterators that intentionally change posture must
 * still set `mode` explicitly on the iteration they write.
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
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const iterations: unknown = (parsed as Record<string, unknown>).iterations;
  if (!Array.isArray(iterations) || iterations.length === 0) return null;
  // Walk backward so the most-recent explicit mode wins; iterations
  // that omit `mode` inherit the prior posture instead of being
  // treated as a convergence reset.
  for (let i = iterations.length - 1; i >= 0; i -= 1) {
    const entry: unknown = iterations[i];
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) continue;
    const candidate = (entry as Record<string, unknown>).mode;
    if (candidate === "convergence" || candidate === "exploration") {
      return candidate;
    }
  }
  return null;
}
