/**
 * Tests for `packages/qfai/scripts/check-markdownlint-config.mjs`.
 *
 * markdownlint-cli2 ignores a configuration entry it does not understand, so
 * the guard cases cover entries the linter itself would accept in silence.
 * Caller fixtures also exercise the installed CLI parser and lint boundaries.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { findConfigProblems } from "../../scripts/check-markdownlint-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, "../../scripts/check-markdownlint-config.mjs");

describe("check-markdownlint-config", () => {
  it("accepts a valid configuration with comments", () => {
    const text = '{\n  // why\n  "MD013": { "line_length": 1200, "tables": false }\n}\n';
    expect(findConfigProblems(text)).toEqual([]);
  });

  it("rejects an unknown rule name", () => {
    expect(findConfigProblems('{ "MD999": false }')).toContain(
      "/ must NOT have additional properties: MD999",
    );
  });

  it("rejects an option value of the wrong type", () => {
    expect(findConfigProblems('{ "MD013": { "line_length": "long" } }')).not.toEqual([]);
  });

  it("rejects a misspelt option name", () => {
    expect(findConfigProblems('{ "MD013": { "lineLength": 10 } }')).toContain(
      "/MD013 must NOT have additional properties: lineLength",
    );
  });

  it("rejects text that is not JSONC", () => {
    expect(findConfigProblems('{ "MD013": ')).toContain(
      "unparsable JSONC at offset 11: ValueExpected",
    );
  });

  it("passes on the repository's own configuration", () => {
    const child = spawnSync(process.execPath, [SCRIPT], { encoding: "utf-8" });
    expect(child.stderr).toBe("");
    expect(child.status).toBe(0);
  });
});

/** Resolve the installed CLI's declared bin without a package-manager shell shim. */
function resolveMarkdownlintCli(): string {
  const entry = createRequire(import.meta.url).resolve("markdownlint-cli2");
  const manifestPath = path.join(path.dirname(entry), "package.json");
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const bin =
    typeof manifest === "object" && manifest !== null && "bin" in manifest
      ? manifest.bin
      : undefined;
  const executable =
    typeof bin === "object" && bin !== null && "markdownlint-cli2" in bin
      ? bin["markdownlint-cli2"]
      : undefined;
  if (typeof executable !== "string") {
    throw new Error('markdownlint-cli2 declares no "markdownlint-cli2" bin in ' + manifestPath);
  }
  return path.resolve(path.dirname(manifestPath), executable);
}

