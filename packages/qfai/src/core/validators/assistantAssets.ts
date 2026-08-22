import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  ASSISTANT_ASSETS_LOCK_BASENAME,
  GOVERNED_ASSISTANT_LAYERS,
  buildShippedAssistantHashes,
  classifyAssistantAsset,
  collectGovernedAssistantFiles,
  hashAssistantAssetFile,
  readAssistantAssetsLock,
} from "../assistantAssetProvenance.js";
import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import { ASSISTANT_DIR } from "../paths/assistantPaths.js";
import { getInitAssetsDir } from "../../shared/assets.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const DRIFT_PROTOCOL_MARKER = "[DRIFT-PROTOCOL:MANDATORY]";
const REVIEWER_GATE_HEADING_PATTERN = /^###\s+Reviewer Gate\b.*$/im;
const ANY_MARKDOWN_HEADING_PATTERN = /^\s*#{1,6}\s+/m;

export async function validateAssistantAssets(root: string, config: QfaiConfig): Promise<Issue[]> {
  const skillsDir = resolvePath(root, config, "skillsDir");
  const assistantDir = path.dirname(skillsDir);

  // Post-recut: drift-protocol.md is canonically located at
  // .qfai/assistant/constitution/drift-protocol.md. Fall back to the
  // legacy instructions/ path during the compatibility window so
  // projects that have not yet run `qfai init --upgrade-assistant-tree`
  // pass for now.
  const canonicalDriftProtocolPath = path.join(assistantDir, "constitution", "drift-protocol.md");
  const legacyDriftProtocolPath = path.join(assistantDir, "instructions", "drift-protocol.md");
  const driftProtocolPath = (await exists(canonicalDriftProtocolPath))
    ? canonicalDriftProtocolPath
    : legacyDriftProtocolPath;
  // Post-recut: test-layers.md is canonically located at
  // .qfai/assistant/catalog/test-layers.md. Fall back to the legacy
  // steering/ path during the compatibility window so projects that
  // have not yet run `qfai init --upgrade-assistant-tree` are not
  // double-penalized (D-DEPRECATED-PATH + QFAI-ASSETS-002).
  const canonicalTestLayersPath = path.join(assistantDir, "catalog", "test-layers.md");
  const legacyTestLayersPath = path.join(assistantDir, "steering", "test-layers.md");
  const testLayersPath = (await exists(canonicalTestLayersPath))
    ? canonicalTestLayersPath
    : legacyTestLayersPath;

  const issues: Issue[] = [];

  if (!(await exists(driftProtocolPath))) {
    issues.push(
      issue(
        "QFAI-ASSETS-001",
        "必須ファイル .qfai/assistant/constitution/drift-protocol.md (legacy fallback: .qfai/assistant/instructions/drift-protocol.md) が見つかりません。",
        "error",
        canonicalDriftProtocolPath,
        "assistantAssets.driftProtocol",
      ),
    );
  }

  if (!(await exists(testLayersPath))) {
    issues.push(
      issue(
        "QFAI-ASSETS-002",
        "必須ファイル .qfai/assistant/catalog/test-layers.md (legacy fallback: .qfai/assistant/steering/test-layers.md) が見つかりません。",
        "error",
        canonicalTestLayersPath,
        "assistantAssets.testLayers",
      ),
    );
  }

  issues.push(...(await validateAssistantAssetProvenance(assistantDir)));

  const skillFiles = await collectSkillFiles([skillsDir]);
  for (const skillFile of skillFiles) {
    const content = await readFile(skillFile, "utf-8");

    if (!content.includes(DRIFT_PROTOCOL_MARKER)) {
      issues.push(
        issue(
          "QFAI-SKILLS-010",
          "SKILL.md に必須 marker [DRIFT-PROTOCOL:MANDATORY] がありません。",
          "error",
          skillFile,
          "skills.driftProtocolMarker",
        ),
      );
    }

    const reviewerGateSection = extractReviewerGateSection(content);
    if (reviewerGateSection === null) {
      issues.push(
        issue(
          "QFAI-SKILLS-011",
          "SKILL.md に `### Reviewer Gate` セクションがありません。",
          "error",
          skillFile,
          "skills.reviewerGate",
        ),
      );
      continue;
    }

    const missingTerms = collectMissingReviewerGateTerms(reviewerGateSection);
    if (missingTerms.length > 0) {
      issues.push(
        issue(
          "QFAI-SKILLS-012",
          `Reviewer Gate に Drift/test-layer 観点が不足しています（不足: ${missingTerms.join(", ")}）。`,
          "warning",
          skillFile,
          "skills.reviewerGatePolicy",
        ),
      );
    }
  }

  return issues;
}

