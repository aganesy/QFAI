import { access, readdir } from "node:fs/promises";
import path from "node:path";

const SPEC_DIR_RE = /^spec-\d{4}$/i;

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
] as const;

export const REQUIRED_LAYERED_SPEC_FILES_V1416 = [
  "01_User-stories.md",
  "02_Acceptance-criteria.md",
  "03_Business-rules.md",
  "04_Examples.feature",
  "05_Test-cases.md",
] as const;

export const REQUIRED_LAYERED_SPEC_FILES = REQUIRED_LAYERED_SPEC_FILES_V1417;

export type RequiredLayeredSpecFile =
  | (typeof REQUIRED_LAYERED_SPEC_FILES_V1417)[number]
  | (typeof REQUIRED_LAYERED_SPEC_FILES_V1416)[number];

export type SpecLayoutKind = "spec-pack" | "layered" | "legacy";
export type LayeredStyle = "v1416" | "v1417";

export type SpecEntry = {
  dir: string;
  layout: SpecLayoutKind;
  layeredStyle: LayeredStyle | null;
  specNumber: string;
  sharedDir: string;
  requiredFiles: Partial<Record<RequiredSpecPackFile, string>>;
  requiredLayeredFiles: Partial<Record<RequiredLayeredSpecFile, string>>;
  requiredLayeredFileNames: readonly RequiredLayeredSpecFile[];
  deltaCandidates: string[];
  // v1.4.0 互換プロパティ（内部参照用）
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

export async function collectSpecEntries(
  specsRoot: string,
): Promise<SpecEntry[]> {
  const dirs = await listSpecDirs(specsRoot);
  const entries = await Promise.all(
    dirs.map(async (dir) => {
      const specNumber = extractSpecNumberFromDir(dir);
      const sharedDir = path.join(specsRoot, "_shared");
      const fileNames = await listFileNames(dir);
      const hasLayeredV1417 =
        fileNames.has("01_spec.md") && fileNames.has("02_user-stories.md");
      const hasLayeredV1416 = fileNames.has("01_user-stories.md");
      const hasSpecPack =
        fileNames.has("01_spec.md") && fileNames.has("02_objective.md");
      // Prefer modern names when both legacy and modern files coexist.
      const hasLegacy =
        fileNames.has("spec.md") && !fileNames.has("01_spec.md");
      const deltaCandidates = resolveDeltaCandidates(dir, fileNames);

      if (hasLayeredV1417) {
        return createLayeredEntry({
          dir,
          specNumber,
          sharedDir,
          style: "v1417",
          deltaCandidates,
        });
      }
      if (hasLayeredV1416) {
        return createLayeredEntry({
          dir,
          specNumber,
          sharedDir,
          style: "v1416",
          deltaCandidates,
        });
      }
      if (hasSpecPack) {
        return createSpecPackEntry({
          dir,
          specNumber,
          sharedDir,
          deltaCandidates,
        });
      }
      if (hasLegacy) {
        return createLegacyEntry({
          dir,
          specNumber,
          sharedDir,
          deltaCandidates,
        });
      }
      // Unknown/empty directory fallback: keep spec-pack as default so required
      // file validation can report deterministic "missing file set" diagnostics.
      return createSpecPackEntry({
        dir,
        specNumber,
        sharedDir,
        deltaCandidates,
      });
    }),
  );
  return entries.sort((a, b) => a.dir.localeCompare(b.dir));
}

export async function collectMissingRequiredFiles(
  entry: SpecEntry,
): Promise<RequiredSpecPackFile[]> {
  if (entry.layout !== "spec-pack") {
    return [];
  }
  const missing: RequiredSpecPackFile[] = [];
  for (const fileName of REQUIRED_SPEC_PACK_FILES) {
    const target = entry.requiredFiles[fileName];
    if (!target) {
      missing.push(fileName);
      continue;
    }
    if (!(await exists(target))) {
      missing.push(fileName);
    }
  }
  return missing;
}

export async function collectMissingLayeredRequiredFiles(
  entry: SpecEntry,
): Promise<RequiredLayeredSpecFile[]> {
  if (entry.layout !== "layered") {
    return [];
  }
  const missing: RequiredLayeredSpecFile[] = [];
  for (const fileName of entry.requiredLayeredFileNames) {
    const target = entry.requiredLayeredFiles[fileName];
    if (!target) {
      missing.push(fileName);
      continue;
    }
    if (!(await exists(target))) {
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
    if (isMissingFileError(error)) {
      return [];
    }
    throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  return (error as { code?: string }).code === "ENOENT";
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
  fileNames: readonly RequiredLayeredSpecFile[],
): Partial<Record<RequiredLayeredSpecFile, string>> {
  const mapped: Partial<Record<RequiredLayeredSpecFile, string>> = {};
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
      names.add(item.name.toLowerCase());
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
  deltaCandidates: string[];
}): SpecEntry {
  const { dir, specNumber, sharedDir, deltaCandidates } = input;
  return {
    dir,
    layout: "spec-pack",
    layeredStyle: null,
    specNumber,
    sharedDir,
    requiredFiles: mapRequiredFiles(dir),
    requiredLayeredFiles: mapLayeredRequiredFiles(
      dir,
      REQUIRED_LAYERED_SPEC_FILES_V1417,
    ),
    requiredLayeredFileNames: REQUIRED_LAYERED_SPEC_FILES_V1417,
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
  deltaCandidates: string[];
}): SpecEntry {
  const { dir, specNumber, sharedDir, style, deltaCandidates } = input;
  const requiredFileNames =
    style === "v1417"
      ? REQUIRED_LAYERED_SPEC_FILES_V1417
      : REQUIRED_LAYERED_SPEC_FILES_V1416;

  const specPath =
    style === "v1417"
      ? path.join(dir, "01_Spec.md")
      : path.join(dir, "01_User-stories.md");
  const scenarioPath =
    style === "v1417"
      ? path.join(dir, "05_Examples.feature")
      : path.join(dir, "04_Examples.feature");
  const caseCataloguePath =
    style === "v1417"
      ? path.join(dir, "06_Test-cases.md")
      : path.join(dir, "05_Test-cases.md");
  const userStoriesPath =
    style === "v1417"
      ? path.join(dir, "02_User-stories.md")
      : path.join(dir, "01_User-stories.md");
  const acceptanceCriteriaPath =
    style === "v1417"
      ? path.join(dir, "03_Acceptance-criteria.md")
      : path.join(dir, "02_Acceptance-criteria.md");
  const businessRulesPath =
    style === "v1417"
      ? path.join(dir, "04_Business-rules.md")
      : path.join(dir, "03_Business-rules.md");
  const examplesPath =
    style === "v1417"
      ? path.join(dir, "05_Examples.feature")
      : path.join(dir, "04_Examples.feature");
  const testCasesPath =
    style === "v1417"
      ? path.join(dir, "06_Test-cases.md")
      : path.join(dir, "05_Test-cases.md");
  const decisionsPath =
    style === "v1417"
      ? path.join(dir, "07_Decisions.md")
      : path.join(dir, "07_Decisions.md");
  const openQuestionsPath =
    style === "v1417"
      ? path.join(dir, "08_Open-questions.md")
      : path.join(dir, "08_Open-questions.md");
  const planPath =
    style === "v1417"
      ? path.join(dir, "10_Plan.md")
      : path.join(dir, "06_Plan.md");
  const deltaPath =
    deltaCandidates[0] ??
    (style === "v1417"
      ? path.join(dir, "09_delta.md")
      : path.join(dir, "09_delta.md"));

  return {
    dir,
    layout: "layered",
    layeredStyle: style,
    specNumber,
    sharedDir,
    requiredFiles: mapRequiredFiles(dir),
    requiredLayeredFiles: mapLayeredRequiredFiles(dir, requiredFileNames),
    requiredLayeredFileNames: requiredFileNames,
    deltaCandidates,
    specPath,
    scenarioPath,
    caseCataloguePath,
    traceabilityMatrixPath: path.join(dir, "traceability-matrix.md"),
    legacyImplementationBriefPath: path.join(dir, "implementation-brief.md"),
    specMetaPath: specPath,
    objectivePath: path.join(sharedDir, "01_Objective.md"),
    initiativePath: path.join(sharedDir, "02_Initiative.md"),
    capabilityPath: path.join(sharedDir, "03_Capabilities.md"),
    flowPath: path.join(sharedDir, "04_Business-flow.md"),
    userStoriesPath,
    acceptanceCriteriaPath,
    businessRulesPath,
    examplesPath,
    testCasesPath,
    contractsIndexPath: path.join(sharedDir, "05_Contracts.md"),
    glossaryPath: path.join(sharedDir, "06_Glossary.md"),
    constraintsPath: path.join(sharedDir, "07_Constraints.md"),
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
  deltaCandidates: string[];
}): SpecEntry {
  const { dir, specNumber, sharedDir, deltaCandidates } = input;
  return {
    dir,
    layout: "legacy",
    layeredStyle: null,
    specNumber,
    sharedDir,
    requiredFiles: mapRequiredFiles(dir),
    requiredLayeredFiles: mapLayeredRequiredFiles(
      dir,
      REQUIRED_LAYERED_SPEC_FILES_V1417,
    ),
    requiredLayeredFileNames: REQUIRED_LAYERED_SPEC_FILES_V1417,
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

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
