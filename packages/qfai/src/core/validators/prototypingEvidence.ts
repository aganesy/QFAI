import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { getConfigPath, resolvePath } from "../config.js";
import { parseStructuredContract } from "../contracts.js";
import { buildContractIndex } from "../contractIndex.js";
import { stripContractDeclarationLines } from "../contractsDecl.js";
import type {
  DiscussionModeRecommendation,
  ModeSelectionSource,
  PrototypingMode,
  PrototypingObligations,
  PrototypingSurface,
} from "../prototyping/types.js";
import {
  derivePrototypingObligations,
  inferSurfaceFromRecommendationAndEvidence,
  isValidPrototypingSurface,
} from "../prototyping/mode.js";
import { CANONICAL_PROTOTYPING_SURFACES } from "../domain/surface.js";
import { REVIEWER_PLACEHOLDERS } from "../harness/types.js";
import {
  resolveLatestRecommendationArtifact,
  type ResolvedRecommendationArtifact,
} from "../prototyping/recommendationArtifact.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import {
  readBrowserQaBundle,
  validateBrowserQaBundle,
  type BrowserQaBundle,
} from "../browserQa/index.js";
import { readRenderEvidenceBundle, validateRenderEvidenceBundle } from "../uiux/renderEvidence.js";
import {
  DEFAULT_RENDER_VIEWPORTS,
  looksLikeInlineRenderPayload,
  type RenderEvidenceBundle,
  type RenderEvidenceEntry,
} from "../uiux/renderEvidenceTypes.js";
import { resolveCalibrationPack } from "../calibration/packResolver.js";
import { isSupportedPrototypingSurface } from "../prototyping/surfacePolicy.js";
import { isCanonicalScreenContractRef, isSpecDeclarationRef } from "../prototyping/refSemantics.js";
import { isConcreteArtifactRef } from "../prototyping/pathUtils.js";
import { issue } from "./utils.js";

type PrototypingSpecEvidence = {
  specId: string;
  declared: {
    uiRoutes: number;
    apiEndpoints: number;
    dbObjects: number;
  };
  checked: {
    uiOk: number;
    apiNon404: number;
    dbPresent: number;
  };
  missing: {
    uiRoutes: string[];
    apiEndpoints: string[];
    dbObjects: string[];
  };
  coverageRefs?: Array<{
    route: string;
    declaredRef: string;
    observedRefs: string[];
  }>;
};

type PrototypingEvidence = {
  specs: PrototypingSpecEvidence[];
  surface?: string;
  mode?: {
    requested?: PrototypingMode;
    effective: PrototypingMode;
    source: ModeSelectionSource;
    rationale: string;
    discussionRecommendation?: DiscussionModeRecommendation;
  };
  fullHarness?: {
    enabled: true;
    runId: string;
    calibrationRef: {
      configPath: string;
      packPath: string;
      packVersion: string;
    };
    iterationCount: number;
    bestIteration: number;
    status: "in-progress" | "completed";
    terminationReason?: "converged" | "max-iterations" | "plateau" | "manual-stop";
    finalDecision: "pending" | "accepted" | "rejected" | "abandoned";
    reviewerSignoff: {
      reviewerId: string;
      status: "pending" | "approved" | "rejected" | "abandoned";
      timestamp?: string;
      source: string;
    };
    reviewerLogs: Array<{
      iteration: number;
      reviewerId: string;
      verdict: "approve" | "revise" | "reject" | "abandon";
      summary: string;
      evidenceRefs: string[];
    }>;
    iterations: Array<{
      iteration: number;
      commitSha: string;
      reviewerId: string;
      timestamp: string;
      changeSummary: string[];
      limitations: string[];
      evidenceRefs: {
        render: string[];
        browserQa: string[];
        runtimeGate: string[];
        uiObservation: string[];
        specCoverage: string[];
        discussion: string[];
        screenContract: string[];
        trend: string[];
      };
      l1: {
        panel: "L1";
        total: number;
        axes: Array<{ axisId: string; score: number; rationale: string; evidenceRefs: string[] }>;
      };
      l2: {
        panel: "L2";
        total: number;
        axes: Array<{ axisId: string; score: number; rationale: string; evidenceRefs: string[] }>;
      };
      weightedTotal: number;
      deltaFromPrevious: number | null;
      decision: string;
    }>;
    scoringTrace: Array<{
      iteration: number;
      l1Total: number;
      l2Total: number;
      weightedTotal: number;
      deltaFromPrevious: number | null;
      decision: string;
      commitSha: string;
    }>;
    limitations?: string[];
  };
  renderEvidence?: {
    status: "captured" | "skipped" | "failed";
    requested: boolean;
    outputPath?: string;
    viewports?: string[];
  };
  browserQa?: {
    executed: boolean;
    status: "completed" | "skipped" | "failed";
  };
  runtimeGate?: {
    ui: Array<{
      screenId: string;
      route: string;
      declaredRef: string;
      url?: string;
      rendered: boolean;
      browserVisited: boolean;
      httpStatus?: number;
      renderEvidenceRefs: string[];
      browserQaEvidenceRefs: string[];
    }>;
    evidenceRefs: string[];
  };
  uiFidelity?: UiFidelityEvidence;
  meta: {
    generatedAt: string;
    toolVersion: string;
    commands: string[];
  };
};

// PrototypingObligations is imported from prototyping/types.js

type UiFidelityMode = "interactive" | "skeleton";

type UiFidelityEvidence = {
  mode: UiFidelityMode;
  screens: UiFidelityScreenEvidence[];
};

type UiFidelityScreenEvidence = {
  route: string;
  uiContractId: string;
  expected: {
    elements: number;
    actions: number;
    labels?: string[];
    ids?: string[];
  };
  found?: {
    labels?: string[];
    markers?: string[];
  };
  missing?: {
    labels?: string[];
    markers?: string[];
  };
  coverage?: number;
  observed: {
    elementsPlaced: number;
    actionsWired: number;
  };
  mockPaths: UiFidelityMockPathEvidence[];
  renders: RenderEvidenceEntry[];
};

type UiFidelityMockPathEvidence = {
  id: string;
  status: string;
};

type UiContractScreenSummary = {
  elementsCount: number;
  actionsCount: number;
  elementLabels: string[];
  actionIds: string[];
};

type UiFidelityMismatch = {
  contractId: string;
  route: string;
  kind: "contract-missing" | "route-missing" | "elements" | "actions";
  details: string;
  contractFile?: string;
  contractElementLabels?: string[];
  requiredActionIds?: string[];
  knownRoutes?: string[];
};

const EVIDENCE_MARKDOWN_FILE = "prototyping.md";
const EVIDENCE_JSON_FILE = "prototyping.json";

export async function validatePrototypingEvidence(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const specEntries = await collectSpecEntries(specsRoot);
  if (specEntries.length === 0) {
    return [];
  }

  const qfaiRoot = path.dirname(specsRoot);
  const evidenceRoot = path.join(qfaiRoot, "evidence");
  const evidenceMarkdownPath = path.join(evidenceRoot, EVIDENCE_MARKDOWN_FILE);
  const evidenceJsonPath = path.join(evidenceRoot, EVIDENCE_JSON_FILE);
  const renderBundlePath = path.join(evidenceRoot, "render.json");
  const browserQaBundlePath = path.join(evidenceRoot, "browser-qa.json");

  const [markdownRaw, jsonRaw] = await Promise.all([
    readSafe(evidenceMarkdownPath),
    readSafe(evidenceJsonPath),
  ]);

  if (markdownRaw === null || jsonRaw === null) {
    const missing: string[] = [];
    if (markdownRaw === null) {
      missing.push(EVIDENCE_MARKDOWN_FILE);
    }
    if (jsonRaw === null) {
      missing.push(EVIDENCE_JSON_FILE);
    }
    return [
      issue(
        "QFAI-PROT-101",
        `prototyping evidence が不足しています: ${missing.join(", ")}`,
        "error",
        evidenceRoot,
        "prototypingEvidence.presence",
        missing,
        "change",
        [
          "`.qfai/evidence/prototyping.md` と `.qfai/evidence/prototyping.json` を作成または更新してください。",
          "Coverage Matrix と runtime gate 結果を全spec分記録してから validate を再実行してください。",
        ].join("\n"),
      ),
    ];
  }

  const parsed = parseEvidence(jsonRaw);
  if (!parsed.ok) {
    return [
      issue(
        "QFAI-PROT-101",
        `prototyping evidence JSON が不正です: ${parsed.reason}`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.schema",
        undefined,
        "change",
        "`.qfai/evidence/prototyping.json` の `specs/runtimeGate/meta` 構造を仕様どおりに修正してください。",
      ),
    ];
  }

  const expectedSpecIds = new Set(
    specEntries.map((entry) => `spec-${entry.specNumber}`.toLowerCase()),
  );
  const evidenceBySpecId = new Map(
    parsed.value.specs.map((entry) => [entry.specId.toLowerCase(), entry]),
  );

  const missingSpecIds = Array.from(expectedSpecIds)
    .filter((specId) => !evidenceBySpecId.has(specId))
    .sort((left, right) => left.localeCompare(right));

  const [renderBundle, browserQaBundle] = await Promise.all([
    readRenderEvidenceBundle(renderBundlePath),
    readBrowserQaBundle(browserQaBundlePath),
  ]);

  const recommendationArtifact = await resolveLatestRecommendationArtifact(root, config);
  const surfaceResult = resolvePrototypingSurface(parsed.value, recommendationArtifact);
  const effectiveMode = parsed.value.mode?.effective ?? "full-harness";

  const issues: Issue[] = [];
  issues.push(...validateSurface(surfaceResult, evidenceJsonPath));
  issues.push(...(await validateModeMetadata(parsed.value, evidenceJsonPath, config, root)));
  if (surfaceResult.surface) {
    const obligations = derivePrototypingObligations({
      surface: surfaceResult.surface,
      effectiveMode,
    });
    issues.push(
      ...validatePrototypingObligationMatrix(
        parsed.value,
        evidenceJsonPath,
        surfaceResult.surface,
        obligations,
        renderBundle,
        browserQaBundle,
      ),
    );
  }
  if (missingSpecIds.length > 0) {
    issues.push(
      issue(
        "QFAI-PROT-111",
        `Coverage Matrix が全specを網羅していません: ${missingSpecIds.join(", ")}`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.specCoverage",
        missingSpecIds,
        "change",
        "`.qfai/specs/spec-*` の全specを evidence `specs[]` に追加し、declared/checked/missing を埋めてください。",
      ),
    );
  }

  const uiMismatches: string[] = [];
  const unsupportedCoverageDeclarations: string[] = [];

  for (const specId of expectedSpecIds) {
    const row = evidenceBySpecId.get(specId);
    if (!row) {
      continue;
    }

    if (row.checked.uiOk < row.declared.uiRoutes || row.missing.uiRoutes.length > 0) {
      uiMismatches.push(
        formatMismatch(
          row.specId,
          `${row.checked.uiOk}/${row.declared.uiRoutes}`,
          row.missing.uiRoutes,
        ),
      );
    }
    if (
      row.declared.apiEndpoints > 0 ||
      row.declared.dbObjects > 0 ||
      row.checked.apiNon404 > 0 ||
      row.checked.dbPresent > 0 ||
      row.missing.apiEndpoints.length > 0 ||
      row.missing.dbObjects.length > 0
    ) {
      unsupportedCoverageDeclarations.push(row.specId);
    }
  }

  if (uiMismatches.length > 0) {
    issues.push(
      issue(
        "QFAI-PROT-112",
        `UI 到達チェックが未達です: ${uiMismatches.join("; ")}`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.uiReachability",
        extractSpecRefs(uiMismatches),
        "change",
        "Coverage Matrix の UI 列を修正し、未到達 route を解消してください。",
      ),
    );
  }

  if (unsupportedCoverageDeclarations.length > 0) {
    issues.push(
      issue(
        "QFAI-PROT-313",
        `UI-only prototyping evidence must not declare API/DB coverage: ${unsupportedCoverageDeclarations.join(", ")}`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.nonUiCoverageDeclaration",
        unsupportedCoverageDeclarations,
        "canonical",
        "prototyping の coverage は UI route のみです。specs[].declared/checked/missing の API/DB 値を 0 または空配列に修正してください。",
      ),
    );
  }

  // WS-2/WS-3: Cross-check evidence mode with discussion recommendation
  // Uses shared recommendationArtifact resolved earlier (artifact-first).
  // D-6: QFAI-PROT-235 fires whenever mode.source=discussion-recommendation
  //       but recommendation artifact cannot be resolved (no pack dir, missing file,
  //       parse error, or invalid schema).
  const artifactRec = recommendationArtifact.recommendation;

  if (parsed.value.mode?.source === "discussion-recommendation") {
    if (!artifactRec) {
      // QFAI-PROT-235: artifact resolution failed (no dir, missing file, parse error, or invalid schema)
      issues.push(
        issue(
          "QFAI-PROT-235",
          'evidence mode source is "discussion-recommendation" but recommendation artifact is missing or invalid.',
          "error",
          evidenceJsonPath,
          "prototypingEvidence.modeSourceArtifactMissing",
          [`source=${parsed.value.mode.source}`],
          "canonical",
          "discussion pack に有効な prototyping.yaml を追加するか、mode.source を修正してください。",
        ),
      );
    } else {
      const rec = artifactRec;
      // QFAI-PROT-236: requested mode is not allowed by discussion artifact
      if (
        parsed.value.mode.requested &&
        rec.allowedModes.length > 0 &&
        !rec.allowedModes.includes(parsed.value.mode.requested)
      ) {
        issues.push(
          issue(
            "QFAI-PROT-236",
            `requested mode (${parsed.value.mode.requested}) is not in discussion allowed_modes [${rec.allowedModes.join(", ")}].`,
            "warning",
            evidenceJsonPath,
            "prototypingEvidence.requestedModeNotAllowed",
            [`requested=${parsed.value.mode.requested}`, `allowed=${rec.allowedModes.join(",")}`],
            "canonical",
            "requested mode を allowed_modes 内の mode に変更するか、discussion artifact の allowed_modes を更新してください。",
          ),
        );
      }
    }
  } else if (artifactRec && parsed.value.mode) {
    // Non-discussion-recommendation source but valid artifact exists — check for advisory warnings
    const rec = artifactRec;
    const evidenceSource = parsed.value.mode.source;

    // QFAI-PROT-234: discussion recommendation exists but mode.source=default
    if (evidenceSource === "system-default") {
      issues.push(
        issue(
          "QFAI-PROT-234",
          `evidence mode source is "system-default" but discussion recommendation exists (${rec.recommendedMode}).`,
          "warning",
          evidenceJsonPath,
          "prototypingEvidence.modeSourceDefaultContradiction",
          [`source=${evidenceSource}`, `recommended=${rec.recommendedMode}`],
          "canonical",
          "discussion recommendation が存在する場合、mode.source は discussion-recommendation であるべきです。",
        ),
      );
    }

    // QFAI-PROT-236: requested mode not in allowed_modes
    if (
      parsed.value.mode.requested &&
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      rec.allowedModes &&
      rec.allowedModes.length > 0 &&
      !rec.allowedModes.includes(parsed.value.mode.requested)
    ) {
      issues.push(
        issue(
          "QFAI-PROT-236",
          `requested mode (${parsed.value.mode.requested}) is not in discussion allowed_modes [${rec.allowedModes.join(", ")}].`,
          "warning",
          evidenceJsonPath,
          "prototypingEvidence.requestedModeNotAllowed",
          [`requested=${parsed.value.mode.requested}`, `allowed=${rec.allowedModes.join(",")}`],
          "canonical",
          "requested mode を allowed_modes 内の mode に変更するか、discussion artifact の allowed_modes を更新してください。",
        ),
      );
    }
  }

  // WS-4/WS-5: Render bundle validation with cross-check
  if (renderBundle) {
    const renderIssuesFromBundle = validateRenderEvidenceBundle(renderBundle, {
      path: renderBundlePath,
      issueCode: "QFAI-PROT-244",
      rule: "prototypingEvidence.renderBundle",
    });
    issues.push(...renderIssuesFromBundle);

    // QFAI-PROT-254: render evidence bundle contradicts a non-UI prototyping surface
    if (
      surfaceResult.surface &&
      !isSupportedPrototypingSurface(surfaceResult.surface) &&
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      renderBundle.renderEvidence?.status === "captured"
    ) {
      const contradictorySurface = String(surfaceResult.surface);
      issues.push(
        issue(
          "QFAI-PROT-254",
          `render evidence bundle has captured status but surface is ${contradictorySurface}.`,
          "warning",
          renderBundlePath,
          "prototypingEvidence.renderBundleSurfaceContradiction",
          [`surface=${contradictorySurface}`],
          "canonical",
          `${contradictorySurface} surface では render evidence は不要です。surface を見直すか render bundle を削除してください。`,
        ),
      );
    }

    // WS-C: File existence check for captured render evidence entries
    if (Array.isArray(renderBundle.screens)) {
      for (const screen of renderBundle.screens) {
        if (isRecord(screen) && screen.status === "captured") {
          if (typeof screen.imagePath === "string" && screen.imagePath.trim().length > 0) {
            const imgFullPath = normalizeArtifactRefPath(root, screen.imagePath);
            try {
              await access(imgFullPath);
            } catch {
              issues.push(
                issue(
                  "QFAI-PROT-255",
                  `captured screen screenshot file does not exist: ${screen.imagePath}`,
                  "error",
                  renderBundlePath,
                  "prototypingEvidence.renderFileExistence",
                  [`imagePath=${screen.imagePath}`],
                  "canonical",
                  "captured status は実ファイルの存在を前提とします。screenshot を再生成するか、status を skipped/failed に変更してください。",
                ),
              );
            }
          }
          if (typeof screen.htmlPath === "string" && screen.htmlPath.trim().length > 0) {
            const htmlFullPath = normalizeArtifactRefPath(root, screen.htmlPath);
            try {
              await access(htmlFullPath);
            } catch {
              issues.push(
                issue(
                  "QFAI-PROT-255",
                  `captured screen HTML file does not exist: ${screen.htmlPath}`,
                  "warning",
                  renderBundlePath,
                  "prototypingEvidence.renderFileExistence",
                  [`htmlPath=${screen.htmlPath}`],
                  "canonical",
                  "captured の HTML ref が見つかりません。ファイルを再生成するか、htmlPath を削除してください。",
                ),
              );
            }
          }
        }
        // WS-C: skipped/failed without reason → error
        if (isRecord(screen) && (screen.status === "skipped" || screen.status === "failed")) {
          const hasReason =
            (screen.status === "skipped" &&
              typeof screen.skippedReason === "string" &&
              screen.skippedReason.trim().length > 0) ||
            (screen.status === "failed" &&
              typeof screen.error === "string" &&
              screen.error.trim().length > 0);
          if (!hasReason) {
            issues.push(
              issue(
                "QFAI-PROT-256",
                `screen with status=${screen.status} missing required reason/error field`,
                "error",
                renderBundlePath,
                "prototypingEvidence.renderMissingReason",
                [],
                "canonical",
                `status=${screen.status} の screen には reason/error フィールドが必須です。`,
              ),
            );
          }
        }
      }
    }
  }

  // WS-5: Browser QA bundle validation with cross-check
  if (browserQaBundle) {
    const browserQaIssuesFromBundle = validateBrowserQaBundle(browserQaBundle, {
      path: browserQaBundlePath,
      issueCode: "QFAI-PROT-174",
      rule: "prototypingEvidence.browserQaBundle",
    });
    issues.push(...browserQaIssuesFromBundle);

    // QFAI-PROT-262: browser QA completed status without usable evidence
    if (
      browserQaBundle.browserQa.executed &&
      browserQaBundle.browserQa.status === "completed" &&
      !browserQaBundle.browserQa.summary &&
      (!browserQaBundle.findings || browserQaBundle.findings.length === 0)
    ) {
      issues.push(
        issue(
          "QFAI-PROT-262",
          "browser QA completed status without usable evidence (no summary and no findings).",
          "warning",
          browserQaBundlePath,
          "prototypingEvidence.browserQaEmptyCompleted",
          undefined,
          "canonical",
          "browser QA が completed なら summary または findings を記録してください。",
        ),
      );
    }

    // QFAI-PROT-263: browser QA bundle required but missing for full-harness ui-bearing
    // (already handled by obligation matrix above — this covers executed=false case)
    if (
      surfaceResult.surface &&
      derivePrototypingObligations({ surface: surfaceResult.surface, effectiveMode })
        .requireBrowserQaBundle &&
      !browserQaBundle.browserQa.executed
    ) {
      issues.push(
        issue(
          "QFAI-PROT-263",
          "browser QA bundle exists but executed=false for full-harness ui-bearing project.",
          "error",
          browserQaBundlePath,
          "prototypingEvidence.browserQaNotExecuted",
          [`surface=${surfaceResult.surface}`, `mode=${effectiveMode}`],
          "canonical",
          "full-harness ui-bearing では browser QA を実行し、executed=true にしてください。",
        ),
      );
    }
  }

  if (parsed.value.fullHarness && parsed.value.fullHarness.scoringTrace.length === 0) {
    issues.push(
      issue(
        "QFAI-PROT-266",
        "full-harness evidence exists but scoring trace is empty.",
        "warning",
        evidenceJsonPath,
        "prototypingEvidence.calibrationScoringTraceMissing",
        undefined,
        "canonical",
        "fullHarness.scoringTrace に iteration ごとの score を追加してください。",
      ),
    );
  }

  if (surfaceResult.surface) {
    const uiFidelityIssues = await validateUiFidelity(
      root,
      config,
      evidenceJsonPath,
      parsed.value,
      surfaceResult.surface,
      derivePrototypingObligations({ surface: surfaceResult.surface, effectiveMode }),
    );
    issues.push(...uiFidelityIssues);
  }
  return issues;
}

