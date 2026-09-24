import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";

type Result = { issues: Array<{ code: string; message: string }> };

it("describes the story obligation omitted by each partial profile", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-profile-story-"));
  try {
    const notice = async (profile: "atdd" | "tdd" | "full") => {
      await runValidate({ root, strict: false, profile });
      const result = JSON.parse(
        await readFile(path.join(root, ".qfai", "report", "validate.json"), "utf8"),
      ) as Result;
      return result.issues.find((issue) => issue.code === "QFAI-PROFILE-001")?.message;
    };

    expect(await notice("atdd")).toContain("QFAI-STORY-006 (EX)");
    expect(await notice("tdd")).toContain("QFAI-STORY-006 (BF/AC)");
    expect((await notice("full")) ?? "").not.toContain("QFAI-STORY-006");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
