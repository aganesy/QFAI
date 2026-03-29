// QFAI:SPEC-0033:TC-0033-0003
// QFAI:SPEC-0033:TC-0033-0004
// QFAI:SPEC-0033:TC-0033-0005
// QFAI:SPEC-0033:TC-0033-0013

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HandoffArtifact } from "../../../src/core/handoff/types.js";
import { HandoffReader } from "../../../src/core/handoff/reader.js";
import { HandoffWriter } from "../../../src/core/handoff/writer.js";

describe("HandoffReader", () => {
  let tmpDir: string;
  let reader: HandoffReader;
  let writer: HandoffWriter;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "qfai-handoff-reader-"));
    reader = new HandoffReader();
    writer = new HandoffWriter();
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  function makeArtifact(overrides?: Partial<HandoffArtifact>): HandoffArtifact {
    return {
      version: "1.7.6",
      sessionId: "session-abc-123",
      timestamp: "2026-03-29T00:00:00.000Z",
      iteration: 3,
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
        outputs: ["src/module.ts"],
      },
      evaluator: {
        scores: [0.9],
        decisions: ["accept"],
      },
      ...overrides,
    };
  }

  // TC-0033-0003
  it("reads back a valid handoff with all states restored", async () => {
    const artifact = makeArtifact();
    const filePath = path.join(tmpDir, "handoff.json");

    await writer.write(artifact, filePath);
    const result = await reader.read(filePath);

    expect(result).not.toBeNull();
    expect(result!.version).toBe("1.7.6");
    expect(result!.sessionId).toBe("session-abc-123");
    expect(result!.planner.strategies).toHaveLength(1);
    expect(result!.generator.outputs).toHaveLength(1);
    expect(result!.evaluator.scores).toEqual([0.9]);
    expect(result!.evaluator.decisions).toEqual(["accept"]);
  });

  // TC-0033-0004
  it("returns null and logs error for truncated JSON", async () => {
    const filePath = path.join(tmpDir, "truncated.json");
    const artifact = makeArtifact();
    const fullJson = JSON.stringify(artifact, null, 2);
    // Truncate mid-file
    const truncated = fullJson.slice(0, Math.floor(fullJson.length / 2));
    await writeFile(filePath, truncated, "utf-8");

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await reader.read(filePath);

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[HandoffReader] Corrupt or truncated JSON"),
    );

    errorSpy.mockRestore();
  });

  // TC-0033-0005
  it("returns null and logs error when evaluator key is missing", async () => {
    const filePath = path.join(tmpDir, "missing-key.json");
    const artifact = makeArtifact();
    const obj = JSON.parse(JSON.stringify(artifact));
    delete obj.evaluator;
    await writeFile(filePath, JSON.stringify(obj), "utf-8");

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await reader.read(filePath);

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Missing required keys"),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("evaluator"),
    );

    errorSpy.mockRestore();
  });

  // TC-0033-0013
  it("reads back artifact without user-specific data blocking resumption", async () => {
    // Write as "user A" concept — the artifact should have no user lock
    const artifact = makeArtifact({ sessionId: "user-a-session" });
    const filePath = path.join(tmpDir, "portable.json");

    await writer.write(artifact, filePath);

    // Read back — should succeed regardless of "who" reads it
    const result = await reader.read(filePath);

    expect(result).not.toBeNull();
    expect(result!.sessionId).toBe("user-a-session");

    // Verify no absolute paths in the file content
    const raw = await readFile(filePath, "utf-8");
    expect(raw).not.toMatch(/[A-Z]:\\/);
    expect(raw).not.toMatch(/\/Users\/\w+/);
    expect(raw).not.toMatch(/\/home\/\w+/);
  });
});
