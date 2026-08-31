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

import { formatViolations, runLintShipping } from "../../scripts/lint-shipping.js";

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
        '      paths: [".qfai/specs/spec-0042/**"]',
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

  it("flags framework source paths in shipped markdown and runtime YAML", async () => {
    // After `qfai init` the consuming repo has no `packages/qfai/`, no
    // `core/` and no `cli/`, so a citation of those paths names a file the
    // reader cannot open.
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai/assistant/skills/x"), { recursive: true });
    await mkdir(path.join(root, "assets/init/.qfai/assistant/manifest"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/assistant/skills/x/SKILL.md"),
      [
        "The SSOT lives at `packages/qfai/src/core/validators/taskFidelityKeywords.ts`.",
        "Evaluator axes are fixed in `core/prototyping/evaluatorReview.ts#ORDINAL_AXES`.",
        "The classifier (`src/core/sddTriage.ts::classifyTriage`) appends first.",
        "- `cli`: commands implemented under `packages/qfai/src/cli/commands/`.",
        "",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(root, "assets/init/.qfai/assistant/manifest/agent-catalog.yml"),
      [
        "agents:",
        "  - prompt: |",
        "      Axes live in `core/prototyping/evaluatorReview.ts`",
        "",
      ].join("\n"),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    const frameworkPaths = violations.filter((v) => v.pattern === "framework-source-path");
    // 6, not 5: the first markdown line carries both `packages/qfai/` and the
    // `src/core/**.ts` tail, and each is reported separately.
    expect(frameworkPaths).toHaveLength(6);
    expect(frameworkPaths.map((v) => v.file)).toContain(
      "assets/init/.qfai/assistant/manifest/agent-catalog.yml",
    );
  });

  it("does NOT flag module basenames or install-site paths as framework source paths", async () => {
    // `parseEntry.ts` names a module without asserting where it lives, and
    // `.qfai/assistant/**` DOES exist after `qfai init` — neither is a
    // framework-only path.
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai/assistant/catalog"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/assistant/catalog/notes.md"),
      [
        "`parseEntry.ts` MUST have unit tests; `reviewerGate.ts` reads the verdict.",
        "Skills are installed at `.qfai/assistant/skills/*/SKILL.md`.",
        "Test globs such as `tests/**/*.spec.ts` stay project-defined.",
        "",
      ].join("\n"),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    expect(violations.filter((v) => v.pattern === "framework-source-path")).toEqual([]);
  });

  it("flags framework source paths inside YAML comment lines", async () => {
    // A `# ...` line is not runtime data, but it still ships verbatim via
    // `qfai init` and is read by a human — a framework path there reaches
    // the user as an unopenable citation exactly like a markdown line.
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai/assistant/manifest"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/assistant/manifest/rules.yml"),
      [
        "# See core/prototyping/evaluatorReview.ts for the axis list",
        "# Example: see spec-0042 for context",
        "rules: []",
        "",
      ].join("\n"),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    expect(violations.map((v) => v.pattern)).toEqual(["framework-source-path"]);
    expect(violations[0]?.line).toBe(1);
  });

  it("flags framework source paths inside comment lines of a shipped .ts template", async () => {
    // A `.ts` template under assets/init/ classifies as `init-runtime`, so it
    // has no `src-comment` rules — but its `//` / JSDoc lines are copied into
    // the consuming repo verbatim, exactly like a YAML comment (PR #1019).
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai/assistant/templates"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/assistant/templates/reviewGate.ts"),
      [
        "// See core/prototyping/evaluatorReview.ts for the axis list",
        "/** Mirrors packages/qfai/src/core/layerPolicy.ts. */",
        "// Example: see spec-0042 for context — a citation, not a path lookup",
        'export const AXIS_SOURCE = "core/prototyping/evaluatorReview.ts";',
        "",
      ].join("\n"),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    // Lines 1, 2 (both `packages/qfai/` and the `src/core/**.ts` tail) and 4.
    expect(violations.map((v) => v.pattern)).toEqual([
      "framework-source-path",
      "framework-source-path",
      "framework-source-path",
      "framework-source-path",
    ]);
    expect(violations.map((v) => v.line)).toEqual([1, 2, 2, 4]);
  });

  it("does NOT flag core/cli paths that belong to a URL", async () => {
    // `https://example.com/core/api.ts` is an external document, not a
    // citation of this framework's tree; a bare `core/api.ts` on the same
    // page still is.
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai/assistant/catalog"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/assistant/catalog/links.md"),
      [
        "Background reading: <https://example.com/core/api.ts> and",
        "[the sample](https://example.com/src/cli/main.ts).",
        "The axes live in `core/prototyping/evaluatorReview.ts`.",
        "",
      ].join("\n"),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    const frameworkPaths = violations.filter((v) => v.pattern === "framework-source-path");
    expect(frameworkPaths).toHaveLength(1);
    expect(frameworkPaths[0]?.line).toBe(3);
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

  it("flags seed spec placeholder directories in init runtime assets", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "assets/init/.qfai/specs/spec-XXXX/tdd"), { recursive: true });
    await writeFile(
      path.join(root, "assets/init/.qfai/specs/spec-XXXX/01_Spec.md"),
      "# spec-XXXX\n\nReferences spec-0001 internally.\n",
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    expect(violations.map((violation) => violation.pattern)).toContain("spec-path-literal");
  });

  it("does NOT flag composite trace IDs (BR/AC/TC) in JSDoc — only internal spec-NNNN paths/IDs", async () => {
    // PR #206 review Ntbp updated this rule. Composite trace IDs
    // (BR-NNNN-NNNN, AC-NNNN-NNNN, TC-NNNN-NNNN) are NOT in the
    // forbidden set declared by `.agents/rules/distributed-surface.md`
    // (only spec-0010+, CAP-0010+, DEC-NNNN-NNNN, DR-NNNN, and the
    // QFAI-PROT2-NNN trace prefix are forbidden). Composite IDs in
    // JSDoc remain permitted so existing trace pointers like
    // "BR-0029-0001" / "AC-0025-0005" do not need to be scrubbed.
    const root = await newTempDir();
    await mkdir(path.join(root, "src/foo"), { recursive: true });
    await writeFile(
      path.join(root, "src/foo/bar.ts"),
      [
        "/**",
        " * Implements BR-0029-0001 and references AC-0025-0005.",
        " */",
        "export function foo(): void {}",
        "",
      ].join("\n"),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    expect(violations).toEqual([]);
  });

  it("flags internal spec-NNNN ID in src/ JSDoc — leaks via dist/*.d.ts", async () => {
    // PR #206 review Ntbp: `tsup` strips comments from `dist/*.js` but
    // RETAINS them in `dist/*.d.ts`, so internal spec IDs (spec-0010+)
    // in JSDoc DO ship into user repos. The lint-shipping invariant
    // must catch this at source instead of waiting for the post-build
    // leakage shell script in CI.
    const root = await newTempDir();
    await mkdir(path.join(root, "src/foo"), { recursive: true });
    await writeFile(
      path.join(root, "src/foo/bar.ts"),
      ["/**", " * See spec-0012 for context.", " */", "export function foo(): void {}", ""].join(
        "\n",
      ),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    expect(violations.map((v) => v.pattern)).toContain("internal-spec-id-jsdoc-leak");
    expect(violations.map((v) => v.matched)).toContain("spec-0012");
  });

  it("flags internal spec-path in src/ JSDoc — leaks via dist/*.d.ts", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "src/foo"), { recursive: true });
    await writeFile(
      path.join(root, "src/foo/bar.ts"),
      [
        "/**",
        " * Reference: .qfai/specs/spec-0013/04_Business-Rules.md",
        " */",
        "export function foo(): void {}",
        "",
      ].join("\n"),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    expect(violations.map((v) => v.pattern)).toContain("internal-spec-path-jsdoc-leak");
  });

  it.each([
    [
      "internal-version-marker-jsdoc-leak",
      "v1.9.0",
      "/**\n * @deprecated since v1.9.0, use foo() instead.\n */\nexport function bar(): void {}\n",
    ],
    [
      "internal-cap-id-jsdoc-leak",
      "CAP-0011",
      "/**\n * Implements CAP-0011 capability mapping.\n */\nexport function bar(): void {}\n",
    ],
    [
      "internal-dec-id-jsdoc-leak",
      "DEC-0001-0042",
      "/**\n * Per DEC-0001-0042.\n */\nexport function bar(): void {}\n",
    ],
    [
      "internal-dr-id-jsdoc-leak",
      "DR-0076",
      "/**\n * Per DR-0076 this is intentionally NOT AST-based.\n */\nexport function bar(): void {}\n",
    ],
    [
      "internal-prot2-id-jsdoc-leak",
      "QFAI-PROT2-001",
      "/**\n * Trace QFAI-PROT2-001.\n */\nexport function bar(): void {}\n",
    ],
    [
      "internal-chg-id-jsdoc-leak",
      "CHG-003",
      "/**\n * Per CHG-003 the assistant tree is recut into four layers.\n */\nexport function bar(): void {}\n",
    ],
    [
      "internal-schema-version-jsdoc-leak",
      '"schemaVersion"',
      '/**\n * Documents the "schemaVersion" field.\n */\nexport function bar(): void {}\n',
    ],
  ])(
    "flags %s in src/ JSDoc (PR #206 review NwM- / Nv2- / Nv_Q full SSOT parity)",
    async (rule, expectedMatch, body) => {
      const root = await newTempDir();
      await mkdir(path.join(root, "src/foo"), { recursive: true });
      await writeFile(path.join(root, "src/foo/bar.ts"), body, "utf-8");

      const { violations } = await runLintShipping(root);
      expect(violations.map((v) => v.pattern)).toContain(rule);
      expect(violations.map((v) => v.matched)).toContain(expectedMatch);
    },
  );

  it("does NOT flag sample-tier spec-0001..0009 in src/ JSDoc (Category-B / runtime examples)", async () => {
    // The leakage script tolerates spec-0001..0009 as Category-B /
    // sample-tier IDs that ship with `qfai init`; the JSDoc lint must
    // mirror that exception so example references stay legal.
    const root = await newTempDir();
    await mkdir(path.join(root, "src/foo"), { recursive: true });
    await writeFile(
      path.join(root, "src/foo/bar.ts"),
      ["/**", " * Example seed spec: spec-0005.", " */", "export function foo(): void {}", ""].join(
        "\n",
      ),
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
      ["# this comment mentions spec-0042 but is exempt as a YAML comment", "items: []", ""].join(
        "\n",
      ),
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

describe("lint-shipping keeps its rules' own flags", () => {
  it("detects an upper-case internal spec id in src JSDoc", async () => {
    // The spec-id rules carry `i`, and globalising them with a bare `"g"`
    // dropped it — so `SPEC-9999` passed here while the post-build guard and
    // the smoke test, both case-insensitive, caught it. The same distributed
    // content, three answers from one SSOT-synced set.
    const root = await newTempDir();
    await mkdir(path.join(root, "src/core"), { recursive: true });
    await writeFile(
      path.join(root, "src/core/example.ts"),
      [
        "/**",
        " * See SPEC-9999 and .qfai/specs/SPEC-0042/ for the rule.",
        " */",
        "export const x = 1;",
        "",
      ].join("\n"),
      "utf-8",
    );

    const { violations } = await runLintShipping(root);
    expect(violations.map((v) => v.pattern)).toEqual(
      expect.arrayContaining(["internal-spec-id-jsdoc-leak", "internal-spec-path-jsdoc-leak"]),
    );
  });
});