function formatMismatch(specId: string, ratio: string, missing: string[]): string {
  if (missing.length === 0) {
    return `${specId}(${ratio})`;
  }
  return `${specId}(${ratio}; missing=${missing.join("|")})`;
}

function extractSpecRefs(rows: string[]): string[] {
  return rows
    .map((row) => {
      const match = /^spec-\d{4}/i.exec(row);
      return (match?.[0] ?? "").toLowerCase();
    })
    .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index);
}

async function readSafe(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

function resolvePrototypingSurface(
  evidence: PrototypingEvidence,
  artifact: ResolvedRecommendationArtifact,
): {
  surface?: PrototypingSurface;
  raw?: string;
  inferred: boolean;
  source?: "evidence.surface" | "recommendationArtifact";
} {
  if (isValidPrototypingSurface(evidence.surface)) {
    return {
      surface: evidence.surface,
      raw: evidence.surface,
      inferred: false,
      source: "evidence.surface",
    };
  }

  // Artifact-first: only use canonical artifact surface, never embedded recommendation surface
  const recommendationSurface =
    artifact.status === "valid" ? artifact.recommendation?.surface : undefined;
  const inferred = inferSurfaceFromRecommendationAndEvidence({
    recommendationSurface,
    hasUiFidelity: evidence.uiFidelity !== undefined,
    hasRenderBundle: evidence.renderEvidence !== undefined,
    hasBrowserQaBundle: evidence.browserQa !== undefined,
    hasUiRoutes: evidence.specs.some((spec) => spec.declared.uiRoutes > 0),
    hasRuntimeGateUi: (evidence.runtimeGate?.ui.length ?? 0) > 0,
  });
  if (inferred) {
    return {
      surface: inferred,
      ...(typeof evidence.surface === "string" ? { raw: evidence.surface } : {}),
      inferred: true,
      source: "recommendationArtifact",
    };
  }

  return {
    ...(typeof evidence.surface === "string" ? { raw: evidence.surface } : {}),
    inferred: false,
    ...(recommendationSurface ? { surface: recommendationSurface } : {}),
    ...(recommendationSurface ? { source: "recommendationArtifact" as const } : {}),
  };
}

function validateSurface(
  surfaceResult: ReturnType<typeof resolvePrototypingSurface>,
  evidenceJsonPath: string,
): Issue[] {
  if (
    surfaceResult.raw !== undefined &&
    !isValidPrototypingSurface(surfaceResult.raw) &&
    surfaceResult.raw.trim().length > 0
  ) {
    return [
      issue(
        "QFAI-PROT-171",
        `surface が不正です: ${surfaceResult.raw}`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.surface",
        [surfaceResult.raw],
        "canonical",
        `surface field must be one of: ${CANONICAL_PROTOTYPING_SURFACES.join(", ")}.`,
      ),
    ];
  }
  if (!surfaceResult.surface) {
    return [
      issue(
        "QFAI-PROT-171",
        "surface が不足しています。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.surface",
        undefined,
        "canonical",
        `surface field must be one of: ${CANONICAL_PROTOTYPING_SURFACES.join(", ")}.`,
      ),
    ];
  }
  return [];
}

// derivePrototypingObligations is now imported from prototyping/mode.ts (single source)

function validatePrototypingObligationMatrix(
  evidence: PrototypingEvidence,
  evidenceJsonPath: string,
  surface: PrototypingSurface,
  obligations: PrototypingObligations,
  renderBundle: RenderEvidenceBundle | null,
  browserQaBundle: BrowserQaBundle | null,
): Issue[] {
  const issues: Issue[] = [];
  const mismatches: string[] = [];
  const needsVisualBrowserEvidence = isSupportedPrototypingSurface(surface);

  if (!obligations.validCombination) {
    issues.push(
      issue(
        "QFAI-PROT-172",
        obligations.invalidReason ?? "invalid prototyping surface/mode combination.",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.obligationMatrix",
        [`surface=${surface}`, `mode=${evidence.mode?.effective ?? "full-harness"}`],
        "canonical",
        "packages/qfai v1.7.15 では prototyping は full-harness / UI-only のみ許可されます。",
      ),
    );
    return issues;
  }

  if (!needsVisualBrowserEvidence) {
    const nonUiSurface = String(surface);
    const contradictions: string[] = [];
    if ((evidence.runtimeGate?.ui.length ?? 0) > 0) contradictions.push("runtimeGate.ui");
    if (evidence.uiFidelity) contradictions.push("uiFidelity");
    if (renderBundle || evidence.renderEvidence) contradictions.push("renderEvidence");
    if (browserQaBundle || evidence.browserQa) contradictions.push("browserQa");
    if (contradictions.length > 0) {
      issues.push(
        issue(
          "QFAI-PROT-175",
          `surface=${nonUiSurface} に UI 専用 evidence が含まれています: ${contradictions.join(", ")}`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.nonUiContradiction",
          contradictions,
          "canonical",
          "UI を持たない surface では uiFidelity / render evidence / browser QA / runtimeGate.ui を省略してください。",
        ),
      );
    }
  }

  if (obligations.requireUiFidelity && !evidence.uiFidelity) {
    mismatches.push("uiFidelity");
    issues.push(
      issue(
        "QFAI-PROT-176",
        "packages/qfai v1.7.15 の prototyping では uiFidelity が必須です。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.uiFidelityRequiredByMode",
        [`surface=${surface}`, `mode=${evidence.mode?.effective ?? "full-harness"}`],
        "canonical",
        "uiFidelity.screens[] を追加し、UI contract 対応の evidence を記録してください。",
      ),
    );
  }

  if (obligations.requireRuntimeGate && !evidence.runtimeGate) {
    mismatches.push("runtimeGate");
    issues.push(
      issue(
        "QFAI-PROT-177",
        "packages/qfai v1.7.15 の prototyping では runtimeGate が必須です。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.runtimeGateRequiredByMode",
        [`surface=${surface}`, `mode=${evidence.mode?.effective ?? "full-harness"}`],
        "canonical",
        "runtimeGate.ui を追加して full-harness の UI route 観測結果を記録してください。",
      ),
    );
  }

  if (obligations.requireRenderBundle && !renderBundle) {
    mismatches.push("renderBundle");
    issues.push(
      issue(
        "QFAI-PROT-173",
        "required render evidence bundle がありません。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.renderBundleRequired",
        [`surface=${surface}`, `mode=${evidence.mode?.effective ?? "full-harness"}`],
        "canonical",
        "`.qfai/evidence/render.json` を追加し、captured/skipped/failed の bundle を記録してください。",
      ),
    );
  }

  if (obligations.requireBrowserQaBundle && !browserQaBundle) {
    mismatches.push("browserQaBundle");
    issues.push(
      issue(
        "QFAI-PROT-174",
        "required browser QA bundle がありません。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.browserQaBundleRequired",
        [`surface=${surface}`, `mode=${evidence.mode?.effective ?? "full-harness"}`],
        "canonical",
        "`.qfai/evidence/browser-qa.json` を追加し、browser QA summary/findings を記録してください。",
      ),
    );
  }

  if (obligations.requireFullHarness && !evidence.fullHarness) {
    mismatches.push("fullHarness");
  }

  if (mismatches.length > 0) {
    issues.unshift(
      issue(
        "QFAI-PROT-172",
        `surface/mode obligation が一致していません: ${mismatches.join(", ")}`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.obligationMatrix",
        [`surface=${surface}`, `mode=${evidence.mode?.effective ?? "full-harness"}`, ...mismatches],
        "canonical",
        "surface と mode.effective に応じた required evidence を揃えてください。",
      ),
    );
  }
  return issues;
}

function parseEvidence(
  raw: string,
): { ok: true; value: PrototypingEvidence } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { ok: false, reason: formatError(error) };
  }
  if (!isRecord(parsed)) {
    return { ok: false, reason: "top-level object is required" };
  }

  const specsNode = parsed.specs;
  if (!Array.isArray(specsNode)) {
    return { ok: false, reason: "`specs` must be an array" };
  }
  const specs: PrototypingSpecEvidence[] = [];
  for (const row of specsNode) {
    const normalized = normalizeSpecEvidence(row);
    if (!normalized.ok) {
      return { ok: false, reason: normalized.reason };
    }
    specs.push(normalized.value);
  }

  let runtimeGate: PrototypingEvidence["runtimeGate"];
  const runtimeGateNode = parsed.runtimeGate;
  if (runtimeGateNode !== undefined) {
    if (!isRecord(runtimeGateNode)) {
      return { ok: false, reason: "`runtimeGate` must be an object" };
    }
    const runtimeUiNode = runtimeGateNode.ui;
    if (!Array.isArray(runtimeUiNode)) {
      return { ok: false, reason: "`runtimeGate.ui` must be an array" };
    }
    const runtimeGateEvidenceRefs = normalizeEvidenceRefArray(runtimeGateNode.evidenceRefs);
    if (runtimeGateEvidenceRefs === null) {
      return { ok: false, reason: "`runtimeGate.evidenceRefs` must be a string array" };
    }
    const uiRows: NonNullable<PrototypingEvidence["runtimeGate"]>["ui"] = [];
    for (const row of runtimeUiNode) {
      if (!isRecord(row)) {
        return { ok: false, reason: "`runtimeGate.ui[]` must be objects" };
      }
      if (
        typeof row.screenId !== "string" ||
        row.screenId.trim().length === 0 ||
        typeof row.route !== "string" ||
        row.route.trim().length === 0 ||
        typeof row.declaredRef !== "string" ||
        row.declaredRef.trim().length === 0 ||
        typeof row.rendered !== "boolean" ||
        typeof row.browserVisited !== "boolean"
      ) {
        return {
          ok: false,
          reason:
            "`runtimeGate.ui[]` requires screenId/route/declaredRef/rendered/browserVisited with observed-only UI ledger fields",
        };
      }
      const renderEvidenceRefs = normalizeEvidenceRefArray(row.renderEvidenceRefs);
      const browserQaEvidenceRefs = normalizeEvidenceRefArray(row.browserQaEvidenceRefs);
      if (renderEvidenceRefs === null || browserQaEvidenceRefs === null) {
        return {
          ok: false,
          reason:
            "`runtimeGate.ui[]` requires string arrays for renderEvidenceRefs/browserQaEvidenceRefs",
        };
      }
      uiRows.push({
        screenId: row.screenId.trim(),
        route: row.route.trim(),
        declaredRef: row.declaredRef.trim(),
        ...(typeof row.url === "string" && row.url.trim().length > 0
          ? { url: row.url.trim() }
          : {}),
        rendered: row.rendered,
        browserVisited: row.browserVisited,
        ...(isInteger(row.httpStatus) ? { httpStatus: row.httpStatus } : {}),
        renderEvidenceRefs,
        browserQaEvidenceRefs,
      });
    }

    runtimeGate = {
      ui: uiRows,
      evidenceRefs: runtimeGateEvidenceRefs,
    };
  }

  const metaNode = parsed.meta;
  if (!isRecord(metaNode)) {
    return { ok: false, reason: "`meta` must be an object" };
  }
  if (typeof metaNode.generatedAt !== "string" || metaNode.generatedAt.trim().length === 0) {
    return { ok: false, reason: "`meta.generatedAt` is required" };
  }
  if (typeof metaNode.toolVersion !== "string" || metaNode.toolVersion.trim().length === 0) {
    return { ok: false, reason: "`meta.toolVersion` is required" };
  }
  if (
    !Array.isArray(metaNode.commands) ||
    !metaNode.commands.every((item) => typeof item === "string")
  ) {
    return { ok: false, reason: "`meta.commands` must be a string array" };
  }

  let uiFidelity: UiFidelityEvidence | undefined;
  if (parsed.uiFidelity !== undefined) {
    const normalizedUiFidelity = normalizeUiFidelity(parsed.uiFidelity);
    if (!normalizedUiFidelity.ok) {
      return { ok: false, reason: normalizedUiFidelity.reason };
    }
    uiFidelity = normalizedUiFidelity.value;
  }

  let mode: PrototypingEvidence["mode"];
  if (parsed.mode !== undefined) {
    const normalizedMode = normalizeModeBlock(parsed.mode);
    if (!normalizedMode.ok) {
      return { ok: false, reason: normalizedMode.reason };
    }
    mode = normalizedMode.value;
  }

  let fullHarness: PrototypingEvidence["fullHarness"];
  if (parsed.fullHarness !== undefined) {
    const normalizedFullHarness = normalizeFullHarnessBlock(parsed.fullHarness);
    if (!normalizedFullHarness.ok) {
      return { ok: false, reason: normalizedFullHarness.reason };
    }
    fullHarness = normalizedFullHarness.value;
  }

  let renderEvidence: PrototypingEvidence["renderEvidence"];
  if (parsed.renderEvidence !== undefined) {
    if (!isRecord(parsed.renderEvidence)) {
      return { ok: false, reason: "`renderEvidence` must be an object" };
    }
    if (
      parsed.renderEvidence.status !== "captured" &&
      parsed.renderEvidence.status !== "skipped" &&
      parsed.renderEvidence.status !== "failed"
    ) {
      return { ok: false, reason: "`renderEvidence.status` is invalid" };
    }
    if (typeof parsed.renderEvidence.requested !== "boolean") {
      return { ok: false, reason: "`renderEvidence.requested` must be boolean" };
    }
    renderEvidence = {
      status: parsed.renderEvidence.status,
      requested: parsed.renderEvidence.requested,
      ...(typeof parsed.renderEvidence.outputPath === "string"
        ? { outputPath: parsed.renderEvidence.outputPath.trim() }
        : {}),
      ...(Array.isArray(parsed.renderEvidence.viewports) &&
      parsed.renderEvidence.viewports.every((item) => typeof item === "string")
        ? { viewports: parsed.renderEvidence.viewports.map((item) => item.trim()) }
        : {}),
    };
  }

  let browserQa: PrototypingEvidence["browserQa"];
  if (parsed.browserQa !== undefined) {
    if (!isRecord(parsed.browserQa)) {
      return { ok: false, reason: "`browserQa` must be an object" };
    }
    if (typeof parsed.browserQa.executed !== "boolean") {
      return { ok: false, reason: "`browserQa.executed` must be boolean" };
    }
    if (
      parsed.browserQa.status !== "completed" &&
      parsed.browserQa.status !== "skipped" &&
      parsed.browserQa.status !== "failed"
    ) {
      return { ok: false, reason: "`browserQa.status` is invalid" };
    }
    browserQa = {
      executed: parsed.browserQa.executed,
      status: parsed.browserQa.status,
    };
  }

  return {
    ok: true,
    value: {
      specs,
      ...(typeof parsed.surface === "string" ? { surface: parsed.surface.trim() } : {}),
      ...(mode ? { mode } : {}),
      ...(fullHarness ? { fullHarness } : {}),
      ...(runtimeGate ? { runtimeGate } : {}),
      ...(renderEvidence ? { renderEvidence } : {}),
      ...(browserQa ? { browserQa } : {}),
      meta: {
        generatedAt: metaNode.generatedAt.trim(),
        toolVersion: metaNode.toolVersion.trim(),
        commands: metaNode.commands.map((item) => item.trim()),
      },
      ...(uiFidelity ? { uiFidelity } : {}),
    },
  };
}

