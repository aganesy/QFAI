/**
 * Unit: `prototyping.mode` config key + `--mode` CLI override + medium
 * gate-relaxation.
 *
 * - TC-0012-0475: `--mode exploration` overrides config; absence of
 *   both defaults to `convergence`. `prototyping.json#mode` records
 *   the per-iteration mode. Under exploration `QFAI-CRIT-008` and the
 *   design-compliance error downgrade error → warning while schema /
 *   path / license (exit 66) gates stay hard error (medium relaxation).
 *
 * The discriminator lives in `core/prototyping/mode.ts`
 * (`resolvePrototypingMode` + `relaxIssuesForMode`).
 */
// QFAI:SPEC-0012:TC-0012-0475

import { describe, expect, it } from "vitest";

import {
  EXPLORATION_RELAXABLE_CODES,
  EXPLORATION_HARD_ERROR_CODES,
  relaxIssuesForMode,
  resolvePrototypingMode,
} from "../../../../src/core/prototyping/mode.js";
import type { Issue } from "../../../../src/core/types.js";
import {
  codesEmittedAtError,
  collectPrototypingGateSurface,
  reachesFunction,
  type GateSurface,
} from "../../../helpers/prototypingGateSurface.js";

/**
 * The gate surface is derived by walking the whole validator call graph, which
 * costs a few seconds; every assertion below reads the same snapshot.
 */
let cached: Promise<GateSurface> | undefined;
const gateSurface = (): Promise<GateSurface> => (cached ??= collectPrototypingGateSurface());

/**
 * `issue()` call sites in the reachable graph whose code argument is computed
 * at run time, so no static scan can attribute it. Pinned by module,
 * expression and count: a NEW blind spot fails here instead of silently
 * shrinking the derived gate set. The same three sites are pinned, for the
 * same reason, by `tests/validators/ruleCodeUniqueness.test.ts`.
 */
const DYNAMIC_CODE_SITES = new Map<string, ReadonlyMap<string, number>>([
  ["core/validators/agentDefinition.ts", new Map([["code", 1]])],
  ["core/validators/designAudit.ts", new Map([["finding.ruleId", 1]])],
  ["core/validators/designFidelity.ts", new Map([["issueCode", 1]])],
]);

/** `file: expr x N, expr x N` — the count pins the number of call sites. */
const describeSites = (sites: ReadonlyMap<string, ReadonlyMap<string, number>>): string[] =>
  [...sites.keys()].sort().map((file) => {
    const counts = sites.get(file) ?? new Map<string, number>();
    const parts = [...counts.keys()].sort().map((expr) => `${expr} x ${counts.get(expr) ?? 0}`);
    return `${file}: ${parts.join(", ")}`;
  });

describe("TC-0012-0475: prototyping mode discriminator + CLI override", () => {
  it("defaults to convergence when neither CLI nor config is set", () => {
    const mode = resolvePrototypingMode({ cli: undefined, config: undefined });
    expect(mode).toBe("convergence");
  });

  it("CLI override beats config", () => {
    const mode = resolvePrototypingMode({ cli: "exploration", config: "convergence" });
    expect(mode).toBe("exploration");
  });

  it("config is honoured when CLI is absent", () => {
    const mode = resolvePrototypingMode({ cli: undefined, config: "exploration" });
    expect(mode).toBe("exploration");
  });

  it("invalid CLI / config values fall back to convergence", () => {
    // Defensive: a typoed value must not silently relax gates.
    const mode = resolvePrototypingMode({ cli: "nope", config: "also-nope" });
    expect(mode).toBe("convergence");
  });
});

describe("TC-0012-0475: exploration medium gate-relaxation downgrades soft gates only", () => {
  const baseIssue: Issue = {
    code: "QFAI-CRIT-008",
    severity: "error",
    category: "canonical",
    message: "iter loop not completed",
    rule: "renderCritique.loopNotCompleted",
  };

  it("downgrades QFAI-CRIT-008 under exploration", () => {
    const out = relaxIssuesForMode([baseIssue], "exploration");
    const found = out.find((i) => i.code === "QFAI-CRIT-008");
    expect(found?.severity).toBe("warning");
  });

  it("preserves QFAI-CRIT-008 severity under convergence", () => {
    const out = relaxIssuesForMode([baseIssue], "convergence");
    const found = out.find((i) => i.code === "QFAI-CRIT-008");
    expect(found?.severity).toBe("error");
  });

  it("downgrades design-compliance issues under exploration but keeps schema/path/license hard error", () => {
    const issues: Issue[] = [
      {
        code: "QFAI-DCON-030",
        severity: "error",
        category: "canonical",
        message: "design contract drift",
        rule: "designContractReadiness.drift",
      },
      // Hard-error class: schema / path / license MUST stay error
      // (exit 66 contract).
      {
        code: "QFAI-PROT-002",
        severity: "error",
        category: "canonical",
        message: "schema missing required field",
        rule: "prototypingEvidence.schema",
      },
    ];
    const out = relaxIssuesForMode(issues, "exploration");
    expect(out.find((i) => i.code === "QFAI-DCON-030")?.severity).toBe("warning");
    expect(out.find((i) => i.code === "QFAI-PROT-002")?.severity).toBe("error");
  });

  it("EXPLORATION_RELAXABLE_CODES and EXPLORATION_HARD_ERROR_CODES are disjoint", () => {
    const relaxable = new Set(EXPLORATION_RELAXABLE_CODES);
    for (const hard of EXPLORATION_HARD_ERROR_CODES) {
      expect(relaxable.has(hard)).toBe(false);
    }
  });
});

