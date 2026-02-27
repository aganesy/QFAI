import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { parseStructuredContract } from "../contracts.js";
import { buildContractIndex } from "../contractIndex.js";
import { stripContractDeclarationLines } from "../contractsDecl.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
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
  runtimeGate: {
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
  };
  observed: {
    elementsPlaced: number;
    actionsWired: number;
  };
  mockPaths: UiFidelityMockPathEvidence[];
};

type UiFidelityMockPathEvidence = {
  id: string;
  status: string;
};

type UiContractScreenSummary = {
  elementsCount: number;
  actionsCount: number;
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

  const issues: Issue[] = [];
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

    if (
      row.checked.uiOk < row.declared.uiRoutes ||
      row.missing.uiRoutes.length > 0
    ) {
      uiMismatches.push(
        formatMismatch(
          row.specId,
          `${row.checked.uiOk}/${row.declared.uiRoutes}`,
          row.missing.uiRoutes,
        ),
      );
    }
    if (
      row.checked.apiNon404 < row.declared.apiEndpoints ||
      row.missing.apiEndpoints.length > 0
    ) {
      apiMismatches.push(
        formatMismatch(
          row.specId,
          `${row.checked.apiNon404}/${row.declared.apiEndpoints}`,
          row.missing.apiEndpoints,
        ),
      );
    }
    if (
      row.checked.dbPresent < row.declared.dbObjects ||
      row.missing.dbObjects.length > 0
    ) {
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

  const runtime404Refs = parsed.value.runtimeGate.api
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

  const uiFidelityIssues = await validateUiFidelity(
    root,
    config,
    evidenceJsonPath,
    parsed.value,
  );
  issues.push(...uiFidelityIssues);

  return issues;
}

function formatMismatch(
  specId: string,
  ratio: string,
  missing: string[],
): string {
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
    .filter(
      (value, index, array) =>
        value.length > 0 && array.indexOf(value) === index,
    );
}

async function readSafe(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
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

  const runtimeGateNode = parsed.runtimeGate;
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
        reason:
          "`runtimeGate.api[]` requires method/path/status (status as integer)",
      };
    }
    apiRows.push({
      method: row.method.trim(),
      path: row.path.trim(),
      status: row.status,
    });
  }

  const metaNode = parsed.meta;
  if (!isRecord(metaNode)) {
    return { ok: false, reason: "`meta` must be an object" };
  }
  if (
    typeof metaNode.generatedAt !== "string" ||
    metaNode.generatedAt.trim().length === 0
  ) {
    return { ok: false, reason: "`meta.generatedAt` is required" };
  }
  if (
    typeof metaNode.toolVersion !== "string" ||
    metaNode.toolVersion.trim().length === 0
  ) {
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

  return {
    ok: true,
    value: {
      specs,
      runtimeGate: {
        ui: uiRows,
        api: apiRows,
      },
      meta: {
        generatedAt: metaNode.generatedAt.trim(),
        toolVersion: metaNode.toolVersion.trim(),
        commands: metaNode.commands.map((item) => item.trim()),
      },
      ...(uiFidelity ? { uiFidelity } : {}),
    },
  };
}

async function validateUiFidelity(
  root: string,
  config: QfaiConfig,
  evidenceJsonPath: string,
  evidence: PrototypingEvidence,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const uiFidelity = evidence.uiFidelity;
  const mode = uiFidelity?.mode ?? "interactive";

  if (!uiFidelity && mode !== "skeleton") {
    issues.push(
      issue(
        "QFAI-PROT-231",
        "QFAI-PROT-231: uiFidelity is required for interactive prototyping evidence.",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.uiFidelityRequired",
        undefined,
        "change",
        "prototyping.json に uiFidelity を追加し、screens[] をUI契約に従って埋めてください。",
      ),
    );
    return issues;
  }

  if (!uiFidelity || mode === "skeleton") {
    return issues;
  }

  const contractIndex = await buildContractIndex(root, config);
  const uiContractScreens = await collectUiContractScreens(contractIndex);
  const mismatches: string[] = [];

  for (const screen of uiFidelity.screens) {
    const screenRef = `${screen.route}:${screen.uiContractId}`;
    const contractFiles = contractIndex.idToFiles.get(screen.uiContractId);
    if (!contractFiles || contractFiles.size === 0) {
      mismatches.push(`${screenRef}(contract-missing)`);
      continue;
    }

    const routeSummary = uiContractScreens
      .get(screen.uiContractId)
      ?.get(screen.route);
    if (!routeSummary) {
      mismatches.push(`${screenRef}(route-missing)`);
      continue;
    }
    const contractElementsCount = routeSummary?.elementsCount ?? 0;
    const contractActionsCount = routeSummary?.actionsCount ?? 0;

    const elementsMissing =
      screen.expected.elements < contractElementsCount ||
      screen.observed.elementsPlaced !== screen.expected.elements;
    if (elementsMissing) {
      mismatches.push(
        `${screenRef}(elements expected=${screen.expected.elements}, observed=${screen.observed.elementsPlaced}, contract=${contractElementsCount})`,
      );
    }

    if (contractActionsCount > 0 && screen.observed.actionsWired === 0) {
      mismatches.push(
        `${screenRef}(actions observed=${screen.observed.actionsWired}, contract=${contractActionsCount})`,
      );
    }
  }

  if (mismatches.length > 0) {
    issues.push(
      issue(
        "QFAI-PROT-232",
        "QFAI-PROT-232: uiFidelity does not satisfy UI contract (missing elements/actions).",
        "error",
        evidenceJsonPath,
        "prototypingEvidence.uiFidelityContractCoverage",
        mismatches.sort((left, right) => left.localeCompare(right)),
        "change",
        "UI contract の elements/actions を画面に配置し、最低1つの action をモック配線してください。",
      ),
    );
  }

  const hasMockPaths = uiFidelity.screens.some(
    (screen) => screen.mockPaths.length > 0,
  );
  const hasPassMockPath = uiFidelity.screens.some((screen) =>
    screen.mockPaths.some((entry) => entry.status === "pass"),
  );
  if (!hasMockPaths || !hasPassMockPath) {
    issues.push(
      issue(
        "QFAI-PROT-233",
        "QFAI-PROT-233: interactive uiFidelity should include at least one mockPaths entry with status=pass.",
        "warning",
        evidenceJsonPath,
        "prototypingEvidence.mockPathsPass",
        uiFidelity.screens.map((screen) => screen.route),
        "change",
        "uiFidelity.screens[].mockPaths に status=pass を最低1件追加し、モック導線の観測結果を記録してください。",
      ),
    );
  }

  return issues;
}

