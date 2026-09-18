import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { runSddPreflight } from "../../src/core/preflight/sddPreflight.js";

const DISCUSSION_PACK_FILES = [
  "01_Context.md",
  "02_Inception-Deck.md",
  "03_Story-Workshop.md",
  "04_Sources.md",
  "05_Scope.md",
  "06_REQ.md",
  "07_NFR.md",
  "08_Glossary.md",
  "09_Constraints.md",
  "10_Policy.md",
  "11_OQ-Register.md",
  "12_OQ-Resolution-Log.md",
  "13_Deferred.md",
  "14_Review-Request.md",
  "99_delta.md",
] as const;

describe("runSddPreflight imported requirement count", () => {
  it("reports the intake as unknown when the REQ-ID column holds no REQ-NNNN id", async () => {
    // The column read nothing, and the prose scan that followed counted a
    // sentence saying the pack does not use `REQ-0001`: one requirement,
    // reported for a table of three.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203033", {
        "06_REQ.md": [
          "# 06 REQ",
          "",
          "This pack numbers its own requirements and does not use REQ-0001 onwards.",
          "",
          "| REQ-ID     | Title  | Description        | Source   | Priority | Status |",
          "| ---------- | ------ | ------------------ | -------- | -------- | ------ |",
          "| REQ-D-0001 | save   | keep the set       | SRC-0001 | must     | draft  |",
          "| REQ-D-0002 | reload | read the set again | SRC-0001 | must     | draft  |",
          "| REQ-D-0003 | export | write the set out  | SRC-0001 | should   | draft  |",
          "",
        ].join("\n"),
      });

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.importedReqCount).toBeNull();
      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("Imported REQ count: unknown");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("still counts distinct ids in a 06_REQ.md with no REQ-ID column", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203034", {
        "06_REQ.md": [
          "# 06 REQ",
          "",
          "- REQ-0001: keep the set of requirements for the audit trail",
          "- REQ-0002: read the saved set again, which depends on REQ-0001",
          "",
        ].join("\n"),
      });

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.importedReqCount).toBe(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function seedDiscussionPack(
  root: string,
  timestamp: string,
  overrides: Partial<Record<(typeof DISCUSSION_PACK_FILES)[number], string>> = {},
): Promise<void> {
  const discussionDir = path.join(root, ".qfai", "discussion", `discussion-${timestamp}`);
  await mkdir(discussionDir, { recursive: true });

  for (const fileName of DISCUSSION_PACK_FILES) {
    const content = overrides[fileName] ?? defaultDiscussionPackContent(fileName);
    await writeFile(path.join(discussionDir, fileName), `${content}\n`, "utf-8");
  }

  // Required side artifact
  await writeFile(
    path.join(discussionDir, "prototyping.yaml"),
    [
      "prototyping:",
      "  recommended_mode: full-harness",
      "  rationale: UI validation is recommended.",
      "  allowed_modes:",
      "    - full-harness",
      "  surface: web",
    ].join("\n"),
    "utf-8",
  );
}

function defaultDiscussionPackContent(fileName: (typeof DISCUSSION_PACK_FILES)[number]): string {
  switch (fileName) {
    case "03_Story-Workshop.md":
      return [
        "# 03 Story Workshop",
        "",
        "```mermaid",
        "sequenceDiagram",
        "  participant U as User",
        "  participant S as System",
        "  U->>S: request",
        "```",
        "",
        "補足: Mermaid diagram を含む Story Workshop テスト用データ。",
      ].join("\n");
    case "06_REQ.md":
      return [
        "# 06 REQ",
        "",
        "- REQ-0001: ユーザーは要件セットを保存できる。背景として監査対応が必要である。",
        "- REQ-0002: システムは保存した要件セットを再読込できる。再読込時の整合性チェックも含む。",
        "",
        "補足: 最小内容チェックを通すため、説明文を十分な文字数で保持する。",
      ].join("\n");
    case "11_OQ-Register.md":
      return [
        "# 11 OQ Register",
        "",
        "### OQ-0001: contract versioning policy",
        "- Disposition: deferred",
        "- Gate: discussion",
        "- Reason: 現段階では v1.4.36 の実装着手に影響しないため deferred とする。",
        "",
        "補足: blocking 条件（Disposition=open）に該当しない。",
      ].join("\n");
    case "13_Deferred.md":
      return [
        "# 13 Deferred",
        "",
        "### OQ-0001: contract versioning policy",
        "",
        "- Reason: 現段階では v1.4.36 の実装着手に影響しないため deferred とする。",
        "- Next decision point: v1.5.x cycle review",
        "",
        "補足: 11_OQ-Register.md の deferred OQ は本ファイルに記載する。",
      ].join("\n");
    default:
      return [
        `# ${fileName}`,
        "",
        "このファイルは preflight テスト用のダミー本文です。",
        "最低100文字要件を満たすため、仕様意図と制約を記述しています。",
        "テンプレート占位子だけではない実文を含め、validator の incomplete 判定を回避します。",
      ].join("\n");
  }
}
