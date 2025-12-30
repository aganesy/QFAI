import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { buildContractIndex } from "../contractIndex.js";
import { collectSpecFiles } from "../discovery.js";
import { collectFiles } from "../fs.js";
import { extractAllIds, extractIds } from "../ids.js";
import { parseGherkinFeature } from "../parse/gherkin.js";
import { parseSpec } from "../parse/spec.js";
import type { Issue, IssueSeverity } from "../types.js";

const SC_TAG_RE = /^SC-\d{4}$/;
const SPEC_TAG_RE = /^SPEC-\d{4}$/;
const BR_TAG_RE = /^BR-\d{4}$/;
const UI_TAG_RE = /^UI-\d{4}$/;
const API_TAG_RE = /^API-\d{4}$/;
const DATA_TAG_RE = /^DATA-\d{4}$/;

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
  const contractIndex = await buildContractIndex(root, config);
  const contractIds = contractIndex.ids;

  for (const file of specFiles) {
    const text = await readFile(file, "utf-8");
    extractAllIds(text).forEach((id) => upstreamIds.add(id));

    const parsed = parseSpec(text, file);
    if (parsed.specId) {
      specIds.add(parsed.specId);
    }

    const brIds = parsed.brs.map((br) => br.id);
    brIds.forEach((id) => brIdsInSpecs.add(id));

    const referencedContractIds = new Set<string>([
      ...extractIds(text, "UI"),
      ...extractIds(text, "API"),
      ...extractIds(text, "DATA"),
    ]);
    const unknownContractIds = Array.from(referencedContractIds).filter(
      (id) => !contractIds.has(id),
    );
    if (unknownContractIds.length > 0) {
      issues.push(
        issue(
          "QFAI-TRACE-009",
          `Spec が存在しない契約 ID を参照しています: ${unknownContractIds.join(
            ", ",
          )}`,
          "error",
          file,
          "traceability.specContractExists",
          unknownContractIds,
        ),
      );
    }

    if (parsed.specId) {
      const current = specToBrIds.get(parsed.specId) ?? new Set<string>();
      brIds.forEach((id) => current.add(id));
      specToBrIds.set(parsed.specId, current);
    }
  }

  for (const file of decisionFiles) {
    const text = await readFile(file, "utf-8");
    extractAllIds(text).forEach((id) => upstreamIds.add(id));
  }

  for (const file of scenarioFiles) {
    const text = await readFile(file, "utf-8");
    extractAllIds(text).forEach((id) => upstreamIds.add(id));

    const parsed = parseGherkinFeature(text, file);
    const specIdsInScenario = new Set<string>();
    const brIds = new Set<string>();
    const scIds = new Set<string>();
    const scenarioIds = new Set<string>();

    for (const scenario of parsed.scenarios) {
      for (const tag of scenario.tags) {
        if (SPEC_TAG_RE.test(tag)) {
          specIdsInScenario.add(tag);
        }
        if (BR_TAG_RE.test(tag)) {
          brIds.add(tag);
        }
        if (SC_TAG_RE.test(tag)) {
          scIds.add(tag);
        }
        if (UI_TAG_RE.test(tag) || API_TAG_RE.test(tag) || DATA_TAG_RE.test(tag)) {
          scenarioIds.add(tag);
        }
      }
    }

    const specIdsList = Array.from(specIdsInScenario);
    const brIdsList = Array.from(brIds);
    const scIdsList = Array.from(scIds);
    const scenarioIdsList = Array.from(scenarioIds);

    brIdsList.forEach((id) => brIdsInScenarios.add(id));
    scIdsList.forEach((id) => scIdsInScenarios.add(id));
    scenarioIdsList.forEach((id) => scenarioContractIds.add(id));

    if (scenarioIdsList.length > 0) {
      scIdsList.forEach((id) => scWithContracts.add(id));
    }

    const unknownSpecIds = specIdsList.filter((id) => !specIds.has(id));
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

    const unknownBrIds = brIdsList.filter((id) => !brIdsInSpecs.has(id));
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

    const unknownContractIds = scenarioIdsList.filter(
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

    if (specIdsList.length > 0) {
      const allowedBrIds = new Set<string>();
      for (const specId of specIdsList) {
        const brIdsForSpec = specToBrIds.get(specId);
        if (!brIdsForSpec) {
          continue;
        }
        brIdsForSpec.forEach((id) => allowedBrIds.add(id));
      }
      const invalidBrIds = brIdsList.filter((id) => !allowedBrIds.has(id));
      if (invalidBrIds.length > 0) {
        issues.push(
          issue(
            "QFAI-TRACE-007",
            `Scenario の BR が参照 SPEC に属していません: ${invalidBrIds.join(
              ", ",
            )} (SPEC: ${specIdsList.join(", ")})`,
            "error",
            file,
            "traceability.scenarioBrUnderSpec",
            invalidBrIds,
          ),
        );
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
