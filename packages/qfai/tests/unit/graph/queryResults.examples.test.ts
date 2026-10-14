import { expect, it } from "vitest";
import { exploreGraph } from "../../../src/core/graph/query.js";
import { documentAnalysisFixture } from "../../helpers/graphAnalysis.js";
import { rm } from "node:fs/promises";
import path from "node:path";
import type { GraphProcess } from "../../../src/core/graph/process.js";
import { graphCliResult } from "../../helpers/graphCli.js";

// QFAI:EX-0001-0234-13
// Mutation: packages/qfai/src/core/graph/query.ts `coverage.unsupported.length > 0 || coverage.unreadable.length > 0` -> `false` fails "distinguishes unsupported and unreadable scope from no matches"
it("distinguishes unsupported and unreadable scope from no matches", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    const run: GraphProcess = async (command, args, options) => {
      if (args.some((arg) => arg.endsWith("graphify-native.py")) && args.at(-1) !== "inventory") {
        fixture.calls.push({ command, args });
        return {
          exitCode: 0,
          stdout: '{"current":true,"unsupported":["legacy.foo"],"unreadable":["private-notes.md"]}',
        };
      }
      if (args.includes("query")) {
        fixture.calls.push({ command, args });
        return { exitCode: 4, stdout: "The graph has no matching nodes." };
      }
      return fixture.run(command, args, options);
    };
    const result = await exploreGraph(
      fixture.root,
      { domain: "documents", question: "unknown concept" },
      run,
    );
    expect(result.status).toBe("incomplete");
    expect(result.coverage).toEqual({
      unsupported: ["legacy.foo"],
      unreadable: ["private-notes.md"],
    });
    expect(result.answer).toContain("no matching nodes");
    expect(result.recovery).toContain("absence");
    const empty = JSON.stringify({
      query: "unknown concept",
      summary: "No native context entries",
      nodes: [],
      entryPoints: [],
      edges: [],
      codeBlocks: [],
      relatedFiles: [],
      stats: { nodeCount: 0, edgeCount: 0, fileCount: 0, codeBlockCount: 0, totalCodeSize: 0 },
    });
    for (const native of [
      {
        complete: false,
        unsupported: ["legacy.foo"],
        unreadable: ["locked.ts"],
        unparsed: ["broken.ts"],
      },
      { complete: false, unsupported: [], unreadable: [], unparsed: [] },
      { complete: true, unsupported: [], unreadable: [], unparsed: [] },
    ]) {
      const codeRun: GraphProcess = (command, args, options) => {
        if (args.at(-1) === "coverage")
          return Promise.resolve({ exitCode: 0, stdout: JSON.stringify(native) });
        if (args.includes("context")) return Promise.resolve({ exitCode: 0, stdout: empty });
        return fixture.run(command, args, options);
      };
      const code = await exploreGraph(
        fixture.root,
        { domain: "code", question: "unknown concept" },
        codeRun,
      );
      expect(code.status).toBe(native.complete ? "no-match" : "incomplete");
      expect(code.coverage).toEqual(native);
      if (native.complete) expect(code.inferenceNotice).toContain("this context search");
      else expect(code.recovery).toContain("absence");
    }
    expect(
      fixture.calls.some((call) => call.args.includes("grep") || call.args.includes("rg")),
    ).toBe(false);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0234-16
// Mutation: packages/qfai/src/core/graph/query.ts `if (result.exitCode !== 0 || !context)` -> `if (result.exitCode !== 0 || !context) return { engine: "codegraph", status: "no-match" }; if (false)` fails "reports query process failures and exceptions without a raw-search fallback"
it("reports query process failures and exceptions without a raw-search fallback", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    for (const args of [
      [],
      ["code"],
      ["code", ""],
      ["documents", " "],
      ["unknown", "checkout"],
      ["code", "checkout", "--approved", "true"],
      ["documents", "rationale", "--target", "other"],
      ["code", "checkout\u0000callers"],
      ["code", "x".repeat(16385)],
    ]) {
      fixture.calls.length = 0;
      const invalid = await graphCliResult(fixture.root, args, fixture.run);
      expect(invalid.value).toMatchObject({
        status: "failed",
        failure: "Invalid graph command arguments.",
      });
      expect(invalid.output).toContain("node .qfai/tools/graph-cli.mjs");
      expect(invalid.failures).toBe(1);
      expect(fixture.calls).toHaveLength(0);
    }
    fixture.calls.length = 0;
    for (const throws of [false, true]) {
      const run: GraphProcess = async (command, args, options) => {
        if (args.includes("context")) {
          fixture.calls.push({ command, args });
          if (throws) throw new Error("fixture-provider-key-must-not-appear");
          return { exitCode: 1, stdout: "fixture-provider-key-must-not-appear" };
        }
        return fixture.run(command, args, options);
      };
      const result = await exploreGraph(
        fixture.root,
        { domain: "code", question: "checkout callers" },
        run,
      ).catch(() => undefined);
      expect(result?.status).toBe("failed");
      expect(result?.recovery ?? "").toContain("Repair");
      expect(JSON.stringify(result) ?? "").not.toContain("fixture-provider-key");
      const managed = await graphCliResult(fixture.root, ["code", "checkout callers"], run);
      expect(managed.value).toMatchObject({
        status: "failed",
        failure: expect.stringMatching(/CodeGraph.*failed/),
      });
      expect(managed.output).toContain("Repair");
      expect(managed.output).not.toContain("fixture-provider-key");
      expect(managed.failures).toBe(1);
    }
    expect(fixture.calls.filter((call) => call.args.includes("context"))).toHaveLength(4);
    const failedDocuments = await graphCliResult(
      fixture.root,
      ["documents", "Requirement rationale"],
      (command, args, options) =>
        args.includes("query")
          ? Promise.resolve({ exitCode: 1, stdout: "fixture-provider-key-must-not-appear" })
          : fixture.run(command, args, options),
    );
    expect(failedDocuments.value).toMatchObject({
      engine: "graphify",
      status: "failed",
      failure: "Graphify query failed.",
    });
    expect(failedDocuments.output).not.toContain("fixture-provider-key");
    expect(failedDocuments.output).toContain("Repair");
    expect(failedDocuments.failures).toBe(1);
    for (const stdout of [
      "",
      "{invalid native JSON",
      JSON.stringify({ nodes: [], stats: { nodeCount: 1 } }),
      JSON.stringify({
        query: "checkout callers",
        summary: "Empty native result",
        nodes: [],
        entryPoints: ["unexpected-entry"],
        edges: [],
        relatedFiles: [],
        codeBlocks: [],
        stats: { nodeCount: 0, edgeCount: 0, fileCount: 0, codeBlockCount: 0, totalCodeSize: 0 },
      }),
    ]) {
      const run: GraphProcess = (command, args, options) =>
        args.includes("context")
          ? Promise.resolve({ exitCode: 0, stdout })
          : fixture.run(command, args, options);
      const result = await exploreGraph(
        fixture.root,
        { domain: "code", question: "checkout callers" },
        run,
      );
      expect(result.status, stdout).toBe("failed");
      expect(result.recovery).toContain("Repair");
      expect(result.answer).toBeUndefined();
    }
    expect(
      fixture.calls.some((call) =>
        call.args.some((arg) => ["rg", "grep", "findstr"].includes(arg)),
      ),
    ).toBe(false);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0234-16
it("reports the preparation cause when a managed query cannot build missing analysis", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    await rm(path.join(fixture.analysis, ".codegraph", "codegraph.db"));
    const result = await graphCliResult(fixture.root, ["code", "checkout callers"], fixture.run);
    expect(result.value).toMatchObject({
      status: "failed",
      failure: "CodeGraph analysis preparation failed.",
    });
    expect(result.output).toContain("Repair");
    expect(result.failures).toBe(1);
    expect(fixture.calls.some((call) => call.args.includes("context"))).toBe(false);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0234-15
// Mutation: packages/qfai/src/core/graph/query.ts `status: "not-ready",` -> `status: "failed",` fails "returns a preparation action for a missing index without raw search"
it("returns a preparation action for a missing index without raw search", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    await rm(path.join(fixture.analysis, ".codegraph", "codegraph.db"));
    const result = await exploreGraph(
      fixture.root,
      { domain: "code", question: "checkout callers" },
      fixture.run,
    );
    expect(result.status).toBe("not-ready");
    expect(result.recovery).toContain("Prepare");
    const managed = await graphCliResult(fixture.root, ["code", "checkout callers"], fixture.run);
    expect(managed.value).toMatchObject({ engine: "codegraph", status: "failed" });
    expect(managed.output).toContain("Repair");
    expect(managed.failures).toBe(1);
    expect(
      fixture.calls.some((call) => call.args.some((arg) => arg.endsWith("codegraph-native.mjs"))),
    ).toBe(true);
    expect(
      fixture.calls.some((call) =>
        call.args.some((arg) => ["rg", "grep", "context"].includes(arg)),
      ),
    ).toBe(false);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0234-14
// Mutation: packages/qfai/src/core/graph/query.ts `result.stdout.includes("[INFERRED]")` -> `result.stdout.includes("[UNCONFIRMED]")` fails "labels inferred relationships and retains the native source locations"
it("labels inferred relationships and retains the native source locations", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    const result = await exploreGraph(
      fixture.root,
      { domain: "documents", question: "Requirement rationale" },
      fixture.run,
    );
    expect(result.status).toBe("answered");
    expect(result.requestedScope).toEqual({
      domain: "documents",
      question: "Requirement rationale",
    });
    expect(result.answer).toContain("[src=rationale.md loc=L1]");
    expect(result.answer).toContain("[INFERRED]");
    expect(result.inferenceNotice ?? "").toContain("Inferred");
    expect(result.inferenceNotice ?? "").toContain("semantic correctness");
    expect(result.inferenceNotice ?? "").toContain("coverage");
  } finally {
    await fixture.dispose();
  }
});
