import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import type { Issue } from "../types.js";
import {
  collectMarkdownItems,
  collectScenarioItems,
  issue,
  readSafe,
  uniqueMatches,
} from "./utils.js";

const SHARED_FILES = [
  "01_Objective.md",
  "02_Initiative.md",
  "03_Capabilities.md",
  "04_Business-flow.md",
  "05_Contracts.md",
  "06_Glossary.md",
  "07_Constraints.md",
  "08_Decisions.md",
  "09_Open-questions.md",
  "10_delta.md",
] as const;

const SHARED_DOWNSTREAM_RE = /\b(?:spec-\d{4}|US-\d{4}|AC-\d{4}|BR-\d{4}|EX-\d{4}|TC-\d{4})\b/gi;
const US_DOWNSTREAM_RE = /\b(?:AC|BR|EX|TC)-\d{4}\b/g;
const AC_DOWNSTREAM_RE = /\b(?:BR|EX|TC)-\d{4}\b/g;
const BR_DOWNSTREAM_RE = /\b(?:EX|TC)-\d{4}\b/g;
const CAP_ID_RE = /^CAP-\d{4}$/;
const US_ID_RE = /^US-\d{4}$/;
const AC_ID_RE = /^AC-\d{4}$/;
const BR_OR_AC_ID_RE = /^(?:BR|AC)-\d{4}$/;
const EX_ID_RE = /^EX-\d{4}$/;
const LAYER_ID_RE = /\b(?:OBJ|INIT|CAP|FLOW|US|AC|BR|EX|TC)-\d{4}\b/gi;
const SHARED_DOWNSTREAM_V1421_RE = /\b(?:US|AC|BR|EX|TC)-\d{4}\b/gi;

const LAYER_ORDER = {
  OBJ: 0,
  INIT: 1,
  CAP: 2,
  FLOW: 3,
  US: 4,
  AC: 5,
  BR: 6,
  EX: 7,
  TC: 8,
} as const;

type LayerIdPrefix = keyof typeof LAYER_ORDER;

export async function validateLayeredTraceability(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const layeredV1417Entries = entries.filter(
    (entry): entry is SpecEntry => entry.layout === "layered" && entry.layeredStyle === "v1417",
  );
  const layeredV1421Entries = entries.filter(
    (entry): entry is SpecEntry => entry.layout === "layered" && entry.layeredStyle === "v1421",
  );
  if (layeredV1417Entries.length === 0 && layeredV1421Entries.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  if (layeredV1417Entries.length > 0) {
    const sharedDir = layeredV1417Entries[0]?.sharedDir ?? path.join(specsRoot, "_policies");
    issues.push(...(await validateSharedDownstreamReferences(sharedDir)));

    for (const entry of layeredV1417Entries) {
      issues.push(...(await validateSpecRootParent(entry)));
      issues.push(
        ...(await validateMarkdownParentFormat(entry.userStoriesPath, "US", CAP_ID_RE, "CAP")),
      );
      issues.push(
        ...(await validateMarkdownParentFormat(entry.acceptanceCriteriaPath, "AC", US_ID_RE, "US")),
      );
      issues.push(
        ...(await validateMarkdownParentFormat(entry.businessRulesPath, "BR", AC_ID_RE, "AC")),
      );
      issues.push(...(await validateExamplesParentFormat(entry.examplesPath)));
      issues.push(
        ...(await validateMarkdownParentFormat(entry.testCasesPath, "TC", EX_ID_RE, "EX")),
      );
      issues.push(
        ...(await validateForbiddenRefs(
          entry.userStoriesPath,
          US_DOWNSTREAM_RE,
          "User-stories で下位ID参照は禁止です",
        )),
      );
      issues.push(
        ...(await validateForbiddenRefs(
          entry.acceptanceCriteriaPath,
          AC_DOWNSTREAM_RE,
          "Acceptance-criteria で下位ID参照は禁止です",
        )),
      );
      issues.push(
        ...(await validateForbiddenRefs(
          entry.businessRulesPath,
          BR_DOWNSTREAM_RE,
          "Business-rules で下位ID参照は禁止です",
        )),
      );
    }
  }

  if (layeredV1421Entries.length > 0) {
    const sharedDir = layeredV1421Entries[0]?.sharedDir ?? path.join(specsRoot, "_policies");
    issues.push(...(await validateSharedScopeForV1421(sharedDir)));

    for (const entry of layeredV1421Entries) {
      issues.push(...(await validateDownstreamRefsForV1421(entry)));
    }
  }

  return issues;
}

async function validateSharedDownstreamReferences(sharedDir: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  for (const fileName of SHARED_FILES) {
    const filePath = path.join(sharedDir, fileName);
    const text = await readSafe(filePath);
    if (text.trim().length === 0) {
      continue;
    }
    const refs = uniqueMatches(text, SHARED_DOWNSTREAM_RE);
    if (refs.length === 0) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-LAYER-100",
        `${fileName} で下位参照は禁止です: ${refs.join(", ")}`,
        "error",
        filePath,
        "layeredTraceability.sharedDownRef",
        refs,
      ),
    );
  }
  return issues;
}

