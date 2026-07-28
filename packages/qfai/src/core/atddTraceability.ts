import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import { extractDeclaredContractIds } from "./contractsDecl.js";
import { collectApiContractFiles } from "./discovery.js";
import {
  collectFilesByGlobs,
  DEFAULT_GLOB_FILE_LIMIT,
  type CollectFilesByGlobsResult,
} from "./fs.js";
import { collectSpecEntries } from "./specLayout.js";
import { parseAllMarkdownTables } from "./specPackParsers.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "./traceability.js";
import { collectMarkdownItems, uniqueMatches } from "./validators/utils.js";

const US_TEST_ANNOTATION_RE = /\bQFAI:SPEC-(\d{4}):US-(\d{4}(?:-\d{4})?)\b/g;
const TC_TEST_ANNOTATION_RE = /\bQFAI:SPEC-(\d{4}):TC-(\d{4}(?:-\d{4})?)\b/g;
const API_TEST_ANNOTATION_RE = /\bQFAI:CON-API-(\d+)\b/g;

const US_ID_RE = /^US-\d{4}(?:-\d{4})?$/;
const TC_ID_RE = /^TC-\d{4}(?:-\d{4})?$/;
const API_CONTRACT_ID_RE = /^CON-API-\d+$/;
const TEST_FILE_GLOB = "**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts,feature,md,markdown}";

export type AtddTestKind = "e2e" | "api" | "integration";

export type AtddUnknownRefKind = "us" | "tc" | "conApi";

export type AtddUnknownRef = {
  file: string;
  token: string;
  kind: AtddUnknownRefKind;
};

export type AtddForbiddenRef = {
  file: string;
  ids: string[];
};

export type AtddSpecRefs = Map<string, Map<string, Set<string>>>;

export type AtddTraceabilityScan = {
  globs: string[];
  matchedFileCount: number;
  truncated: boolean;
  limit: number;
};

export type AtddTraceabilityMissing = {
  us: string[];
  tc: string[];
  conApi: string[];
};

export type AtddCodeTraceabilityResult = {
  specsRoot: string;
  contractsApiRoot: string;
  specUsIds: Map<string, Set<string>>;
  specTcIds: Map<string, Set<string>>;
  apiContractIds: Set<string>;
  refs: {
    us: AtddSpecRefs;
    tc: AtddSpecRefs;
    api: Map<string, Set<string>>;
  };
  unknown: AtddUnknownRef[];
  forbidden: {
    tcInApi: AtddForbiddenRef[];
    tcInE2e: AtddForbiddenRef[];
  };
  missing: AtddTraceabilityMissing;
  scan: AtddTraceabilityScan;
};

