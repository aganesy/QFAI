/**
 * `qfai doctor` holds a `SKILL.md` body to the character limit the AI-readable Markdown rule
 * states, on a project tree written the way `qfai init` writes one.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { SKILL_BODY_MAX_CHARS } from "../../src/core/doctor/assetLineBudget.js";

/** A skill file whose body is `chars` code points, a newline every hundredth. */
function skillFile(chars: number, eol = "\n"): string {
  const body = Array.from({ length: chars }, (_, i) => (i % 100 === 99 ? eol : "s")).join("");
  return ["---", "name: qfai-demo", "description: demo", "---", ""].join(eol) + body;
}

async function lineBudgetCheck(files: Record<string, string>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-skill-body-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const target = path.join(root, ".qfai", "assistant", ...rel.split("/"));
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content, "utf-8");
    }
    const data = await createDoctorData({ startDir: root, rootExplicit: true });
    return data.checks.find((check) => check.id === "assets.lineBudget");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("qfai doctor reports a SKILL.md body over the character limit", () => {
  // QFAI:EX-0003-0032-01
  it("warns, naming the file, its size and where to move a section", async () => {
    // QFAI:AC-0003-0032-01
    const check = await lineBudgetCheck({
      "skill/qfai-demo/SKILL.md": skillFile(SKILL_BODY_MAX_CHARS + 1),
    });

    expect(check?.severity).toBe("warning");
    expect(check?.message).toContain(
      `1 SKILL.md bodies exceed ${SKILL_BODY_MAX_CHARS} characters: ` +
        `assistant/skill/qfai-demo/SKILL.md (${SKILL_BODY_MAX_CHARS + 1})`,
    );
    expect(JSON.stringify(check?.details?.["nextActions"])).toContain("references/");
    expect(check?.details?.["maxSkillBodyChars"]).toBe(SKILL_BODY_MAX_CHARS);
  });

  // QFAI:EX-0003-0032-02
  it("is ok for a body at the limit, its CRLF twin and a reference of any size", async () => {
    // QFAI:AC-0003-0032-01
    const check = await lineBudgetCheck({
      "skill/qfai-demo/SKILL.md": skillFile(SKILL_BODY_MAX_CHARS),
      "skill/qfai-other/SKILL.md": skillFile(SKILL_BODY_MAX_CHARS, "\r\n"),
      "skill/qfai-demo/references/long.md": skillFile(SKILL_BODY_MAX_CHARS * 2),
    });

    expect(check?.severity).toBe("ok");
    expect(check?.message).toContain(
      `all SKILL.md bodies are within ${SKILL_BODY_MAX_CHARS} characters`,
    );
  });
});
