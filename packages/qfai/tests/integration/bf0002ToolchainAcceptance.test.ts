import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { assertPackagedGithubTopology } from "../../../../scripts/lib/pack-github-topology.mjs";
import { declaredIncludeGlobs, testFileCount } from "../helpers/runnerProjects.js";
import {
  acceptsRelease,
  gatePaths,
  operationJobs,
  releaseJobs,
  type ReleaseNeeds,
} from "../helpers/spec0017Release.js";
import {
  isRecord,
  jobSteps,
  matrixSlices,
  perSliceScriptEntries,
  releaseShapeSlices,
  runnerProjects,
  SLICED_JOBS,
  sorted,
  workflowJobs,
} from "../helpers/spec0017WorkflowSurfaces.js";
import { removeTempTree } from "../helpers/tempTree.js";
import {
  REPO_ROOT,
  editDeclaration,
  plantedTree,
  runLane,
} from "../scripts/helpers/hygieneTree.js";

const SETUP_ACTION = "./.github/actions/setup";
const FROZEN_INSTALL = "pnpm install --frozen-lockfile";

function readText(...segments: string[]): string {
  return readFileSync(path.join(REPO_ROOT, ...segments), "utf8");
}

function setupSteps(): Record<string, unknown>[] {
  const action: unknown = parseYaml(readText(".github", "actions", "setup", "action.yml"));
  const runs = isRecord(action) ? action["runs"] : undefined;
  const steps = isRecord(runs) ? runs["steps"] : undefined;
  if (!Array.isArray(steps)) throw new Error("the shared setup definition has no steps");
  return steps.filter(isRecord);
}

function runText(step: Record<string, unknown>): string {
  const run = step["run"];
  return typeof run === "string" ? run : "";
}

function stepInputs(step: Record<string, unknown> | undefined): Record<string, unknown> {
  const inputs = step?.["with"];
  return isRecord(inputs) ? inputs : {};
}

describe("BF-0002 toolchain and release acceptance", () => {
  // QFAI:AC-0002-0015-01
  it("defines the install preamble once and has every toolchain job consume it", () => {
    expect(readText(".github", "workflows", "ci.yml")).not.toContain("frozen-lockfile");

    const steps = setupSteps();
    expect(steps).toHaveLength(4);
    const [shim, node, reshim, install] = steps;
    expect(runText(shim ?? {})).toContain("corepack enable");
    expect(node?.["uses"]).toEqual(expect.stringMatching(/^actions\/setup-node@[0-9a-f]{40}$/u));
    expect(stepInputs(node)["cache"]).toBe("pnpm");
    expect(stepInputs(node)["cache-dependency-path"]).toBe("pnpm-lock.yaml");
    expect(runText(reshim ?? {})).toContain("corepack prepare --activate");
    expect(runText(install ?? {})).toContain(FROZEN_INSTALL);
    expect(steps.filter((step) => runText(step).includes(FROZEN_INSTALL))).toHaveLength(1);

    const consumers = Object.keys(workflowJobs("ci.yml")).filter((id) =>
      jobSteps("ci.yml", id).some((step) => step["uses"] === SETUP_ACTION),
    );
    expect(consumers.length).toBeGreaterThan(1);
    for (const id of consumers) {
      for (const step of jobSteps("ci.yml", id)) {
        const uses = typeof step["uses"] === "string" ? step["uses"] : "";
        expect(uses, id).not.toContain("setup-node");
        expect(runText(step), id).not.toContain("corepack enable");
        expect(runText(step), id).not.toContain("pnpm install");
      }
    }
  });

  // QFAI:AC-0002-0015-02
  it("reads the Node version from a file here and keeps the shared definition out of the shipped tree", async () => {
    const [, node] = setupSteps();
    expect(String(stepInputs(node)["node-version-file"])).toContain("package.json");
    const literal = /^\d/u;
    for (const step of setupSteps()) {
      const version = stepInputs(step)["node-version"];
      expect(typeof version === "string" && literal.test(version)).toBe(false);
    }
    for (const workflow of ["ci.yml", "release.yml"]) {
      for (const [id, job] of Object.entries(workflowJobs(workflow))) {
        const steps = Array.isArray(job["steps"]) ? job["steps"].filter(isRecord) : [];
        for (const step of steps) {
          const version = stepInputs(step)["node-version"];
          expect(typeof version === "string" && literal.test(version), `${workflow} ${id}`).toBe(
            false,
          );
        }
      }
    }
    const ci: unknown = parseYaml(readText(".github", "workflows", "ci.yml"));
    expect(isRecord(ci) ? ci["env"] : undefined).toBeUndefined();
    const release: unknown = parseYaml(readText(".github", "workflows", "release.yml"));
    const releaseEnv = isRecord(release) && isRecord(release["env"]) ? release["env"] : {};
    expect(Object.keys(releaseEnv).filter((name) => /node/iu.test(name))).toEqual(["NODE_PUBLISH"]);

    const shipped = path.join(REPO_ROOT, "packages", "qfai", "assets", "init", "root", ".github");
    const copyRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0002-actions-"));
    try {
      expect(() => assertPackagedGithubTopology(shipped)).not.toThrow();
      const copy = path.join(copyRoot, ".github");
      await cp(shipped, copy, { recursive: true });
      await mkdir(path.join(copy, "actions"));
      expect(() => assertPackagedGithubTopology(copy)).toThrow(
        "assets/init/root/.github/actions must not exist (only workflows/ is permitted).",
      );
    } finally {
      await removeTempTree(copyRoot);
    }
  });

  // QFAI:AC-0002-0016-04
  it("skips the report upload on cancellation, tolerates a missing report and keeps it at most a week", () => {
    const uploads = Object.keys(workflowJobs("ci.yml")).flatMap((id) =>
      jobSteps("ci.yml", id).filter(
        (step) =>
          typeof step["uses"] === "string" && step["uses"].startsWith("actions/upload-artifact@"),
      ),
    );
    expect(uploads.length).toBeGreaterThan(0);
    for (const upload of uploads) {
      const condition = String(upload["if"]);
      expect(condition).toContain("!cancelled()");
      expect(condition).not.toContain("always()");
      const inputs = stepInputs(upload);
      expect(inputs["if-no-files-found"]).toBe("warn");
      const retention = inputs["retention-days"];
      expect(typeof retention === "number" && retention <= 7).toBe(true);
    }
  });

  // QFAI:AC-0002-0017-02
  it("refuses publication unless verify, the gate and every gate of the selected shape succeeded", () => {
    const conditionOf = (id: string): string => {
      const condition = releaseJobs()[id]?.["if"];
      if (typeof condition !== "string") throw new Error(`${id} has no release condition`);
      return condition;
    };
    const githubRelease = conditionOf("github-release");
    const publish = conditionOf("publish");
    const gates = ["gate-tests", "gate-floor", "gate-floor-whole", ...operationJobs] as const;

    for (const { shape, checks } of gatePaths) {
      const selected = new Set<string>([
        shape === "sliced" ? "gate-tests" : "gate-floor-whole",
        ...(shape === "sliced" ? ["gate-floor"] : []),
        ...(checks === "operations" ? operationJobs : []),
      ]);
      const outputs = { "suite-shape": shape, "checks-shape": checks };
      const accepted = (): ReleaseNeeds => ({
        verify: { result: "success", outputs },
        gate: { result: "success" },
        ...Object.fromEntries(
          gates.map((name) => [name, { result: selected.has(name) ? "success" : "skipped" }]),
        ),
      });

      for (const condition of [githubRelease, publish]) {
        expect(acceptsRelease(condition, accepted(), "push"), `${shape}/${checks}`).toBe(true);
        for (const required of ["verify", "gate", ...selected]) {
          for (const state of [undefined, "failure", "cancelled", "skipped"]) {
            const needs = accepted();
            needs[required] = {
              ...needs[required],
              result: state,
            };
            expect(
              acceptsRelease(condition, needs, "push"),
              `${shape}/${checks}: ${required} ${String(state)}`,
            ).toBe(false);
          }
        }
        expect(acceptsRelease(condition, accepted(), "push", true), "cancelled run").toBe(false);
        for (const unknown of ["", "unknown"]) {
          const needs = accepted();
          needs["verify"] = { result: "success", outputs: { ...outputs, "suite-shape": unknown } };
          expect(acceptsRelease(condition, needs, "push"), `suite shape ${unknown}`).toBe(false);
        }
      }

      // The GitHub Release is push-only; npm publication also accepts a manual dispatch.
      expect(acceptsRelease(githubRelease, accepted(), "workflow_dispatch")).toBe(false);
      expect(acceptsRelease(publish, accepted(), "workflow_dispatch")).toBe(true);
    }
  });

  // QFAI:AC-0002-0019-02
  it("resolves one slice name on every surface, matches files for every project and has no pr-fix or pr-merge leg", () => {
    const projects = sorted(runnerProjects());
    expect(projects).toHaveLength(7);
    expect(sorted(perSliceScriptEntries().map((entry) => entry.slice))).toEqual(projects);
    expect(sorted(releaseShapeSlices())).toEqual(projects);
    for (const { workflow, job } of SLICED_JOBS) {
      expect(sorted(matrixSlices(workflow, job)), `${workflow}#${job}`).toEqual(projects);
    }

    const globs = declaredIncludeGlobs();
    for (const project of projects) {
      const matched = globs
        .filter((entry) => entry.project === project)
        .reduce((total, entry) => total + testFileCount(entry.glob), 0);
      expect(matched, `project ${project} matches no test file`).toBeGreaterThan(0);
    }

    const manifest: unknown = JSON.parse(readText("packages", "qfai", "package.json"));
    const scripts = isRecord(manifest) && isRecord(manifest["scripts"]) ? manifest["scripts"] : {};
    const surfaces = [
      ...projects,
      ...Object.keys(scripts),
      ...SLICED_JOBS.flatMap(({ workflow, job }) => matrixSlices(workflow, job)),
      ...releaseShapeSlices(),
    ];
    expect(surfaces.filter((name) => /\bpr-(?:fix|merge)\b/u.test(name))).toEqual([]);
  });
});

