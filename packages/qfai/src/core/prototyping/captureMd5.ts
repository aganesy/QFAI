import { createHash } from "node:crypto";

/**
 * Compute the md5 hex digest of a buffer.
 *
 * Pure / deterministic. Used by the per-screen `lap-009` capture-md5
 * lane to surface visually-identical screens across distinct
 * `screens[].id` entries. Determinism is pinned by the unit test
 * ledger so consumers can rely on the output being stable across
 * Node versions and OS targets.
 */
export function md5Buffer(buf: Buffer): string {
  return createHash("md5").update(buf).digest("hex");
}