async function validateModeMetadata(
  evidence: PrototypingEvidence,
  evidenceJsonPath: string,
  config: QfaiConfig,
  root: string,
): Promise<Issue[]> {
  const issues: Issue[] = [];

  if (!evidence.mode) {
    issues.push(
      issue(
        "QFAI-PROT-150",
        "prototyping.json に canonical mode block がありません。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.modeRequired",
        undefined,
        "canonical",
        "mode.effective / mode.source / mode.rationale を持つ mode block を追加してください。",
      ),
    );
    return issues;
  }

  if (!isValidMode(evidence.mode.effective)) {
    issues.push(
      issue(
        "QFAI-PROT-151",
        "mode.effective が不正です。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.modeEffective",
        undefined,
        "canonical",
        "mode.effective は full-harness のみ許可されます。",
      ),
    );
  }
  if (!isValidModeSource(evidence.mode.source)) {
    issues.push(
      issue(
        "QFAI-PROT-152",
        "mode.source が不正です。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.modeSource",
        undefined,
        "canonical",
        "mode.source を explicit-request|discussion-recommendation|system-default のいずれかにしてください。",
      ),
    );
  }
  if (evidence.mode.rationale.trim().length === 0) {
    issues.push(
      issue(
        "QFAI-PROT-152",
        "mode.rationale は空でない文字列が必要です。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.modeRationale",
        undefined,
        "canonical",
        "mode.rationale に mode 選択理由を記録してください。",
      ),
    );
  }

  const recommendation = evidence.mode.discussionRecommendation;
  if (recommendation) {
    if (
      !isValidMode(recommendation.recommendedMode) ||
      recommendation.rationale.trim().length === 0
    ) {
      issues.push(
        issue(
          "QFAI-PROT-153",
          "mode.discussionRecommendation の payload が不正です。",
          "error",
          evidenceJsonPath,
          "prototypingEvidence.discussionRecommendation",
          undefined,
          "canonical",
          "discussionRecommendation の recommendedMode / rationale / allowedModes を schema に合わせて修正してください。",
        ),
      );
    }
    if (
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      recommendation.allowedModes &&
      !recommendation.allowedModes.includes(recommendation.recommendedMode)
    ) {
      issues.push(
        issue(
          "QFAI-PROT-154",
          "discussionRecommendation.allowedModes は recommendedMode を含む必要があります。",
          "error",
          evidenceJsonPath,
          "prototypingEvidence.discussionRecommendationAllowedModes",
          [`recommendedMode=${recommendation.recommendedMode}`],
          "canonical",
          "discussionRecommendation.allowedModes に recommendedMode を追加してください。",
        ),
      );
    }
  }

  if (!evidence.fullHarness) {
    issues.push(
      issue(
        "QFAI-PROT-281",
        "mode.effective が full-harness の場合は fullHarness block が必要です。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessRequired",
        undefined,
        "canonical",
        "fullHarness.enabled / terminationReason / scoringTrace / reviewerSignoff を追加してください。",
      ),
    );
    return issues;
  }
  let calibrationPack: Awaited<ReturnType<typeof resolveCalibrationPack>> | undefined;
  try {
    calibrationPack = await resolveCalibrationPack({
      root,
      packPath: evidence.fullHarness.calibrationRef.packPath,
    });
  } catch (error) {
    issues.push(
      issue(
        "QFAI-PROT-265",
        `fullHarness calibration pack could not be resolved from packPath: ${evidence.fullHarness.calibrationRef.packPath}. ${formatError(error)}`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessCalibrationPackMissing",
        [evidence.fullHarness.calibrationRef.packPath],
        "canonical",
        "fullHarness.calibrationRef.packPath が指す calibration pack を修正してください。",
      ),
    );
  }
  if (calibrationPack) {
    const summaryPackPath = normalizeArtifactRefPath(
      root,
      evidence.fullHarness.calibrationRef.packPath,
    );
    const resolvedPackPath = normalizeArtifactRefPath(root, calibrationPack.packPath);
    if (summaryPackPath !== resolvedPackPath) {
      issues.push(
        issue(
          "QFAI-PROT-319",
          `fullHarness.calibrationRef.packPath (${evidence.fullHarness.calibrationRef.packPath}) does not match resolved calibration pack path (${calibrationPack.packPath}).`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessCalibrationPackPathMismatch",
          [evidence.fullHarness.calibrationRef.packPath, calibrationPack.packPath],
          "canonical",
          "fullHarness.calibrationRef.packPath は実際に解決された calibration pack と一致させてください。",
        ),
      );
    }
    if (evidence.fullHarness.calibrationRef.packVersion !== calibrationPack.pack.version) {
      issues.push(
        issue(
          "QFAI-PROT-320",
          `fullHarness.calibrationRef.packVersion (${evidence.fullHarness.calibrationRef.packVersion}) does not match resolved pack version (${calibrationPack.pack.version}).`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessCalibrationPackVersionMismatch",
          [evidence.fullHarness.calibrationRef.packVersion, calibrationPack.pack.version],
          "canonical",
          "fullHarness.calibrationRef.packVersion は calibration pack metadata の version と一致させてください。",
        ),
      );
    }
    const expectedConfigPath = normalizeArtifactRefPath(
      root,
      path.relative(root, getConfigPath(root)),
    );
    const summaryConfigPath = normalizeArtifactRefPath(
      root,
      evidence.fullHarness.calibrationRef.configPath,
    );
    if (summaryConfigPath !== expectedConfigPath) {
      issues.push(
        issue(
          "QFAI-PROT-321",
          `fullHarness.calibrationRef.configPath (${evidence.fullHarness.calibrationRef.configPath}) does not match expected config path (${path.relative(root, getConfigPath(root))}).`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessCalibrationConfigPathMismatch",
          [
            evidence.fullHarness.calibrationRef.configPath,
            path.relative(root, getConfigPath(root)),
          ],
          "canonical",
          "fullHarness.calibrationRef.configPath は実行時設定ファイルと一致させてください。",
        ),
      );
    }
  }
  if (
    evidence.fullHarness.terminationReason !== undefined &&
    !VALID_FULL_HARNESS_TERMINATION_REASONS.has(evidence.fullHarness.terminationReason)
  ) {
    issues.push(
      issue(
        "QFAI-PROT-282",
        "fullHarness.terminationReason が不正です。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessTerminationReason",
        undefined,
        "canonical",
        "terminationReason は converged|max-iterations|plateau|manual-stop のいずれかにしてください。",
      ),
    );
  }
  if (evidence.fullHarness.scoringTrace.length === 0) {
    issues.push(
      issue(
        "QFAI-PROT-283",
        "fullHarness.scoringTrace は 1 件以上必要です。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessScoringTrace",
        undefined,
        "canonical",
        "fullHarness.scoringTrace に iteration ごとの score を追加してください。",
      ),
    );
  }
  if (
    evidence.fullHarness.reviewerSignoff.reviewerId.trim().length === 0 ||
    (evidence.fullHarness.reviewerSignoff.timestamp !== undefined &&
      evidence.fullHarness.reviewerSignoff.timestamp.trim().length === 0)
  ) {
    issues.push(
      issue(
        "QFAI-PROT-264",
        "fullHarness.reviewerSignoff が不完全です。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessReviewerSignoff",
        undefined,
        "canonical",
        "reviewerSignoff に reviewer / timestamp / status を記録してください。",
      ),
    );
  }
  const isCompletedFullHarness = evidence.fullHarness.status === "completed";
  const expectedSignoffStatus =
    evidence.fullHarness.finalDecision === "pending"
      ? "pending"
      : evidence.fullHarness.finalDecision === "accepted"
        ? "approved"
        : evidence.fullHarness.finalDecision === "rejected"
          ? "rejected"
          : "abandoned";
  if (evidence.fullHarness.reviewerSignoff.status !== expectedSignoffStatus) {
    issues.push(
      issue(
        "QFAI-PROT-316",
        `reviewerSignoff.status (${evidence.fullHarness.reviewerSignoff.status}) does not match finalDecision (${evidence.fullHarness.finalDecision}).`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessReviewDecisionMismatch",
        undefined,
        "canonical",
        "reviewerSignoff.status は finalDecision と整合させてください。",
      ),
    );
  }
  if (!isCompletedFullHarness) {
    if (evidence.fullHarness.finalDecision !== "pending") {
      issues.push(
        issue(
          "QFAI-PROT-322",
          `fullHarness.status is 'in-progress' but finalDecision is ${evidence.fullHarness.finalDecision}.`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessInProgressFinalDecision",
          undefined,
          "canonical",
          "status=in-progress の場合、finalDecision は pending に固定してください。",
        ),
      );
    }
    if (evidence.fullHarness.reviewerSignoff.status !== "pending") {
      issues.push(
        issue(
          "QFAI-PROT-323",
          `fullHarness.status is 'in-progress' but reviewerSignoff.status is ${evidence.fullHarness.reviewerSignoff.status}.`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessInProgressReviewerSignoff",
          undefined,
          "canonical",
          "status=in-progress の場合、reviewerSignoff.status は pending に固定してください。",
        ),
      );
    }
    if (evidence.fullHarness.terminationReason !== undefined) {
      issues.push(
        issue(
          "QFAI-PROT-324",
          "fullHarness.status is 'in-progress' but terminationReason is present.",
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessInProgressTerminationReason",
          undefined,
          "canonical",
          "status=in-progress の場合、terminationReason は設定できません。",
        ),
      );
    }
  }
  if (isCompletedFullHarness && evidence.fullHarness.reviewerSignoff.status === "pending") {
    issues.push(
      issue(
        "QFAI-PROT-325",
        "fullHarness.status is 'completed' but reviewerSignoff.status is pending.",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessCompletedPendingReviewerSignoff",
        undefined,
        "canonical",
        "status=completed の場合、reviewerSignoff.status は approved|rejected|abandoned のいずれかにしてください。",
      ),
    );
  }
  if (
    isCompletedFullHarness &&
    (evidence.fullHarness.reviewerSignoff.timestamp === undefined ||
      evidence.fullHarness.reviewerSignoff.timestamp.trim().length === 0)
  ) {
    issues.push(
      issue(
        "QFAI-PROT-329",
        "fullHarness.status is 'completed' but reviewerSignoff.timestamp is missing.",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessCompletedMissingReviewerTimestamp",
        undefined,
        "canonical",
        "status=completed の場合、reviewerSignoff.timestamp は必須です。",
      ),
    );
  }
  const lastReviewerLog =
    evidence.fullHarness.reviewerLogs[evidence.fullHarness.reviewerLogs.length - 1];
  if (lastReviewerLog) {
    const expectedVerdict =
      evidence.fullHarness.finalDecision === "pending"
        ? "revise"
        : evidence.fullHarness.finalDecision === "accepted"
          ? "approve"
          : evidence.fullHarness.finalDecision === "rejected"
            ? "reject"
            : evidence.fullHarness.terminationReason
              ? "abandon"
              : "revise";
    if (lastReviewerLog.verdict !== expectedVerdict) {
      issues.push(
        issue(
          "QFAI-PROT-317",
          `reviewerLogs[last].verdict (${lastReviewerLog.verdict}) does not match finalDecision/termination semantics.`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessReviewerLogVerdictMismatch",
          undefined,
          "canonical",
          "最終 reviewerLogs.verdict は finalDecision / terminationReason と整合させてください。",
        ),
      );
    }
  }

  // QFAI-PROT-290: iterationCount == 1 with converged must be an error
  if (
    evidence.fullHarness.iterationCount === 1 &&
    evidence.fullHarness.terminationReason === "converged"
  ) {
    issues.push(
      issue(
        "QFAI-PROT-290",
        "fullHarness.iterationCount is 1 with terminationReason 'converged'. Full-harness is an iterative loop; single-iteration convergence is suspicious.",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessSingleIterationConverged",
        undefined,
        "canonical",
        "full-harness は反復改善ループです。1回で converged は通常ありえません。iterationCount を確認してください。",
      ),
    );
  }

  // QFAI-PROT-291: scoringTrace / iterations / iterationCount must all match
  if (
    evidence.fullHarness.scoringTrace.length !== evidence.fullHarness.iterationCount ||
    evidence.fullHarness.iterations.length !== evidence.fullHarness.iterationCount
  ) {
    issues.push(
      issue(
        "QFAI-PROT-291",
        `fullHarness count mismatch: scoringTrace=${evidence.fullHarness.scoringTrace.length}, iterations=${evidence.fullHarness.iterations.length}, iterationCount=${evidence.fullHarness.iterationCount}.`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessScoringTraceCountMismatch",
        undefined,
        "canonical",
        "scoringTrace / iterations のエントリ数と iterationCount を一致させてください。",
      ),
    );
  }

  // QFAI-PROT-292: terminationReason / iterationCount cross-check
  if (
    evidence.fullHarness.terminationReason === "max-iterations" &&
    calibrationPack &&
    evidence.fullHarness.iterationCount < calibrationPack.maxIterations
  ) {
    issues.push(
      issue(
        "QFAI-PROT-292",
        `terminationReason is 'max-iterations' but iterationCount (${evidence.fullHarness.iterationCount}) < pack maxIterations (${calibrationPack.maxIterations}).`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessTerminationReasonMismatch",
        undefined,
        "canonical",
        "terminationReason と iterationCount の整合性を確認してください。",
      ),
    );
  }

  // QFAI-PROT-293: calibration maxIterations consistency
  if (calibrationPack && evidence.fullHarness.iterationCount > calibrationPack.maxIterations) {
    issues.push(
      issue(
        "QFAI-PROT-293",
        `fullHarness.iterationCount (${evidence.fullHarness.iterationCount}) exceeds pack maxIterations (${calibrationPack.maxIterations}).`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessExceedsMaxIterations",
        undefined,
        "canonical",
        "iterationCount が maxIterations を超えています。設定を確認してください。",
      ),
    );
  }

  // QFAI-PROT-294: scoringTrace improvement progression (info)
  if (evidence.fullHarness.scoringTrace.length >= 2) {
    const scores = evidence.fullHarness.scoringTrace.map((s) => s.weightedTotal);
    const isNonProgressing = scores.every((s, i) => i === 0 || s <= (scores[i - 1] ?? s));
    if (isNonProgressing) {
      issues.push(
        issue(
          "QFAI-PROT-294",
          "fullHarness.scoringTrace shows no improvement across iterations. Scores are non-increasing.",
          "info",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessNoProgression",
          undefined,
          "canonical",
          "scoringTrace のスコアが改善していません。反復改善ループが機能しているか確認してください。",
        ),
      );
    }
  }

  // QFAI-PROT-295: Reviewer placeholder rejection
  if (
    REVIEWER_PLACEHOLDERS.includes(
      evidence.fullHarness.reviewerSignoff.reviewerId.toLowerCase().trim(),
    )
  ) {
    issues.push(
      issue(
        "QFAI-PROT-295",
        "fullHarness reviewer is a placeholder value. A real reviewer identifier is required.",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessReviewerPlaceholder",
        undefined,
        "canonical",
        "reviewerSignoff.reviewerId にプレースホルダ値は使用できません。実際のレビュアー識別子を設定してください。",
      ),
    );
  }

  // QFAI-PROT-296: weightedTotal enforcement
  for (const iter of evidence.fullHarness.iterations) {
    const expected = Math.min(iter.l1.total, iter.l2.total);
    if (Math.abs(iter.weightedTotal - expected) > 0.001) {
      issues.push(
        issue(
          "QFAI-PROT-296",
          `fullHarness iteration ${iter.iteration}: weightedTotal (${iter.weightedTotal}) does not equal min(l1.total, l2.total) (${expected}).`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessWeightedTotalMismatch",
          undefined,
          "canonical",
          "iterations[].weightedTotal は min(l1.total, l2.total) と一致する必要があります。",
        ),
      );
    }
  }

  // QFAI-PROT-297: commitSha missing
  for (const iter of evidence.fullHarness.iterations) {
    if (!iter.commitSha || iter.commitSha.trim().length === 0) {
      issues.push(
        issue(
          "QFAI-PROT-297",
          `fullHarness iteration ${iter.iteration}: commitSha is required.`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessCommitShaMissing",
          undefined,
          "canonical",
          "iterations[].commitSha は必須です。",
        ),
      );
    }
  }

  // QFAI-PROT-298: limitations missing
  if (!evidence.fullHarness.limitations) {
    issues.push(
      issue(
        "QFAI-PROT-298",
        "fullHarness.limitations is required (use empty array if none).",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessLimitationsMissing",
        undefined,
        "canonical",
        "fullHarness.limitations は必須です（該当なしの場合は空配列を設定してください）。",
      ),
    );
  }

  // QFAI-PROT-299: status=completed but terminationReason missing
  if (
    evidence.fullHarness.status === "completed" &&
    evidence.fullHarness.terminationReason === undefined
  ) {
    issues.push(
      issue(
        "QFAI-PROT-299",
        "fullHarness.status is 'completed' but terminationReason is missing.",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessCompletedNoTerminationReason",
        undefined,
        "canonical",
        "status が completed の場合は terminationReason を設定してください。",
      ),
    );
  }

  // QFAI-PROT-300: plateau with insufficient iterations
  if (
    evidence.fullHarness.terminationReason === "plateau" &&
    calibrationPack &&
    evidence.fullHarness.iterationCount < calibrationPack.plateauLookback
  ) {
    issues.push(
      issue(
        "QFAI-PROT-300",
        `terminationReason is 'plateau' but iterationCount (${evidence.fullHarness.iterationCount}) is less than plateauLookback (${calibrationPack.plateauLookback}).`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessPlateauInsufficientIterations",
        undefined,
        "canonical",
        "terminationReason が plateau の場合、iterationCount は plateauLookback 以上である必要があります。",
      ),
    );
  }

  // QFAI-PROT-301: calibrationRef has empty configPath/packPath
  if (
    evidence.fullHarness.calibrationRef.configPath.trim().length === 0 ||
    evidence.fullHarness.calibrationRef.packPath.trim().length === 0
  ) {
    issues.push(
      issue(
        "QFAI-PROT-301",
        "fullHarness.calibrationRef is missing or has empty configPath/packPath.",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessCalibrationRefMissing",
        undefined,
        "canonical",
        "fullHarness.calibrationRef に configPath / packPath を設定してください。",
      ),
    );
  }

  // QFAI-PROT-302: All iterations have identical commitSha
  if (evidence.fullHarness.iterations.length >= 2) {
    const shas = evidence.fullHarness.iterations.map((iter) => iter.commitSha);
    const allSame = shas.every((sha) => sha === shas[0]);
    if (allSame) {
      issues.push(
        issue(
          "QFAI-PROT-302",
          "All fullHarness iterations have the same commitSha. Each iteration should reflect a real code change.",
          "warning",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessIdenticalCommitSha",
          undefined,
          "canonical",
          "すべての iteration が同一の commitSha です。各 iteration は実際のコード変更を反映する必要があります。",
        ),
      );
    }
  }

  // QFAI-PROT-303: reviewerLogs summary too short
  for (const log of evidence.fullHarness.reviewerLogs) {
    if (log.summary.length < 10) {
      issues.push(
        issue(
          "QFAI-PROT-303",
          `fullHarness reviewerLog for iteration ${log.iteration} has a very short summary.`,
          "warning",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessReviewerLogShortSummary",
          undefined,
          "canonical",
          "reviewerLogs[].summary は十分な長さ（10文字以上）にしてください。",
        ),
      );
    }
  }

  // QFAI-PROT-304: reviewerLogs count must match iterationCount
  if (evidence.fullHarness.reviewerLogs.length !== evidence.fullHarness.iterationCount) {
    issues.push(
      issue(
        "QFAI-PROT-304",
        `fullHarness reviewerLogs count (${evidence.fullHarness.reviewerLogs.length}) does not match iterationCount (${evidence.fullHarness.iterationCount}).`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessReviewerLogsCountMismatch",
        undefined,
        "canonical",
        "reviewerLogs は各 iteration に対して1件ずつ存在する必要があります。",
      ),
    );
  }

  // QFAI-PROT-305: zero-seeded specCoverage detection
  // Also check top-level specs for zero-seeding
  const allSpecsZeroSeeded =
    evidence.specs.length > 0 &&
    evidence.specs.every(
      (s) => s.declared.uiRoutes === 0 && s.checked.uiOk === 0 && s.missing.uiRoutes.length === 0,
    );
  if (allSpecsZeroSeeded) {
    issues.push(
      issue(
        "QFAI-PROT-305",
        "All specs have zero-seeded coverage (all declared/checked/missing = 0/empty). Real spec coverage measurement is required.",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessZeroSeededSpecCoverage",
        undefined,
        "canonical",
        "specs[] の declared/checked/missing はゼロ初期化ではなく、実際の spec artifact から導出してください。",
      ),
    );
  }

  // QFAI-PROT-306: synthetic mockPaths auto-pass detection / banned pass status
  if (evidence.uiFidelity) {
    for (const screen of evidence.uiFidelity.screens) {
      const hasAutoPass = screen.mockPaths.some(
        (mp) => mp.status === "pass" || mp.id.endsWith("-default") || mp.id.includes("auto"),
      );
      if (hasAutoPass) {
        issues.push(
          issue(
            "QFAI-PROT-306",
            `uiFidelity screen "${screen.route}" has invalid mockPaths entries. mockPaths must be fail|finding only and derived from browser QA findings.`,
            "error",
            evidenceJsonPath,
            "prototypingEvidence.syntheticMockPathsAutoPass",
            undefined,
            "canonical",
            "mockPaths は browser QA findings から導出してください。status=pass は禁止されています。",
          ),
        );
      }
    }
  }

  // QFAI-PROT-308: converged requires iterationCount >= 2 (strengthened from PROT-290)
  if (
    evidence.fullHarness.terminationReason === "converged" &&
    evidence.fullHarness.iterationCount < 2
  ) {
    issues.push(
      issue(
        "QFAI-PROT-308",
        `converged requires iterationCount >= 2, but iterationCount is ${evidence.fullHarness.iterationCount}.`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.fullHarnessConvergedRequiresMinIterations",
        undefined,
        "canonical",
        "converged は最低2回の iteration が必要です。",
      ),
    );
  }

  // QFAI-PROT-309: reviewer placeholder in iterations
  for (const iter of evidence.fullHarness.iterations) {
    if (REVIEWER_PLACEHOLDERS.includes(iter.reviewerId.toLowerCase().trim())) {
      issues.push(
        issue(
          "QFAI-PROT-309",
          `fullHarness iteration ${iter.iteration}: reviewerId "${iter.reviewerId}" is a placeholder value.`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessIterationReviewerPlaceholder",
          undefined,
          "canonical",
          "iterations[].reviewerId にプレースホルダ値は使用できません。",
        ),
      );
    }
  }

  // v1.7.15 WS-8: New validation rules for evidence-driven strictness

  // QFAI-PROT-310: L2 evidence refs — discussion axes must have evidenceRefs
  for (const iter of evidence.fullHarness.iterations) {
    if (iter.evidenceRefs.discussion.length === 0) {
      issues.push(
        issue(
          "QFAI-PROT-310",
          `fullHarness iteration ${iter.iteration}: evidenceRefs.discussion is empty. Discussion evidence is required for L2 scoring.`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessDiscussionEvidenceRefsMissing",
          undefined,
          "canonical",
          "iterations[].evidenceRefs.discussion には discussion artifact への参照が必要です。",
        ),
      );
    }
  }

  // QFAI-PROT-311: L2 evidence refs — screen contract must have evidenceRefs
  for (const iter of evidence.fullHarness.iterations) {
    if (iter.evidenceRefs.screenContract.length === 0) {
      issues.push(
        issue(
          "QFAI-PROT-311",
          `fullHarness iteration ${iter.iteration}: evidenceRefs.screenContract is empty. Screen contract evidence is required for L2 scoring.`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessScreenContractEvidenceRefsMissing",
          undefined,
          "canonical",
          "iterations[].evidenceRefs.screenContract には screen contract への参照が必要です。",
        ),
      );
    }
  }

  // QFAI-PROT-312: L2 evidence refs — trend alignment must have evidenceRefs
  for (const iter of evidence.fullHarness.iterations) {
    if (iter.evidenceRefs.trend.length === 0) {
      issues.push(
        issue(
          "QFAI-PROT-312",
          `fullHarness iteration ${iter.iteration}: evidenceRefs.trend is empty. Trend alignment evidence is required for L2 scoring.`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessTrendEvidenceRefsMissing",
          undefined,
          "canonical",
          "iterations[].evidenceRefs.trend には trend artifact への参照が必要です。",
        ),
      );
    }
  }

  // QFAI-PROT-314: iterations evidenceRefs missing required categories
  const requiredEvidenceCategories = [
    "render",
    "browserQa",
    "runtimeGate",
    "uiObservation",
    "specCoverage",
    "discussion",
    "screenContract",
    "trend",
  ] as const;
  for (const iter of evidence.fullHarness.iterations) {
    for (const category of requiredEvidenceCategories) {
      const refs = iter.evidenceRefs[category];
      if (refs.length === 0) {
        issues.push(
          issue(
            "QFAI-PROT-314",
            `fullHarness iteration ${iter.iteration}: evidenceRefs.${category} is missing or empty. All evidence categories are required.`,
            "error",
            evidenceJsonPath,
            "prototypingEvidence.fullHarnessEvidenceRefsCategoryMissing",
            [`iteration=${iter.iteration}`, `category=${category}`],
            "canonical",
            `iterations[].evidenceRefs.${category} は必須カテゴリです。`,
          ),
        );
      }
    }
  }

  // QFAI-PROT-315: pre-scored l1/l2 detection in iterations
  for (const iter of evidence.fullHarness.iterations) {
    // Check if l1/l2 look pre-scored (axes array empty but total > 0)
    if (iter.l1.axes.length === 0 && iter.l1.total > 0) {
      issues.push(
        issue(
          "QFAI-PROT-315",
          `fullHarness iteration ${iter.iteration}: L1 panel appears pre-scored (total=${iter.l1.total} but no axes). Panels must be computed from real evidence.`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessPrescored",
          [`iteration=${iter.iteration}`, `panel=L1`],
          "canonical",
          "L1/L2 パネルは panelInputs から算出する必要があります。pre-scored 値は禁止です。",
        ),
      );
    }
    if (iter.l2.axes.length === 0 && iter.l2.total > 0) {
      issues.push(
        issue(
          "QFAI-PROT-315",
          `fullHarness iteration ${iter.iteration}: L2 panel appears pre-scored (total=${iter.l2.total} but no axes). Panels must be computed from real evidence.`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessPrescored",
          [`iteration=${iter.iteration}`, `panel=L2`],
          "canonical",
          "L1/L2 パネルは panelInputs から算出する必要があります。pre-scored 値は禁止です。",
        ),
      );
    }
  }
  if (evidence.runtimeGate) {
    if (evidence.runtimeGate.evidenceRefs.length === 0) {
      issues.push(
        issue(
          "QFAI-PROT-177",
          "runtimeGate.evidenceRefs is required and must not be empty for full-harness UI prototyping.",
          "error",
          evidenceJsonPath,
          "prototypingEvidence.runtimeGateRequiredByMode",
          ["runtimeGate.evidenceRefs"],
          "canonical",
          "runtimeGate.evidenceRefs に concrete artifact ref を追加してください。",
        ),
      );
    }
    pushConcreteArtifactRefIssues(issues, {
      evidenceJsonPath,
      refs: evidence.runtimeGate.evidenceRefs,
      required: true,
      fieldPath: "runtimeGate.evidenceRefs",
      guidance:
        "runtimeGate/specCoverage の evidenceRefs には concrete artifact ref のみを保持してください。",
    });
    for (const row of evidence.runtimeGate.ui) {
      pushConcreteArtifactRefIssues(issues, {
        evidenceJsonPath,
        refs: [row.declaredRef],
        required: true,
        fieldPath: `runtimeGate.ui[${row.screenId}].declaredRef`,
        guidance:
          "runtimeGate.ui[].declaredRef には concrete artifact ref のみを保持してください。",
      });
      if (!isCanonicalScreenContractRef(row.declaredRef)) {
        issues.push(
          issue(
            "QFAI-PROT-326",
            `runtimeGate.ui[${row.screenId}].declaredRef must use the canonical 40_screen_contracts.md#<screenId> sourceRef.`,
            "error",
            evidenceJsonPath,
            "prototypingEvidence.runtimeGateCanonicalScreenContractRef",
            [row.declaredRef],
            "canonical",
            "runtimeGate.ui[].declaredRef には readCanonicalScreenContracts() が返す canonical sourceRef を保持してください。",
          ),
        );
      }
      pushConcreteArtifactRefIssues(issues, {
        evidenceJsonPath,
        refs: row.renderEvidenceRefs,
        required: true,
        fieldPath: `runtimeGate.ui[${row.screenId}].renderEvidenceRefs`,
        guidance:
          "runtimeGate.ui[].renderEvidenceRefs[] には concrete artifact ref のみを保持してください。",
      });
      pushConcreteArtifactRefIssues(issues, {
        evidenceJsonPath,
        refs: row.browserQaEvidenceRefs,
        required: true,
        fieldPath: `runtimeGate.ui[${row.screenId}].browserQaEvidenceRefs`,
        guidance:
          "runtimeGate.ui[].browserQaEvidenceRefs[] には concrete artifact ref のみを保持してください。",
      });
    }
    const hasObservedRuntimeRoute = evidence.runtimeGate.ui.some(
      (entry) => entry.rendered || entry.browserVisited,
    );
    if (hasObservedRuntimeRoute && evidence.runtimeGate.evidenceRefs.length === 0) {
      issues.push(
        issue(
          "QFAI-PROT-177",
          "runtimeGate.ui records observed routes but runtimeGate.evidenceRefs is empty.",
          "error",
          evidenceJsonPath,
          "prototypingEvidence.runtimeGateRequiredByMode",
          ["runtimeGate.evidenceRefs"],
          "canonical",
          "observed route がある場合、runtimeGate.evidenceRefs に対応する concrete artifact ref を記録してください。",
        ),
      );
    }
  }
  const strictIterationEvidenceCategories = [
    "runtimeGate",
    "specCoverage",
    "render",
    "browserQa",
    "uiObservation",
    "discussion",
    "screenContract",
    "trend",
  ] as const;
  for (const iter of evidence.fullHarness.iterations) {
    for (const category of strictIterationEvidenceCategories) {
      pushConcreteArtifactRefIssues(issues, {
        evidenceJsonPath,
        refs: iter.evidenceRefs[category],
        required: true,
        fieldPath: `fullHarness.iterations[${iter.iteration}].evidenceRefs.${category}`,
        guidance: `fullHarness.iterations[].evidenceRefs.${category}[] には concrete artifact ref のみを保持してください。`,
      });
    }
    for (const ref of iter.evidenceRefs.screenContract) {
      if (!isCanonicalScreenContractRef(ref)) {
        issues.push(
          issue(
            "QFAI-PROT-327",
            `fullHarness.iterations[${iter.iteration}].evidenceRefs.screenContract contains a non-canonical screen contract ref: ${ref}`,
            "error",
            evidenceJsonPath,
            "prototypingEvidence.fullHarnessCanonicalScreenContractRef",
            [ref],
            "canonical",
            "iterations[].evidenceRefs.screenContract には 40_screen_contracts.md#<screenId> の canonical sourceRef のみを保持してください。",
          ),
        );
      }
    }
  }
  for (const iter of evidence.fullHarness.iterations) {
    for (const axis of iter.l1.axes) {
      pushConcreteArtifactRefIssues(issues, {
        evidenceJsonPath,
        refs: axis.evidenceRefs,
        required: true,
        fieldPath: `fullHarness.iterations[${iter.iteration}].l1.axes[${axis.axisId}].evidenceRefs`,
        guidance:
          "fullHarness.iterations[].l1.axes[].evidenceRefs[] には concrete artifact ref のみを保持してください。",
      });
    }
    for (const axis of iter.l2.axes) {
      pushConcreteArtifactRefIssues(issues, {
        evidenceJsonPath,
        refs: axis.evidenceRefs,
        required: true,
        fieldPath: `fullHarness.iterations[${iter.iteration}].l2.axes[${axis.axisId}].evidenceRefs`,
        guidance:
          "fullHarness.iterations[].l2.axes[].evidenceRefs[] には concrete artifact ref のみを保持してください。",
      });
    }
  }
  for (const log of evidence.fullHarness.reviewerLogs) {
    pushConcreteArtifactRefIssues(issues, {
      evidenceJsonPath,
      refs: log.evidenceRefs,
      required: true,
      fieldPath: `fullHarness.reviewerLogs[${log.iteration}:${log.reviewerId}].evidenceRefs`,
      guidance:
        "fullHarness.reviewerLogs[].evidenceRefs[] には concrete artifact ref のみを保持してください。",
    });
  }
  for (const spec of evidence.specs) {
    for (const coverage of spec.coverageRefs ?? []) {
      pushConcreteArtifactRefIssues(issues, {
        evidenceJsonPath,
        refs: [coverage.declaredRef],
        required: true,
        fieldPath: `specs[${spec.specId}].coverageRefs[${coverage.route}].declaredRef`,
        guidance:
          "specs[].coverageRefs[].declaredRef には concrete artifact ref のみを保持してください。",
      });
      if (!isSpecDeclarationRef(coverage.declaredRef)) {
        issues.push(
          issue(
            "QFAI-PROT-328",
            `specs[${spec.specId}].coverageRefs[${coverage.route}].declaredRef must point to a spec declaration under .qfai/specs/: ${coverage.declaredRef}`,
            "error",
            evidenceJsonPath,
            "prototypingEvidence.specCoverageDeclaredRefSemantic",
            [coverage.declaredRef],
            "canonical",
            "specs[].coverageRefs[].declaredRef には .qfai/specs/.../01_Spec.md#L<line> などの spec declaration ref のみを保持してください。",
          ),
        );
      }
      pushConcreteArtifactRefIssues(issues, {
        evidenceJsonPath,
        refs: coverage.observedRefs,
        required: true,
        fieldPath: `specs[${spec.specId}].coverageRefs[${coverage.route}].observedRefs`,
        guidance:
          "specs[].coverageRefs[].observedRefs には concrete artifact ref のみを保持してください。",
      });
    }
  }
  return issues;
}

