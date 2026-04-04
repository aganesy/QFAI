import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
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
  isUiBearingSurface,
  isValidPrototypingSurface,
  parseDiscussionModeRecommendationWithWarnings,
} from "../prototyping/mode.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
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
    available: boolean;
    runId: string;
    iterationCount: number;
    bestIteration: number;
    terminationReason: "converged" | "max-iterations" | "plateau" | "manual-stop";
    reviewerSignoff: {
      status: "approved" | "rejected";
      reviewer: string;
      timestamp: string;
    };
    scoringTrace: Array<{
      iteration: number;
      weightedTotal: number;
      decision: string;
    }>;
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
      route: string;
      status: number;
    }>;
    api: Array<{
      method: string;
      path: string;
      status: number;
    }>;
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

  const surfaceResult = resolvePrototypingSurface(parsed.value);
  const effectiveMode = parsed.value.mode?.effective ?? "standard";
  const obligations = derivePrototypingObligations({
    surface: surfaceResult.surface,
    effectiveMode,
  });

  const issues: Issue[] = [];
  issues.push(...validateSurface(surfaceResult, evidenceJsonPath));
  issues.push(...validateModeMetadata(parsed.value, evidenceJsonPath));
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
  const apiMismatches: string[] = [];
  const dbMismatches: string[] = [];

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
    if (row.checked.apiNon404 < row.declared.apiEndpoints || row.missing.apiEndpoints.length > 0) {
      apiMismatches.push(
        formatMismatch(
          row.specId,
          `${row.checked.apiNon404}/${row.declared.apiEndpoints}`,
          row.missing.apiEndpoints,
        ),
      );
    }
    if (row.checked.dbPresent < row.declared.dbObjects || row.missing.dbObjects.length > 0) {
      dbMismatches.push(
        formatMismatch(
          row.specId,
          `${row.checked.dbPresent}/${row.declared.dbObjects}`,
          row.missing.dbObjects,
        ),
      );
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

  if (apiMismatches.length > 0) {
    issues.push(
      issue(
        "QFAI-PROT-113",
        `API non-404 チェックが未達です: ${apiMismatches.join("; ")}`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.apiNon404",
        extractSpecRefs(apiMismatches),
        "change",
        "Coverage Matrix の API 列を修正し、declared endpoint の非404化を完了してください。",
      ),
    );
  }

  const runtime404Refs = (parsed.value.runtimeGate?.api ?? [])
    .filter((entry) => entry.status === 404)
    .map((entry) => `${entry.method.toUpperCase()} ${entry.path}`)
    .sort((left, right) => left.localeCompare(right));
  if (runtime404Refs.length > 0) {
    issues.push(
      issue(
        "QFAI-PROT-113",
        `Runtime Gate で API 404 を検出しました: ${runtime404Refs.join(", ")}`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.apiRuntime404",
        runtime404Refs,
        "change",
        "404 endpoint を解消し、runtimeGate.api の結果を更新してください。",
      ),
    );
  }

  if (dbMismatches.length > 0) {
    issues.push(
      issue(
        "QFAI-PROT-114",
        `DB present チェックが未達です: ${dbMismatches.join("; ")}`,
        "error",
        evidenceJsonPath,
        "prototypingEvidence.dbPresence",
        extractSpecRefs(dbMismatches),
        "change",
        "Coverage Matrix の DB 列を修正し、必要オブジェクトの存在を確認してください。",
      ),
    );
  }

  // WS-2: Cross-check evidence mode with discussion recommendation
  const discussionRoot = resolvePath(root, config, "discussionDir");
  const latestPackDir = await findLatestDiscussionPackDir(discussionRoot);
  if (latestPackDir) {
    const recPath = path.join(latestPackDir, "prototyping.yaml");
    const recResult = await parseDiscussionModeRecommendationWithWarnings(recPath);
    if (recResult.recommendation) {
      const rec = recResult.recommendation;
      // Check if evidence effective mode matches resolved precedence
      if (parsed.value.mode) {
        const evidenceEffective = parsed.value.mode.effective;
        const evidenceSource = parsed.value.mode.source;

        // QFAI-PROT-241: evidence effective mode doesn't match resolved precedence
        if (
          evidenceSource === "discussion-recommendation" &&
          evidenceEffective !== rec.recommendedMode
        ) {
          issues.push(
            issue(
              "QFAI-PROT-241",
              `prototyping evidence effective mode (${evidenceEffective}) does not match discussion recommendation (${rec.recommendedMode}).`,
              "error",
              evidenceJsonPath,
              "prototypingEvidence.modePrecedenceMismatch",
              [`effective=${evidenceEffective}`, `recommended=${rec.recommendedMode}`],
              "compatibility",
              "evidence の mode.effective を discussion recommendation に合わせるか、mode.source を修正してください。",
            ),
          );
        }

        // QFAI-PROT-242: mode source contradicts available discussion recommendation
        if (evidenceSource === "default" && rec.recommendedMode) {
          issues.push(
            issue(
              "QFAI-PROT-242",
              `evidence mode source is "default" but discussion recommendation exists (${rec.recommendedMode}).`,
              "warning",
              evidenceJsonPath,
              "prototypingEvidence.modeSourceContradiction",
              [`source=${evidenceSource}`, `recommended=${rec.recommendedMode}`],
              "compatibility",
              "discussion recommendation が存在する場合、mode.source は discussion-recommendation であるべきです。",
            ),
          );
        }

        // QFAI-PROT-243: requested mode is not allowed by discussion artifact
        if (
          parsed.value.mode.requested &&
          rec.allowedModes &&
          rec.allowedModes.length > 0 &&
          !rec.allowedModes.includes(parsed.value.mode.requested)
        ) {
          issues.push(
            issue(
              "QFAI-PROT-243",
              `requested mode (${parsed.value.mode.requested}) is not in discussion allowed_modes [${rec.allowedModes.join(", ")}].`,
              "warning",
              evidenceJsonPath,
              "prototypingEvidence.requestedModeNotAllowed",
              [
                `requested=${parsed.value.mode.requested}`,
                `allowed=${rec.allowedModes.join(",")}`,
              ],
              "compatibility",
              "requested mode を allowed_modes 内の mode に変更するか、discussion artifact の allowed_modes を更新してください。",
            ),
          );
        }
      }

      // Check mode source says "discussion" but recommendation artifact is missing
    } else if (parsed.value.mode?.source === "discussion-recommendation") {
      issues.push(
        issue(
          "QFAI-PROT-242",
          'evidence mode source is "discussion-recommendation" but no valid discussion recommendation artifact exists.',
          "error",
          evidenceJsonPath,
          "prototypingEvidence.modeSourceContradiction",
          [`source=${parsed.value.mode.source}`],
          "compatibility",
          "discussion pack に有効な prototyping.yaml を追加するか、mode.source を修正してください。",
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

    // QFAI-PROT-253: render evidence bundle contradicts prototyping surface/mode
    if (
      !isUiBearingSurface(surfaceResult.surface) &&
      renderBundle.renderEvidence?.status === "captured"
    ) {
      issues.push(
        issue(
          "QFAI-PROT-253",
          `render evidence bundle has captured status but surface is non-ui.`,
          "warning",
          renderBundlePath,
          "prototypingEvidence.renderBundleSurfaceContradiction",
          [`surface=${surfaceResult.surface}`],
          "compatibility",
          "non-ui project では render evidence は不要です。surface を見直すか render bundle を削除してください。",
        ),
      );
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

    // QFAI-PROT-261: browser QA bundle mode contradicts prototyping effective mode
    if (
      browserQaBundle.browserQa.mode &&
      parsed.value.mode?.effective &&
      browserQaBundle.browserQa.mode !== parsed.value.mode.effective
    ) {
      issues.push(
        issue(
          "QFAI-PROT-261",
          `browser QA bundle mode (${browserQaBundle.browserQa.mode}) does not match prototyping effective mode (${parsed.value.mode.effective}).`,
          "warning",
          browserQaBundlePath,
          "prototypingEvidence.browserQaModeMismatch",
          [
            `browserQa.mode=${browserQaBundle.browserQa.mode}`,
            `effective=${parsed.value.mode.effective}`,
          ],
          "compatibility",
          "browser QA bundle の mode を prototyping.json の mode.effective に合わせてください。",
        ),
      );
    }

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
          "compatibility",
          "browser QA が completed なら summary または findings を記録してください。",
        ),
      );
    }

    // QFAI-PROT-263: browser QA bundle required but missing for full-harness ui-bearing
    // (already handled by obligation matrix above — this covers executed=false case)
    if (
      obligations.requireBrowserQaBundle &&
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
          "compatibility",
          "full-harness ui-bearing では browser QA を実行し、executed=true にしてください。",
        ),
      );
    }
  }

  // WS-8: Calibration warnings
  if (
    parsed.value.fullHarness &&
    !config.prototyping?.calibration
  ) {
    issues.push(
      issue(
        "QFAI-PROT-271",
        "full-harness evidence present without calibration configuration in qfai.config.yaml.",
        "warning",
        evidenceJsonPath,
        "prototypingEvidence.calibrationMissing",
        undefined,
        "compatibility",
        "qfai.config.yaml に prototyping.calibration セクションを追加してください。",
      ),
    );
  }

  if (
    config.prototyping?.calibration &&
    parsed.value.fullHarness &&
    parsed.value.fullHarness.scoringTrace.length === 0
  ) {
    issues.push(
      issue(
        "QFAI-PROT-272",
        "calibration threshold configured but scoring trace is empty.",
        "warning",
        evidenceJsonPath,
        "prototypingEvidence.calibrationScoringTraceMissing",
        undefined,
        "compatibility",
        "fullHarness.scoringTrace に iteration ごとの score を追加してください。",
      ),
    );
  }

  const uiFidelityIssues = await validateUiFidelity(
    root,
    config,
    evidenceJsonPath,
    parsed.value,
    surfaceResult.surface,
    obligations,
  );
  issues.push(...uiFidelityIssues);

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

