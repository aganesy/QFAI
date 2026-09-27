/**
 * Integration: the shipped manifests route the two entry skills.
 *
 * `qfai-run` only orchestrates, so its entry names the orchestrator and no author or reviewer.
 * `qfai-maintain` has an authoring phase and a reviewer who is not its author, on the existing
 * `default` profile, and `review-profiles.yml` gains no profile for it. Well-formedness is the
 * routing validators'.
 */
// QFAI:SPEC-0015:TC-0015-0038
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { readShipped } from "../helpers/shippedAssistant.js";

const SIX_PROFILES = [
  "architecture-heavy",
  "default",
  "implementation-heavy",
  "requirements-heavy",
  "runtime-heavy",
  "ui-bearing",
];

const AGENT_FIELDS = ["mandatory_agents", "conditional_agents", "blocking_agents"] as const;

type Phase = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function phaseAgents(phase: Phase): string[] {
  const grouped = Array.isArray(phase.parallel_groups)
    ? phase.parallel_groups.flatMap(strings)
    : [];
  return [...AGENT_FIELDS.flatMap((field) => strings(phase[field])), ...grouped];
}

async function routingEntry(skill: string): Promise<Record<string, unknown> | undefined> {
  const manifest: unknown = parse(await readShipped("manifest/agent-routing.yml"));
  const routing = isRecord(manifest) && Array.isArray(manifest.routing) ? manifest.routing : [];
  return routing.filter(isRecord).find((entry) => entry.skill === skill);
}

async function profiles(): Promise<Record<string, unknown>> {
  const file: unknown = parse(await readShipped("manifest/review-profiles.yml"));
  return isRecord(file) && isRecord(file.profiles) ? file.profiles : {};
}

function phasesOf(entry: Record<string, unknown> | undefined): Phase[] {
  return entry && Array.isArray(entry.phases) ? entry.phases.filter(isRecord) : [];
}

describe("TC-0015-0038: the shipped manifests route the two entry skills", () => {
  it("TC-0015-0038: qfai-run routes the orchestrator only, qfai-maintain an author and an independent reviewer on default", async () => {
    const run = await routingEntry("qfai-run");
    expect(run, "agent-routing.yml has a qfai-run entry").toBeDefined();
    const runPhases = phasesOf(run);
    expect(runPhases.length, "qfai-run has a phase").toBeGreaterThan(0);
    expect([...new Set(runPhases.flatMap(phaseAgents))]).toEqual(["orchestrator"]);
    const known = await profiles();
    const runProfile = run?.review_profile;
    if (typeof runProfile === "string") {
      const selected = known[runProfile];
      expect(isRecord(selected) ? strings(selected.always_required) : ["?"]).toEqual([]);
    }

    const maintain = await routingEntry("qfai-maintain");
    expect(maintain?.review_profile).toBe("default");
    const maintainPhases = phasesOf(maintain);
    const authoring = maintainPhases.filter(
      (phase) => !strings(phase.mandatory_agents).includes("completion-reviewer"),
    );
    const authors = authoring.flatMap(phaseAgents);
    expect(authors.length, "qfai-maintain has an authoring phase").toBeGreaterThan(0);
    const reviewing = maintainPhases.filter((phase) =>
      strings(phase.blocking_agents).includes("completion-reviewer"),
    );
    expect(reviewing.length, "qfai-maintain has a blocking reviewer phase").toBeGreaterThan(0);
    expect(authors, "the reviewer is not an author").not.toContain("completion-reviewer");

    expect(Object.keys(known).sort()).toEqual(SIX_PROFILES);
  });
});