const CATCHUP = "scripts/branch-catchup.mjs";
const CATCHUP_OUTPUTS = [
  ".github/pinned-bytes.txt",
  ".github/required-status-contexts.json",
  ".github/workflows/ci.yml",
  ".github/lifecycle-manifests.txt",
] as const;
const PIN_PATHS = ["scripts/check-toolchain-action.sh", "scripts/example.mjs"] as const;
const WORKFLOW_INPUTS = [
  PIN_PATHS[0],
  CATCHUP_OUTPUTS[0],
  CATCHUP_OUTPUTS[3],
  ".github/command-files.txt",
];
type CatchupFixture = {
  sandbox: string;
  root: string;
  seed: string;
  origin: string;
  base: string;
  topic: string;
};
type CommandRun = { status: number; output: string; stdout: string };

function nativeGit(cwd: string, args: string[], allowed = [0]): CommandRun {
  const result = spawnSync("git", ["-c", "core.fsmonitor=false", ...args], {
    cwd,
    encoding: "utf-8",
  });
  const run = {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    output: (result.stdout ?? "") + (result.stderr ?? ""),
  };
  expect(allowed, run.output).toContain(run.status);
  return run;
}

async function put(root: string, relative: string, text: string): Promise<void> {
  const absolute = path.join(root, relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, text, "utf-8");
}

function declarationText(hex: string, spaces = 2): string {
  return (
    JSON.stringify(
      {
        $comment: [
          "common first",
          ...Array.from({ length: 12 }, (_, index) => "first padding " + index),
          "common middle",
          ...Array.from({ length: 12 }, (_, index) => "last padding " + index),
          "common last",
        ],
        contexts: [
          {
            workflow: "ci.yml",
            job: "ci-pass",
            dependencies: ["detect", "lint"],
            verificationSet: ["Verify fixture"],
            pinnedBytes: Object.fromEntries(
              PIN_PATHS.map((relative) => [relative, hex.repeat(64)]),
            ),
            verificationBodies: { "Verify fixture": hex.repeat(16) },
          },
        ],
      },
      null,
      spaces,
    ) + "\n"
  );
}

function pinText(hex: string): string {
  const padding = Array.from({ length: 12 }, (_, index) => "# padding " + index + "\n").join("");
  return (
    "# common first\n" +
    padding +
    "# common middle\n" +
    padding +
    PIN_PATHS.map((relative) => hex.repeat(64) + "  " + relative + "\n").join("") +
    padding +
    "# common last\n"
  );
}

function workflowText(hex: string): string {
  const padding = Array.from({ length: 12 }, (_, index) => "# padding " + index + "\n").join("");
  return (
    "name: CI\n# common first\n" +
    padding +
    "# common middle\n" +
    padding +
    "jobs:\n  lint:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Verify fixture\n        run: |\n          sha256sum -c --quiet <<'PINNED_INPUTS'\n" +
    WORKFLOW_INPUTS.map((relative) => "          " + hex.repeat(64) + "  " + relative + "\n").join(
      "",
    ) +
    "          PINNED_INPUTS\n          echo verified\n" +
    padding +
    "# common last\n"
  );
}

function writerProgram(kind: "guard" | "verification"): string {
  return `import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),kind=${JSON.stringify(kind)};
const files=${JSON.stringify(CATCHUP_OUTPUTS)};
const config=JSON.parse(fs.readFileSync(path.join(root,'.git/fixture-writer.json'),'utf8'));
const git=(args)=>spawnSync('git',args,{cwd:root,encoding:'utf8'}).stdout.trim();
fs.appendFileSync(path.join(root,'.git/writers.jsonl'),JSON.stringify({kind,head:git(['rev-parse','HEAD']),merge:git(['rev-parse','--verify','MERGE_HEAD']),staged:git(['diff','--cached','--name-only']),before:Object.fromEntries(files.map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')]))})+'\\n');
if(kind==='guard'){
  for(const file of files){
    const p=path.join(root,file);
    fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/\\b[0-9a-f]{64}\\b/g,'d'.repeat(64)));
    if(config.fail===kind)process.exit(7);
  }
}else{
  const p=path.join(root,files[1]);
  fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/"[0-9a-f]{16}"/g,'"'+'d'.repeat(16)+'"'));
  if(config.fail===kind)process.exit(8);
}
if(config.unexpected===kind)fs.writeFileSync(path.join(root,config.foreign||'foreign.txt'),'writer-owned unexpected bytes\\n');
`;
}

