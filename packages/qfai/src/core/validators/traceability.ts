import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { buildContractIndex } from "../contractIndex.js";
import { collectScenarioFiles, collectSpecFiles } from "../discovery.js";
import { collectFiles } from "../fs.js";
import {
  extractAllIds,
  extractScSpecNumber,
  extractSpecNumber,
} from "../ids.js";
import {
  parseContractRefs,
  type ParsedContractRefs,
} from "../parse/contractRefs.js";
import { parseSpec } from "../parse/spec.js";
import { buildScenarioAtoms, parseScenarioDocument } from "../scenarioModel.js";
import { collectSpecEntries } from "../specLayout.js";
import { classifyLayer, type LayerBucket } from "../testStrategyTags.js";
import { SC_TAG_RE, collectScTestReferences } from "../traceability.js";
import type { Issue, IssueSeverity } from "../types.js";
import { issue } from "./utils.js";

const SPEC_TAG_RE = /^SPEC-\d{4}$/;
const BR_TAG_RE = /^BR-\d{4}-\d{4}$/;
const SAMPLE_LIMIT = 20;

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
  const specEntries = await collectSpecEntries(specsRoot);
  const scenarioToSpec = await collectScenarioSpecInfo(specEntries);

  const upstreamIds = new Set<string>();
  const specIds = new Set<string>();
  const brIdsInSpecs = new Set<string>();
  const brIdsInScenarios = new Set<string>();
  const scIdsInScenarios = new Set<string>();
  const specContractIds = new Set<string>();
  const specToBrIds = new Map<string, Set<string>>();
  const scIdToLayer = new Map<string, LayerBucket>();
  const layerToScIds = new Map<LayerBucket, Set<string>>();
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

    const contractRefs = parsed.contractRefs;
    if (contractRefs.lines.length === 0) {
      issues.push(
        issue(
          "QFAI-TRACE-020",
          "Spec に QFAI-CONTRACT-REF がありません。例: `QFAI-CONTRACT-REF: none` または `QFAI-CONTRACT-REF: UI-0001`",
          "error",
          file,
          "traceability.specContractRefRequired",
        ),
      );
    } else {
      if (contractRefs.hasNone && contractRefs.ids.length > 0) {
        issues.push(
          issue(
            "QFAI-TRACE-023",
            "Spec の QFAI-CONTRACT-REF に none と契約 ID が混在しています。none か 契約ID のどちらか一方だけにしてください。",
            "error",
            file,
            "traceability.specContractRefFormat",
          ),
        );
      }
      if (contractRefs.invalidTokens.length > 0) {
        issues.push(
          issue(
            "QFAI-TRACE-021",
            `Spec の契約 ID が不正です: ${contractRefs.invalidTokens.join(
              ", ",
            )} (例: UI-0001 / API-0001 / DB-0001 / THEMA-001)`,
            "error",
            file,
            "traceability.specContractRefFormat",
            contractRefs.invalidTokens,
          ),
        );
      }
    }

    contractRefs.ids.forEach((id) => {
      specContractIds.add(id);
    });

    const unknownContractIds = contractRefs.ids.filter(
      (id) => !contractIds.has(id),
    );
    if (unknownContractIds.length > 0) {
      issues.push(
        issue(
          "QFAI-TRACE-024",
          `Spec が未知の契約 ID を参照しています: ${unknownContractIds.join(
            ", ",
          )}`,
          "error",
          file,
          "traceability.specContractExists",
          unknownContractIds,
        ),
      );
    }
  }

  for (const file of scenarioFiles) {
    const text = await readFile(file, "utf-8");
    extractAllIds(text).forEach((id) => upstreamIds.add(id));

    const scenarioContractRefs = parseContractRefs(text, {
      allowCommentPrefix: true,
    });
    if (scenarioContractRefs.lines.length === 0) {
      issues.push(
        issue(
          "QFAI-TRACE-031",
          "Scenario に QFAI-CONTRACT-REF がありません。例: `# QFAI-CONTRACT-REF: none` または `# QFAI-CONTRACT-REF: UI-0001`",
          "error",
          file,
          "traceability.scenarioContractRefRequired",
        ),
      );
    } else {
      if (scenarioContractRefs.hasNone && scenarioContractRefs.ids.length > 0) {
        issues.push(
          issue(
            "QFAI-TRACE-033",
            "Scenario の QFAI-CONTRACT-REF に none と契約 ID が混在しています。none か 契約ID のどちらか一方だけにしてください。",
            "error",
            file,
            "traceability.scenarioContractRefFormat",
          ),
        );
      }
      if (scenarioContractRefs.invalidTokens.length > 0) {
        issues.push(
          issue(
            "QFAI-TRACE-032",
            `Scenario の契約 ID が不正です: ${scenarioContractRefs.invalidTokens.join(
              ", ",
            )} (例: UI-0001 / API-0001 / DB-0001 / THEMA-001)`,
            "error",
            file,
            "traceability.scenarioContractRefFormat",
            scenarioContractRefs.invalidTokens,
          ),
        );
      }
    }

    const { document, errors } = parseScenarioDocument(text, file);
    if (!document || errors.length > 0) {
      continue;
    }

    const atoms = buildScenarioAtoms(document, scenarioContractRefs.ids);
    const scIdToScenarioInfo = new Map<
      string,
      { count: number; names: Set<string> }
    >();

    for (const [index, scenario] of document.scenarios.entries()) {
      const atom = atoms[index];
      if (!atom) {
        continue;
      }

      const specTags = scenario.tags.filter((tag) => SPEC_TAG_RE.test(tag));
      const brTags = scenario.tags.filter((tag) => BR_TAG_RE.test(tag));
      const scTags = scenario.tags.filter((tag) => SC_TAG_RE.test(tag));
      const layerBucket = classifyLayer(scenario.tags);

      if (specTags.length > 1) {
        issues.push(
          issue(
            "QFAI-TRACE-016",
            `Scenario に SPEC タグが複数あります: ${specTags.join(", ")} (${
              scenario.name
            })`,
            "error",
            file,
            "traceability.scenarioSpecSingle",
            specTags,
          ),
        );
      }

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
        scIdToLayer.set(id, layerBucket);
        const layerIds = layerToScIds.get(layerBucket) ?? new Set<string>();
        layerIds.add(id);
        layerToScIds.set(layerBucket, layerIds);
        const current = scIdToScenarioInfo.get(id) ?? {
          count: 0,
          names: new Set<string>(),
        };
        current.count += 1;
        current.names.add(scenario.name || "(unknown)");
        scIdToScenarioInfo.set(id, current);
      });
      if (specTags.length === 1 && scTags.length > 0) {
        const specTag = specTags[0];
        if (specTag) {
          const specNumber = extractSpecNumber(specTag);
          if (specNumber) {
            const invalidScIds = scTags.filter(
              (id) => extractScSpecNumber(id) !== specNumber,
            );
            if (invalidScIds.length > 0) {
              issues.push(
                issue(
                  "QFAI-TRACE-034",
                  `Scenario の SC ID が SPEC と一致しません: ${invalidScIds.join(
                    ", ",
                  )} (SPEC: ${specTags.join(", ")}) (${scenario.name})`,
                  "error",
                  file,
                  "traceability.scenarioScUnderSpec",
                  invalidScIds,
                ),
              );
            }
          }
        }
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

    const specInfo = scenarioToSpec.get(file);
    if (specInfo && specInfo.contractRefs.lines.length > 0) {
      if (
        !specInfo.contractRefs.hasNone &&
        specInfo.contractRefs.ids.length > 0 &&
        scenarioContractRefs.hasNone
      ) {
        issues.push(
          issue(
            "QFAI-TRACE-036",
            `Spec が契約 ID を列挙していますが Scenario が none を指定しています (SPEC: ${specInfo.specId ?? "unknown"})`,
            "warning",
            file,
            "traceability.scenarioContractRefNone",
          ),
        );
      }
      if (
        specInfo.contractRefs.hasNone &&
        scenarioContractRefs.ids.length > 0
      ) {
        issues.push(
          issue(
            "QFAI-TRACE-025",
            `Scenario の契約参照が Spec の QFAI-CONTRACT-REF に含まれていません: ${scenarioContractRefs.ids.join(
              ", ",
            )} (SPEC: ${specInfo.specId ?? "unknown"})`,
            "error",
            file,
            "traceability.scenarioContractSubset",
            scenarioContractRefs.ids,
          ),
        );
      } else if (!specInfo.contractRefs.hasNone) {
        const allowed = new Set(specInfo.contractRefs.ids);
        const invalidRefs = scenarioContractRefs.ids.filter(
          (id) => !allowed.has(id),
        );
        if (invalidRefs.length > 0) {
          issues.push(
            issue(
              "QFAI-TRACE-025",
              `Scenario の契約参照が Spec の QFAI-CONTRACT-REF に含まれていません: ${invalidRefs.join(
                ", ",
              )} (SPEC: ${specInfo.specId ?? "unknown"})`,
              "error",
              file,
              "traceability.scenarioContractSubset",
              invalidRefs,
            ),
          );
        }
      }
    }

    const duplicateScEntries = Array.from(scIdToScenarioInfo.entries())
      .filter(([, info]) => info.count > 1)
      .map(([id, info]) => ({
        id,
        names: Array.from(info.names).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    if (duplicateScEntries.length > 0) {
      const detail = duplicateScEntries
        .map((entry) => `${entry.id} (${entry.names.join(" / ")})`)
        .join(", ");
      issues.push(
        issue(
          "QFAI-TRACE-035",
          `Scenario ファイル内で SC が重複しています: ${detail}`,
          "error",
          file,
          "traceability.duplicateScInFile",
          duplicateScEntries.map((entry) => entry.id),
          "change",
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
          "QFAI-TRACE-009",
          `BR が SC に紐づいていません: ${orphanBrIds.join(", ")}`,
          "error",
          specsRoot,
          "traceability.brMustHaveSc",
          orphanBrIds,
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
  const parseErrors = scRefsResult.parseErrors;
  const hasScenarios = scIdsInScenarios.size > 0;
  const hasGlobConfig = testFileScan.globs.length > 0;
  const hasMatchedTests = testFileScan.matchedFileCount > 0;

  if (parseErrors.length > 0) {
    for (const entry of parseErrors) {
      const detail = entry.errors.join(" / ");
      issues.push(
        issue(
          "QFAI-TRACE-040",
          `テスト証跡の .feature 解析に失敗しました: ${detail}`,
          "error",
          entry.file,
          "traceability.testFileParse",
        ),
      );
    }
  }

  if (
    hasScenarios &&
    (!hasGlobConfig || !hasMatchedTests || scRefsResult.error)
  ) {
    const detail = scRefsResult.error ? `（詳細: ${scRefsResult.error}）` : "";
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
      const enforcedLayers = new Set<LayerBucket>();
      for (const [scId, refs] of scTestRefs.entries()) {
        if (!refs || refs.size === 0) {
          continue;
        }
        const layer = scIdToLayer.get(scId);
        if (layer) {
          enforcedLayers.add(layer);
        }
      }

      const deferredLayers: Array<{ layer: LayerBucket; missing: string[] }> =
        [];
      for (const [layer, scIds] of layerToScIds.entries()) {
        const missing = Array.from(scIds).filter((id) => {
          const refs = scTestRefs.get(id);
          return !refs || refs.size === 0;
        });
        if (missing.length === 0) {
          continue;
        }
        if (enforcedLayers.has(layer)) {
          const samples = missing.slice(0, SAMPLE_LIMIT);
          const truncated = samples.length < missing.length;
          const sampleText = samples.join(", ");
          const suffix = truncated ? " ..." : "";
          issues.push(
            issue(
              "QFAI-TRACE-010",
              `SC がテストで参照されていません (layer=${layer}, missing=${missing.length}, samples=${sampleText}${suffix})。testFileGlobs に一致するテストファイルへ QFAI:SC-XXXX-XXXX または .feature の @SC-XXXX-XXXX（対象の SC ID）を記載してください。`,
              config.validation.traceability.scNoTestSeverity,
              testsRoot,
              "traceability.scMustHaveTest",
              samples,
            ),
          );
        } else {
          deferredLayers.push({ layer, missing });
        }
      }

      if (deferredLayers.length > 0) {
        const summary = deferredLayers
          .map(
            (entry) => `layer=${entry.layer} missing=${entry.missing.length}`,
          )
          .join(", ");
        issues.push(
          issue(
            "QFAI-TRACE-041",
            `テスト証跡が未検出のレイヤーは SC→Test 判定を保留しました: ${summary}。該当レイヤーにテスト証跡が1件でも追加された時点で 100% を強制します。`,
            "info",
            testsRoot,
            "traceability.scMustHaveTest",
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
          `テストが未知の SC を参照しています: ${unknownScIds.join(", ")}`,
          "error",
          testsRoot,
          "traceability.scUnknownInTests",
          unknownScIds,
        ),
      );
    }
  }

  const orphanPolicy = config.validation.traceability.orphanContractsPolicy;
  if (orphanPolicy !== "allow") {
    if (contractIds.size > 0) {
      const orphanContracts = Array.from(contractIds).filter(
        (id) => !specContractIds.has(id),
      );
      if (orphanContracts.length > 0) {
        const severity: IssueSeverity =
          orphanPolicy === "warning" ? "warning" : "error";
        issues.push(
          issue(
            "QFAI-TRACE-022",
            `契約が Spec から参照されていません: ${orphanContracts.join(", ")}`,
            severity,
            specsRoot,
            "traceability.contractCoverage",
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

async function collectScenarioSpecInfo(
  entries: Array<{
    scenarioPath: string;
    specPath: string;
  }>,
): Promise<Map<string, { specId?: string; contractRefs: ParsedContractRefs }>> {
  const map = new Map<
    string,
    { specId?: string; contractRefs: ParsedContractRefs }
  >();
  for (const entry of entries) {
    let specText = "";
    try {
      specText = await readFile(entry.specPath, "utf-8");
    } catch {
      specText = "";
    }
    const parsed = specText ? parseSpec(specText, entry.specPath) : null;
    const contractRefs = parsed?.contractRefs ?? {
      lines: [],
      ids: [],
      invalidTokens: [],
      hasNone: false,
    };
    const info: { specId?: string; contractRefs: ParsedContractRefs } = {
      contractRefs,
    };
    if (parsed?.specId) {
      info.specId = parsed.specId;
    }
    map.set(entry.scenarioPath, info);
  }
  return map;
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
