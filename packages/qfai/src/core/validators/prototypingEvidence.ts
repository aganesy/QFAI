import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
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
    api: Array<{
      method: string;
      path: string;
      status: number;
    }>;
  };
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
  const runtimeApiNode = runtimeGateNode.api;
  if (!Array.isArray(runtimeApiNode)) {
    return { ok: false, reason: "`runtimeGate.api` must be an array" };
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

  return {
    ok: true,
    value: {
      specs,
      runtimeGate: {
        api: apiRows,
      },
    },
  };
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
  const numbers = [value.uiRoutes, value.apiEndpoints, value.dbObjects];
  if (!numbers.every(isNonNegativeInteger)) {
    return {
      ok: false,
      reason:
        "`specs[].declared` requires non-negative integers for uiRoutes/apiEndpoints/dbObjects",
    };
  }
  return {
    ok: true,
    value: {
      uiRoutes: value.uiRoutes,
      apiEndpoints: value.apiEndpoints,
      dbObjects: value.dbObjects,
    },
  };
}

function normalizeCheckedBlock(
  value: unknown,
):
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
  const numbers = [value.uiOk, value.apiNon404, value.dbPresent];
  if (!numbers.every(isNonNegativeInteger)) {
    return {
      ok: false,
      reason:
        "`specs[].checked` requires non-negative integers for uiOk/apiNon404/dbPresent",
    };
  }
  return {
    ok: true,
    value: {
      uiOk: value.uiOk,
      apiNon404: value.apiNon404,
      dbPresent: value.dbPresent,
    },
  };
}

function normalizeMissingBlock(
  value: unknown,
):
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
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return null;
  }
  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
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
