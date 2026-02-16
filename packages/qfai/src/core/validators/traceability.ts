import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { extractIds } from "../ids.js";
import { parseScenarioDocument, type ScenarioNode } from "../scenarioModel.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import { collectScTestReferences } from "../traceability.js";
import type { Issue, ValidationPhase } from "../types.js";
import { issue } from "./utils.js";

const SC_TAG_RE = /^SC-\d{4}-\d{4}$/;
const SPEC_TAG_RE = /^SPEC-\d{4}$/;
const US_ID_RE = /\bUS-\d{4}-\d{4}\b/g;
const AC_ID_RE = /\bAC-\d{4}-\d{4}\b/g;
const DOWNSTREAM_ID_RE = /\b(?:US|AC|BR|SC|CASE)-\d{4}-\d{4}\b/g;

type LayeredEdgeData = {
  usIds: Set<string>;
  acIds: Set<string>;
  brIds: Set<string>;
  scIds: Set<string>;
  caseIds: Set<string>;
  acToUs: Map<string, Set<string>>;
  brToAc: Map<string, Set<string>>;
  scToAc: Map<string, Set<string>>;
  caseToSc: Map<string, Set<string>>;
};

export async function validateTraceability(
  root: string,
  config: QfaiConfig,
  phase: ValidationPhase,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const layeredEntries = entries.filter((entry) => entry.layout === "layered");

  if (layeredEntries.length === 0) {
    return issues;
  }

  const sharedDir =
    layeredEntries[0]?.sharedDir ?? path.join(specsRoot, "_shared");
  const capabilitiesPath = path.join(sharedDir, "03_Capabilities.md");
  const capabilitiesText = await readSafe(capabilitiesPath);
  const capIds = new Set(extractIds(capabilitiesText, "CAP"));
  const capSpecNumbers = new Set(
    Array.from(capIds)
      .map((capId) => capId.match(/^CAP-(\d{4})$/)?.[1])
      .filter((value): value is string => Boolean(value)),
  );
  const specNumbers = new Set(layeredEntries.map((entry) => entry.specNumber));

  if (capabilitiesText.length === 0) {
    issues.push(
      issue(
        "QFAI-TRACE-100",
        "_shared/03_Capabilities.md が見つかりません。Layered Traceability を検証できません。",
        "error",
        capabilitiesPath,
        "traceability.layered.capabilitiesRequired",
      ),
    );
  }

  const missingSpecNumbers = Array.from(capSpecNumbers).filter(
    (specNumber) => !specNumbers.has(specNumber),
  );
  if (missingSpecNumbers.length > 0) {
    issues.push(
      issue(
        "QFAI-TRACE-101",
        `CAP に対応する spec ディレクトリがありません: ${missingSpecNumbers
          .map((specNumber) => `CAP-${specNumber} -> spec-${specNumber}`)
          .join(", ")}`,
        "error",
        capabilitiesPath,
        "traceability.layered.capToSpec",
      ),
    );
  }

  const missingCapNumbers = Array.from(specNumbers).filter(
    (specNumber) => !capSpecNumbers.has(specNumber),
  );
  if (missingCapNumbers.length > 0) {
    issues.push(
      issue(
        "QFAI-TRACE-102",
        `spec ディレクトリに対応する CAP が _shared/03_Capabilities.md にありません: ${missingCapNumbers
          .map((specNumber) => `spec-${specNumber} -> CAP-${specNumber}`)
          .join(", ")}`,
        "error",
        specsRoot,
        "traceability.layered.specToCap",
      ),
    );
  }

  issues.push(...(await validateUpperLayerDownRef(sharedDir)));

  const allLayeredScIds = new Set<string>();
  for (const entry of layeredEntries) {
    const edgeData = await collectLayeredEdgeData(entry, issues);
    edgeData.scIds.forEach((id) => allLayeredScIds.add(id));
    issues.push(...validateLayeredEdges(entry, edgeData));
    issues.push(...validateLayeredHeuristics(entry, edgeData));
  }

  if (phase !== "refinement" && allLayeredScIds.size > 0) {
    issues.push(
      ...(await validateLayeredScCodeReferences(
        root,
        config,
        allLayeredScIds,
        specsRoot,
      )),
    );
  }

  return issues;
}

