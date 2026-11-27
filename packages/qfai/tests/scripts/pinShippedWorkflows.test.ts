import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, expect, it } from "vitest";

const SCRIPT = fileURLToPath(
  new URL("../../../../scripts/pin-shipped-workflows.mjs", import.meta.url),
);
const HELPER = ["packages", "qfai", "tests", "helpers", "shippedLaneCommands.ts"];
const TEMPLATES = ["packages", "qfai", "assets", "init", "root", ".github", "workflows"];
const WORKFLOWS = ["qfai-docs.yml", "qfai-tests.yml", "qfai-validate.yml"];
const INITIAL_BODY = "printf '%s\\n' original\n";
const UPDATED_BODY = "printf '%s\\n' updated\n";
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function digest(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function workflow(body: string, name = "Check docs"): string {
  const script = body
    .trimEnd()
    .split("\n")
    .map((line) => "          " + line)
    .join("\n");
  return [
    "name: Docs",
    "jobs:",
    "  inspect:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - name: " + name,
    "        run: |",
    script,
    "",
  ].join("\n");
}

function shape(name: string, body: string): string {
  return JSON.stringify({ name, run: "<body " + digest(body) + ">" });
}

function helperRows(name: string, rows: [string, string][], map: boolean): string {
  const expression = JSON.stringify(rows, null, 2);
  return (
    "export const " + name + " = " + (map ? "new Map(" + expression + ")" : expression) + ";\n"
  );
}

function originalHelper(arrayInsteadOfMap?: string): string {
  const names = WORKFLOWS.map((file): [string, string] => [file, digest(workflow(INITIAL_BODY))]);
  const workflows = WORKFLOWS.map((file): [string, string] => [
    file,
    JSON.stringify({ name: "Docs" }),
  ]);
  const jobs = WORKFLOWS.map((file): [string, string] => [
    file + "#inspect",
    JSON.stringify({ "runs-on": "ubuntu-latest" }),
  ]);
  const steps = WORKFLOWS.map((file): [string, string] => [
    file + "#inspect",
    shape("Check docs", INITIAL_BODY),
  ]);
  return [
    helperRows("ALLOWED_WORKFLOW_FILES", names, arrayInsteadOfMap !== "ALLOWED_WORKFLOW_FILES"),
    helperRows("ALLOWED_WORKFLOW_SHAPE", workflows, arrayInsteadOfMap !== "ALLOWED_WORKFLOW_SHAPE"),
    helperRows("ALLOWED_JOB_SHAPE", jobs, arrayInsteadOfMap !== "ALLOWED_JOB_SHAPE"),
    helperRows("ALLOWED_STEP_SHAPE", steps, false),
    "export const untouched = " + JSON.stringify(digest(INITIAL_BODY)) + ";\n",
  ].join("\n");
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-pin-shipped-workflows-"));
  roots.push(root);
  await mkdir(path.join(root, ...TEMPLATES), { recursive: true });
  await mkdir(path.dirname(path.join(root, ...HELPER)), { recursive: true });
  await writeFile(path.join(root, ...HELPER), originalHelper());
  await Promise.all(
    WORKFLOWS.map((file) => writeFile(path.join(root, ...TEMPLATES, file), workflow(INITIAL_BODY))),
  );
  return root;
}

function run(root: string): { status: number | null; output: string } {
  const child = spawnSync(process.execPath, [SCRIPT, "--root", root], { encoding: "utf8" });
  return { status: child.status, output: (child.stdout ?? "") + (child.stderr ?? "") };
}

it("reseals a shipped workflow and its edited run body without changing identical pins elsewhere", async () => {
  const root = await fixture();
  const changed = workflow(UPDATED_BODY);
  await writeFile(path.join(root, ...TEMPLATES, "qfai-docs.yml"), changed);

  const result = run(root);
  expect(result.status, result.output).toBe(0);
  const actual = await readFile(path.join(root, ...HELPER), "utf8");
  const expected = originalHelper()
    .replace(digest(workflow(INITIAL_BODY)), digest(changed))
    .replace("<body " + digest(INITIAL_BODY) + ">", "<body " + digest(UPDATED_BODY) + ">");
  expect(actual).toBe(expected);

  const repeated = run(root);
  expect(repeated.status, repeated.output).toBe(0);
  expect(await readFile(path.join(root, ...HELPER), "utf8")).toBe(expected);
});

it("refreshes only file bytes for a comment outside a run body", async () => {
  const root = await fixture();
  const changed = "# A workflow comment\n" + workflow(INITIAL_BODY);
  await writeFile(path.join(root, ...TEMPLATES, "qfai-tests.yml"), changed);

  const result = run(root);
  expect(result.status, result.output).toBe(0);
  const expected = originalHelper().replace(
    '"qfai-tests.yml",\n    "' + digest(workflow(INITIAL_BODY)) + '"',
    '"qfai-tests.yml",\n    "' + digest(changed) + '"',
  );
  expect(await readFile(path.join(root, ...HELPER), "utf8")).toBe(expected);
});

it("leaves all pins unchanged when a step's non-body shape changes", async () => {
  const root = await fixture();
  await writeFile(path.join(root, ...TEMPLATES, "qfai-docs.yml"), workflow(UPDATED_BODY));
  await writeFile(
    path.join(root, ...TEMPLATES, "qfai-tests.yml"),
    workflow(INITIAL_BODY, "Renamed step"),
  );

  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.output).toContain("qfai-tests.yml#inspect");
  expect(result.output).toContain(
    "Review the structural change and update the shape pin explicitly.",
  );
  expect(await readFile(path.join(root, ...HELPER), "utf8")).toBe(originalHelper());
});

