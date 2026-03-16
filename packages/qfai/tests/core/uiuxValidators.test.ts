import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { parseDesignToken } from "../../src/core/parse/designToken.js";
import { parseHtmlMock } from "../../src/core/uiux/htmlMockParser.js";
import { detectPlatform } from "../../src/core/validators/platformDetection.js";
import { validateResearchSummary } from "../../src/core/validators/researchSummary.js";

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

  it("detects local refs, unsafe URLs, and event handlers in HTML mock", () => {
    const html = [
      '<button style="width: 20px; height: 20px" onclick="doX()">Tap</button>',
      '<div style="width: 20px; height: 20px">Box</div>',
      '<link rel="stylesheet" href="./local.css">',
      '<a href="javascript:alert(1)">danger</a>',
    ].join("\n");

    const result = parseHtmlMock(html);

    expect(result.localRefs).toContain("./local.css");
    expect(result.unsafeUrls).toContain("javascript:alert(1)");
    expect(result.eventHandlers).toContain("onclick");

    const button = result.inlineDimensions.find((item) => item.element === "button");
    const div = result.inlineDimensions.find((item) => item.element === "div");
    expect(button?.interactive).toBe(true);
    expect(div?.interactive).toBe(false);
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
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-uiux-"));
  tempDirs.push(dir);
  return dir;
}
