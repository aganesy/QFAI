/**
 * Spec ID linkage validator (v1.8.4 Phase 7).
 *
 * Verifies that spec IDs referenced inside prototyping artifacts and CLI
 * inputs resolve to specs that actually exist in the repo. Closes ID-linkage
 * gaps from the Phase 7 audit:
 *   - QFAI-PROT-LINK-001: prototyping.json.specs[].specId points to a
 *     missing spec dir
 *   - QFAI-PROT-LINK-002: review-bundle.json.spec points to a missing spec
 *   - QFAI-PROT-LINK-003: candidate artifact dir is missing
 *   - QFAI-PROT-LINK-004: polish cycle iteration dir is missing
 *
 * (QFAI-PROT-LINK-005 — test-file SPEC tag → existing spec — is enforced by
 * extending validateAtddCodeTraceability separately, since it scans
 * tests/ files and lives outside this validator's scope.)
 */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import { resolvePath } from "../../config.js";
import { EXPLORATION_ROUNDS, roundReviewBundlePath } from "../../prototyping/round.js";
import { collectSpecEntries } from "../../specLayout.js";
import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function isDirectory(absolutePath: string): Promise<boolean> {
  try {
    const s = await stat(absolutePath);
    return s.isDirectory();
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

/**
 * Normalize spec identifier strings used in artifacts. Accepts:
 *   - "0012" (4-digit raw)
 *   - "spec-0012" (prefixed)
 * Returns the 4-digit form, or undefined if the input doesn't match either
 * shape.
 */
function normalizeSpecId(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  const direct = /^(\d{4})$/.exec(trimmed);
  if (direct?.[1]) return direct[1];
  const prefixed = /^spec-(\d{4})$/i.exec(trimmed);
  if (prefixed?.[1]) return prefixed[1];
  return undefined;
}

export async function validateSpecIdLinkage(root: string, config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  const specsRoot = resolvePath(root, config, "specsDir");
  const evidenceRoot = path.join(path.dirname(specsRoot), "evidence");

  const specEntries = await collectSpecEntries(specsRoot);
  const knownSpecIds = new Set(specEntries.map((e) => e.specNumber));

  // ─── QFAI-PROT-LINK-001: prototyping.json.specs[].specId existence ───────
  const protoPath = path.join(evidenceRoot, "prototyping.json");
  const protoJson = await loadJson(protoPath);
  if (isRecord(protoJson)) {
    const protoRel = path.relative(root, protoPath).replace(/\\/g, "/");
    const specs = protoJson.specs;
    if (Array.isArray(specs)) {
      for (let i = 0; i < specs.length; i++) {
        const entry: unknown = specs[i];
        if (!isRecord(entry)) continue;
        const rawSpecId = entry.specId;
        if (rawSpecId === undefined) continue;
        const id = normalizeSpecId(rawSpecId);
        if (id === undefined) {
          // Reviewer comment from PR #201 (Codex, P2): malformed spec IDs
          // (e.g. "foo", "12") were silently passing because we only flagged
          // when normalize succeeded but the resolved ID was missing. Now
          // unparseable specId strings emit a warning of their own.
          issues.push(
            issue(
              "QFAI-PROT-LINK-001",
              `${protoRel}: specs[${i}].specId="${JSON.stringify(rawSpecId)}" is malformed (expected 4-digit "NNNN" or "spec-NNNN").`,
              "warning",
              protoRel,
              "prototyping.specs.idReality",
              undefined,
              "canonical",
              'specs[].specId は 4 桁の "NNNN" 形式または "spec-NNNN" 形式で指定してください。',
            ),
          );
          continue;
        }
        if (!knownSpecIds.has(id)) {
          issues.push(
            issue(
              "QFAI-PROT-LINK-001",
              `${protoRel}: specs[${i}].specId="${JSON.stringify(rawSpecId)}" but spec-${id} does not exist under ${path.relative(root, specsRoot).replace(/\\/g, "/")}/.`,
              "warning",
              protoRel,
              "prototyping.specs.idReality",
              undefined,
              "canonical",
              "対応する spec-NNNN ディレクトリを作成するか、specs[].specId 値を実在の spec に合わせてください。",
            ),
          );
        }
      }
    }

    // ─── QFAI-PROT-LINK-003: candidate artifact dir existence ──────────────
    const rounds = protoJson.rounds;
    if (Array.isArray(rounds)) {
      for (let i = 0; i < rounds.length; i++) {
        const round: unknown = rounds[i];
        if (!isRecord(round)) continue;
        const roundName = round.round;
        const candidates = round.candidates;
        if (typeof roundName !== "string" || !Array.isArray(candidates)) continue;
        for (let j = 0; j < candidates.length; j++) {
          const candidate: unknown = candidates[j];
          if (!isRecord(candidate)) continue;
          const candidateId = candidate.candidateId;
          if (typeof candidateId !== "string") continue;
          const candidateDir = path.join(
            evidenceRoot,
            "prototyping",
            "rounds",
            roundName,
            "candidates",
            candidateId,
          );
          if (!(await isDirectory(candidateDir))) {
            const relCandidateDir = path.relative(root, candidateDir).replace(/\\/g, "/");
            issues.push(
              issue(
                "QFAI-PROT-LINK-003",
                `${protoRel}: rounds[${i}].candidates[${j}].candidateId="${candidateId}" but ${relCandidateDir} does not exist.`,
                "warning",
                protoRel,
                "prototyping.candidates.dirReality",
                undefined,
                "canonical",
                "candidateId に対応する artifact ディレクトリを `qfai prototyping round-start` で生成するか、無効な candidate を index から削除してください。",
              ),
            );
          }
        }
      }
    }

    // ─── QFAI-PROT-LINK-004: polish cycle iteration dir existence ─────────
    const polishCycles = protoJson.polishCycles;
    if (Array.isArray(polishCycles)) {
      for (let i = 0; i < polishCycles.length; i++) {
        const cycle: unknown = polishCycles[i];
        if (!isRecord(cycle)) continue;
        const cycleNum = cycle.cycle;
        if (typeof cycleNum !== "number" || cycleNum < 1) continue;
        const iterationDir = path.join(evidenceRoot, "prototyping", "iterations", String(cycleNum));
        if (!(await isDirectory(iterationDir))) {
          const relIterationDir = path.relative(root, iterationDir).replace(/\\/g, "/");
          issues.push(
            issue(
              "QFAI-PROT-LINK-004",
              `${protoRel}: polishCycles[${i}].cycle=${cycleNum} but ${relIterationDir} does not exist.`,
              "warning",
              protoRel,
              "prototyping.polishCycles.iterationDirReality",
              undefined,
              "canonical",
              "polish cycle に対応する iteration ディレクトリを再生成するか、無効な polish cycle を index から削除してください。",
            ),
          );
        }
      }
    }
  }

  // ─── QFAI-PROT-LINK-002: review-bundle.json.spec existence (per round) ──
  for (const round of EXPLORATION_ROUNDS) {
    const bundlePath = path.join(root, ...roundReviewBundlePath(round).split("/"));
    const bundleJson = await loadJson(bundlePath);
    if (!isRecord(bundleJson)) continue;
    const id = normalizeSpecId(bundleJson.spec);
    if (id !== undefined && !knownSpecIds.has(id)) {
      const bundleRel = path.relative(root, bundlePath).replace(/\\/g, "/");
      issues.push(
        issue(
          "QFAI-PROT-LINK-002",
          `${bundleRel}: spec="${String(bundleJson.spec)}" but spec-${id} does not exist under ${path.relative(root, specsRoot).replace(/\\/g, "/")}/.`,
          "error",
          bundleRel,
          "prototyping.reviewBundle.specReality",
          undefined,
          "canonical",
          "review-bundle.json の spec を `qfai prototyping show-spec` の結果に合わせて再生成してください。",
        ),
      );
    }
  }

  return issues;
}
