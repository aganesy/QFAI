import { loadConfig, resolvePath, type ConfigLoadResult } from "./config.js";
import { collectScenarioFiles } from "./discovery.js";
import {
  buildScCoverage,
  collectScIdsFromScenarioFiles,
  collectScTestReferences,
} from "./traceability.js";
import type { Issue, ValidationCounts, ValidationResult } from "./types.js";
import { resolveToolVersion } from "./version.js";
import { validateContracts } from "./validators/contracts.js";
import { validateDeltas } from "./validators/delta.js";
import { validateDefinedIds } from "./validators/ids.js";
import { validateScenarios } from "./validators/scenario.js";
import { validateSpecs } from "./validators/spec.js";
import { validateTraceability } from "./validators/traceability.js";

export async function validateProject(
  root: string,
  configResult?: ConfigLoadResult,
): Promise<ValidationResult> {
  const resolved = configResult ?? (await loadConfig(root));
  const { config, issues: configIssues } = resolved;
  const issues = [
    ...configIssues,
    ...(await validateSpecs(root, config)),
    ...(await validateDeltas(root, config)),
    ...(await validateScenarios(root, config)),
    ...(await validateContracts(root, config)),
    ...(await validateDefinedIds(root, config)),
    ...(await validateTraceability(root, config)),
  ];

  const specsRoot = resolvePath(root, config, "specsDir");
  const testsRoot = resolvePath(root, config, "testsDir");
  const srcRoot = resolvePath(root, config, "srcDir");
  const scenarioFiles = await collectScenarioFiles(specsRoot);
  const scIds = await collectScIdsFromScenarioFiles(scenarioFiles);
  const scTestRefs = await collectScTestReferences([testsRoot, srcRoot]);
  const scCoverage = buildScCoverage(scIds, scTestRefs);

  const toolVersion = await resolveToolVersion();
  return {
    toolVersion,
    issues,
    counts: countIssues(issues),
    traceability: {
      sc: scCoverage,
    },
  };
}

function countIssues(issues: Issue[]): ValidationCounts {
  return issues.reduce<ValidationCounts>(
    (acc, issue) => {
      acc[issue.severity] += 1;
      return acc;
    },
    { info: 0, warning: 0, error: 0 },
  );
}