describe("TC-0012-0475: the hard-error allowlist is the pipeline's real gate set", () => {
  // Set EQUALITY against the WHOLE post-filter input, not a directory sample.
  // A scan scoped to the prototyping validator files left every other gate the
  // same pipeline runs — the evidence-artifact and config-link path gates, the
  // UI/UX and discussion-pack families — outside the audit, so any of them
  // could be moved into EXPLORATION_RELAXABLE_CODES with the whole suite still
  // green. Equality against the reachable set closes that: relaxing a gate now
  // fails here until it is removed from the hard list as well.
  it("is exactly the error codes reaching the post-filter, minus the relaxable ones", async () => {
    const surface = await gateSurface();
    const relaxable = new Set(EXPLORATION_RELAXABLE_CODES);
    const derived = codesEmittedAtError(surface).filter((code) => !relaxable.has(code));
    expect(derived).toEqual([...EXPLORATION_HARD_ERROR_CODES].sort());
  });

  it("reaches the validators the prototyping profile runs, not just the prototyping files", async () => {
    const surface = await gateSurface();
    // Sanity: a resolver regression that silently shrank the graph would make
    // the equality above assert against a truncated set.
    for (const validator of [
      "validatePrototypingEvidence",
      "validateUiEvidenceArtifacts",
      "validateConfigReferenceIntegrity",
      "runCanonicalUixValidators",
    ]) {
      expect(reachesFunction(surface, validator), `${validator} must be reachable`).toBe(true);
    }
  });

  it("excludes codes whose emitter the pipeline never reaches", async () => {
    const surface = await gateSurface();
    // QFAI-PROT-311's validator is exported and re-exported but never called,
    // and R-EXPLORATION-CERTIFY-ATTEMPT is raised by the certify command,
    // which does not run this post-filter. Listing either would put a gate in
    // the audit that cannot fire. When the delegation-map validator is wired,
    // this flips and the equality test above demands the code be listed.
    expect(reachesFunction(surface, "validateDelegationMapIssues")).toBe(false);
    expect(reachesFunction(surface, "detectExplorationCertifyAttempt")).toBe(false);
    expect(EXPLORATION_HARD_ERROR_CODES).not.toContain("QFAI-PROT-311");
    expect(EXPLORATION_HARD_ERROR_CODES).not.toContain("R-EXPLORATION-CERTIFY-ATTEMPT");
  });

  it("does not let the declaration back its own entries", async () => {
    const surface = await gateSurface();
    // `mode.ts` reaches the pipeline only through a dynamic import, which the
    // walker does not follow, so the constants under test are outside the
    // scanned graph.
    expect(reachesFunction(surface, "relaxIssuesForMode")).toBe(false);
    expect([...surface.reached].some((key) => key.includes("core/prototyping/mode.ts"))).toBe(
      false,
    );
  });

  it("QFAI-PROT-010 stays out of the hard list because it is emitted as a warning", async () => {
    const surface = await gateSurface();
    expect([...(surface.emissions.get("QFAI-PROT-010") ?? [])]).toEqual(["warning"]);
    expect(EXPLORATION_HARD_ERROR_CODES).not.toContain("QFAI-PROT-010");
  });

  it("every EXPLORATION_RELAXABLE_CODES entry is emitted at error severity", async () => {
    // A code no reachable validator emits as an error has nothing to
    // downgrade: the relaxation would be a no-op dressed up as a policy.
    const surface = await gateSurface();
    for (const code of EXPLORATION_RELAXABLE_CODES) {
      expect(
        surface.emissions.get(code)?.has("error") ?? false,
        `${code} is in the relaxable allowlist but no reachable validator emits it as an error`,
      ).toBe(true);
    }
  });

  it("has no unaccounted-for dynamic code argument", async () => {
    const surface = await gateSurface();
    expect(
      describeSites(surface.dynamicSites),
      "a computed rule code cannot be attributed to the hard list; emit a literal or a module-level constant, or pin the new site with a reason",
    ).toEqual(describeSites(DYNAMIC_CODE_SITES));
  });

  it("keeps every code behind a dynamic site out of the relaxable list", async () => {
    // Those codes are invisible to the equality check above, so without this
    // the blind spot would be a way to relax a gate unnoticed — the exact hole
    // the completeness rework closes everywhere else.
    const surface = await gateSurface();
    const relaxable = new Set(EXPLORATION_RELAXABLE_CODES);
    for (const [module, codes] of surface.dynamicSiteCodes) {
      const relaxed = codes.filter((code) => relaxable.has(code));
      expect(relaxed, `${module} emits ${relaxed.join(", ")} through a computed code`).toEqual([]);
    }
  });
});