async function collectUiContractScreens(
  contractIndex: Awaited<ReturnType<typeof buildContractIndex>>,
): Promise<Map<string, Map<string, UiContractScreenSummary>>> {
  const result = new Map<string, Map<string, UiContractScreenSummary>>();

  for (const [contractId, fileSet] of contractIndex.idToFiles.entries()) {
    if (!contractId.startsWith("CON-UI-")) {
      continue;
    }
    const filePath = Array.from(fileSet).sort((left, right) =>
      left.localeCompare(right),
    )[0];
    if (!filePath) {
      continue;
    }

    const raw = await readSafe(filePath);
    if (raw === null) {
      continue;
    }
    try {
      const doc = parseStructuredContract(
        filePath,
        stripContractDeclarationLines(raw),
      );
      result.set(contractId, extractUiContractScreenSummary(doc));
    } catch {
      // parse errors are handled by contracts validator; skip detailed checks here.
    }
  }

  return result;
}

function extractUiContractScreenSummary(
  doc: unknown,
): Map<string, UiContractScreenSummary> {
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
    });
  }

  return summary;
}

function countContractItems(value: unknown): number {
  if (!Array.isArray(value)) {
    return 0;
  }
  return value.filter(
    (item) =>
      isRecord(item) &&
      typeof item.id === "string" &&
      item.id.trim().length > 0,
  ).length;
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
):
  | { ok: true; value: UiFidelityScreenEvidence }
  | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return { ok: false, reason: "`uiFidelity.screens[]` must be objects" };
  }

  if (typeof value.route !== "string" || value.route.trim().length === 0) {
    return { ok: false, reason: "`uiFidelity.screens[].route` is required" };
  }
  if (
    typeof value.uiContractId !== "string" ||
    value.uiContractId.trim().length === 0
  ) {
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

  return {
    ok: true,
    value: {
      route: value.route.trim(),
      uiContractId: value.uiContractId.trim().toUpperCase(),
      expected: expected.value,
      observed: observed.value,
      mockPaths: mockPaths.value,
    },
  };
}

function normalizeUiFidelityExpected(
  value: unknown,
):
  | { ok: true; value: { elements: number; actions: number } }
  | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return {
      ok: false,
      reason: "`uiFidelity.screens[].expected` must be an object",
    };
  }
  if (
    !isNonNegativeInteger(value.elements) ||
    !isNonNegativeInteger(value.actions)
  ) {
    return {
      ok: false,
      reason:
        "`uiFidelity.screens[].expected` requires non-negative integers for elements/actions",
    };
  }
  return {
    ok: true,
    value: {
      elements: value.elements,
      actions: value.actions,
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
  if (
    !isNonNegativeInteger(value.elementsPlaced) ||
    !isNonNegativeInteger(value.actionsWired)
  ) {
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
):
  | { ok: true; value: UiFidelityMockPathEvidence[] }
  | { ok: false; reason: string } {
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
        reason:
          "`uiFidelity.screens[].mockPaths[].status` is required as string",
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
):
  | { ok: true; value: PrototypingSpecEvidence }
  | { ok: false; reason: string } {
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
      reason:
        "`specs[].checked` requires non-negative integers for uiOk/apiNon404/dbPresent",
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
      reason:
        "`specs[].missing` requires string arrays for uiRoutes/apiEndpoints/dbObjects",
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
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    return null;
  }
  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value)
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}
