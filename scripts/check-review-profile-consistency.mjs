#!/usr/bin/env node
/* global console, process, URL */
/**
 * check-review-profile-consistency.mjs
 *
 * Verifies that each review phase in `.qfai/assistant/manifest/agent-routing.yml`
 * that declares a `review_profile` has `mandatory_agents` and `blocking_agents`
 * that are a superset of the profile's `always_required` set declared in
 * `.qfai/assistant/manifest/review-profiles.yml`. Prevents silent drift
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

/**
 * `manifest/` is the current layout and the one `npx qfai init` ships;
 * `steering/` is the legacy read-compatible layout, still present in this repo
 * as a stale copy. Reading `steering/` first meant the guard was validating a
 * file no skill loads, so a fix to the real manifest left it reporting the old
 * shape. Prefer `manifest/`, fall back to `steering/` for a project that has
 * not migrated.
 */
function resolveManifest(fileName) {
  for (const dir of ["manifest", "steering"]) {
    const candidate = join(ROOT, ".qfai", "assistant", dir, fileName);
    try {
      readFileSync(candidate, "utf-8");
      return candidate;
    } catch {
      // try the next layout
    }
  }
  console.error(
    `Failed to locate ${fileName} under .qfai/assistant/{manifest,steering}/ — cannot check review profile consistency.`,
  );
  process.exit(1);
}

const ROUTING_PATH = resolveManifest("agent-routing.yml");
const PROFILES_PATH = resolveManifest("review-profiles.yml");

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

/**
 * Agents whose output is a verdict. A `review` phase may legitimately route a
 * non-reviewer (an engineer re-running a build, say) as mandatory without it
 * blocking; a reviewer that cannot block is a contradiction.
 */
const REVIEWER_NAME = /(?:-reviewer|-gatekeeper)$/;

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

    // The reverse direction. The loop above walks the *profile*, so a routing
    // entry that is mandatory-but-not-blocking was never examined: an agent
    // could be required to run and still have its REVISE ignored, which is
    // exactly the state `qfai-implement/review` shipped in. Every DONE rule in
    // the skills and in `shared-skill-delegation-baseline.md` is phrased over
    // *blocking* reviewers, so a mandatory reviewer outside `blocking_agents`
    // has no verdict anyone is obliged to honour.
    for (const agent of mandatory) {
      if (!REVIEWER_NAME.test(agent)) continue;
      if (!blocking.has(agent)) {
        drifts.push(
          `DRIFT: ${skill}:${phase.id} lists "${agent}" in mandatory_agents but not in blocking_agents — ` +
            `a mandatory reviewer whose verdict does not block is unenforceable. ` +
            `Add it to blocking_agents, or drop it to conditional_agents if it is genuinely advisory.`,
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
