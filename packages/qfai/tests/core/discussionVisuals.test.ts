import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateDiscussionVisuals } from "../../src/core/validators/discussionVisuals.js";

describe("validateDiscussionVisuals", () => {
  async function withTempRoot(task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-discussion-visuals-"));
    try {
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  async function writePackFile(
    root: string,
    fileName: "02_Inception-Deck.md" | "03_Story-Workshop.md",
    content: string,
  ): Promise<string> {
    const filePath = path.join(
      root,
      ".qfai",
      "discussion",
      "discussion-20260303101010101",
      fileName,
    );
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf-8");
    return filePath;
  }

  it("emits QFAI-VIS-001 warning when inception deck has no mermaid", async () => {
    await withTempRoot(async (root) => {
      const inceptionPath = await writePackFile(
        root,
        "02_Inception-Deck.md",
        "# 02 Inception Deck\n\nNo diagram is included.\n",
      );
      await writePackFile(
        root,
        "03_Story-Workshop.md",
        "# 03 Story Workshop\n\nNo UI story in this fixture.\n",
      );

      const issues = await validateDiscussionVisuals(root);
      const warning = issues.find((item) => item.code === "QFAI-VIS-001");

      expect(warning?.severity).toBe("warning");
      expect(warning?.file).toBe(inceptionPath);
    });
  });

  it("does not emit QFAI-VIS-001 when inception deck has a mermaid fence", async () => {
    await withTempRoot(async (root) => {
      await writePackFile(
        root,
        "02_Inception-Deck.md",
        ["# 02 Inception Deck", "", "```mermaid", "flowchart TD", "  A --> B", "```", ""].join(
          "\n",
        ),
      );
      await writePackFile(
        root,
        "03_Story-Workshop.md",
        "# 03 Story Workshop\n\nNo UI story in this fixture.\n",
      );

      const issues = await validateDiscussionVisuals(root);
      expect(issues.some((item) => item.code === "QFAI-VIS-001")).toBe(false);
    });
  });

  it("emits QFAI-VIS-002 warning when UI hints exist without HTML/CSS mock", async () => {
    await withTempRoot(async (root) => {
      await writePackFile(
        root,
        "02_Inception-Deck.md",
        ["# 02 Inception Deck", "", "```mermaid", "flowchart TD", "  A --> B", "```", ""].join(
          "\n",
        ),
      );
      const storyPath = await writePackFile(
        root,
        "03_Story-Workshop.md",
        [
          "# 03 Story Workshop",
          "",
          "The UI screen layout for the order page is still under review.",
          "",
        ].join("\n"),
      );

      const issues = await validateDiscussionVisuals(root);
      const warning = issues.find((item) => item.code === "QFAI-VIS-002");

      expect(warning?.severity).toBe("warning");
      expect(warning?.file).toBe(storyPath);
    });
  });

  it("does not emit QFAI-VIS-002 when Screen Mock (HTML+CSS) section exists", async () => {
    await withTempRoot(async (root) => {
      await writePackFile(
        root,
        "02_Inception-Deck.md",
        ["# 02 Inception Deck", "", "```mermaid", "flowchart TD", "  A --> B", "```", ""].join(
          "\n",
        ),
      );
      await writePackFile(
        root,
        "03_Story-Workshop.md",
        [
          "# 03 Story Workshop",
          "",
          "The UI screen layout for the order page is defined below.",
          "",
          "## Screen Mock (HTML+CSS)",
          "",
          "```html",
          '<section class="screen">Order form</section>',
          "```",
          "",
          "```css",
          ".screen { padding: 16px; }",
          "```",
          "",
        ].join("\n"),
      );

      const issues = await validateDiscussionVisuals(root);
      expect(issues.some((item) => item.code === "QFAI-VIS-002")).toBe(false);
    });
  });
});