it.each(["ALLOWED_WORKFLOW_FILES", "ALLOWED_WORKFLOW_SHAPE", "ALLOWED_JOB_SHAPE"])(
  "refuses array rows in place of the %s Map without changing the helper",
  async (name) => {
    const root = await fixture();
    const helper = path.join(root, ...HELPER);
    const malformed = originalHelper(name);
    await writeFile(helper, malformed);
    await writeFile(path.join(root, ...TEMPLATES, "qfai-docs.yml"), workflow(UPDATED_BODY));

    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.output).toContain("expected new Map([...]) for " + name);
    expect(await readFile(helper, "utf8")).toBe(malformed);
  },
);

it.each([
  ["name: Docs", "name: Changed docs", "qfai-tests.yml"],
  ["runs-on: ubuntu-latest", "runs-on: windows-latest", "qfai-tests.yml#inspect"],
])("names the next action when %s changes", async (before, after, pin) => {
  const root = await fixture();
  const helper = path.join(root, ...HELPER);
  await writeFile(path.join(root, ...TEMPLATES, "qfai-docs.yml"), workflow(UPDATED_BODY));
  await writeFile(
    path.join(root, ...TEMPLATES, "qfai-tests.yml"),
    workflow(INITIAL_BODY).replace(before, after),
  );

  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.output).toContain(pin + ": pinned shape changed");
  expect(result.output).toContain(
    "Review the structural change and update the shape pin explicitly.",
  );
  expect(await readFile(helper, "utf8")).toBe(originalHelper());
});

it("leaves all pins unchanged when the template directory contains an unpinned workflow", async () => {
  const root = await fixture();
  await writeFile(path.join(root, ...TEMPLATES, "qfai-docs.yml"), workflow(UPDATED_BODY));
  await writeFile(path.join(root, ...TEMPLATES, "extra.yaml"), workflow(INITIAL_BODY));

  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.output).toContain("shipped workflow file pins differ");
  expect(await readFile(path.join(root, ...HELPER), "utf8")).toBe(originalHelper());
});

it("leaves the current shipped template pins unchanged", async () => {
  const root = await fixture();
  const repo = path.resolve(path.dirname(SCRIPT), "..");
  const helper = path.join(root, ...HELPER);
  await copyFile(path.join(repo, ...HELPER), helper);
  await Promise.all(
    WORKFLOWS.map((file) =>
      copyFile(path.join(repo, ...TEMPLATES, file), path.join(root, ...TEMPLATES, file)),
    ),
  );
  const before = await readFile(helper);

  const result = run(root);

  expect(result.status, result.output).toBe(0);
  expect(result.output).toContain("unchanged");
  expect(await readFile(helper)).toEqual(before);
});
