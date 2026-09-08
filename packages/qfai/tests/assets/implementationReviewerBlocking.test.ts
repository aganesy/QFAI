/**
 * A mandatory reviewer's verdict has to block (#387).
 *
 * `qfai-implement/SKILL.md` makes `implementation-reviewer` PASS item 8 of the
 * unconditional 12-point gate. But `agent-routing.yml` listed it under
 * `mandatory_agents` and *not* `blocking_agents`, `review-profiles.yml` put it
 * in `conditional_required`, and both of the skill's DONE rules — plus the
 * shared delegation baseline — are phrased over *blocking* reviewers only. An
 * item could legally reach `done` with the code-quality reviewer at REVISE.
 *
 * The CI drift guard could not catch it: it iterates the profile's
 * `always_required` and asserts it is a subset of both routing sets, so a
 * routing entry that is mandatory-but-not-blocking was never examined.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

type Phase = {
  id?: string;
  mandatory_agents?: string[];
  blocking_agents?: string[];
};
type RoutingEntry = { skill?: string; phases?: Phase[]; review_profile?: string };
type Profile = { always_required?: string[]; conditional_required?: string[] };

async function loadRouting(tree: string): Promise<RoutingEntry[]> {
  const doc = parseYaml(await read(tree, "assistant/manifest/agent-routing.yml")) as {
    routing?: RoutingEntry[];
  };
  return doc.routing ?? [];
}

async function loadProfiles(tree: string): Promise<Record<string, Profile>> {
  const doc = parseYaml(await read(tree, "assistant/manifest/review-profiles.yml")) as {
    profiles?: Record<string, Profile>;
  };
  return doc.profiles ?? {};
}

const REVIEWER_NAME = /(?:-reviewer|-gatekeeper)$/;

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("routed reviewers block", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: every mandatory reviewer in a review phase is also blocking`, async () => {
      // The general invariant, not just the one instance. This is the check the
      // drift guard was missing, asserted over the shipped manifest.
      const offenders: string[] = [];
      for (const entry of await loadRouting(tree)) {
        for (const phase of entry.phases ?? []) {
          if (phase.id !== "review") continue;
          const blocking = new Set(phase.blocking_agents ?? []);
          for (const agent of phase.mandatory_agents ?? []) {
            if (REVIEWER_NAME.test(agent) && !blocking.has(agent)) {
              offenders.push(`${entry.skill}:${phase.id} -> ${agent}`);
            }
          }
        }
      }
      expect(offenders).toEqual([]);
    });

    it(`${tree}: qfai-implement blocks on implementation-reviewer`, async () => {
      const entry = (await loadRouting(tree)).find((e) => e.skill === "qfai-implement");
      const review = entry?.phases?.find((p) => p.id === "review");

      expect(review?.mandatory_agents).toContain("implementation-reviewer");
      expect(review?.blocking_agents).toContain("implementation-reviewer");
    });

    it(`${tree}: its profile requires the same reviewer unconditionally`, async () => {
      const entry = (await loadRouting(tree)).find((e) => e.skill === "qfai-implement");
      const profiles = await loadProfiles(tree);
      const profile = entry?.review_profile ? profiles[entry.review_profile] : undefined;

      expect(profile).toBeDefined();
      expect(profile?.always_required).toContain("implementation-reviewer");
      expect(profile?.conditional_required ?? []).not.toContain("implementation-reviewer");
    });

    it(`${tree}: runtime-heavy is unchanged for the skills that share it`, async () => {
      // Widening `runtime-heavy` would have made the code-quality review
      // blocking for qfai-atdd / qfai-configure / qfai-verify too, which is a
      // far larger behavioural change than the gate this fixes.
      const profiles = await loadProfiles(tree);
      expect(profiles["runtime-heavy"]?.always_required).not.toContain("implementation-reviewer");
      expect(profiles["runtime-heavy"]?.conditional_required).toContain("implementation-reviewer");

      const routing = await loadRouting(tree);
      for (const skill of ["qfai-atdd", "qfai-configure", "qfai-verify"]) {
        expect(routing.find((e) => e.skill === skill)?.review_profile).toBe("runtime-heavy");
      }
    });

    it(`${tree}: the skill frontmatter names the profile the routing uses`, async () => {
      const entry = (await loadRouting(tree)).find((e) => e.skill === "qfai-implement");
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");

      expect(skill).toContain(`routing-profile: ${entry?.review_profile}`);
    });

    it(`${tree}: no prose still works around the reviewer's absence`, async () => {
      // The manifest fix left three prose sites describing the pre-fix split.
      // Derive the claim from the manifest so the docs cannot drift back.
      const entry = (await loadRouting(tree)).find((e) => e.skill === "qfai-implement");
      const review = entry?.phases?.find((p) => p.id === "review");
      const blocking = review?.blocking_agents ?? [];
      const mandatory = review?.mandatory_agents ?? [];
      expect([...mandatory].sort()).toEqual([...blocking].sort());

      const skill = unwrap(await read(tree, "assistant/skills/qfai-implement/SKILL.md"));
      const policy = unwrap(
        await read(tree, "assistant/skills/qfai-implement/references/volume-policy.md"),
      );
      for (const doc of [skill, policy]) {
        for (const agent of blocking) {
          expect(doc).not.toContain(`\`${agent}\` is mandatory but not`);
        }
        expect(doc).not.toContain('"Required" is wider than `blocking_agents`');
      }
      expect(skill).toContain("Every reviewer in `blocking_agents` blocks `done`");
    });

    it(`${tree}: the 12-point gate still names the reviewer`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");

      // The alternative fix was to delete item 8. It was not taken, so item 8
      // must still be there — otherwise this change is half-applied.
      expect(skill).toContain("`implementation-reviewer` returned PASS");
    });
  }
});