function resolvePrototypingSurface(evidence: PrototypingEvidence): {
  surface: PrototypingSurface;
  raw?: string;
  inferred: boolean;
} {
  if (isValidPrototypingSurface(evidence.surface)) {
    return { surface: evidence.surface, raw: evidence.surface, inferred: false };
  }

  const recommendationSurface = evidence.mode?.discussionRecommendation?.surface;
  const inferred = inferSurfaceFromRecommendationAndEvidence({
    recommendationSurface,
    hasUiFidelity: evidence.uiFidelity !== undefined,
    hasRenderBundle: evidence.renderEvidence !== undefined,
    hasBrowserQaBundle: evidence.browserQa !== undefined,
    hasUiRoutes: evidence.specs.some((spec) => spec.declared.uiRoutes > 0),
    hasRuntimeGateUi: (evidence.runtimeGate?.ui.length ?? 0) > 0,
  });

  return {
    surface: inferred,
    ...(typeof evidence.surface === "string" ? { raw: evidence.surface } : {}),
    inferred: !recommendationSurface,
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
        "compatibility",
        "surface は web-ui|mobile-ui|desktop-ui|mixed|non-ui のいずれかにしてください。",
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
  const uiBearing = isUiBearingSurface(surface);

  if (!uiBearing) {
    const contradictions: string[] = [];
    if ((evidence.runtimeGate?.ui.length ?? 0) > 0) contradictions.push("runtimeGate.ui");
    if (evidence.uiFidelity) contradictions.push("uiFidelity");
    if (renderBundle || evidence.renderEvidence) contradictions.push("renderEvidence");
    if (browserQaBundle || evidence.browserQa) contradictions.push("browserQa");
    if (contradictions.length > 0) {
      issues.push(
        issue(
          "QFAI-PROT-175",
          `surface=non-ui に UI 専用 evidence が含まれています: ${contradictions.join(", ")}`,
          "error",
          evidenceJsonPath,
          "prototypingEvidence.nonUiContradiction",
          contradictions,
          "compatibility",
          "non-ui では uiFidelity / render evidence / browser QA / runtimeGate.ui を省略してください。",
        ),
      );
    }
  }

  if (obligations.requireUiFidelity && !evidence.uiFidelity) {
    mismatches.push("uiFidelity");
    issues.push(
      issue(
        "QFAI-PROT-176",
        "ui-bearing の standard/full-harness mode では uiFidelity が必須です。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.uiFidelityRequiredByMode",
        [`surface=${surface}`, `mode=${evidence.mode?.effective ?? "standard"}`],
        "compatibility",
        "uiFidelity.screens[] を追加し、UI contract 対応の evidence を記録してください。",
      ),
    );
  }

  if (obligations.requireRuntimeGate && !evidence.runtimeGate) {
    mismatches.push("runtimeGate");
    issues.push(
      issue(
        "QFAI-PROT-177",
        "ui-bearing の full-harness mode では runtimeGate が必須です。",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.runtimeGateRequiredByMode",
        [`surface=${surface}`, `mode=${evidence.mode?.effective ?? "standard"}`],
        "compatibility",
        "runtimeGate.ui / runtimeGate.api を追加して full-harness の観測結果を記録してください。",
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
        [`surface=${surface}`, `mode=${evidence.mode?.effective ?? "standard"}`],
        "compatibility",
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
        [`surface=${surface}`, `mode=${evidence.mode?.effective ?? "standard"}`],
        "compatibility",
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
        [`surface=${surface}`, `mode=${evidence.mode?.effective ?? "standard"}`, ...mismatches],
        "compatibility",
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
    const runtimeApiNode = runtimeGateNode.api;
    if (!Array.isArray(runtimeUiNode)) {
      return { ok: false, reason: "`runtimeGate.ui` must be an array" };
    }
    if (!Array.isArray(runtimeApiNode)) {
      return { ok: false, reason: "`runtimeGate.api` must be an array" };
    }
    const uiRows: Array<{ route: string; status: number }> = [];
    for (const row of runtimeUiNode) {
      if (!isRecord(row)) {
        return { ok: false, reason: "`runtimeGate.ui[]` must be objects" };
      }
      if (
        typeof row.route !== "string" ||
        row.route.trim().length === 0 ||
        !isInteger(row.status)
      ) {
        return {
          ok: false,
          reason: "`runtimeGate.ui[]` requires route/status (status as integer)",
        };
      }
      uiRows.push({
        route: row.route.trim(),
        status: row.status,
      });
    }

    const apiRows: Array<{ method: string; path: string; status: number }> = [];
    for (const row of runtimeApiNode) {
      if (!isRecord(row)) {
        return { ok: false, reason: "`runtimeGate.api[]` must be objects" };
      }
      if (
        typeof row.method !== "string" ||
        row.method.trim().length === 0 ||
        typeof row.path !== "string" ||
        row.path.trim().length === 0 ||
        !isInteger(row.status)
      ) {
        return {
          ok: false,
          reason: "`runtimeGate.api[]` requires method/path/status (status as integer)",
        };
      }
      apiRows.push({
        method: row.method.trim(),
        path: row.path.trim(),
        status: row.status,
      });
    }

    runtimeGate = {
      ui: uiRows,
      api: apiRows,
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

function validateModeMetadata(evidence: PrototypingEvidence, evidenceJsonPath: string): Issue[] {
  const issues: Issue[] = [];

  if (!evidence.mode) {
    issues.push(
      issue(
        "QFAI-PROT-150",
        "prototyping.json に mode block がありません。v1.7.14 以降は error になります。",
        "warning",
        evidenceJsonPath,
        "prototypingEvidence.modeMigration",
        undefined,
        "compatibility",
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
        "compatibility",
        "mode.effective を low-cost|standard|full-harness のいずれかにしてください。",
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
        "compatibility",
        "mode.source を explicit-request|discussion-recommendation|default のいずれかにしてください。",
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
        "compatibility",
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
          "compatibility",
          "discussionRecommendation の recommendedMode / rationale / allowedModes を schema に合わせて修正してください。",
        ),
      );
    }
    if (
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
          "compatibility",
          "discussionRecommendation.allowedModes に recommendedMode を追加してください。",
        ),
      );
    }
  }

  if (evidence.mode.effective === "full-harness") {
    if (!evidence.fullHarness) {
      issues.push(
        issue(
          "QFAI-PROT-281",
          "mode.effective が full-harness の場合は fullHarness block が必要です。",
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessRequired",
          undefined,
          "compatibility",
          "fullHarness.enabled / terminationReason / scoringTrace / reviewerSignoff を追加してください。",
        ),
      );
      return issues;
    }
    if (!VALID_FULL_HARNESS_TERMINATION_REASONS.has(evidence.fullHarness.terminationReason)) {
      issues.push(
        issue(
          "QFAI-PROT-282",
          "fullHarness.terminationReason が不正です。",
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessTerminationReason",
          undefined,
          "compatibility",
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
          "compatibility",
          "fullHarness.scoringTrace に iteration ごとの score を追加してください。",
        ),
      );
    }
    if (
      evidence.fullHarness.reviewerSignoff.reviewer.trim().length === 0 ||
      evidence.fullHarness.reviewerSignoff.timestamp.trim().length === 0
    ) {
      issues.push(
        issue(
          "QFAI-PROT-264",
          "fullHarness.reviewerSignoff が不完全です。",
          "error",
          evidenceJsonPath,
          "prototypingEvidence.fullHarnessReviewerSignoff",
          undefined,
          "compatibility",
          "reviewerSignoff に reviewer / timestamp / status を記録してください。",
        ),
      );
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
  obligations: PrototypingObligations,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const uiFidelity = evidence.uiFidelity;
  const mode = uiFidelity?.mode ?? "interactive";
  const uiBearing = isUiBearingSurface(surface);

  if (!uiBearing) {
    return issues;
  }

  if (!uiFidelity && obligations.requireUiFidelity && mode !== "skeleton") {
    issues.push(
      issue(
        "QFAI-PROT-231",
        "QFAI-PROT-231: interactive mode requires uiFidelity. Add uiFidelity.screens[] and align each screen with contracts/ui routes.",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.uiFidelityRequired",
        undefined,
        "change",
        [
          "prototyping.json に uiFidelity を追加し、screens[] を contracts/ui の route ごとに記録してください。",
          "L2 の場合は mockPaths.status=pass を最低1件含めてください。",
        ].join("\n"),
      ),
    );
    return issues;
  }

  if (!uiFidelity || mode === "skeleton") {
    return issues;
  }
  if (uiFidelity.screens.length === 0) {
    issues.push(
      issue(
        "QFAI-PROT-232",
        "QFAI-PROT-232: uiFidelity.screens[] is empty. Add per-route coverage mapped to contracts/ui and include expected/observed fields.",
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
        "QFAI-PROT-232",
        `QFAI-PROT-232: uiFidelity does not satisfy UI contract. ${summary.join("; ")}`,
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
  // v1.4.38: autogen now handles backward-compatible marker matching (both id-based and
  // label-based forms) during evidence generation. The validator simply checks missing.markers.
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
  const hasPassMockPath = uiFidelity.screens.some((screen) =>
    screen.mockPaths.some((entry) => entry.status === "pass"),
  );
  if (!hasMockPaths || !hasPassMockPath) {
    issues.push(
      issue(
        "QFAI-PROT-233",
        "QFAI-PROT-233: interactive uiFidelity is missing mockPaths.status=pass. Record at least one passing mock flow.",
        "warning",
        evidenceJsonPath,
        "prototypingEvidence.mockPathsPass",
        uiFidelity.screens.map((screen) => screen.route),
        "change",
        "uiFidelity.screens[].mockPaths に status=pass を最低1件追加し、モック導線の観測結果を記録してください。",
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
      // backward-compatible alias: historical consumers parse missing_labels.
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
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    mockPaths.push({
      id,
      status: entry.status.trim().toLowerCase(),
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
  return {
    ok: true,
    value: {
      specId: value.specId.trim().toLowerCase(),
      declared: declared.value,
      checked: checked.value,
      missing: missing.value,
    },
  };
}

const VALID_PROTOTYPING_MODES = new Set<PrototypingMode>(["low-cost", "standard", "full-harness"]);
const VALID_MODE_SOURCES = new Set<ModeSelectionSource>([
  "explicit-request",
  "discussion-recommendation",
  "default",
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
      : undefined;

  return {
    ok: true,
    value: {
      recommendedMode: value.recommendedMode,
      rationale: value.rationale.trim(),
      ...(allowedModes ? { allowedModes } : {}),
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
  if (typeof value.available !== "boolean") {
    return { ok: false, reason: "`fullHarness.available` must be boolean" };
  }
  if (typeof value.runId !== "string" || value.runId.trim().length === 0) {
    return { ok: false, reason: "`fullHarness.runId` is required" };
  }
  if (!isPositiveInteger(value.iterationCount) || !isPositiveInteger(value.bestIteration)) {
    return {
      ok: false,
      reason: "`fullHarness.iterationCount` and `bestIteration` must be integers >= 1",
    };
  }
  if (
    typeof value.terminationReason !== "string" ||
    !VALID_FULL_HARNESS_TERMINATION_REASONS.has(value.terminationReason)
  ) {
    return { ok: false, reason: "`fullHarness.terminationReason` is invalid" };
  }
  if (!isRecord(value.reviewerSignoff)) {
    return { ok: false, reason: "`fullHarness.reviewerSignoff` must be an object" };
  }
  if (
    (value.reviewerSignoff.status !== "approved" && value.reviewerSignoff.status !== "rejected") ||
    typeof value.reviewerSignoff.reviewer !== "string" ||
    typeof value.reviewerSignoff.timestamp !== "string"
  ) {
    return { ok: false, reason: "`fullHarness.reviewerSignoff` is invalid" };
  }
  if (!Array.isArray(value.scoringTrace)) {
    return { ok: false, reason: "`fullHarness.scoringTrace` must be an array" };
  }

  const scoringTrace: NonNullable<PrototypingEvidence["fullHarness"]>["scoringTrace"] = [];
  for (const row of value.scoringTrace) {
    if (
      !isRecord(row) ||
      !isPositiveInteger(row.iteration) ||
      typeof row.weightedTotal !== "number" ||
      !Number.isFinite(row.weightedTotal) ||
      typeof row.decision !== "string" ||
      row.decision.trim().length === 0
    ) {
      return { ok: false, reason: "`fullHarness.scoringTrace[]` is invalid" };
    }
    scoringTrace.push({
      iteration: row.iteration,
      weightedTotal: row.weightedTotal,
      decision: row.decision.trim(),
    });
  }

  return {
    ok: true,
    value: {
      enabled: true,
      available: value.available,
      runId: value.runId.trim(),
      iterationCount: value.iterationCount,
      bestIteration: value.bestIteration,
      terminationReason: value.terminationReason as
        | "converged"
        | "max-iterations"
        | "plateau"
        | "manual-stop",
      reviewerSignoff: {
        status: value.reviewerSignoff.status,
        reviewer: value.reviewerSignoff.reviewer.trim(),
        timestamp: value.reviewerSignoff.timestamp.trim(),
      },
      scoringTrace,
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
