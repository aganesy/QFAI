import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { legacyLayoutConfig as defaultConfig } from "./legacyLayoutConfig.js";
import { parseDesignToken } from "../../src/core/parse/designToken.js";
import { computeContrastRatio } from "../../src/core/uiux/contrastRatio.js";
import { parseHtmlMock } from "../../src/core/uiux/htmlMockDom.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";
import { validateDesignToken } from "../../src/core/validators/designToken.js";
import { validateHtmlMock } from "../../src/core/validators/htmlMock.js";
import { detectPlatform } from "../../src/core/validators/platformDetection.js";
import { validateMermaidScreenFlow } from "../../src/core/validators/mermaidScreenFlow.js";
import { validateUiDefinitionConsistency } from "../../src/core/validators/uiDefinitionConsistency.js";

const tempDirs: string[] = [];
/** Design token files are read only from the directory `uiux.designTokensDir` names. */
const tokensConfig = {
  ...defaultConfig,
  uiux: { ...defaultConfig.uiux, designTokensDir: "tokens" },
};

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("uiux validators", () => {
  it("resolves repeated design token references", () => {
    const yaml = [
      "version: v1",
      "platform: web",
      "primitive:",
      "  color:",
      "    base:",
      "      $value: '#ffffff'",
      "semantic:",
      "  text:",
      "    body:",
      "      $value: '{primitive.color.base} / {primitive.color.base}'",
      "",
    ].join("\n");

    const parsed = parseDesignToken(yaml);

    expect(parsed.errors).toHaveLength(0);
    expect(parsed.resolved.get("semantic.text.body")).toBe("#ffffff / #ffffff");
  });

  it("detects local refs, unsafe URLs, and event handlers in HTML mock", async () => {
    const html = [
      '<button style="width: 20px; height: 20px" onclick="doX()">Tap</button>',
      '<div style="width: 20px; height: 20px">Box</div>',
      '<link rel="stylesheet" href="./local.css">',
      '<a href="javascript:alert(1)">danger</a>',
      '<a href="ftp://example.com/asset.bin">ftp</a>',
      '<img src="//cdn.example.com/image.png">',
      '<div data-href="https://example.com/should-not-be-detected"></div>',
    ].join("\n");

    const result = await parseHtmlMock(html);

    expect(result.localRefs).toContain("./local.css");
    expect(result.unsafeUrls).toContain("javascript:alert(1)");
    expect(result.eventHandlers).toContain("onclick");
    expect(result.externalUrls).toContain("//cdn.example.com/image.png");
    expect(result.externalUrls).toContain("ftp://example.com/asset.bin");
    expect(result.localRefs).not.toContain("ftp://example.com/asset.bin");
    expect(result.externalUrls).not.toContain("https://example.com/should-not-be-detected");

    const button = result.inlineDimensions.find((item) => item.element === "button");
    const div = result.inlineDimensions.find((item) => item.element === "div");
    expect(button?.interactive).toBe(true);
    expect(div?.interactive).toBe(false);
  });

  it("skips touch-target check when width or height is missing", async () => {
    const root = await newTempDir();
    const specsDir = path.join(root, ".qfai", "specs");
    await mkdir(specsDir, { recursive: true });

    const md = [
      "## Screen Mock (HTML+CSS)",
      "",
      "```html",
      '<button style="width: 20px">Tap</button>',
      "```",
      "",
    ].join("\n");
    await writeFile(path.join(specsDir, "touch-target-missing-dimension.md"), md, "utf-8");

    const issues = await validateHtmlMock(root, "mobile-ios", defaultConfig);
    expect(issues.some((item) => item.code === "QFAI-MOCK-009")).toBe(false);
  });

  it("returns null contrast ratio for out-of-range rgb values", () => {
    expect(computeContrastRatio("rgb(999,0,0)", "#ffffff")).toBeNull();
  });

  it("parses var() fallback values containing nested parentheses", async () => {
    const html =
      '<div style="color: var(--fg, rgba(0, 0, 0, 0.5)); width: calc(100% - 10px)"></div>';
    const result = await parseHtmlMock(html);
    expect(result.varUsages[0]?.fallback).toBe("rgba(0, 0, 0, 0.5)");
  });

  it("infers cross-platform for Electron projects", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ dependencies: { electron: "^1.0.0" } }, null, 2)}\n`,
      "utf-8",
    );

    const result = await detectPlatform(root, defaultConfig);

    expect(result.platform).toBe("cross-platform");
    expect(result.source).toBe("inference");
    expect(result.issues.some((item) => item.code === "QFAI-PLATFORM-002")).toBe(true);
    expect(result.issues.find((item) => item.code === "QFAI-PLATFORM-002")?.severity).toBe("info");
  });

  it("infers cross-platform for Flutter projects with android and ios", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "pubspec.yaml"), "name: sample\n", "utf-8");
    await mkdir(path.join(root, "android"), { recursive: true });
    await mkdir(path.join(root, "ios"), { recursive: true });

    const result = await detectPlatform(root, defaultConfig);

    expect(result.platform).toBe("cross-platform");
    expect(result.source).toBe("inference");
  });

  it("falls back to web when Flutter targets are not inferable", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "pubspec.yaml"), "name: sample\n", "utf-8");

    const result = await detectPlatform(root, defaultConfig);

    expect(result.platform).toBe("web");
    expect(result.source).toBe("fallback");
  });

  it("infers cross-platform for Flutter projects with mixed mobile and web targets", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "pubspec.yaml"), "name: sample\n", "utf-8");
    await mkdir(path.join(root, "ios"), { recursive: true });
    await mkdir(path.join(root, "web"), { recursive: true });

    const result = await detectPlatform(root, defaultConfig);

    expect(result.platform).toBe("cross-platform");
    expect(result.source).toBe("inference");
  });

  it("falls back to web when react-native has no platform directories", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ dependencies: { "react-native": "^1.0.0" } }, null, 2)}\n`,
      "utf-8",
    );

    const result = await detectPlatform(root, defaultConfig);

    expect(result.platform).toBe("web");
    expect(result.source).toBe("fallback");
  });

  it("normalizes CLI platform input before validation", async () => {
    const root = await newTempDir();
    const result = await detectPlatform(root, defaultConfig, "  MOBILE-IOS  ");

    expect(result.platform).toBe("mobile-ios");
    expect(result.source).toBe("cli");
    expect(result.issues).toHaveLength(0);
  });

  it("returns empty issues for mermaid screen flow validator when markdown is absent", async () => {
    const root = await newTempDir();
    const issues = await validateMermaidScreenFlow(root, defaultConfig);
    expect(issues).toHaveLength(0);
  });

  it("returns empty issues for ui definition consistency validator when inputs are absent", async () => {
    const root = await newTempDir();
    const issues = await validateUiDefinitionConsistency(root, defaultConfig);
    expect(issues).toHaveLength(0);
  });

  it("returns empty issues for agent definition validator when feature is not opted in", async () => {
    const root = await newTempDir();
    const issues = await validateAgentDefinition(root, defaultConfig);
    expect(issues).toHaveLength(0);
  });

  it("reports invalid agent frontmatter before runtime delegation can fail", async () => {
    const root = await newTempDir();
    await seedAgentDefinitionFixture(
      root,
      [
        "# Frontend Engineer",
        "",
        "## Mission",
        "",
        "- Implement frontend behavior.",
        "",
        "## Domain Responsibilities",
        "",
        "- Build UI.",
        "",
        "## Inputs you must read",
        "",
        "- .qfai/specs/spec-*/01_Spec.md",
        "",
        "## Deliverables",
        "",
        "- Implementation summary",
        "",
        "## Stop conditions",
        "",
        "- Missing source artifacts.",
        "",
        "## Sign-off",
        "",
        "- [ ] Deliverables are complete",
        "",
      ].join("\n"),
    );

    const issues = await validateAgentDefinition(root, defaultConfig);
    expect(issues.some((item) => item.code === "QFAI-AGENT-011")).toBe(true);
  });

  it("accepts agent markdown with valid Claude/GitHub Copilot-compatible frontmatter", async () => {
    const root = await newTempDir();
    await seedAgentDefinitionFixture(
      root,
      [
        "---",
        "name: frontend-engineer",
        'description: "Implement frontend behavior aligned with the selected direction."',
        "tools: [Read, Write, Edit, Glob, Grep, Bash]",
        "kind: worker",
        "domain: frontend",
        "mission: Implement frontend behavior.",
        "replaces: [frontend-engineer]",
        "owned_artifacts: [ui-implementation]",
        "tool_profile: frontend",
        "permission_profile: authoring",
        "specialization_tags: [frontend]",
        "---",
        "",
        "# Frontend Engineer",
        "",
        "## Mission",
        "",
        "- Implement frontend behavior.",
        "",
        "## Domain Responsibilities",
        "",
        "- Build UI.",
        "",
        "## Inputs you must read",
        "",
        "- .qfai/specs/spec-*/01_Spec.md",
        "",
        "## Deliverables",
        "",
        "- Implementation summary",
        "",
        "## Stop conditions",
        "",
        "- Missing source artifacts.",
        "",
        "## Sign-off",
        "",
        "- [ ] Deliverables are complete",
        "",
      ].join("\n"),
    );

    const issues = await validateAgentDefinition(root, defaultConfig);
    expect(
      issues.filter((item) => item.file === ".qfai/assistant/agent/frontend-engineer.md"),
    ).toEqual([]);
  });

  it("detects key html mock violations with stable code/severity", async () => {
    const root = await newTempDir();
    const specsDir = path.join(root, ".qfai", "specs");
    await mkdir(specsDir, { recursive: true });

    const md = [
      "## Screen Mock (HTML+CSS)",
      "",
      "```html",
      '<link rel="stylesheet" href="https://cdn.example.com/app.css">',
      '<script src="./app.js"></script>',
      '<button style="width: 20px; height: 20px; color: var(--fg); background-color: #ffffff">Tap</button>',
      "```",
      "",
    ].join("\n");
    await writeFile(path.join(specsDir, "mock.md"), md, "utf-8");

    const issues = await validateHtmlMock(root, "mobile-ios", defaultConfig);
    const byCode = new Map(issues.map((item) => [item.code, item]));

    expect(byCode.get("QFAI-MOCK-002")?.severity).toBe("error");
    expect(byCode.get("QFAI-MOCK-003")?.severity).toBe("error");
    expect(byCode.get("QFAI-MOCK-004")?.severity).toBe("error");
    expect(byCode.get("QFAI-MOCK-009")?.severity).toBe("error");
  });

  it("finds mocks under a specs directory spelled with a backslash", async () => {
    const root = await newTempDir();
    const specsDir = path.join(root, ".qfai", "specs");
    await mkdir(specsDir, { recursive: true });

    const md = [
      "## Screen Mock (HTML+CSS)",
      "",
      "```html",
      '<button style="width: 20px; height: 20px">Tap</button>',
      "```",
      "",
    ].join("\n");
    await writeFile(path.join(specsDir, "mock.md"), md, "utf-8");

    const issues = await validateHtmlMock(root, "mobile-ios", {
      ...defaultConfig,
      paths: { ...defaultConfig.paths, specsDir: ".qfai\\specs" },
    });

    expect(issues.some((item) => item.code === "QFAI-MOCK-009")).toBe(true);
  });

  it("validates inline HTML mock blocks in visual mock sections", async () => {
    const root = await newTempDir();
    const specsDir = path.join(root, ".qfai", "specs");
    await mkdir(specsDir, { recursive: true });

    const md = [
      "## HTML+CSS Visual Mock: Sample",
      "",
      "<!-- Screen Mock: Sample -->",
      '<link rel="stylesheet" href="https://cdn.example.com/app.css">',
      '<button style="width: 20px; height: 20px">Tap</button>',
      "",
    ].join("\n");
    await writeFile(path.join(specsDir, "inline-mock.md"), md, "utf-8");

    const issues = await validateHtmlMock(root, "mobile-ios", defaultConfig);
    const codes = issues.map((item) => item.code);

    expect(codes).toContain("QFAI-MOCK-002");
    expect(codes).toContain("QFAI-MOCK-009");
  });

  it("validates adjacent css fences in screen mock sections", async () => {
    const root = await newTempDir();
    const specsDir = path.join(root, ".qfai", "specs");
    await mkdir(specsDir, { recursive: true });

    const md = [
      "## Screen Mock (HTML+CSS)",
      "",
      "```html",
      '<div class="card">Card</div>',
      "```",
      "",
      "```css",
      ".card { color: var(--fg); }",
      "```",
      "",
    ].join("\n");
    await writeFile(path.join(specsDir, "fenced-mock.md"), md, "utf-8");

    const issues = await validateHtmlMock(root, "web", defaultConfig);
    const codes = issues.map((item) => item.code);

    expect(codes).toContain("QFAI-MOCK-004");
  });

  it("checks fallback consistency for inline visual mock blocks", async () => {
    const root = await newTempDir();
    const designDir = path.join(root, "tokens");
    const specsDir = path.join(root, ".qfai", "specs");
    await mkdir(designDir, { recursive: true });
    await mkdir(specsDir, { recursive: true });

    const tokenYaml = [
      "version: v1",
      "platform: web",
      "primitive:",
      "  color:",
      "    base:",
      "      $value: '#ffffff'",
      "semantic:",
      "  text:",
      "    primary:",
      "      $value: '#111111'",
      "",
    ].join("\n");
    await writeFile(path.join(designDir, "design-tokens.yaml"), tokenYaml, "utf-8");

    const md = [
      "## HTML+CSS Visual Mock: List",
      "<!-- Screen Mock: List -->",
      '<div style="color: var(--text, #222222)"></div>',
      "/* token: {semantic.text.primary} */",
      "",
    ].join("\n");
    await writeFile(path.join(specsDir, "consistency-inline.md"), md, "utf-8");

    const issues = await validateUiDefinitionConsistency(root, tokensConfig);
    expect(issues.some((item) => item.code === "QFAI-CONSISTENCY-001")).toBe(true);
  });

  it("extracts inline html mock via Screen Mock — Fallback (HTML+CSS) heading", async () => {
    const root = await newTempDir();
    const specsDir = path.join(root, ".qfai", "specs");
    await mkdir(specsDir, { recursive: true });

    // Use inline HTML (no ```html fence) so only the heading-based extraction path collects it
    const md = [
      "## Screen Mock — Fallback (HTML+CSS)",
      "",
      '<link rel="stylesheet" href="https://cdn.example.com/app.css">',
      '<button style="width: 20px; height: 20px">Tap</button>',
      "",
      "## Next Section",
      "",
    ].join("\n");
    await writeFile(path.join(specsDir, "fallback-mock.md"), md, "utf-8");

    const issues = await validateHtmlMock(root, "mobile-ios", defaultConfig);
    const codes = issues.map((item) => item.code);

    // Heading-based extraction must find the inline HTML
    expect(codes).toContain("QFAI-MOCK-002"); // external stylesheet
    expect(codes).toContain("QFAI-MOCK-009"); // touch-target violation
  });

  // QFAI:EX-0001-0039-10
  it("reads design tokens only from the configured directory, by category severity", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "tokens"), { recursive: true });
    const tokenYaml = [
      "primitive:",
      "  color:",
      "    base:",
      "      $value: ''",
      "    accent:",
      "      $value: '#ffffff'",
      "      platform: kiosk",
      "",
    ].join("\n");
    await writeFile(path.join(root, "tokens", "design-tokens.yaml"), tokenYaml, "utf-8");

    const issues = await validateDesignToken(root, tokensConfig);
    expect(issues.find((item) => item.code === "QFAI-DT-004")?.severity).toBe("error");
    expect(issues.find((item) => item.code === "QFAI-DT-006")?.severity).toBe("warning");
    expect(await validateDesignToken(root, defaultConfig)).toEqual([]);
  });

  it("normalizes design token platform values before validation", async () => {
    const root = await newTempDir();
    const designDir = path.join(root, "tokens");
    await mkdir(designDir, { recursive: true });

    const tokenYaml = [
      "version: v1",
      "platform: ' WEB '",
      "primitive:",
      "  color:",
      "    base:",
      "      $value: '#ffffff'",
      "semantic:",
      "  text:",
      "    primary:",
      "      $value: '#111111'",
      "",
    ].join("\n");
    await writeFile(path.join(designDir, "design-tokens-platform.yaml"), tokenYaml, "utf-8");

    const issues = await validateDesignToken(root, tokensConfig);
    expect(issues.some((item) => item.code === "QFAI-DT-006")).toBe(false);
  });
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-uiux-"));
  tempDirs.push(dir);
  return dir;
}

async function seedAgentDefinitionFixture(root: string, agentMarkdown: string): Promise<void> {
  const agentsDir = path.join(root, ".qfai", "assistant", "agent");
  await mkdir(agentsDir, { recursive: true });
  await writeFile(path.join(agentsDir, "frontend-engineer.md"), `${agentMarkdown}\n`, "utf-8");
}
