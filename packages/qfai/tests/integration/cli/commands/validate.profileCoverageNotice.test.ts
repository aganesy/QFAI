import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";

type Result = { issues: Array<{ code: string; message: string }> };

it("describes the story obligation omitted by each partial profile", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-profile-story-"));
  try {
    const notice = async (profile: "atdd" | "tdd" | "drift" | "full") => {
      await runValidate({ root, strict: false, profile });
      const result = JSON.parse(
        await readFile(path.join(root, ".qfai", "report", "validate.json"), "utf8"),
      ) as Result;
      return result.issues.find((issue) => issue.code === "QFAI-PROFILE-001")?.message;
    };

    expect(await notice("atdd")).toContain("QFAI-STORY-001");
    expect(await notice("tdd")).toContain("QFAI-STORY-001");
    expect((await notice("full")) ?? "").not.toContain("QFAI-STORY-001");
    expect(await notice("drift")).toContain("QFAI-STORY-006");
    expect(await notice("drift")).not.toContain("QFAI-SCAN-002");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:AC-0001-0156-01
it("evaluates the verify profile as a full scan, not a partial one", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-profile-verify-"));
  try {
    await runValidate({ root, strict: false, profile: "verify" });
    const result = JSON.parse(
      await readFile(path.join(root, ".qfai", "report", "validate.json"), "utf8"),
    ) as Result;
    const message = result.issues.find((issue) => issue.code === "QFAI-PROFILE-001")?.message;
    expect(message).toContain("evaluated every gate a full scan covers");
    expect(message).not.toContain("partial profile");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
