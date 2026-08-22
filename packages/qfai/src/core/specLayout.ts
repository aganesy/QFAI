import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "./fs/errno.js";
import {
  isLifecycleDeclarationComplete,
  parseSpecLifecycle,
  type SpecLifecycle,
  type SpecStatus,
} from "./parse/spec.js";

const SPEC_DIR_RE = /^spec-\d{4}$/i;
// Canonical: catalog/ — registry artifacts (filename lists, lookup
// tables) live in catalog, not manifest. Legacy fallback: manifest/
// during the compatibility window so projects that haven't yet run
// `qfai init --upgrade-assistant-tree` still resolve the filename
// registry.
const SPEC_REQUIRED_FILES_CATALOG_PATH = path.join(
  "assistant",
  "catalog",
  "spec_required_files.json",
);
const SPEC_REQUIRED_FILES_MANIFEST_PATH = path.join(
  "assistant",
  "manifest",
  "spec_required_files.json",
);

export const REQUIRED_SPEC_PACK_FILES = [
  "01_Spec.md",
  "02_Objective.md",
  "03_Initiative.md",
  "04_Capability.md",
  "05_Business-flow.feature",
  "06_User-stories.md",
  "07_Acceptance-criteria.md",
  "08_Business-rules.md",
  "09_Examples.feature",
  "10_Test-cases.md",
  "11_Contracts.md",
  "12_Glossary.md",
  "13_Constraints.md",
  "14_Decisions.md",
  "15_Open-questions.md",
  "16_Traceability-ledger.md",
  "17_Plan.md",
  "18_delta.md",
] as const;

export type RequiredSpecPackFile = (typeof REQUIRED_SPEC_PACK_FILES)[number];

export const REQUIRED_LAYERED_SPEC_FILES_V1417 = [
  "01_Spec.md",
  "02_User-stories.md",
  "03_Acceptance-criteria.md",
  "04_Business-rules.md",
  "05_Examples.feature",
  "06_Test-cases.md",
  "07_Decisions.md",
  "08_Open-questions.md",
  "09_delta.md",
] as const;

