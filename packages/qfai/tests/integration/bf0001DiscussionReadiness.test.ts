import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES } from "../../src/core/discussionPack.js";
import type { Issue } from "../../src/core/types.js";
import { validateDiscussionPackReadiness } from "../../src/core/validators/discussionPack.js";

const filler =
  "This discussion record contains a concrete project observation and enough body text to pass the minimum-content readiness check.\n";

const DEFERRED_RESOLUTION = "Launch on the existing route; the second route waits for usage data.";

function oqRegister(
  disposition: string,
  nextDecisionPoint: string,
  resolution = DEFERRED_RESOLUTION,
): string {
  return [
    "# OQ Register",
    "",
    "| OQ-ID | Question | Disposition | Gate | Rationale | Resolution | Next-Decision-Point |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    `| OQ-0001 | Which launch route? | ${disposition} | discussion | The owner weighed both routes. | ${resolution} | ${nextDecisionPoint} |`,
    "",
    filler,
  ].join("\n");
}

const CONTEXT = `# Context\n\n${filler}\n## Inception Deck\n\n${filler}`;

const CONSTRAINTS = [
  "# Constraints",
  "",
  filler,
  ...["Security Policy", "Compliance Policy", "Development Policy", "Operational Policy"].map(
    (section) => `## ${section}\n\n${filler}`,
  ),
].join("\n");

/** Writes the nine required files of a readiness-clean pack, and returns the pack directory. */
async function writeCompletePack(root: string): Promise<string> {
  const pack = path.join(root, ".qfai", "discussion", "discussion-20260923063306456");
  await mkdir(pack, { recursive: true });
  for (const name of REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES) {
    const body =
      name === "11_OQ-Register.md"
        ? oqRegister("resolved", "-")
        : name === "03_Story-Workshop.md"
          ? `# Story Workshop\n\n${filler}\n\`\`\`mermaid\nflowchart TD\n  Start --> Finish\n\`\`\`\n`
          : name === "01_Context.md"
            ? CONTEXT
            : name === "09_Constraints.md"
              ? CONSTRAINTS
              : `# ${name}\n\n${filler}`;
    await writeFile(path.join(pack, name), body, "utf8");
  }
  return pack;
}

function namesOq(findings: Issue[], code: string): boolean {
  return findings.some((finding) => finding.code === code && finding.refs?.includes("OQ-0001"));
}

