/**
 * Prototyping artifact ref integrity validator (v1.8.4 Phase 7).
 *
 * Walks every `xxxRef` string in prototyping.json / breakthrough.json /
 * round review-bundles and asserts the referenced file exists on disk.
 * This is the structural fix for RR §8.3 (review-bundle.json.spec="0017"
 * dangling reference): hardcoded ID-as-string was symptom; the deeper class
 * is "ref string written but the target was never produced / was deleted".
 *
 * Issued code: QFAI-PROT-REF-001 (single code, one issue per dangling ref).
 */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import { resolvePath } from "../../config.js";
import type { Issue } from "../../types.js";
import { EXPLORATION_ROUNDS, roundReviewBundlePath } from "../../prototyping/round.js";
import { issue } from "../utils.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function fileExists(absolutePath: string): Promise<boolean> {
  try {
    const s = await stat(absolutePath);
    return s.isFile();
  } catch {
    return false;
  }
}

async function loadJson(absolutePath: string): Promise<unknown> {
  try {
    const raw = await readFile(absolutePath, "utf-8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

type DanglingRef = {
  ref: string;
  source: string; // path of the artifact declaring this ref (relative to root)
  field: string; // dotted path inside the source describing where the ref lives
};

/**
 * Collect every string-typed `xxxRef` found by walking known paths in
 * `prototyping.json`. The function is exhaustive over the v2 lifecycle ref
 * surface; each call site is documented inline so future additions to the
 * schema have a single place to extend.
 */
function collectPrototypingJsonRefs(prototypingJson: unknown, sourcePath: string): DanglingRef[] {
  const out: DanglingRef[] = [];
  if (!isRecord(prototypingJson)) return out;

  const push = (ref: unknown, field: string): void => {
    if (typeof ref === "string" && ref.length > 0) {
      out.push({ ref, source: sourcePath, field });
    }
  };

  // rounds[].{harvestRef,narrowDecisionRef,absorptionPlanRef,reimplementationRef}
  const rounds = prototypingJson.rounds;
  if (Array.isArray(rounds)) {
    for (let i = 0; i < rounds.length; i++) {
      const round: unknown = rounds[i];
      if (!isRecord(round)) continue;
      push(round.harvestRef, `rounds[${i}].harvestRef`);
      push(round.narrowDecisionRef, `rounds[${i}].narrowDecisionRef`);
      push(round.absorptionPlanRef, `rounds[${i}].absorptionPlanRef`);
      push(round.reimplementationRef, `rounds[${i}].reimplementationRef`);

      // rounds[].evaluatorReviewRefsByCandidate.<id>
      const evalMap = round.evaluatorReviewRefsByCandidate;
      if (isRecord(evalMap)) {
        for (const [cid, ref] of Object.entries(evalMap)) {
          push(ref, `rounds[${i}].evaluatorReviewRefsByCandidate.${cid}`);
        }
      }

      // rounds[].screenEvidenceByCandidate.<id>.{screenshot,html,snapshot,commands}Ref
      const screenMap = round.screenEvidenceByCandidate;
      if (isRecord(screenMap)) {
        for (const [cid, candidateScreens] of Object.entries(screenMap)) {
          if (!isRecord(candidateScreens)) continue;
          for (const [screenId, refs] of Object.entries(candidateScreens)) {
            if (!isRecord(refs)) continue;
            push(
              refs.screenshotRef,
              `rounds[${i}].screenEvidenceByCandidate.${cid}.${screenId}.screenshotRef`,
            );
            push(refs.htmlRef, `rounds[${i}].screenEvidenceByCandidate.${cid}.${screenId}.htmlRef`);
            push(
              refs.snapshotRef,
              `rounds[${i}].screenEvidenceByCandidate.${cid}.${screenId}.snapshotRef`,
            );
            push(
              refs.commandLogRef,
              `rounds[${i}].screenEvidenceByCandidate.${cid}.${screenId}.commandLogRef`,
            );
          }
        }
      }
    }
  }

  // polishCycles[].{breakthroughRef,reviewerGateRef,evaluatorReviewRef}
  const polishCycles = prototypingJson.polishCycles;
  if (Array.isArray(polishCycles)) {
    for (let i = 0; i < polishCycles.length; i++) {
      const cycle: unknown = polishCycles[i];
      if (!isRecord(cycle)) continue;
      push(cycle.breakthroughRef, `polishCycles[${i}].breakthroughRef`);
      push(cycle.reviewerGateRef, `polishCycles[${i}].reviewerGateRef`);
      push(cycle.evaluatorReviewRef, `polishCycles[${i}].evaluatorReviewRef`);
    }
  }

  // bestOfHistory.evidenceRef
  const bestOfHistory = prototypingJson.bestOfHistory;
  if (isRecord(bestOfHistory)) {
    push(bestOfHistory.evidenceRef, "bestOfHistory.evidenceRef");
  }

  // breakthrough.evidenceRef
  const breakthrough = prototypingJson.breakthrough;
  if (isRecord(breakthrough)) {
    push(breakthrough.evidenceRef, "breakthrough.evidenceRef");
  }

  // reviewerGate.evidenceRef + reviewerGate.signoff.evidenceRef
  const reviewerGate = prototypingJson.reviewerGate;
  if (isRecord(reviewerGate)) {
    push(reviewerGate.evidenceRef, "reviewerGate.evidenceRef");
    const signoff = reviewerGate.signoff;
    if (isRecord(signoff)) {
      push(signoff.evidenceRef, "reviewerGate.signoff.evidenceRef");
    }
  }

  // fullHarness.iterations[].evidenceRefs.* (each value is a string array)
  const fullHarness = prototypingJson.fullHarness;
  if (isRecord(fullHarness) && Array.isArray(fullHarness.iterations)) {
    const iterations = fullHarness.iterations;
    for (let i = 0; i < iterations.length; i++) {
      const it: unknown = iterations[i];
      if (!isRecord(it)) continue;
      const er = it.evidenceRefs;
      if (!isRecord(er)) continue;
      for (const [key, refs] of Object.entries(er)) {
        if (!Array.isArray(refs)) continue;
        for (let j = 0; j < refs.length; j++) {
          const refValue: unknown = refs[j];
          push(refValue, `fullHarness.iterations[${i}].evidenceRefs.${key}[${j}]`);
        }
      }
    }
  }

  return out;
}

function collectReviewBundleRefs(bundle: unknown, sourcePath: string): DanglingRef[] {
  const out: DanglingRef[] = [];
  if (!isRecord(bundle)) return out;
  const push = (ref: unknown, field: string): void => {
    if (typeof ref === "string" && ref.length > 0) {
      out.push({ ref, source: sourcePath, field });
    }
  };
  push(bundle.axisDefsRef, "axisDefsRef");
  push(bundle.designSystemChecklistRef, "designSystemChecklistRef");
  push(bundle.commandPlanRef, "commandPlanRef");
  return out;
}

function collectBreakthroughRefs(breakthroughJson: unknown, sourcePath: string): DanglingRef[] {
  const out: DanglingRef[] = [];
  if (!isRecord(breakthroughJson)) return out;
  const branchRefs = breakthroughJson.branchRefs;
  if (Array.isArray(branchRefs)) {
    for (let i = 0; i < branchRefs.length; i++) {
      const ref: unknown = branchRefs[i];
      if (typeof ref === "string" && ref.length > 0) {
        out.push({ ref, source: sourcePath, field: `branchRefs[${i}]` });
      }
    }
  }
  return out;
}

export async function validatePrototypingArtifactRefIntegrity(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const evidenceRoot = path.join(path.dirname(resolvePath(root, config, "specsDir")), "evidence");

  const collectedRefs: DanglingRef[] = [];

  // 1) prototyping.json
  const protoPath = path.join(evidenceRoot, "prototyping.json");
  const protoJson = await loadJson(protoPath);
  if (protoJson) {
    const protoRel = path.relative(root, protoPath).replace(/\\/g, "/");
    collectedRefs.push(...collectPrototypingJsonRefs(protoJson, protoRel));
  }

  // 2) round review-bundle.json (per round)
  for (const round of EXPLORATION_ROUNDS) {
    const bundlePath = path.join(root, ...roundReviewBundlePath(round).split("/"));
    const bundleJson = await loadJson(bundlePath);
    if (bundleJson) {
      const bundleRel = path.relative(root, bundlePath).replace(/\\/g, "/");
      collectedRefs.push(...collectReviewBundleRefs(bundleJson, bundleRel));
    }
  }

  // 3) breakthrough.json
  const breakthroughPath = path.join(evidenceRoot, "prototyping", "breakthrough.json");
  const breakthroughJson = await loadJson(breakthroughPath);
  if (breakthroughJson) {
    const breakthroughRel = path.relative(root, breakthroughPath).replace(/\\/g, "/");
    collectedRefs.push(...collectBreakthroughRefs(breakthroughJson, breakthroughRel));
  }

  // Verify each collected ref. We accept any ref that resolves either
  // relative to the repo root or as already-rooted (legacy entries).
  for (const ref of collectedRefs) {
    const candidatePath = path.isAbsolute(ref.ref) ? ref.ref : path.join(root, ref.ref);
    if (!(await fileExists(candidatePath))) {
      issues.push(
        issue(
          "QFAI-PROT-REF-001",
          `${ref.source}: ${ref.field}="${ref.ref}" points to a file that does not exist on disk.`,
          "warning",
          ref.source,
          "prototyping.artifactRef.reality",
          undefined,
          "canonical",
          "ref を実在するファイルに合わせるか、欠落 artifact を生成してください (round-* / verify CLI を再実行)。",
        ),
      );
    }
  }

  return issues;
}