async function withCatchup(run: (fixture: CatchupFixture) => Promise<void>): Promise<void> {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), "qfai-branch-catchup-"));
  const origin = path.join(sandbox, "origin.git");
  const seed = path.join(sandbox, "seed");
  const root = path.join(sandbox, "current checkout");
  try {
    await mkdir(seed);
    nativeGit(sandbox, ["init", "--bare", "--initial-branch=trunk", origin]);
    nativeGit(seed, ["init", "--initial-branch=trunk"]);
    for (const [key, value] of [
      ["user.name", "Fixture"],
      ["user.email", "fixture@example.invalid"],
      ["commit.gpgsign", "false"],
      ["core.autocrlf", "false"],
      ["core.hooksPath", path.join(sandbox, "no-hooks")],
    ])
      nativeGit(seed, ["config", key, value]);
    await put(seed, ".gitignore", "node_modules/\n");
    await put(seed, "package.json", '{"name":"fixture","private":true,"type":"module"}\n');
    await put(seed, "semantic.txt", "base semantic bytes\n");
    await put(seed, CATCHUP_OUTPUTS[0], pinText("d"));
    await put(seed, CATCHUP_OUTPUTS[1], declarationText("d"));
    await put(seed, CATCHUP_OUTPUTS[2], workflowText("d"));
    await put(seed, CATCHUP_OUTPUTS[3], `# manifests\n${"d".repeat(64)}  package.json\n`);
    await put(seed, ".github/command-files.txt", "# command files\n");
    await put(seed, PIN_PATHS[0] ?? "", "#!/bin/sh\nexit 0\n");
    await put(seed, PIN_PATHS[1] ?? "", "export {};\n");
    await cp(path.join(REPO_ROOT, "scripts/lib"), path.join(seed, "scripts/lib"), {
      recursive: true,
    });
    // The fixture invokes the repository helper without supplying a replacement.
    if (existsSync(path.join(REPO_ROOT, CATCHUP)))
      await cp(path.join(REPO_ROOT, CATCHUP), path.join(seed, CATCHUP));
    await put(seed, "scripts/pin-guard-bytes.mjs", writerProgram("guard"));
    await put(seed, "scripts/pin-verification-bodies.mjs", writerProgram("verification"));
    nativeGit(seed, ["add", "--all"]);
    nativeGit(seed, ["commit", "-qm", "Base"]);
    const base = nativeGit(seed, ["rev-parse", "HEAD"]).stdout.trim();
    nativeGit(seed, ["switch", "-c", "topic"]);
    await put(seed, "semantic.txt", "topic semantic bytes\n");
    nativeGit(seed, ["add", "semantic.txt"]);
    nativeGit(seed, ["commit", "-qm", "Topic"]);
    const topic = nativeGit(seed, ["rev-parse", "HEAD"]).stdout.trim();
    nativeGit(seed, ["remote", "add", "origin", origin]);
    nativeGit(seed, ["push", "-q", "origin", "trunk", "topic"]);
    nativeGit(sandbox, ["clone", "-q", "--branch", "topic", origin, root]);
    for (const [key, value] of [
      ["user.name", "Fixture"],
      ["user.email", "fixture@example.invalid"],
      ["commit.gpgsign", "false"],
      ["core.autocrlf", "false"],
      ["core.hooksPath", path.join(sandbox, "no-hooks")],
    ])
      nativeGit(root, ["config", key, value]);
    for (const relative of ["node_modules/prettier", "packages/qfai/node_modules/yaml"]) {
      await put(root, `${relative}/package.json`, '{"main":"index.cjs"}\n');
      await put(root, `${relative}/index.cjs`, "module.exports={};\n");
    }
    await put(root, ".git/fixture-writer.json", "{}\n");
    nativeGit(seed, ["switch", "trunk"]);
    await run({ sandbox, origin, seed, root, base, topic });
  } finally {
    await removeTempTree(sandbox);
  }
}

async function commitChanges(root: string, files: Record<string, string>): Promise<string> {
  for (const [relative, text] of Object.entries(files)) await put(root, relative, text);
  nativeGit(root, ["add", "--all"]);
  nativeGit(root, ["commit", "-qm", "Fixture change"]);
  return nativeGit(root, ["rev-parse", "HEAD"]).stdout.trim();
}

async function advanceOrigin(
  fixture: CatchupFixture,
  files: Record<string, string>,
): Promise<string> {
  const sha = await commitChanges(fixture.seed, files);
  nativeGit(fixture.seed, ["push", "-q", "origin", "trunk"]);
  return sha;
}

function fixtureState(root: string): {
  head: string;
  index: string;
  conflicts: string;
  status: string;
  files: string[];
  operation: string;
  fetched: string;
} {
  return {
    head: nativeGit(root, ["rev-parse", "HEAD"]).stdout.trim(),
    index: nativeGit(root, ["ls-files", "--stage", "-z"]).stdout,
    conflicts: nativeGit(root, ["ls-files", "--unmerged", "-z"]).stdout,
    status: nativeGit(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]).stdout,
    files: CATCHUP_OUTPUTS.map((relative) => readFileSync(path.join(root, relative), "utf-8")),
    operation: [
      "MERGE_HEAD",
      "CHERRY_PICK_HEAD",
      "REVERT_HEAD",
      "rebase-merge/head-name",
      "rebase-apply/head-name",
    ]
      .map((relative) =>
        existsSync(path.join(root, ".git", relative))
          ? readFileSync(path.join(root, ".git", relative), "utf-8")
          : "",
      )
      .join("\0"),
    fetched: existsSync(path.join(root, ".git/FETCH_HEAD"))
      ? readFileSync(path.join(root, ".git/FETCH_HEAD"), "utf-8")
      : "",
  };
}

type Mutation = "head" | "index" | "conflict" | "bytes";
type Boundary =
  | "resolution-1"
  | "resolution-2"
  | "resolution-3"
  | "guard"
  | "verification"
  | "stage"
  | "commit"
  | "push";

