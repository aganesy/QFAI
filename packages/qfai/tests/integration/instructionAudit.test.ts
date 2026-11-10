/**
 * The instruction audit reports text an agent reads badly: capitalised
 * emphasis and "think hard" phrasing, a long SKILL.md, a skill listing a host
 * truncates and an AGENTS.md a host stops reading.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  AGENTS_MD_MAX_BYTES,
  auditInstructionFile,
  SKILL_LISTING_MAX_CHARS,
  validateInstructionAudit,
} from "../../src/core/validators/instructionAudit.js";

const initRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../assets/init");

const roots: string[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-instruction-audit-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await writeFile(path.join(root, relative), content, "utf-8");
  }
  return root;
}

const findings = async (files: Record<string, string>) =>
  (await validateInstructionAudit(await project(files), defaultConfig)).map((found) => ({
    code: found.code,
    file: found.file,
    line: found.loc?.line,
    severity: found.severity,
  }));

describe("instruction audit", () => {
  // QFAI:AC-0001-0039-03
  // QFAI:EX-0001-0039-25
  it("reports capitalised emphasis and think-hard phrasing outside code and quotations", async () => {
    const rule = [
      "# Rule",
      "",
      "You MUST read the plan.",
      "Think harder before you answer.",
      "The word `NEVER` is cited in a code span.",
      'A rule may quote "ALWAYS" to forbid it.',
      "> IMPORTANT: a quotation is not an instruction.",
      "```text",
      "CRITICAL inside a fence",
      "```",
      "You must read it, in plain words.",
      "",
    ].join("\n");

    expect(
      await findings({
        ".qfai/assistant/rule/sample.md": rule,
        ".agents/rules/sample.md": "Do it. NEVER skip it.\n",
        "AGENTS.md": "# Agents\n\nThis is REQUIRED.\n",
        "CLAUDE.md": "@AGENTS.md\n\nthink hard about it.\n",
      }),
    ).toEqual([
      { code: "QFAI-INSTR-001", file: ".agents/rules/sample.md", line: 1, severity: "warning" },
      {
        code: "QFAI-INSTR-001",
        file: ".qfai/assistant/rule/sample.md",
        line: 3,
        severity: "warning",
      },
      {
        code: "QFAI-INSTR-001",
        file: ".qfai/assistant/rule/sample.md",
        line: 4,
        severity: "warning",
      },
      { code: "QFAI-INSTR-001", file: "AGENTS.md", line: 3, severity: "warning" },
      { code: "QFAI-INSTR-001", file: "CLAUDE.md", line: 3, severity: "warning" },
    ]);
  });

  // QFAI:EX-0001-0039-26
  it("reports a SKILL.md over 500 lines and not one at 500", async () => {
    const lines = (count: number) =>
      Array.from({ length: count }, (_, index) => `line ${index}`).join("\n") + "\n";

    expect(
      await findings({
        ".qfai/assistant/skill/long/SKILL.md": lines(501),
        ".qfai/assistant/skill/full/SKILL.md": lines(500),
      }),
    ).toEqual([
      {
        code: "QFAI-INSTR-002",
        file: ".qfai/assistant/skill/long/SKILL.md",
        line: undefined,
        severity: "warning",
      },
    ]);
  });

  // QFAI:EX-0001-0039-27
  it("reports a skill whose description and when_to_use exceed the listing budget", async () => {
    const skill = (description: number, whenToUse: number) =>
      [
        "---",
        `description: ${"d".repeat(description)}`,
        `when_to_use: ${"w".repeat(whenToUse)}`,
        "---",
        "",
        "# Skill",
        "",
      ].join("\n");

    expect(
      await findings({
        ".qfai/assistant/skill/over/SKILL.md": skill(1000, SKILL_LISTING_MAX_CHARS - 999),
        ".qfai/assistant/skill/at/SKILL.md": skill(1000, SKILL_LISTING_MAX_CHARS - 1000),
      }),
    ).toEqual([
      {
        code: "QFAI-INSTR-003",
        file: ".qfai/assistant/skill/over/SKILL.md",
        line: undefined,
        severity: "warning",
      },
    ]);
  });

  // QFAI:EX-0001-0039-28
  it("reports an AGENTS.md over 32 KiB and not one at 32 KiB", () => {
    expect(auditInstructionFile("AGENTS.md", "a".repeat(AGENTS_MD_MAX_BYTES))).toEqual([]);
    expect(
      auditInstructionFile("AGENTS.md", "a".repeat(AGENTS_MD_MAX_BYTES + 1)).map(
        (found) => found.code,
      ),
    ).toEqual(["QFAI-INSTR-004"]);
    expect(auditInstructionFile("CLAUDE.md", "a".repeat(AGENTS_MD_MAX_BYTES + 1))).toEqual([]);
  });

  // QFAI:EX-0001-0039-29
  it("finds nothing in the assistant tree, root rules and AGENTS.md qfai init writes", async () => {
    const shipped = await fg(
      [".qfai/assistant/**/*.md", "root/.agents/rules/**/*.md", "root/AGENTS.md"],
      {
        cwd: initRoot,
        dot: true,
        onlyFiles: true,
      },
    );
    expect(shipped.length).toBeGreaterThan(0);

    const reported: string[] = [];
    for (const relative of shipped.sort()) {
      const content = await readFile(path.join(initRoot, relative), "utf-8");
      const installedAt = relative.replace(/^root\//, "");
      for (const found of auditInstructionFile(installedAt, content)) {
        reported.push(`${found.code} ${found.message}`);
      }
    }
    expect(reported).toEqual([]);
  });
});
