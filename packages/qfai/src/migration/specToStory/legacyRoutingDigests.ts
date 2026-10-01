import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";

const DIGESTS_FILE = "legacy-routing-entries.json";

/** The entry with every mapping's keys in sorted order, lists kept in their own order. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => [key, canonical(item)]),
  );
}

/** The sha256 of an entry's canonical JSON, so comments, layout and key order do not matter. */
export function routingEntryDigest(entry: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonical(entry)))
    .digest("hex");
}

/** The digests of every routing entry the 1.x releases shipped, name included. */
export async function readLegacyRoutingDigests(): Promise<Set<string>> {
  const file = path.resolve(getInitAssetsDir(), "..", "defaults", DIGESTS_FILE);
  const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
  const digests =
    typeof parsed === "object" && parsed !== null && "digests" in parsed ? parsed.digests : [];
  return new Set(Array.isArray(digests) ? digests.filter((item) => typeof item === "string") : []);
}
