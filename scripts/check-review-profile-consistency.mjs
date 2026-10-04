#!/usr/bin/env node
/* global console, process, URL */
/**
 * check-review-profile-consistency.mjs
 *
 * Verifies that each review phase in the package's routing defaults
 * that declares a `review_profile` has `mandatory_agents`
 * that are a superset of the profile's `always_required` set declared in
 * the package's review-profile defaults. Prevents silent drift
 * between the two SSOT files.
 *
 * Exit codes:
 *   0 — all profiles consistent
 *   1 — drift detected (prints one `DRIFT:` line per offending phase)
 */
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

// pnpm hoists `yaml` under the qfai workspace; resolve from there so this
// root-level script works without adding yaml to the root package.json.
const require = createRequire(import.meta.url);
const { parse: parseYaml } = require("./../packages/qfai/node_modules/yaml");

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const DEFAULTS = join(ROOT, "packages", "qfai", "assets", "defaults");
const ROUTING_DIR = join(DEFAULTS, "agent-routing");
const PROFILES_PATH = join(DEFAULTS, "review-profiles.yml");

function loadYaml(path) {
  try {
    const content = readFileSync(path, "utf-8");
    return parseYaml(content);
  } catch (error) {
    console.error(`Failed to load ${path}: ${error?.message ?? error}`);
    process.exit(1);
  }
}

const profilesDoc = loadYaml(PROFILES_PATH);
const profiles = profilesDoc?.profiles ?? {};

// Every file in the routing directory has a top-level `routing:`, an array of
// `step:` and `skill:` entries. The set is read in file-name order as one list,
// as the package's own loader reads it.
const routing = readdirSync(ROUTING_DIR)
  .filter((name) => name.endsWith(".yml"))
  .sort()
  .flatMap((name) => {
    const doc = loadYaml(join(ROUTING_DIR, name));
    return Array.isArray(doc?.routing) ? doc.routing : [];
  });

const drifts = [];
for (const entry of routing) {
  const skill = entry.step ?? entry.skill ?? "<unknown-entry>";
  const profileName = entry.review_profile;
  if (!profileName) continue;
  const profile = profiles[profileName];
  if (!profile) {
    drifts.push(`DRIFT: ${skill} references unknown profile "${profileName}"`);
    continue;
  }
  const required = new Set(profile.always_required ?? []);
  for (const phase of entry.phases ?? []) {
    if (phase.id !== "review") continue;
    const mandatory = new Set(phase.mandatory_agents ?? []);
    for (const agent of required) {
      if (!mandatory.has(agent)) {
        drifts.push(
          `DRIFT: ${skill}:${phase.id} (${profileName}) missing "${agent}" from mandatory_agents`,
        );
      }
    }
  }
}

if (drifts.length > 0) {
  for (const line of drifts) console.error(line);
  console.error(
    `\n${drifts.length} drift(s) detected. Fix the routing defaults or review-profiles.yml.`,
  );
  process.exit(1);
}

console.log("Review profile consistency check passed.");