/** Logs actual helper commands and can change real Git state before an observation. */
async function catchupPreload(
  fixture: CatchupFixture,
  injection?: { boundary: Boundary; mutation: Mutation; resolutions: number },
): Promise<string> {
  const filename = path.join(fixture.root, ".git/catchup-observer.mjs");
  await writeFile(
    filename,
    `import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import {syncBuiltinESMExports} from 'node:module';
const root=${JSON.stringify(fixture.root)},base=${JSON.stringify(fixture.base)},config=${JSON.stringify(injection ?? null)};
const active=path.resolve(process.argv[1]||'')===path.join(root,'scripts/branch-catchup.mjs');
const spawn=cp.spawnSync,write=fs.writeFileSync;
let boundary='initial',observations=0,resolved=0,injected=false;
const nativeGit=(args,input)=>{const r=spawn('git',args,{cwd:root,encoding:'utf8',input});if(r.status!==0)throw new Error(r.stderr);return r.stdout.trim();};
const inject=()=>{
  injected=true;
  if(config.mutation==='head')nativeGit(['update-ref','refs/heads/topic',base]);
  if(config.mutation==='index'){const blob=nativeGit(['hash-object','-w','--stdin'],'concurrent index\\n');nativeGit(['update-index','--add','--cacheinfo','100644',blob,'concurrent.txt']);}
  if(config.mutation==='conflict'){const blob=nativeGit(['hash-object','-w','--stdin'],'concurrent conflict\\n');nativeGit(['update-index','--index-info'],'100644 '+blob+' 1\\tobserver-conflict.txt\\n100644 '+blob+' 2\\tobserver-conflict.txt\\n100644 '+blob+' 3\\tobserver-conflict.txt\\n');}
  if(config.mutation==='bytes')fs.appendFileSync(path.join(root,'.github/lifecycle-manifests.txt'),'# concurrent bytes\\n');
  write(path.join(root,'.git/injected.json'),JSON.stringify(config));
};
cp.spawnSync=(program,args,options)=>{
  if(!active)return spawn(program,args,options);
  if(program==='git'&&args.join(' ')==='rev-parse --verify HEAD'){
    observations+=1;
    if(config&&!injected&&boundary===config.boundary&&observations===2)inject();
  }
  fs.appendFileSync(path.join(root,'.git/commands.jsonl'),JSON.stringify({program,args})+'\\n');
  const result=spawn(program,args,options);
  if(program==='git'&&args[0]==='merge'){boundary=config&&config.resolutions>0?'resolution-1':'guard';observations=0;}
  if(program===process.execPath&&String(args[0]).endsWith('pin-guard-bytes.mjs')){boundary='verification';observations=0;}
  if(program===process.execPath&&String(args[0]).endsWith('pin-verification-bodies.mjs')){boundary='stage';observations=0;}
  if(program==='git'&&args[0]==='add'){boundary='commit';observations=0;}
  if(program==='git'&&args[0]==='commit'){boundary='push';observations=0;}
  return result;
};
fs.writeFileSync=(file,...args)=>{
  const result=write(file,...args);
  if(active&&${JSON.stringify(CATCHUP_OUTPUTS.slice(0, 3))}.some(relative=>path.resolve(String(file))===path.join(root,relative))){resolved+=1;boundary=config&&resolved<config.resolutions?'resolution-'+(resolved+1):'guard';observations=0;}
  return result;
};
syncBuiltinESMExports();
`,
    "utf-8",
  );
  return filename;
}