async function validateUpperLayerDownRef(sharedDir: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const targets = [
    "01_Objective.md",
    "02_Initiative.md",
    "03_Capabilities.md",
    "04_Business-flow.md",
  ];

  for (const fileName of targets) {
    const targetPath = path.join(sharedDir, fileName);
    const text = await readSafe(targetPath);
    if (text.length === 0) {
      continue;
    }
    const downstreamIds = extractMatches(text, DOWNSTREAM_ID_RE);
    if (downstreamIds.length === 0) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-TRACE-103",
        `${fileName} で下位 ID の参照は禁止です: ${downstreamIds.join(", ")}`,
        "error",
        targetPath,
        "traceability.layered.downRefForbidden",
        downstreamIds,
      ),
    );
  }

  return issues;
}

async function collectLayeredEdgeData(
  entry: SpecEntry,
  issues: Issue[],
): Promise<LayeredEdgeData> {
  const userStoriesText = await readSafe(entry.userStoriesPath);
  const acceptanceCriteriaText = await readSafe(entry.acceptanceCriteriaPath);
  const businessRulesText = await readSafe(entry.businessRulesPath);
  const examplesText = await readSafe(entry.examplesPath);
  const testCasesText = await readSafe(entry.testCasesPath);

  const usIds = extractTableDefinitionIds(userStoriesText, /^US-\d{4}-\d{4}$/);
  const { definitions: acIds, refsByDefinition: acToUs } =
    extractTableDefinitionRefs(
      acceptanceCriteriaText,
      /^AC-\d{4}-\d{4}$/,
      US_ID_RE,
    );
  const { definitions: brIds, refsByDefinition: brToAc } =
    extractTableDefinitionRefs(businessRulesText, /^BR-\d{4}-\d{4}$/, AC_ID_RE);
  const { scIds, scToAc } = parseScenarioRefs(entry, examplesText, issues);
  const { definitions: caseIds, refsByDefinition: caseToSc } =
    extractTableDefinitionRefs(
      testCasesText,
      /^CASE-\d{4}-\d{4}$/,
      SC_TAG_RE_GLOBAL,
    );

  return {
    usIds,
    acIds,
    brIds,
    scIds,
    caseIds,
    acToUs,
    brToAc,
    scToAc,
    caseToSc,
  };
}

