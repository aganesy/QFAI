import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import {
  collectApiContractFiles,
  collectDataContractFiles,
  collectSpecFiles,
  collectUiContractFiles,
} from "../discovery.js";
import { collectFiles } from "../fs.js";
import { extractAllIds, extractIds, type IdPrefix } from "../ids.js";
import type { Issue, IssueSeverity } from "../types.js";

export async function validateTraceability(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const specsRoot = resolvePath(root, config, "specDir");
  const decisionsRoot = resolvePath(root, config, "decisionsDir");
  const scenariosRoot = resolvePath(root, config, "scenariosDir");
  const srcRoot = resolvePath(root, config, "srcDir");
  const testsRoot = resolvePath(root, config, "testsDir");

  const specFiles = await collectSpecFiles(specsRoot);
  // decisions were previously included under specDir; keep them in upstream IDs for compatibility.
  const decisionFiles = await collectFiles(decisionsRoot, {
    extensions: [".md"],
  });
  const scenarioFiles = await collectFiles(scenariosRoot, {
    extensions: [".feature"],
  });

  const upstreamIds = new Set<string>();
  const specIds = new Set<string>();
  const brIdsInSpecs = new Set<string>();
  const brIdsInScenarios = new Set<string>();
  const scIdsInScenarios = new Set<string>();
  const scenarioContractIds = new Set<string>();
  const scWithContracts = new Set<string>();
  const specToBrIds = new Map<string, Set<string>>();
  const contractIds = await collectContractIds(root, config);

  for (const file of specFiles) {
    const text = await readFile(file, "utf-8");
    extractAllIds(text).forEach((id) => upstreamIds.add(id));

    const specIdsInFile = extractIds(text, "SPEC");
    specIdsInFile.forEach((id) => specIds.add(id));

    const brIds = extractIds(text, "BR");
    brIds.forEach((id) => brIdsInSpecs.add(id));

    for (const specId of specIdsInFile) {
      const current = specToBrIds.get(specId) ?? new Set<string>();
      brIds.forEach((id) => current.add(id));
      specToBrIds.set(specId, current);
    }
  }

  for (const file of decisionFiles) {
    const text = await readFile(file, "utf-8");
    extractAllIds(text).forEach((id) => upstreamIds.add(id));
  }

  for (const file of scenarioFiles) {
    const text = await readFile(file, "utf-8");
    extractAllIds(text).forEach((id) => upstreamIds.add(id));

    const specIdsInScenario = extractIds(text, "SPEC");
    const brIds = extractIds(text, "BR");
    const scIds = extractIds(text, "SC");
    const scenarioIds = [
      ...extractIds(text, "UI"),
      ...extractIds(text, "API"),
      ...extractIds(text, "DATA"),
    ];

    brIds.forEach((id) => brIdsInScenarios.add(id));
    scIds.forEach((id) => scIdsInScenarios.add(id));
    scenarioIds.forEach((id) => scenarioContractIds.add(id));

    if (scenarioIds.length > 0) {
      scIds.forEach((id) => scWithContracts.add(id));
    }

    const unknownSpecIds = specIdsInScenario.filter((id) => !specIds.has(id));
    if (unknownSpecIds.length > 0) {
      issues.push(
        issue(
          "QFAI-TRACE-005",
          `Scenario が存在しない SPEC を参照しています: ${unknownSpecIds.join(", ")}`,
          "error",
          file,
          "traceability.scenarioSpecExists",
          unknownSpecIds,
        ),
      );
    }

    const unknownBrIds = brIds.filter((id) => !brIdsInSpecs.has(id));
    if (unknownBrIds.length > 0) {
      issues.push(
        issue(
          "QFAI-TRACE-006",
          `Scenario が存在しない BR を参照しています: ${unknownBrIds.join(", ")}`,
          "error",
          file,
          "traceability.scenarioBrExists",
          unknownBrIds,
        ),
      );
    }

    const unknownContractIds = scenarioIds.filter(
      (id) => !contractIds.has(id),
    );
    if (unknownContractIds.length > 0) {
      issues.push(
        issue(
          "QFAI-TRACE-008",
          `Scenario が存在しない契約 ID を参照しています: ${unknownContractIds.join(
            ", ",
          )}`,
          config.validation.traceability.unknownContractIdSeverity,
          file,
          "traceability.scenarioContractExists",
          unknownContractIds,
        ),
      );
    }

    if (specIdsInScenario.length > 0) {
      const allowedBrIds = new Set<string>();
      for (const specId of specIdsInScenario) {
        const brIdsForSpec = specToBrIds.get(specId);
        if (!brIdsForSpec) {
          continue;
        }
        brIdsForSpec.forEach((id) => allowedBrIds.add(id));
      }
      if (allowedBrIds.size > 0) {
        const invalidBrIds = brIds.filter((id) => !allowedBrIds.has(id));
        if (invalidBrIds.length > 0) {
          issues.push(
            issue(
              "QFAI-TRACE-007",
              `Scenario の BR が参照 SPEC に属していません: ${invalidBrIds.join(
                ", ",
              )} (SPEC: ${specIdsInScenario.join(", ")})`,
              "error",
              file,
              "traceability.scenarioBrUnderSpec",
              invalidBrIds,
            ),
          );
        }
      }
    }
  }

  if (upstreamIds.size === 0) {
    return [
      issue(
        "QFAI-TRACE-000",
        "上流 ID が見つかりません。",
        "info",
        specsRoot,
        "traceability.upstream",
      ),
    ];
  }

  if (config.validation.traceability.brMustHaveSc && brIdsInSpecs.size > 0) {
    const orphanBrIds = Array.from(brIdsInSpecs).filter(
      (id) => !brIdsInScenarios.has(id),
    );
    if (orphanBrIds.length > 0) {
      issues.push(
        issue(
          "QFAI_TRACE_BR_ORPHAN",
          `BR が SC に紐づいていません: ${orphanBrIds.join(", ")}`,
          "error",
          specsRoot,
          "traceability.brMustHaveSc",
          orphanBrIds,
        ),
      );
    }
  }

  if (
    config.validation.traceability.scMustTouchContracts &&
    scIdsInScenarios.size > 0
  ) {
    const scWithoutContracts = Array.from(scIdsInScenarios).filter(
      (id) => !scWithContracts.has(id),
    );
    if (scWithoutContracts.length > 0) {
      issues.push(
        issue(
          "QFAI_TRACE_SC_NO_CONTRACT",
          `SC が契約(UI/API/DATA)に接続していません: ${scWithoutContracts.join(
            ", ",
          )}`,
          "error",
          scenariosRoot,
          "traceability.scMustTouchContracts",
          scWithoutContracts,
        ),
      );
    }
  }

  if (!config.validation.traceability.allowOrphanContracts) {
    if (contractIds.size > 0) {
      const orphanContracts = Array.from(contractIds).filter(
        (id) => !scenarioContractIds.has(id),
      );
      if (orphanContracts.length > 0) {
        issues.push(
          issue(
            "QFAI_CONTRACT_ORPHAN",
            `契約が SC から参照されていません: ${orphanContracts.join(", ")}`,
            "error",
            scenariosRoot,
            "traceability.allowOrphanContracts",
            orphanContracts,
          ),
        );
      }
    }
  }

  issues.push(
    ...(await validateCodeReferences(upstreamIds, srcRoot, testsRoot)),
  );
  return issues;
}

