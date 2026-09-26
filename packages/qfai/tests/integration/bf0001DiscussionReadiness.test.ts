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

// QFAI:EX-0001-0013-01
// QFAI:EX-0001-0014-01
// QFAI:EX-0001-0014-02
it("accepts a complete fifteen-file pack and blocks open or undocumented deferred questions", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-discussion-"));
  try {
    const pack = path.join(root, ".qfai", "discussion", "discussion-20260923063306456");
    await mkdir(pack, { recursive: true });
    expect(REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES).toHaveLength(15);
    for (const name of REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES) {
      const body =
        name === "11_OQ-Register.md"
          ? oqTable
          : name === "03_Story-Workshop.md"
            ? `# Story Workshop\n\n${filler}\n\`\`\`mermaid\nflowchart TD\n  Start --> Finish\n\`\`\`\n`
            : `# ${name}\n\n${filler}`;
      await writeFile(path.join(pack, name), body, "utf8");
    }
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
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