function validateLayeredEdges(
  entry: SpecEntry,
  data: LayeredEdgeData,
): Issue[] {
  const issues: Issue[] = [];
  const {
    usIds,
    acIds,
    brIds,
    scIds,
    caseIds,
    acToUs,
    brToAc,
    scToAc,
    caseToSc,
  } = data;

  for (const usId of usIds) {
    const linked = Array.from(acToUs.values()).some((refs) => refs.has(usId));
    if (!linked) {
      issues.push(
        issue(
          "QFAI-TRACE-104",
          `US に対応する AC がありません: ${usId}`,
          "error",
          entry.acceptanceCriteriaPath,
          "traceability.layered.usToAc",
          [usId],
        ),
      );
    }
  }

  for (const acId of acIds) {
    const parents = acToUs.get(acId) ?? new Set<string>();
    if (parents.size === 0) {
      issues.push(
        issue(
          "QFAI-TRACE-105",
          `AC が親 US を参照していません: ${acId}`,
          "error",
          entry.acceptanceCriteriaPath,
          "traceability.layered.acToUs",
          [acId],
        ),
      );
      continue;
    }
    const unknownUs = Array.from(parents).filter((id) => !usIds.has(id));
    if (unknownUs.length > 0) {
      issues.push(
        issue(
          "QFAI-TRACE-106",
          `AC が未定義の US を参照しています: ${acId} -> ${unknownUs.join(", ")}`,
          "error",
          entry.acceptanceCriteriaPath,
          "traceability.layered.acParentExists",
          [acId, ...unknownUs],
        ),
      );
    }
  }

  for (const acId of acIds) {
    const linked = Array.from(brToAc.values()).some((refs) => refs.has(acId));
    if (!linked) {
      issues.push(
        issue(
          "QFAI-TRACE-107",
          `AC に対応する BR がありません: ${acId}`,
          "error",
          entry.businessRulesPath,
          "traceability.layered.acToBr",
          [acId],
        ),
      );
    }
  }

  for (const brId of brIds) {
    const refs = brToAc.get(brId) ?? new Set<string>();
    if (refs.size === 0) {
      issues.push(
        issue(
          "QFAI-TRACE-108",
          `BR が AC を参照していません: ${brId}`,
          "error",
          entry.businessRulesPath,
          "traceability.layered.brToAc",
          [brId],
        ),
      );
      continue;
    }
    const unknownAc = Array.from(refs).filter((id) => !acIds.has(id));
    if (unknownAc.length > 0) {
      issues.push(
        issue(
          "QFAI-TRACE-109",
          `BR が未定義の AC を参照しています: ${brId} -> ${unknownAc.join(", ")}`,
          "error",
          entry.businessRulesPath,
          "traceability.layered.brParentExists",
          [brId, ...unknownAc],
        ),
      );
    }
  }

  for (const scId of scIds) {
    const refs = scToAc.get(scId) ?? new Set<string>();
    if (refs.size === 0) {
      issues.push(
        issue(
          "QFAI-TRACE-110",
          `SC が AC を参照していません: ${scId}`,
          "error",
          entry.examplesPath,
          "traceability.layered.scToAc",
          [scId],
        ),
      );
      continue;
    }
    const unknownAc = Array.from(refs).filter((id) => !acIds.has(id));
    if (unknownAc.length > 0) {
      issues.push(
        issue(
          "QFAI-TRACE-111",
          `SC が未定義の AC を参照しています: ${scId} -> ${unknownAc.join(", ")}`,
          "error",
          entry.examplesPath,
          "traceability.layered.scParentExists",
          [scId, ...unknownAc],
        ),
      );
    }
  }

  for (const acId of acIds) {
    const linked = Array.from(scToAc.values()).some((refs) => refs.has(acId));
    if (!linked) {
      issues.push(
        issue(
          "QFAI-TRACE-112",
          `AC に対応する SC がありません: ${acId}`,
          "error",
          entry.examplesPath,
          "traceability.layered.acToSc",
          [acId],
        ),
      );
    }
  }

  for (const caseId of caseIds) {
    const refs = caseToSc.get(caseId) ?? new Set<string>();
    if (refs.size === 0) {
      issues.push(
        issue(
          "QFAI-TRACE-113",
          `CASE が SC を参照していません: ${caseId}`,
          "error",
          entry.testCasesPath,
          "traceability.layered.caseToSc",
          [caseId],
        ),
      );
      continue;
    }
    const unknownSc = Array.from(refs).filter((id) => !scIds.has(id));
    if (unknownSc.length > 0) {
      issues.push(
        issue(
          "QFAI-TRACE-114",
          `CASE が未定義の SC を参照しています: ${caseId} -> ${unknownSc.join(", ")}`,
          "error",
          entry.testCasesPath,
          "traceability.layered.caseParentExists",
          [caseId, ...unknownSc],
        ),
      );
    }
  }

  return issues;
}

function validateLayeredHeuristics(
  entry: SpecEntry,
  data: LayeredEdgeData,
): Issue[] {
  const issues: Issue[] = [];

  if (data.brIds.size < data.acIds.size) {
    issues.push(
      issue(
        "QFAI-TRACE-115",
        `BR 件数が AC 件数より少ないため仕様が薄い可能性があります (BR=${data.brIds.size}, AC=${data.acIds.size})`,
        "warning",
        entry.businessRulesPath,
        "traceability.layered.brCoverageHeuristic",
      ),
    );
  }

  if (data.scIds.size < data.brIds.size) {
    issues.push(
      issue(
        "QFAI-TRACE-116",
        `SC 件数が BR 件数より少ないため具体例が不足している可能性があります (SC=${data.scIds.size}, BR=${data.brIds.size})`,
        "warning",
        entry.examplesPath,
        "traceability.layered.scCoverageHeuristic",
      ),
    );
  }

  return issues;
}

