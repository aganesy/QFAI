// QFAI:SPEC-0033:TC-0033-0001
// QFAI:SPEC-0033:TC-0033-0002
// QFAI:SPEC-0033:TC-0033-0006
// QFAI:SPEC-0033:TC-0033-0007
// QFAI:SPEC-0033:TC-0033-0014

import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { HandoffArtifact } from "../../../src/core/handoff/types.js";
import { HandoffWriter } from "../../../src/core/handoff/writer.js";

describe("HandoffWriter", () => {
  let tmpDir: string;
  let writer: HandoffWriter;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "qfai-handoff-writer-"));
    writer = new HandoffWriter();
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  function makeArtifact(overrides?: Partial<HandoffArtifact>): HandoffArtifact {
    return {
      version: "1.7.6",
      sessionId: "session-abc-123",
      timestamp: new Date().toISOString(),
      iteration: 5,
      planner: {
        strategies: [
          {
            approach: "tdd-first",
            constraints: ["budget < 100"],
            budgetGuidance: "conservative",
          },
        ],
      },
      generator: {
        outputs: ["src/module.ts", "src/helper.ts"],
      },
      evaluator: {
        scores: [0.9, 0.85],
        decisions: ["accept", "refine"],
      },
      ...overrides,
    };
  }

  // TC-0033-0001
  it("writes handoff at iteration 5 with planner/generator/evaluator keys", async () => {
    const artifact = makeArtifact({ iteration: 5 });
    const outputPath = path.join(tmpDir, "handoff.json");

    await writer.write(artifact, outputPath);

    const raw = await readFile(outputPath, "utf-8");
    const parsed = JSON.parse(raw);

    expect(parsed).toHaveProperty("planner");
    expect(parsed).toHaveProperty("generator");
    expect(parsed).toHaveProperty("evaluator");
    expect(parsed.iteration).toBe(5);
    expect(parsed.planner.strategies).toHaveLength(1);
    expect(parsed.generator.outputs).toHaveLength(2);
    expect(parsed.evaluator.scores).toHaveLength(2);
  });

  // TC-0033-0002
  it("writes valid JSON at iteration 1 with minimal arrays", async () => {
    const artifact = makeArtifact({
      iteration: 1,
      planner: { strategies: [] },
      generator: { outputs: [] },
      evaluator: { scores: [], decisions: [] },
    });
    const outputPath = path.join(tmpDir, "handoff-iter1.json");

    await writer.write(artifact, outputPath);

    const raw = await readFile(outputPath, "utf-8");
    const parsed = JSON.parse(raw);

    expect(parsed.iteration).toBe(1);
    expect(parsed.planner.strategies).toEqual([]);
    expect(parsed.generator.outputs).toEqual([]);
    expect(parsed.evaluator.scores).toEqual([]);
    expect(parsed.evaluator.decisions).toEqual([]);
  });

  // TC-0033-0006
  it("contains no absolute user-specific paths in artifact", async () => {
    // Use a path under cwd so relative conversion is meaningful cross-platform
    const absolutePath = path.resolve(process.cwd(), "src", "file.ts");
    const artifact = makeArtifact({
      generator: { outputs: [absolutePath] },
    });
    const outputPath = path.join(tmpDir, "handoff-paths.json");

    await writer.write(artifact, outputPath);

    const raw = await readFile(outputPath, "utf-8");
    const parsed = JSON.parse(raw);

    // All output paths should be relative after conversion
    for (const output of parsed.generator.outputs) {
      expect(path.isAbsolute(output)).toBe(false);
    }
    // The specific relative path should be present
    expect(parsed.generator.outputs[0]).toBe(path.join("src", "file.ts"));
  });

  // TC-0033-0007
  it("redacts credential values from artifact", async () => {
    const artifact = makeArtifact();
    // Inject credential-like keys into the planner strategies
    const withCreds = {
      ...artifact,
      planner: {
        strategies: [
          {
            approach: "tdd-first",
            constraints: ["budget < 100"],
            budgetGuidance: "conservative",
            API_KEY: "sk-secret-12345",
            PASSWORD: "hunter2",
          } as Record<string, unknown>,
        ],
      },
    } as unknown as HandoffArtifact;

    const outputPath = path.join(tmpDir, "handoff-creds.json");

    await writer.write(withCreds, outputPath);

    const raw = await readFile(outputPath, "utf-8");
    const parsed = JSON.parse(raw);

    expect(parsed.planner.strategies[0].API_KEY).toBe("<REDACTED>");
    expect(parsed.planner.strategies[0].PASSWORD).toBe("<REDACTED>");
    expect(raw).not.toContain("sk-secret-12345");
    expect(raw).not.toContain("hunter2");
  });

  // TC-0033-0014
  it("writes valid artifact at iteration 1 with no generator output", async () => {
    const artifact = makeArtifact({
      iteration: 1,
      generator: { outputs: [] },
      evaluator: { scores: [], decisions: [] },
    });
    const outputPath = path.join(tmpDir, "handoff-empty-gen.json");

    await writer.write(artifact, outputPath);

    const raw = await readFile(outputPath, "utf-8");
    const parsed = JSON.parse(raw);

    expect(parsed.iteration).toBe(1);
    expect(parsed.generator.outputs).toEqual([]);
    expect(parsed.evaluator.scores).toEqual([]);
  });
});