async function collectContractIds(
  root: string,
  config: QfaiConfig,
): Promise<Set<string>> {
  const contractIds = new Set<string>();
  const uiRoot = resolvePath(root, config, "uiContractsDir");
  const apiRoot = resolvePath(root, config, "apiContractsDir");
  const dataRoot = resolvePath(root, config, "dataContractsDir");

  const uiFiles = await collectUiContractFiles(uiRoot);
  const apiFiles = await collectApiContractFiles(apiRoot);
  const dataFiles = await collectDataContractFiles(dataRoot);

  await collectIdsFromFiles(uiFiles, ["UI"], contractIds);
  await collectIdsFromFiles(apiFiles, ["API"], contractIds);
  await collectIdsFromFiles(dataFiles, ["DATA"], contractIds);

  return contractIds;
}

async function collectIdsFromFiles(
  files: string[],
  prefixes: IdPrefix[],
  out: Set<string>,
): Promise<void> {
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    for (const prefix of prefixes) {
      extractIds(text, prefix).forEach((id) => out.add(id));
    }
  }
}

async function validateCodeReferences(
  upstreamIds: Set<string>,
  srcRoot: string,
  testsRoot: string,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const codeFiles = await collectFiles(srcRoot, {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  });
  const testFiles = await collectFiles(testsRoot, {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  });
  const targetFiles = [...codeFiles, ...testFiles];

  if (targetFiles.length === 0) {
    issues.push(
      issue(
        "QFAI-TRACE-001",
        "参照対象のコード/テストが見つかりません。",
        "info",
        srcRoot,
        "traceability.codeReferences",
      ),
    );
    return issues;
  }

  const pattern = buildIdPattern(Array.from(upstreamIds));
  let found = false;

  for (const file of targetFiles) {
    const text = await readFile(file, "utf-8");
    if (pattern.test(text)) {
      found = true;
      break;
    }
  }

  if (!found) {
    issues.push(
      issue(
        "QFAI-TRACE-002",
        "上流 ID がコード/テストに参照されていません。",
        "warning",
        srcRoot,
        "traceability.codeReferences",
      ),
    );
  }

  return issues;
}

function buildIdPattern(ids: string[]): RegExp {
  const escaped = ids.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(${escaped.join("|")})\\b`);
}

function issue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file?: string,
  rule?: string,
  refs?: string[],
): Issue {
  const issue: Issue = {
    code,
    severity,
    message,
  };
  if (file) {
    issue.file = file;
  }
  if (rule) {
    issue.rule = rule;
  }
  if (refs && refs.length > 0) {
    issue.refs = refs;
  }
  return issue;
}