async function validateSharedScopeForV1421(sharedDir: string): Promise<Issue[]> {
  const files = await collectMarkdownFiles(sharedDir);
  if (files.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const filePath of files) {
    const text = await readSafe(filePath);
    if (text.trim().length === 0) {
      continue;
    }
    const refs = uniqueMatches(text, SHARED_DOWNSTREAM_V1421_RE);
    if (refs.length === 0) {
      continue;
    }
    issues.push(
      issue(
        "TRACE_SHARED_SCOPE_VIOLATION",
        `_policies で US/AC/BR/EX/TC の定義・参照は禁止です: ${refs.join(", ")}`,
        "error",
        filePath,
        "layeredTraceability.sharedScope",
        refs,
      ),
    );
  }

  return issues;
}

async function validateDownstreamRefsForV1421(entry: SpecEntry): Promise<Issue[]> {
  const checks: Array<{ filePath: string; layer: LayerIdPrefix }> = [
    { filePath: entry.userStoriesPath, layer: "US" },
    { filePath: entry.acceptanceCriteriaPath, layer: "AC" },
    { filePath: entry.businessRulesPath, layer: "BR" },
    { filePath: entry.examplesPath, layer: "EX" },
    { filePath: entry.testCasesPath, layer: "TC" },
  ];

  const issues: Issue[] = [];
  for (const check of checks) {
    const text = await readSafe(check.filePath);
    if (text.trim().length === 0) {
      continue;
    }

    const refs = uniqueMatches(text, LAYER_ID_RE).filter((id) =>
      isDownstreamReference(check.layer, id),
    );
    if (refs.length === 0) {
      continue;
    }

    issues.push(
      issue(
        "TRACE_DOWNSTREAM_REF",
        `${path.basename(check.filePath)} で下位レイヤー参照は禁止です: ${refs.join(", ")}`,
        "error",
        check.filePath,
        "layeredTraceability.downstream",
        refs,
      ),
    );
  }

  return issues;
}

function isDownstreamReference(sourceLayer: LayerIdPrefix, id: string): boolean {
  const targetLayer = resolveLayerFromId(id);
  if (!targetLayer) {
    return false;
  }
  return LAYER_ORDER[targetLayer] > LAYER_ORDER[sourceLayer];
}

function resolveLayerFromId(id: string): LayerIdPrefix | null {
  const prefix = id.split("-", 1)[0]?.toUpperCase();
  if (!prefix) {
    return null;
  }
  if (prefix in LAYER_ORDER) {
    return prefix as LayerIdPrefix;
  }
  return null;
}

async function collectMarkdownFiles(sharedDir: string): Promise<string[]> {
  try {
    const entries = await readdir(sharedDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".md")
      .map((entry) => path.join(sharedDir, entry.name))
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

async function validateSpecRootParent(entry: SpecEntry): Promise<Issue[]> {
  const specPath = path.join(entry.dir, "01_Spec.md");
  const text = await readSafe(specPath);
  if (text.trim().length > 0 && /\bCAP-\d{4}\b/.test(text)) {
    return [];
  }
  return [
    issue(
      "QFAI-LAYER-101",
      "01_Spec.md は `CAP-YYYY` の親参照を含む必要があります。",
      "error",
      specPath,
      "layeredTraceability.specParent",
    ),
  ];
}

async function validateMarkdownParentFormat(
  filePath: string,
  prefix: "US" | "AC" | "BR" | "TC",
  parentFormat: RegExp,
  parentPrefix: "CAP" | "US" | "AC" | "EX",
): Promise<Issue[]> {
  const text = await readSafe(filePath);
  const items = collectMarkdownItems(text, prefix);
  const issues: Issue[] = [];

  for (const item of items) {
    if (!item.parent) {
      issues.push(
        issue(
          "QFAI-LAYER-102",
          `${item.id} に Parent がありません。`,
          "error",
          filePath,
          "layeredTraceability.parentRequired",
          [item.id],
        ),
      );
      continue;
    }
    if (!parentFormat.test(item.parent)) {
      issues.push(
        issue(
          "QFAI-LAYER-103",
          `${item.id} の Parent は ${parentPrefix}-XXXX 形式で指定してください: ${item.parent}`,
          "error",
          filePath,
          "layeredTraceability.parentType",
          [item.id, item.parent],
        ),
      );
    }
  }

  return issues;
}

async function validateExamplesParentFormat(filePath: string): Promise<Issue[]> {
  const text = await readSafe(filePath);
  const scenarios = collectScenarioItems(text);
  const issues: Issue[] = [];

  for (const scenario of scenarios) {
    if (!scenario.parent) {
      issues.push(
        issue(
          "QFAI-LAYER-104",
          `${scenario.exId} に Parent コメントがありません。`,
          "error",
          filePath,
          "layeredTraceability.parentRequired",
          [scenario.exId],
        ),
      );
      continue;
    }
    if (!BR_OR_AC_ID_RE.test(scenario.parent)) {
      issues.push(
        issue(
          "QFAI-LAYER-105",
          `${scenario.exId} の Parent は BR-XXXX または AC-XXXX で指定してください: ${scenario.parent}`,
          "error",
          filePath,
          "layeredTraceability.parentType",
          [scenario.exId, scenario.parent],
        ),
      );
    }
  }

  return issues;
}

async function validateForbiddenRefs(
  filePath: string,
  pattern: RegExp,
  messagePrefix: string,
): Promise<Issue[]> {
  const text = await readSafe(filePath);
  const refs = uniqueMatches(text, pattern);
  if (refs.length === 0) {
    return [];
  }
  return [
    issue(
      "QFAI-LAYER-106",
      `${messagePrefix}: ${refs.join(", ")}`,
      "error",
      filePath,
      "layeredTraceability.downRefForbidden",
      refs,
    ),
  ];
}