async function validateLayeredScCodeReferences(
  root: string,
  config: QfaiConfig,
  scIds: Set<string>,
  specsRoot: string,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const globs = config.validation.traceability.testFileGlobs;
  if (globs.length === 0) {
    return issues;
  }

  const refsResult = await collectScTestReferences(
    root,
    globs,
    config.validation.traceability.testFileExcludeGlobs,
  );
  const refs = refsResult.refs;
  const missing = Array.from(scIds).filter((id) => !refs.has(id));
  if (missing.length > 0) {
    issues.push(
      issue(
        "QFAI-TRACE-117",
        `SC がコード/テスト注釈（QFAI:SC-...）から参照されていません: ${missing.join(
          ", ",
        )}`,
        "warning",
        specsRoot,
        "traceability.layered.scCodeReference",
        missing,
      ),
    );
  }

  return issues;
}

function parseScenarioRefs(
  entry: SpecEntry,
  text: string,
  issues: Issue[],
): { scIds: Set<string>; scToAc: Map<string, Set<string>> } {
  const scIds = new Set<string>();
  const scToAc = new Map<string, Set<string>>();
  const { document, errors } = parseScenarioDocument(text, entry.examplesPath);
  if (!document || errors.length > 0) {
    for (const errorMessage of errors) {
      issues.push(
        issue(
          "QFAI-TRACE-118",
          `Examples の Gherkin 解析に失敗しました: ${errorMessage}`,
          "error",
          entry.examplesPath,
          "traceability.layered.examplesParse",
        ),
      );
    }
    return { scIds, scToAc };
  }

  const featureSpecTags = new Set<string>();
  for (const scenario of document.scenarios) {
    scenario.tags
      .filter((tag) => SPEC_TAG_RE.test(tag))
      .forEach((tag) => {
        featureSpecTags.add(tag);
      });
  }
  const expectedSpecTag = `SPEC-${entry.specNumber}`;
  if (featureSpecTags.size !== 1 || !featureSpecTags.has(expectedSpecTag)) {
    issues.push(
      issue(
        "QFAI-TRACE-119",
        `04_Examples.feature の @SPEC タグは ${expectedSpecTag} を1件だけ指定してください。検出: ${
          Array.from(featureSpecTags).join(", ") || "(none)"
        }`,
        "error",
        entry.examplesPath,
        "traceability.layered.specTagSingle",
      ),
    );
  }

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const spans = buildScenarioSpans(document.scenarios, lines.length);
  for (const span of spans) {
    const scenario = span.scenario;
    const specTags = scenario.tags.filter((tag) => SPEC_TAG_RE.test(tag));
    const scTags = scenario.tags.filter((tag) => SC_TAG_RE.test(tag));
    if (specTags.length !== 1 || specTags[0] !== expectedSpecTag) {
      issues.push(
        issue(
          "QFAI-TRACE-120",
          `Scenario の @SPEC タグが不正です: ${scenario.name} (${
            specTags.join(", ") || "(none)"
          })`,
          "error",
          entry.examplesPath,
          "traceability.layered.scenarioSpecTag",
        ),
      );
    }
    if (scTags.length !== 1) {
      issues.push(
        issue(
          "QFAI-TRACE-121",
          `Scenario は @SC-XXXX-YYYY を1件だけ持つ必要があります: ${scenario.name}`,
          "error",
          entry.examplesPath,
          "traceability.layered.scenarioScTag",
        ),
      );
      continue;
    }
    const scId = scTags[0];
    if (!scId) {
      continue;
    }
    if (!scId.startsWith(`SC-${entry.specNumber}-`)) {
      issues.push(
        issue(
          "QFAI-TRACE-122",
          `Scenario の SC ID namespace が spec 番号と一致しません: ${scId} (expected: SC-${entry.specNumber}-****)`,
          "error",
          entry.examplesPath,
          "traceability.layered.scNamespace",
          [scId],
        ),
      );
    }
    scIds.add(scId);

    const block = lines.slice(span.start, span.end).join("\n");
    const acRefs = new Set(extractMatches(block, AC_ID_RE));
    if (acRefs.size === 0) {
      issues.push(
        issue(
          "QFAI-TRACE-123",
          `Scenario が AC を参照していません。コメントで AC を明示してください: ${scenario.name}`,
          "error",
          entry.examplesPath,
          "traceability.layered.scenarioAcReference",
          [scId],
        ),
      );
      continue;
    }
    scToAc.set(scId, acRefs);
  }

  return { scIds, scToAc };
}