export const REQUIRED_LAYERED_SHARED_FILES_V1417 = [
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

/**
 * The per-spec required set.
 *
 * MUST stay byte-identical to `spec_dir` in
 * `assets/init/.qfai/assistant/catalog/spec_required_files.json`, which
 * `qfai init` copies into every project and which
 * `resolveLayeredRequiredFileSets` prefers over these constants. When the two
 * disagreed, which registry applied depended on whether a project had run
 * `qfai init` — see `tests/assets/specRequiredFilesParity.test.ts`.
 *
 * `10_Plan.md` is required: `spec-traceability-rules.md` lists it among the
 * per-spec files and `sdd-quality-gate.md` gates on it. It was in the catalog
 * and missing here, so a project that never ran init did not have to produce it.
 */
export const REQUIRED_LAYERED_SPEC_FILES_V1421 = [
  "01_Spec.md",
  "02_User-stories.md",
  "03_Acceptance-Criteria.md",
  "04_Business-Rules.md",
  "05_Examples.md",
  "06_Test-Cases.md",
  "07_Decisions.md",
  "08_Open-questions.md",
  "09_delta.md",
  "10_Plan.md",
] as const;

/**
 * The `_policies` required set. Same parity obligation as
 * {@link REQUIRED_LAYERED_SPEC_FILES_V1421}.
 *
 * `11_Slice-Policy.md` was here and missing from the catalog, so as shipped
 * `E_SPEC_MISSING_FILESET` could never fire for it — the one `_policies` file
 * `workflow.md` makes a precondition for every CREATE / UPDATE / DELETE
 * decision.
 */
export const REQUIRED_LAYERED_SHARED_FILES_V1421 = [
  "01_Objective.md",
  "02_Initiative.md",
  "03_Capabilities.md",
  "04_Business-Flow.md",
  "05_Contracts.md",
  "06_Glossary.md",
  "07_Constraints.md",
  "08_Decisions.md",
  "09_Open-questions.md",
  "10_delta.md",
  "11_Slice-Policy.md",
] as const;

export const REQUIRED_LAYERED_SPEC_FILES_V1416 = [
  "01_User-stories.md",
  "02_Acceptance-criteria.md",
  "03_Business-rules.md",
  "04_Examples.feature",
  "05_Test-cases.md",
] as const;

export const REQUIRED_LAYERED_SPEC_FILES = REQUIRED_LAYERED_SPEC_FILES_V1421;

type LayeredRequiredFileSets = {
  specDir: readonly string[];
  sharedDir: readonly string[];
};

export type SpecLayoutKind = "spec-pack" | "layered" | "legacy";
export type LayeredStyle = "v1416" | "v1417" | "v1421";

export type SpecEntry = {
  dir: string;
  layout: SpecLayoutKind;
  layeredStyle: LayeredStyle | null;
  specNumber: string;
  /**
   * The spec's lifecycle, read from the `Status:` bullet of its header block —
   * present only when the declaration is one a caller may act on.
   *
   * Absent for a spec with no bullet, an unparseable value, an unreadable spec
   * file, a retirement missing the companion field it requires
   * (`Superseded-by` / `Deprecated-at`), or a `Superseded-by` that names no
   * spec able to inherit the work — a spec that does not exist, the spec
   * itself, or one that is itself retired. Every one of those is reported by
   * its own rule (`QFAI-STATUS-001` … `-006`), and a caller that branches on
   * the lifecycle must treat them all as still current.
   */
  status?: SpecStatus;
  // Backwards-compatible field name. Points to `.qfai/specs/_policies`.
  sharedDir: string;
  requiredFiles: Partial<Record<RequiredSpecPackFile, string>>;
  requiredLayeredFiles: Partial<Record<string, string>>;
  requiredLayeredFileNames: readonly string[];
  requiredSharedFiles: Partial<Record<string, string>>;
  requiredSharedFileNames: readonly string[];
  deltaCandidates: string[];
  // 内部参照用の互換プロパティ
  specPath: string;
  scenarioPath: string;
  caseCataloguePath: string;
  traceabilityMatrixPath: string;
  legacyImplementationBriefPath: string;
  specMetaPath: string;
  objectivePath: string;
  initiativePath: string;
  capabilityPath: string;
  flowPath: string;
  userStoriesPath: string;
  acceptanceCriteriaPath: string;
  businessRulesPath: string;
  examplesPath: string;
  testCasesPath: string;
  contractsIndexPath: string;
  glossaryPath: string;
  constraintsPath: string;
  decisionsPath: string;
  openQuestionsPath: string;
  traceabilityLedgerPath: string;
  planPath: string;
  deltaPath: string;
};

export async function collectSpecEntries(specsRoot: string): Promise<SpecEntry[]> {
  const dirs = await listSpecDirs(specsRoot);
  const requiredFileSets = await resolveLayeredRequiredFileSets(specsRoot);
  const entries = await Promise.all(
    dirs.map(async (dir) => {
      const specNumber = extractSpecNumberFromDir(dir);
      const policiesDir = path.join(specsRoot, "_policies");
      const fileNames = await listFileNames(dir);
      const normalizedFileNames = new Set(
        Array.from(fileNames, (fileName) => fileName.toLowerCase()),
      );
      const hasLayeredBase =
        normalizedFileNames.has("01_spec.md") && normalizedFileNames.has("02_user-stories.md");
      // All four probes are case-exact. Filename casing is what distinguishes
      // v1417 from v1421, so mixing a case-insensitive probe for
      // `05_Examples.md` with case-exact probes for the other three made the
      // style verdict depend on *which* file happened to be mis-cased.
      const hasLayeredV1421Markers =
        fileNames.has("05_Examples.md") ||
        fileNames.has("03_Acceptance-Criteria.md") ||
        fileNames.has("04_Business-Rules.md") ||
        fileNames.has("06_Test-Cases.md");
      const hasLayeredV1421 = hasLayeredBase && hasLayeredV1421Markers;
      const hasLayeredV1417 = hasLayeredBase && !hasLayeredV1421;
      const hasLayeredV1416 = normalizedFileNames.has("01_user-stories.md");
      const hasSpecPack =
        normalizedFileNames.has("01_spec.md") && normalizedFileNames.has("02_objective.md");
      // Prefer modern names when both legacy and modern files coexist.
      const hasLegacy =
        normalizedFileNames.has("spec.md") && !normalizedFileNames.has("01_spec.md");
      const deltaCandidates = resolveDeltaCandidates(dir, fileNames);

      if (hasLayeredV1421) {
        return createLayeredEntry({
          dir,
          specNumber,
          sharedDir: policiesDir,
          style: "v1421",
          requiredFileSets,
          deltaCandidates,
        });
      }
      if (hasLayeredV1417) {
        return createLayeredEntry({
          dir,
          specNumber,
          sharedDir: policiesDir,
          style: "v1417",
          requiredFileSets,
          deltaCandidates,
        });
      }
      if (hasLayeredV1416) {
        return createLayeredEntry({
          dir,
          specNumber,
          sharedDir: policiesDir,
          style: "v1416",
          requiredFileSets,
          deltaCandidates,
        });
      }
      if (hasSpecPack) {
        return createSpecPackEntry({
          dir,
          specNumber,
          sharedDir: policiesDir,
          requiredFileSets,
          deltaCandidates,
        });
      }
      if (hasLegacy) {
        return createLegacyEntry({
          dir,
          specNumber,
          sharedDir: policiesDir,
          requiredFileSets,
          deltaCandidates,
        });
      }
      // Unknown/empty directory fallback: keep spec-pack as default so required
      // file validation can report deterministic "missing file set" diagnostics.
      return createSpecPackEntry({
        dir,
        specNumber,
        sharedDir: policiesDir,
        requiredFileSets,
        deltaCandidates,
      });
    }),
  );
  // Every spec's declaration is read before any of them is resolved: a
  // `superseded` spec retires only if some *other*, still-current spec is
  // there to inherit its work, and that is a question about the neighbour's
  // declaration, not its own.
  const declarations = new Map<string, SpecLifecycle | undefined>();
  await Promise.all(
    entries.map(async (entry) => {
      declarations.set(`spec-${entry.specNumber}`, await readSpecLifecycle(entry.specMetaPath));
    }),
  );
  const withStatus = entries.map((entry) => {
    const status = resolveSpecStatus(`spec-${entry.specNumber}`, declarations);
    return status === undefined ? entry : { ...entry, status };
  });
  return withStatus.sort((a, b) => a.dir.localeCompare(b.dir));
}

/**
 * Read one spec's lifecycle declaration from disk, as written.
 *
 * A spec file that cannot be read yields no declaration rather than an
 * exception: the layout collector is the entry point for the very validators
 * that report a missing or unreadable spec file, so throwing here would replace
 * those findings with a crash.
 */
async function readSpecLifecycle(specMetaPath: string): Promise<SpecLifecycle | undefined> {
  let md: string;
  try {
    md = await readFile(specMetaPath, "utf-8");
  } catch {
    return undefined;
  }
  return parseSpecLifecycle(md);
}

/**
 * The lifecycle a caller may act on, or `undefined` when the spec has to keep
 * being treated as current.
 *
 * An absent or unparseable `Status:` yields nothing, and so does an incomplete
 * retirement — see {@link isLifecycleDeclarationComplete}. The gate lives here
 * rather than in each consumer so that every reader of `SpecEntry.status`
 * retires a spec on the same evidence.
 *
 * `superseded` additionally requires a successor that can actually inherit the
 * work — one declaring `Status: active` for itself. SUPERSEDE retires a spec by
 * moving its obligations to another one, so a `Superseded-by` that names
 * nothing, names the spec itself, or names a spec that is retired or declares
 * no readable lifecycle means the obligations moved nowhere — and demoting
 * the ledger would drop every outstanding row out of the gate with no spec
 * left owing it. `QFAI-STATUS-004` reports a dangling reference, but only
 * under `--profile full`; `--profile tdd` runs `validateTddList` without
 * `validateSpecPacks`, and that is the profile the completion gate uses.
 */
function resolveSpecStatus(
  specId: string,
  declarations: ReadonlyMap<string, SpecLifecycle | undefined>,
): SpecStatus | undefined {
  const lifecycle = declarations.get(specId);
  if (lifecycle === undefined || !isLifecycleDeclarationComplete(lifecycle)) {
    return undefined;
  }
  if (lifecycle.status !== "superseded") {
    return lifecycle.status;
  }
  const successorId = lifecycle.supersededBy;
  if (successorId === undefined || successorId === specId) {
    return undefined;
  }
  // Only an explicit `Status: active` successor is accepted. A successor that
  // declares a retirement of its own is not the spec the work landed on —
  // whether or not that declaration is complete enough to retire the successor
  // in turn — and neither is one whose lifecycle could not be read at all: a
  // missing, unreadable or unparseable `01_Spec.md` is a directory nobody has
  // shown to be current, and `readSpecLifecycle` reports every one of those the
  // same way, as no declaration. Trusting the directory's mere existence would
  // demote the source's whole ledger on the strength of a folder name.
  // Following the chain instead would have to handle cycles; refusing here
  // needs no such reasoning, and the operator's fix is the same either way:
  // point `Superseded-by` at the spec that owns the work now.
  const successor = declarations.get(successorId);
  if (successor === undefined || successor.status !== "active") {
    return undefined;
  }
  return "superseded";
}

export async function collectMissingRequiredFiles(
  entry: SpecEntry,
): Promise<RequiredSpecPackFile[]> {
  if (entry.layout !== "spec-pack") {
    return [];
  }
  const listings = new Map<string, Set<string>>();
  const missing: RequiredSpecPackFile[] = [];
  for (const fileName of REQUIRED_SPEC_PACK_FILES) {
    const target = entry.requiredFiles[fileName];
    if (!target) {
      missing.push(fileName);
      continue;
    }
    if (!(await existsCaseExact(target, listings))) {
      missing.push(fileName);
    }
  }
  return missing;
}

export async function collectMissingLayeredRequiredFiles(entry: SpecEntry): Promise<string[]> {
  if (entry.layout !== "layered") {
    return [];
  }
  const listings = new Map<string, Set<string>>();
  const missing: string[] = [];
  for (const fileName of entry.requiredLayeredFileNames) {
    const target = entry.requiredLayeredFiles[fileName];
    if (!target) {
      missing.push(fileName);
      continue;
    }
    if (!(await existsCaseExact(target, listings))) {
      missing.push(fileName);
    }
  }
  return missing;
}

export async function collectMissingLayeredSharedRequiredFiles(
  entry: SpecEntry,
): Promise<string[]> {
  if (entry.layout !== "layered") {
    return [];
  }
  const listings = new Map<string, Set<string>>();
  const missing: string[] = [];
  for (const fileName of entry.requiredSharedFileNames) {
    const target = entry.requiredSharedFiles[fileName];
    if (!target) {
      missing.push(fileName);
      continue;
    }
    if (!(await existsCaseExact(target, listings))) {
      missing.push(fileName);
    }
  }
  return missing;
}

async function listSpecDirs(specsRoot: string): Promise<string[]> {
  try {
    const items = await readdir(specsRoot, { withFileTypes: true });
    return items
      .filter((item) => item.isDirectory())
      .map((item) => item.name)
      .filter((name) => SPEC_DIR_RE.test(name.toLowerCase()))
      .map((name) => path.join(specsRoot, name));
  } catch (error) {
    if (isEnoent(error)) {
      return [];
    }
    throw error;
  }
}

function mapRequiredFiles(dir: string): Record<RequiredSpecPackFile, string> {
  const mapped = {} as Record<RequiredSpecPackFile, string>;
  for (const fileName of REQUIRED_SPEC_PACK_FILES) {
    mapped[fileName] = path.join(dir, fileName);
  }
  return mapped;
}

function mapLayeredRequiredFiles(
  dir: string,
  fileNames: readonly string[],
): Partial<Record<string, string>> {
  const mapped: Partial<Record<string, string>> = {};
  for (const fileName of fileNames) {
    mapped[fileName] = path.join(dir, fileName);
  }
  return mapped;
}

function resolveDeltaCandidates(dir: string, fileNames: Set<string>): string[] {
  const candidates = Array.from(fileNames)
    .filter((name) => /(?:^|_)delta\.md$/i.test(name))
    .map((name) => path.join(dir, name))
    .sort((a, b) => a.localeCompare(b));
  if (candidates.length > 0) {
    return candidates;
  }
  // Fallback order is intentional; callers must check file existence.
  return [path.join(dir, "18_delta.md"), path.join(dir, "09_delta.md")];
}

function extractSpecNumberFromDir(dir: string): string {
  const name = path.basename(dir);
  const match = /^spec-(\d{4})$/i.exec(name);
  return match?.[1] ?? "0000";
}

async function listFileNames(dir: string): Promise<Set<string>> {
  const names = new Set<string>();
  try {
    const items = await readdir(dir, { withFileTypes: true });
    for (const item of items) {
      if (!item.isFile()) {
        continue;
      }
      names.add(item.name);
    }
  } catch {
    // ignore
  }
  return names;
}

function createSpecPackEntry(input: {
  dir: string;
  specNumber: string;
  sharedDir: string;
  requiredFileSets: LayeredRequiredFileSets;
  deltaCandidates: string[];
}): SpecEntry {
  const { dir, specNumber, sharedDir: policiesDir, requiredFileSets, deltaCandidates } = input;
  return {
    dir,
    layout: "spec-pack",
    layeredStyle: null,
    specNumber,
    sharedDir: policiesDir,
    requiredFiles: mapRequiredFiles(dir),
    requiredLayeredFiles: mapLayeredRequiredFiles(dir, requiredFileSets.specDir),
    requiredLayeredFileNames: requiredFileSets.specDir,
    requiredSharedFiles: mapLayeredRequiredFiles(policiesDir, requiredFileSets.sharedDir),
    requiredSharedFileNames: requiredFileSets.sharedDir,
    deltaCandidates,
    specPath: path.join(dir, "01_Spec.md"),
    scenarioPath: path.join(dir, "09_Examples.feature"),
    caseCataloguePath: path.join(dir, "10_Test-cases.md"),
    traceabilityMatrixPath: path.join(dir, "16_Traceability-ledger.md"),
    legacyImplementationBriefPath: path.join(dir, "implementation-brief.md"),
    specMetaPath: path.join(dir, "01_Spec.md"),
    objectivePath: path.join(dir, "02_Objective.md"),
    initiativePath: path.join(dir, "03_Initiative.md"),
    capabilityPath: path.join(dir, "04_Capability.md"),
    flowPath: path.join(dir, "05_Business-flow.feature"),
    userStoriesPath: path.join(dir, "06_User-stories.md"),
    acceptanceCriteriaPath: path.join(dir, "07_Acceptance-criteria.md"),
    businessRulesPath: path.join(dir, "08_Business-rules.md"),
    examplesPath: path.join(dir, "09_Examples.feature"),
    testCasesPath: path.join(dir, "10_Test-cases.md"),
    contractsIndexPath: path.join(dir, "11_Contracts.md"),
    glossaryPath: path.join(dir, "12_Glossary.md"),
    constraintsPath: path.join(dir, "13_Constraints.md"),
    decisionsPath: path.join(dir, "14_Decisions.md"),
    openQuestionsPath: path.join(dir, "15_Open-questions.md"),
    traceabilityLedgerPath: path.join(dir, "16_Traceability-ledger.md"),
    planPath: path.join(dir, "17_Plan.md"),
    deltaPath: path.join(dir, "18_delta.md"),
  };
}

function createLayeredEntry(input: {
  dir: string;
  specNumber: string;
  sharedDir: string;
  style: LayeredStyle;
  requiredFileSets: LayeredRequiredFileSets;
  deltaCandidates: string[];
}): SpecEntry {
  const {
    dir,
    specNumber,
    sharedDir: policiesDir,
    style,
    requiredFileSets,
    deltaCandidates,
  } = input;
  const requiredFileNames =
    style === "v1421"
      ? requiredFileSets.specDir
      : style === "v1417"
        ? REQUIRED_LAYERED_SPEC_FILES_V1417
        : REQUIRED_LAYERED_SPEC_FILES_V1416;
  const requiredSharedFileNames =
    style === "v1421"
      ? requiredFileSets.sharedDir
      : style === "v1417"
        ? REQUIRED_LAYERED_SHARED_FILES_V1417
        : [];

  const specPath =
    style === "v1417" || style === "v1421"
      ? path.join(dir, "01_Spec.md")
      : path.join(dir, "01_User-stories.md");
  const scenarioPath =
    style === "v1421"
      ? path.join(dir, "05_Examples.md")
      : style === "v1417"
        ? path.join(dir, "05_Examples.feature")
        : path.join(dir, "04_Examples.feature");
  const caseCataloguePath =
    style === "v1421"
      ? path.join(dir, "06_Test-Cases.md")
      : style === "v1417"
        ? path.join(dir, "06_Test-cases.md")
        : path.join(dir, "05_Test-cases.md");
  const userStoriesPath =
    style === "v1417" || style === "v1421"
      ? path.join(dir, "02_User-stories.md")
      : path.join(dir, "01_User-stories.md");
  const acceptanceCriteriaPath =
    style === "v1421"
      ? path.join(dir, "03_Acceptance-Criteria.md")
      : style === "v1417"
        ? path.join(dir, "03_Acceptance-criteria.md")
        : path.join(dir, "02_Acceptance-criteria.md");
  const businessRulesPath =
    style === "v1421"
      ? path.join(dir, "04_Business-Rules.md")
      : style === "v1417"
        ? path.join(dir, "04_Business-rules.md")
        : path.join(dir, "03_Business-rules.md");
  const examplesPath =
    style === "v1421"
      ? path.join(dir, "05_Examples.md")
      : style === "v1417"
        ? path.join(dir, "05_Examples.feature")
        : path.join(dir, "04_Examples.feature");
  const testCasesPath =
    style === "v1421"
      ? path.join(dir, "06_Test-Cases.md")
      : style === "v1417"
        ? path.join(dir, "06_Test-cases.md")
        : path.join(dir, "05_Test-cases.md");
  const decisionsPath =
    style === "v1417" || style === "v1421"
      ? path.join(dir, "07_Decisions.md")
      : path.join(dir, "07_Decisions.md");
  const openQuestionsPath =
    style === "v1417" || style === "v1421"
      ? path.join(dir, "08_Open-questions.md")
      : path.join(dir, "08_Open-questions.md");
  const planPath =
    style === "v1417" || style === "v1421"
      ? path.join(dir, "10_Plan.md")
      : path.join(dir, "06_Plan.md");
  const deltaPath =
    deltaCandidates[0] ??
    (style === "v1417" ? path.join(dir, "09_delta.md") : path.join(dir, "09_delta.md"));

  return {
    dir,
    layout: "layered",
    layeredStyle: style,
    specNumber,
    sharedDir: policiesDir,
    requiredFiles: mapRequiredFiles(dir),
    requiredLayeredFiles: mapLayeredRequiredFiles(dir, requiredFileNames),
    requiredLayeredFileNames: requiredFileNames,
    requiredSharedFiles: mapLayeredRequiredFiles(policiesDir, requiredSharedFileNames),
    requiredSharedFileNames,
    deltaCandidates,
    specPath,
    scenarioPath,
    caseCataloguePath,
    traceabilityMatrixPath: path.join(dir, "traceability-matrix.md"),
    legacyImplementationBriefPath: path.join(dir, "implementation-brief.md"),
    specMetaPath: specPath,
    objectivePath: path.join(policiesDir, "01_Objective.md"),
    initiativePath: path.join(policiesDir, "02_Initiative.md"),
    capabilityPath: path.join(policiesDir, "03_Capabilities.md"),
    flowPath:
      style === "v1421"
        ? path.join(policiesDir, "04_Business-Flow.md")
        : path.join(policiesDir, "04_Business-flow.md"),
    userStoriesPath,
    acceptanceCriteriaPath,
    businessRulesPath,
    examplesPath,
    testCasesPath,
    contractsIndexPath: path.join(policiesDir, "05_Contracts.md"),
    glossaryPath: path.join(policiesDir, "06_Glossary.md"),
    constraintsPath: path.join(policiesDir, "07_Constraints.md"),
    decisionsPath,
    openQuestionsPath,
    traceabilityLedgerPath: path.join(dir, "traceability-matrix.md"),
    planPath,
    deltaPath,
  };
}

function createLegacyEntry(input: {
  dir: string;
  specNumber: string;
  sharedDir: string;
  requiredFileSets: LayeredRequiredFileSets;
  deltaCandidates: string[];
}): SpecEntry {
  const { dir, specNumber, sharedDir: policiesDir, requiredFileSets, deltaCandidates } = input;
  return {
    dir,
    layout: "legacy",
    layeredStyle: null,
    specNumber,
    sharedDir: policiesDir,
    requiredFiles: mapRequiredFiles(dir),
    requiredLayeredFiles: mapLayeredRequiredFiles(dir, requiredFileSets.specDir),
    requiredLayeredFileNames: requiredFileSets.specDir,
    requiredSharedFiles: mapLayeredRequiredFiles(policiesDir, requiredFileSets.sharedDir),
    requiredSharedFileNames: requiredFileSets.sharedDir,
    deltaCandidates,
    specPath: path.join(dir, "spec.md"),
    scenarioPath: path.join(dir, "scenario.feature"),
    caseCataloguePath: path.join(dir, "case-catalogue.md"),
    traceabilityMatrixPath: path.join(dir, "traceability-matrix.md"),
    legacyImplementationBriefPath: path.join(dir, "implementation-brief.md"),
    specMetaPath: path.join(dir, "spec.md"),
    objectivePath: path.join(dir, "objective.md"),
    initiativePath: path.join(dir, "initiative.md"),
    capabilityPath: path.join(dir, "capability.md"),
    flowPath: path.join(dir, "business-flow.md"),
    userStoriesPath: path.join(dir, "user-stories.md"),
    acceptanceCriteriaPath: path.join(dir, "acceptance-criteria.md"),
    businessRulesPath: path.join(dir, "business-rules.md"),
    examplesPath: path.join(dir, "scenario.feature"),
    testCasesPath: path.join(dir, "case-catalogue.md"),
    contractsIndexPath: path.join(dir, "contracts.md"),
    glossaryPath: path.join(dir, "glossary.md"),
    constraintsPath: path.join(dir, "constraints.md"),
    decisionsPath: path.join(dir, "decisions.md"),
    openQuestionsPath: path.join(dir, "open-questions.md"),
    traceabilityLedgerPath: path.join(dir, "traceability-matrix.md"),
    planPath: path.join(dir, "plan.md"),
    deltaPath: deltaCandidates[0] ?? path.join(dir, "delta.md"),
  };
}

async function resolveLayeredRequiredFileSets(specsRoot: string): Promise<LayeredRequiredFileSets> {
  const defaults: LayeredRequiredFileSets = {
    specDir: REQUIRED_LAYERED_SPEC_FILES_V1421,
    sharedDir: REQUIRED_LAYERED_SHARED_FILES_V1421,
  };

  const qfaiRoot = path.dirname(specsRoot);
  const catalogPath = path.join(qfaiRoot, SPEC_REQUIRED_FILES_CATALOG_PATH);
  const legacyManifestPath = path.join(qfaiRoot, SPEC_REQUIRED_FILES_MANIFEST_PATH);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(catalogPath, "utf-8"));
  } catch {
    try {
      parsed = JSON.parse(await readFile(legacyManifestPath, "utf-8"));
    } catch {
      return defaults;
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return defaults;
  }
  const node = parsed as Record<string, unknown>;

  return {
    specDir: normalizeRequiredFileNames(node.spec_dir, defaults.specDir),
    sharedDir: normalizeRequiredFileNames(node.shared_dir, defaults.sharedDir),
  };
}

