import { tmpdir } from "node:os";
import path from "node:path";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { run } from "../../src/cli/main.js";
import { extractDomMarkers } from "../../src/core/prototyping/index.js";

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
      expect(logs.some((log) => log.includes("QFAI_PROTOTYPE_FIDELITY_AUTOGEN"))).toBe(true);
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
      await run(["prototyping", "--autogen-ui-fidelity", "--root", tempDir], tempDir);
      expect(process.exitCode).toBe(1);
      // Message is in Japanese, check for QFAI_PROTOTYPE_BASE_URL
      expect(logs.some((log) => log.includes("QFAI_PROTOTYPE_BASE_URL"))).toBe(true);
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
          "http://localhost:9999",
          "--root",
          tempDir,
        ],
        tempDir,
      );

      const evidencePath = path.join(tempDir, ".qfai", "evidence", "prototyping.json");
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
          "http://localhost:9999",
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

  it("exits with 2 when --autogen-only without --autogen-ui-fidelity", async () => {
    const logs: string[] = [];
    const originalWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk: unknown) => {
      logs.push(String(chunk));
      return true;
    };
    const originalStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = () => true;

    try {
      await run(["prototyping", "--autogen-only", "--root", tempDir], tempDir);
      expect(process.exitCode).toBe(2);
      expect(logs.some((log) => log.includes("--autogen-only"))).toBe(true);
    } finally {
      process.stderr.write = originalWrite;
      process.stdout.write = originalStdout;
      process.exitCode = undefined;
    }
  });

  it("writes skipped status to evidence when autogen is not enabled", async () => {
    const originalStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = () => true;

    try {
      await run(["prototyping", "--root", tempDir], tempDir);

      const evidencePath = path.join(tempDir, ".qfai", "evidence", "prototyping.json");
      const evidence = JSON.parse(await readFile(evidencePath, "utf-8"));
      expect(evidence.uiFidelityAutogen).toBeDefined();
      expect(evidence.uiFidelityAutogen.status).toBe("skipped");
    } finally {
      process.stdout.write = originalStdout;
      process.exitCode = undefined;
    }
  });
});

describe("extractDomMarkers", () => {
  it("extracts data-qfai attribute values from HTML", () => {
    const html = `
      <div data-qfai="CON-UI-0001:search_input">Search</div>
      <table data-qfai="CON-UI-0001:orders_table">
        <tr><td>Row</td></tr>
      </table>
    `;
    const markers = extractDomMarkers(html);
    expect(markers).toEqual(["CON-UI-0001:orders_table", "CON-UI-0001:search_input"]);
  });

  it("deduplicates markers and sorts alphabetically", () => {
    const html = `
      <div data-qfai="CON-UI-0001:btn_submit">Submit</div>
      <span data-qfai="CON-UI-0001:btn_submit">Submit Copy</span>
      <input data-qfai="CON-UI-0001:amount_input" />
    `;
    const markers = extractDomMarkers(html);
    expect(markers).toEqual(["CON-UI-0001:amount_input", "CON-UI-0001:btn_submit"]);
  });

  it("ignores elements with empty data-qfai", () => {
    const html = `
      <div data-qfai="">Empty</div>
      <div data-qfai="   ">Whitespace</div>
      <div data-qfai="CON-UI-0001:valid">Valid</div>
    `;
    const markers = extractDomMarkers(html);
    expect(markers).toEqual(["CON-UI-0001:valid"]);
  });

  it("returns empty array for HTML without data-qfai", () => {
    const html = `<div><p>No markers</p></div>`;
    const markers = extractDomMarkers(html);
    expect(markers).toEqual([]);
  });
});
