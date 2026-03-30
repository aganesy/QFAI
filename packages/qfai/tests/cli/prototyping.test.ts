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

  it("writes a render bundle and references it from evidence when render is requested without autogen", async () => {
    const originalStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = () => true;

    try {
      await run(
        [
          "prototyping",
          "--render-evidence",
          "--viewports",
          "desktop,mobile",
          "--render-out",
          ".qfai/evidence/render.json",
          "--root",
          tempDir,
        ],
        tempDir,
      );

      const evidencePath = path.join(tempDir, ".qfai", "evidence", "prototyping.json");
      const evidence = JSON.parse(await readFile(evidencePath, "utf-8"));
      const bundlePath = path.join(tempDir, ".qfai", "evidence", "render.json");
      const bundle = JSON.parse(await readFile(bundlePath, "utf-8"));

      expect(evidence.renderEvidence).toEqual(
        expect.objectContaining({
          status: "skipped",
          requested: true,
          autogenEnabled: false,
          viewports: ["desktop", "mobile"],
          outputPath: bundlePath,
        }),
      );
      expect(bundle).toEqual(
        expect.objectContaining({
          meta: expect.objectContaining({
            toolVersion: expect.any(String),
            generatedAt: expect.any(String),
            commands: expect.arrayContaining(["qfai prototyping --render-evidence"]),
          }),
          renderEvidence: expect.objectContaining({
            status: "skipped",
            requested: true,
            autogenEnabled: false,
            viewports: ["desktop", "mobile"],
            outputPath: bundlePath,
          }),
        }),
      );
      expect(JSON.stringify(bundle)).not.toContain("data:image");
      expect(JSON.stringify(bundle)).not.toContain("<html");
    } finally {
      process.stdout.write = originalStdout;
      process.exitCode = undefined;
    }
  });

  it("does not attach renderEvidence when render evidence is not requested", async () => {
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
      expect(evidence.renderEvidence).toBeUndefined();
    } finally {
      process.stdout.write = originalStdout;
      process.stderr.write = originalStderr;
      process.exitCode = undefined;
    }
  });

  it("keeps renderEvidence.outputPath tied to render-out when evidence-out is custom", async () => {
    const originalStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = () => true;

    try {
      await run(
        [
          "prototyping",
          "--render-evidence",
          "--render-out",
          ".qfai/evidence/render.json",
          "--evidence-out",
          "custom/prototyping.json",
          "--root",
          tempDir,
        ],
        tempDir,
      );

      const evidencePath = path.join(tempDir, "custom", "prototyping.json");
      const evidence = JSON.parse(await readFile(evidencePath, "utf-8"));
      expect(evidence.renderEvidence).toEqual(
        expect.objectContaining({
          outputPath: path.join(tempDir, ".qfai", "evidence", "render.json"),
        }),
      );
    } finally {
      process.stdout.write = originalStdout;
      process.exitCode = undefined;
    }
  });

  it("continues and records skipped render evidence when Playwright is unavailable and failOpen is enabled", async () => {
    const originalStdout = process.stdout.write.bind(process.stdout);
    const originalStderr = process.stderr.write.bind(process.stderr);
    process.stdout.write = () => true;
    process.stderr.write = () => true;

    try {
      await writeFile(
        path.join(tempDir, "qfai.config.yaml"),
        [
          "paths:",
          "  contractsDir: .qfai/contracts",
          "uiux:",
          "  renderEvidence:",
          "    enabled: true",
          "    failOpen: true",
          "    viewports: [desktop]",
          "    out: .qfai/evidence/render.json",
          "",
        ].join("\n"),
      );

      await run(
        [
          "prototyping",
          "--autogen-ui-fidelity",
          "--base-url",
          "http://localhost:9999",
          "--render-evidence",
          "--viewports",
          "desktop",
          "--root",
          tempDir,
        ],
        tempDir,
      );

      expect(process.exitCode).toBe(0);

      const evidencePath = path.join(tempDir, ".qfai", "evidence", "prototyping.json");
      const evidence = JSON.parse(await readFile(evidencePath, "utf-8"));
      const bundlePath = path.join(tempDir, ".qfai", "evidence", "render.json");
      const bundle = JSON.parse(await readFile(bundlePath, "utf-8"));

      expect(evidence.renderEvidence).toEqual(
        expect.objectContaining({
          status: "skipped",
          requested: true,
          autogenEnabled: true,
          viewports: ["desktop"],
          outputPath: bundlePath,
          reason: expect.stringContaining("playwright"),
          skippedReason: expect.stringContaining("playwright"),
        }),
      );
      expect(bundle.renderEvidence).toEqual(
        expect.objectContaining({
          status: "skipped",
          requested: true,
          autogenEnabled: true,
          viewports: ["desktop"],
          outputPath: bundlePath,
          reason: expect.stringContaining("playwright"),
          skippedReason: expect.stringContaining("playwright"),
        }),
      );
    } finally {
      process.stdout.write = originalStdout;
      process.stderr.write = originalStderr;
      process.exitCode = undefined;
    }
  });

  it("lets CLI render flags override qfai.config renderEvidence settings", async () => {
    const originalStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = () => true;

    try {
      await writeFile(
        path.join(tempDir, "qfai.config.yaml"),
        [
          "paths:",
          "  contractsDir: .qfai/contracts",
          "uiux:",
          "  renderEvidence:",
          "    enabled: true",
          "    viewports: [tablet]",
          "    out: .qfai/evidence/from-config.json",
          "",
        ].join("\n"),
      );

      await run(
        [
          "prototyping",
          "--render-evidence",
          "--viewports",
          "desktop,mobile",
          "--render-out",
          ".qfai/evidence/from-cli.json",
          "--root",
          tempDir,
        ],
        tempDir,
      );

      const evidencePath = path.join(tempDir, ".qfai", "evidence", "prototyping.json");
      const evidence = JSON.parse(await readFile(evidencePath, "utf-8"));
      expect(evidence.renderEvidence).toEqual(
        expect.objectContaining({
          requested: true,
          viewports: ["desktop", "mobile"],
          outputPath: path.join(tempDir, ".qfai", "evidence", "from-cli.json"),
        }),
      );
    } finally {
      process.stdout.write = originalStdout;
      process.exitCode = undefined;
    }
  });
});