/**
 * Compares the vendored `constitution/` and `catalog/` layers against the
 * release that is actually installed.
 *
 * Before this check the only coverage of qfai's own normative tree was two
 * existence probes, so a project could rewrite the file qfai calls its layer
 * SSOT and nothing anywhere would say so — downstream reasoning then cites the
 * fork by line number as though it were shipped policy. The three findings are
 * separate because the remedies are: a stale copy is refreshed by
 * `qfai init --force`, a fork needs a human merge decision, and an unshipped
 * file belongs in a `*.local.md` overlay.
 *
 * A project with no recorded provenance is not penalised for that alone: only
 * files that also differ from the installed release are reported, and they are
 * reported at `warning`, never `error`.
 */
async function validateAssistantAssetProvenance(assistantDir: string): Promise<Issue[]> {
  let shipped: Record<string, string>;
  try {
    // Path SSOT (`.qfai/contracts/cli/qfai-init.md`): the assistant-tree
    // segments come from `assistantPaths.ts` in init and in validate alike, so
    // a future move of `ASSISTANT_DIR` cannot leave the two reading different
    // trees.
    shipped = await buildShippedAssistantHashes(
      path.join(getInitAssetsDir(), ...ASSISTANT_DIR.split("/")),
    );
  } catch {
    // No readable template tree (an unusual installation, or a library
    // consumer without the package assets). Provenance is unknowable rather
    // than violated, so report nothing.
    return [];
  }

  const lock = await readAssistantAssetsLock(assistantDir);
  const issues: Issue[] = [];
  let vendored: string[];
  try {
    vendored = await collectGovernedAssistantFiles(assistantDir);
  } catch {
    return [];
  }

  // The union of both key sets, not just what is on disk. Walking only the
  // vendored files never classified a governed file the project deleted, so
  // removing a normative rule was the one edit that passed `validate` in
  // silence — the exact bypass this check exists to close.
  const relatives = [...new Set([...Object.keys(shipped), ...vendored])].sort((a, b) =>
    a.localeCompare(b),
  );

  // An absence is only reportable inside a layer the project actually has. A
  // consumer that never ran `init` here, or one still on the pre-recut
  // `instructions/` + `steering/` layout, is not missing files — it has no
  // governed layer at all, and reporting every shipped rule at it would be
  // noise, not governance.
  const presentLayers = new Set<string>();
  for (const layer of GOVERNED_ASSISTANT_LAYERS) {
    if (await isDirectory(path.join(assistantDir, layer))) {
      presentLayers.add(layer);
    }
  }

  for (const relative of relatives) {
    const filePath = path.join(assistantDir, ...relative.split("/"));
    const status = classifyAssistantAsset(
      await hashAssistantAssetFile(filePath),
      shipped[relative],
      lock?.files[relative],
    );
    if (status === "missing" && !presentLayers.has(relative.split("/")[0] ?? "")) {
      continue;
    }
    if (status === "missing" && EXISTENCE_CHECKED_ELSEWHERE.has(relative)) {
      // QFAI-ASSETS-001/002 already own these two, and they own the legacy
      // pre-recut fallback with them: reporting the absence again here would
      // both duplicate the finding and penalise every project still on
      // `instructions/` or `steering/`.
      continue;
    }
    const finding = provenanceIssue(status, relative, filePath);
    if (finding !== null) {
      issues.push(finding);
    }
  }

  return issues;
}

