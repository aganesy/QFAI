import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { prepareCodeAnalysis } from "../../../src/core/graph/codePreparation.js";
import { restoreCompletedCodeAnalysis } from "../../../src/core/graph/reuse.js";
import {
  completedCodeSnapshotFixture,
  localCodeGenerationProcess,
} from "../../helpers/graphReuse.js";
import { exploreGraph } from "../../../src/core/graph/query.js";

// QFAI:EX-0001-0236-12
// Mutation: packages/qfai/src/core/graph/reuse.ts `if (!(await inspectCodeAnalysisAt(root, staged, run))) continue;` -> `if (false) continue;` fails "rejects missing partial and corrupt completed candidates before local generation"
it("rejects missing partial and corrupt completed candidates before local generation", async () => {
  for (const failure of ["missing", "partial", "corrupt-metadata", "corrupt-native"] as const) {
    const fixture = await completedCodeSnapshotFixture();
    try {
      if (failure === "missing") await rm(path.join(fixture.candidate, "completed.json"));
      if (failure === "partial")
        await rm(path.join(fixture.candidate, "analysis", ".codegraph", "codegraph.db"));
      if (failure === "corrupt-metadata")
        await writeFile(path.join(fixture.candidate, "completed.json"), "{");
      const generation = localCodeGenerationProcess(fixture);
      const result = await prepareCodeAnalysis(
        fixture.root,
        (command, args, options) =>
          failure === "corrupt-native" &&
          args.includes("status") &&
          args.some((arg) => arg.includes(".restoring-codegraph-"))
            ? Promise.resolve({ exitCode: 1, stdout: "" })
            : generation(command, args, options),
        fixture.environment,
      );
      expect(result, failure).toMatchObject({ status: "prepared", source: "generated" });
      expect(
        await readFile(path.join(fixture.analysis, ".codegraph", "codegraph.db"), "utf8"),
      ).toBe("Native generation process-port marker");
    } finally {
      await fixture.dispose();
    }
  }
});

// QFAI:EX-0001-0236-13
// Mutation: packages/qfai/src/core/graph/reuse.ts `metadata.engineVersion !== GRAPH_VERSIONS.codegraph` -> `false` fails "does not restore incompatible engine environment or snapshot layout"
it("does not restore incompatible engine environment or snapshot layout", async () => {
  for (const changed of [
    { engineVersion: "99.0.0" },
    { environment: { platform: "win32", architecture: "x64", machine: "another-machine" } },
    { layout: 2 },
  ]) {
    const fixture = await completedCodeSnapshotFixture();
    try {
      const metadataFile = path.join(fixture.candidate, "completed.json");
      const metadata: Record<string, unknown> = JSON.parse(await readFile(metadataFile, "utf8"));
      await writeFile(metadataFile, JSON.stringify({ ...metadata, ...changed }));
      expect(
        await restoreCompletedCodeAnalysis(fixture.root, fixture.run, fixture.environment),
      ).toBe("cold");
      expect(fixture.observed.some((args) => args.includes("status"))).toBe(false);
      await expect(
        readFile(path.join(fixture.analysis, ".codegraph", "codegraph.db")),
      ).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await fixture.dispose();
    }
  }
});