// ---------------------------------------------------------------------------
// QFAI:SPEC-0006:TC-0006-0011
// QFAI:SPEC-0006:TC-0006-0018
// QFAI:SPEC-0006:TC-0006-0019
// QFAI:SPEC-0006:TC-0006-0020
// QFAI:SPEC-0006:TC-0006-0021
// QFAI:SPEC-0006:TC-0006-0022
// QFAI:SPEC-0006:TC-0006-0023
// QFAI:SPEC-0006:TC-0006-0024
// ---------------------------------------------------------------------------

describe("prototyping mode CLI integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(tmpdir(), `qfai-proto-mode-${Date.now()}`);
    await mkdir(path.join(tempDir, ".qfai", "contracts", "ui"), { recursive: true });
    await mkdir(path.join(tempDir, ".qfai", "evidence"), { recursive: true });
    await writeFile(
      path.join(tempDir, "qfai.config.yaml"),
      "paths:\n  contractsDir: .qfai/contracts\n",
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function captureOutput(): {
    stdout: string[];
    stderr: string[];
    restore: () => void;
  } {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const origOut = process.stdout.write.bind(process.stdout);
    const origErr = process.stderr.write.bind(process.stderr);
    process.stdout.write = (chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    };
    process.stderr.write = (chunk: unknown) => {
      stderr.push(String(chunk));
      return true;
    };
    return {
      stdout,
      stderr,
      restore: () => {
        process.stdout.write = origOut;
        process.stderr.write = origErr;
        process.exitCode = undefined;
      },
    };
  }

  // TC-0006-0011: Default mode resolves to standard
  it("TC-0006-0011: no flags, no discussion → mode=standard, source=default", async () => {
    const out = captureOutput();
    try {
      await run(["prototyping", "--root", tempDir], tempDir);
      expect(process.exitCode).toBe(0);
      const allOutput = out.stdout.join("");
      expect(allOutput).toContain("mode resolution");
      expect(allOutput).toContain("standard");
    } finally {
      out.restore();
    }
  });

  // TC-0006-0018: Full-harness routing guidance
  it("TC-0006-0018: --mode full-harness → guidance message, exits 0, no loop", async () => {
    const out = captureOutput();
    try {
      await run(["prototyping", "--mode", "full-harness", "--root", tempDir], tempDir);
      expect(process.exitCode).toBe(0);
      const allOutput = out.stdout.join("");
      expect(allOutput).toContain("full-harness");
      expect(allOutput).toContain("/qfai-prototyping-full-harness");
    } finally {
      out.restore();
    }
  });

  // TC-0006-0019: Full-harness no partial artifacts
  it("TC-0006-0019: --mode full-harness → no evidence artifacts created", async () => {
    const out = captureOutput();
    try {
      await run(["prototyping", "--mode", "full-harness", "--root", tempDir], tempDir);
      expect(process.exitCode).toBe(0);
      // Evidence should not be written for full-harness
      const evidencePath = path.join(tempDir, ".qfai", "evidence", "prototyping.json");
      let evidenceExists = false;
      try {
        await readFile(evidencePath);
        evidenceExists = true;
      } catch {
        evidenceExists = false;
      }
      expect(evidenceExists).toBe(false);
    } finally {
      out.restore();
    }
  });

  // TC-0006-0020: --help shows --mode
  it("TC-0006-0020: --help includes --mode with valid values", async () => {
    const out = captureOutput();
    try {
      await run(["prototyping", "--help"], tempDir);
      const allOutput = out.stdout.join("");
      expect(allOutput).toContain("--mode");
      expect(allOutput).toContain("low-cost");
      expect(allOutput).toContain("standard");
      expect(allOutput).toContain("full-harness");
    } finally {
      out.restore();
    }
  });

  // TC-0006-0021: Invalid mode → QFAI-PROTO-010
  it("TC-0006-0021: --mode unknown-mode → QFAI-PROTO-010, exits 1", async () => {
    const out = captureOutput();
    try {
      await run(["prototyping", "--mode", "unknown-mode", "--root", tempDir], tempDir);
      expect(process.exitCode).toBe(1);
      const allErr = out.stderr.join("");
      expect(allErr).toContain("QFAI-PROTO-010");
    } finally {
      out.restore();
    }
  });

  // TC-0006-0022: Case-sensitive mode validation
  it("TC-0006-0022: --mode LOW-COST (uppercase) → QFAI-PROTO-010, exits 1", async () => {
    const out = captureOutput();
    try {
      await run(["prototyping", "--mode", "LOW-COST", "--root", tempDir], tempDir);
      expect(process.exitCode).toBe(1);
      const allErr = out.stderr.join("");
      expect(allErr).toContain("QFAI-PROTO-010");
    } finally {
      out.restore();
    }
  });

  // TC-0006-0023: Default mode via precedence = standard
  it("TC-0006-0023: no discussion, no flag → effective_mode=standard, mode_source=default", async () => {
    const out = captureOutput();
    try {
      await run(["prototyping", "--root", tempDir], tempDir);
      expect(process.exitCode).toBe(0);
      const allOutput = out.stdout.join("");
      expect(allOutput).toContain('"effective_mode":"standard"');
      expect(allOutput).toContain('"mode_source":"default"');
    } finally {
      out.restore();
    }
  });

  // TC-0006-0024: No mode leakage between runs
  it("TC-0006-0024: second run without flag resolves to standard (no leakage)", async () => {
    const out1 = captureOutput();
    try {
      await run(["prototyping", "--mode", "low-cost", "--root", tempDir], tempDir);
    } finally {
      out1.restore();
    }

    const out2 = captureOutput();
    try {
      await run(["prototyping", "--root", tempDir], tempDir);
      expect(process.exitCode).toBe(0);
      const allOutput = out2.stdout.join("");
      expect(allOutput).toContain('"effective_mode":"standard"');
      expect(allOutput).toContain('"mode_source":"default"');
    } finally {
      out2.restore();
    }
  });

  // Verify "prototype" alias works (TC-0006-0011 additional coverage)
  it("prototype alias works the same as prototyping", async () => {
    const out = captureOutput();
    try {
      await run(["prototype", "--root", tempDir], tempDir);
      expect(process.exitCode).toBe(0);
      const allOutput = out.stdout.join("");
      expect(allOutput).toContain("mode resolution");
    } finally {
      out.restore();
    }
  });
});