async function validateUiFidelity(
  root: string,
  config: QfaiConfig,
  evidenceJsonPath: string,
  evidence: PrototypingEvidence,
  surface: PrototypingSurface,
  _obligations: PrototypingObligations,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const uiFidelity = evidence.uiFidelity;
  const needsVisualBrowserEvidence = isSupportedPrototypingSurface(surface);
  const effectiveMode = evidence.mode?.effective;
  const isFullHarness = effectiveMode === "full-harness";

  if (!needsVisualBrowserEvidence) {
    return issues;
  }

  if (!uiFidelity && isFullHarness) {
    issues.push(
      issue(
        "QFAI-PROT-270",
        "QFAI-PROT-270: uiFidelity is required for full-harness UI prototyping but is absent.",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.uiFidelityRequired",
        ["uiFidelity"],
        "change",
        "uiFidelity ブロックを prototyping.json に追加してください。full-harness では interactive mode が必須です。",
      ),
    );
    return issues;
  }

  if (!uiFidelity) {
    return issues;
  }

  const mode = uiFidelity.mode;

  if (mode === "skeleton") {
    issues.push(
      issue(
        "QFAI-PROT-271",
        `QFAI-PROT-271: uiFidelity.mode = "skeleton" is not allowed in ${effectiveMode} mode for UI-bearing surfaces. Use "interactive" mode.`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.uiFidelitySkeletonRejected",
        ["uiFidelity.mode"],
        "change",
        `${effectiveMode} モードでは uiFidelity.mode = "interactive" が必須です。`,
      ),
    );
    return issues;
  }

  // B-3: interactive + screens empty → error
  if (uiFidelity.screens.length === 0) {
    issues.push(
      issue(
        "QFAI-PROT-238",
        "QFAI-PROT-238: uiFidelity.screens[] is empty. Add per-route coverage mapped to contracts/ui and include expected/observed fields.",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.uiFidelityContractCoverage",
        ["uiFidelity.screens[]"],
        "change",
        "contracts/ui の route ごとに uiFidelity.screens[] を追加し、elements/actions の expected/observed を埋めてください。",
      ),
    );
    return issues;
  }

  // B-3: interactive + screen missing required fields → error
  for (const screen of uiFidelity.screens) {
    const missingFields: string[] = [];
    if (!screen.uiContractId) {
      missingFields.push("uiContractId");
    }
    if (!screen.route) {
      missingFields.push("route");
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!screen.expected) {
      missingFields.push("expected");
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!screen.observed) {
      missingFields.push("observed");
    }
    if (missingFields.length > 0) {
      issues.push(
        issue(
          "QFAI-PROT-272",
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          `QFAI-PROT-272: uiFidelity screen for route "${screen.route ?? "(missing)"}" is missing required fields: ${missingFields.join(", ")}.`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.uiFidelityScreenFields",
          missingFields.map((field) => `uiFidelity.screens[].${field}`),
          "change",
          `各 screen に uiContractId, route, expected, observed を含めてください。`,
        ),
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (screen.expected && screen.observed) {
      const actionsDeclared = screen.expected.actions;
      if (screen.observed.actionsWired > actionsDeclared) {
        issues.push(
          issue(
            "QFAI-PROT-330",
            `QFAI-PROT-330: actionsWired (${screen.observed.actionsWired}) exceeds actionsDeclared (${actionsDeclared}) for route "${screen.route}". actionsWired must not exceed expected.actions.`,
            "error",
            evidenceJsonPath,
            "prototypingEvidence.uiFidelityActionsWiredOverflow",
            [`uiFidelity.screens[].observed.actionsWired`],
            "change",
            `actionsWired は actionsDeclared (expected.actions) を超えてはいけません。observed.actionsWired を再計測してください。`,
          ),
        );
      }
    }
  }

  const contractIndex = await buildContractIndex(root, config);
  const uiContractScreens = await collectUiContractScreens(contractIndex);
  const mismatches: UiFidelityMismatch[] = [];

  for (const screen of uiFidelity.screens) {
    const contractFiles = contractIndex.idToFiles.get(screen.uiContractId);
    const contractFile = contractFiles
      ? Array.from(contractFiles).sort((left, right) => left.localeCompare(right))[0]
      : undefined;
    const contractRefFile = contractFile
      ? toPosixPath(path.relative(root, contractFile))
      : undefined;
    if (!contractFiles || contractFiles.size === 0) {
      mismatches.push({
        contractId: screen.uiContractId,
        route: screen.route,
        kind: "contract-missing",
        details: "contract not found in contracts/ui",
      });
      continue;
    }

    const contractRoutes = uiContractScreens.get(screen.uiContractId);
    const routeSummary = contractRoutes?.get(screen.route);
    if (!routeSummary) {
      mismatches.push({
        contractId: screen.uiContractId,
        route: screen.route,
        kind: "route-missing",
        details: "route not declared in the referenced UI contract",
        ...(contractRefFile ? { contractFile: contractRefFile } : {}),
        knownRoutes: Array.from(contractRoutes?.keys() ?? []).sort((a, b) => a.localeCompare(b)),
      });
      continue;
    }
    const contractElementsCount = routeSummary.elementsCount;
    const contractActionsCount = routeSummary.actionsCount;

    const elementsMissing =
      screen.expected.elements < contractElementsCount ||
      screen.observed.elementsPlaced !== screen.expected.elements;
    if (elementsMissing) {
      mismatches.push({
        contractId: screen.uiContractId,
        route: screen.route,
        kind: "elements",
        details: `elements expected=${screen.expected.elements}, observed=${screen.observed.elementsPlaced}, contract=${contractElementsCount}`,
        ...(contractRefFile ? { contractFile: contractRefFile } : {}),
        contractElementLabels: routeSummary.elementLabels,
      });
    }

    if (contractActionsCount > 0 && screen.observed.actionsWired === 0) {
      mismatches.push({
        contractId: screen.uiContractId,
        route: screen.route,
        kind: "actions",
        details: `actions observed=${screen.observed.actionsWired}, contract=${contractActionsCount}`,
        ...(contractRefFile ? { contractFile: contractRefFile } : {}),
        requiredActionIds: routeSummary.actionIds,
      });
    }
  }

  if (mismatches.length > 0) {
    const refs = collectUiFidelityMismatchRefs(mismatches);
    const summary = mismatches
      .map((entry) => formatUiFidelityMismatch(entry))
      .sort((left, right) => left.localeCompare(right));
    issues.push(
      issue(
        "QFAI-PROT-238",
        `QFAI-PROT-238: uiFidelity does not satisfy UI contract. ${summary.join("; ")}`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.uiFidelityContractCoverage",
        refs,
        "change",
        [
          "refs の contract_route (または contract_id/route) を起点に contracts/ui を開き、elements[].label が UI に表示されるよう修正してください。",
          "ラベル描画が難しい場合は data-qfai マーカーを追加して、uiFidelity の expected/observed を再計測してください。",
          "actions が不足する場合は actions[] を最低1件モック配線し、mockPaths の pass 記録を更新してください。",
        ].join("\n"),
      ),
    );
  }

  // QFAI-PROT-241: missing labels (error when expected.labels exists)
  const screensWithMissingLabels = uiFidelity.screens.filter(
    (screen) =>
      screen.expected.labels &&
      screen.expected.labels.length > 0 &&
      screen.missing?.labels &&
      screen.missing.labels.length > 0,
  );
  if (screensWithMissingLabels.length > 0) {
    const details = screensWithMissingLabels
      .map((screen) => {
        const missing = screen.missing?.labels ?? [];
        return `${screen.route}:${screen.uiContractId}(missing_labels=${missing.join("|")})`;
      })
      .sort((a, b) => a.localeCompare(b));
    const refs = collectLabelMismatchRefs(screensWithMissingLabels);
    issues.push(
      issue(
        "QFAI-PROT-241",
        `QFAI-PROT-241: uiFidelity screens have missing labels. ${details.join("; ")}`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.uiFidelityMissingLabels",
        refs,
        "change",
        [
          "contracts/ui の elements[].label を画面にすべて描画してください。",
          "描画が難しい要素は data-qfai マーカーで代替し、autogen を再実行してください。",
        ].join("\n"),
      ),
    );
  }

  // QFAI-PROT-242: missing markers (error when expected.elements > 0 and markers are present)
  // v1.4.38: autogen handles both id-based and label-based marker matching during
  // evidence generation. The validator simply checks missing.markers.
  const screensWithMissingMarkers = uiFidelity.screens.filter(
    (screen) =>
      screen.expected.elements > 0 && screen.missing?.markers && screen.missing.markers.length > 0,
  );
  if (screensWithMissingMarkers.length > 0) {
    const details = screensWithMissingMarkers
      .map((screen) => {
        const missing = screen.missing?.markers ?? [];
        return `${screen.route}:${screen.uiContractId}(missing_markers=${missing.join("|")})`;
      })
      .sort((a, b) => a.localeCompare(b));
    const refs = collectMarkerMismatchRefs(screensWithMissingMarkers);
    issues.push(
      issue(
        "QFAI-PROT-242",
        `QFAI-PROT-242: uiFidelity screens have missing markers. ${details.join("; ")}`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.uiFidelityMissingMarkers",
        refs,
        "change",
        [
          '画面の各要素に data-qfai="CONTRACT_ID:ELEMENT_ID" マーカーを追加してください。',
          'マーカーの値は contracts/ui の elements[].id を使います（例: data-qfai="CON-UI-0001:search_input"）。',
          "autogen を再実行し、missing.markers が空になることを確認してください。",
        ].join("\n"),
      ),
    );
  }

  // QFAI-PROT-243: placeholder/single-text page detection (warning)
  // Gate on found.labels being explicitly present to avoid false positives on legacy evidence
  const placeholderScreens = uiFidelity.screens.filter((screen) => {
    if (!screen.found?.labels) return false; // legacy evidence without found block — skip
    const expectedElements = screen.expected.elements;
    const observedElements = screen.observed.elementsPlaced;
    const foundLabels = screen.found.labels.length;
    // Heuristic: expected > 2 but observed <= 1 and found labels <= 1 suggests placeholder page
    return expectedElements > 2 && observedElements <= 1 && foundLabels <= 1;
  });
  if (placeholderScreens.length > 0) {
    const details = placeholderScreens
      .map(
        (screen) =>
          `${screen.route}:${screen.uiContractId}(expected=${screen.expected.elements},observed=${screen.observed.elementsPlaced})`,
      )
      .sort((a, b) => a.localeCompare(b));
    issues.push(
      issue(
        "QFAI-PROT-243",
        `QFAI-PROT-243: placeholder/single-text pages detected. ${details.join("; ")}`,
        "warning",
        evidenceJsonPath,
        "prototypingEvidence.placeholderPages",
        placeholderScreens.map((screen) => `${screen.uiContractId}|${screen.route}`),
        "change",
        "プレースホルダーページを検出しました。contracts/ui の全要素を画面に配置してください。",
      ),
    );
  }

  const hasMockPaths = uiFidelity.screens.some((screen) => screen.mockPaths.length > 0);
  if (!hasMockPaths) {
    issues.push(
      issue(
        "QFAI-PROT-237",
        "QFAI-PROT-237: interactive uiFidelity is missing observed mockPaths issue ledger entries.",
        "warning",
        evidenceJsonPath,
        "prototypingEvidence.mockPathsLedger",
        uiFidelity.screens.map((screen) => screen.route),
        "change",
        "uiFidelity.screens[].mockPaths には browser QA 観測から導出した fail|finding の issue ledger を記録してください。",
      ),
    );
  }

  const renderIssues = await validateRenderEvidenceScreens(
    root,
    config,
    evidenceJsonPath,
    uiFidelity.screens,
  );
  issues.push(...renderIssues);

  return issues;
}

async function validateRenderEvidenceScreens(
  root: string,
  config: QfaiConfig,
  evidenceJsonPath: string,
  screens: UiFidelityScreenEvidence[],
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const hasAnyRenderEvidence = screens.some((screen) => screen.renders.length > 0);
  if (!hasAnyRenderEvidence) {
    return issues;
  }

  const qualityProfile = config.uiux?.qualityProfile ?? "default";

  for (const screen of screens) {
    if (screen.renders.length === 0) {
      continue;
    }

    const viewports = new Set(screen.renders.map((render) => render.viewport));
    const missingDefaultViewports = DEFAULT_RENDER_VIEWPORTS.filter(
      (viewport) => !viewports.has(viewport),
    );
    const allSkipped = screen.renders.every((render) => render.status === "skipped");

    for (const render of screen.renders) {
      if (render.status !== "captured") {
        continue;
      }

      const invalidPaths = [
        { label: "imagePath", value: render.imagePath },
        { label: "htmlPath", value: render.htmlPath },
      ].filter((entry) => looksLikeInlineRenderPayload(entry.value));

      if (invalidPaths.length > 0) {
        issues.push(
          issue(
            "QFAI-PROT-244",
            `QFAI-PROT-244: render evidence must be path-only. route=${screen.route}, viewport=${render.viewport}, invalid=${invalidPaths.map((entry) => entry.label).join("|")}`,
            "error",
            evidenceJsonPath,
            "prototypingEvidence.renderArtifactPresence",
            [
              `route=${screen.route}`,
              `viewport=${render.viewport}`,
              ...invalidPaths.map((entry) => `artifact=${entry.label}`),
            ],
            "change",
            "imagePath/htmlPath にはファイルパスのみを保存し、data URI や HTML 本文を JSON に埋め込まないでください。",
          ),
        );
        continue;
      }

      const missingArtifacts = await collectMissingRenderArtifacts(root, render);
      if (missingArtifacts.length > 0) {
        issues.push(
          issue(
            "QFAI-PROT-244",
            `QFAI-PROT-244: captured render artifact is missing. route=${screen.route}, viewport=${render.viewport}, missing=${missingArtifacts.join("|")}`,
            "error",
            evidenceJsonPath,
            "prototypingEvidence.renderArtifactPresence",
            [
              `route=${screen.route}`,
              `viewport=${render.viewport}`,
              ...missingArtifacts.map((artifact) => `artifact=${artifact}`),
            ],
            "change",
            "render capture を再実行し、screenshot と HTML snapshot の両方が保存されることを確認してください。",
          ),
        );
      }
    }

    if (missingDefaultViewports.length === 0 && !allSkipped) {
      continue;
    }

    const severity = qualityProfile === "default" ? "warning" : "error";
    const reason = allSkipped
      ? "all renders are skipped"
      : `missing default viewports=${missingDefaultViewports.join("|")}`;
    issues.push(
      issue(
        "QFAI-PROT-245",
        `QFAI-PROT-245: render coverage is incomplete for ${screen.route}. ${reason}. qualityProfile=${qualityProfile}`,
        severity,
        evidenceJsonPath,
        "prototypingEvidence.renderCoverage",
        [
          `route=${screen.route}`,
          ...missingDefaultViewports.map((viewport) => `viewport=${viewport}`),
          `qualityProfile=${qualityProfile}`,
        ],
        "change",
        allSkipped
          ? "少なくとも desktop/mobile のいずれかで captured または failed の明示的な render outcome を残してください。"
          : "desktop/mobile の default viewport を揃えるか、profile 設定と scope を見直してください。",
      ),
    );
  }

  return issues;
}

function formatUiFidelityMismatch(mismatch: UiFidelityMismatch): string {
  const base = `${mismatch.route}:${mismatch.contractId}`;
  if (mismatch.kind === "contract-missing") {
    return `${base}(contract-missing)`;
  }
  if (mismatch.kind === "route-missing") {
    const known = mismatch.knownRoutes?.join("|") ?? "";
    return known.length > 0 ? `${base}(route-missing known=${known})` : `${base}(route-missing)`;
  }
  if (mismatch.kind === "elements") {
    return `${base}(${mismatch.details})`;
  }
  // mismatch.kind === "actions" at this point
  return `${base}(${mismatch.details})`;
}

function collectUiFidelityMismatchRefs(mismatches: UiFidelityMismatch[]): string[] {
  const refs = new Set<string>();
  for (const mismatch of mismatches) {
    const contractRoute = `${mismatch.contractId}|${mismatch.route}`;
    refs.add(`contract_id=${mismatch.contractId}`);
    refs.add(`route=${mismatch.route}`);
    refs.add(`contract_route=${contractRoute}`);
    if (mismatch.contractFile) {
      refs.add(`contract_file=${mismatch.contractFile}`);
      refs.add(`contract_file_by_contract_route=${contractRoute}:${mismatch.contractFile}`);
    }
    if (mismatch.contractElementLabels && mismatch.contractElementLabels.length > 0) {
      const labels = mismatch.contractElementLabels.join("|");
      refs.add(`contract_element_labels=${labels}`);
      refs.add(`contract_element_labels_by_contract_route=${contractRoute}:${labels}`);
      // alias: downstream consumers parse missing_labels.
      refs.add(`missing_labels=${labels}`);
      refs.add(`missing_labels_by_contract_route=${contractRoute}:${labels}`);
    }
    if (mismatch.requiredActionIds && mismatch.requiredActionIds.length > 0) {
      refs.add(`required_actions=${mismatch.requiredActionIds.join("|")}`);
      refs.add(
        `required_actions_by_contract_route=${contractRoute}:${mismatch.requiredActionIds.join("|")}`,
      );
    }
  }
  return Array.from(refs).sort((left, right) => left.localeCompare(right));
}

function collectLabelMismatchRefs(screens: UiFidelityScreenEvidence[]): string[] {
  const refs = new Set<string>();
  for (const screen of screens) {
    refs.add(`contract_id=${screen.uiContractId}`);
    refs.add(`route=${screen.route}`);
    refs.add(`contract_route=${screen.uiContractId}|${screen.route}`);
    const missingLabels = screen.missing?.labels ?? [];
    if (missingLabels.length > 0) {
      const labels = missingLabels.sort((a, b) => a.localeCompare(b)).join("|");
      refs.add(`missing_labels=${labels}`);
      refs.add(`missing_labels_by_contract_route=${screen.uiContractId}|${screen.route}:${labels}`);
    }
  }
  return Array.from(refs).sort((l, r) => l.localeCompare(r));
}

function collectMarkerMismatchRefs(screens: UiFidelityScreenEvidence[]): string[] {
  const refs = new Set<string>();
  for (const screen of screens) {
    refs.add(`contract_id=${screen.uiContractId}`);
    refs.add(`route=${screen.route}`);
    refs.add(`contract_route=${screen.uiContractId}|${screen.route}`);
    const missingMarkers = screen.missing?.markers ?? [];
    if (missingMarkers.length > 0) {
      const markers = missingMarkers.sort((a, b) => a.localeCompare(b)).join("|");
      refs.add(`missing_markers=${markers}`);
      refs.add(
        `missing_markers_by_contract_route=${screen.uiContractId}|${screen.route}:${markers}`,
      );
    }
  }
  return Array.from(refs).sort((l, r) => l.localeCompare(r));
}

async function collectUiContractScreens(
  contractIndex: Awaited<ReturnType<typeof buildContractIndex>>,
): Promise<Map<string, Map<string, UiContractScreenSummary>>> {
  const result = new Map<string, Map<string, UiContractScreenSummary>>();

  for (const [contractId, fileSet] of contractIndex.idToFiles.entries()) {
    if (!contractId.startsWith("CON-UI-")) {
      continue;
    }
    const filePath = Array.from(fileSet).sort((left, right) => left.localeCompare(right))[0];
    if (!filePath) {
      continue;
    }

    const raw = await readSafe(filePath);
    if (raw === null) {
      continue;
    }
    try {
      const doc = parseStructuredContract(filePath, stripContractDeclarationLines(raw));
      result.set(contractId, extractUiContractScreenSummary(doc));
    } catch {
      // parse errors are handled by contracts validator; skip detailed checks here.
    }
  }

  return result;
}

function extractUiContractScreenSummary(doc: unknown): Map<string, UiContractScreenSummary> {
  const summary = new Map<string, UiContractScreenSummary>();
  if (!isRecord(doc) || !Array.isArray(doc.screens)) {
    return summary;
  }

  for (const screen of doc.screens) {
    if (!isRecord(screen)) {
      continue;
    }
    const route = typeof screen.route === "string" ? screen.route.trim() : "";
    if (route.length === 0) {
      continue;
    }
    summary.set(route, {
      elementsCount: countContractItems(screen.elements),
      actionsCount: countContractItems(screen.actions),
      elementLabels: extractContractLabels(screen.elements),
      actionIds: extractContractIds(screen.actions),
    });
  }

  return summary;
}

function countContractItems(value: unknown): number {
  if (!Array.isArray(value)) {
    return 0;
  }
  return value.filter(
    (item) => isRecord(item) && typeof item.id === "string" && item.id.trim().length > 0,
  ).length;
}

function extractContractLabels(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const labels = value
    .filter((item) => isRecord(item))
    .map((item) => (typeof item.label === "string" ? item.label.trim() : ""))
    .filter((item) => item.length > 0);
  return Array.from(new Set(labels)).sort((left, right) => left.localeCompare(right));
}

function extractContractIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids = value
    .filter((item) => isRecord(item))
    .map((item) => (typeof item.id === "string" ? item.id.trim() : ""))
    .filter((item) => item.length > 0);
  return Array.from(new Set(ids)).sort((left, right) => left.localeCompare(right));
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

function normalizeUiFidelity(
  value: unknown,
): { ok: true; value: UiFidelityEvidence } | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return { ok: false, reason: "`uiFidelity` must be an object" };
  }

  const modeResult = normalizeUiFidelityMode(value.mode);
  if (!modeResult.ok) {
    return modeResult;
  }

  if (!Array.isArray(value.screens)) {
    return { ok: false, reason: "`uiFidelity.screens` must be an array" };
  }
  const screens: UiFidelityScreenEvidence[] = [];
  for (const entry of value.screens) {
    const normalized = normalizeUiFidelityScreen(entry);
    if (!normalized.ok) {
      return normalized;
    }
    screens.push(normalized.value);
  }

  return {
    ok: true,
    value: {
      mode: modeResult.value,
      screens,
    },
  };
}