export async function evaluateAtddCodeTraceability(
  root: string,
  config: QfaiConfig,
): Promise<AtddCodeTraceabilityResult> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const contractsRoot = resolvePath(root, config, "contractsDir");
  const contractsApiRoot = path.join(contractsRoot, "api");

  const [specRefs, apiContractIds] = await Promise.all([
    collectSpecRefs(specsRoot),
    collectApiContractIds(contractsApiRoot),
  ]);

  const testsRoot = resolvePath(root, config, "testsDir");
  const e2eRoot = path.join(testsRoot, "e2e");
  const apiRoot = path.join(testsRoot, "api");
  const integrationRoot = path.join(testsRoot, "integration");

  const scanGlobs = buildAtddTestGlobs(root, testsRoot);
  const scanResult = await collectTestFiles(root, scanGlobs);

  const usRefs: AtddSpecRefs = new Map<string, Map<string, Set<string>>>();
  const tcRefs: AtddSpecRefs = new Map<string, Map<string, Set<string>>>();
  const apiRefs = new Map<string, Set<string>>();

  const unknown: AtddUnknownRef[] = [];
  const unknownDedup = new Set<string>();

  const forbiddenTcInApi = new Map<string, Set<string>>();
  const forbiddenTcInE2e = new Map<string, Set<string>>();

  const specUsIds = specRefs.us;
  const specTcIds = specRefs.tc;
  const tcLevels = specRefs.tcLevels;

  for (const file of scanResult.files) {
    const kind = resolveTestKind(file, {
      e2eRoot,
      apiRoot,
      integrationRoot,
    });
    if (!kind) {
      continue;
    }

    const text = await readSafe(file);
    const usAnnotations = extractSpecScopedAnnotations(text, US_TEST_ANNOTATION_RE);
    const tcAnnotations = extractSpecScopedAnnotations(text, TC_TEST_ANNOTATION_RE);
    const apiAnnotations = extractApiContractAnnotations(text);

    for (const ref of usAnnotations) {
      const token = formatUsToken(ref.spec, ref.id);
      const known = hasSpecId(specUsIds, ref.spec, `US-${ref.id}`);
      if (!known) {
        pushUnknown(unknown, unknownDedup, file, token, "us");
        continue;
      }
      if (kind === "e2e") {
        recordSpecRef(usRefs, ref.spec, `US-${ref.id}`, file);
      }
    }

    for (const ref of tcAnnotations) {
      const token = formatTcToken(ref.spec, ref.id);
      const known = hasSpecId(specTcIds, ref.spec, `TC-${ref.id}`);
      if (!known) {
        pushUnknown(unknown, unknownDedup, file, token, "tc");
      }
      const homeKind = resolveTcHomeKind(tcLevels, ref.spec, `TC-${ref.id}`);
      if (kind === homeKind && known) {
        recordSpecRef(tcRefs, ref.spec, `TC-${ref.id}`, file);
      }
      // Only flag a placement that is NOT the TC's declared home. Reporting an
      // annotation as forbidden while also declining to count it produced two
      // errors from one correct action.
      if (kind === "api" && homeKind !== "api") {
        recordForbidden(forbiddenTcInApi, file, formatTcRef(ref.spec, ref.id));
      }
      if (kind === "e2e" && homeKind !== "e2e") {
        recordForbidden(forbiddenTcInE2e, file, formatTcRef(ref.spec, ref.id));
      }
    }

    for (const contractId of apiAnnotations) {
      const known = apiContractIds.has(contractId);
      if (!known) {
        pushUnknown(unknown, unknownDedup, file, `QFAI:${contractId}`, "conApi");
        continue;
      }
      if (kind === "api") {
        recordApiRef(apiRefs, contractId, file);
      }
    }
  }

  const missing = buildMissingRefs({
    specUsIds,
    specTcIds,
    apiContractIds,
    usRefs,
    tcRefs,
    apiRefs,
  });

  return {
    specsRoot,
    contractsApiRoot,
    specUsIds,
    specTcIds,
    apiContractIds,
    refs: {
      us: usRefs,
      tc: tcRefs,
      api: apiRefs,
    },
    unknown: unknown.sort(compareUnknownRef),
    forbidden: {
      tcInApi: toForbiddenList(forbiddenTcInApi),
      tcInE2e: toForbiddenList(forbiddenTcInE2e),
    },
    missing,
    scan: {
      globs: scanGlobs,
      matchedFileCount: scanResult.matchedFileCount,
      truncated: scanResult.truncated,
      limit: scanResult.limit,
    },
  };
}

type SpecScopedRef = {
  spec: string;
  id: string;
};

async function collectSpecRefs(specsRoot: string): Promise<{
  us: Map<string, Set<string>>;
  tc: Map<string, Set<string>>;
  /** `spec -> TC-ID -> declared Level`, lower-cased. Absent when no Level column. */
  tcLevels: Map<string, Map<string, string>>;
}> {
  const entries = await collectSpecEntries(specsRoot);
  const us = new Map<string, Set<string>>();
  const tc = new Map<string, Set<string>>();
  const tcLevels = new Map<string, Map<string, string>>();

  for (const entry of entries) {
    const [usText, tcText] = await Promise.all([
      readSafe(entry.userStoriesPath),
      readSafe(entry.testCasesPath),
    ]);

    const usIds = collectShortIds(usText, "US");
    const tcIds = collectShortIds(tcText, "TC");

    if (usIds.size > 0) {
      us.set(entry.specNumber, usIds);
    }
    if (tcIds.size > 0) {
      tc.set(entry.specNumber, tcIds);
    }

    const levels = collectTcLevels(tcText);
    if (levels.size > 0) {
      tcLevels.set(entry.specNumber, levels);
    }
  }

  return { us, tc, tcLevels };
}

/**
 * Reads the `Level` column of `06_Test-Cases.md` so the TC obligation can be
 * routed by declared layer instead of being hard-pinned to
 * `tests/integration/**`.
 */
function collectTcLevels(tcText: string): Map<string, string> {
  const levels = new Map<string, string>();
  const table = parseAllMarkdownTables(tcText).find((candidate) =>
    candidate.headers.some((header: string) => header.trim() === "TC-ID"),
  );
  if (!table) {
    return levels;
  }
  const headers = table.headers.map((header: string) => header.trim());
  const idIndex = headers.indexOf("TC-ID");
  const levelIndex = headers.indexOf("Level");
  if (idIndex < 0 || levelIndex < 0) {
    return levels;
  }
  for (const row of table.rows) {
    const id = (row[idIndex] ?? "").trim().toUpperCase();
    const level = (row[levelIndex] ?? "").trim().toLowerCase();
    if (id.length > 0 && level.length > 0) {
      levels.set(id, level);
    }
  }
  return levels;
}

