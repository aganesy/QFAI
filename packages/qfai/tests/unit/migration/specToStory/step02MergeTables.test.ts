import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import { parseAllMarkdownTables } from "../../../../src/core/specPackParsers.js";
import { classifyRecordRow } from "../../../../src/core/storyTree/tables.js";
import {
  executePlannedStep,
  type MigrationContext,
} from "../../../../src/migration/specToStory/harness.js";
import { step02 } from "../../../../src/migration/specToStory/step02MergeTables.js";

const roots: string[] = [];

afterEach(async () => {
  vi.useRealTimers();
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture(): Promise<MigrationContext> {
  const root = await mkdtemp(path.join(tmpdir(), "qfai-migration-records-"));
  roots.push(root);
  const specsDir = path.join(root, ".qfai", "spec");
  await mkdir(path.join(specsDir, "_policies"), { recursive: true });
  return {
    root,
    specsDir,
    contractsDir: path.join(specsDir, "03_contract"),
    config: structuredClone(defaultConfig),
  };
}

async function run(
  context: MigrationContext,
): Promise<{ code: number; output: string; error: string }> {
  let output = "";
  let error = "";
  const code = await executePlannedStep(step02, context, false, {
    stdout: {
      write: (value) => {
        output += value;
      },
    },
    stderr: {
      write: (value) => {
        error += value;
      },
    },
  });
  return { code, output, error };
}

type RegisterRow = { id: string; content: string; approach: string };

/** The rows of the register table that follows `## Decisions`, failing on any shape but three cells. */
function registerRows(text: string): RegisterRow[] {
  const table = parseAllMarkdownTables(text).find((candidate) => candidate.headers[0] === "ID");
  expect(table?.headers).toEqual(["ID", "Content", "Approach"]);
  return (table?.rows ?? []).map((cells) => {
    expect(cells).toHaveLength(3);
    return { id: cells[0] ?? "", content: cells[1] ?? "", approach: cells[2] ?? "" };
  });
}

function runStartsAt(iso: string): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
}

const HEADER = "| ID | Content | Approach |\n| --- | --- | --- |\n";

describe("migration decision table merge", () => {
  it("keeps suffixed legacy IDs distinct and reruns without changing the table", async () => {
    const context = await fixture();
    await writeFile(
      path.join(context.specsDir, "_policies", "08_Decisions.md"),
      "# Decisions\n\n### DR-0106: First\n\n- Status: accepted\n\n### DR-0106-A: Amendment\n\n- Status: accepted\n\n### DR-0107: Second\n\n- Status: accepted\n\n### DR-0107-A: Amendment\n\n- Status: accepted\n",
      "utf8",
    );
    runStartsAt("2026-11-05T12:00:00Z");

    const first = await run(context);
    expect(first.code).toBe(0);
    const target = path.join(context.specsDir, "decisions.md");
    const original = await readFile(target, "utf8");
    const rows = registerRows(original);
    expect(rows.map((row) => row.id)).toEqual([
      "DEC-20261105120000",
      "DEC-20261105120001",
      "DEC-20261105120002",
      "DEC-20261105120003",
    ]);
    expect(rows.map((row) => row.content)).toEqual([
      ".qfai/spec/_policies/08_Decisions.md#DR-0106: First",
      ".qfai/spec/_policies/08_Decisions.md#DR-0106-A: Amendment",
      ".qfai/spec/_policies/08_Decisions.md#DR-0107: Second",
      ".qfai/spec/_policies/08_Decisions.md#DR-0107-A: Amendment",
    ]);

    const second = await run(context);
    expect(second.code).toBe(0);
    expect(second.output).toContain("## Operations\nnone");
    expect(await readFile(target, "utf8")).toBe(original);
  });

  // QFAI:EX-0004-0005-11
  it("writes every approved change request as a change request whatever its Applied at", async () => {
    const context = await fixture();
    const requests = path.join(context.root, ".qfai", "decisions");
    await mkdir(requests, { recursive: true });
    const request = (id: string, appliedAt: string): string =>
      `# Change Request\n\n- ID: \`${id}\`\n- Title: \`${id} title\`\n- Status: \`approved\`\n- Applied at: \`${appliedAt}\`\n\n## Impact scope\n\n- \`docs/${id}.md\`\n`;
    await writeFile(
      path.join(requests, "CR-20260101-0001-unapplied.md"),
      request("CR-20260101-0001", "-"),
    );
    await writeFile(
      path.join(requests, "CR-20260101-0002-applied.md"),
      request("CR-20260101-0002", "2026-01-02"),
    );

    expect((await run(context)).code).toBe(0);
    const rows = registerRows(await readFile(path.join(context.specsDir, "decisions.md"), "utf8"));
    expect(rows.map((row) => row.content)).toEqual([
      "Change request: docs/CR-20260101-0001.md",
      "Change request: docs/CR-20260101-0002.md",
    ]);
    expect(rows.map((row) => classifyRecordRow(row).refs)).toEqual([
      ["docs/CR-20260101-0001.md"],
      ["docs/CR-20260101-0002.md"],
    ]);
    expect(
      rows[0]?.approach.startsWith(
        ".qfai/decisions/CR-20260101-0001-unapplied.md#CR-20260101-0001: ",
      ),
    ).toBe(true);
    expect(
      rows[1]?.approach.startsWith(
        ".qfai/decisions/CR-20260101-0002-applied.md#CR-20260101-0002: ",
      ),
    ).toBe(true);
  });

  // QFAI:EX-0004-0005-14
  it("writes approved and rejected change requests as decisions and an undecided one as a question", async () => {
    const context = await fixture();
    const requests = path.join(context.root, ".qfai", "decisions");
    await mkdir(requests, { recursive: true });
    await writeFile(
      path.join(requests, "CR-20260101-0001-draft.md"),
      "# Change Request\n\n- ID: `CR-20260101-0001`\n- Title: `Draft title`\n- Status: `draft`\n\n## Impact scope\n\n- `docs/a.md`\n",
    );
    await writeFile(
      path.join(requests, "CR-20260101-0002-approved.md"),
      "# Change Request\n\n- ID: `CR-20260101-0002`\n- Title: `Approved title`\n- Status: `approved`\n\n## Impact scope\n\n- `docs/b.md`\n- `src/c.ts`\n",
    );
    await writeFile(
      path.join(requests, "CR-20260101-0003-rejected.md"),
      "# Change Request\n\n- ID: `CR-20260101-0003`\n- Title: `Rejected title`\n- Status: `rejected`\n\n## Impact scope\n\n- `docs/d.md`\n",
    );
    expect((await run(context)).code).toBe(0);
    const decisions = registerRows(
      await readFile(path.join(context.specsDir, "decisions.md"), "utf8"),
    );
    expect(decisions.map((row) => row.content)).toEqual([
      "Change request: docs/b.md, src/c.ts",
      "Declined change request: docs/d.md",
    ]);
    expect(decisions.map((row) => classifyRecordRow(row))).toMatchObject([
      { kind: "change-request", refs: ["docs/b.md", "src/c.ts"] },
      { kind: "declined-change-request", refs: ["docs/d.md"] },
    ]);
    expect(
      decisions[0]?.approach.startsWith(
        ".qfai/decisions/CR-20260101-0002-approved.md#CR-20260101-0002: ",
      ),
    ).toBe(true);
    expect(
      decisions[1]?.approach.startsWith(
        ".qfai/decisions/CR-20260101-0003-rejected.md#CR-20260101-0003: ",
      ),
    ).toBe(true);
    expect(decisions.some((row) => row.approach.includes("-draft.md"))).toBe(false);
    const questions = registerRows(
      await readFile(path.join(context.specsDir, "open-questions.md"), "utf8"),
    );
    expect(questions).toHaveLength(1);
    expect(questions[0]?.id).toMatch(/^OQ-\d{14}$/);
    expect(questions[0]?.content).toMatch(
      /^\.qfai\/decisions\/CR-20260101-0001-draft\.md#CR-20260101-0001: /,
    );
  });

  // QFAI:EX-0004-0005-15
  it("writes a superseded question as a decision row in the decisions ID sequence", async () => {
    const context = await fixture();
    const source = ".qfai/spec/_policies/09_Open-questions.md";
    await writeFile(
      path.join(context.root, source),
      "# Questions\n\n## Open Questions\n\n| OQ-ID | Question | Status | Notes |\n| --- | --- | --- | --- |\n| OQ-0001-0001 | Old? | superseded | Replaced by B |\n",
    );
    await writeFile(
      path.join(context.specsDir, "_policies", "08_Decisions.md"),
      "# Decisions\n\n### DR-0001: Choose A\n\n- Status: accepted\n",
    );
    runStartsAt("2026-11-05T12:00:00Z");
    expect((await run(context)).code).toBe(0);
    const decisions = registerRows(
      await readFile(path.join(context.specsDir, "decisions.md"), "utf8"),
    );
    expect(decisions.map((row) => row.id)).toEqual(["DEC-20261105120000", "DEC-20261105120001"]);
    const question = decisions.find((row) => row.content.startsWith(`${source}#OQ-0001-0001`));
    expect(question?.content).toContain("Old?");
    expect(question?.content).toContain("Replaced by B");
    await expect(
      readFile(path.join(context.specsDir, "open-questions.md"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("names an invalid existing row before writing", async () => {
    const context = await fixture();
    const original = `# Decisions\n\n## Decisions\n\n${HEADER}| DEC-0001 | First | - |\n| DEC-0001 | Second | - |\n`;
    await writeFile(path.join(context.specsDir, "decisions.md"), original, "utf8");
    await writeFile(
      path.join(context.specsDir, "_policies", "08_Decisions.md"),
      "# Decisions\n\n### DR-0001: First\n\n- Status: accepted\n",
    );

    const result = await run(context);
    expect(result.code).toBe(2);
    expect(result.error).toContain("DEC-0001");
    expect(await readFile(path.join(context.specsDir, "decisions.md"), "utf8")).toBe(original);
  });

  // QFAI:EX-0004-0005-03
  it("writes decided records as decision rows and undecided ones as question rows", async () => {
    const context = await fixture();
    const source = ".qfai/spec/_policies/08_Decisions.md";
    await writeFile(
      path.join(context.root, source),
      "# Decisions\n\n### DR-0001: Accepted\n\n- Status: accepted\n\n### DR-0002: Rejected\n\n- Status: rejected\n\n### DR-0003: Proposed\n\n- Status: proposed\n\n### DR-0004: Reopened\n\n- Status: re-open\n",
    );
    expect((await run(context)).code).toBe(0);
    const decisions = registerRows(
      await readFile(path.join(context.specsDir, "decisions.md"), "utf8"),
    );
    const questions = registerRows(
      await readFile(path.join(context.specsDir, "open-questions.md"), "utf8"),
    );
    expect(decisions.map((row) => row.content)).toEqual([
      `${source}#DR-0001: Accepted`,
      "Declined: Rejected",
    ]);
    expect(decisions[1]?.approach.startsWith(`${source}#DR-0002: `)).toBe(true);
    expect(questions.map((row) => row.content)).toEqual([
      `${source}#DR-0003: Proposed`,
      `${source}#DR-0004: Reopened`,
    ]);
    expect(questions.every((row) => /^OQ-\d{14}$/.test(row.id))).toBe(true);
  });

  // QFAI:EX-0004-0005-04
  it("writes a log entry as a decision and a record in any other status as a question", async () => {
    const context = await fixture();
    await writeFile(
      path.join(context.specsDir, "_policies", "10_delta.md"),
      "# Delta\n\n### DL-0001: Delta\n\nnotes: Keep the delta.\n",
    );
    await writeFile(
      path.join(context.specsDir, "_policies", "08_Decisions.md"),
      "# Decisions\n\n### DR-0001: Waiting\n\n- Status: on-hold\n",
    );
    expect((await run(context)).code).toBe(0);
    const decisions = registerRows(
      await readFile(path.join(context.specsDir, "decisions.md"), "utf8"),
    );
    const questions = registerRows(
      await readFile(path.join(context.specsDir, "open-questions.md"), "utf8"),
    );
    expect(decisions.map((row) => row.content)).toEqual([
      ".qfai/spec/_policies/10_delta.md#DL-0001: Keep the delta.",
    ]);
    expect(questions.map((row) => row.content)).toEqual([
      ".qfai/spec/_policies/08_Decisions.md#DR-0001: Waiting",
    ]);
  });

  // QFAI:EX-0004-0005-04
  it("names the superseded record's new ID in its successor's Approach", async () => {
    const context = await fixture();
    await writeFile(
      path.join(context.specsDir, "_policies", "08_Decisions.md"),
      "# Decisions\n\n### DR-0001: Old\n\n- Status: superseded\n- Superseded by: DR-0002\n\n### DR-0002: New\n\n- Status: accepted\n",
    );
    runStartsAt("2026-11-05T12:00:00Z");
    expect((await run(context)).code).toBe(0);
    const rows = registerRows(await readFile(path.join(context.specsDir, "decisions.md"), "utf8"));
    expect(rows.map((row) => row.id)).toEqual(["DEC-20261105120000", "DEC-20261105120001"]);
    expect(rows[1]?.approach).toContain("Supersedes DEC-20261105120000");
  });

  // QFAI:EX-0004-0005-12
  it("appends only a new origin to the root after the highest timestamp ID a page holds", async () => {
    const context = await fixture();
    const target = path.join(context.specsDir, "decisions.md");
    const page = path.join(context.specsDir, "decisions", "page-0001.md");
    await mkdir(path.dirname(page), { recursive: true });
    const rootText = `# Decisions\r\n\r\n## Decision pages\r\n\r\n- decisions/page-0001.md\r\n\r\n## Decisions\r\n\r\n${HEADER.replaceAll("\n", "\r\n")}| DEC-0001 | Tail | Keep |\r\n`;
    const pageText = `# Decisions\n\n## Decisions\n\n${HEADER}| DEC-20261105130000 | .qfai/spec/_policies/08_Decisions.md#DR-0107: Kept | Keep |\n`;
    await writeFile(target, rootText);
    await writeFile(page, pageText);
    await writeFile(
      path.join(context.specsDir, "_policies", "08_Decisions.md"),
      "# Decisions\n\n### DR-0107: Kept\n\n- Status: accepted\n\n### DR-0108: New\n\n- Status: accepted\n",
    );
    runStartsAt("2026-11-05T12:00:00Z");
    expect((await run(context)).code).toBe(0);
    const result = await readFile(target, "utf8");
    expect(result.startsWith(rootText)).toBe(true);
    const added = registerRows(result).slice(1);
    expect(added).toEqual([
      {
        id: "DEC-20261105130001",
        content: ".qfai/spec/_policies/08_Decisions.md#DR-0108: New",
        approach: expect.any(String),
      },
    ]);
    expect(await readFile(page, "utf8")).toBe(pageText);
    expect((await run(context)).output).toContain("## Operations\nnone");
    expect(await readFile(target, "utf8")).toBe(result);
  });

  // QFAI:EX-0004-0005-13
  it("stops before appending when a listed page is missing", async () => {
    const context = await fixture();
    const target = path.join(context.specsDir, "decisions.md");
    const rootText = `# Decisions\n\n## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions\n\n${HEADER}| DEC-0001 | Tail | Keep |\n`;
    await writeFile(target, rootText);
    const source = path.join(context.specsDir, "_policies", "08_Decisions.md");
    await writeFile(source, "# Decisions\n\n### DR-0001: First\n\n- Status: accepted\n");
    const result = await run(context);
    expect(result.code).toBe(2);
    expect(result.error).toContain("page-0001");
    expect(await readFile(target, "utf8")).toBe(rootText);
    expect(await readFile(source, "utf8")).toContain("DR-0001");
  });
});
