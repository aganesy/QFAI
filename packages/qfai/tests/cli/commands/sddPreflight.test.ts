/**
 * `qfai sdd preflight` — the CLI entry point for the /qfai-sdd Stage 0 gate.
 *
 * `runSddPreflight` was implemented, exported and unit-tested but unreachable:
 * no command and no skill step called it, so Stage 0 was whatever the agent
 * typed into `.qfai/report/preflight_summary.md` by hand. These cases pin the
 * entry point (exit code, both output formats) and the template ↔ output
 * agreement that keeps the shipped form from drifting away from the writer.
 */

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runSddPreflightCommand } from "../../../src/cli/commands/sddPreflight.js";
import { writeDiscussionCurrentId } from "../../../src/core/state.js";

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

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-sdd-preflight-cli-"));
  tempDirs.push(root);
  return root;
}

type Sinks = {
  out: string[];
  err: string[];
  write: (message: string) => void;
  writeErr: (message: string) => void;
};

function newSinks(): Sinks {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    write: (message: string) => out.push(message),
    writeErr: (message: string) => err.push(message),
  };
}

describe("qfai sdd preflight", () => {
  it("exits 1 and writes the computed blocker set when no discussion-pack exists", async () => {
    const root = await newTempRoot();
    const sinks = newSinks();

    const exitCode = await runSddPreflightCommand({
      root,
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(1);
    expect(sinks.out.join("\n")).toContain("status: blocked");
    expect(sinks.err.join("\n")).toContain("blocked");

    const summary = await readFile(path.join(root, ".qfai", "report", "preflight_summary.md"), {
      encoding: "utf-8",
    });
    expect(summary).toContain("status: blocked");
    expect(summary).toContain("latest discussion-pack");
  });

  it("exits 0 and reports the computed REQ count when the latest pack is ready", async () => {
    const root = await newTempRoot();
    await seedDiscussionPack(root, "20260216010102003");
    const sinks = newSinks();

    const exitCode = await runSddPreflightCommand({
      root,
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(0);
    const stdout = sinks.out.join("\n");
    expect(stdout).toContain("status: ready");
    expect(stdout).toContain("imported REQ count: 2");
    expect(sinks.err).toEqual([]);

    const summary = await readFile(path.join(root, ".qfai", "report", "preflight_summary.md"), {
      encoding: "utf-8",
    });
    expect(summary).toContain("Imported REQ count: 2");
  });

  it("emits the machine-readable result under --format json", async () => {
    const root = await newTempRoot();
    const sinks = newSinks();

    const exitCode = await runSddPreflightCommand({
      root,
      format: "json",
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(1);
    const parsed: unknown = JSON.parse(sinks.out.join("\n"));
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("qfai sdd preflight --format json did not emit an object");
    }
    const payload: Record<string, unknown> = { ...parsed };
    expect(payload["status"]).toBe("blocked");
    expect(payload["source"]).toBe("discussion-pack");
    expect(Array.isArray(payload["blockers"])).toBe(true);
    expect(payload["nextCommands"]).toEqual(["/qfai-discussion"]);
  });

  it("does not send a ready result back to /qfai-discussion", async () => {
    // `nextCommands` is the blocker recovery route. Emitting it on a ready
    // result pushes an operator who should enter Stage 1 Triage back into
    // requirement authoring — in the text render and in the JSON payload.
    const root = await newTempRoot();
    await seedDiscussionPack(root, "20260216010102003");
    const sinks = newSinks();

    const exitCode = await runSddPreflightCommand({
      root,
      format: "json",
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(0);
    const parsed: unknown = JSON.parse(sinks.out.join("\n"));
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("qfai sdd preflight --format json did not emit an object");
    }
    const payload: Record<string, unknown> = { ...parsed };
    expect(payload["status"]).toBe("ready");
    expect(payload["nextCommands"]).toEqual([]);

    const textSinks = newSinks();
    await runSddPreflightCommand({
      root,
      write: textSinks.write,
      writeErr: textSinks.writeErr,
    });
    expect(textSinks.out.join("\n")).not.toContain("/qfai-discussion");
  });

  it("sends the downstream stages to the pack Stage 0 selected", async () => {
    // Stage 0 honours `.qfai/state.json#discussion.currentId`, so telling the
    // Inputs Priority to take the lexicographically largest pack gated one pack
    // and built the spec from another: the operator's requirements checked, a
    // different pack's requirements imported.
    const { readFile: read } = await import("node:fs/promises");
    const pathMod = await import("node:path");
    const url = await import("node:url");
    const repoRoot = pathMod.default.resolve(
      pathMod.default.dirname(url.fileURLToPath(import.meta.url)),
      "..",
      "..",
      "..",
      "..",
      "..",
    );
    for (const tree of ["packages/qfai/assets/init/.qfai", ".qfai"]) {
      const skill = await read(
        pathMod.default.join(tree, "assistant/skills/qfai-sdd/SKILL.md"),
        "utf-8",
      ).catch(() =>
        read(pathMod.default.join(repoRoot, tree, "assistant/skills/qfai-sdd/SKILL.md"), "utf-8"),
      );
      expect(skill, tree).toContain("**The pack Stage 0 selected**");
      expect(skill, tree).toContain("`selectedInputPath`");
      expect(skill, tree).toContain("Never re-derive it");
      // The instruction that caused it must be gone.
      expect(skill, tree).not.toContain("(lexicographically largest), validated by Stage 0");
    }
  });

  it("gates the pack the active pointer selects, not the newest one", async () => {
    const root = await newTempRoot();
    await seedDiscussionPack(root, "20260216010102003");
    // Newest pack on disk, but incomplete: only an active pointer at the
    // older pack should keep Stage 0 green.
    await mkdir(path.join(root, ".qfai", "discussion", "discussion-20260316010102003"), {
      recursive: true,
    });
    await writeDiscussionCurrentId(root, "discussion-20260216010102003");

    const sinks = newSinks();
    const exitCode = await runSddPreflightCommand({
      root,
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(0);
    const stdout = sinks.out.join("\n");
    expect(stdout).toContain("status: ready");
    expect(stdout).toContain("discussion-20260216010102003");
    expect(stdout).not.toContain("discussion-20260316010102003");
  });

  it("stops on an active pointer that matches no pack and keeps the summary intact", async () => {
    const root = await newTempRoot();
    await seedDiscussionPack(root, "20260216010102003");
    const summaryPath = path.join(root, ".qfai", "report", "preflight_summary.md");
    await mkdir(path.dirname(summaryPath), { recursive: true });
    await writeFile(summaryPath, "# Preflight Summary\n\n- keep me\n", "utf-8");
    await writeDiscussionCurrentId(root, "discussion-20990101010101001");

    const sinks = newSinks();
    const exitCode = await runSddPreflightCommand({
      root,
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(1);
    const stderr = sinks.err.join("\n");
    expect(stderr).toContain("discussion-20990101010101001");
    expect(stderr).toContain("qfai discussion use");
    expect(await readFile(summaryPath, { encoding: "utf-8" })).toContain("keep me");
  });

  it("stops instead of falling back to defaults when qfai.config.yaml is broken", async () => {
    const root = await newTempRoot();
    await seedDiscussionPack(root, "20260216010102003");
    await writeFile(path.join(root, "qfai.config.yaml"), "paths: [not, a, mapping\n", "utf-8");

    const sinks = newSinks();
    const exitCode = await runSddPreflightCommand({
      root,
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(1);
    expect(sinks.err.join("\n")).toContain("qfai.config.yaml");
    expect(sinks.out).toEqual([]);
    await expect(
      readFile(path.join(root, ".qfai", "report", "preflight_summary.md"), { encoding: "utf-8" }),
    ).rejects.toThrow();
  });

  it("records --assume carry-over and preserves it on the Stage 1 re-run", async () => {
    const root = await newTempRoot();
    await seedDiscussionPack(root, "20260216010102003");
    const summaryPath = path.join(root, ".qfai", "report", "preflight_summary.md");

    const first = newSinks();
    expect(
      await runSddPreflightCommand({
        root,
        assumptions: ["OQ-0001 は次フェーズへ持ち越し"],
        write: first.write,
        writeErr: first.writeErr,
      }),
    ).toBe(0);
    expect(await readFile(summaryPath, { encoding: "utf-8" })).toContain(
      "- OQ-0001 は次フェーズへ持ち越し",
    );

    // Required Process step 3 re-runs the command with no flags; the
    // carry-over recorded in Stage 0 must not become `- none`.
    const second = newSinks();
    expect(
      await runSddPreflightCommand({ root, write: second.write, writeErr: second.writeErr }),
    ).toBe(0);
    const summary = await readFile(summaryPath, { encoding: "utf-8" });
    expect(summary).toContain("- OQ-0001 は次フェーズへ持ち越し");
    expect(summary).not.toContain("- none");
  });

  it("keeps --assume carry-over across a blocked re-run", async () => {
    // A blocked Stage 0 must not eat the decision Stage 1 still has to
    // promote: the blocked summary carries the section, so the flagless
    // re-run reads it back instead of writing `- none`.
    const root = await newTempRoot();
    const summaryPath = path.join(root, ".qfai", "report", "preflight_summary.md");

    const first = newSinks();
    expect(
      await runSddPreflightCommand({
        root,
        assumptions: ["W-PENDING-PROMOTION は Stage 1 で昇格させる"],
        write: first.write,
        writeErr: first.writeErr,
      }),
    ).toBe(1);
    expect(await readFile(summaryPath, { encoding: "utf-8" })).toContain(
      "- W-PENDING-PROMOTION は Stage 1 で昇格させる",
    );

    const second = newSinks();
    expect(
      await runSddPreflightCommand({ root, write: second.write, writeErr: second.writeErr }),
    ).toBe(1);
    const summary = await readFile(summaryPath, { encoding: "utf-8" });
    expect(summary).toContain("- W-PENDING-PROMOTION は Stage 1 で昇格させる");
    expect(summary).not.toContain("- none");
  });

  it("reports the blockers without failing under --fail-on never", async () => {
    const root = await newTempRoot();
    const sinks = newSinks();

    const exitCode = await runSddPreflightCommand({
      root,
      failOn: "never",
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(0);
    expect(sinks.out.join("\n")).toContain("status: blocked");
  });

  it("keeps the shipped template's sections equal to the sections it writes", async () => {
    // The drift this case exists for: the template is a form an agent fills
    // in, the command is the writer, and nothing held the two together.
    const repoRoot = path.resolve(__dirname, "../../..");
    const template = await readFile(
      path.join(
        repoRoot,
        "assets/init/.qfai/assistant/skills/qfai-sdd/templates/report/preflight_summary.md",
      ),
      { encoding: "utf-8" },
    );

    const blockedRoot = await newTempRoot();
    const blockedSinks = newSinks();
    await runSddPreflightCommand({
      root: blockedRoot,
      write: blockedSinks.write,
      writeErr: blockedSinks.writeErr,
    });
    const blocked = await readFile(
      path.join(blockedRoot, ".qfai", "report", "preflight_summary.md"),
      { encoding: "utf-8" },
    );

    const readyRoot = await newTempRoot();
    await seedDiscussionPack(readyRoot, "20260216010102003");
    const readySinks = newSinks();
    await runSddPreflightCommand({
      root: readyRoot,
      write: readySinks.write,
      writeErr: readySinks.writeErr,
    });
    const ready = await readFile(path.join(readyRoot, ".qfai", "report", "preflight_summary.md"), {
      encoding: "utf-8",
    });

    const emitted = new Set([...headings(blocked), ...headings(ready)]);
    expect([...headings(template)].sort()).toEqual([...emitted].sort());
  });
});

function headings(markdown: string): Set<string> {
  const found = new Set<string>();
  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      found.add(line.slice(3).trim());
    }
  }
  return found;
}

async function seedDiscussionPack(root: string, timestamp: string): Promise<void> {
  const discussionDir = path.join(root, ".qfai", "discussion", `discussion-${timestamp}`);
  await mkdir(discussionDir, { recursive: true });

  for (const fileName of DISCUSSION_PACK_FILES) {
    await writeFile(
      path.join(discussionDir, fileName),
      `${defaultDiscussionPackContent(fileName)}\n`,
      "utf-8",
    );
  }

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
        "- Reason: 現段階では実装着手に影響しないため deferred とする。",
        "",
        "補足: blocking 条件（Disposition=open）に該当しない。",
      ].join("\n");
    case "13_Deferred.md":
      return [
        "# 13 Deferred",
        "",
        "### OQ-0001: contract versioning policy",
        "",
        "- Reason: 現段階では実装着手に影響しないため deferred とする。",
        "- Next decision point: 次回の cycle review",
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