function normalizeUiFidelityMode(
  value: unknown,
): { ok: true; value: UiFidelityMode } | { ok: false; reason: string } {
  if (value === undefined) {
    return { ok: true, value: "interactive" };
  }
  if (typeof value !== "string") {
    return { ok: false, reason: "`uiFidelity.mode` must be a string" };
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "interactive" || normalized === "skeleton") {
    return { ok: true, value: normalized };
  }
  return {
    ok: false,
    reason: "`uiFidelity.mode` must be either interactive or skeleton",
  };
}

function normalizeUiFidelityScreen(
  value: unknown,
): { ok: true; value: UiFidelityScreenEvidence } | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return { ok: false, reason: "`uiFidelity.screens[]` must be objects" };
  }

  if (typeof value.route !== "string" || value.route.trim().length === 0) {
    return { ok: false, reason: "`uiFidelity.screens[].route` is required" };
  }
  if (typeof value.uiContractId !== "string" || value.uiContractId.trim().length === 0) {
    return {
      ok: false,
      reason: "`uiFidelity.screens[].uiContractId` is required",
    };
  }

  const expected = normalizeUiFidelityExpected(value.expected);
  if (!expected.ok) {
    return expected;
  }
  const observed = normalizeUiFidelityObserved(value.observed);
  if (!observed.ok) {
    return observed;
  }
  const mockPaths = normalizeUiFidelityMockPaths(value.mockPaths);
  if (!mockPaths.ok) {
    return mockPaths;
  }
  const renders = normalizeRenderEntries(value.renders);
  if (!renders.ok) {
    return renders;
  }

  return {
    ok: true,
    value: {
      route: value.route.trim(),
      uiContractId: value.uiContractId.trim().toUpperCase(),
      expected: expected.value,
      ...normalizeOptionalFoundBlock(value.found),
      ...normalizeOptionalMissingBlock(value.missing),
      ...(typeof value.coverage === "number" ? { coverage: value.coverage } : {}),
      observed: observed.value,
      mockPaths: mockPaths.value,
      renders: renders.value,
    },
  };
}

