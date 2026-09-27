/**
 * The shipped Markdown schemas and the SDD templates are one pair.
 *
 * `assets/mdschema/**` declares the shape of an SDD document;
 * `assets/init/.qfai/assistant/skill/qfai-sdd/templates/spec/**` is the
 * document an author starts from. If the two disagree, `qfai init` seeds a tree
 * that fails its own document lane on the first commit — the worst version of
 * this failure, because the adopter did nothing wrong.
 *
 * So the templates are the fixtures: every template is validated against the
 * schema that governs its path, and the manifest is checked for orphans in both
 * directions. That is what makes the schemas a contract about the templates
 * rather than a second, independent opinion about how a spec should look.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/assets -> tests -> packages/qfai -> packages -> repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCHEMA_ROOT = path.join(REPO_ROOT, "packages/qfai/assets/mdschema");
const MANIFEST = path.join(SCHEMA_ROOT, "manifest.yml");
const require_ = createRequire(import.meta.url);

/**
 * The checker's own JavaScript entry point, run through {@link process.execPath}.
 *
 * Not the `node_modules/.bin` shim. Node refuses to `spawnSync` a `.cmd` or
 * `.bat` without `shell: true`, and on Windows the shim beside the
 * extensionless name is exactly that — so spawning it there fails before the
 * checker runs, and every case below reports a schema violation that is really
 * an unspawned process. Passing `shell: true` instead would put every schema
 * and template path through a command-line parser for no gain.
 *
 * The entry point is read from the package's own `bin` field rather than
 * written out. Naming an internal file here would be the same guess as naming
 * the platform's shim: right until the package moves it, and silent when it
 * does.
 */
function resolveMdschemaCli(): string {
  const manifestPath = require_.resolve("@jackchuka/mdschema/package.json");
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const bin =
    typeof manifest === "object" && manifest !== null && "bin" in manifest
      ? manifest.bin
      : undefined;
  const entry =
    typeof bin === "string"
      ? bin
      : typeof bin === "object" && bin !== null && "mdschema" in bin
        ? bin.mdschema
        : undefined;
  if (typeof entry !== "string") {
    throw new Error(`@jackchuka/mdschema declares no "mdschema" bin entry in ${manifestPath}`);
  }
  return path.resolve(path.dirname(manifestPath), entry);
}

const MDSCHEMA_CLI = resolveMdschemaCli();

/**
 * The packaged template tree, which is also what the repository root mirrors.
 *
 * Read from `assets/` rather than from `.qfai/`: `assets/` is what ships, and
 * the mirror is verified to be byte-identical by the SSOT sync gate.
 */
const TEMPLATE_ROOT = path.join(
  REPO_ROOT,
  "packages/qfai/assets/init/.qfai/assistant/skill/qfai-sdd/templates/spec",
);

interface ManifestEntry {
  id: string;
  schema: string;
  pattern: string;
}

function readManifest(): ManifestEntry[] {
  const entries: ManifestEntry[] = [];
  let current: Partial<ManifestEntry> = {};
  const flush = (): void => {
    if (current.id !== undefined && current.schema !== undefined && current.pattern !== undefined) {
      entries.push({ id: current.id, schema: current.schema, pattern: current.pattern });
    }
    current = {};
  };
  for (const raw of readFileSync(MANIFEST, "utf-8").split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "");
    // The captures are narrowed rather than assigned straight through: a group
    // that did not participate reads as `undefined`, and under
    // `exactOptionalPropertyTypes` writing that into an optional field is not
    // the same as leaving the field out.
    const id = /^\s*-\s+id:\s*(.+?)\s*$/.exec(line)?.[1];
    if (id !== undefined) {
      flush();
      current = { id };
      continue;
    }
    const field = /^\s+(schema|pattern):\s*"?([^"\r\n]+?)"?\s*$/.exec(line);
    const value = field?.[2];
    if (value !== undefined && current.id !== undefined) {
      if (field?.[1] === "schema") {
        current.schema = value;
      } else {
        current.pattern = value;
      }
    }
  }
  flush();
  return entries;
}

/** Every `*.mdschema.yml` under the schema root, schema-root-relative. */
function schemaFiles(): string[] {
  const out: string[] = [];
  const visit = (dir: string): void => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, item.name);
      if (item.isDirectory()) visit(absolute);
      else if (item.name.endsWith(".mdschema.yml")) {
        out.push(path.relative(SCHEMA_ROOT, absolute).split(path.sep).join("/"));
      }
    }
  };
  visit(SCHEMA_ROOT);
  return out.sort();
}

