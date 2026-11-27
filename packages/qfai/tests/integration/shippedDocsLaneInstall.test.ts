/**
 * Integration: the delivered document lane installs its checkers outside the project's dependency
 * tree (spec-0002)
 *
 * The lane installs the schema checker, Mermaid and the DOM Mermaid runs under after the project's own
 * package manager has installed its dependencies. npm cannot read a node_modules that pnpm laid out, so
 * an install into that tree stops with an internal error and neither document check ever runs. The
 * checkers therefore go into a directory of their own, and the checker scripts are told where it is.
 *
 * The schema checker is the version the selected QFAI depends on: the one the project's own
 * `node_modules/qfai/package.json` declares, or, without one, the one the QFAI installed beside the
 * tools brings. The lane installs it into the tools directory either way, so its platform binary
 * arrives under the lane's own `--include=optional` whatever the project's install omitted.
 *
 * Every assertion reads the tree `runInit` writes into a temporary directory, never `assets/init/**`.
 * The install step is executed under bash with `npm` replaced by a function that records its arguments,
 * so what is asserted is what the delivered step asks npm to do, in a project laid out the way pnpm
 * lays one out.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { runInit } from "../helpers/legacyInit.js";
import { collectJobSteps, findWorkflowJob } from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

/** Bash is absent on some Windows images; the cases that execute the step are skipped there, not passed. */
const HAS_BASH = spawnSync("bash", ["--version"], { encoding: "utf-8" }).error === undefined;

const MDSCHEMA_VERSION: string = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
).dependencies["@jackchuka/mdschema"];
const TOOLS_DIR = "tmp/qfai-docs-tools";
/**
 * The checker version the staged project's QFAI declares. Not this package's own, so a lane that
 * installed a version written into the workflow could not pass by coincidence.
 */
const DECLARED = "9.8.7";
const YARN_RESOLVED = "6.5.4";
const INSTALL_STEP = "Install the document-shape and diagram checkers";

let initPromise: Promise<string> | undefined;

/** The initialised project, built once for the whole file. */
function initialised(): Promise<string> {
  initPromise ??= (async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-int-docs-install-"));
    await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
    return dir;
  })();
  return initPromise;
}

afterAll(async () => {
  if (initPromise === undefined) return;
  await removeTempTree(await initPromise);
});

/** The steps of the delivered `checks` job, in order. */
async function checkSteps(): Promise<Array<Record<string, unknown>>> {
  const file = path.join(await initialised(), ".github", "workflows", "qfai-docs.yml");
  const job = findWorkflowJob(parseYaml(await readFile(file, "utf-8")), "checks");
  if (job === undefined) throw new Error("the delivered docs workflow has no checks job");
  return collectJobSteps(job);
}

async function runBody(name: string): Promise<string> {
  const step = (await checkSteps()).find((candidate) => candidate["name"] === name);
  const body = step?.["run"];
  if (typeof body !== "string") throw new Error(`no run step named ${name}`);
  return body;
}

type Recorded = {
  status: number | null;
  stderr: string;
  calls: string[][];
  toolsManifest: unknown;
};

/**
 * Runs the install step in a project laid out as pnpm lays one out, with `npm` recording its arguments.
 * Each call is one line of the log: its arguments, joined by a tab. The stub also
 * copies the tools manifest as it exists when npm starts.
 */