function normalizeRenderEntries(
  value: unknown,
): { ok: true; value: RenderEvidenceEntry[] } | { ok: false; reason: string } {
  if (value === undefined) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(value)) {
    return { ok: false, reason: "`uiFidelity.screens[].renders` must be an array" };
  }

  const renders: RenderEvidenceEntry[] = [];
  for (const entry of value) {
    const normalized = normalizeRenderEntry(entry);
    if (!normalized.ok) {
      return normalized;
    }
    renders.push(normalized.value);
  }

  return { ok: true, value: renders };
}

function normalizeRenderEntry(
  value: unknown,
): { ok: true; value: RenderEvidenceEntry } | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return { ok: false, reason: "`uiFidelity.screens[].renders[]` must be objects" };
  }
  if (typeof value.viewport !== "string" || value.viewport.trim().length === 0) {
    return { ok: false, reason: "`uiFidelity.screens[].renders[].viewport` is required" };
  }
  if (
    !isNonNegativeInteger(value.width) ||
    !isNonNegativeInteger(value.height) ||
    value.width === 0 ||
    value.height === 0
  ) {
    return {
      ok: false,
      reason: "`uiFidelity.screens[].renders[]` requires positive integers for width/height",
    };
  }
  const viewport = value.viewport.trim();
  const width = value.width;
  const height = value.height;
  const status = typeof value.status === "string" ? value.status.trim().toLowerCase() : "";
  if (status === "captured") {
    if (
      typeof value.imagePath !== "string" ||
      value.imagePath.trim().length === 0 ||
      typeof value.htmlPath !== "string" ||
      value.htmlPath.trim().length === 0
    ) {
      return {
        ok: false,
        reason: "`captured` render entries require imagePath and htmlPath",
      };
    }
    return {
      ok: true,
      value: {
        viewport,
        status: "captured",
        width,
        height,
        imagePath: value.imagePath.trim(),
        htmlPath: value.htmlPath.trim(),
      },
    };
  }
  if (status === "skipped") {
    if (typeof value.skippedReason !== "string" || value.skippedReason.trim().length === 0) {
      return {
        ok: false,
        reason: "`skipped` render entries require skippedReason",
      };
    }
    return {
      ok: true,
      value: {
        viewport,
        status: "skipped",
        width,
        height,
        skippedReason: value.skippedReason.trim(),
      },
    };
  }
  if (status === "failed") {
    if (typeof value.error !== "string" || value.error.trim().length === 0) {
      return {
        ok: false,
        reason: "`failed` render entries require error",
      };
    }
    return {
      ok: true,
      value: {
        viewport,
        status: "failed",
        width,
        height,
        error: value.error.trim(),
      },
    };
  }
  return {
    ok: false,
    reason: "`uiFidelity.screens[].renders[].status` must be captured|skipped|failed",
  };
}

