/**
 * Spawn-based tests for `scripts/regen-shipped-entry.mjs`.
 *
 * The tool rewrites the independent copy of the shipped `AGENTS.md` and the digest of the
 * Copilot instructions `qfai init` writes. The cases build a small tree and a stand-in CLI that
 * writes a known Copilot file, so they move neither with the real template nor with a build.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts → tests → packages/qfai → packages → repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/regen-shipped-entry.mjs");

const COPILOT = "Generated Copilot instructions.\n";
const STALE_DIGEST = "0".repeat(64);
const FRESH_DIGEST = createHash("sha256").update(COPILOT).digest("hex");

const HELPER_REL = "packages/qfai/tests/helpers/shippedLaneCommands.ts";
const FIXTURE_REL = "packages/qfai/tests/fixtures/shipped-entry/agents.txt";

const helperSource = (digest: string): string =>
  [
    "export const ALLOWED_INIT_PATHS = new Set([",
    '  ".github/copilot-instructions.md",',
    '  ".github/workflows/qfai-docs.yml",',
    "]);",
    "export const ALLOWED_INIT_CONTENT = new Map([",
    "  [",
    "    // A comment.",
    '    ".github/copilot-instructions.md",',
    `    "${digest}",`,
    "  ],",
    "]);",
    "",
  ].join("\n");

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function write(root: string, relative: string, content: string): Promise<void> {
  const target = path.join(root, ...relative.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

/** A repository root holding the template, a stale fixture, the helper and a stand-in CLI. */
async function newRoot(helper = helperSource(STALE_DIGEST)): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-regen-entry-test-"));
  tempDirs.push(root);
  await write(root, "packages/qfai/assets/init/root/AGENTS.md", "# Template\n");
  await write(root, FIXTURE_REL, "# Old\n");
  await write(root, HELPER_REL, helper);
  await write(
    root,
    "packages/qfai/dist/cli/index.mjs",
    [
      'import { mkdirSync, writeFileSync } from "node:fs";',
      'import path from "node:path";',
      "const args = process.argv.slice(2);",
      'const dir = args[args.indexOf("--dir") + 1];',
      'mkdirSync(path.join(dir, ".github"), { recursive: true });',
      `writeFileSync(path.join(dir, ".github", "copilot-instructions.md"), ${JSON.stringify(COPILOT)});`,
      "",
    ].join("\n"),
  );
  return root;
}

function run(root: string, extra: string[] = []): { status: number | null; output: string } {
  const child = spawnSync(process.execPath, [SCRIPT, "--root", root, ...extra], {
    encoding: "utf-8",
  });
  return { status: child.status, output: `${child.stdout ?? ""}${child.stderr ?? ""}` };
}

/** Asserts that the fixture and the helper stand-in hold the bytes `newRoot` wrote. */
async function expectNothingWritten(root: string, helper: string): Promise<void> {
  expect(await readFile(path.join(root, ...FIXTURE_REL.split("/")), "utf-8")).toBe("# Old\n");
  expect(await readFile(path.join(root, ...HELPER_REL.split("/")), "utf-8")).toBe(helper);
}

describe("regen-shipped-entry", () => {
  it("copies the template to the fixture and re-pins the Copilot digest", async () => {
    const root = await newRoot();
    const result = run(root);
    expect(result.status).toBe(0);
    expect(await readFile(path.join(root, ...FIXTURE_REL.split("/")), "utf-8")).toBe(
      "# Template\n",
    );
    expect(await readFile(path.join(root, ...HELPER_REL.split("/")), "utf-8")).toBe(
      helperSource(FRESH_DIGEST),
    );
    expect(result.output).toContain(`${STALE_DIGEST} -> ${FRESH_DIGEST}`);
  });

  it("changes nothing on a second run and says so", async () => {
    const root = await newRoot();
    expect(run(root).status).toBe(0);
    const second = run(root);
    expect(second.status).toBe(0);
    expect(second.output).toMatch(/agents\.txt: unchanged/);
    expect(second.output).toMatch(/digest unchanged/);
    expect(await readFile(path.join(root, ...HELPER_REL.split("/")), "utf-8")).toBe(
      helperSource(FRESH_DIGEST),
    );
  });

  it("writes nothing when the digest line cannot be found", async () => {
    const helper = "export const ALLOWED_INIT_CONTENT = new Map([]);\n";
    const root = await newRoot(helper);
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/expected one digest after .*, found 0/);
    await expectNothingWritten(root, helper);
  });

  it("refuses two digest lines and writes nothing", async () => {
    const helper = helperSource(STALE_DIGEST) + helperSource(STALE_DIGEST);
    const root = await newRoot(helper);
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/expected one digest after .*, found 2/);
    await expectNothingWritten(root, helper);
  });

  it("names the build when the CLI does not exist", async () => {
    const root = await newRoot();
    const result = run(root, ["--cli", path.join(root, "missing.mjs")]);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/run `pnpm build`/);
    await expectNothingWritten(root, helperSource(STALE_DIGEST));
  });

  it("writes nothing when init exits non-zero", async () => {
    const root = await newRoot();
    const failing = path.join(root, "failing.mjs");
    await writeFile(failing, "process.exit(3);\n");
    const result = run(root, ["--cli", failing]);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/qfai init exited 3/);
    await expectNothingWritten(root, helperSource(STALE_DIGEST));
  });

  it("refuses an unknown option and writes nothing", async () => {
    const root = await newRoot();
    const result = run(root, ["--rot", root]);
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/unknown option --rot/);
    await expectNothingWritten(root, helperSource(STALE_DIGEST));
  });
});
