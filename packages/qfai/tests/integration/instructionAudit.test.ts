/**
 * The instruction audit reports text an agent reads badly: capitalised
 * emphasis and "think hard" phrasing, a long SKILL.md, a skill listing a host
 * truncates and an AGENTS.md a host stops reading.
 */
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import type { Issue } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
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

type Seen = {
  code: string;
  file: string | undefined;
  line: number | undefined;
  words: string[] | undefined;
  severity: string;
};

/** The words a `QFAI-INSTR-001` message names; the finding's refs carry none. */
const namedWords = (message: string): string[] | undefined =>
  /reads badly: ([^.]+)\./.exec(message)?.[1]?.split(", ");

const shape = (found: Issue): Seen => ({
  code: found.code,
  file: found.file,
  line: found.loc?.line,
  words: namedWords(found.message),
  severity: found.severity,
});

const findings = async (files: Record<string, string>): Promise<Seen[]> =>
  (await validateInstructionAudit(await project(files), defaultConfig)).map(shape);

const EMPHASIS_TREE: Record<string, string> = {
  ".qfai/assistant/rule/sample.md": [
    "# Rule",
    "",
    "You MUST read the plan.",
    "Think harder before you answer.",
    "The word `NEVER` is cited in a code span.",
    'A rule may quote "ALWAYS" to forbid it.',
    "> IMPORTANT: a quotation is not an instruction.",
    "```text",
    "CRITICAL inside a fence",
    "```js",
    "MANDATORY after a line that only looks like a fence",
    "```",
    "- A list item:",
    "  ```",
    "  NEVER inside an indented fence",
    "  ```",
    "You must read it, in plain words.",
    "",
  ].join("\n"),
  ".agents/rules/sample.md": "Do it. NEVER skip it.\n",
  "AGENTS.md": "# Agents\n\nThis is REQUIRED.\n",
  "CLAUDE.md": "@AGENTS.md\n\nthink hard about it.\n",
};

const EMPHASIS_FOUND: Seen[] = [
  {
    code: "QFAI-INSTR-001",
    file: ".agents/rules/sample.md",
    line: 1,
    words: ["NEVER"],
    severity: "warning",
  },
  {
    code: "QFAI-INSTR-001",
    file: ".qfai/assistant/rule/sample.md",
    line: 3,
    words: ["MUST"],
    severity: "warning",
  },
  {
    code: "QFAI-INSTR-001",
    file: ".qfai/assistant/rule/sample.md",
    line: 4,
    words: ["Think harder"],
    severity: "warning",
  },
  { code: "QFAI-INSTR-001", file: "AGENTS.md", line: 3, words: ["REQUIRED"], severity: "warning" },
  {
    code: "QFAI-INSTR-001",
    file: "CLAUDE.md",
    line: 3,
    words: ["think hard"],
    severity: "warning",
  },
];

