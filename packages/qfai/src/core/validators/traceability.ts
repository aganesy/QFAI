import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { buildContractIndex } from "../contractIndex.js";
import { collectScenarioFiles, collectSpecFiles } from "../discovery.js";
import { collectFiles } from "../fs.js";
import { extractAllIds } from "../ids.js";
import { parseSpec } from "../parse/spec.js";
import { buildScenarioAtoms, parseScenarioDocument } from "../scenarioModel.js";
import { SC_TAG_RE, collectScTestReferences } from "../traceability.js";
import type { Issue, IssueSeverity } from "../types.js";

const SPEC_TAG_RE = /^SPEC-\d{4}$/;
const BR_TAG_RE = /^BR-\d{4}$/;

export async function validateTraceability(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const specsRoot = resolvePath(root, config, "specsDir");
  const srcRoot = resolvePath(root, config, "srcDir");
  const testsRoot = resolvePath(root, config, "testsDir");

  const specFiles = await collectSpecFiles(specsRoot);
  const scenarioFiles = await collectScenarioFiles(specsRoot);

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

    if (parsed.specId) {
      const current = specToBrIds.get(parsed.specId) ?? new Set<string>();
      brIds.forEach((id) => current.add(id));
      specToBrIds.set(parsed.specId, current);
    }
  }

  for (const file of scenarioFiles) {
    const text = await readFile(file, "utf-8");
    extractAllIds(text).forEach((id) => upstreamIds.add(id));

    const { document, errors } = parseScenarioDocument(text, file);
    if (!document || errors.length > 0) {
      continue;
    }

    const atoms = buildScenarioAtoms(document);
    const scIdsInFile = new Set<string>();

    for (const [index, scenario] of document.scenarios.entries()) {
      const atom = atoms[index];
      if (!atom) {
        continue;
      }

      const specTags = scenario.tags.filter((tag) => SPEC_TAG_RE.test(tag));
      const brTags = scenario.tags.filter((tag) => BR_TAG_RE.test(tag));
      const scTags = scenario.tags.filter((tag) => SC_TAG_RE.test(tag));

      if (specTags.length === 0) {
        issues.push(
          issue(
            "QFAI-TRACE-014",
            `Scenario が SPEC タグを持っていません: ${scenario.name}`,
            "error",
            file,
            "traceability.scenarioSpecRequired",
          ),
        );
      }
      if (brTags.length === 0) {
        issues.push(
          issue(
            "QFAI-TRACE-015",
            `Scenario が BR タグを持っていません: ${scenario.name}`,
            "error",
            file,
            "traceability.scenarioBrRequired",
          ),
        );
      }

      brTags.forEach((id) => brIdsInScenarios.add(id));
      scTags.forEach((id) => {
        scIdsInScenarios.add(id);
        scIdsInFile.add(id);
      });
      atom.contractIds.forEach((id) => scenarioContractIds.add(id));

      if (atom.contractIds.length > 0) {
        scTags.forEach((id) => scWithContracts.add(id));
      }

      const unknownSpecIds = specTags.filter((id) => !specIds.has(id));
      if (unknownSpecIds.length > 0) {
        issues.push(
          issue(
            "QFAI-TRACE-005",
            `Scenario が存在しない SPEC を参照しています: ${unknownSpecIds.join(
              ", ",
            )} (${scenario.name})`,
            "error",
            file,
            "traceability.scenarioSpecExists",
            unknownSpecIds,
          ),
        );
      }

      const unknownBrIds = brTags.filter((id) => !brIdsInSpecs.has(id));
      if (unknownBrIds.length > 0) {
        issues.push(
          issue(
            "QFAI-TRACE-006",
            `Scenario が存在しない BR を参照しています: ${unknownBrIds.join(
              ", ",
            )} (${scenario.name})`,
            "error",
            file,
            "traceability.scenarioBrExists",
            unknownBrIds,
          ),
        );
      }

      const unknownContractIds = atom.contractIds.filter(
        (id) => !contractIds.has(id),
      );
      if (unknownContractIds.length > 0) {
        issues.push(
          issue(
            "QFAI-TRACE-008",
            `Scenario が存在しない契約 ID を参照しています: ${unknownContractIds.join(
              ", ",
            )} (${scenario.name})`,
            config.validation.traceability.unknownContractIdSeverity,
            file,
            "traceability.scenarioContractExists",
            unknownContractIds,
          ),
        );
      }

      if (specTags.length > 0 && brTags.length > 0) {
        const allowedBrIds = new Set<string>();
        for (const specId of specTags) {
          const brIdsForSpec = specToBrIds.get(specId);
          if (!brIdsForSpec) {
            continue;
          }
          brIdsForSpec.forEach((id) => allowedBrIds.add(id));
        }
        const invalidBrIds = brTags.filter((id) => !allowedBrIds.has(id));
        if (invalidBrIds.length > 0) {
          issues.push(
            issue(
              "QFAI-TRACE-007",
              `Scenario の BR が参照 SPEC に属していません: ${invalidBrIds.join(
                ", ",
              )} (SPEC: ${specTags.join(", ")}) (${scenario.name})`,
              "error",
              file,
              "traceability.scenarioBrUnderSpec",
              invalidBrIds,
            ),
          );
        }
      }
    }

    if (scIdsInFile.size !== 1) {
      const invalidScIds = Array.from(scIdsInFile).sort((a, b) =>
        a.localeCompare(b),
      );
      const detail =
        invalidScIds.length === 0
          ? "SC が見つかりません"
          : `複数の SC が存在します: ${invalidScIds.join(", ")}`;
      issues.push(
        issue(
          "QFAI-TRACE-012",
          `Spec entry が Spec:SC=1:1 を満たしていません: ${detail}`,
          "error",
          file,
          "traceability.specScOneToOne",
          invalidScIds,
        ),
      );
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
          specsRoot,
          "traceability.scMustTouchContracts",
          scWithoutContracts,
        ),
      );
    }
  }

  const scRefsResult = await collectScTestReferences(
    root,
    config.validation.traceability.testFileGlobs,
    config.validation.traceability.testFileExcludeGlobs,
  );
  const scTestRefs = scRefsResult.refs;
  const testFileScan = scRefsResult.scan;
  const hasScenarios = scIdsInScenarios.size > 0;
  const hasGlobConfig = testFileScan.globs.length > 0;
  const hasMatchedTests = testFileScan.matchedFileCount > 0;

  if (hasScenarios && (!hasGlobConfig || !hasMatchedTests || scRefsResult.error)) {
    const detail = scRefsResult.error
      ? `（詳細: ${scRefsResult.error}）`
      : "";
    issues.push(
      issue(
        "QFAI-TRACE-013",
        `テスト探索 glob が未設定/不正/一致ファイル0のため SC→Test を判定できません。${detail}`,
        "error",
        testsRoot,
        "traceability.testFileGlobs",
      ),
    );
  } else {
    if (
      config.validation.traceability.scMustHaveTest &&
      scIdsInScenarios.size
    ) {
      const scWithoutTests = Array.from(scIdsInScenarios).filter((id) => {
        const refs = scTestRefs.get(id);
        return !refs || refs.size === 0;
      });
      if (scWithoutTests.length > 0) {
        issues.push(
          issue(
            "QFAI-TRACE-010",
            `SC がテストで参照されていません: ${scWithoutTests.join(
              ", ",
            )}。testFileGlobs に一致するテストファイルへ QFAI:SC-xxxx を記載してください。`,
            config.validation.traceability.scNoTestSeverity,
            testsRoot,
            "traceability.scMustHaveTest",
            scWithoutTests,
          ),
        );
      }
    }

    const unknownScIds = Array.from(scTestRefs.keys()).filter(
      (id) => !scIdsInScenarios.has(id),
    );
    if (unknownScIds.length > 0) {
      issues.push(
        issue(
          "QFAI-TRACE-011",
          `テストが未知の SC をアノテーション参照しています: ${unknownScIds.join(
            ", ",
          )}`,
          "error",
          testsRoot,
          "traceability.scUnknownInTests",
          unknownScIds,
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
            specsRoot,
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
        "上流 ID がコード/テストに参照されていません（参考情報）。",
        "info",
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