/** Test directory a declared `Level` routes its TC obligation to. */
const LEVEL_TO_TEST_KIND: Record<string, AtddTestKind | undefined> = {
  l3: "integration",
  integration: "integration",
  l4: "api",
  api: "api",
  l5: "e2e",
  e2e: "e2e",
};

/**
 * Where a TC's annotation legally lives.
 *
 * Defaults to `integration` — the historical hard-coded answer — so a spec
 * with no `Level` column behaves exactly as before. A TC that declares an
 * API-level obligation routes to `tests/api/**`, which was previously both
 * uncounted and reported as forbidden: two errors from one correct placement.
 */
function resolveTcHomeKind(
  tcLevels: Map<string, Map<string, string>>,
  spec: string,
  tcId: string,
): AtddTestKind {
  const level = tcLevels.get(spec)?.get(tcId.toUpperCase());
  if (level === undefined) {
    return "integration";
  }
  return LEVEL_TO_TEST_KIND[level] ?? "integration";
}

async function collectApiContractIds(apiRoot: string): Promise<Set<string>> {
  const files = await collectApiContractFiles(apiRoot);
  const ids = new Set<string>();

  for (const file of files) {
    const text = await readSafe(file);
    const declared = extractDeclaredContractIds(text);
    for (const id of declared) {
      const normalized = id.toUpperCase();
      if (API_CONTRACT_ID_RE.test(normalized)) {
        ids.add(normalized);
      }
    }
  }

  return ids;
}

function collectShortIds(text: string, prefix: "US" | "TC"): Set<string> {
  const ids = new Set<string>();
  const headingIds = collectMarkdownItems(text, prefix).map((item) => item.id);
  const pattern = prefix === "US" ? /\bUS-\d{4}(?:-\d{4})?\b/g : /\bTC-\d{4}(?:-\d{4})?\b/g;
  const looseIds = uniqueMatches(text, pattern);
  for (const id of [...headingIds, ...looseIds]) {
    const normalized = id.toUpperCase();
    if (
      (prefix === "US" && US_ID_RE.test(normalized)) ||
      (prefix === "TC" && TC_ID_RE.test(normalized))
    ) {
      ids.add(normalized);
    }
  }
  return ids;
}

function buildAtddTestGlobs(root: string, testsRoot: string): string[] {
  const relativeTestsRoot = path.relative(root, testsRoot);
  const isInsideRoot =
    relativeTestsRoot.length === 0 ||
    (!relativeTestsRoot.startsWith("..") && !path.isAbsolute(relativeTestsRoot));
  const base = isInsideRoot
    ? toPosixPath(relativeTestsRoot.length === 0 ? "." : relativeTestsRoot)
    : toPosixPath(testsRoot);
  const normalizedBase = base.replace(/\/+$/, "");
  return [
    `${normalizedBase}/e2e/${TEST_FILE_GLOB}`,
    `${normalizedBase}/api/${TEST_FILE_GLOB}`,
    `${normalizedBase}/integration/${TEST_FILE_GLOB}`,
  ];
}

async function collectTestFiles(root: string, globs: string[]): Promise<CollectFilesByGlobsResult> {
  return collectFilesByGlobs(root, {
    globs,
    ignore: DEFAULT_TEST_FILE_EXCLUDE_GLOBS,
    limit: DEFAULT_GLOB_FILE_LIMIT,
  });
}

function resolveTestKind(
  filePath: string,
  roots: { e2eRoot: string; apiRoot: string; integrationRoot: string },
): AtddTestKind | null {
  if (isWithinPath(roots.e2eRoot, filePath)) {
    return "e2e";
  }
  if (isWithinPath(roots.apiRoot, filePath)) {
    return "api";
  }
  if (isWithinPath(roots.integrationRoot, filePath)) {
    return "integration";
  }
  return null;
}

