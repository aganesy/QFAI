import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import {
  collectMarkdownItems,
  collectScenarioItems,
  exists,
  issue,
  readSafe,
} from "./utils.js";

const ID_PATTERNS = {
  us: /^US-\d{4}$/,
  ac: /^AC-\d{4}$/,
  br: /^BR-\d{4}$/,
  ex: /^EX-\d{4}$/,
} as const;

export async function validateLayerCoverage(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const layeredEntries = entries.filter(
    (entry) => entry.layout === "layered" && entry.layeredStyle === "v1417",
  );
  if (layeredEntries.length === 0) {
    return [];
  }

  const issues: Issue[] = [];

  for (const entry of layeredEntries) {
    issues.push(
      ...(await validateUsToAcCoverage(
        entry.userStoriesPath,
        entry.acceptanceCriteriaPath,
      )),
    );
    issues.push(
      ...(await validateAcToBrCoverage(
        entry.acceptanceCriteriaPath,
        entry.businessRulesPath,
      )),
    );
    issues.push(
      ...(await validateBrToExCoverage(
        entry.businessRulesPath,
        entry.examplesPath,
      )),
    );
    issues.push(
      ...(await validateExToTcCoverage(
        entry.examplesPath,
        entry.testCasesPath,
      )),
    );
  }

  return issues;
}

async function validateUsToAcCoverage(
  userStoriesPath: string,
  acceptanceCriteriaPath: string,
): Promise<Issue[]> {
  if (
    !(await exists(userStoriesPath)) ||
    !(await exists(acceptanceCriteriaPath))
  ) {
    return [];
  }

  const usItems = collectMarkdownItems(await readSafe(userStoriesPath), "US");
  const acItems = collectMarkdownItems(
    await readSafe(acceptanceCriteriaPath),
    "AC",
  );
  const usIds = usItems
    .map((item) => item.id)
    .filter((id) => ID_PATTERNS.us.test(id));
  if (usIds.length === 0) {
    return [];
  }

  const linkedUsIds = new Set(
    acItems
      .map((item) => item.parent)
      .filter((parent): parent is string => Boolean(parent))
      .filter((parent) => ID_PATTERNS.us.test(parent)),
  );
  const uncoveredUsIds = usIds.filter((id) => !linkedUsIds.has(id));
  if (uncoveredUsIds.length === 0) {
    return [];
  }

  return [
    issue(
      "QFAI-COV-101",
      `US に対応する AC がありません: ${uncoveredUsIds.join(", ")}`,
      "error",
      acceptanceCriteriaPath,
      "layerCoverage.usToAc",
      uncoveredUsIds,
      "change",
      "03_Acceptance-criteria.md に該当 US を Parent とする AC を追加してください。",
    ),
  ];
}

async function validateAcToBrCoverage(
  acceptanceCriteriaPath: string,
  businessRulesPath: string,
): Promise<Issue[]> {
  if (
    !(await exists(acceptanceCriteriaPath)) ||
    !(await exists(businessRulesPath))
  ) {
    return [];
  }

  const acItems = collectMarkdownItems(
    await readSafe(acceptanceCriteriaPath),
    "AC",
  );
  const brItems = collectMarkdownItems(await readSafe(businessRulesPath), "BR");
  const acIds = acItems
    .map((item) => item.id)
    .filter((id) => ID_PATTERNS.ac.test(id));
  if (acIds.length === 0) {
    return [];
  }

  const linkedAcIds = new Set(
    brItems
      .map((item) => item.parent)
      .filter((parent): parent is string => Boolean(parent))
      .filter((parent) => ID_PATTERNS.ac.test(parent)),
  );
  const uncoveredAcIds = acIds.filter((id) => !linkedAcIds.has(id));
  if (uncoveredAcIds.length === 0) {
    return [];
  }

  return [
    issue(
      "QFAI-COV-102",
      `AC に対応する BR がありません: ${uncoveredAcIds.join(", ")}`,
      "error",
      businessRulesPath,
      "layerCoverage.acToBr",
      uncoveredAcIds,
      "change",
      "04_Business-rules.md に該当 AC を Parent とする BR を追加してください。",
    ),
  ];
}

async function validateBrToExCoverage(
  businessRulesPath: string,
  examplesPath: string,
): Promise<Issue[]> {
  if (!(await exists(businessRulesPath)) || !(await exists(examplesPath))) {
    return [];
  }

  const brItems = collectMarkdownItems(await readSafe(businessRulesPath), "BR");
  const exItems = collectScenarioItems(await readSafe(examplesPath));
  const brIds = brItems
    .map((item) => item.id)
    .filter((id) => ID_PATTERNS.br.test(id));
  if (brIds.length === 0) {
    return [];
  }

  const linkedBrIds = new Set(
    exItems
      .map((item) => item.parent)
      .filter((parent): parent is string => Boolean(parent))
      .filter((parent) => ID_PATTERNS.br.test(parent)),
  );
  const uncoveredBrIds = brIds.filter((id) => !linkedBrIds.has(id));
  if (uncoveredBrIds.length === 0) {
    return [];
  }

  return [
    issue(
      "QFAI-COV-103",
      `BR に対応する EX がありません: ${uncoveredBrIds.join(", ")}`,
      "error",
      examplesPath,
      "layerCoverage.brToEx",
      uncoveredBrIds,
      "change",
      "05_Examples.feature の Scenario に `# Parent: BR-XXXX` を追加してください。",
    ),
  ];
}

async function validateExToTcCoverage(
  examplesPath: string,
  testCasesPath: string,
): Promise<Issue[]> {
  if (!(await exists(examplesPath)) || !(await exists(testCasesPath))) {
    return [];
  }

  const exItems = collectScenarioItems(await readSafe(examplesPath));
  const tcItems = collectMarkdownItems(await readSafe(testCasesPath), "TC");
  const exIds = exItems
    .map((item) => item.exId.replace(/^@/, ""))
    .filter((id) => ID_PATTERNS.ex.test(id));
  if (exIds.length === 0) {
    return [];
  }

  const linkedExIds = new Set(
    tcItems
      .map((item) => item.parent)
      .filter((parent): parent is string => Boolean(parent))
      .filter((parent) => ID_PATTERNS.ex.test(parent)),
  );
  const uncoveredExIds = exIds.filter((id) => !linkedExIds.has(id));
  if (uncoveredExIds.length === 0) {
    return [];
  }

  return [
    issue(
      "QFAI-COV-104",
      `EX に対応する TC がありません: ${uncoveredExIds.join(", ")}`,
      "error",
      testCasesPath,
      "layerCoverage.exToTc",
      uncoveredExIds,
      "change",
      "06_Test-cases.md に該当 EX を Parent とする TC を追加してください。",
    ),
  ];
}
