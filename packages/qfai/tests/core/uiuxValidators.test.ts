import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { parseDesignToken } from "../../src/core/parse/designToken.js";
import { computeContrastRatio } from "../../src/core/uiux/contrastRatio.js";
import { parseHtmlMock } from "../../src/core/uiux/htmlMockDom.js";
import { validateAgentDefinition } from "../../src/core/validators/agentDefinition.js";
import { validateBpApDb } from "../../src/core/validators/bpApDb.js";
import { validateDesignToken } from "../../src/core/validators/designToken.js";
import { validateHtmlMock } from "../../src/core/validators/htmlMock.js";
import { detectPlatform } from "../../src/core/validators/platformDetection.js";
import { validateMermaidScreenFlow } from "../../src/core/validators/mermaidScreenFlow.js";
import { validateResearchSummary } from "../../src/core/validators/researchSummary.js";
import { validateUiDefinitionConsistency } from "../../src/core/validators/uiDefinitionConsistency.js";

const tempDirs: string[] = [];

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
    const discussionDir = path.join(root, ".qfai", "discussion");
    await mkdir(discussionDir, { recursive: true });

    const md = [
      "## Screen Mock (HTML+CSS)",
      "",
      "```html",
      '<button style="width: 20px">Tap</button>',
      "```",
      "",
    ].join("\n");
    await writeFile(path.join(discussionDir, "touch-target-missing-dimension.md"), md, "utf-8");

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

  it("extracts Research Summary section content correctly", async () => {
    const root = await newTempDir();
    const discussionDir = path.join(root, ".qfai", "discussion");
    await mkdir(discussionDir, { recursive: true });

    const md = [
      "# Spec",
      "",
      "## Research Summary",
      "sources:",
      "  - id: src-1",
      "    title: Example",
      "    url: https://example.com",
      "    published: 2026-01-01",
      "best_practices:",
      "  - practice",
      "anti_patterns:",
      "  - anti",
      "reflection:",
      "  - action: apply",
      "    reason: relevant",
      "",
      "## Next",
      "- done",
      "",
    ].join("\n");
    await writeFile(path.join(discussionDir, "sample.md"), md, "utf-8");

    const issues = await validateResearchSummary(root, defaultConfig);
    const codes = issues.map((item) => item.code);

    expect(codes).not.toContain("QFAI-RESEARCH-001");
    expect(codes).not.toContain("QFAI-RESEARCH-003");
    expect(codes).not.toContain("QFAI-RESEARCH-004");
    expect(codes).not.toContain("QFAI-RESEARCH-005");
    expect(codes).not.toContain("QFAI-RESEARCH-006");
  });

  it("does not treat best_practices ids as source entries", async () => {
    const root = await newTempDir();
    const discussionDir = path.join(root, ".qfai", "discussion");
    await mkdir(discussionDir, { recursive: true });

    const md = [
      "# Spec",
      "",
      "## Research Summary",
      "sources:",
      "  - id: src-1",
      "    title: Primary source",
      "    url: https://example.com/source",
      "    published: 2026-01-01",
      "best_practices:",
      "  - id: BP-001",
      "    pattern: Keep source IDs explicit",
      "anti_patterns:",
      "  - id: AP-001",
      "    pattern: Infer source fields from non-source lists",
      "reflection:",
      "  - action: apply",
      "    reason: Prevent false positives",
      "",
    ].join("\n");
    await writeFile(path.join(discussionDir, "sample-with-ids.md"), md, "utf-8");

    const issues = await validateResearchSummary(root, defaultConfig);
    const codes = issues.map((item) => item.code);

    expect(codes).not.toContain("QFAI-RESEARCH-004");
    expect(codes).not.toContain("QFAI-RESEARCH-005");
    expect(codes).not.toContain("QFAI-RESEARCH-006");
  });

  it("reports the latest discussion pack when no file carries a Research Summary", async () => {
    const root = await newTempDir();
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "04_Sources.md"),
      ["# 04 Sources", "", "## Source Registry", "", "- SRC-0001", ""].join("\n"),
      "utf-8",
    );

    const issues = await validateResearchSummary(root, defaultConfig);
    const missing = issues.filter((item) => item.code === "QFAI-RESEARCH-012");

    expect(missing).toHaveLength(1);
    expect(missing[0]?.severity).toBe("warning");
    expect(missing[0]?.file).toContain("discussion-20260101000000000");
  });

  it("respects uiux.requireResearchSummary: false for the absence rule", async () => {
    // A project that turned the requirement off should not be told the section
    // is missing — and under `--fail-on warning` or `--strict` that warning
    // fails the run over a rule it opted out of.
    const root = await newTempDir();
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "04_Sources.md"),
      ["# 04 Sources", "", "## Source Registry", "", "- SRC-0001", ""].join("\n"),
      "utf-8",
    );

    const optedOut = {
      ...defaultConfig,
      uiux: { ...(defaultConfig.uiux ?? {}), requireResearchSummary: false },
    };
    expect((await validateResearchSummary(root, optedOut)).map((item) => item.code)).not.toContain(
      "QFAI-RESEARCH-012",
    );

    // Absent and `true` both keep the rule on: turning it off is an explicit
    // act, not the default.
    for (const uiux of [
      defaultConfig.uiux,
      { ...(defaultConfig.uiux ?? {}), requireResearchSummary: true },
    ]) {
      const config = { ...defaultConfig, ...(uiux ? { uiux } : {}) };
      expect((await validateResearchSummary(root, config)).map((item) => item.code)).toContain(
        "QFAI-RESEARCH-012",
      );
    }
  });

  it("keeps a malformed Research Summary reported under requireResearchSummary: false", async () => {
    // The setting says the section is not required. It does not say a section
    // the project chose to write may record the protocol wrongly, so the
    // content rules stay on.
    const root = await newTempDir();
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "04_Sources.md"),
      ["# 04 Sources", "", "## Research Summary", "sources:", "  - id: SRC-0001", ""].join("\n"),
      "utf-8",
    );

    const codes = (
      await validateResearchSummary(root, {
        ...defaultConfig,
        uiux: { ...(defaultConfig.uiux ?? {}), requireResearchSummary: false },
      })
    ).map((item) => item.code);

    expect(codes).not.toContain("QFAI-RESEARCH-012");
    expect(codes).toContain("QFAI-RESEARCH-004");
  });

  it("does not report a missing Research Summary once the latest pack carries one", async () => {
    const root = await newTempDir();
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "04_Sources.md"),
      [
        "# 04 Sources",
        "",
        "## Research Summary",
        "sources:",
        "  - id: SRC-0001",
        "    title: Example",
        "    url: https://example.com",
        "    published: 2026-01-01",
        "best_practices:",
        "  - practice",
        "anti_patterns:",
        "  - anti",
        "reflection:",
        "  - action: apply",
        "    reason: relevant",
        "",
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateResearchSummary(root, defaultConfig);

    expect(issues.map((item) => item.code)).not.toContain("QFAI-RESEARCH-012");
  });

  it("ships a 04_Sources.md template that already satisfies the Research Summary presence rule", async () => {
    const root = await newTempDir();
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
    await mkdir(packDir, { recursive: true });
    const template = await readFile(
      path.resolve(
        process.cwd(),
        "assets/init/.qfai/assistant/skills/qfai-discussion/templates/04_Sources.md",
      ),
      "utf-8",
    );
    await writeFile(path.join(packDir, "04_Sources.md"), template, "utf-8");

    const codes = (await validateResearchSummary(root, defaultConfig)).map((item) => item.code);

    expect(codes).not.toContain("QFAI-RESEARCH-012");
    expect(codes).not.toContain("QFAI-RESEARCH-001");
    expect(codes).not.toContain("QFAI-RESEARCH-007");
    expect(codes).not.toContain("QFAI-RESEARCH-008");
    expect(codes).not.toContain("QFAI-RESEARCH-011");
    // …but an untouched scaffold must not pass as recorded research: every
    // required value is still a bracketed placeholder.
    expect(codes).toContain("QFAI-RESEARCH-004");
    expect(codes).toContain("QFAI-RESEARCH-005");
    expect(codes).toContain("QFAI-RESEARCH-006");
    expect(codes).toContain("QFAI-RESEARCH-010");
  });

  it("rejects template placeholders left in required Research Summary values", async () => {
    const root = await newTempDir();
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "04_Sources.md"),
      [
        "# 04 Sources",
        "",
        "## Research Summary",
        "sources:",
        "  - id: SRC-0001",
        "    title: [Source title]",
        "    url: [https://example.com/reference]",
        "    published: 2026-01-01",
        "best_practices:",
        "  - id: BP-0001",
        "anti_patterns:",
        "  - id: AP-0001",
        "reflection:",
        "  - action: apply",
        "    reason: [Why this action was chosen]",
        "",
      ].join("\n"),
      "utf-8",
    );

    const codes = (await validateResearchSummary(root, defaultConfig)).map((item) => item.code);

    expect(codes).toContain("QFAI-RESEARCH-004");
    expect(codes).toContain("QFAI-RESEARCH-005");
    expect(codes).toContain("QFAI-RESEARCH-010");
  });

  it("rejects quoted template placeholders in required Research Summary values", async () => {
    // Quoting a YAML scalar is ordinary style, so `title: "[Source title]"` is
    // the same unfilled slot as the bare form and must not pass as research.
    const root = await newTempDir();
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "04_Sources.md"),
      [
        "# 04 Sources",
        "",
        "## Research Summary",
        "sources:",
        "  - id: SRC-0001",
        '    title: "[Source title]"',
        "    url: '[https://example.com/reference]'",
        "    published: 2026-01-01",
        "best_practices:",
        "  - id: BP-0001",
        "anti_patterns:",
        "  - id: AP-0001",
        "reflection:",
        "  - action: apply",
        '    reason: "[Why this action was chosen]"',
        "",
      ].join("\n"),
      "utf-8",
    );

    const codes = (await validateResearchSummary(root, defaultConfig)).map((item) => item.code);

    expect(codes).toContain("QFAI-RESEARCH-004");
    expect(codes).toContain("QFAI-RESEARCH-005");
    expect(codes).toContain("QFAI-RESEARCH-010");
  });

  it("accepts quoted real values in required Research Summary fields", async () => {
    // Over-correction pin: unquoting must only expose the placeholder check,
    // never reject a genuine value that happens to be quoted.
    const root = await newTempDir();
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "04_Sources.md"),
      [
        "# 04 Sources",
        "",
        "## Research Summary",
        "sources:",
        "  - id: SRC-0001",
        '    title: "Structured logging at scale"',
        "    url: 'https://example.com/logging'",
        "    published: 2026-01-01",
        "best_practices:",
        "  - id: BP-0001",
        "anti_patterns:",
        "  - id: AP-0001",
        "reflection:",
        "  - action: apply",
        '    reason: "The pack adopts the same log envelope"',
        "",
      ].join("\n"),
      "utf-8",
    );

    const codes = (await validateResearchSummary(root, defaultConfig)).map((item) => item.code);

    expect(codes).not.toContain("QFAI-RESEARCH-004");
    expect(codes).not.toContain("QFAI-RESEARCH-005");
    expect(codes).not.toContain("QFAI-RESEARCH-010");
  });

  it("ignores a Research Summary heading that only appears inside a fenced code block", async () => {
    // An example schema quoted in a fence documents the section; it is not the
    // pack's own section, so the pack still has none.
    const root = await newTempDir();
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "04_Sources.md"),
      [
        "# 04 Sources",
        "",
        "## Source Registry",
        "",
        "- SRC-0001",
        "",
        "## How To Fill This Pack",
        "",
        "```markdown",
        "## Research Summary",
        "sources:",
        "  - id: SRC-0001",
        "    title: Example",
        "    url: https://example.com",
        "    published: 2026-01-01",
        "best_practices:",
        "  - practice",
        "anti_patterns:",
        "  - anti",
        "reflection:",
        "  - action: apply",
        "    reason: relevant",
        "```",
        "",
      ].join("\n"),
      "utf-8",
    );

    const codes = (await validateResearchSummary(root, defaultConfig)).map((item) => item.code);

    expect(codes).toContain("QFAI-RESEARCH-012");
  });

  it("validates the real Research Summary that follows a fenced example heading", async () => {
    // Over-correction pin: skipping fenced headings must not skip the file —
    // the section written after the example is still the pack's own.
    const root = await newTempDir();
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "04_Sources.md"),
      [
        "# 04 Sources",
        "",
        "## How To Fill This Pack",
        "",
        "```markdown",
        "## Research Summary",
        "sources:",
        "  - id: SRC-EXAMPLE",
        "    title: Example",
        "    url: https://example.com",
        "    published: 2026-01-01",
        "```",
        "",
        "## Research Summary",
        "",
        "sources:",
        "  - id: SRC-0001",
        "    title: Structured logging at scale",
        "    url: https://example.com/logging",
        "    published: 2026-01-01",
        "best_practices:",
        "  - practice",
        "anti_patterns:",
        "  - anti",
        "reflection:",
        "  - action: apply",
        "    reason: relevant",
        "",
      ].join("\n"),
      "utf-8",
    );

    const codes = (await validateResearchSummary(root, defaultConfig)).map((item) => item.code);

    expect(codes).not.toContain("QFAI-RESEARCH-012");
    expect(codes).not.toContain("QFAI-RESEARCH-001");
    expect(codes).not.toContain("QFAI-RESEARCH-007");
    expect(codes).not.toContain("QFAI-RESEARCH-008");
    expect(codes).not.toContain("QFAI-RESEARCH-011");
  });

  it("treats an empty Research Summary section as an unrecorded protocol", async () => {
    const root = await newTempDir();
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "04_Sources.md"),
      ["# 04 Sources", "", "## Research Summary", "", "## Trend Scan", "", "- none", ""].join("\n"),
      "utf-8",
    );

    const codes = (await validateResearchSummary(root, defaultConfig)).map((item) => item.code);

    expect(codes).toContain("QFAI-RESEARCH-012");
  });

  it("finds packs under an absolute discussionDir outside the project root", async () => {
    const root = await newTempDir();
    const externalDiscussionRoot = await newTempDir();
    const packDir = path.join(externalDiscussionRoot, "discussion-20260101000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "04_Sources.md"),
      ["# 04 Sources", "", "## Source Registry", "", "- SRC-0001", ""].join("\n"),
      "utf-8",
    );

    const config = {
      ...defaultConfig,
      paths: { ...defaultConfig.paths, discussionDir: externalDiscussionRoot },
    };
    const missing = (await validateResearchSummary(root, config)).filter(
      (item) => item.code === "QFAI-RESEARCH-012",
    );

    expect(missing).toHaveLength(1);
    expect(missing[0]?.file).toContain("discussion-20260101000000000");
  });

  it("does not report a missing Research Summary when there is no discussion pack", async () => {
    const root = await newTempDir();
    const discussionDir = path.join(root, ".qfai", "discussion");
    await mkdir(discussionDir, { recursive: true });
    await writeFile(path.join(discussionDir, "notes.md"), "# Notes\n\n- loose file\n", "utf-8");

    const issues = await validateResearchSummary(root, defaultConfig);

    expect(issues.map((item) => item.code)).not.toContain("QFAI-RESEARCH-012");
  });

  it("normalizes CLI platform input before validation", async () => {
    const root = await newTempDir();
    const result = await detectPlatform(root, defaultConfig, "  MOBILE-IOS  ");

    expect(result.platform).toBe("mobile-ios");
    expect(result.source).toBe("cli");
    expect(result.issues).toHaveLength(0);
  });

  it("returns empty issues for bp/ap validator when rule files are absent", async () => {
    const root = await newTempDir();
    const issues = await validateBpApDb(root, defaultConfig);
    expect(issues).toHaveLength(0);
  });

  it("returns empty issues for mermaid screen flow validator when markdown is absent", async () => {
    const root = await newTempDir();
    const issues = await validateMermaidScreenFlow(root, defaultConfig);
    expect(issues).toHaveLength(0);
  });

  it("ignores stale discussion packs when mermaid screen flow validates the latest pack", async () => {
    const root = await newTempDir();
    const stalePackPath = path.join(
      root,
      ".qfai",
      "discussion",
      "discussion-20260416000000000",
      "02_Inception-Deck.md",
    );
    const latestPackPath = path.join(
      root,
      ".qfai",
      "discussion",
      "discussion-20260417000000000",
      "02_Inception-Deck.md",
    );
    await mkdir(path.dirname(stalePackPath), { recursive: true });
    await mkdir(path.dirname(latestPackPath), { recursive: true });
    await writeFile(
      stalePackPath,
      ["# Inception", "", "```mermaid", "stateDiagram-v2", "  [*] --> draft", "```", ""].join("\n"),
      "utf-8",
    );
    await writeFile(
      latestPackPath,
      [
        "# Inception",
        "",
        "```mermaid",
        "stateDiagram-v2",
        "  [*] --> ready: start",
        "  ready --> [*]: done",
        "```",
        "",
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateMermaidScreenFlow(root, defaultConfig);
    expect(issues).toEqual([]);
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
    expect(issues).toEqual([]);
  });

  it("detects key html mock violations with stable code/severity", async () => {
    const root = await newTempDir();
    const discussionDir = path.join(root, ".qfai", "discussion");
    await mkdir(discussionDir, { recursive: true });

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
    await writeFile(path.join(discussionDir, "mock.md"), md, "utf-8");

    const issues = await validateHtmlMock(root, "mobile-ios", defaultConfig);
    const byCode = new Map(issues.map((item) => [item.code, item]));

    expect(byCode.get("QFAI-MOCK-002")?.severity).toBe("error");
    expect(byCode.get("QFAI-MOCK-003")?.severity).toBe("error");
    expect(byCode.get("QFAI-MOCK-004")?.severity).toBe("error");
    expect(byCode.get("QFAI-MOCK-009")?.severity).toBe("error");
  });

  it("validates inline HTML mock blocks in visual mock sections", async () => {
    const root = await newTempDir();
    const discussionDir = path.join(root, ".qfai", "discussion");
    await mkdir(discussionDir, { recursive: true });

    const md = [
      "## HTML+CSS Visual Mock: Sample",
      "",
      "<!-- Screen Mock: Sample -->",
      '<link rel="stylesheet" href="https://cdn.example.com/app.css">',
      '<button style="width: 20px; height: 20px">Tap</button>',
      "",
    ].join("\n");
    await writeFile(path.join(discussionDir, "inline-mock.md"), md, "utf-8");

    const issues = await validateHtmlMock(root, "mobile-ios", defaultConfig);
    const codes = issues.map((item) => item.code);

    expect(codes).toContain("QFAI-MOCK-002");
    expect(codes).toContain("QFAI-MOCK-009");
  });

  it("validates adjacent css fences in screen mock sections", async () => {
    const root = await newTempDir();
    const discussionDir = path.join(root, ".qfai", "discussion");
    await mkdir(discussionDir, { recursive: true });

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
    await writeFile(path.join(discussionDir, "fenced-mock.md"), md, "utf-8");

    const issues = await validateHtmlMock(root, "web", defaultConfig);
    const codes = issues.map((item) => item.code);

    expect(codes).toContain("QFAI-MOCK-004");
  });

  it("checks fallback consistency for inline visual mock blocks", async () => {
    const root = await newTempDir();
    const designDir = path.join(root, ".qfai", "contracts", "design");
    const discussionDir = path.join(root, ".qfai", "discussion");
    await mkdir(designDir, { recursive: true });
    await mkdir(discussionDir, { recursive: true });

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
    await writeFile(path.join(discussionDir, "consistency-inline.md"), md, "utf-8");

    const issues = await validateUiDefinitionConsistency(root, defaultConfig);
    expect(issues.some((item) => item.code === "QFAI-CONSISTENCY-001")).toBe(true);
  });

  it("handles nested research_summary lists without treating sibling keys as sources", async () => {
    const root = await newTempDir();
    const discussionDir = path.join(root, ".qfai", "discussion");
    await mkdir(discussionDir, { recursive: true });

    const md = [
      "## Research Summary",
      "research_summary:",
      "  sources:",
      "    - id: src-1",
      "      title: Source",
      "      url: https://example.com",
      "      published: 2026-01-01",
      "  best_practices:",
      "    - id: BP-001",
      "      pattern: Keep sources explicit",
      "  anti_patterns:",
      "    - id: AP-001",
      "      pattern: Parse all id entries as sources",
      "  reflection:",
      "    - action: apply",
      "      reason: Keep validation scoped",
      "",
    ].join("\n");
    await writeFile(path.join(discussionDir, "nested-summary.md"), md, "utf-8");

    const issues = await validateResearchSummary(root, defaultConfig);
    const codes = issues.map((item) => item.code);

    expect(codes).not.toContain("QFAI-RESEARCH-004");
    expect(codes).not.toContain("QFAI-RESEARCH-005");
    expect(codes).not.toContain("QFAI-RESEARCH-006");
  });

  it("extracts inline html mock via Screen Mock — Fallback (HTML+CSS) heading", async () => {
    const root = await newTempDir();
    const discussionDir = path.join(root, ".qfai", "discussion");
    await mkdir(discussionDir, { recursive: true });

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
    await writeFile(path.join(discussionDir, "fallback-mock.md"), md, "utf-8");

    const issues = await validateHtmlMock(root, "mobile-ios", defaultConfig);
    const codes = issues.map((item) => item.code);

    // Heading-based extraction must find the inline HTML
    expect(codes).toContain("QFAI-MOCK-002"); // external stylesheet
    expect(codes).toContain("QFAI-MOCK-009"); // touch-target violation
  });

  it("normalizes design token platform values before validation", async () => {
    const root = await newTempDir();
    const designDir = path.join(root, ".qfai", "contracts", "design");
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

    const issues = await validateDesignToken(root, defaultConfig);
    expect(issues.some((item) => item.code === "QFAI-DT-006")).toBe(false);
  });
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-uiux-"));
  tempDirs.push(dir);
  return dir;
}

async function seedAgentDefinitionFixture(root: string, agentMarkdown: string): Promise<void> {
  const steeringDir = path.join(root, ".qfai", "assistant", "steering");
  const agentsDir = path.join(root, ".qfai", "assistant", "agents");
  await mkdir(steeringDir, { recursive: true });
  await mkdir(agentsDir, { recursive: true });

  // The catalog embeds a verbatim copy of the agent body under
  // `developer_instructions`; QFAI-AGENT-014 warns when an entry omits it or
  // lets it drift. Derive the block from this fixture's own markdown so the
  // fixture stays a clean tree whatever body a caller passes.
  const body = agentMarkdown.slice(agentMarkdown.indexOf("## Mission")).trimEnd();
  const block = body
    .split("\n")
    .map((line) => (line.length === 0 ? "" : `      ${line}`))
    .join("\n");
  await writeFile(
    path.join(steeringDir, "agent-catalog.yml"),
    [
      'schema_version: "1.0"',
      "agents:",
      "  - id: frontend-engineer",
      "    kind: worker",
      "    developer_instructions: |",
      block,
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(steeringDir, "agent-routing.yml"),
    [
      "routing:",
      "  - skill: qfai-prototyping",
      "    phases:",
      "      - mandatory_agents: [frontend-engineer]",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(steeringDir, "review-profiles.yml"), "profiles: {}\n", "utf-8");
  await writeFile(path.join(agentsDir, "frontend-engineer.md"), `${agentMarkdown}\n`, "utf-8");
}
