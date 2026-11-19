/**
 * Each module format a consumer loads the package through gets the declaration file of that format.
 *
 * The build writes `dist/index.d.ts` for the ES module output and `dist/index.d.cts` for the
 * CommonJS one. The package is `"type": "module"`, so TypeScript reads a `.d.ts` file as an ES
 * module. When the exports map sent both conditions to `index.d.ts`, a `.cts` consumer compiled in
 * `node16` mode got TS1471 for a `require("qfai")` that works at runtime.
 *
 * The consumer here is a temporary project whose `node_modules/qfai` links to this package, compiled
 * with the TypeScript this package builds with. It reads `dist/`, so it lives in the integration
 * slice, which builds before it runs.
 */

import { existsSync } from "node:fs";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import ts from "typescript";
import { afterEach, expect, it } from "vitest";

import { removeTempTree } from "../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(__dirname, "../..");

const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((dir) => removeTempTree(dir)));
});

/** A consumer project with one source file, and the diagnostics `node16` mode reports for it. */
async function compileConsumer(fileName: string, source: string): Promise<string[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-type-exports-"));
  temporary.push(root);
  await mkdir(path.join(root, "node_modules"), { recursive: true });
  await symlink(PACKAGE_ROOT, path.join(root, "node_modules", "qfai"), "junction");
  await writeFile(path.join(root, "package.json"), '{ "name": "consumer", "private": true }\n');
  const file = path.join(root, fileName);
  await writeFile(file, source);
  const program = ts.createProgram([file], {
    module: ts.ModuleKind.Node16,
    moduleResolution: ts.ModuleResolutionKind.Node16,
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    types: [],
  });
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
}

it("has both declaration files to resolve to", () => {
  for (const name of ["index.d.ts", "index.d.cts"]) {
    expect(
      existsSync(path.join(PACKAGE_ROOT, "dist", name)),
      `dist/${name} is missing — run \`pnpm -C packages/qfai build\` before this suite`,
    ).toBe(true);
  }
});

it("type-checks a CommonJS consumer that requires the package", async () => {
  const diagnostics = await compileConsumer(
    "consumer.cts",
    'import qfai = require("qfai");\nexport const marker: string = qfai.DESIGN_MD_SAMPLE_MARKER;\n',
  );
  expect(diagnostics).toEqual([]);
});

it("type-checks an ES module consumer that imports the package", async () => {
  const diagnostics = await compileConsumer(
    "consumer.mts",
    'import { DESIGN_MD_SAMPLE_MARKER } from "qfai";\nexport const marker: string = DESIGN_MD_SAMPLE_MARKER;\n',
  );
  expect(diagnostics).toEqual([]);
});