/**
 * The template a schema governs, or `undefined` when the schema covers a
 * document the template tree does not seed.
 *
 * The mapping is derived from the schema's own path rather than declared: a
 * declared second mapping is a second thing to keep true, and the file names are
 * already equal by construction (`story/decisions.mdschema.yml` governs
 * `decisions.md`).
 */
function templateFor(schemaRelative: string): string | undefined {
  if (schemaRelative.startsWith("story/")) {
    const relative = schemaRelative.slice("story/".length).replace(/\.mdschema\.yml$/, ".md");
    const candidate = path.join(TEMPLATE_ROOT, relative);
    return existsSync(candidate) ? candidate : undefined;
  }
  return undefined;
}

const manifest = readManifest();
const schemas = schemaFiles();

describe("shipped Markdown schemas", () => {
  it("declares at least one document type", () => {
    // A manifest that parsed to nothing would make every check below vacuous:
    // zero entries iterate zero times and the suite reports green.
    expect(manifest.length).toBeGreaterThan(0);
    expect(schemas.length).toBeGreaterThan(0);
  });

  it("names a schema file that exists for every manifest entry", () => {
    const missing = manifest.filter((entry) => !existsSync(path.join(SCHEMA_ROOT, entry.schema)));

    expect(missing.map((entry) => `${entry.id} -> ${entry.schema}`)).toEqual([]);
  });

  it("has no schema file the manifest never references", () => {
    // An unreferenced schema is a rule nobody runs. It reads as coverage in a
    // directory listing and enforces nothing.
    const referenced = new Set(manifest.map((entry) => entry.schema));
    const orphans = schemas.filter((file) => !referenced.has(file));

    expect(orphans).toEqual([]);
  });

  it("gives every manifest entry a unique id", () => {
    const ids = manifest.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every pattern one entry", () => {
    // A document matched by two entries is held to two contracts, with the
    // loser invisible in the summary.
    const patterns = manifest.map((entry) => entry.pattern);
    const repeated = patterns.filter((pattern, index) => patterns.indexOf(pattern) !== index);

    expect(repeated).toEqual([]);
  });

  it("roots every pattern at its configured directory", () => {
    // Both roots come from adopter config. A hard-coded default would silently
    // match nothing after either tree is moved.
    const unrooted = manifest.filter(
      (entry) =>
        !entry.pattern.startsWith("{specsDir}/") && !entry.pattern.startsWith("{contractsDir}/"),
    );

    expect(unrooted.map((entry) => `${entry.id}: ${entry.pattern}`)).toEqual([]);
  });
});

describe("shipped schemas agree with the SDD templates", () => {
  it("does not ship the retired spec-pack templates", () => {
    expect(existsSync(path.join(TEMPLATE_ROOT, "..", "specs"))).toBe(false);
  });

  it("pairs every story-tree schema with a template", () => {
    const missing = schemas
      .filter((schema) => schema.startsWith("story/"))
      .filter((schema) => templateFor(schema) === undefined);

    expect(missing).toEqual([]);
  });

  it("finds the mdschema binary", () => {
    // Every case below spawns it; without this the failures read as schema
    // violations rather than as a missing devDependency.
    expect(existsSync(MDSCHEMA_CLI)).toBe(true);
  });

  it("runs the checker rather than reporting an unspawned process", () => {
    // The failure this guards against is silent: a spawn that never starts
    // returns empty output, and an empty string contains no violation text, so
    // every case below would report the template as violating its schema. This
    // one asks whether the process ran at all.
    const result = spawnSync(process.execPath, [MDSCHEMA_CLI, "--help"], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    });

    expect(result.error).toBeUndefined();
    expect(`${result.stdout ?? ""}${result.stderr ?? ""}`).not.toBe("");
  });

  for (const schemaRelative of schemaFiles()) {
    const template = templateFor(schemaRelative);
    const label = template === undefined ? "(no template)" : path.relative(REPO_ROOT, template);

    it(`${schemaRelative} validates ${label}`, () => {
      if (template === undefined) {
        // Stated rather than skipped: a schema with no seeded template is a
        // legal state (an optional document), and saying so keeps the case from
        // reading as an untested schema.
        expect(existsSync(path.join(SCHEMA_ROOT, schemaRelative))).toBe(true);
        return;
      }
      const result = spawnSync(
        process.execPath,
        [MDSCHEMA_CLI, "check", "--schema", path.join(SCHEMA_ROOT, schemaRelative), template],
        { cwd: REPO_ROOT, encoding: "utf-8" },
      );

      expect(`${result.stdout ?? ""}${result.stderr ?? ""}`.trim()).toContain("No violations");
      expect(result.status).toBe(0);
    });
  }
});

