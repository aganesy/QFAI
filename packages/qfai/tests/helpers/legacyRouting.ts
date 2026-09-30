/**
 * The routing entries a 1.x release shipped, for tests that put an unmodified 1.x manifest entry
 * into a project being migrated. The entries are read from a fixture copy of the last 1.x
 * manifest, as data: a project's own copy of the file differs from it in comments and layout only.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const LEGACY_ROUTING_FIXTURE = path.join(
  packageRoot,
  "tests",
  "fixtures",
  "migration-spec-to-story",
  "legacy-routing",
  "agent-routing-1.12.3.yml",
);

function isEntry(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Every entry of the 1.x routing manifest, in the order the manifest lists them. */
export async function legacyRoutingEntries(): Promise<Record<string, unknown>[]> {
  const parsed: unknown = parse(await readFile(LEGACY_ROUTING_FIXTURE, "utf8"));
  const routing: unknown = isEntry(parsed) ? parsed.routing : undefined;
  if (!Array.isArray(routing)) throw new Error(`${LEGACY_ROUTING_FIXTURE} holds no routing list`);
  return routing.filter(isEntry);
}