async function runInstall(
  withQfai: boolean,
  declared: unknown = DECLARED,
  yarnResolved?: string,
): Promise<Recorded> {
  const body = await runBody(INSTALL_STEP);
  const stage = await mkdtemp(path.join(os.tmpdir(), "qfai-int-docs-install-run-"));
  try {
    await mkdir(path.join(stage, "node_modules", ".pnpm"), { recursive: true });
    await writeFile(path.join(stage, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf-8");
    if (yarnResolved !== undefined) {
      await writeFile(path.join(stage, ".pnp.cjs"), "", "utf-8");
      await writeFile(path.join(stage, "yarn.lock"), "", "utf-8");
    }
    if (withQfai) {
      const qfai = path.join(stage, "node_modules", "qfai");
      await mkdir(qfai, { recursive: true });
      // `null` stands for a QFAI that declares no checker at all.
      const dependencies = declared === null ? {} : { "@jackchuka/mdschema": declared };
      const manifest = { name: "qfai", dependencies };
      await writeFile(path.join(qfai, "package.json"), JSON.stringify(manifest), "utf-8");
    }
    const log = path.join(stage, "npm-calls.log");
    const seenManifest = path.join(stage, "seen-manifest.json");
    const script = path.join(stage, "step.sh");
    const prelude = `
yarn() { printf '%s' "$YARN_RESOLVED"; }
npm() {
  local IFS=$'\\t'
  printf '%s\\n' "$*" >> "$NPM_LOG"
  if [ -f "${TOOLS_DIR}/package.json" ]; then
    cp "${TOOLS_DIR}/package.json" "$SEEN_MANIFEST"
  fi
}
`;
    await writeFile(script, `${prelude}${body}`, "utf-8");
    await writeFile(log, "", "utf-8");
    const child = spawnSync("bash", ["-e", "-o", "pipefail", script], {
      cwd: stage,
      encoding: "utf-8",
      env: {
        ...process.env,
        NPM_LOG: log,
        SEEN_MANIFEST: seenManifest,
        YARN_RESOLVED: yarnResolved ?? "",
      },
    });
    if (child.error !== undefined) throw child.error;
    const lines = (await readFile(log, "utf-8")).split(/\r?\n/).filter((line) => line !== "");
    return {
      status: child.status,
      stderr: child.stderr ?? "",
      calls: lines.map((line) => line.split("\t")),
      toolsManifest: existsSync(seenManifest)
        ? JSON.parse(await readFile(seenManifest, "utf-8"))
        : undefined,
    };
  } finally {
    await removeTempTree(stage);
  }
}

describe("the delivered document lane installs its checkers outside the project's dependency tree", () => {
  // QFAI:AC-0002-0003-04
  // QFAI:EX-0002-0003-07
  it.skipIf(!HAS_BASH).each([
    ["has QFAI in node_modules", true, undefined],
    ["resolves QFAI through Yarn Plug'n'Play", false, YARN_RESOLVED],
    ["does not depend on QFAI", false, undefined],
  ])("installs into its own prefix when the project %s", async (_name, withQfai, yarnResolved) => {
    const run = await runInstall(withQfai, DECLARED, yarnResolved);

    expect(run.status, run.stderr).toBe(0);
    // One install, so the checkers and QFAI land together rather than the second install pruning
    // what the first one added.
    expect(run.calls).toHaveLength(1);
    const [call = []] = run.calls;
    expect(call[0]).toBe("install");
    expect(call).toContain(`--prefix=${TOOLS_DIR}`);
    expect(call).toContain("--no-save");
    expect(call).toContain("--registry=https://registry.npmjs.org/");
    expect(call).toContain("--ignore-scripts");
    expect(call).toContain("--include=optional");
    const packages = call.filter((argument) => !argument.startsWith("-") && argument !== "install");
    // The schema checker is the version the selected QFAI depends on, so its schemas and their
    // checker stay one release. With a QFAI of its own the project's copy declares it; without one
    // the project gets the newest QFAI, and the checker comes with it.
    expect(packages).toEqual(
      withQfai
        ? [`@jackchuka/mdschema@${DECLARED}`, "mermaid@11.17.2", "jsdom@29.1.1"]
        : ["mermaid@11.17.2", "jsdom@29.1.1", yarnResolved ? `qfai@${yarnResolved}` : "qfai"],
    );
    expect(run.toolsManifest).toEqual({
      private: true,
      overrides: { "mermaid@11.17.2": { katex: "0.18.2" } },
    });
  });

  // QFAI:EX-0002-0003-07
  it.skipIf(!HAS_BASH).each([
    ["declares no checker", null],
    ["declares a range", "^0.15.7"],
    ["declares a version followed by an argument", "0.15.7 left-pad"],
    ["declares a version with a leading zero", "00.15.7"],
  ])("stops before installing when the project's QFAI %s", async (_name, declared) => {
    const run = await runInstall(true, declared);

    expect(run.status).not.toBe(0);
    expect(run.calls).toEqual([]);
    expect(run.stderr).toContain("node_modules/qfai/package.json");
  });

  // QFAI:EX-0002-0003-07
  // QFAI:EX-0002-0003-09
  it("gives every install the prefix and the no-scripts flag", async () => {
    const body = await runBody(INSTALL_STEP);
    const installs = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("npm install"));

    expect(installs.length).toBeGreaterThan(0);
    for (const line of installs) {
      expect(line).toContain(`--prefix=${TOOLS_DIR}`);
      expect(line).toContain("--ignore-scripts");
      expect(line).toContain("--include=optional");
    }
  });

  // QFAI:EX-0002-0003-09
  it("says what the checker's install script is for, and does not call it required", async () => {
    // The comment wraps, so join its lines before looking for a phrase.
    const comment = (await runBody(INSTALL_STEP)).replace(/\s*\n\s*#\s*/g, " ");

    expect(comment).toContain("platform binary as an optional dependency");
    expect(comment).toContain("only downloads a binary when that platform package is missing");
    expect(comment).not.toMatch(/binary never lands/i);
  });

  // QFAI:EX-0002-0003-08
  it("tells both checkers where the tools are, from wherever the checkers run", async () => {
    const steps = await checkSteps();
    const commands = steps
      .map((step) => String(step["run"] ?? ""))
      .flatMap((body) => body.split(/\r?\n/))
      .map((line) => line.trim())
      .filter((line) => line.startsWith("node ") && line.includes(" --tools "));

    expect(commands).toEqual([
      `node node_modules/qfai/assets/scripts/check-mdschema.mjs --tools ${TOOLS_DIR} --scope all --summary`,
      `node ${TOOLS_DIR}/node_modules/qfai/assets/scripts/check-mdschema.mjs --tools ${TOOLS_DIR} --scope all --summary`,
      `node node_modules/qfai/assets/scripts/check-mermaid.mjs --tools ${TOOLS_DIR}`,
      `node ${TOOLS_DIR}/node_modules/qfai/assets/scripts/check-mermaid.mjs --tools ${TOOLS_DIR}`,
    ]);
  });

  it.skipIf(!HAS_BASH).each([
    ["0.18.2", 0],
    ["0.18.1", 1],
  ])("checks Mermaid's resolved KaTeX %s before parsing diagrams", async (version, status) => {
    const body = await runBody("Check Mermaid diagram syntax");
    const stage = await mkdtemp(path.join(os.tmpdir(), "qfai-int-docs-katex-"));
    try {
      const tools = path.join(stage, TOOLS_DIR, "node_modules");
      const katex = path.join(tools, "mermaid", "node_modules", "katex");
      const scripts = path.join(tools, "qfai", "assets", "scripts");
      await mkdir(katex, { recursive: true });
      await mkdir(scripts, { recursive: true });
      await writeFile(path.join(katex, "package.json"), JSON.stringify({ version }), "utf-8");
      await writeFile(
        path.join(scripts, "check-mermaid.mjs"),
        'console.log("Mermaid checker ran");',
        "utf-8",
      );
      const child = spawnSync("bash", ["-e", "-o", "pipefail", "-c", body], {
        cwd: stage,
        encoding: "utf-8",
      });
      if (child.error !== undefined) throw child.error;
      expect(child.status, child.stderr).toBe(status);
      if (status === 0) {
        expect(child.stdout).toContain("Mermaid checker ran");
      } else {
        expect(child.stdout).not.toContain("Mermaid checker ran");
        expect(child.stderr).toContain(`Mermaid resolved KaTeX ${version}, expected 0.18.2`);
      }
    } finally {
      await removeTempTree(stage);
    }
  });

  it.skipIf(!HAS_BASH || process.env.GITHUB_ACTIONS !== "true")(
    "installs patched KaTeX and parses a real diagram with the delivered docs steps",
    { timeout: 150_000 },
    async () => {
      const installBody = await runBody(INSTALL_STEP);
      const diagramBody = await runBody("Check Mermaid diagram syntax");
      const stage = await mkdtemp(path.join(os.tmpdir(), "qfai-int-docs-katex-install-"));
      try {
        const qfai = path.join(stage, "node_modules", "qfai");
        const scripts = path.join(qfai, "assets", "scripts");
        await mkdir(scripts, { recursive: true });
        await writeFile(
          path.join(qfai, "package.json"),
          JSON.stringify({ dependencies: { "@jackchuka/mdschema": MDSCHEMA_VERSION } }),
          "utf-8",
        );
        await copyFile(
          new URL("../../assets/scripts/check-mermaid.mjs", import.meta.url),
          path.join(scripts, "check-mermaid.mjs"),
        );
        await writeFile(
          path.join(stage, "diagram.md"),
          "```mermaid\nflowchart TD\nA --> B\n```\n",
          "utf-8",
        );
        const options = { cwd: stage, encoding: "utf-8" as const, timeout: 60_000 };
        const install = spawnSync("bash", ["-e", "-o", "pipefail", "-c", installBody], options);
        if (install.error !== undefined) throw install.error;
        expect(install.status, install.stderr).toBe(0);
        const diagram = spawnSync("bash", ["-e", "-o", "pipefail", "-c", diagramBody], options);
        if (diagram.error !== undefined) throw diagram.error;
        expect(diagram.status, diagram.stderr).toBe(0);
        expect(diagram.stdout).toContain("check-mermaid: 1 diagram(s) parsed in 1 file(s).");
      } finally {
        await removeTempTree(stage);
      }
    },
  );
});

describe("the delivered document-schema rule tells how to run the document lane's checks locally", () => {
  /** The rule `qfai init` writes into the project. */
  async function deliveredRule(): Promise<string> {
    const file = path.join(await initialised(), ".agents", "rules", "document-schema.md");
    return readFile(file, "utf-8");
  }

  // QFAI:AC-0002-0003-05
  // QFAI:EX-0002-0003-10
  it("shows the commands the lane runs, with the tools directory the lane installs into", async () => {
    const rule = await deliveredRule();
    const laneCommands = (await checkSteps())
      .map((step) => String(step["run"] ?? ""))
      .flatMap((body) => body.split(/\r?\n/))
      .map((line) => line.trim())
      .filter((line) => line.startsWith("node node_modules/qfai/"));

    // Non-vacuity: the lane has one command per check, so a lane that changed shape cannot
    // empty the comparison below.
    expect(laneCommands).toHaveLength(2);
    for (const command of laneCommands) {
      expect(rule, `the rule does not show the lane command ${command}`).toContain(command);
    }
    expect(rule).toContain(`${TOOLS_DIR}/node_modules/qfai/assets/scripts/`);
    expect(rule).toContain(INSTALL_STEP);
  });

  // QFAI:EX-0002-0003-10
  it("leaves the pinned versions to the lane, so the rule cannot drift from them", async () => {
    const rule = await deliveredRule();

    expect(rule).not.toContain(MDSCHEMA_VERSION);
    expect(rule).not.toMatch(/mermaid@\d/);
    expect(rule).not.toMatch(/jsdom@\d/);
  });
});
