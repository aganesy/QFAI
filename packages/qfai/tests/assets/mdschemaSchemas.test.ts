/**
 * The shipped Markdown schemas and the SDD templates are one pair.
 *
 * `assets/mdschema/**` declares the shape of an SDD document;
 * `assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs/**` is the
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
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/assets -> tests -> packages/qfai -> packages -> repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCHEMA_ROOT = path.join(REPO_ROOT, "packages/qfai/assets/mdschema");
const MANIFEST = path.join(SCHEMA_ROOT, "manifest.yml");
const MDSCHEMA_BIN = path.join(REPO_ROOT, "node_modules/.bin/mdschema");

/**
 * The packaged template tree, which is also what the repository root mirrors.
 *
 * Read from `assets/` rather than from `.qfai/`: `assets/` is what ships, and
 * the mirror is verified to be byte-identical by the SSOT sync gate.
 */
const TEMPLATE_ROOT = path.join(
  REPO_ROOT,
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs",
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
    const start = /^\s*-\s+id:\s*(.+?)\s*$/.exec(line);
    if (start !== null) {
      flush();
      current = { id: start[1] };
      continue;
    }
    const field = /^\s+(schema|pattern):\s*"?([^"\r\n]+?)"?\s*$/.exec(line);
    if (field !== null && current.id !== undefined) {
      if (field[1] === "schema") {
        current.schema = field[2];
      } else {
        current.pattern = field[2];
      }
    }
  }
  flush();
  return entries;
}

/** Every `*.mdschema.yml` under the schema root, schema-root-relative. */
function schemaFiles(): string[] {
  const out: string[] = [];
  for (const group of readdirSync(SCHEMA_ROOT, { withFileTypes: true })) {
    if (!group.isDirectory()) {
      continue;
    }
    for (const file of readdirSync(path.join(SCHEMA_ROOT, group.name))) {
      if (file.endsWith(".mdschema.yml")) {
        out.push(`${group.name}/${file}`);
      }
    }
  }
  return out.sort();
}

/**
 * The template a schema governs, or `undefined` when the schema covers a
 * document the template tree does not seed.
 *
 * The mapping is derived from the schema's own path rather than declared: a
 * declared second mapping is a second thing to keep true, and the file names are
 * already equal by construction (`spec/04_Business-Rules.mdschema.yml` governs
 * `spec/04_Business-Rules.md`).
 */
function templateFor(schemaRelative: string): string | undefined {
  const group = schemaRelative.startsWith("policies/") ? "_policies" : "spec";
  const base = path.basename(schemaRelative).replace(/\.mdschema\.yml$/, ".md");
  const candidate = path.join(TEMPLATE_ROOT, group, base);
  return existsSync(candidate) ? candidate : undefined;
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

  it("gives every manifest entry a unique id and a unique pattern", () => {
    // Two entries on one pattern run the same documents against two contracts,
    // and the losing one is invisible in the summary.
    const ids = manifest.map((entry) => entry.id);
    const patterns = manifest.map((entry) => entry.pattern);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it("roots every pattern at the configured specs directory", () => {
    // `{specsDir}` is what makes an adopter who relocated their specs work
    // without editing this file; a hard-coded `.qfai/specs` would silently match
    // nothing there and report a green lane over zero documents.
    const unrooted = manifest.filter((entry) => !entry.pattern.startsWith("{specsDir}/"));

    expect(unrooted.map((entry) => `${entry.id}: ${entry.pattern}`)).toEqual([]);
  });
});

describe("shipped schemas agree with the SDD templates", () => {
  it("finds the mdschema binary", () => {
    // Every case below spawns it; without this the failures read as schema
    // violations rather than as a missing devDependency.
    expect(existsSync(MDSCHEMA_BIN)).toBe(true);
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
        MDSCHEMA_BIN,
        ["check", "--schema", path.join(SCHEMA_ROOT, schemaRelative), template],
        { cwd: REPO_ROOT, encoding: "utf-8" },
      );

      expect(`${result.stdout ?? ""}${result.stderr ?? ""}`.trim()).toContain("No violations");
      expect(result.status).toBe(0);
    });
  }
});