function invokeCatchup(fixture: CatchupFixture, args: string[] = [], preload?: string): CommandRun {
  const nodeOptions = [
    process.env.NODE_OPTIONS ?? "",
    ...(preload === undefined ? [] : ["--import", pathToFileURL(preload).href]),
  ]
    .filter(Boolean)
    .join(" ");
  const result = spawnSync(process.execPath, [path.join(fixture.root, CATCHUP), ...args], {
    cwd: fixture.root,
    env: { ...process.env, NODE_OPTIONS: nodeOptions },
    encoding: "utf-8",
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    output: (result.stdout ?? "") + (result.stderr ?? ""),
  };
}

function writerRecords(
  root: string,
): { kind: string; head: string; merge: string; staged: string; before: Record<string, string> }[] {
  const filename = path.join(root, ".git/writers.jsonl");
  return existsSync(filename)
    ? readFileSync(filename, "utf-8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line))
    : [];
}

function commandRecords(root: string): { program: string; args: string[] }[] {
  const filename = path.join(root, ".git/commands.jsonl");
  return existsSync(filename)
    ? readFileSync(filename, "utf-8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line))
    : [];
}

async function digestConflict(
  fixture: CatchupFixture,
  theirs: Record<string, string> = {},
): Promise<string> {
  await commitChanges(fixture.root, {
    [CATCHUP_OUTPUTS[0]]: pinText("a"),
    [CATCHUP_OUTPUTS[1]]: declarationText("a"),
    [CATCHUP_OUTPUTS[2]]: workflowText("a"),
  });
  return advanceOrigin(fixture, {
    [CATCHUP_OUTPUTS[0]]: pinText("b"),
    [CATCHUP_OUTPUTS[1]]: declarationText("b"),
    [CATCHUP_OUTPUTS[2]]: workflowText("b"),
    ...theirs,
  });
}

async function expectedPending(
  fixture: CatchupFixture,
): Promise<{ files: string[]; conflicts: string; other: Record<string, string> }> {
  const control = path.join(fixture.sandbox, "control");
  nativeGit(fixture.sandbox, ["clone", "-q", "--branch", "topic", fixture.origin, control]);
  // The fixture's topic may contain local commits not published to origin.
  nativeGit(control, ["fetch", "-q", fixture.root, "topic"]);
  nativeGit(control, ["reset", "--hard", "FETCH_HEAD"]);
  nativeGit(control, ["config", "user.name", "Fixture"]);
  nativeGit(control, ["config", "user.email", "fixture@example.invalid"]);
  const tip = nativeGit(fixture.seed, ["rev-parse", "trunk"]).stdout.trim();
  nativeGit(control, ["merge", "--no-commit", "--no-ff", tip], [1]);
  const conflicts = nativeGit(control, ["ls-files", "--unmerged", "-z"]).stdout;
  const names = [
    ...new Set(
      conflicts
        .split("\0")
        .filter(Boolean)
        .map((record) => record.slice(record.indexOf("\t") + 1)),
    ),
  ];
  return {
    files: CATCHUP_OUTPUTS.map((relative) => readFileSync(path.join(control, relative), "utf-8")),
    conflicts,
    other: Object.fromEntries(
      names.map((relative) => [relative, readFileSync(path.join(control, relative), "utf-8")]),
    ),
  };
}

async function expectRejectedConflict(fixture: CatchupFixture): Promise<void> {
  const expected = await expectedPending(fixture);
  const head = nativeGit(fixture.root, ["rev-parse", "HEAD"]).stdout.trim();
  const run = invokeCatchup(fixture, [], await catchupPreload(fixture));
  expect(run.status, run.output).toBe(1);
  expect(run.output).toMatch(/conflict|canonical|digest|membership|manual|pinned/i);
  expect(nativeGit(fixture.root, ["rev-parse", "HEAD"]).stdout.trim()).toBe(head);
  expect(nativeGit(fixture.root, ["rev-parse", "--verify", "MERGE_HEAD"]).status).toBe(0);
  expect(
    CATCHUP_OUTPUTS.map((relative) => readFileSync(path.join(fixture.root, relative), "utf-8")),
  ).toEqual(expected.files);
  expect(nativeGit(fixture.root, ["ls-files", "--unmerged", "-z"]).stdout).toBe(expected.conflicts);
  for (const [relative, bytes] of Object.entries(expected.other))
    expect(readFileSync(path.join(fixture.root, relative), "utf-8")).toBe(bytes);
  expect(writerRecords(fixture.root)).toEqual([]);
  expect(
    commandRecords(fixture.root).filter(
      ({ program, args }) =>
        program === "git" && ["add", "commit", "push", "reset", "rebase"].includes(args[0] ?? ""),
    ),
  ).toEqual([]);
}

async function expectPreflightRefusal(
  fixture: CatchupFixture,
  reason: RegExp,
  args: string[] = [],
): Promise<void> {
  const before = fixtureState(fixture.root);
  const run = invokeCatchup(fixture, args, await catchupPreload(fixture));
  expect(run.status, run.output).toBe(1);
  expect(run.output).toMatch(reason);
  expect(fixtureState(fixture.root)).toEqual(before);
  expect(writerRecords(fixture.root)).toEqual([]);
  expect(
    commandRecords(fixture.root).filter(
      ({ program, args: commandArgs }) =>
        program !== "git" ||
        [
          "fetch",
          "merge",
          "rebase",
          "switch",
          "checkout",
          "add",
          "commit",
          "push",
          "reset",
        ].includes(commandArgs[0] ?? ""),
    ),
  ).toEqual([]);
}

describe("branch catch-up acceptance", () => {
  // QFAI:AC-0002-0025-01
  // QFAI:AC-0002-0025-02
  // QFAI:AC-0002-0025-04
  // QFAI:AC-0002-0025-05
  // QFAI:EX-0002-0025-01
  // QFAI:EX-0002-0025-07
  // QFAI:EX-0002-0025-17
  // QFAI:EX-0002-0025-20
  it("merges the live origin default, reseals in order and commits all staged changes without pushing", async () => {
    await withCatchup(async (fixture) => {
      const defaultTip = await advanceOrigin(fixture, {
        "upstream.txt": "default semantic bytes\n",
      });
      const run = invokeCatchup(fixture, [], await catchupPreload(fixture));
      expect(run.status, run.output).toBe(0);
      const head = nativeGit(fixture.root, ["rev-parse", "HEAD"]).stdout.trim();
      expect(
        nativeGit(fixture.root, ["rev-list", "--parents", "-n", "1", "HEAD"])
          .stdout.trim()
          .split(" "),
      ).toEqual([head, fixture.topic, defaultTip]);
      expect(nativeGit(fixture.root, ["show", "HEAD:upstream.txt"]).stdout).toBe(
        "default semantic bytes\n",
      );
      expect(nativeGit(fixture.root, ["show", "HEAD:semantic.txt"]).stdout).toBe(
        "topic semantic bytes\n",
      );
      expect(nativeGit(fixture.root, ["status", "--porcelain"]).stdout).toBe("");
      const writers = writerRecords(fixture.root);
      expect(writers.map(({ kind }) => kind)).toEqual(["guard", "verification"]);
      expect(writers[0]).toMatchObject({ head: fixture.topic, merge: defaultTip });
      expect(writers[0]?.staged.split("\n")).toContain("upstream.txt");
      const commands = commandRecords(fixture.root);
      expect(
        commands.find(({ program, args }) => program === "git" && args[0] === "merge")?.args,
      ).toEqual(["merge", "--no-commit", "--no-ff", defaultTip]);
      expect(
        commands.find(({ program, args }) => program === "git" && args[0] === "add")?.args,
      ).toEqual(["add", "--", ...CATCHUP_OUTPUTS]);
      expect(
        commands
          .filter(({ program }) => program !== "git")
          .map(({ program, args }) => [
            program,
            path
              .relative(fixture.root, args[0] ?? "")
              .split(path.sep)
              .join("/"),
          ]),
      ).toEqual([
        [process.execPath, "scripts/pin-guard-bytes.mjs"],
        [process.execPath, "scripts/pin-verification-bodies.mjs"],
      ]);
      expect(
        commands.some(({ args }) =>
          ["push", "rebase", "reset", "switch", "checkout"].includes(args[0] ?? ""),
        ),
      ).toBe(false);
      expect(
        nativeGit(fixture.sandbox, [
          "--git-dir",
          fixture.origin,
          "rev-parse",
          "refs/heads/topic",
        ]).stdout.trim(),
      ).toBe(fixture.topic);
      expect(run.stdout).not.toMatch(
        /tests?\s+(?:passed|executed)|CI\s+(?:passed|completed)|waited\s+for\s+CI/i,
      );
    });
  });

  // QFAI:AC-0002-0025-02
  // QFAI:EX-0002-0025-08
  it("creates no empty commit or writer work when the default tip is already included", async () => {
    await withCatchup(async (fixture) => {
      const run = invokeCatchup(fixture, [], await catchupPreload(fixture));
      expect(run.status, run.output).toBe(0);
      expect(nativeGit(fixture.root, ["rev-parse", "HEAD"]).stdout.trim()).toBe(fixture.topic);
      expect(writerRecords(fixture.root)).toEqual([]);
      expect(
        commandRecords(fixture.root).some(({ args }) => ["commit", "push"].includes(args[0] ?? "")),
      ).toBe(false);
    });
  });

  // QFAI:AC-0002-0025-01
  // QFAI:EX-0002-0025-02
  it.each(["detached", "default"] as const)("refuses a %s checkout before fetch", async (kind) => {
    await withCatchup(async (fixture) => {
      await advanceOrigin(fixture, { "upstream.txt": "new default bytes\n" });
      nativeGit(fixture.root, kind === "detached" ? ["switch", "--detach"] : ["switch", "trunk"]);
      await expectPreflightRefusal(fixture, /attached|default branch/i);
    });
  });

  // QFAI:AC-0002-0025-01
  // QFAI:EX-0002-0025-03
  it.each(["modified", "staged", "untracked", "merge", "rebase", "cherry-pick", "revert"] as const)(
    "preserves a %s state during preflight refusal",
    async (kind) => {
      await withCatchup(async (fixture) => {
        const defaultTip = await advanceOrigin(fixture, {
          "semantic.txt": "default semantic bytes\n",
        });
        if (kind === "modified" || kind === "staged") {
          await put(fixture.root, "semantic.txt", "operator's unfinished bytes\n");
          if (kind === "staged") nativeGit(fixture.root, ["add", "semantic.txt"]);
        } else if (kind === "untracked")
          await put(fixture.root, "unfinished.txt", "operator's unfinished bytes\n");
        else {
          nativeGit(fixture.root, ["fetch", "-q", "origin", "trunk"]);
          if (kind === "merge")
            nativeGit(fixture.root, ["merge", "--no-commit", "--no-ff", defaultTip], [1]);
          if (kind === "rebase") nativeGit(fixture.root, ["rebase", defaultTip], [1]);
          if (kind === "cherry-pick") nativeGit(fixture.root, ["cherry-pick", defaultTip], [1]);
          if (kind === "revert") {
            await commitChanges(fixture.root, { "semantic.txt": "later semantic bytes\n" });
            nativeGit(fixture.root, ["revert", "--no-edit", fixture.topic], [1]);
          }
        }
        const semantic = readFileSync(path.join(fixture.root, "semantic.txt"), "utf-8");
        await expectPreflightRefusal(fixture, /clean|ongoing|operation|untracked|staged|worktree/i);
        expect(readFileSync(path.join(fixture.root, "semantic.txt"), "utf-8")).toBe(semantic);
      });
    },
  );

  // QFAI:AC-0002-0025-01
  // QFAI:EX-0002-0025-04
  it.each(["missing", "other remote", "different branch"] as const)(
    "does not invent or change a %s upstream",
    async (kind) => {
      await withCatchup(async (fixture) => {
        await advanceOrigin(fixture, { "upstream.txt": "new default bytes\n" });
        if (kind === "missing")
          nativeGit(fixture.root, ["config", "--unset", "branch.topic.remote"]);
        if (kind === "other remote") {
          nativeGit(fixture.root, ["remote", "add", "mirror", fixture.origin]);
          nativeGit(fixture.root, ["config", "branch.topic.remote", "mirror"]);
        }
        if (kind === "different branch")
          nativeGit(fixture.root, ["config", "branch.topic.merge", "refs/heads/trunk"]);
        const config = readFileSync(path.join(fixture.root, ".git/config"), "utf-8");
        await expectPreflightRefusal(fixture, /upstream|same branch|origin/i);
        expect(readFileSync(path.join(fixture.root, ".git/config"), "utf-8")).toBe(config);
      });
    },
  );

  // QFAI:AC-0002-0025-01
  // QFAI:EX-0002-0025-05
  it.each(["absent dependencies", "borrowed dependencies", "unresolved origin HEAD"] as const)(
    "reports %s without fallback or mutation",
    async (kind) => {
      await withCatchup(async (fixture) => {
        await advanceOrigin(fixture, { "upstream.txt": "new default bytes\n" });
        if (kind === "absent dependencies")
          await rm(path.join(fixture.root, "node_modules"), { recursive: true });
        if (kind === "borrowed dependencies") {
          const borrowed = path.join(fixture.sandbox, "borrowed-yaml");
          await put(borrowed, "package.json", '{"main":"index.cjs"}\n');
          await put(borrowed, "index.cjs", "module.exports={};\n");
          const yaml = path.join(fixture.root, "packages/qfai/node_modules/yaml");
          await rm(yaml, { recursive: true });
          await symlink(borrowed, yaml, process.platform === "win32" ? "junction" : "dir");
        }
        if (kind === "unresolved origin HEAD")
          nativeGit(fixture.sandbox, [
            "--git-dir",
            fixture.origin,
            "symbolic-ref",
            "HEAD",
            "refs/heads/missing",
          ]);
        await expectPreflightRefusal(
          fixture,
          /dependencies|outside this checkout|origin.*HEAD|default/i,
        );
      });
    },
  );

  // QFAI:AC-0002-0025-01
  // QFAI:EX-0002-0025-06
  it.each(["--force", "--help", "--root"])(
    "rejects unknown option %s before fetch",
    async (option) => {
      await withCatchup(async (fixture) => {
        await advanceOrigin(fixture, { "upstream.txt": "new default bytes\n" });
        await expectPreflightRefusal(fixture, /usage|option|--push/i, [option]);
      });
    },
  );

  // QFAI:AC-0002-0025-03
  // QFAI:EX-0002-0025-09
  // QFAI:EX-0002-0025-10
  // QFAI:EX-0002-0025-11
  // QFAI:EX-0002-0025-12
  it("resolves all three digest-only conflicts and preserves common bytes from both branches", async () => {
    await withCatchup(async (fixture) => {
      const first = (text: string): string => text.replace("common first", "topic first");
      const last = (text: string): string => text.replace("common last", "default last");
      await commitChanges(fixture.root, {
        [CATCHUP_OUTPUTS[0]]: first(pinText("a")),
        [CATCHUP_OUTPUTS[1]]: first(declarationText("a")),
        [CATCHUP_OUTPUTS[2]]: first(workflowText("a")),
      });
      await advanceOrigin(fixture, {
        [CATCHUP_OUTPUTS[0]]: last(pinText("b")),
        [CATCHUP_OUTPUTS[1]]: last(declarationText("b")),
        [CATCHUP_OUTPUTS[2]]: last(workflowText("b")),
      });
      const run = invokeCatchup(fixture);
      expect(run.status, run.output).toBe(0);
      const before = writerRecords(fixture.root)[0]?.before;
      expect(before).toBeDefined();
      for (const relative of CATCHUP_OUTPUTS.slice(0, 3)) {
        expect(before?.[relative]).toContain("topic first");
        expect(before?.[relative]).toContain("default last");
        expect(before?.[relative]).not.toMatch(/^(?:<<<<<<<|=======|>>>>>>>)/m);
        const final = await readFile(path.join(fixture.root, relative), "utf-8");
        expect(final).toContain("topic first");
        expect(final).toContain("default last");
      }
      expect(nativeGit(fixture.root, ["ls-files", "--unmerged"]).stdout).toBe("");
    });
  });

  // QFAI:AC-0002-0025-03
  // QFAI:EX-0002-0025-12
  // QFAI:EX-0002-0025-13
  it.each([
    ["added member", pinText("b") + "b".repeat(64) + "  scripts/extra.mjs\n"],
    ["removed member", pinText("b").replace("b".repeat(64) + "  " + PIN_PATHS[1] + "\n", "")],
    [
      "reordered members",
      pinText("b")
        .replace(PIN_PATHS[0] ?? "", "TEMP")
        .replace(PIN_PATHS[1] ?? "", PIN_PATHS[0] ?? "")
        .replace("TEMP", PIN_PATHS[1] ?? ""),
    ],
    ["changed comment", pinText("b").replace("common middle", "semantic comment")],
    ["uppercase digest", pinText("b").replace("b".repeat(64), "B".repeat(64))],
    ["short digest", pinText("b").replace("b".repeat(64), "b".repeat(63))],
  ])("preserves every conflict when a pinned list has %s", async (kind, unsafe) => {
    await withCatchup(async (fixture) => {
      await digestConflict(fixture, { [CATCHUP_OUTPUTS[0]]: unsafe });
      if (kind === "changed comment")
        await commitChanges(fixture.root, {
          [CATCHUP_OUTPUTS[0]]: pinText("a").replace("common middle", "topic comment"),
        });
      await expectRejectedConflict(fixture);
    });
  });

  // QFAI:AC-0002-0025-03
  // QFAI:EX-0002-0025-14
  it("accepts declaration formatter whitespace without changing its meaning", async () => {
    await withCatchup(async (fixture) => {
      await digestConflict(fixture, { [CATCHUP_OUTPUTS[1]]: declarationText("b", 4) });
      const run = invokeCatchup(fixture);
      expect(run.status, run.output).toBe(0);
      const final: unknown = JSON.parse(
        await readFile(path.join(fixture.root, CATCHUP_OUTPUTS[1]), "utf-8"),
      );
      expect(final).toEqual(JSON.parse(declarationText("d")));
    });
  });

  // QFAI:AC-0002-0025-03
  // QFAI:EX-0002-0025-12
  // QFAI:EX-0002-0025-14
  it.each([
    [
      "duplicate key",
      declarationText("b").replace('"job": "ci-pass",', '"job": "ci-pass", "job": "ci-pass",'),
    ],
    ["noncanonical string encoding", declarationText("b").replace('"ci.yml"', '"ci\\u002eyml"')],
    ["changed context", declarationText("b").replace('"ci-pass"', '"different-pass"')],
    ["changed requirement", declarationText("b").replace('"detect"', '"different-required-job"')],
    [
      "added map key",
      declarationText("b").replace(
        '"scripts/example.mjs":',
        '"scripts/extra.mjs": "' + "b".repeat(64) + '", "scripts/example.mjs":',
      ),
    ],
    [
      "unknown digest field",
      declarationText("b").replace(
        '"job": "ci-pass",',
        '"job": "ci-pass", "unknownDigest": "' + "b".repeat(64) + '",',
      ),
    ],
    ["wrong pinned digest", declarationText("b").replace("b".repeat(64), "b".repeat(63))],
    [
      "wrong body digest",
      declarationText("b").replace('"' + "b".repeat(16) + '"', '"' + "b".repeat(17) + '"'),
    ],
    [
      "reordered map membership",
      declarationText("b").replace(
        '"' +
          PIN_PATHS[0] +
          '": "' +
          "b".repeat(64) +
          '",\n        "' +
          PIN_PATHS[1] +
          '": "' +
          "b".repeat(64) +
          '"',
        '"' +
          PIN_PATHS[1] +
          '": "' +
          "b".repeat(64) +
          '",\n        "' +
          PIN_PATHS[0] +
          '": "' +
          "b".repeat(64) +
          '"',
      ),
    ],
  ])("rejects a declaration with %s before resolving any file", async (_kind, unsafe) => {
    await withCatchup(async (fixture) => {
      await digestConflict(fixture, { [CATCHUP_OUTPUTS[1]]: unsafe });
      await expectRejectedConflict(fixture);
    });
  });

  // QFAI:AC-0002-0025-03
  // QFAI:EX-0002-0025-14
  it("rejects a noncanonical numeric encoding even when both parsed values are equal", async () => {
    await withCatchup(async (fixture) => {
      await commitChanges(fixture.root, {
        [CATCHUP_OUTPUTS[1]]: declarationText("a").replace(
          '"job": "ci-pass",',
          '"job": "ci-pass", "weight": 1,',
        ),
      });
      await advanceOrigin(fixture, {
        [CATCHUP_OUTPUTS[1]]: declarationText("b").replace(
          '"job": "ci-pass",',
          '"job": "ci-pass", "weight": 1.0,',
        ),
      });
      await expectRejectedConflict(fixture);
    });
  });

  // QFAI:AC-0002-0025-03
  // QFAI:EX-0002-0025-15
  it.each([
    [
      "missing target",
      workflowText("b").replace(
        "          " + "b".repeat(64) + "  .github/command-files.txt\n",
        "",
      ),
    ],
    [
      "extra target",
      workflowText("b").replace(
        "          PINNED_INPUTS\n",
        "          " + "b".repeat(64) + "  scripts/extra.mjs\n          PINNED_INPUTS\n",
      ),
    ],
  ])("rejects a workflow with a %s", async (_kind, unsafe) => {
    await withCatchup(async (fixture) => {
      await digestConflict(fixture, { [CATCHUP_OUTPUTS[2]]: unsafe });
      await expectRejectedConflict(fixture);
    });
  });

  // QFAI:AC-0002-0025-03
  // QFAI:EX-0002-0025-15
  it.each(["command", "job condition", "foreign digest"] as const)(
    "does not classify a conflicting %s as a safe hash",
    async (kind) => {
      await withCatchup(async (fixture) => {
        const change = (hex: string): string => {
          const original = workflowText(hex);
          if (kind === "command")
            return original.replace("echo verified", "echo " + (hex === "a" ? "topic" : "default"));
          if (kind === "job condition")
            return original.replace(
              "    runs-on:",
              "    if: " + (hex === "a" ? "success()" : "always()") + "\n    runs-on:",
            );
          return original.replace("echo verified", "echo " + hex.repeat(64));
        };
        await commitChanges(fixture.root, { [CATCHUP_OUTPUTS[2]]: change("a") });
        await advanceOrigin(fixture, { [CATCHUP_OUTPUTS[2]]: change("b") });
        await expectRejectedConflict(fixture);
      });
    },
  );

  // QFAI:AC-0002-0025-03
  // QFAI:EX-0002-0025-16
  it("retains a semantic-file conflict alongside eligible digest conflicts", async () => {
    await withCatchup(async (fixture) => {
      await digestConflict(fixture, { "semantic.txt": "default semantic bytes\n" });
      await expectRejectedConflict(fixture);
      expect(await readFile(path.join(fixture.root, "semantic.txt"), "utf-8")).toContain("<<<<<<<");
    });
  });

  // QFAI:AC-0002-0025-04
  // QFAI:EX-0002-0025-18
  it.each(["guard", "verification"] as const)(
    "keeps a partial %s writer failure visible without committing",
    async (fail) => {
      await withCatchup(async (fixture) => {
        await advanceOrigin(fixture, {
          "upstream.txt": "default semantic bytes\n",
          [CATCHUP_OUTPUTS[0]]: pinText("a"),
          [CATCHUP_OUTPUTS[1]]: declarationText("a"),
        });
        await put(fixture.root, ".git/fixture-writer.json", JSON.stringify({ fail }));
        const run = invokeCatchup(fixture, [], await catchupPreload(fixture));
        expect(run.status, run.output).toBe(1);
        expect(run.output).toContain(
          fail === "guard" ? "pin-guard-bytes" : "pin-verification-bodies",
        );
        expect(writerRecords(fixture.root).map(({ kind }) => kind)).toEqual(
          fail === "guard" ? ["guard"] : ["guard", "verification"],
        );
        expect(nativeGit(fixture.root, ["rev-parse", "HEAD"]).stdout.trim()).toBe(fixture.topic);
        expect(nativeGit(fixture.root, ["rev-parse", "--verify", "MERGE_HEAD"]).status).toBe(0);
        expect(await readFile(path.join(fixture.root, CATCHUP_OUTPUTS[0]), "utf-8")).toBe(
          pinText("d"),
        );
        expect(await readFile(path.join(fixture.root, CATCHUP_OUTPUTS[1]), "utf-8")).toContain(
          '"' + (fail === "guard" ? "a" : "d").repeat(16) + '"',
        );
        expect(nativeGit(fixture.root, ["diff", "--name-only"]).stdout).not.toBe("");
        expect(
          commandRecords(fixture.root).some(({ args }) =>
            ["commit", "push", "reset", "rebase"].includes(args[0] ?? ""),
          ),
        ).toBe(false);
      });
    },
  );

  // QFAI:AC-0002-0025-04
  // QFAI:EX-0002-0025-19
  it.each(["semantic.txt", "foreign.txt"])(
    "retains an unexpected writer output at %s and stops publication",
    async (foreign) => {
      await withCatchup(async (fixture) => {
        await advanceOrigin(fixture, { "upstream.txt": "default semantic bytes\n" });
        await put(
          fixture.root,
          ".git/fixture-writer.json",
          JSON.stringify({ unexpected: "guard", foreign }),
        );
        const run = invokeCatchup(fixture, ["--push"], await catchupPreload(fixture));
        expect(run.status, run.output).toBe(1);
        expect(run.output).toMatch(/unexpected|outside|changed/i);
        expect(await readFile(path.join(fixture.root, foreign), "utf-8")).toBe(
          "writer-owned unexpected bytes\n",
        );
        expect(nativeGit(fixture.root, ["rev-parse", "HEAD"]).stdout.trim()).toBe(fixture.topic);
        expect(nativeGit(fixture.root, ["rev-parse", "--verify", "MERGE_HEAD"]).status).toBe(0);
        expect(writerRecords(fixture.root).map(({ kind }) => kind)).toEqual(["guard"]);
        expect(
          commandRecords(fixture.root).some(({ args }) =>
            ["commit", "push", "reset"].includes(args[0] ?? ""),
          ),
        ).toBe(false);
      });
    },
  );

  // QFAI:AC-0002-0025-04
  // QFAI:EX-0002-0025-19
  it("retains the real runtime hash and required-gate negative checks", async () => {
    const tree = plantedTree(() => {});
    try {
      const pinned = path.join(tree, ".github/pinned-bytes.txt");
      const original = await readFile(pinned, "utf-8");
      const corrupted = original.replace(/[0-9a-f]{64}/, "0".repeat(64));
      expect(corrupted).not.toBe(original);
      await writeFile(pinned, corrupted, "utf-8");
      const hash = spawnSync(
        "bash",
        [path.join(REPO_ROOT, "scripts/check-toolchain-action.sh"), tree],
        { cwd: tree, encoding: "utf-8" },
      );
      expect(hash.status, (hash.stdout ?? "") + (hash.stderr ?? "")).toBe(1);
      expect((hash.stdout ?? "") + (hash.stderr ?? "")).toMatch(
        /digest|FAILED|sha256|mismatch|pinned/i,
      );
      await writeFile(pinned, original, "utf-8");
      editDeclaration(tree, (declaration) => {
        const context = declaration.contexts.find(({ job }) => job === "ci-pass");
        if (context === undefined) throw new Error("Fixture needs the aggregate context.");
        expect(context.dependencies).toContain("test");
        context.dependencies = context.dependencies?.filter((dependency) => dependency !== "test");
      });
      const gate = runLane(tree);
      expect(gate.exitCode, gate.output).toBe(1);
      expect(gate.output).toMatch(/depend|require|test/i);
    } finally {
      await removeTempTree(tree);
    }
  });

  // QFAI:AC-0002-0025-05
  // QFAI:EX-0002-0025-21
  it("pushes only the completed current HEAD to the same origin branch", async () => {
    await withCatchup(async (fixture) => {
      await advanceOrigin(fixture, { "upstream.txt": "default semantic bytes\n" });
      const run = invokeCatchup(fixture, ["--push"], await catchupPreload(fixture));
      expect(run.status, run.output).toBe(0);
      const head = nativeGit(fixture.root, ["rev-parse", "HEAD"]).stdout.trim();
      expect(
        nativeGit(fixture.sandbox, [
          "--git-dir",
          fixture.origin,
          "rev-parse",
          "refs/heads/topic",
        ]).stdout.trim(),
      ).toBe(head);
      expect(
        commandRecords(fixture.root)
          .filter(({ args }) => args[0] === "push")
          .map(({ args }) => args),
      ).toEqual([["push", "origin", "HEAD:refs/heads/topic"]]);
    });
  });

  // QFAI:AC-0002-0025-05
  // QFAI:EX-0002-0025-22
  it("preserves a completed commit after push failure and retries without an empty commit", async () => {
    await withCatchup(async (fixture) => {
      await advanceOrigin(fixture, { "upstream.txt": "default semantic bytes\n" });
      const hook = path.join(fixture.origin, "hooks/pre-receive");
      await writeFile(hook, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
      const first = invokeCatchup(fixture, ["--push"]);
      expect(first.status, first.output).toBe(1);
      expect(first.output).toContain("pnpm branch:catchup --push");
      const completed = nativeGit(fixture.root, ["rev-parse", "HEAD"]).stdout.trim();
      expect(completed).not.toBe(fixture.topic);
      expect(
        nativeGit(fixture.root, ["rev-parse", "--verify", "--quiet", "MERGE_HEAD"], [1]).status,
      ).toBe(1);
      expect(
        nativeGit(fixture.sandbox, [
          "--git-dir",
          fixture.origin,
          "rev-parse",
          "refs/heads/topic",
        ]).stdout.trim(),
      ).toBe(fixture.topic);
      await rm(hook);
      const local = invokeCatchup(fixture);
      expect(local.status, local.output).toBe(0);
      expect(nativeGit(fixture.root, ["rev-parse", "HEAD"]).stdout.trim()).toBe(completed);
      expect(
        nativeGit(fixture.sandbox, [
          "--git-dir",
          fixture.origin,
          "rev-parse",
          "refs/heads/topic",
        ]).stdout.trim(),
      ).toBe(fixture.topic);
      const retry = invokeCatchup(fixture, ["--push"]);
      expect(retry.status, retry.output).toBe(0);
      expect(nativeGit(fixture.root, ["rev-parse", "HEAD"]).stdout.trim()).toBe(completed);
      expect(
        nativeGit(fixture.sandbox, [
          "--git-dir",
          fixture.origin,
          "rev-parse",
          "refs/heads/topic",
        ]).stdout.trim(),
      ).toBe(completed);
    });
  });

  // QFAI:AC-0002-0025-06
  // QFAI:EX-0002-0025-23
  it.each(
    (
      [
        "resolution-1",
        "resolution-2",
        "resolution-3",
        "guard",
        "verification",
        "stage",
        "commit",
        "push",
      ] as const
    ).flatMap((boundary) =>
      (["head", "index", "conflict", "bytes"] as const).map((mutation) => ({ boundary, mutation })),
    ),
  )("stops after observing $mutation change before $boundary", async ({ boundary, mutation }) => {
    await withCatchup(async (fixture) => {
      await digestConflict(fixture);
      const preload = await catchupPreload(fixture, { boundary, mutation, resolutions: 3 });
      const run = invokeCatchup(fixture, ["--push"], preload);
      expect(existsSync(path.join(fixture.root, ".git/injected.json")), run.output).toBe(true);
      expect(run.status, run.output).toBe(1);
      expect(run.output).toMatch(/changed|observation|unexpected|conflict|pending/i);
      if (mutation === "head")
        expect(nativeGit(fixture.root, ["rev-parse", "HEAD"]).stdout.trim()).toBe(fixture.base);
      if (mutation === "index")
        expect(nativeGit(fixture.root, ["show", ":concurrent.txt"]).stdout).toBe(
          "concurrent index\n",
        );
      if (mutation === "conflict")
        expect(
          nativeGit(fixture.root, ["ls-files", "--unmerged", "--", "observer-conflict.txt"])
            .stdout.split("\n")
            .filter(Boolean),
        ).toHaveLength(3);
      if (mutation === "bytes")
        expect(await readFile(path.join(fixture.root, CATCHUP_OUTPUTS[3]), "utf-8")).toContain(
          "# concurrent bytes\n",
        );
      const commands = commandRecords(fixture.root);
      expect(commands.filter(({ args }) => args[0] === "push")).toEqual([]);
      expect(
        commands.filter(({ args }) =>
          ["reset", "rebase", "checkout", "switch"].includes(args[0] ?? ""),
        ),
      ).toEqual([]);
      expect(commands.filter(({ args }) => args[0] === "add")).toHaveLength(
        boundary === "commit" || boundary === "push" ? 1 : 0,
      );
      expect(commands.filter(({ args }) => args[0] === "commit")).toHaveLength(
        boundary === "push" ? 1 : 0,
      );
      expect(writerRecords(fixture.root).map(({ kind }) => kind)).toEqual(
        boundary.startsWith("resolution") || boundary === "guard"
          ? []
          : boundary === "verification"
            ? ["guard"]
            : ["guard", "verification"],
      );
      expect(
        nativeGit(
          fixture.root,
          ["rev-parse", "--verify", "--quiet", "MERGE_HEAD"],
          boundary === "push" ? [1] : [0],
        ).status,
      ).toBe(boundary === "push" ? 1 : 0);
    });
  });
});