describe("extractDomMarkers", () => {
  it("extracts data-qfai attribute values from HTML", async () => {
    const { extractDomMarkers } = await import("../../src/core/prototyping/index.js");
    const html = `
      <div data-qfai="CON-UI-0001:search_input">Search</div>
      <table data-qfai="CON-UI-0001:orders_table">
        <tr><td>Row</td></tr>
      </table>
    `;
    const markers = extractDomMarkers(html);
    expect(markers).toEqual(["CON-UI-0001:orders_table", "CON-UI-0001:search_input"]);
  });

  it("deduplicates markers and sorts alphabetically", async () => {
    const { extractDomMarkers } = await import("../../src/core/prototyping/index.js");
    const html = `
      <div data-qfai="CON-UI-0001:btn_submit">Submit</div>
      <span data-qfai="CON-UI-0001:btn_submit">Submit Copy</span>
      <input data-qfai="CON-UI-0001:amount_input" />
    `;
    const markers = extractDomMarkers(html);
    expect(markers).toEqual(["CON-UI-0001:amount_input", "CON-UI-0001:btn_submit"]);
  });

  it("ignores elements with empty data-qfai", async () => {
    const { extractDomMarkers } = await import("../../src/core/prototyping/index.js");
    const html = `
      <div data-qfai="">Empty</div>
      <div data-qfai="   ">Whitespace</div>
      <div data-qfai="CON-UI-0001:valid">Valid</div>
    `;
    const markers = extractDomMarkers(html);
    expect(markers).toEqual(["CON-UI-0001:valid"]);
  });

  it("returns empty array for HTML without data-qfai", async () => {
    const { extractDomMarkers } = await import("../../src/core/prototyping/index.js");
    const html = `<div><p>No markers</p></div>`;
    const markers = extractDomMarkers(html);
    expect(markers).toEqual([]);
  });
});
