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

async function projectWith(
  files: Record<string, string[]>,
  rootName = "build[1]",
): Promise<string> {
  const parent = await mkdtemp(path.join(os.tmpdir(), "qfai-literal-dirs-"));
  parents.push(parent);
  const root = path.join(parent, rootName);
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

/**
 * Each configured directory alone holds `[1]`, under a root with a plain name. A pattern built
 * from `specs[1]` matches `specs1` instead, so a decoy sits there: a check that reads the
 * expanded location reports the decoy's file, or misses the literal directory's finding.
 */
describe("each configured directory holding glob syntax is read as a literal path", () => {
  const plainRoot = "project";

  function configWith(overrides: {
    specsDir?: string;
    contractsDir?: string;
    designTokensDir?: string;
  }) {
    const { designTokensDir, ...paths } = overrides;
    return {
      ...legacyLayoutConfig,
      paths: { ...legacyLayoutConfig.paths, ...paths },
      uiux: { ...legacyLayoutConfig.uiux, designTokensDir: designTokensDir ?? "tokens" },
    };
  }

  const mock = [
    "## Screen Mock (HTML+CSS)",
    "",
    "```html",
    '<button style="width: 20px; height: 20px; color: var(--fg)">Tap</button>',
    "```",
    "",
  ];
  const flow = ["```mermaid", "stateDiagram", "  home --> detail", "```", ""];

  it("reads the design tokens of a designTokensDir named `tokens[1]`, not `tokens1`", async () => {
    const root = await projectWith(
      {
        [path.join("tokens[1]", "design-tokens.yaml")]: tokenFile,
        [path.join("tokens1", "design-tokens.yaml")]: tokenFile,
      },
      plainRoot,
    );

    const issues = await validateDesignToken(root, configWith({ designTokensDir: "tokens[1]" }));
    const files = issues.filter((item) => item.code === "QFAI-DT-004").map((item) => item.file);

    expect(files).toContain("tokens[1]/design-tokens.yaml");
    expect(files).not.toContain("tokens1/design-tokens.yaml");
  });

  it("reads the HTML mocks of a specsDir named `specs[1]`, not `specs1`", async () => {
    const root = await projectWith(
      {
        [path.join("specs[1]", "screens.md")]: mock,
        [path.join("specs1", "screens.md")]: mock,
      },
      plainRoot,
    );

    const issues = await validateHtmlMock(root, "web", configWith({ specsDir: "specs[1]" }));
    const files = issues.filter((item) => item.code === "QFAI-MOCK-004").map((item) => item.file);

    expect(files).toContain("specs[1]/screens.md");
    expect(files).not.toContain("specs1/screens.md");
  });

  it("reads the Mermaid screen flows of a specsDir named `specs[1]`, not `specs1`", async () => {
    const root = await projectWith(
      {
        [path.join("specs[1]", "flow.md")]: flow,
        [path.join("specs1", "flow.md")]: flow,
      },
      plainRoot,
    );

    const issues = await validateMermaidScreenFlow(root, configWith({ specsDir: "specs[1]" }));
    const files = issues.filter((item) => item.code === "QFAI-FLOW-001").map((item) => item.file);

    expect(files).toContain("specs[1]/flow.md");
    expect(files).not.toContain("specs1/flow.md");
  });

  describe("the UI definition check", () => {
    const listMock = (fallback: string): string[] => [
      "## HTML+CSS Visual Mock: List",
      "<!-- Screen Mock: List -->",
      `<div style="color: var(--text, ${fallback})"></div>`,
      "/* token: {semantic.text.primary} */",
      "",
    ];
    const tokens = (value: string): string[] => [
      "semantic:",
      "  text:",
      "    primary:",
      `      $value: '${value}'`,
      "",
    ];
    const screens = (id: string): string[] => ["screens:", `  - id: ${id}`, ""];

    it("reads the tokens of a designTokensDir named `tokens[1]`, not `tokens1`", async () => {
      const root = await projectWith(
        {
          [path.join("tokens[1]", "design-tokens.yaml")]: tokens("#111111"),
          // The decoy's value equals the mock's fallback, so reading it hides the mismatch.
          [path.join("tokens1", "design-tokens.yaml")]: tokens("#222222"),
          [path.join("specs", "list.md")]: listMock("#222222"),
        },
        plainRoot,
      );

      const issues = await validateUiDefinitionConsistency(
        root,
        configWith({ specsDir: "specs", designTokensDir: "tokens[1]" }),
      );
      const messages = issues
        .filter((item) => item.code === "QFAI-CONSISTENCY-001")
        .map((item) => item.message);

      expect(messages).not.toEqual([]);
      for (const message of messages) {
        expect(message).toContain('"#222222" != resolved token value "#111111"');
      }
    });

    it("reads the UI contracts of a contractsDir named `contracts[1]`, not `contracts1`", async () => {
      const root = await projectWith(
        {
          [path.join("contracts[1]", "ui", "screens.yaml")]: screens("Settings"),
          [path.join("contracts1", "ui", "screens.yaml")]: screens("Decoy"),
          [path.join("specs", "list.md")]: listMock("#111111"),
        },
        plainRoot,
      );

      const issues = await validateUiDefinitionConsistency(
        root,
        configWith({ specsDir: "specs", contractsDir: "contracts[1]" }),
      );
      const messages = issues
        .filter((item) => item.code === "QFAI-CONSISTENCY-002")
        .map((item) => item.message);

      expect(messages).not.toEqual([]);
      for (const message of messages) {
        expect(message).toContain("screen: Settings");
      }
    });

    it("reads the mocks of a specsDir named `specs[1]`, not `specs1`", async () => {
      const root = await projectWith(
        {
          [path.join("tokens", "design-tokens.yaml")]: tokens("#111111"),
          [path.join("specs[1]", "list.md")]: listMock("#222222"),
          [path.join("specs1", "list.md")]: listMock("#333333"),
        },
        plainRoot,
      );

      const issues = await validateUiDefinitionConsistency(
        root,
        configWith({ specsDir: "specs[1]" }),
      );
      const files = issues
        .filter((item) => item.code === "QFAI-CONSISTENCY-001")
        .map((item) => item.file);

      expect(new Set(files)).toEqual(new Set(["specs[1]/list.md"]));
    });
  });
});
