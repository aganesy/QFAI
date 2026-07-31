import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

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
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "./traceability.js";
import { collectMarkdownItems, uniqueMatches } from "./validators/utils.js";

const US_TEST_ANNOTATION_RE = /\bQFAI:SPEC-(\d{4}):US-(\d{4}(?:-\d{4})?)\b/g;
const TC_TEST_ANNOTATION_RE = /\bQFAI:SPEC-(\d{4}):TC-(\d{4}(?:-\d{4})?)\b/g;
const API_TEST_ANNOTATION_RE = /\bQFAI:CON-API-(\d+)\b/g;

const US_ID_RE = /^US-\d{4}(?:-\d{4})?$/;
const TC_ID_RE = /^TC-\d{4}(?:-\d{4})?$/;
const API_CONTRACT_ID_RE = /^CON-API-\d+$/;
/**
 * Extension set used when the project declares no
 * `validation.traceability.testFileGlobs`. It is a fallback, not the rule: its
 * code extensions are all JavaScript/TypeScript, so a Python / Go / Java /
 * Ruby / Rust repository matched none of its executable test files under it.
 * (`feature` / `md` / `markdown` still match, but those are annotation
 * carriers, not test code — a repo with no Gherkin or markdown ledger matches
 * nothing at all.) `QFAI-ATDD-111/112/113` therefore reported obligations as
 * uncovered no matter how many correctly annotated tests existed.
 */
const DEFAULT_TEST_FILE_GLOB = "**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts,feature,md,markdown}";

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
  /**
   * Every declared `CON-API-*`, active and deferred alike. This is the public
   * meaning the field has always had — adding `x-qfai-status: planned` defers
   * the test obligation, it does not un-declare the contract, so an external
   * consumer using this set for "is this ID declared?" must keep seeing it.
   */
  apiContractIds: Set<string>;
  /** The subset that carries the `QFAI-ATDD-113` obligation. */
  activeApiContractIds: Set<string>;
  /**
   * `CON-API-*` IDs excluded from the `QFAI-ATDD-113` obligation because their
   * contract declares `x-qfai-status: planned`. Reported as `info` so the
   * deferral stays visible instead of silently shrinking the gate.
   */
  deferredApiContractIds: Set<string>;
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

  const [specRefs, collectedApiContracts] = await Promise.all([
    collectSpecRefs(specsRoot),
    collectApiContractIds(contractsApiRoot),
  ]);
  // `active` drives the missing-coverage gate; `declared` (active ∪ deferred)
  // drives the "is this ID known?" check.
  const activeApiContractIds = collectedApiContracts.active;
  const deferredApiContractIds = collectedApiContracts.deferred;
  const declaredApiContractIds = new Set([...activeApiContractIds, ...deferredApiContractIds]);

  const testsRoot = resolvePath(root, config, "testsDir");
  const e2eRoot = path.join(testsRoot, "e2e");
  const apiRoot = path.join(testsRoot, "api");
  const integrationRoot = path.join(testsRoot, "integration");

  const scanGlobs = buildAtddTestGlobs(
    root,
    testsRoot,
    deriveAtddFilePattern(config.validation.traceability.testFileGlobs),
  );
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
      if (kind === "integration" && known) {
        recordSpecRef(tcRefs, ref.spec, `TC-${ref.id}`, file);
      }
      if (kind === "api") {
        recordForbidden(forbiddenTcInApi, file, formatTcRef(ref.spec, ref.id));
      }
      if (kind === "e2e") {
        recordForbidden(forbiddenTcInE2e, file, formatTcRef(ref.spec, ref.id));
      }
    }

    for (const contractId of apiAnnotations) {
      // Declared = active ∪ deferred. `x-qfai-status: planned` defers the
      // API-test *obligation*; it does not un-declare the contract, so writing
      // the test ahead of the slice must not become a `QFAI-ATDD-103` unknown
      // reference.
      const known = declaredApiContractIds.has(contractId);
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
    apiContractIds: activeApiContractIds,
    usRefs,
    tcRefs,
    apiRefs,
  });

  return {
    specsRoot,
    contractsApiRoot,
    specUsIds,
    specTcIds,
    apiContractIds: declaredApiContractIds,
    activeApiContractIds,
    deferredApiContractIds,
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
}> {
  const entries = await collectSpecEntries(specsRoot);
  const us = new Map<string, Set<string>>();
  const tc = new Map<string, Set<string>>();

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
  }

  return { us, tc };
}

export const PLANNED_CONTRACT_KEY = "x-qfai-status";
const PLANNED_CONTRACT_VALUE = "planned";

/**
 * Fallback marker for a document that does not parse: an unindented
 * `x-qfai-status: planned`, optionally as a comment. Column 0 is required, so
 * the marker cannot be mistaken for one nested under an operation.
 */
/** Quote a value for literal use inside a RegExp source. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Both interpolations are escaped. They are plain identifiers today, so this
// changes nothing now; it keeps a future key containing `.` or `-`-in-a-class
// from silently turning into a pattern that matches more than the literal.
const PLANNED_CONTRACT_RE = new RegExp(
  `^(?:#[ \\t]*)?["']?${escapeRegExp(PLANNED_CONTRACT_KEY)}["']?[ \\t]*:[ \\t]*["']?${escapeRegExp(
    PLANNED_CONTRACT_VALUE,
  )}["']?[ \\t]*$`,
  "im",
);

/**
 * True when the contract declares itself not yet implemented.
 *
 * `/qfai-sdd` authors contracts in Phase 0 (Contracts-first) but slices them in
 * Phase 2, so between the second contract and the last slice every declared
 * `CON-API-*` would otherwise be a `QFAI-ATDD-113` error. The marker makes the
 * deferral explicit and reviewable in the contract itself.
 *
 * The marker is only honoured at the **document root**. A text scan that
 * accepted any indentation would let an `x-qfai-status: planned` on a single
 * OpenAPI operation defer the whole file, silently dropping the API-test
 * obligation for every other `CON-API-*` it declares. The document is therefore
 * parsed (YAML is a superset of JSON, so both contract formats go through the
 * same path) and only a top-level key counts. An unparseable document falls
 * back to a column-0 text match, which cannot see a nested key either.
 */
