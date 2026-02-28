import { tmpdir } from "node:os";
import path from "node:path";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { run } from "../../src/cli/main.js";

describe("prototyping command", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(tmpdir(), `qfai-prototyping-test-${Date.now()}`);
    await mkdir(path.join(tempDir, ".qfai", "contracts", "ui"), {
      recursive: true,
    });
    await mkdir(path.join(tempDir, ".qfai", "evidence"), { recursive: true });

    // Create a minimal config
    await writeFile(
      path.join(tempDir, "qfai.config.yaml"),
      "paths:\n  contractsDir: .qfai/contracts\n",
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("exits with 0 when autogen is not enabled", async () => {
    // Capture stdout - logger uses process.stdout.write
    const logs: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: unknown) => {
      logs.push(String(chunk));
      return true;
    };

    try {
      await run(["prototyping", "--root", tempDir], tempDir);
      expect(process.exitCode).toBe(0);
      expect(
        logs.some((log) => log.includes("QFAI_PROTOTYPE_FIDELITY_AUTOGEN")),
      ).toBe(true);
    } finally {
      process.stdout.write = originalWrite;
      process.exitCode = undefined;
    }
  });

  it("exits with 1 when autogen enabled but no base-url", async () => {
    const logs: string[] = [];
    const originalWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk: unknown) => {
      logs.push(String(chunk));
      return true;
    };

    try {
      await run(
        ["prototyping", "--autogen-ui-fidelity", "--root", tempDir],
        tempDir,
      );
      expect(process.exitCode).toBe(1);
      // Message is in Japanese, check for QFAI_PROTOTYPE_BASE_URL
      expect(logs.some((log) => log.includes("QFAI_PROTOTYPE_BASE_URL"))).toBe(
        true,
      );
    } finally {
      process.stderr.write = originalWrite;
      process.exitCode = undefined;
    }
  });

  it("creates evidence file with status=failed when no contracts exist", async () => {
    // Use a non-existent URL that will fail quickly
    // Suppress stdout/stderr
    const originalStdout = process.stdout.write.bind(process.stdout);
    const originalStderr = process.stderr.write.bind(process.stderr);
    process.stdout.write = () => true;
    process.stderr.write = () => true;

    try {
      await run(
        [
          "prototyping",
          "--autogen-ui-fidelity",
          "--base-url",
          "http://localhost:99999",
          "--root",
          tempDir,
        ],
        tempDir,
      );

      const evidencePath = path.join(
        tempDir,
        ".qfai",
        "evidence",
        "prototyping.json",
      );
      const evidence = JSON.parse(await readFile(evidencePath, "utf-8"));
      expect(evidence.uiFidelityAutogen).toBeDefined();
      expect(evidence.uiFidelityAutogen.status).toBe("failed");
    } finally {
      process.stdout.write = originalStdout;
      process.stderr.write = originalStderr;
      process.exitCode = undefined;
    }
  });

  it("parses --evidence-out correctly", async () => {
    const customPath = path.join(tempDir, "custom", "evidence.json");

    // Suppress stdout/stderr
    const originalStdout = process.stdout.write.bind(process.stdout);
    const originalStderr = process.stderr.write.bind(process.stderr);
    process.stdout.write = () => true;
    process.stderr.write = () => true;

    try {
      await run(
        [
          "prototyping",
          "--autogen-ui-fidelity",
          "--base-url",
          "http://localhost:99999",
          "--evidence-out",
          customPath,
          "--root",
          tempDir,
        ],
        tempDir,
      );

      const evidence = JSON.parse(await readFile(customPath, "utf-8"));
      expect(evidence.uiFidelityAutogen).toBeDefined();
    } finally {
      process.stdout.write = originalStdout;
      process.stderr.write = originalStderr;
      process.exitCode = undefined;
    }
  });
});
