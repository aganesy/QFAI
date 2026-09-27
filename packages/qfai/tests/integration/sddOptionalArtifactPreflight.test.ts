import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runSddPreflightCommand } from "../../src/cli/commands/sddPreflight.js";
import { defaultConfig } from "../../src/core/config.js";
import { runSddPreflight } from "../../src/core/preflight/sddPreflight.js";

type CommandVerdict = { exit: number; status: unknown; blockers: unknown };

const COMMAND_READY: CommandVerdict = { exit: 0, status: "ready", blockers: [] };

/** Runs `qfai sdd preflight --format json` on `root` and reads its exit code and report. */
async function preflightCommand(root: string): Promise<CommandVerdict> {
  const out: string[] = [];
  const exit = await runSddPreflightCommand({
    root,
    format: "json",
    write: (message) => out.push(message),
    writeErr: () => undefined,
  });
  const report: unknown = JSON.parse(out.join("\n"));
  if (typeof report !== "object" || report === null) throw new Error("no JSON report");
  return {
    exit,
    status: "status" in report ? report.status : undefined,
    blockers: "blockers" in report ? report.blockers : undefined,
  };
}

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

const VALID_PROTOTYPING = [
  "prototyping:",
  "  recommended_mode: full-harness",
  "  rationale: UI validation is recommended.",
  "  allowed_modes:",
  "    - full-harness",
  "  surface: web",
].join("\n");

describe("SDD preflight optional discussion side artifact", () => {
  // QFAI:SPEC-0013:TC-0013-0036
  it("does not block when a usable discussion pack is missing prototyping.yaml", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const packDir = await seedDiscussionPack(root, "20260216010203010", false);

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
      expect(await preflightCommand(root)).toEqual(COMMAND_READY);

      // The same pack with a valid artifact reaches the same verdict, so absence decides nothing.
      await writeFile(path.join(packDir, "prototyping.yaml"), VALID_PROTOTYPING, "utf-8");
      expect((await runSddPreflight(root, defaultConfig)).status).toBe("ready");
      expect(await preflightCommand(root)).toEqual(COMMAND_READY);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0013:TC-0013-0037
  it("does not block when prototyping.yaml exists but namespaced schema is invalid", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const packDir = await seedDiscussionPack(root, "20260216010203011");
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        ["prototyping:", "  recommended_mode: invalid-mode", "  rationale: ''", ""].join("\n"),
        "utf-8",
      );

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
      expect(await preflightCommand(root)).toEqual(COMMAND_READY);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:SPEC-0013:TC-0013-0037
  it("does not block when prototyping.yaml uses legacy-only schema (no prototyping namespace)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const packDir = await seedDiscussionPack(root, "20260216010203013");
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
      expect(await preflightCommand(root)).toEqual(COMMAND_READY);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function seedDiscussionPack(
  root: string,
  timestamp: string,
  includePrototyping = true,
): Promise<string> {
  const packDir = path.join(root, ".qfai", "discussion", `discussion-${timestamp}`);
  await mkdir(packDir, { recursive: true });

  for (const fileName of DISCUSSION_PACK_FILES) {
    await writeFile(
      path.join(packDir, fileName),
      `${defaultDiscussionPackContent(fileName)}\n`,
      "utf-8",
    );
  }
  if (includePrototyping) {
    await writeFile(path.join(packDir, "prototyping.yaml"), VALID_PROTOTYPING, "utf-8");
  }
  return packDir;
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
        "A complete Story Workshop with a sequence diagram for preflight testing.",
      ].join("\n");
    case "06_REQ.md":
      return [
        "# 06 REQ",
        "",
        "- REQ-0001: A user can save a requirement set for auditing.",
        "- REQ-0002: The system reloads a saved requirement set and checks its consistency.",
      ].join("\n");
    default:
      return [
        `# ${fileName}`,
        "",
        "This preflight test fixture contains complete prose rather than a template placeholder.",
        "Its content is long enough to let the optional side artifact determine the verdict.",
      ].join("\n");
  }
}
