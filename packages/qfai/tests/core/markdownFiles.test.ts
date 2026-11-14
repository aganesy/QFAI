import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { legacyLayoutConfig as config } from "./legacyLayoutConfig.js";
import { validateHtmlMock } from "../../src/core/validators/htmlMock.js";
import {
  readMarkdownFiles,
  sharedMarkdownFileReader,
  type MarkdownFileReader,
} from "../../src/core/validators/markdownFiles.js";
import { validateMermaidScreenFlow } from "../../src/core/validators/mermaidScreenFlow.js";
import { validateUiDefinitionConsistency } from "../../src/core/validators/uiDefinitionConsistency.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function projectWithMockAndFlow(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-markdown-files-"));
  tempDirs.push(root);
  const specsDir = path.join(root, ".qfai", "specs");
  await mkdir(specsDir, { recursive: true });
  const md = [
    "## Screen: home",
    "",
    "## Screen Mock (HTML+CSS)",
    "",
    "```html",
    '<button style="width: 20px; height: 20px; color: var(--fg)">Tap</button>',
    "```",
    "",
    "```mermaid",
    "stateDiagram-v2",
    "  home --> detail",
    "```",
    "",
  ].join("\n");
  await writeFile(path.join(specsDir, "screens.md"), md, "utf-8");
  return root;
}

describe("Markdown under the specs directory in the UI/UX group", () => {
  it("is walked and read once for the HTML mock, UI definition and screen flow checks", async () => {
    const root = await projectWithMockAndFlow();
    const asked: string[][] = [];
    let walks = 0;
    const shared = sharedMarkdownFileReader(async (globs) => {
      walks += 1;
      return readMarkdownFiles(globs);
    });
    const reader: MarkdownFileReader = async (globs) => {
      asked.push(globs);
      return shared(globs);
    };

    const sharedIssues = await Promise.all([
      validateHtmlMock(root, "web", config, undefined, reader),
      validateUiDefinitionConsistency(root, config, reader),
      validateMermaidScreenFlow(root, config, reader),
    ]);

    expect(asked).toHaveLength(3);
    expect(walks).toBe(1);
    expect(sharedIssues).toEqual([
      await validateHtmlMock(root, "web", config),
      await validateUiDefinitionConsistency(root, config),
      await validateMermaidScreenFlow(root, config),
    ]);
    expect(sharedIssues[0]?.some((entry) => entry.code === "QFAI-MOCK-004")).toBe(true);
    expect(sharedIssues[2]?.some((entry) => entry.code === "QFAI-FLOW-002")).toBe(true);
  });

  it("skips a file the reader could not read, as the default reader does", async () => {
    const root = await projectWithMockAndFlow();
    const unreadable = path.join(root, ".qfai", "specs", "unreadable.md");
    const reader: MarkdownFileReader = async (globs) => [
      ...(await readMarkdownFiles(globs)),
      { filePath: unreadable, content: null },
    ];

    const withUnreadable = await Promise.all([
      validateHtmlMock(root, "web", config, undefined, reader),
      validateUiDefinitionConsistency(root, config, reader),
      validateMermaidScreenFlow(root, config, reader),
    ]);

    expect(withUnreadable).toEqual(
      await Promise.all([
        validateHtmlMock(root, "web", config),
        validateUiDefinitionConsistency(root, config),
        validateMermaidScreenFlow(root, config),
      ]),
    );
    expect(withUnreadable.flat().some((entry) => entry.file?.endsWith("unreadable.md"))).toBe(
      false,
    );
  });
});