function normalizeRequiredFileNames(
  value: unknown,
  fallback: readonly string[],
): readonly string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const normalized = Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
  if (normalized.length === 0) {
    return fallback;
  }
  return normalized;
}

/**
 * Case-exact existence probe for required-file gates.
 *
 * `fs.access` performs no normalization of its own, so case folding is
 * delegated to the host filesystem: NTFS and APFS resolve a mis-cased path,
 * ext4 does not. Because `REQUIRED_LAYERED_*_V1417` and `_V1421` differ from
 * each other *only* by letter case for several entries, filename casing is
 * load-bearing here, and a single mis-cased character used to flip the verdict
 * of the completion gate depending on which machine ran it — `error=0` on a
 * developer's Windows box, `E_SPEC_MISSING_FILESET` on Linux CI.
 *
 * Resolving required names against the `readdir` listing instead makes the
 * result identical on every platform (matching the stricter, case-sensitive
 * behaviour), so a mis-cased required file is reported everywhere.
 *
 * The listing is still an existence probe, not just a name probe: symlink
 * entries are resolved (see `listExistingNames`) so a required name backed by
 * a broken link stays missing, as it was under `access()`.
 *
 * The `listings` map memoizes one `readdir` per directory across a single
 * collection pass.
 */
async function existsCaseExact(
  target: string,
  listings: Map<string, Set<string>>,
): Promise<boolean> {
  const dir = path.dirname(target);
  let names = listings.get(dir);
  if (!names) {
    names = await listExistingNames(dir);
    listings.set(dir, names);
  }
  return names.has(path.basename(target));
}

async function listExistingNames(dir: string): Promise<Set<string>> {
  const names = new Set<string>();
  try {
    const items = await readdir(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isSymbolicLink()) {
        // A `Dirent` describes the LINK, not its target: a dangling symlink and
        // a symlink to a directory both report `isDirectory() === false`, so
        // taking the name at face value would count a required file that cannot
        // be read. The previous `access()` probe followed the link and failed,
        // and the gate must keep failing — otherwise a layout whose validators
        // early-return without opening the file (v1417) passes the completion
        // gate with a required file that has no content behind it. Resolve the
        // link and keep only those that land on a regular file.
        if (!(await resolvesToFile(path.join(dir, item.name)))) {
          continue;
        }
      } else if (!item.isFile()) {
        // Directories are the obvious case, but FIFOs, sockets and device
        // nodes are not directories either, so testing `!isDirectory()` would
        // admit them as satisfying a required file. The gate requires a
        // regular file the downstream validators can actually open.
        continue;
      }
      names.add(item.name);
    }
  } catch {
    // Unreadable or missing directory yields an empty listing, which reports
    // every required file as missing — same as the previous access() probe.
  }
  return names;
}

async function resolvesToFile(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}