function normalizeUiFidelityExpected(value: unknown):
  | {
      ok: true;
      value: {
        elements: number;
        actions: number;
        labels?: string[];
        ids?: string[];
      };
    }
  | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return {
      ok: false,
      reason: "`uiFidelity.screens[].expected` must be an object",
    };
  }
  if (!isNonNegativeInteger(value.elements) || !isNonNegativeInteger(value.actions)) {
    return {
      ok: false,
      reason: "`uiFidelity.screens[].expected` requires non-negative integers for elements/actions",
    };
  }
  const labels = toOptionalStringArray(value.labels);
  const ids = toOptionalStringArray(value.ids);
  return {
    ok: true,
    value: {
      elements: value.elements,
      actions: value.actions,
      ...(labels ? { labels } : {}),
      ...(ids ? { ids } : {}),
    },
  };
}

function normalizeUiFidelityObserved(
  value: unknown,
):
  | { ok: true; value: { elementsPlaced: number; actionsWired: number } }
  | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return {
      ok: false,
      reason: "`uiFidelity.screens[].observed` must be an object",
    };
  }
  if (!isNonNegativeInteger(value.elementsPlaced) || !isNonNegativeInteger(value.actionsWired)) {
    return {
      ok: false,
      reason:
        "`uiFidelity.screens[].observed` requires non-negative integers for elementsPlaced/actionsWired",
    };
  }
  return {
    ok: true,
    value: {
      elementsPlaced: value.elementsPlaced,
      actionsWired: value.actionsWired,
    },
  };
}

function normalizeUiFidelityMockPaths(
  value: unknown,
): { ok: true; value: UiFidelityMockPathEvidence[] } | { ok: false; reason: string } {
  if (value === undefined) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(value)) {
    return {
      ok: false,
      reason: "`uiFidelity.screens[].mockPaths` must be an array",
    };
  }
  const mockPaths: UiFidelityMockPathEvidence[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      return {
        ok: false,
        reason: "`uiFidelity.screens[].mockPaths[]` must be objects",
      };
    }
    if (typeof entry.status !== "string" || entry.status.trim().length === 0) {
      return {
        ok: false,
        reason: "`uiFidelity.screens[].mockPaths[].status` is required as string",
      };
    }
    const normalizedStatus = entry.status.trim().toLowerCase();
    if (normalizedStatus !== "fail" && normalizedStatus !== "finding") {
      return {
        ok: false,
        reason: "`uiFidelity.screens[].mockPaths[].status` must be fail|finding",
      };
    }
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    mockPaths.push({
      id,
      status: normalizedStatus,
    });
  }
  return { ok: true, value: mockPaths };
}

function normalizeSpecEvidence(
  value: unknown,
): { ok: true; value: PrototypingSpecEvidence } | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return { ok: false, reason: "`specs[]` must be objects" };
  }
  if (typeof value.specId !== "string" || value.specId.trim().length === 0) {
    return { ok: false, reason: "`specs[].specId` is required" };
  }
  const declared = normalizeCountBlock(value.declared, "declared");
  if (!declared.ok) {
    return declared;
  }
  const checked = normalizeCheckedBlock(value.checked);
  if (!checked.ok) {
    return checked;
  }
  const missing = normalizeMissingBlock(value.missing);
  if (!missing.ok) {
    return missing;
  }
  let coverageRefs: PrototypingSpecEvidence["coverageRefs"];
  if (value.coverageRefs !== undefined) {
    if (!Array.isArray(value.coverageRefs)) {
      return { ok: false, reason: "`specs[].coverageRefs` must be an array when present" };
    }
    coverageRefs = [];
    for (const row of value.coverageRefs) {
      if (
        !isRecord(row) ||
        typeof row.route !== "string" ||
        row.route.trim().length === 0 ||
        typeof row.declaredRef !== "string" ||
        row.declaredRef.trim().length === 0
      ) {
        return { ok: false, reason: "`specs[].coverageRefs[]` is invalid" };
      }
      const observedRefs = normalizeEvidenceRefArray(row.observedRefs);
      if (observedRefs === null) {
        return {
          ok: false,
          reason: "`specs[].coverageRefs[].observedRefs` must be a string array",
        };
      }
      coverageRefs.push({
        route: row.route.trim(),
        declaredRef: row.declaredRef.trim(),
        observedRefs,
      });
    }
  }
  return {
    ok: true,
    value: {
      specId: value.specId.trim().toLowerCase(),
      declared: declared.value,
      checked: checked.value,
      missing: missing.value,
      ...(coverageRefs ? { coverageRefs } : {}),
    },
  };
}

const VALID_PROTOTYPING_MODES = new Set<PrototypingMode>(["full-harness"]);
const VALID_PROTOTYPING_SURFACES = new Set(CANONICAL_PROTOTYPING_SURFACES);
const VALID_MODE_SOURCES = new Set<ModeSelectionSource>([
  "explicit-request",
  "discussion-recommendation",
  "system-default",
]);
const VALID_FULL_HARNESS_TERMINATION_REASONS = new Set([
  "converged",
  "max-iterations",
  "plateau",
  "manual-stop",
]);

function normalizeModeBlock(
  value: unknown,
): { ok: true; value: NonNullable<PrototypingEvidence["mode"]> } | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return { ok: false, reason: "`mode` must be an object" };
  }
  if (!isValidMode(value.effective)) {
    return { ok: false, reason: "`mode.effective` must be a valid prototyping mode" };
  }
  if (!isValidModeSource(value.source)) {
    return { ok: false, reason: "`mode.source` must be a valid mode source" };
  }
  if (typeof value.rationale !== "string") {
    return { ok: false, reason: "`mode.rationale` must be a string" };
  }
  const result: NonNullable<PrototypingEvidence["mode"]> = {
    effective: value.effective,
    source: value.source,
    rationale: value.rationale.trim(),
  };

  if (
    value.requested !== undefined &&
    (typeof value.requested !== "string" || value.requested !== "full-harness")
  ) {
    return { ok: false, reason: "`mode.requested` must be full-harness when present" };
  }
  if (isValidMode(value.requested)) {
    result.requested = value.requested;
  }
  if (value.discussionRecommendation !== undefined) {
    const normalized = normalizeDiscussionRecommendation(value.discussionRecommendation);
    if (!normalized.ok) {
      return normalized;
    }
    result.discussionRecommendation = normalized.value;
  }

  return { ok: true, value: result };
}

function normalizeDiscussionRecommendation(
  value: unknown,
): { ok: true; value: DiscussionModeRecommendation } | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return { ok: false, reason: "`mode.discussionRecommendation` must be an object" };
  }
  if (!isValidMode(value.recommendedMode)) {
    return { ok: false, reason: "`mode.discussionRecommendation.recommendedMode` is invalid" };
  }
  if (typeof value.rationale !== "string") {
    return { ok: false, reason: "`mode.discussionRecommendation.rationale` must be a string" };
  }

  const allowedModes =
    Array.isArray(value.allowedModes) &&
    value.allowedModes.every((item) => typeof item === "string" && isValidMode(item))
      ? Array.from(new Set(value.allowedModes))
      : [value.recommendedMode];

  const surface =
    typeof value.surface === "string" &&
    VALID_PROTOTYPING_SURFACES.has(value.surface as PrototypingSurface)
      ? (value.surface as PrototypingSurface)
      : undefined;

  if (!surface) {
    return { ok: false, reason: "`mode.discussionRecommendation.surface` is invalid" };
  }

  return {
    ok: true,
    value: {
      recommendedMode: value.recommendedMode,
      rationale: value.rationale.trim(),
      allowedModes,
      surface,
    },
  };
}

