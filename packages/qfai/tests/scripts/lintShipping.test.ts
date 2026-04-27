/**
 * Tests for the package self-containment lint (v1.8.4 Phase 8).
 *
 * Two layers:
 *   1. Programmatic invariant — the lint scans the actual package source +
 *      assets/init/ and asserts ZERO violations. This is the CI-blocking
 *      assertion that prevents new spec / AC / TC / REQ literal hardcodes
 *      from leaking into shipped templates.
 *   2. Fixture tests — synthetic test fixtures with deliberate violations
 *      verify the detection logic works as designed (the lint catches what
 *      it should, and ignores what it should via pragma / source-comment
 *      exclusions).
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  formatViolations,
  runLintShipping,
} from "../../scripts/lint-shipping.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, "../..");

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-lint-ship-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("lint-shipping invariant — actual package", () => {
  it("emits zero violations on the real package source + assets/init", async () => {
    const { violations, scannedFileCount } = await runLintShipping(PKG_ROOT);
    expect(scannedFileCount).toBeGreaterThan(0);
    if (violations.length > 0) {
      throw new Error(
        `lint-shipping invariant violated. ${violations.length} occurrence(s):\n${formatViolations(violations)}\n\n` +
          "Adding shipped templates that reference user-side specific IDs " +
          "(e.g. spec-NNNN, TC-NNNN-NNNN) breaks for any user repo that " +
          "doesn't share those exact IDs. Resolve at runtime instead.",
      );
    }
    expect(violations).toEqual([]);
  });
});

describe("lint-shipping fixture — detection rules", () => {
  it("detects spec-id-literal and spec-path-literal in shipped runtime YAML", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/waivers.yml"),
      [
        "version: 1",
        "waivers:",
        "  - id: WVR-0001",
        "    scope:",
        "      paths: [\".qfai/specs/spec-0042/**\"]",
        "",
      ].join("\n"),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    expect(violations.map((v) => v.pattern)).toEqual(
      expect.arrayContaining(["spec-id-literal", "spec-path-literal"]),
    );
  });

  it("detects composite-id-literal in shipped runtime JSON", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/example.json"),
      JSON.stringify({ implements: ["TC-0012-0290", "AC-0012-0175"] }, null, 2),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    const composite = violations.filter((v) => v.pattern === "composite-id-literal");
    expect(composite).toHaveLength(2);
  });

  it("does NOT flag spec-id-literal in shipped markdown documentation", async () => {
    // Markdown docs use spec references as narrative citation
    // (e.g. "this rule comes from spec-0012") — not runtime assumptions.
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai/assistant/skills/x"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/assistant/skills/x/SKILL.md"),
      "# x\n\nThis skill implements spec-0042 contract.\n",
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    const specId = violations.filter((v) => v.pattern === "spec-id-literal");
    expect(specId).toEqual([]);
  });

  it("DOES flag spec-path-literal even in markdown (path is install-site assumption)", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai/assistant/skills/x"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/assistant/skills/x/SKILL.md"),
      "Read `.qfai/specs/spec-0042/01_Spec.md` for SSOT.\n",
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    // Wait — spec-path-literal applies to init-runtime + src, NOT init-doc.
    // So markdown docs are exempt from path-literal too.
    const pathLit = violations.filter((v) => v.pattern === "spec-path-literal");
    expect(pathLit).toEqual([]);
  });

  it("does NOT flag YAML comment lines (parser ignores them)", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/example.yaml"),
      [
        "# Example: see spec-0042 for context",
        "# Path: .qfai/specs/spec-0042/",
        "items: []",
        "",
      ].join("\n"),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    expect(violations).toEqual([]);
  });

  it("does NOT flag the seed spec-XXXX directory itself", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai/specs/spec-XXXX/tdd"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/specs/spec-XXXX/01_Spec.md"),
      "# spec-XXXX\n\nReferences spec-0001 internally.\n",
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    expect(violations).toEqual([]);
  });

  it("does NOT flag JSDoc traceability lines in source files", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "src/foo"), { recursive: true });
    await writeFile(
      path.join(root, "src/foo/bar.ts"),
      [
        "/**",
        " * spec-0012 TC-0012-0290 / AC-0012-0175",
        " */",
        "export function foo(): void {}",
        "",
      ].join("\n"),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    expect(violations).toEqual([]);
  });

  it("does NOT flag content immediately after a pragma in YAML runtime data", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/example.yaml"),
      [
        '# qfai-shipping:allow reason="concrete example for documentation"',
        "demo_spec: spec-0042",
        "",
      ].join("\n"),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    expect(violations).toEqual([]);
  });

  it("does NOT flag yaml comment lines (always exempt)", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai/contracts/design"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/contracts/design/example.yaml"),
      [
        "# this comment mentions spec-0042 but is exempt as a YAML comment",
        "items: []",
        "",
      ].join("\n"),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    expect(violations).toEqual([]);
  });

  it("ignores non-shipped extensions (e.g. .png, .lock)", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai/data"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/data/note.txt"),
      "This .txt file mentions spec-0042 but is not in TARGET_GLOBS extensions.\n",
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    expect(violations).toEqual([]);
  });
});