// QFAI:EX-0001-0236-20
// Mutation: packages/qfai/src/core/graph/analysis.ts `if (result.exitCode !== 0) return false;` -> `if (result.exitCode !== 0) return true;` fails "retains prior analysis and reports no current scope after native freshness operations fail"
it("retains prior analysis and reports no current scope after native freshness operations fail", async () => {
  const fixture = await completedCodeSnapshotFixture();
  try {
    await cp(path.join(fixture.candidate, "analysis"), fixture.analysis, { recursive: true });
    await rm(fixture.candidate, { recursive: true });
    const generation = localCodeGenerationProcess(fixture);
    const run = async (...parameters: Parameters<typeof generation>) => {
      const result = await generation(...parameters);
      return parameters[1].includes("status") ? { exitCode: 1, stdout: "" } : result;
    };
    expect(await prepareCodeAnalysis(fixture.root, run, fixture.environment)).toMatchObject({
      status: "failed",
    });
    expect(await readFile(path.join(fixture.analysis, ".codegraph", "codegraph.db"), "utf8")).toBe(
      "Process-port DB marker",
    );
    expect(
      await exploreGraph(fixture.root, { domain: "code", question: "checkout" }, run),
    ).toMatchObject({ status: "not-ready" });
    expect(fixture.observed.some((args) => args.includes("context"))).toBe(false);
    expect(await readdir(path.dirname(fixture.candidate))).toEqual([]);
    expect(
      (await readdir(path.dirname(fixture.analysis))).some((name) =>
        name.startsWith(".preparing-"),
      ),
    ).toBe(false);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0236-21
// Mutation: packages/qfai/src/core/graph/reuse.ts `metadata.repository !== location.repository` -> `false` fails "excludes same-machine completed analysis belonging to another repository"
it("excludes same-machine completed analysis belonging to another repository", async () => {
  const fixture = await completedCodeSnapshotFixture();
  try {
    const file = path.join(fixture.candidate, "completed.json");
    const metadata: Record<string, unknown> = JSON.parse(await readFile(file, "utf8"));
    const foreign = JSON.stringify({
      ...metadata,
      repository: path.join(fixture.common, "another-repository"),
    });
    await writeFile(file, foreign);
    expect(
      await prepareCodeAnalysis(
        fixture.root,
        localCodeGenerationProcess(fixture),
        fixture.environment,
      ),
    ).toMatchObject({ status: "prepared", source: "generated" });
    expect(
      fixture.observed.some(
        (args) =>
          args.includes("status") && args.some((arg) => arg.includes(".restoring-codegraph-")),
      ),
    ).toBe(false);
    expect(await readFile(path.join(fixture.analysis, ".codegraph", "codegraph.db"), "utf8")).toBe(
      "Native generation process-port marker",
    );
    expect(await readFile(file, "utf8")).toBe(foreign);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0236-22
// Mutation: packages/qfai/src/core/graph/reuse.ts `(next !== engineDirectory && excludedGraphInput(input))` -> `false` fails "rejects completed candidates containing secret files or credential metadata without deleting user data"
it("rejects completed candidates containing secret files or credential metadata without deleting user data", async () => {
  for (const contaminated of [
    ".env",
    ".npmrc",
    ".codegraph/secrets.json",
    "metadata",
    "environment",
    "indexed-secret",
    "indexed-escape",
    "indexed-missing",
    "indexed-absolute",
  ] as const) {
    const fixture = await completedCodeSnapshotFixture();
    try {
      const secret = "fixture-secret-never-restored";
      let secretPath: string;
      if (contaminated === "metadata" || contaminated === "environment") {
        secretPath = path.join(fixture.candidate, "completed.json");
        const metadata: Record<string, unknown> = JSON.parse(await readFile(secretPath, "utf8"));
        await writeFile(
          secretPath,
          JSON.stringify(
            contaminated === "metadata"
              ? { ...metadata, apiKey: secret }
              : { ...metadata, environment: { ...fixture.environment, apiKey: secret } },
          ),
        );
      } else if (contaminated.startsWith("indexed-")) {
        secretPath = path.join(fixture.candidate, "analysis", ".codegraph", "codegraph.db");
        await writeFile(secretPath, `Native process-port contaminated DB marker: ${secret}`);
      } else {
        secretPath = path.join(fixture.candidate, "analysis", ...contaminated.split("/"));
        await mkdir(path.dirname(secretPath), { recursive: true });
        await writeFile(secretPath, secret);
      }
      await writeFile(path.join(fixture.root, ".env"), "User-owned environment file");
      const generate = localCodeGenerationProcess(fixture);
      const unsafeInput =
        contaminated === "indexed-secret"
          ? ".env"
          : contaminated === "indexed-escape"
            ? "../outside.ts"
            : contaminated === "indexed-absolute"
              ? path.resolve("outside.ts")
              : "missing.ts";
      const result = await prepareCodeAnalysis(
        fixture.root,
        (command, args, options) =>
          args.at(-1) === "inventory" && contaminated.startsWith("indexed-")
            ? Promise.resolve({
                exitCode: 0,
                stdout: JSON.stringify({ files: ["checkout.ts", unsafeInput] }),
              })
            : generate(command, args, options),
        fixture.environment,
      );
      expect(result).toMatchObject({ status: "prepared", source: "generated" });
      expect(
        fixture.observed.some(
          (args) =>
            args.includes("status") && args.some((arg) => arg.includes(".restoring-codegraph-")),
        ),
      ).toBe(false);
      expect(await readFile(secretPath, "utf8")).toContain(secret);
      expect(await readFile(path.join(fixture.root, ".env"), "utf8")).toBe(
        "User-owned environment file",
      );
      expect(JSON.stringify(result)).not.toContain(secret);
    } finally {
      await fixture.dispose();
    }
  }
});
