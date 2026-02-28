import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { runSddPreflight } from "../../src/core/preflight/sddPreflight.js";

const REQUIRE_PACK_FILES = [
  "01_Sources.md",
  "02_Scope.md",
  "03_REQ.md",
  "04_NFR.md",
  "05_Glossary.md",
  "06_Constraints.md",
  "07_Policy.md",
  "08_OQ.md",
  "09_delta.md",
] as const;

describe("runSddPreflight", () => {
  it("returns ready when latest require-pack passes readiness checks", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedRequirePack(root, "20260216010102003");

      const result = await runSddPreflight(root, defaultConfig, {
        assumptions: ["CAP-0003 の詳細化は次フェーズで行う"],
      });

      expect(result.status).toBe("ready");
      expect(result.source).toBe("require-pack");
      expect(result.importedReqCount).toBe(2);
      expect(result.blockers).toHaveLength(0);
      expect(result.selectedInputPath).toContain("require-20260216010102003");

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("status: ready");
      expect(summary).toContain("source: require-pack");
      expect(summary).toContain("Imported REQ count: 2");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns blocked when require-pack is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("blocked");
      expect(result.source).toBe("require-pack");
      expect(result.selectedInputPath).toBeNull();
      expect(
        result.blockers.some((item) => item.includes("latest require-pack")),
      ).toBe(true);
      expect(result.nextCommands).toEqual(["/qfai-require", "/qfai-discuss"]);

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("status: blocked");
      expect(summary).toContain("/qfai-require");
      expect(summary).toContain("/qfai-discuss");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns blocked when require-pack has blocking OQ", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedRequirePack(root, "20260216010203004", {
        "08_OQ.md": [
          "# 08 OQ",
          "",
          "### OQ-0009: architecture decision pending",
          "- Disposition: open",
          "- Gate: sdd",
          "- Reason: database migration strategy is under discussion",
          "",
          "補足: この OQ は v1.4.35 preflight を停止させることを確認するためのテスト用データです。",
        ].join("\n"),
      });

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("blocked");
      expect(result.blockers.some((item) => item.includes("OQ-0009"))).toBe(
        true,
      );

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("Blocking OQ");
      expect(summary).toContain("OQ-0009");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns blocked with dangerous naming details when canonical pack is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await mkdir(path.join(root, ".qfai", "require", "require-latest"), {
        recursive: true,
      });

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("blocked");
      expect(result.selectedInputPath).toBeNull();
      expect(
        result.blockers.some((item) => item.includes("latest require-pack")),
      ).toBe(true);
      expect(
        result.blockers.some((item) => item.includes("require-latest")),
      ).toBe(true);

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("status: blocked");
      expect(summary).toContain("require-latest");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function seedRequirePack(
  root: string,
  timestamp: string,
  overrides: Partial<Record<(typeof REQUIRE_PACK_FILES)[number], string>> = {},
): Promise<void> {
  const requireDir = path.join(
    root,
    ".qfai",
    "require",
    `require-${timestamp}`,
  );
  await mkdir(requireDir, { recursive: true });

  for (const fileName of REQUIRE_PACK_FILES) {
    const content = overrides[fileName] ?? defaultRequirePackContent(fileName);
    await writeFile(path.join(requireDir, fileName), `${content}\n`, "utf-8");
  }
}

function defaultRequirePackContent(
  fileName: (typeof REQUIRE_PACK_FILES)[number],
): string {
  switch (fileName) {
    case "03_REQ.md":
      return [
        "# 03 REQ",
        "",
        "- REQ-0001: ユーザーは要件セットを保存できる。背景として監査対応が必要である。",
        "- REQ-0002: システムは保存した要件セットを再読込できる。再読込時の整合性チェックも含む。",
        "",
        "補足: 最小内容チェックを通すため、説明文を十分な文字数で保持する。",
      ].join("\n");
    case "08_OQ.md":
      return [
        "# 08 OQ",
        "",
        "### OQ-0001: contract versioning policy",
        "- Disposition: deferred",
        "- Gate: discuss",
        "- Reason: 現段階では v1.4.35 の実装着手に影響しないため deferred とする。",
        "",
        "補足: blocking 条件（Disposition=open + Gate=discuss|require|sdd）に該当しない。",
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
