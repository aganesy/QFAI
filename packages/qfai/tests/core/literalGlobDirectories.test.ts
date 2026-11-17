import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { legacyLayoutConfig } from "./legacyLayoutConfig.js";
import { validateDesignToken } from "../../src/core/validators/designToken.js";
import { validateHtmlMock } from "../../src/core/validators/htmlMock.js";
import { validateMermaidScreenFlow } from "../../src/core/validators/mermaidScreenFlow.js";
import { validateUiDefinitionConsistency } from "../../src/core/validators/uiDefinitionConsistency.js";

/**
 * A project whose path and configured directories hold glob syntax: `[1]` reads as a character
 * class and `(v2)` as a group, so a pattern built from them finds `build1` or `tokens v2` instead.
 */
const config = {
  ...legacyLayoutConfig,
  paths: { ...legacyLayoutConfig.paths, specsDir: "specs (v2)", contractsDir: "contracts (v2)" },
  uiux: { ...legacyLayoutConfig.uiux, designTokensDir: "tokens (v2)" },
};

const parents: string[] = [];

afterEach(async () => {
  for (const dir of parents.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function projectWith(files: Record<string, string[]>): Promise<string> {
  const parent = await mkdtemp(path.join(os.tmpdir(), "qfai-literal-dirs-"));
  parents.push(parent);
  const root = path.join(parent, "build[1]");
  for (const [relative, lines] of Object.entries(files)) {
    const file = path.join(root, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, lines.join("\n"), "utf-8");
  }
  return root;
}

const tokenFile = ["primitive:", "  color:", "    base:", "      $value: ''", ""];

describe("directories holding glob syntax are read as literal paths", () => {
  it("reads the design token files of the configured directory", async () => {
    const root = await projectWith({
      [path.join("tokens (v2)", "design-tokens.yaml")]: tokenFile,
    });

    const issues = await validateDesignToken(root, config);

    expect(issues.map((item) => item.code)).toContain("QFAI-DT-004");
  });

  it("reads the HTML mocks under the specs directory", async () => {
    const root = await projectWith({
      [path.join("specs (v2)", "screens.md")]: [
        "## Screen Mock (HTML+CSS)",
        "",
        "```html",
        '<button style="width: 20px; height: 20px; color: var(--fg)">Tap</button>',
        "```",
        "",
      ],
    });

    const issues = await validateHtmlMock(root, "web", config);

    expect(issues.map((item) => item.code)).toContain("QFAI-MOCK-004");
  });

  it("reads the Mermaid screen flows under the specs directory", async () => {
    const root = await projectWith({
      [path.join("specs (v2)", "flow.md")]: [
        "```mermaid",
        "stateDiagram",
        "  home --> detail",
        "```",
        "",
      ],
    });

    const issues = await validateMermaidScreenFlow(root, config);

    expect(issues.map((item) => item.code)).toContain("QFAI-FLOW-001");
  });

  it("reads the tokens, UI contracts and mocks the UI definition check compares", async () => {
    const root = await projectWith({
      [path.join("tokens (v2)", "design-tokens.yaml")]: [
        "semantic:",
        "  text:",
        "    primary:",
        "      $value: '#111111'",
        "",
      ],
      [path.join("contracts (v2)", "ui", "screens.yaml")]: ["screens:", "  - id: Settings", ""],
      [path.join("specs (v2)", "list.md")]: [
        "## HTML+CSS Visual Mock: List",
        "<!-- Screen Mock: List -->",
        '<div style="color: var(--text, #222222)"></div>',
        "/* token: {semantic.text.primary} */",
        "",
      ],
    });

    const issues = await validateUiDefinitionConsistency(root, config);
    const codes = issues.map((item) => item.code);

    expect(codes).toContain("QFAI-CONSISTENCY-001");
    expect(codes).toContain("QFAI-CONSISTENCY-002");
  });
});
