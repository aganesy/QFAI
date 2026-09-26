import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES } from "../../src/core/discussionPack.js";
import { validateDiscussionPackReadiness } from "../../src/core/validators/discussionPack.js";

const filler =
  "This discussion record contains a concrete project observation and enough body text to pass the minimum-content readiness check.\n";
const oqTable = [
  "# OQ Register",
  "",
  "| OQ-ID | Question | Disposition | Gate | Reason |",
  "| --- | --- | --- | --- | --- |",
  "| OQ-0001 | Which launch route? | resolved | discussion | The owner selected the existing route. |",
  "",
  filler,
].join("\n");

/** Writes the fifteen required files of a readiness-clean pack, and returns the pack directory. */
async function writeCompletePack(root: string): Promise<string> {
  const pack = path.join(root, ".qfai", "discussion", "discussion-20260923063306456");
  await mkdir(pack, { recursive: true });
  for (const name of REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES) {
    const body =
      name === "11_OQ-Register.md"
        ? oqTable
        : name === "03_Story-Workshop.md"
          ? `# Story Workshop\n\n${filler}\n\`\`\`mermaid\nflowchart TD\n  Start --> Finish\n\`\`\`\n`
          : `# ${name}\n\n${filler}`;
    await writeFile(path.join(pack, name), body, "utf8");
  }
  return pack;
}

// QFAI:EX-0001-0013-01
// QFAI:EX-0001-0014-01
// QFAI:EX-0001-0014-02
// QFAI:EX-0001-0014-03
it("accepts a complete fifteen-file pack and blocks open or undocumented deferred questions", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-discussion-"));
  try {
    expect(REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES).toHaveLength(15);
    const pack = await writeCompletePack(root);
    expect(await validateDiscussionPackReadiness(root, defaultConfig)).toEqual([]);

    await writeFile(
      path.join(pack, "11_OQ-Register.md"),
      oqTable.replace("| resolved |", "| open |"),
      "utf8",
    );
    const open = await validateDiscussionPackReadiness(root, defaultConfig);
    expect(
      open.some(
        (finding) => finding.code === "QFAI-DPACK-004" && finding.refs?.includes("OQ-0001"),
      ),
    ).toBe(true);

    await writeFile(
      path.join(pack, "11_OQ-Register.md"),
      oqTable.replace("| resolved |", "| deferred |"),
      "utf8",
    );
    const deferred = await validateDiscussionPackReadiness(root, defaultConfig);
    expect(
      deferred.some(
        (finding) => finding.code === "QFAI-DPACK-007" && finding.refs?.includes("OQ-0001"),
      ),
    ).toBe(true);

    await writeFile(
      path.join(pack, "13_Deferred.md"),
      `# Deferred\n\n| OQ-ID | Reason |\n| --- | --- |\n| OQ-0001 | The owner revisits the route after launch. |\n\n${filler}`,
      "utf8",
    );
    const documented = await validateDiscussionPackReadiness(root, defaultConfig);
    expect(documented.filter((finding) => finding.refs?.includes("OQ-0001"))).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0013-02
it("blocks readiness when one of the fifteen required files is missing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-discussion-"));
  try {
    const pack = await writeCompletePack(root);
    await rm(path.join(pack, "13_Deferred.md"));
    const findings = await validateDiscussionPackReadiness(root, defaultConfig);
    expect(
      findings.some(
        (finding) =>
          finding.code === "QFAI-DPACK-002" && finding.refs?.includes("13_Deferred.md"),
      ),
    ).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
