// QFAI:AC-0001-0201-05
// QFAI:EX-0001-0201-14
// QFAI:EX-0001-0201-15
// QFAI:EX-0001-0201-16

import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, expect, it } from "vitest";

import {
  ASSISTANT_ASSET_MAX_LINE_CHARS,
  ASSISTANT_ASSET_MAX_LINES,
  countLines,
  widestMeasurableLine,
} from "../../../src/core/doctor/assetLineBudget.js";
import { runLintShipping } from "../../../scripts/lint-shipping.js";
import { removeTempTree } from "../../helpers/tempTree.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const assistant = path.join("assets", "init", ".qfai", "assistant");
const PLANS = path.join("assets", "defaults", "workflows");
const SCHEMAS = path.join("assets", "schemas", "workflow");

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

async function filesUnder(relative: string): Promise<string[]> {
  const entries = await readdir(path.join(packageRoot, relative), {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(packageRoot, path.join(entry.parentPath, entry.name)));
}

// The workflow's shipped assets: the two entry skills, the plans and the schemas.
async function workflowAssets(): Promise<string[]> {
  return [
    ...(await filesUnder(path.join(assistant, "skill", "qfai-run"))),
    ...(await filesUnder(path.join(assistant, "skill", "qfai-maintain"))),
    ...(await filesUnder(PLANS)),
    ...(await filesUnder(SCHEMAS)),
  ];
}

it("Run the asset line budget over qfai-run, qfai-maintain, the plans and the schemas", async () => {
  const files = await workflowAssets();
  const over: string[] = [];
  for (const file of files) {
    const text = await readFile(path.join(packageRoot, file), "utf8");
    const lines = countLines(text.replace(/\r?\n$/, ""));
    if (lines > ASSISTANT_ASSET_MAX_LINES) over.push(`${file}: ${lines} lines`);
    const widest = widestMeasurableLine(text);
    if (widest > ASSISTANT_ASSET_MAX_LINE_CHARS) over.push(`${file}: ${widest} characters`);
  }

  expect({
    budget: [ASSISTANT_ASSET_MAX_LINES, ASSISTANT_ASSET_MAX_LINE_CHARS],
    schemas: files.filter((file) => file.endsWith(".schema.json")).length,
    plans: files.filter((file) => file.endsWith(".yml")).length,
    over,
  }).toEqual({ budget: [800, 400], schemas: 5, plans: 5, over: [] });
});

// The post-build guard over a package that publishes only the plans and the schemas.
async function postBuildGuard(): Promise<{ status: number | null; output: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-workflow-leakage-"));
  roots.push(root);
  const manifest = { name: "workflow-assets", version: "0.0.0", files: ["assets"] };
  await writeFile(path.join(root, "package.json"), JSON.stringify(manifest));
  for (const relative of [PLANS, SCHEMAS]) {
    await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await cp(path.join(packageRoot, relative), path.join(root, relative), { recursive: true });
  }
  const script = path.join(packageRoot, "scripts", "check-no-internal-version-leakage.sh");
  const run = spawnSync("bash", [script], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, QFAI_LEAKAGE_SCAN_ROOT: root },
  });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

it("Read the five shipped schemas and the plans", async () => {
  const schemas = (await filesUnder(SCHEMAS)).sort();
  const ids: string[] = [];
  const versioned: string[] = [];
  for (const file of schemas) {
    const text = await readFile(path.join(packageRoot, file), "utf8");
    const schema: unknown = JSON.parse(text);
    const id =
      typeof schema === "object" && schema !== null ? Reflect.get(schema, "$id") : undefined;
    ids.push(`${path.basename(file)} ${String(id)}`);
    if (/schemaVersion/.test(text)) versioned.push(file);
  }
  const lint = await runLintShipping(packageRoot);
  const planLeaks = lint.violations.filter((violation) =>
    violation.file.split(path.sep).join("/").includes("defaults/workflows/"),
  );
  const guard = await postBuildGuard();

  expect({ ids, versioned, planLeaks, guard: guard.status }, guard.output).toEqual({
    ids: [
      "authorization.schema.json urn:qfai:workflow:authorization",
      "execution-context.schema.json urn:qfai:workflow:execution-context",
      "route-proposal.schema.json urn:qfai:workflow:route-proposal",
      "stage-result.schema.json urn:qfai:workflow:stage-result",
      "work-order.schema.json urn:qfai:workflow:work-order",
    ],
    versioned: [],
    planLeaks: [],
    guard: 0,
  });
});

it("Run the canonical launcher check over the shipped tree", async () => {
  const files = (await filesUnder(path.join("assets", "init"))).filter((file) =>
    /\.(md|ya?ml|json|txt)$/.test(file),
  );
  const bare: string[] = [];
  let canonical = 0;
  for (const file of files) {
    const lines = (await readFile(path.join(packageRoot, file), "utf8")).split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const match of line.matchAll(/(npx )?qfai workflow\b/g)) {
        if (match[1] === undefined) bare.push(`${file}:${index + 1}`);
        else canonical++;
      }
    });
  }

  expect({ bare, mentioned: canonical > 0 }).toEqual({ bare: [], mentioned: true });
});