function buildScenarioSpans(
  scenarios: ScenarioNode[],
  lineCount: number,
): Array<{ scenario: ScenarioNode; start: number; end: number }> {
  const enriched = scenarios.map((scenario, index) => ({
    scenario,
    index,
    line: scenario.line ?? index + 1,
  }));
  enriched.sort((a, b) => a.line - b.line);
  const spans: Array<{ scenario: ScenarioNode; start: number; end: number }> =
    [];
  for (let index = 0; index < enriched.length; index += 1) {
    const current = enriched[index];
    const next = enriched[index + 1];
    const start = Math.max((current?.line ?? 1) - 1, 0);
    const end = Math.max(
      next ? (next.line ?? lineCount + 1) - 1 : lineCount,
      start + 1,
    );
    if (!current) {
      continue;
    }
    spans.push({
      scenario: current.scenario,
      start,
      end,
    });
  }
  return spans;
}

function extractTableDefinitionIds(text: string, idRe: RegExp): Set<string> {
  const set = new Set<string>();
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const firstCell = extractFirstTableCell(line);
    if (!firstCell || !idRe.test(firstCell)) {
      continue;
    }
    set.add(firstCell);
  }
  return set;
}

function extractTableDefinitionRefs(
  text: string,
  definitionRe: RegExp,
  refRe: RegExp,
): { definitions: Set<string>; refsByDefinition: Map<string, Set<string>> } {
  const definitions = new Set<string>();
  const refsByDefinition = new Map<string, Set<string>>();
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const firstCell = extractFirstTableCell(line);
    if (!firstCell || !definitionRe.test(firstCell)) {
      continue;
    }
    definitions.add(firstCell);
    const refs = new Set(extractMatches(line, refRe));
    refsByDefinition.set(firstCell, refs);
  }
  return { definitions, refsByDefinition };
}

function extractFirstTableCell(line: string): string | null {
  if (!line.trim().startsWith("|")) {
    return null;
  }
  const match = /^\s*\|\s*([^|]+?)\s*\|/.exec(line);
  if (!match?.[1]) {
    return null;
  }
  return match[1].trim();
}

function extractMatches(text: string, re: RegExp): string[] {
  const values: string[] = [];
  for (const match of text.matchAll(cloneGlobal(re))) {
    const value = match[0];
    if (value) {
      values.push(normalizeScAnnotation(value));
    }
  }
  return Array.from(new Set(values));
}

function normalizeScAnnotation(value: string): string {
  const annotationMatch = /\bQFAI:SC-(\d{4}-\d{4})\b/.exec(value);
  if (!annotationMatch?.[1]) {
    return value;
  }
  return `SC-${annotationMatch[1]}`;
}

function cloneGlobal(re: RegExp): RegExp {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  return new RegExp(re.source, flags);
}

async function readSafe(target: string): Promise<string> {
  try {
    return await readFile(target, "utf-8");
  } catch {
    return "";
  }
}

const SC_TAG_RE_GLOBAL = /\bSC-\d{4}-\d{4}\b/g;