describe("instruction audit", () => {
  // QFAI:AC-0001-0039-03
  // QFAI:EX-0001-0039-25
  it("reports capitalised emphasis and think-hard phrasing outside code and quotations", async () => {
    expect(await findings(EMPHASIS_TREE)).toEqual(EMPHASIS_FOUND);
  });

  // QFAI:EX-0001-0039-25
  it("names the words in the message and puts none in the refs", async () => {
    const found = await validateInstructionAudit(await project(EMPHASIS_TREE), defaultConfig);
    expect(found.map((one) => one.refs)).toEqual(found.map(() => undefined));
  });

  // QFAI:EX-0001-0039-30
  it("reads a fence, a quote, an indented line and an ID as CommonMark text", async () => {
    expect(
      await findings({
        ".agents/rules/edges.md": [
          "```not`a-fence",
          "You MUST read it.",
          'A 5" screen MUST fit, as "NEVER" says.',
          "    Indented MUST is read as prose.",
          "The code QFAI-MUST-001 is an ID.",
          "",
        ].join("\n"),
      }),
    ).toEqual(
      [2, 3, 4, 5].map((line) => ({
        code: "QFAI-INSTR-001",
        file: ".agents/rules/edges.md",
        line,
        words: ["MUST"],
        severity: "warning",
      })),
    );
  });

  // QFAI:EX-0001-0039-31
  it("tells the reader of a generated file to update qfai and run qfai init --force", async () => {
    const listing = "d".repeat(SKILL_LISTING_MAX_CHARS + 1);
    const skill = `---\ndescription: ${listing}\n---\n\nYou MUST.\n${"line\n".repeat(500)}`;
    const found = await validateInstructionAudit(
      await project({
        ".qfai/assistant/skill/long/SKILL.md": skill,
        ".agents/rules/sample.md": "You MUST.\n",
      }),
      defaultConfig,
    );
    const generated =
      "It is written by `qfai init`: update qfai and run `qfai init --force` instead of editing it.";
    expect(found.map((one) => [one.code, one.file, one.message.endsWith(generated)])).toEqual([
      ["QFAI-INSTR-001", ".agents/rules/sample.md", false],
      ["QFAI-INSTR-001", ".qfai/assistant/skill/long/SKILL.md", true],
      ["QFAI-INSTR-002", ".qfai/assistant/skill/long/SKILL.md", true],
      ["QFAI-INSTR-003", ".qfai/assistant/skill/long/SKILL.md", true],
    ]);
  });

  // QFAI:EX-0001-0039-32
  it("skips a dot-prefixed directory directly under the skills directory", async () => {
    expect(
      (
        await findings({
          ".qfai/assistant/skill/.draft/SKILL.md": "You MUST.\n",
          ".qfai/assistant/skill/real/SKILL.md": "You MUST.\n",
          ".qfai/assistant/skill/real/.notes/a.md": "You MUST.\n",
        })
      ).map((found) => found.file),
    ).toEqual([".qfai/assistant/skill/real/.notes/a.md", ".qfai/assistant/skill/real/SKILL.md"]);
  });

  // QFAI:EX-0001-0039-33
  it("skips an entry it cannot stat or read and keeps the other findings", async () => {
    const root = await project({
      ".qfai/assistant/rule/sample.md": "You MUST read it.\n",
      ".agents/rules/folder.md/inner.md": "NEVER skip it.\n",
      "AGENTS.md/inner.md": "ALWAYS.\n",
    });
    const expected = [".agents/rules/folder.md/inner.md", ".qfai/assistant/rule/sample.md"];
    try {
      await symlink("loop.md", path.join(root, ".qfai", "assistant", "rule", "loop.md"), "file");
    } catch {
      // The platform refuses an unprivileged symbolic link; the other entries still run.
    }
    const locked = path.join(root, ".agents", "rules", "locked.md");
    await writeFile(locked, "You MUST.\n", "utf-8");
    await chmod(locked, 0o000);
    // Windows and a root user read a file whatever its mode, so it is audited there.
    const readable = await readFile(locked).then(
      () => true,
      () => false,
    );
    if (readable) expected.push(".agents/rules/locked.md");

    const audited = (await validateProject(root, undefined, { profile: "verify" })).issues
      .filter((found) => found.code.startsWith("QFAI-INSTR-"))
      .map((found) => found.file);
    await chmod(locked, 0o644);
    expect(audited).toEqual(expected.sort());
  });

  // QFAI:EX-0001-0039-25
  it("runs in verify and full and not in sdd", async () => {
    const root = await project(EMPHASIS_TREE);
    const audited = async (profile: "verify" | "full" | "sdd") =>
      (await validateProject(root, undefined, { profile })).issues
        .filter((found) => found.code.startsWith("QFAI-INSTR-"))
        .map(shape);

    expect(await audited("verify")).toEqual(EMPHASIS_FOUND);
    expect(await audited("full")).toEqual(EMPHASIS_FOUND);
    expect(await audited("sdd")).toEqual([]);
  });

  // QFAI:EX-0001-0039-25
  it("reads a linked directory once, by the path under the project", async () => {
    const shared = await project({ "rule/linked.md": "You MUST read it.\n" });
    const root = await project({});
    await mkdir(path.join(root, ".qfai", "assistant"), { recursive: true });
    await symlink(
      path.join(shared, "rule"),
      path.join(root, ".qfai", "assistant", "rule"),
      "junction",
    );
    await mkdir(path.join(root, ".agents"), { recursive: true });
    await symlink(path.join(shared, "rule"), path.join(root, ".agents", "rules"), "junction");

    expect(
      (await validateInstructionAudit(root, defaultConfig)).map((found) => found.file),
    ).toEqual([".qfai/assistant/rule/linked.md"]);
  });

  // QFAI:EX-0001-0039-26
  it("reports a SKILL.md over 500 lines, counted as the asset line budget counts", async () => {
    const lines = (count: number) =>
      Array.from({ length: count }, (_, index) => `line ${index}`).join("\n");

    expect(
      await findings({
        ".qfai/assistant/skill/long/SKILL.md": lines(501),
        ".qfai/assistant/skill/full/SKILL.md": lines(500),
        ".qfai/assistant/skill/ended/SKILL.md": lines(500) + "\n",
      }),
    ).toEqual(
      ["ended", "long"].map((name) => ({
        code: "QFAI-INSTR-002",
        file: `.qfai/assistant/skill/${name}/SKILL.md`,
        line: undefined,
        words: undefined,
        severity: "warning",
      })),
    );
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
        words: undefined,
        severity: "warning",
      },
    ]);
  });

  // QFAI:EX-0001-0039-28
  it("reports an AGENTS.md over 32 KiB and not one at 32 KiB, counting its stored bytes", () => {
    const bytes = (count: number, fill = 0x61) => Buffer.alloc(count, fill);
    expect(auditInstructionFile("AGENTS.md", bytes(AGENTS_MD_MAX_BYTES))).toEqual([]);
    // Bytes that do not decode as UTF-8 count as stored, not as the decoded text.
    expect(auditInstructionFile("AGENTS.md", bytes(AGENTS_MD_MAX_BYTES, 0xff))).toEqual([]);
    expect(
      auditInstructionFile("AGENTS.md", bytes(AGENTS_MD_MAX_BYTES + 1)).map((found) => found.code),
    ).toEqual(["QFAI-INSTR-004"]);
    expect(auditInstructionFile("CLAUDE.md", bytes(AGENTS_MD_MAX_BYTES + 1))).toEqual([]);
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
      const content = await readFile(path.join(initRoot, relative));
      const installedAt = relative.replace(/^root\//, "");
      for (const found of auditInstructionFile(installedAt, content)) {
        reported.push(`${found.code} ${found.message}`);
      }
    }
    expect(reported).toEqual([]);
  });
});