function normalizeFullHarnessBlock(
  value: unknown,
):
  | { ok: true; value: NonNullable<PrototypingEvidence["fullHarness"]> }
  | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return { ok: false, reason: "`fullHarness` must be an object" };
  }
  if (value.enabled !== true) {
    return { ok: false, reason: "`fullHarness.enabled` must be true" };
  }
  if (typeof value.runId !== "string" || value.runId.trim().length === 0) {
    return { ok: false, reason: "`fullHarness.runId` is required" };
  }

  // calibrationRef validation
  if (!isRecord(value.calibrationRef)) {
    return { ok: false, reason: "`fullHarness.calibrationRef` must be an object" };
  }
  if (
    typeof value.calibrationRef.configPath !== "string" ||
    typeof value.calibrationRef.packPath !== "string" ||
    typeof value.calibrationRef.packVersion !== "string"
  ) {
    return {
      ok: false,
      reason: "`fullHarness.calibrationRef` requires configPath, packPath, packVersion strings",
    };
  }

  if (!isPositiveInteger(value.iterationCount) || !isPositiveInteger(value.bestIteration)) {
    return {
      ok: false,
      reason: "`fullHarness.iterationCount` and `bestIteration` must be integers >= 1",
    };
  }

  // status validation
  if (value.status !== "in-progress" && value.status !== "completed") {
    return { ok: false, reason: "`fullHarness.status` must be 'in-progress' or 'completed'" };
  }

  // terminationReason is optional; validate only when present
  if (
    value.terminationReason !== undefined &&
    (typeof value.terminationReason !== "string" ||
      !VALID_FULL_HARNESS_TERMINATION_REASONS.has(value.terminationReason))
  ) {
    return { ok: false, reason: "`fullHarness.terminationReason` is invalid" };
  }

  // reviewerSignoff validation
  if (!isRecord(value.reviewerSignoff)) {
    return { ok: false, reason: "`fullHarness.reviewerSignoff` must be an object" };
  }
  if (
    (value.reviewerSignoff.status !== "pending" &&
      value.reviewerSignoff.status !== "approved" &&
      value.reviewerSignoff.status !== "rejected" &&
      value.reviewerSignoff.status !== "abandoned") ||
    typeof value.reviewerSignoff.reviewerId !== "string" ||
    (value.reviewerSignoff.timestamp !== undefined &&
      typeof value.reviewerSignoff.timestamp !== "string")
  ) {
    return { ok: false, reason: "`fullHarness.reviewerSignoff` is invalid" };
  }
  if (
    value.finalDecision !== "pending" &&
    value.finalDecision !== "accepted" &&
    value.finalDecision !== "rejected" &&
    value.finalDecision !== "abandoned"
  ) {
    return { ok: false, reason: "`fullHarness.finalDecision` is invalid" };
  }
  const reviewerSource =
    typeof value.reviewerSignoff.source === "string" ? value.reviewerSignoff.source.trim() : "cli";

  // reviewerLogs validation
  if (!Array.isArray(value.reviewerLogs)) {
    return { ok: false, reason: "`fullHarness.reviewerLogs` must be an array" };
  }
  const reviewerLogs: NonNullable<PrototypingEvidence["fullHarness"]>["reviewerLogs"] = [];
  for (const log of value.reviewerLogs) {
    if (
      !isRecord(log) ||
      !isPositiveInteger(log.iteration) ||
      typeof log.reviewerId !== "string" ||
      typeof log.summary !== "string" ||
      !Array.isArray(log.evidenceRefs)
    ) {
      return { ok: false, reason: "`fullHarness.reviewerLogs[]` is invalid" };
    }
    if (
      log.verdict !== "approve" &&
      log.verdict !== "revise" &&
      log.verdict !== "reject" &&
      log.verdict !== "abandon"
    ) {
      return {
        ok: false,
        reason: "`fullHarness.reviewerLogs[].verdict` must be approve|revise|reject|abandon",
      };
    }
    reviewerLogs.push({
      iteration: log.iteration,
      reviewerId: log.reviewerId.trim(),
      verdict: log.verdict,
      summary: log.summary.trim(),
      evidenceRefs: normalizeEvidenceRefArray(log.evidenceRefs) ?? [],
    });
  }

  // iterations validation
  if (!Array.isArray(value.iterations)) {
    return { ok: false, reason: "`fullHarness.iterations` must be an array" };
  }
  const iterations: NonNullable<PrototypingEvidence["fullHarness"]>["iterations"] = [];
  for (const iter of value.iterations) {
    if (
      !isRecord(iter) ||
      !isPositiveInteger(iter.iteration) ||
      typeof iter.commitSha !== "string" ||
      typeof iter.reviewerId !== "string" ||
      typeof iter.timestamp !== "string" ||
      !Array.isArray(iter.changeSummary) ||
      !Array.isArray(iter.limitations) ||
      !isRecord(iter.l1) ||
      !isRecord(iter.l2) ||
      typeof iter.weightedTotal !== "number" ||
      !Number.isFinite(iter.weightedTotal) ||
      typeof iter.decision !== "string"
    ) {
      return { ok: false, reason: "`fullHarness.iterations[]` is invalid" };
    }
    if (
      iter.l1.panel !== "L1" ||
      typeof iter.l1.total !== "number" ||
      iter.l2.panel !== "L2" ||
      typeof iter.l2.total !== "number"
    ) {
      return { ok: false, reason: "`fullHarness.iterations[].l1/l2` is invalid" };
    }
    if (
      iter.deltaFromPrevious !== null &&
      (typeof iter.deltaFromPrevious !== "number" || !Number.isFinite(iter.deltaFromPrevious))
    ) {
      return {
        ok: false,
        reason: "`fullHarness.iterations[].deltaFromPrevious` must be number or null",
      };
    }
    if (!isRecord(iter.evidenceRefs)) {
      return { ok: false, reason: "`fullHarness.iterations[].evidenceRefs` is required" };
    }
    const er = iter.evidenceRefs;
    const evidenceCategories = [
      "render",
      "browserQa",
      "runtimeGate",
      "uiObservation",
      "specCoverage",
      "discussion",
      "screenContract",
      "trend",
    ] as const;
    const parsedEvidenceRefs = {} as NonNullable<
      PrototypingEvidence["fullHarness"]
    >["iterations"][0]["evidenceRefs"];
    for (const category of evidenceCategories) {
      const refs = normalizeEvidenceRefArray(er[category]);
      if (refs === null) {
        return {
          ok: false,
          reason: `\`fullHarness.iterations[].evidenceRefs.${category}\` must be a string array`,
        };
      }
      parsedEvidenceRefs[category] = refs;
    }

    // v1.7.15: parse l1/l2 axes
    const l1Axes = normalizeHarnessAxes(iter.l1.axes);
    if (!l1Axes.ok) {
      return { ok: false, reason: l1Axes.reason };
    }
    const l2Axes = normalizeHarnessAxes(iter.l2.axes);
    if (!l2Axes.ok) {
      return { ok: false, reason: l2Axes.reason };
    }

    iterations.push({
      iteration: iter.iteration,
      commitSha: iter.commitSha.trim(),
      reviewerId: iter.reviewerId.trim(),
      timestamp: iter.timestamp.trim(),
      changeSummary: (iter.changeSummary as unknown[]).map((s) => String(s).trim()),
      limitations: (iter.limitations as unknown[]).map((s) => String(s).trim()),
      evidenceRefs: parsedEvidenceRefs,
      l1: { panel: "L1" as const, total: iter.l1.total, axes: l1Axes.value },
      l2: { panel: "L2" as const, total: iter.l2.total, axes: l2Axes.value },
      weightedTotal: iter.weightedTotal,
      deltaFromPrevious: iter.deltaFromPrevious,
      decision: iter.decision.trim(),
    });
  }

  // scoringTrace validation
  if (!Array.isArray(value.scoringTrace)) {
    return { ok: false, reason: "`fullHarness.scoringTrace` must be an array" };
  }
  const scoringTrace: NonNullable<PrototypingEvidence["fullHarness"]>["scoringTrace"] = [];
  for (const row of value.scoringTrace) {
    if (
      !isRecord(row) ||
      !isPositiveInteger(row.iteration) ||
      typeof row.l1Total !== "number" ||
      !Number.isFinite(row.l1Total) ||
      typeof row.l2Total !== "number" ||
      !Number.isFinite(row.l2Total) ||
      typeof row.weightedTotal !== "number" ||
      !Number.isFinite(row.weightedTotal) ||
      typeof row.decision !== "string" ||
      row.decision.trim().length === 0 ||
      typeof row.commitSha !== "string"
    ) {
      return { ok: false, reason: "`fullHarness.scoringTrace[]` is invalid" };
    }
    if (
      row.deltaFromPrevious !== null &&
      (typeof row.deltaFromPrevious !== "number" || !Number.isFinite(row.deltaFromPrevious))
    ) {
      return {
        ok: false,
        reason: "`fullHarness.scoringTrace[].deltaFromPrevious` must be number or null",
      };
    }
    scoringTrace.push({
      iteration: row.iteration,
      l1Total: row.l1Total,
      l2Total: row.l2Total,
      weightedTotal: row.weightedTotal,
      deltaFromPrevious: row.deltaFromPrevious,
      decision: row.decision.trim(),
      commitSha: row.commitSha.trim(),
    });
  }

  // limitations validation (lenient: undefined when missing, PROT-298 catches it)
  const limitations = Array.isArray(value.limitations)
    ? (value.limitations as unknown[]).map((s) => String(s).trim())
    : undefined;

  return {
    ok: true,
    value: {
      enabled: true,
      runId: value.runId.trim(),
      calibrationRef: {
        configPath: value.calibrationRef.configPath.trim(),
        packPath: value.calibrationRef.packPath.trim(),
        packVersion: value.calibrationRef.packVersion.trim(),
      },
      iterationCount: value.iterationCount,
      bestIteration: value.bestIteration,
      status: value.status,
      ...(value.terminationReason !== undefined
        ? {
            terminationReason: value.terminationReason as
              | "converged"
              | "max-iterations"
              | "plateau"
              | "manual-stop",
          }
        : {}),
      finalDecision: value.finalDecision,
      reviewerSignoff: {
        reviewerId: value.reviewerSignoff.reviewerId.trim(),
        status: value.reviewerSignoff.status,
        ...(typeof value.reviewerSignoff.timestamp === "string"
          ? { timestamp: value.reviewerSignoff.timestamp.trim() }
          : {}),
        source: reviewerSource,
      },
      reviewerLogs,
      iterations,
      scoringTrace,
      ...(limitations !== undefined ? { limitations } : {}),
    },
  };
}

function normalizeCountBlock(
  value: unknown,
  label: "declared",
):
  | {
      ok: true;
      value: {
        uiRoutes: number;
        apiEndpoints: number;
        dbObjects: number;
      };
    }
  | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return { ok: false, reason: `\`specs[].${label}\` must be an object` };
  }
  const uiRoutes = value.uiRoutes;
  const apiEndpoints = value.apiEndpoints;
  const dbObjects = value.dbObjects;
  if (
    !isNonNegativeInteger(uiRoutes) ||
    !isNonNegativeInteger(apiEndpoints) ||
    !isNonNegativeInteger(dbObjects)
  ) {
    return {
      ok: false,
      reason:
        "`specs[].declared` requires non-negative integers for uiRoutes/apiEndpoints/dbObjects",
    };
  }
  return {
    ok: true,
    value: {
      uiRoutes,
      apiEndpoints,
      dbObjects,
    },
  };
}

function normalizeCheckedBlock(value: unknown):
  | {
      ok: true;
      value: {
        uiOk: number;
        apiNon404: number;
        dbPresent: number;
      };
    }
  | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return { ok: false, reason: "`specs[].checked` must be an object" };
  }
  const uiOk = value.uiOk;
  const apiNon404 = value.apiNon404;
  const dbPresent = value.dbPresent;
  if (
    !isNonNegativeInteger(uiOk) ||
    !isNonNegativeInteger(apiNon404) ||
    !isNonNegativeInteger(dbPresent)
  ) {
    return {
      ok: false,
      reason: "`specs[].checked` requires non-negative integers for uiOk/apiNon404/dbPresent",
    };
  }
  return {
    ok: true,
    value: {
      uiOk,
      apiNon404,
      dbPresent,
    },
  };
}

function normalizeMissingBlock(value: unknown):
  | {
      ok: true;
      value: {
        uiRoutes: string[];
        apiEndpoints: string[];
        dbObjects: string[];
      };
    }
  | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return { ok: false, reason: "`specs[].missing` must be an object" };
  }
  const uiRoutes = toStringArray(value.uiRoutes);
  const apiEndpoints = toStringArray(value.apiEndpoints);
  const dbObjects = toStringArray(value.dbObjects);

  if (uiRoutes === null || apiEndpoints === null || dbObjects === null) {
    return {
      ok: false,
      reason: "`specs[].missing` requires string arrays for uiRoutes/apiEndpoints/dbObjects",
    };
  }
  return {
    ok: true,
    value: {
      uiRoutes,
      apiEndpoints,
      dbObjects,
    },
  };
}

function toStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return null;
  }
  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

function toOptionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return undefined;
  }
  return value.map((item: string) => item.trim()).filter((item) => item.length > 0);
}

function normalizeEvidenceRefArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return null;
  }
  return value.map((item: string) => item.trim());
}

function pushConcreteArtifactRefIssues(
  issues: Issue[],
  input: {
    evidenceJsonPath: string;
    refs: string[];
    required: boolean;
    fieldPath: string;
    guidance: string;
  },
): void {
  if (input.required && input.refs.length === 0) {
    issues.push(
      issue(
        "QFAI-PROT-318",
        `${input.fieldPath} must not be empty.`,
        "error",
        input.evidenceJsonPath,
        "prototypingEvidence.syntheticEvidenceRef",
        [input.fieldPath],
        "canonical",
        input.guidance,
      ),
    );
    return;
  }

  for (const ref of input.refs) {
    if (isConcreteArtifactRef(ref)) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-PROT-318",
        `non-concrete evidence ref is not allowed in ${input.fieldPath}: ${ref}`,
        "error",
        input.evidenceJsonPath,
        "prototypingEvidence.syntheticEvidenceRef",
        [ref],
        "canonical",
        input.guidance,
      ),
    );
  }
}

function normalizeHarnessAxes(value: unknown):
  | {
      ok: true;
      value: Array<{ axisId: string; score: number; rationale: string; evidenceRefs: string[] }>;
    }
  | { ok: false; reason: string } {
  if (!Array.isArray(value)) {
    return { ok: false, reason: "`fullHarness.iterations[].l1/l2.axes` must be an array" };
  }

  const axes: Array<{ axisId: string; score: number; rationale: string; evidenceRefs: string[] }> =
    [];
  for (const axis of value) {
    if (
      !isRecord(axis) ||
      typeof axis.axisId !== "string" ||
      typeof axis.score !== "number" ||
      typeof axis.rationale !== "string"
    ) {
      return { ok: false, reason: "`fullHarness.iterations[].l1/l2.axes[]` is invalid" };
    }
    const evidenceRefs = normalizeEvidenceRefArray(axis.evidenceRefs);
    if (evidenceRefs === null) {
      return {
        ok: false,
        reason: "`fullHarness.iterations[].l1/l2.axes[].evidenceRefs` must be a string array",
      };
    }
    axes.push({
      axisId: axis.axisId.trim(),
      score: axis.score,
      rationale: axis.rationale.trim(),
      evidenceRefs,
    });
  }

  return { ok: true, value: axes };
}

function normalizeOptionalFoundBlock(value: unknown): {
  found?: { labels?: string[]; markers?: string[] };
} {
  if (!isRecord(value)) {
    return {};
  }
  const labels = toOptionalStringArray(value.labels);
  const markers = toOptionalStringArray(value.markers);
  if (!labels && !markers) {
    return {};
  }
  return {
    found: {
      ...(labels ? { labels } : {}),
      ...(markers ? { markers } : {}),
    },
  };
}

function normalizeOptionalMissingBlock(value: unknown): {
  missing?: { labels?: string[]; markers?: string[] };
} {
  if (!isRecord(value)) {
    return {};
  }
  const labels = toOptionalStringArray(value.labels);
  const markers = toOptionalStringArray(value.markers);
  if (!labels && !markers) {
    return {};
  }
  return {
    missing: {
      ...(labels ? { labels } : {}),
      ...(markers ? { markers } : {}),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeArtifactRefPath(root: string, targetPath: string): string {
  const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(root, targetPath);
  return path.normalize(resolved);
}

function isValidMode(value: unknown): value is PrototypingMode {
  return typeof value === "string" && VALID_PROTOTYPING_MODES.has(value as PrototypingMode);
}

function isValidModeSource(value: unknown): value is ModeSelectionSource {
  return typeof value === "string" && VALID_MODE_SOURCES.has(value as ModeSelectionSource);
}

async function collectMissingRenderArtifacts(
  root: string,
  render: Extract<RenderEvidenceEntry, { status: "captured" }>,
): Promise<string[]> {
  const missing: string[] = [];
  const candidates = [
    { label: "imagePath", target: render.imagePath },
    { label: "htmlPath", target: render.htmlPath },
  ];
  for (const candidate of candidates) {
    const resolved = path.isAbsolute(candidate.target)
      ? candidate.target
      : path.resolve(root, candidate.target);
    try {
      await access(resolved);
    } catch {
      missing.push(candidate.label);
    }
  }
  return missing;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isInteger(value) && value >= 1;
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}