async function lintMarkdown(
  markdown: string,
  files: Readonly<Record<string, string>> = {},
  args: string[] = [],
) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-markdownlint-cli-"));
  try {
    await writeFile(path.join(root, "sample.md"), markdown, "utf-8");
    for (const [name, content] of Object.entries(files)) {
      await writeFile(path.join(root, name), content, "utf-8");
    }
    const child = spawnSync(process.execPath, [resolveMarkdownlintCli(), "sample.md", ...args], {
      cwd: root,
      encoding: "utf-8",
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    if (child.error) throw child.error;
    expect(child.signal).toBeNull();
    return child;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("installed markdownlint CLI caller compatibility", () => {
  it("lints an ordinary Markdown document", async () => {
    const child = await lintMarkdown(
      "# Heading\n\nA paragraph with [example documentation](https://example.com).\n",
    );
    expect(child.status, child.stderr).toBe(0);
    expect(child.stdout).toContain("Linting: 1 file(s)");
    expect(child.stdout).toContain("Summary: 0 error(s)");
    expect(child.stderr).toBe("");
  });

  it("keeps a Markdown rule violation as a failing CLI result", async () => {
    const child = await lintMarkdown("#Heading\n");
    expect(child.status, child.stderr).toBe(1);
    expect(child.stdout).toContain("Linting: 1 file(s)");
    expect(child.stderr).toMatch(/sample\.md:1.*MD018/is);
  });

  it.each([
    { extension: "yaml", config: "default: false\nMD018: true\n" },
    { extension: "toml", config: "default = false\nMD018 = true\n" },
  ])(
    "applies an external $extension configuration to the lint result",
    async ({ extension, config }) => {
      const name = "rules." + extension;
      const files = { [name]: config };
      const args = ["--config", name];
      // This text lacks the heading required by the defaults. The external
      // configuration disables that rule while preserving the selected one.
      const valid = await lintMarkdown("An ordinary paragraph.\n", files, args);
      expect(valid.status, valid.stderr).toBe(0);
      expect(valid.stdout).toContain("Summary: 0 error(s)");
      const invalid = await lintMarkdown("#Heading\n", files, args);
      expect(invalid.status, invalid.stderr).toBe(1);
      expect(invalid.stderr).toMatch(/sample\.md:1.*MD018/is);
      expect(invalid.stderr).not.toContain("MD041");
    },
  );

  it.each([
    { format: "TOML", inline: "[MD013]\nline_length = 80" },
    { format: "YAML", inline: "MD013:\n  line_length: 80" },
  ])(
    "uses the $format CONFIGURE-FILE parser after earlier parsers reject the syntax",
    async ({ inline }) => {
      const files = {
        ".markdownlint-cli2.jsonc": JSON.stringify({
          config: { default: false, MD013: { line_length: 8 } },
        }),
      };
      const document = "# Title\n\nA paragraph longer than eight characters.\n";
      const baseline = await lintMarkdown(document, files);
      expect(baseline.status, baseline.stderr).toBe(1);
      expect(baseline.stderr).toContain("MD013");
      const configured = await lintMarkdown(
        "<!-- markdownlint-configure-file\n" + inline + "\n-->\n\n" + document,
        files,
      );
      expect(configured.status, configured.stderr).toBe(0);
      expect(configured.stdout).toContain("Linting: 1 file(s)");
      expect(configured.stdout).toContain("Summary: 0 error(s)");
      expect(configured.stderr).toBe("");
    },
  );

  it.each([
    { extension: "yaml", config: "config: [\n" },
    { extension: "toml", config: "[config\n" },
  ])(
    "rejects a malformed external $extension configuration with its CLI error",
    async ({ extension, config }) => {
      const name = "broken." + extension;
      const child = await lintMarkdown("# Heading\n", { [name]: config }, ["--config", name]);
      expect(child.status, child.stderr).toBe(2);
      expect(child.stderr).toContain("Unable to use configuration file");
      expect(child.stderr).toContain(name);
      expect(child.stdout).not.toContain("Summary: 0 error(s)");
    },
  );

  it("runs a markdown-it custom rule through the CLI's actual token parser", async () => {
    const rule = [
      "module.exports = {",
      '  names: ["bounded-blockquote"],',
      '  description: "Reports blockquotes.",',
      '  tags: ["test"],',
      '  parser: "markdownit",',
      "  function: (params, onError) => {",
      "    for (const token of params.parsers.markdownit.tokens) {",
      '      if (token.type === "blockquote_open") {',
      '        onError({ lineNumber: token.lineNumber, detail: "Blockquote is present." });',
      "      }",
      "    }",
      "  }",
      "};",
      "",
    ].join("\n");
    const files = {
      "blockquote-rule.cjs": rule,
      ".markdownlint-cli2.jsonc": JSON.stringify({
        config: { default: false, "bounded-blockquote": true },
        customRules: ["./blockquote-rule.cjs"],
      }),
    };
    const valid = await lintMarkdown("# Heading\n\nAn ordinary paragraph.\n", files);
    expect(valid.status, valid.stderr).toBe(0);
    expect(valid.stdout).toContain("Summary: 0 error(s)");
    const invalid = await lintMarkdown("# Heading\n\n> A quoted paragraph.\n", files);
    expect(invalid.status, invalid.stderr).toBe(1);
    expect(invalid.stderr).toMatch(/sample\.md:3.*bounded-blockquote/is);
    expect(invalid.stderr).toContain("Blockquote is present.");
  });
});
