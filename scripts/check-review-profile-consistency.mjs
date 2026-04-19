#!/usr/bin/env node
/* global console, process, URL */
/**
 * check-review-profile-consistency.mjs
 *
 * Verifies that each review phase in `.qfai/assistant/steering/agent-routing.yml`
 * that declares a `review_profile` has `mandatory_agents` and `blocking_agents`
 * that are a superset of the profile's `always_required` set declared in
 * `.qfai/assistant/steering/review-profiles.yml`. Prevents silent drift
 * between the two SSOT files flagged during PR #196 review.
 *
 * Exit codes:
 *   0 — all profiles consistent
 *   1 — drift detected (prints one `DRIFT:` line per offending phase)
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

// pnpm hoists `yaml` under the qfai workspace; resolve from there so this
// root-level script works without adding yaml to the root package.json.
const require = createRequire(import.meta.url);
const { parse: parseYaml } = require("./../packages/qfai/node_modules/yaml");

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const ROUTING_PATH = join(ROOT, ".qfai", "assistant", "steering", "agent-routing.yml");
const PROFILES_PATH = join(ROOT, ".qfai", "assistant", "steering", "review-profiles.yml");

function loadYaml(path) {
  try {
    const content = readFileSync(path, "utf-8");
    return parseYaml(content);
  } catch (error) {
    console.error(`Failed to load ${path}: ${error?.message ?? error}`);
    process.exit(1);
  }
}

const routingDoc = loadYaml(ROUTING_PATH);
const profilesDoc = loadYaml(PROFILES_PATH);
const profiles = profilesDoc?.profiles ?? {};

// agent-routing.yml has top-level `routing:` (array of skill entries).
const routing = Array.isArray(routingDoc?.routing) ? routingDoc.routing : [];

const drifts = [];
for (const entry of routing) {
  const skill = entry.skill ?? "<unknown-skill>";
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
    const blocking = new Set(phase.blocking_agents ?? []);
    for (const agent of required) {
      if (!mandatory.has(agent)) {
        drifts.push(
          `DRIFT: ${skill}:${phase.id} (${profileName}) missing "${agent}" from mandatory_agents`,
        );
      }
      if (!blocking.has(agent)) {
        drifts.push(
          `DRIFT: ${skill}:${phase.id} (${profileName}) missing "${agent}" from blocking_agents`,
        );
      }
    }
  }
}

if (drifts.length > 0) {
  for (const line of drifts) console.error(line);
  console.error(
    `\n${drifts.length} drift(s) detected. Fix agent-routing.yml or review-profiles.yml.`,
  );
  process.exit(1);
}

console.log("Review profile consistency check passed.");
