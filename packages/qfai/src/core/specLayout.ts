import { access, readdir } from "node:fs/promises";
import path from "node:path";

const SPEC_DIR_RE = /^spec-\d{4}$/;

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

export type SpecEntry = {
  dir: string;
  requiredFiles: Record<RequiredSpecPackFile, string>;
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
  const entries = dirs.map((dir) => ({
    dir,
    requiredFiles: mapRequiredFiles(dir),
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
  }));
  return entries.sort((a, b) => a.dir.localeCompare(b.dir));
}

export async function collectMissingRequiredFiles(
  entry: SpecEntry,
): Promise<RequiredSpecPackFile[]> {
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

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