function isWithinPath(base: string, target: string): boolean {
  const relative = path.relative(base, target);
  if (relative === "") {
    return true;
  }
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function extractSpecScopedAnnotations(text: string, pattern: RegExp): SpecScopedRef[] {
  const refs: SpecScopedRef[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(cloneGlobal(pattern))) {
    const spec = match[1];
    const id = match[2];
    if (!spec || !id) {
      continue;
    }
    const key = `${spec}:${id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    refs.push({ spec, id });
  }

  return refs;
}

function extractApiContractAnnotations(text: string): string[] {
  const ids = new Set<string>();
  for (const match of text.matchAll(cloneGlobal(API_TEST_ANNOTATION_RE))) {
    const short = match[1];
    if (!short) {
      continue;
    }
    ids.add(`CON-API-${short}`);
  }
  return Array.from(ids).sort((left, right) => left.localeCompare(right));
}

function recordSpecRef(refs: AtddSpecRefs, specNumber: string, id: string, file: string): void {
  const bySpec = refs.get(specNumber) ?? new Map<string, Set<string>>();
  const files = bySpec.get(id) ?? new Set<string>();
  files.add(path.normalize(file));
  bySpec.set(id, files);
  refs.set(specNumber, bySpec);
}

function recordApiRef(refs: Map<string, Set<string>>, id: string, file: string): void {
  const files = refs.get(id) ?? new Set<string>();
  files.add(path.normalize(file));
  refs.set(id, files);
}

function recordForbidden(refs: Map<string, Set<string>>, file: string, id: string): void {
  const files = refs.get(path.normalize(file)) ?? new Set<string>();
  files.add(id);
  refs.set(path.normalize(file), files);
}

function pushUnknown(
  unknown: AtddUnknownRef[],
  dedup: Set<string>,
  file: string,
  token: string,
  kind: AtddUnknownRefKind,
): void {
  const normalizedFile = path.normalize(file);
  const key = `${kind}|${normalizedFile}|${token}`;
  if (dedup.has(key)) {
    return;
  }
  dedup.add(key);
  unknown.push({
    file: normalizedFile,
    token,
    kind,
  });
}

function buildMissingRefs(input: {
  specUsIds: Map<string, Set<string>>;
  specTcIds: Map<string, Set<string>>;
  apiContractIds: Set<string>;
  usRefs: AtddSpecRefs;
  tcRefs: AtddSpecRefs;
  apiRefs: Map<string, Set<string>>;
}): AtddTraceabilityMissing {
  const missingUs: string[] = [];
  for (const [spec, ids] of input.specUsIds.entries()) {
    const refsBySpec = input.usRefs.get(spec);
    for (const id of sortStrings(ids)) {
      const matchedFiles = refsBySpec?.get(id);
      if (!matchedFiles || matchedFiles.size === 0) {
        missingUs.push(formatUsRef(spec, id.replace(/^US-/, "")));
      }
    }
  }

  const missingTc: string[] = [];
  for (const [spec, ids] of input.specTcIds.entries()) {
    const refsBySpec = input.tcRefs.get(spec);
    for (const id of sortStrings(ids)) {
      const matchedFiles = refsBySpec?.get(id);
      if (!matchedFiles || matchedFiles.size === 0) {
        missingTc.push(formatTcRef(spec, id.replace(/^TC-/, "")));
      }
    }
  }

  const missingConApi = sortStrings(input.apiContractIds).filter((id) => {
    const matchedFiles = input.apiRefs.get(id);
    return !matchedFiles || matchedFiles.size === 0;
  });

  return {
    us: missingUs.sort((left, right) => left.localeCompare(right)),
    tc: missingTc.sort((left, right) => left.localeCompare(right)),
    conApi: missingConApi.sort((left, right) => left.localeCompare(right)),
  };
}

function hasSpecId(target: Map<string, Set<string>>, specNumber: string, id: string): boolean {
  return target.get(specNumber)?.has(id.toUpperCase()) ?? false;
}

function toForbiddenList(refs: Map<string, Set<string>>): AtddForbiddenRef[] {
  return Array.from(refs.entries())
    .map(([file, ids]) => ({
      file,
      ids: sortStrings(ids),
    }))
    .sort((left, right) => left.file.localeCompare(right.file));
}

function formatUsToken(spec: string, id: string): string {
  return `QFAI:SPEC-${spec}:US-${id}`;
}

function formatTcToken(spec: string, id: string): string {
  return `QFAI:SPEC-${spec}:TC-${id}`;
}

function formatUsRef(spec: string, id: string): string {
  return `SPEC-${spec}:US-${id}`;
}

function formatTcRef(spec: string, id: string): string {
  return `SPEC-${spec}:TC-${id}`;
}

function compareUnknownRef(left: AtddUnknownRef, right: AtddUnknownRef): number {
  if (left.kind !== right.kind) {
    return left.kind.localeCompare(right.kind);
  }
  if (left.file !== right.file) {
    return left.file.localeCompare(right.file);
  }
  return left.token.localeCompare(right.token);
}

function sortStrings(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function cloneGlobal(pattern: RegExp): RegExp {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

async function readSafe(target: string): Promise<string> {
  try {
    return await readFile(target, "utf-8");
  } catch {
    return "";
  }
}
