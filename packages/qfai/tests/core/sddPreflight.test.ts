import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
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

describe("runSddPreflight", () => {
  it("returns ready when latest discussion-pack passes readiness checks", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010102003");

      const result = await runSddPreflight(root, defaultConfig, {
        assumptions: ["CAP-0003 の詳細化は次フェーズで行う"],
      });

      expect(result.status).toBe("ready");
      expect(result.source).toBe("discussion-pack");
      expect(result.importedReqCount).toBe(2);
      expect(result.blockers).toHaveLength(0);
      expect(result.selectedInputPath).toContain("discussion-20260216010102003");

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("status: ready");
      expect(summary).toContain("source: discussion-pack");
      expect(summary).toContain("Imported REQ count: 2");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns blocked when discussion-pack is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("blocked");
      expect(result.source).toBe("discussion-pack");
      expect(result.selectedInputPath).toBeNull();
      expect(result.blockers.some((item) => item.includes("latest discussion-pack"))).toBe(true);
      expect(result.nextCommands).toEqual(["/qfai-discussion"]);

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("status: blocked");
      expect(summary).toContain("/qfai-discussion");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns blocked when discussion-pack has blocking OQ", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203004", {
        "11_OQ-Register.md": [
          "# 11 OQ Register",
          "",
          "### OQ-0009: architecture decision pending",
          "- Disposition: open",
          "- Gate: sdd",
          "- Reason: database migration strategy is under discussion",
          "",
          "補足: この OQ は v1.4.36 preflight を停止させることを確認するためのテスト用データです。",
        ].join("\n"),
      });

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("blocked");
      expect(result.blockers.some((item) => item.includes("OQ-0009"))).toBe(true);

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("Blocking OQ");
      expect(summary).toContain("OQ-0009");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores unscoped disposition guidance lines in OQ register", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203005", {
        "11_OQ-Register.md": [
          "# 11 OQ Register",
          "",
          "運用ルール: 未解決事項は `- Disposition: open` を設定する。",
          "",
          "### OQ-0010: rollout memo refinement",
          "- Disposition: deferred",
          "- Gate: discussion",
          "- Reason: 実装着手前の補助情報であり本フェーズでは保留可能。",
          "",
        ].join("\n"),
      });

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not block when latest UI-bearing discussion pack is missing prototyping.yaml", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216010203010");
      await mkdir(packDir, { recursive: true });

      for (const fileName of DISCUSSION_PACK_FILES) {
        const content = defaultDiscussionPackContent(fileName);
        await writeFile(path.join(packDir, fileName), `${content}\n`, "utf-8");
      }
      // Do NOT write prototyping.yaml

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not block when latest non-ui discussion pack omits prototyping.yaml", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216010203016");
      await mkdir(packDir, { recursive: true });

      for (const fileName of DISCUSSION_PACK_FILES) {
        const content =
          fileName === "01_Context.md"
            ? [
                "# 01_Context.md",
                "",
                "## UI-bearing Classification",
                "",
                "- ui_bearing: false",
                "- primary_surface: non-ui",
                "- secondary_surfaces:",
                "- classification_rationale: This pack documents a non-UI workflow.",
                "",
                "補足: non-ui latest discussion pack では prototyping.yaml は不要。",
              ].join("\n")
            : defaultDiscussionPackContent(fileName);
        await writeFile(path.join(packDir, fileName), `${content}\n`, "utf-8");
      }

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not block when prototyping.yaml exists but namespaced schema is invalid", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203011");
      // Overwrite prototyping.yaml with invalid namespaced schema
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216010203011");
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        ["prototyping:", "  recommended_mode: invalid-mode", "  rationale: ''", ""].join("\n"),
        "utf-8",
      );

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // The skill path has to reach the same verdict this function does. `/qfai-sdd`
  // Stage 0 once said to STOP on a `prototyping.yaml` that does not parse, while
  // this preflight answers `ready` for the very same input — so whether SDD could
  // proceed depended on which entry point you came in through, and a project
  // carrying an old-format file could not run the skill at all. Assert both
  // halves in one place: the runtime verdict, and the shipped prose that
  // describes it.
  it("agrees with the shipped Stage 0 playbook that a malformed file is not a blocker", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203099");
      await writeFile(
        path.join(root, ".qfai", "discussion", "discussion-20260216010203099", "prototyping.yaml"),
        "prototyping: invalid\n",
        "utf-8",
      );

      const result = await runSddPreflight(root, defaultConfig);
      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }

    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const playbookRel = "assistant/skills/qfai-sdd/references/sdd-execution-playbook.md";
    for (const tree of ["packages/qfai/assets/init/.qfai", ".qfai"]) {
      const playbook = (await readFile(path.join(repoRoot, tree, playbookRel), "utf-8")).replace(
        /\s*\n\s*/g,
        " ",
      );
      expect(playbook, `${tree} Stage 0 still stops where this preflight continues`).not.toContain(
        "Stop if `prototyping.yaml` is present in the latest UI-bearing pack",
      );
      expect(playbook).toContain("A malformed optional artifact is **not** a Stage 0 blocker");
    }
  });

  // W-4.10: non-object namespaced block blocks preflight
  it("does not block when prototyping.yaml has scalar namespaced block", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203014");
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216010203014");
      await writeFile(path.join(packDir, "prototyping.yaml"), "prototyping: invalid\n", "utf-8");

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not block when prototyping.yaml has null namespaced block", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203015");
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216010203015");
      await writeFile(path.join(packDir, "prototyping.yaml"), "prototyping: null\n", "utf-8");

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not block when prototyping.yaml has valid namespaced schema", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203012");

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not block when prototyping.yaml uses legacy-only schema (no prototyping namespace)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203013");
      // Overwrite with legacy-only schema (no prototyping namespace)
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216010203013");
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "recommended_mode: full-harness",
          "rationale: top-level legacy valid",
          "allowed_modes:",
          "  - full-harness",
          "surface: web",
        ].join("\n"),
        "utf-8",
      );

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not block when contradictory non-ui classification omits prototyping.yaml", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216010203020");
      await mkdir(packDir, { recursive: true });

      for (const fileName of DISCUSSION_PACK_FILES) {
        const content =
          fileName === "01_Context.md"
            ? [
                "# 01_Context.md",
                "",
                "## UI-bearing Classification",
                "",
                "- ui_bearing: false",
                "- primary_surface: non-ui",
                "- secondary_surfaces:",
                "  - web",
                "- classification_rationale: Contradictory classification.",
                "",
              ].join("\n")
            : defaultDiscussionPackContent(fileName);
        await writeFile(path.join(packDir, fileName), `${content}\n`, "utf-8");
      }
      // Do NOT write prototyping.yaml

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not block when classification is missing and prototyping.yaml is absent", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216010203021");
      await mkdir(packDir, { recursive: true });

      for (const fileName of DISCUSSION_PACK_FILES) {
        const content =
          fileName === "01_Context.md"
            ? [
                "# 01_Context.md",
                "",
                "This context file has no classification block at all.",
                "The validator should treat this as prototyping-required.",
                "",
              ].join("\n")
            : defaultDiscussionPackContent(fileName);
        await writeFile(path.join(packDir, fileName), `${content}\n`, "utf-8");
      }
      // Do NOT write prototyping.yaml

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns blocked with dangerous naming details when canonical pack is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await mkdir(path.join(root, ".qfai", "discussion", "discussion-latest"), {
        recursive: true,
      });

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("blocked");
      expect(result.selectedInputPath).toBeNull();
      expect(result.blockers.some((item) => item.includes("latest discussion-pack"))).toBe(true);
      expect(result.blockers.some((item) => item.includes("discussion-latest"))).toBe(true);

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("status: blocked");
      expect(summary).toContain("discussion-latest");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("writes the summary into a run-scoped directory and mirrors it to the latest pointer", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010102010");

      const result = await runSddPreflight(root, defaultConfig);
      const reportRoot = path.join(root, ".qfai", "report");

      expect(result.runId).toMatch(/^run-\d{17}$/);
      expect(result.preflightSummaryPath).toBe(
        path.join(reportRoot, "preflight", result.runId, "preflight_summary.md"),
      );
      expect(result.latestPreflightSummaryPath).toBe(path.join(reportRoot, "preflight_summary.md"));

      const runScoped = await readFile(result.preflightSummaryPath, "utf-8");
      const latest = await readFile(result.latestPreflightSummaryPath, "utf-8");
      expect(runScoped).toContain(`run id: ${result.runId}`);
      expect(latest).toBe(runScoped);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps an earlier run's summary readable after a later preflight", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const first = await runSddPreflight(root, defaultConfig);
      await seedDiscussionPack(root, "20260216010102011");
      const second = await runSddPreflight(root, defaultConfig);

      expect(second.runId).not.toBe(first.runId);

      const firstSummary = await readFile(first.preflightSummaryPath, "utf-8");
      const secondSummary = await readFile(second.preflightSummaryPath, "utf-8");
      expect(firstSummary).toContain("status: blocked");
      expect(secondSummary).toContain("status: ready");

      const latest = await readFile(second.latestPreflightSummaryPath, "utf-8");
      expect(latest).toBe(secondSummary);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // Run directories are named from the run's START time, so a slow preflight
  // started first can finish last. An unconditional pointer write then left
  // `preflight_summary.md` describing the older run while a newer
  // `preflight/run-*` sat beside it.
  it("does not let an older run overwrite a newer run's latest pointer", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010102013");

      // The newer run publishes first; the older one finishes after it.
      const newer = await runSddPreflight(root, defaultConfig, {
        startedAt: new Date("2026-02-16T02:00:00.000Z"),
      });
      const older = await runSddPreflight(root, defaultConfig, {
        startedAt: new Date("2026-02-16T01:00:00.000Z"),
      });

      expect(older.runId < newer.runId).toBe(true);

      // The older run still owns its own run-scoped evidence...
      const olderSummary = await readFile(older.preflightSummaryPath, "utf-8");
      expect(olderSummary).toContain(older.runId);

      // ...but the pointer keeps naming the newest run.
      const latest = await readFile(newer.latestPreflightSummaryPath, "utf-8");
      expect(latest).toContain(newer.runId);
      expect(latest).not.toContain(older.runId);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reads the pointer's own run id when the newer run directory is gone", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010102014");

      const newer = await runSddPreflight(root, defaultConfig, {
        startedAt: new Date("2026-02-16T02:00:00.000Z"),
      });
      // Prune the newer run's directory, leaving only the pointer it wrote —
      // the second guard is the only thing left to notice it.
      await rm(path.dirname(newer.preflightSummaryPath), { recursive: true, force: true });

      const older = await runSddPreflight(root, defaultConfig, {
        startedAt: new Date("2026-02-16T01:00:00.000Z"),
      });

      const latest = await readFile(older.latestPreflightSummaryPath, "utf-8");
      expect(latest).toContain(newer.runId);
      expect(latest).not.toContain(older.runId);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("still refreshes the pointer when this run is the newest", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010102015");

      const older = await runSddPreflight(root, defaultConfig, {
        startedAt: new Date("2026-02-16T01:00:00.000Z"),
      });
      const newer = await runSddPreflight(root, defaultConfig, {
        startedAt: new Date("2026-02-16T02:00:00.000Z"),
      });

      const latest = await readFile(newer.latestPreflightSummaryPath, "utf-8");
      expect(latest).toContain(newer.runId);
      expect(latest).not.toContain(older.runId);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps preflight runs out of the validate run-log namespace", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010102012");

      const result = await runSddPreflight(root, defaultConfig);
      const reportRoot = path.join(root, ".qfai", "report");
      const entries = await readdir(reportRoot, { withFileTypes: true });

      // `<outDir>/run-*` belongs to `writeValidateRunLog`; a preflight directory
      // there would become the "newest `run-*`" the Validate Hard Gate reads.
      expect(entries.filter((entry) => entry.name.startsWith("run-"))).toEqual([]);
      expect(result.preflightSummaryPath).toContain(`${path.sep}preflight${path.sep}`);
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
