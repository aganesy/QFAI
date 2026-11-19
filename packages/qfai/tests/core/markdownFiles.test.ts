import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { legacyLayoutConfig as config } from "./legacyLayoutConfig.js";
import { validateHtmlMock } from "../../src/core/validators/htmlMock.js";
import {
  markdownFileReader,
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

/** An error shaped as a failed `fs` call reports it, with its errno code and the path. */
function errnoError(code: string, filePath: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`${code}: open '${filePath}'`), { code, path: filePath });
}

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
    const asked: string[] = [];
    let walks = 0;
    const shared = sharedMarkdownFileReader(async (dir) => {
      walks += 1;
      return readMarkdownFiles(dir);
    });
    const reader: MarkdownFileReader = async (dir) => {
      asked.push(dir);
      return shared(dir);
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

  it("leaves out a file that is gone by the time it is read", async () => {
    const root = await projectWithMockAndFlow();
    const specsDir = path.join(root, ".qfai", "specs");
    await writeFile(path.join(specsDir, "vanished.md"), "# Gone\n", "utf-8");
    const reader = markdownFileReader(async (filePath) => {
      if (filePath.endsWith("vanished.md")) throw errnoError("ENOENT", filePath);
      return readFile(filePath, "utf-8");
    });

    const files = await reader(specsDir);

    expect(files.map((file) => path.basename(file.filePath))).toEqual(["screens.md"]);
  });

  it("fails the read when a file is there but cannot be read, naming the file", async () => {
    const root = await projectWithMockAndFlow();
    const specsDir = path.join(root, ".qfai", "specs");
    const denied = path.join(specsDir, "denied.md");
    await writeFile(denied, "# Denied\n", "utf-8");
    const reader = markdownFileReader(async (filePath) => {
      if (filePath.endsWith("denied.md")) throw errnoError("EACCES", filePath);
      return readFile(filePath, "utf-8");
    });

    await expect(reader(specsDir)).rejects.toThrow(/denied\.md/);
    await expect(validateHtmlMock(root, "web", config, undefined, reader)).rejects.toThrow(
      /EACCES/,
    );
  });
});