/**
 * Governed paths whose absence is already reported, with a legacy fallback, by
 * the existence probes above.
 */
const EXISTENCE_CHECKED_ELSEWHERE = new Set([
  "constitution/drift-protocol.md",
  "catalog/test-layers.md",
]);

function provenanceIssue(
  status: ReturnType<typeof classifyAssistantAsset>,
  relative: string,
  filePath: string,
): Issue | null {
  switch (status) {
    case "shipped":
      return null;
    case "stale":
      return issue(
        "QFAI-ASSETS-003",
        `${ASSISTANT_DIR}/${relative} は導入時に qfai が書いた内容のままですが、インストール済みリリースの内容と異なります（stale copy）。`,
        "warning",
        filePath,
        "assistantAssets.staleVendoredAsset",
        undefined,
        "canonical",
        "`npx qfai init --force` を実行すると、qfai が書いた内容のままのファイルだけを最新リリースへ更新します。",
      );
    case "forked":
      return issue(
        "QFAI-ASSETS-004",
        `${ASSISTANT_DIR}/${relative} はインストール済みリリースの内容とも ${ASSISTANT_ASSETS_LOCK_BASENAME} の記録とも一致しません（local fork）。`,
        "warning",
        filePath,
        "assistantAssets.forkedVendoredAsset",
        undefined,
        "canonical",
        "プロジェクト固有のルールは同じ層の `*.local.md` overlay に移し、qfai 所有ファイルは出荷内容へ戻してください。恒久的な差分が必要な場合は Change Request を残してください。",
      );
    case "unshipped":
      return issue(
        "QFAI-ASSETS-005",
        `${ASSISTANT_DIR}/${relative} はインストール済みリリースに存在しないファイルです（overlay 以外の追加）。`,
        "warning",
        filePath,
        "assistantAssets.unshippedVendoredAsset",
        undefined,
        "canonical",
        "`*.local.md` overlay として置き直してください。overlay は qfai init が書かず、provenance 検査も対象外です。",
      );
    case "missing":
      return issue(
        "QFAI-ASSETS-006",
        `${ASSISTANT_DIR}/${relative} はインストール済みリリースが出荷する規範ファイルですが、通常ファイルとして存在しません（欠落）。`,
        "warning",
        filePath,
        "assistantAssets.missingVendoredAsset",
        undefined,
        "canonical",
        "`npx qfai init` を実行すると欠落した出荷ファイルを復元します。適用対象外にしたい規範がある場合は、削除ではなく Change Request を残してください。",
      );
  }
}

async function collectSkillFiles(dirs: string[]): Promise<string[]> {
  const files = await Promise.all(dirs.map((dir) => collectFiles(dir)));
  return files
    .flat()
    .filter((filePath) => path.basename(filePath) === "SKILL.md")
    .sort((a, b) => a.localeCompare(b));
}

function extractReviewerGateSection(content: string): string | null {
  const headingMatch = REVIEWER_GATE_HEADING_PATTERN.exec(content);
  if (!headingMatch) {
    return null;
  }
  const headingStart = headingMatch.index;
  const headingText = headingMatch[0];
  const sectionStart = headingStart + headingText.length;
  const remainder = content.slice(sectionStart);
  const nextHeadingMatch = ANY_MARKDOWN_HEADING_PATTERN.exec(remainder);
  if (!nextHeadingMatch) {
    return remainder;
  }
  return remainder.slice(0, nextHeadingMatch.index);
}

function collectMissingReviewerGateTerms(section: string): string[] {
  const missing: string[] = [];
  if (!/drift protocol/i.test(section)) {
    missing.push("Drift Protocol");
  }
  if (!/test-layers\.md/i.test(section)) {
    missing.push("test-layers.md");
  }
  const hasSignalsPhrase = /\bnot gates?\b/i.test(section) || /\bsignals?\b/i.test(section);
  if (!hasSignalsPhrase) {
    missing.push("not gates/signals");
  }
  return missing;
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