// QFAI:AC-0001-0013-01
// QFAI:EX-0001-0013-01
it("accepts a complete nine-file pack", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-discussion-"));
  try {
    expect([...REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES]).toEqual([
      "01_Context.md",
      "03_Story-Workshop.md",
      "04_Sources.md",
      "05_Scope.md",
      "06_REQ.md",
      "07_NFR.md",
      "08_Glossary.md",
      "09_Constraints.md",
      "11_OQ-Register.md",
    ]);
    await writeCompletePack(root);
    expect(await validateDiscussionPackReadiness(root, defaultConfig)).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:AC-0001-0014-01
// QFAI:EX-0001-0014-01
// QFAI:EX-0001-0014-02
// QFAI:EX-0001-0014-03
it("blocks an open question and a deferred one that names no reopening point", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-discussion-"));
  try {
    const pack = await writeCompletePack(root);
    const register = path.join(pack, "11_OQ-Register.md");

    await writeFile(register, oqRegister("open", "-"), "utf8");
    const open = await validateDiscussionPackReadiness(root, defaultConfig);
    expect(namesOq(open, "QFAI-DPACK-004")).toBe(true);

    await writeFile(register, oqRegister("deferred", "TBD"), "utf8");
    const unplanned = await validateDiscussionPackReadiness(root, defaultConfig);
    expect(namesOq(unplanned, "QFAI-DPACK-007")).toBe(true);
    expect(unplanned.find((finding) => finding.code === "QFAI-DPACK-007")?.file).toBe(register);

    await writeFile(
      register,
      oqRegister("deferred", "After launch, when support tickets name the route"),
      "utf8",
    );
    const planned = await validateDiscussionPackReadiness(root, defaultConfig);
    expect(namesOq(planned, "QFAI-DPACK-004")).toBe(false);
    expect(namesOq(planned, "QFAI-DPACK-007")).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0014-02
it.each([
  ["a dash as its reopening point", oqRegister("deferred", "-")],
  ["an em dash as its reopening point", oqRegister("deferred", "—")],
  ["an empty reopening point", oqRegister("deferred", "")],
  [
    "no Next-Decision-Point column",
    [
      "# OQ Register",
      "",
      "| OQ-ID | Question | Disposition | Gate | Rationale | Resolution |",
      "| --- | --- | --- | --- | --- | --- |",
      `| OQ-0001 | Which launch route? | deferred | discussion | The owner weighed both routes. | ${DEFERRED_RESOLUTION} |`,
      "",
      filler,
    ].join("\n"),
  ],
  ["a dash as its Resolution", oqRegister("deferred", "After launch", "—")],
  ["a placeholder Resolution", oqRegister("deferred", "After launch", "TBD")],
  [
    "an escaped pipe in an earlier cell and no reopening point",
    [
      "# OQ Register",
      "",
      "| OQ-ID | Options | Disposition | Recommendation | Resolution | Next-Decision-Point |",
      "| --- | --- | --- | --- | --- | --- |",
      `| OQ-0001 | A \\| B | deferred | A | ${DEFERRED_RESOLUTION} | TBD |`,
      "",
      filler,
    ].join("\n"),
  ],
  [
    "a heading-form entry and no reopening point",
    [
      "# OQ Register",
      "",
      "### OQ-0001: Which launch route?",
      "",
      "- Disposition: deferred",
      `- Resolution: ${DEFERRED_RESOLUTION}`,
      "",
      filler,
    ].join("\n"),
  ],
  [
    "no Resolution column",
    [
      "# OQ Register",
      "",
      "| OQ-ID | Question | Disposition | Gate | Rationale | Next-Decision-Point |",
      "| --- | --- | --- | --- | --- | --- |",
      "| OQ-0001 | Which launch route? | deferred | discussion | The owner weighed both routes. | After launch |",
      "",
      filler,
    ].join("\n"),
  ],
])("blocks a deferred question with %s", async (_label, register) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-discussion-"));
  try {
    const pack = await writeCompletePack(root);
    await writeFile(path.join(pack, "11_OQ-Register.md"), register, "utf8");
    const findings = await validateDiscussionPackReadiness(root, defaultConfig);
    expect(namesOq(findings, "QFAI-DPACK-007")).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0014-02
it("blocks the shipped register template's sample deferred row until it is filled in", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-discussion-"));
  try {
    const pack = await writeCompletePack(root);
    const template = await readFile(
      path.join(
        import.meta.dirname,
        "../../assets/init/.qfai/assistant/skill/qfai-discussion/templates/11_OQ-Register.md",
      ),
      "utf8",
    );
    await writeFile(path.join(pack, "11_OQ-Register.md"), template, "utf8");
    const findings = await validateDiscussionPackReadiness(root, defaultConfig);
    expect(namesOq(findings, "QFAI-DPACK-007")).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0014-03
it("accepts a complete heading-form deferred entry", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-discussion-"));
  try {
    const pack = await writeCompletePack(root);
    await writeFile(
      path.join(pack, "11_OQ-Register.md"),
      [
        "# OQ Register",
        "",
        "### OQ-0001: Which launch route?",
        "",
        "- Disposition: deferred",
        `- Resolution: ${DEFERRED_RESOLUTION}`,
        "- Next-Decision-Point: After launch, when support tickets name the route",
        "",
        filler,
      ].join("\n"),
      "utf8",
    );
    const findings = await validateDiscussionPackReadiness(root, defaultConfig);
    expect(namesOq(findings, "QFAI-DPACK-007")).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0013-01
it.each([
  ["02_Inception-Deck.md", "01_Context.md"],
  ["10_Policy.md", "09_Constraints.md"],
  ["13_Deferred.md", "11_OQ-Register.md"],
])("reports %s left beside the nine files until its content moves", async (legacy, target) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-discussion-"));
  try {
    const pack = await writeCompletePack(root);
    await writeFile(path.join(pack, legacy), `# ${legacy}\n\n${filler}`, "utf8");
    const findings = await validateDiscussionPackReadiness(root, defaultConfig);
    const finding = findings.find(
      (item) => item.code === "QFAI-DPACK-003" && item.refs?.includes(legacy),
    );
    expect(finding?.refs).toEqual([legacy, target]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0013-03
it.each([
  ["01_Context.md", "## Inception Deck"],
  ["09_Constraints.md", "## Operational Policy"],
])("reports %s without its %s section as incomplete", async (file, heading) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-discussion-"));
  try {
    const pack = await writeCompletePack(root);
    const target = path.join(pack, file);
    const content = await readFile(target, "utf8");
    await writeFile(target, content.replace(heading, "## Notes"), "utf8");
    const findings = await validateDiscussionPackReadiness(root, defaultConfig);
    expect(
      findings.some((item) => item.code === "QFAI-DPACK-003" && item.refs?.includes(file)),
    ).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0013-02
it("blocks readiness when one of the nine required files is missing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-discussion-"));
  try {
    const pack = await writeCompletePack(root);
    await rm(path.join(pack, "09_Constraints.md"));
    const findings = await validateDiscussionPackReadiness(root, defaultConfig);
    expect(
      findings.some(
        (finding) =>
          finding.code === "QFAI-DPACK-002" && finding.refs?.includes("09_Constraints.md"),
      ),
    ).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