export function isPlannedApiContract(text: string): boolean {
  // The overwhelmingly common contract does not carry the marker at all, and
  // this runs once per contract file during collection. A substring test skips
  // the parse for those: the key must appear literally somewhere for any of the
  // paths below to return true, so a miss here is a definitive `false`.
  if (!text.includes(PLANNED_CONTRACT_KEY)) {
    return false;
  }

  let parsed: unknown;
  try {
    // `maxAliasCount: 0` disables alias expansion. Contracts are repository
    // files, but they are also the one input a PR author fully controls, and
    // an alias bomb (`*a` referenced repeatedly through nested anchors) turns a
    // small document into an out-of-memory CI failure. No contract format needs
    // aliases; a document that uses them is rejected and falls through to the
    // column-0 text match below.
    parsed = parseYaml(text, { maxAliasCount: 0 });
  } catch {
    // Malformed contract: other validators report the syntax error. Here the
    // conservative reading is the column-0 marker only.
    return PLANNED_CONTRACT_RE.test(text);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return PLANNED_CONTRACT_RE.test(text);
  }
  if (!(PLANNED_CONTRACT_KEY in parsed)) {
    // A commented-out marker survives parsing as nothing at all, so still allow
    // the column-0 comment form.
    return PLANNED_CONTRACT_RE.test(text);
  }
  const status: unknown = Reflect.get(parsed, PLANNED_CONTRACT_KEY);
  return typeof status === "string" && status.trim().toLowerCase() === PLANNED_CONTRACT_VALUE;
}

type CollectedApiContracts = {
  active: Set<string>;
  deferred: Set<string>;
};

async function collectApiContractIds(apiRoot: string): Promise<CollectedApiContracts> {
  const files = await collectApiContractFiles(apiRoot);
  const active = new Set<string>();
  const deferred = new Set<string>();

  for (const file of files) {
    const text = await readSafe(file);
    const planned = isPlannedApiContract(text);
    const declared = extractDeclaredContractIds(text);
    for (const id of declared) {
      const normalized = id.toUpperCase();
      if (API_CONTRACT_ID_RE.test(normalized)) {
        (planned ? deferred : active).add(normalized);
      }
    }
  }

  return { active, deferred };
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

/**
 * Extensions the ATDD scan must always read, whatever the project configures.
 *
 * `validation.traceability.testFileGlobs` describes executable test *code*, but
 * annotations also legitimately live in Gherkin features and in markdown
 * traceability files (this repository carries its own `US-*` annotations in
 * `tests/e2e/qfai-traceability.md`). These are annotation carriers, not code,
 * so they are unioned in rather than replaced.
 */
const STRUCTURAL_ANNOTATION_EXTENSIONS = ["feature", "md", "markdown"] as const;

/**
 * Derives the per-layer file pattern from the project's configured
 * `testFileGlobs`, so a non-JS repository is scanned with its own extensions.
 *
 * Configured globs describe whole paths (`tests/**\/*.py`); the ATDD scan needs
 * a pattern to append under `tests/{e2e,api,integration}/`. The extension set is
 * therefore lifted out of them, unioned with the structural annotation carriers
 * above, and recombined. When no extension can be recovered, the JS/TS default
 * is used.
 */
export function deriveAtddFilePattern(testFileGlobs: readonly string[]): string {
  const extensions = new Set<string>();
  for (const glob of testFileGlobs) {
    for (const match of glob.matchAll(/\.\{([^}]+)\}$/g)) {
      for (const ext of (match[1] ?? "").split(",")) {
        const trimmed = ext.trim();
        if (trimmed.length > 0) extensions.add(trimmed);
      }
    }
    const single = /\.([A-Za-z0-9]+)$/.exec(glob);
    if (single?.[1]) {
      extensions.add(single[1]);
    }
  }
  if (extensions.size === 0) {
    return DEFAULT_TEST_FILE_GLOB;
  }
  for (const ext of STRUCTURAL_ANNOTATION_EXTENSIONS) {
    extensions.add(ext);
  }
  // Always the brace form: the loop above unions in
  // STRUCTURAL_ANNOTATION_EXTENSIONS, three entries, so a non-empty set can
  // never have one member and a `**/*.<ext>` branch would be dead code.
  const sorted = Array.from(extensions).sort();
  return `**/*.{${sorted.join(",")}}`;
}

function buildAtddTestGlobs(root: string, testsRoot: string, filePattern: string): string[] {
  const relativeTestsRoot = path.relative(root, testsRoot);
  const isInsideRoot =
    relativeTestsRoot.length === 0 ||
    (!relativeTestsRoot.startsWith("..") && !path.isAbsolute(relativeTestsRoot));
  const base = isInsideRoot
    ? toPosixPath(relativeTestsRoot.length === 0 ? "." : relativeTestsRoot)
    : toPosixPath(testsRoot);
  const normalizedBase = base.replace(/\/+$/, "");
  return [
    `${normalizedBase}/e2e/${filePattern}`,
    `${normalizedBase}/api/${filePattern}`,
    `${normalizedBase}/integration/${filePattern}`,
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