describe("a closed policy section rejects content of another kind", () => {
  /** What is inserted, into which document, after which text, and the text itself. */
  const variants: ReadonlyArray<readonly [string, string, string, string]> = [
    ["prose before the first section", "objective", "# Objective\n\n", "Overview prose.\n\n"],
    ["a list item in a table section", "objective", "## Success criteria\n\n", " - extra item\n\n"],
    ["a table in a list section", "objective", "## Non-goals\n\n", " | a | b |\n | - | - |\n\n"],
    [
      "a two-space table in a list section",
      "objective",
      "## Non-goals\n\n",
      "  | a | b |\n  | - | - |\n\n",
    ],
    ["three-space prose in a list section", "objective", "## Non-goals\n\n", "   extra prose\n\n"],
    ["a fenced block in a prose section", "initiative", "## Initiative\n\n", "```\ncode\n```\n\n"],
    ["a block quote in a prose section", "initiative", "## Initiative\n\n", "> quote\n\n"],
    ["a thematic break in a prose section", "initiative", "## Initiative\n\n", "---\n\n"],
    ["a thematic break in a list section", "objective", "## Non-goals\n\n", "- - -\n\n"],
    [
      "an HTML comment in a prose section",
      "initiative",
      "## Initiative\n\n",
      "<!-- hidden -->\n\n",
    ],
    [
      "a pipe paragraph after a table",
      "objective",
      "`<command or threshold that measures it>` |\n",
      "\n| explanatory note\n",
    ],
    [
      "an indented code block in a prose section",
      "initiative",
      "## Initiative\n\n",
      "    indented code\n\n",
    ],
  ];

  it.each(variants)("reports %s", (_label, name, anchor, inserted) => {
    const template = readFileSync(path.join(TEMPLATE_ROOT, `01_policy/${name}.md`), "utf-8");
    expect(template).toContain(anchor);
    const dir = mkdtempSync(path.join(os.tmpdir(), "qfai-mdschema-closed-"));
    try {
      const file = path.join(dir, `${name}.md`);
      writeFileSync(file, template.replace(anchor, `${anchor}${inserted}`), "utf-8");
      const schema = path.join(SCHEMA_ROOT, `story/01_policy/${name}.mdschema.yml`);
      const result = spawnSync(
        process.execPath,
        [MDSCHEMA_CLI, "check", "--schema", schema, file],
        {
          cwd: REPO_ROOT,
          encoding: "utf-8",
        },
      );

      expect(`${result.stdout ?? ""}${result.stderr ?? ""}`).toContain("[forbidden-text]");
      expect(result.status).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("a table-only section holds its template's columns and nothing above the header", () => {
  /** Every template a schema governs, named by its path below the template root. */
  const DOCUMENTS = schemas.flatMap((schema) =>
    templateFor(schema) === undefined
      ? []
      : [schema.slice("story/".length).replace(/\.mdschema\.yml$/, "")],
  );
  const DELIMITER = /^\|(?:\s*:?-+:?\s*\|)+$/;

  /** One variant per table of each template: a label, the document and its changed text. */
  function variants(change: (table: string[]) => string[]): [string, string, string][] {
    return DOCUMENTS.flatMap((name) => {
      const lines = readFileSync(path.join(TEMPLATE_ROOT, `${name}.md`), "utf-8").split(/\r?\n/);
      const headers = lines.flatMap((line, index) =>
        DELIMITER.test(lines[index + 1] ?? "") && line.startsWith("|") ? [index] : [],
      );
      return headers.map((start): [string, string, string] => {
        let end = start;
        while (lines[end]?.startsWith("|")) end++;
        const text = [
          ...lines.slice(0, start),
          ...change(lines.slice(start, end)),
          ...lines.slice(end),
        ].join("\n");
        return [`${name}.md line ${start + 1}`, name, text];
      });
    });
  }

  function check(name: string, text: string): { status: number | null; output: string } {
    const dir = mkdtempSync(path.join(os.tmpdir(), "qfai-mdschema-table-"));
    try {
      const file = path.join(dir, `${path.basename(name)}.md`);
      writeFileSync(file, text, "utf-8");
      const schema = path.join(SCHEMA_ROOT, `story/${name}.mdschema.yml`);
      const result = spawnSync(
        process.execPath,
        [MDSCHEMA_CLI, "check", "--schema", schema, file],
        { cwd: REPO_ROOT, encoding: "utf-8" },
      );
      return { status: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  const extraColumn = variants((table) =>
    table.map((line, index) => `${line} ${index === 1 ? "---" : "Extra"} |`),
  );
  const noteAbove = variants((table) => ["| explanatory note", ...table]);

  it("finds every table of every template", () => {
    expect(extraColumn.length).toBe(15);
  });

  it.each(extraColumn)("reports an added column in %s", (_label, name, text) => {
    // QFAI:EX-0001-0011-10
    const result = check(name, text);
    expect(result.output).toContain("[forbidden-text]");
    expect(result.status).not.toBe(0);
  });

  it.each(noteAbove)(
    "reports a pipe line directly above the header in %s",
    (_label, name, text) => {
      // QFAI:EX-0001-0011-11
      const result = check(name, text);
      expect(result.output).toContain("[forbidden-text]");
      expect(result.status).not.toBe(0);
    },
  );

  const aligned = variants((table) =>
    table.map((line, index) => (index === 1 ? line.replace(/ (-+) /g, ":$1:") : line)),
  );

  it.each(aligned)(
    "accepts a delimiter row carrying alignment colons in %s",
    (_label, name, text) => {
      // QFAI:EX-0001-0011-10
      expect(text).toContain("|:-");
      const result = check(name, text);
      expect(result.output).toContain("No violations");
      expect(result.status).toBe(0);
    },
  );
});

describe("the technology document holds only its three sections, each in its shape", () => {
  const TECH_TEMPLATE = path.join(TEMPLATE_ROOT, "03_contract/tech.md");
  const TECH_SCHEMA = path.join(SCHEMA_ROOT, "story/03_contract/tech.mdschema.yml");
  const PACKAGE = "- `<package>`\n  - `<what the project uses it for>`";

  function check(text: string): { status: number | null; output: string } {
    const dir = mkdtempSync(path.join(os.tmpdir(), "qfai-mdschema-tech-"));
    try {
      const file = path.join(dir, "tech.md");
      writeFileSync(file, text, "utf-8");
      const result = spawnSync(
        process.execPath,
        [MDSCHEMA_CLI, "check", "--schema", TECH_SCHEMA, file],
        { cwd: REPO_ROOT, encoding: "utf-8" },
      );
      return { status: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  /** What is replaced in the template, by what, and the finding the checker reports. */
  const rejected: ReadonlyArray<readonly [string, string, string, string]> = [
    ["a Stack table without a Runtime row", "| Runtime ", "| Engine  ", "[required-text]"],
    ["a Stack table without a Platform row", "| Platform ", "| Hosts    ", "[required-text]"],
    ["prose in Stack", "## Stack\n\n", "## Stack\n\nThe stack.\n\n", "[forbidden-text]"],
    ["a dependency with no nested reason", PACKAGE, "- `<package>`", "[forbidden-text]"],
    [
      "a dependency with its reason inline",
      PACKAGE,
      "- `<package>` for parsing",
      "[forbidden-text]",
    ],
    ["`None.` beside a package", PACKAGE, `${PACKAGE}\n- None.`, "[forbidden-text]"],
    ["a command list without Skeleton", "- Skeleton:", "- Smoke:", "[required-text]"],
    [
      "a command not in backticks",
      "- Lint: `<lint command>`",
      "- Lint: run lint",
      "[forbidden-text]",
    ],
    [
      "prose in Standard commands",
      "## Standard commands (copy-paste)\n\n",
      "## Standard commands (copy-paste)\n\nThe gate commands.\n\n",
      "[forbidden-text]",
    ],
    [
      "a Rules section",
      "## Dependencies",
      "## Rules\n\n- A rule.\n\n## Dependencies",
      "[structure]",
    ],
    [
      "a Constraints section",
      "## Dependencies",
      "## Constraints\n\n- A limit.\n\n## Dependencies",
      "[structure]",
    ],
  ];

  it.each(rejected)("reports %s", (_label, from, to, finding) => {
    const template = readFileSync(TECH_TEMPLATE, "utf-8");
    expect(template).toContain(from);
    const result = check(template.replace(from, to));
    expect(result.output).toContain(finding);
    expect(result.status).not.toBe(0);
  });

  it("accepts `- None.` and one Skeleton item per entrypoint", () => {
    const template = readFileSync(TECH_TEMPLATE, "utf-8")
      .replace(PACKAGE, "- None.")
      .replace(
        /- Skeleton: .*\n/,
        "- Skeleton: `api` -> `run api`\n- Skeleton: `cli` -> `run cli`\n",
      );
    const result = check(template);
    expect(result.output).toContain("No violations");
    expect(result.status).toBe(0);
  });
});
