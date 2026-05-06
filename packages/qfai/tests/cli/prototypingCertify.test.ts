/**
 * Tests for `qfai prototyping certify` and `qfai prototyping show-spec`
 * (v1.8.4 Phase 5).
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  runPrototypingCertify,
  runPrototypingShowSpec,
} from "../../src/cli/commands/prototypingCertify.js";
import { hashDesignMd } from "../../src/core/design/designMd.js";
import { COMPLETION_CERTIFICATE_REL_PATH } from "../../src/core/prototyping/certificate.js";

const CERT_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "visual:",
  "  colors:",
  '    primary:        "#1F2937"',
  '    secondary:      "#6366F1"',
  '    accent:         "#D97706"',
  '    surface:        "#FFFFFF"',
  '    surface_muted:  "#F3F4F6"',
  '    text:           "#111827"',
  '    text_muted:     "#6B7280"',
  '    danger:         "#DC2626"',
  '    warning:        "#F59E0B"',
  '    success:        "#10B981"',
  '    border:         "#E5E7EB"',
  '    overlay:        "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans:    "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm:   "0.25rem"',
  '    md:   "0.5rem"',
  '    lg:   "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "---",
  "",
  "# Brand Philosophy",
  "",
  "Restrained.",
  "",
].join("\n");

const CLEAN_FINAL_HTML =
  "<!doctype html>\n<html><head><style>body { font-family: Inter, system-ui, sans-serif; }</style></head>" +
  "<body><main><h1>Acme</h1></main></body></html>\n";

async function seedDesignMdAndFinalHtml(
  root: string,
  options: { iterIndex?: number; html?: string; designMd?: string } = {},
): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), options.designMd ?? CERT_DESIGN_MD, "utf-8");
  const iterIndex = options.iterIndex ?? 1;
  const iterDir = path.join(
    root,
    `.qfai/evidence/prototyping/iter-${String(iterIndex).padStart(2, "0")}`,
  );
  await mkdir(iterDir, { recursive: true });
  await writeFile(path.join(iterDir, "index.html"), options.html ?? CLEAN_FINAL_HTML, "utf-8");
}

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-cert-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function seedMinimalProject(root: string, opts?: { specMarker?: boolean }): Promise<void> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/output",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "",
    ].join("\n"),
    "utf-8",
  );
  await mkdir(path.join(root, ".qfai/specs/spec-0012"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/specs/spec-0012/01_Spec.md"),
    opts?.specMarker ? "---\nsurface_type: ui-bearing\n---\n\n# spec-0012\n" : "# spec-0012\n",
    "utf-8",
  );
  await writeFile(
    path.join(root, ".qfai/specs/spec-0012/02_User-stories.md"),
    "# stories\n",
    "utf-8",
  );
}

async function seedAllGatesPass(root: string): Promise<void> {
  // DESIGN.md compliance gate added in Phase 3b — every passing-gates
  // fixture seeds a parseable DESIGN.md plus a final-iter HTML free of
  // violations.
  await seedDesignMdAndFinalHtml(root);
  // v1.8.4 Phase 11.7+: certify now reads validate.json from
  // config.output.validateJsonPath (default: .qfai/report/validate.json),
  // not hardcoded .qfai/output/. Seed both locations so tests work
  // regardless of the default.
  await mkdir(path.join(root, ".qfai/report"), { recursive: true });
  await mkdir(path.join(root, ".qfai/output"), { recursive: true });
  const validateJson = JSON.stringify({ counts: { error: 0, warning: 0, info: 0 } });
  await writeFile(path.join(root, ".qfai/report/validate.json"), validateJson, "utf-8");
  await writeFile(path.join(root, ".qfai/output/validate.json"), validateJson, "utf-8");
  await writeFile(
    path.join(root, ".qfai/output/verify.json"),
    JSON.stringify({ status: "PASS" }),
    "utf-8",
  );
  await mkdir(path.join(root, ".qfai/evidence/prototyping"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
    JSON.stringify({
      mode: { effective: "standard", source: "explicit-request", rationale: "test" },
      surface: "web",
      runId: "run-test-2026",
      designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
      specsCovered: ["0012"],
      reviewerGate: {
        result: "PASS",
        signoff: { reviewerId: "test-reviewer", timestamp: "2026-04-27T00:00:00Z" },
      },
      iterations: [{ index: 0 }, { index: 1 }],
    }),
    "utf-8",
  );
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping/some-evidence.json"),
    "{}\n",
    "utf-8",
  );
}

describe("qfai prototyping certify (generate)", () => {
  it("writes completion-certificate.json when all gates pass", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);

    const exit = await runPrototypingCertify({ root, check: false });

    expect(exit).toBe(0);
    const certPath = path.join(root, COMPLETION_CERTIFICATE_REL_PATH);
    const body = JSON.parse(
      await (await import("node:fs/promises")).readFile(certPath, "utf-8"),
    ) as {
      runId: string;
      specsCovered: string[];
      reviewerSignoff: { reviewerId: string };
      iterationCount: number;
    };
    expect(body.runId).toBe("run-test-2026");
    expect(body.specsCovered).toEqual(["0012"]);
    expect(body.reviewerSignoff.reviewerId).toBe("test-reviewer");
    expect(body.iterationCount).toBe(2);
  });

  it("exits 2 when prototyping.json is missing", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });

  it("exits 2 when runId is missing", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await mkdir(path.join(root, ".qfai/evidence/prototyping"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      JSON.stringify({ mode: { effective: "standard", source: "test", rationale: "x" } }),
      "utf-8",
    );
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });

  it("exits 2 when validate.json reports errors", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root);
    // Override the validate.json that certify actually reads (default
    // config.output.validateJsonPath = .qfai/report/validate.json).
    await writeFile(
      path.join(root, ".qfai/report/validate.json"),
      JSON.stringify({ counts: { error: 3, warning: 0, info: 0 } }),
      "utf-8",
    );
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });

  it("exits 2 when verify.json status is not PASS", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root);
    await writeFile(
      path.join(root, ".qfai/output/verify.json"),
      JSON.stringify({ status: "FAIL" }),
      "utf-8",
    );
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });

  it("exits 2 when prototyping.json#iterations[] is empty", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // Override prototyping.json to have an empty iterations[] while
    // every other gate stays passing.
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      JSON.stringify({
        mode: { effective: "standard", source: "explicit-request", rationale: "test" },
        surface: "web",
        runId: "run-test-2026",
        designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
        specsCovered: ["0012"],
        reviewerGate: {
          result: "PASS",
          signoff: { reviewerId: "test-reviewer", timestamp: "2026-04-27T00:00:00Z" },
        },
        iterations: [],
      }),
      "utf-8",
    );
    expect(await runPrototypingCertify({ root, check: false })).toBe(2);
  });

  it("exits 2 when reviewerGate is not PASS", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root);
    // Re-seed prototyping.json without reviewerGate.result === PASS
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      JSON.stringify({
        mode: { effective: "standard", source: "test", rationale: "x" },
        runId: "run-x",
        designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
        reviewerGate: { result: "REVISE" },
      }),
      "utf-8",
    );
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });

  it("uses prototyping.json#specsCovered (frozen at cycle 0) — does NOT re-resolve at certify", async () => {
    // Plant a marker on a different spec id (`spec-0007`) AFTER cycle 0
    // would have run, while the frozen seed records `["0012"]`. The
    // certificate must reflect the frozen seed, not a re-resolution.
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // Add a marker-bearing spec that did NOT exist at cycle 0.
    await mkdir(path.join(root, ".qfai/specs/spec-0007"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/specs/spec-0007/01_Spec.md"),
      "---\nsurface_type: ui-bearing\n---\n\n# spec-0007\n",
      "utf-8",
    );
    await writeFile(
      path.join(root, ".qfai/specs/spec-0007/02_User-stories.md"),
      "# stories\n",
      "utf-8",
    );

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);

    const certPath = path.join(root, COMPLETION_CERTIFICATE_REL_PATH);
    const body = JSON.parse(
      await (await import("node:fs/promises")).readFile(certPath, "utf-8"),
    ) as { specsCovered: string[] };
    // Frozen seed wins — even though spec-0007 might now be resolvable.
    expect(body.specsCovered).toEqual(["0012"]);
  });

  it("exits 2 when prototyping.json#specsCovered is missing", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // Re-write prototyping.json without the specsCovered slot.
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      JSON.stringify({
        mode: { effective: "standard", source: "test", rationale: "x" },
        surface: "web",
        runId: "run-test-2026",
        designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
        reviewerGate: {
          result: "PASS",
          signoff: { reviewerId: "test-reviewer", timestamp: "2026-04-27T00:00:00Z" },
        },
        iterations: [{ index: 0 }, { index: 1 }],
      }),
      "utf-8",
    );
    expect(await runPrototypingCertify({ root, check: false })).toBe(2);
  });

  it("exits 2 when prototyping.json#specsCovered is malformed (empty array)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      JSON.stringify({
        mode: { effective: "standard", source: "test", rationale: "x" },
        surface: "web",
        runId: "run-test-2026",
        designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
        specsCovered: [],
        reviewerGate: {
          result: "PASS",
          signoff: { reviewerId: "test-reviewer", timestamp: "2026-04-27T00:00:00Z" },
        },
        iterations: [{ index: 0 }, { index: 1 }],
      }),
      "utf-8",
    );
    expect(await runPrototypingCertify({ root, check: false })).toBe(2);
  });

  it("accepts legacy reviewer signoff fields when issuing the certificate", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      JSON.stringify({
        mode: { effective: "standard", source: "test", rationale: "x" },
        surface: "web",
        runId: "run-x",
        designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
        specsCovered: ["0012"],
        reviewerGate: {
          result: "PASS",
          signoff: { reviewer: "legacy-reviewer", timestamp: "2026-04-27T00:00:00Z" },
        },
        iterations: [{ index: 0 }, { index: 1 }],
      }),
      "utf-8",
    );

    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);

    const certPath = path.join(root, COMPLETION_CERTIFICATE_REL_PATH);
    const body = JSON.parse(
      await (await import("node:fs/promises")).readFile(certPath, "utf-8"),
    ) as { reviewerSignoff: { reviewerId: string } };
    expect(body.reviewerSignoff.reviewerId).toBe("legacy-reviewer");
  });
});

describe("qfai prototyping certify --check", () => {
  it("exits 0 when certificate matches current evidence", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    expect(await runPrototypingCertify({ root, check: true })).toBe(0);
  });

  it("exits 2 when certificate is absent", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    expect(await runPrototypingCertify({ root, check: true })).toBe(2);
  });

  it("exits 2 when evidence has been modified after certify", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    await runPrototypingCertify({ root, check: false });
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/some-evidence.json"),
      '{"modified":true}\n',
      "utf-8",
    );
    expect(await runPrototypingCertify({ root, check: true })).toBe(2);
  });
});

describe("qfai prototyping show-spec", () => {
  it("returns 0 when a marker-bearing spec exists", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    expect(await runPrototypingShowSpec({ root })).toBe(0);
  });

  it("returns 2 when no spec has the prototyping marker", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: false });
    expect(await runPrototypingShowSpec({ root })).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// TC-3.6.x — DESIGN.md compliance gate + cert designMd binding
// ─────────────────────────────────────────────────────────────────────────

describe("qfai prototyping certify (TC-3.6.x DESIGN.md gate)", () => {
  it("TC-3.6.2: final HTML with one DESIGN.md violation → exit 2", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // Overwrite the final HTML with a violating color literal.
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/iter-01/index.html"),
      '<div style="color:#abcdef">x</div>\n',
      "utf-8",
    );
    expect(await runPrototypingCertify({ root, check: false })).toBe(2);
  });

  it("TC-3.6.3: no final iteration HTML → exit 2", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // Remove the seeded final HTML directory entirely.
    await rm(path.join(root, ".qfai/evidence/prototyping/iter-01"), {
      recursive: true,
      force: true,
    });
    expect(await runPrototypingCertify({ root, check: false })).toBe(2);
  });

  it("TC-3.6.4: empty violations array (clean HTML) → exit 0", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
  });

  it("anchors final HTML scan to prototyping.json#iterations[] (stale higher iter-NN ignored)", async () => {
    // Simulates a `qfai prototyping iterate --cycle 0` restart that left
    // a stale iter-14 directory on disk from a prior loop. Without
    // anchoring, certify would scan that stale dir and digest evidence
    // the current reviewer gate did not approve.
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // The fresh loop has 2 recorded iterations → accepted index = 1.
    // Plant a stale iter-14 with violating HTML.
    const staleDir = path.join(root, ".qfai/evidence/prototyping/iter-14");
    await mkdir(staleDir, { recursive: true });
    await writeFile(
      path.join(staleDir, "index.html"),
      '<span style="color:#abcdef">stale</span>\n',
      "utf-8",
    );
    // The accepted iter-01 is clean → certify must succeed.
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
  });

  it("exits 2 when the recorded final iter dir has no HTML (despite older iters with HTML)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // Wipe the recorded final iter (iter-01) but leave iter-00 with HTML.
    await rm(path.join(root, ".qfai/evidence/prototyping/iter-01"), {
      recursive: true,
      force: true,
    });
    const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
    await mkdir(iter00, { recursive: true });
    await writeFile(path.join(iter00, "index.html"), CLEAN_FINAL_HTML, "utf-8");
    // Certify must NOT fall back to iter-00 — that iter is not the
    // accepted iteration in prototyping.json.
    expect(await runPrototypingCertify({ root, check: false })).toBe(2);
  });

  it("TC-3.6.5: only the LAST iter is evaluated (older dirty iters ignored)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    // Add an older iter-00 with violating HTML; iter-01 (final) is clean.
    const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
    await mkdir(iter00, { recursive: true });
    await writeFile(
      path.join(iter00, "index.html"),
      '<span style="color:#abcdef">old</span>\n',
      "utf-8",
    );
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
  });

  it("TC-3.6.7: certificate.json includes designMd { path, sha256 }", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    const certBody = JSON.parse(
      await (
        await import("node:fs/promises")
      ).readFile(path.join(root, COMPLETION_CERTIFICATE_REL_PATH), "utf-8"),
    ) as { designMd: { path: string; sha256: string } };
    expect(certBody.designMd.path).toBe("DESIGN.md");
    expect(certBody.designMd.sha256).toBe(hashDesignMd(CERT_DESIGN_MD));
  });

  it("TC-3.6.8: designMd.sha256 is 64-char lowercase hex", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    const certBody = JSON.parse(
      await (
        await import("node:fs/promises")
      ).readFile(path.join(root, COMPLETION_CERTIFICATE_REL_PATH), "utf-8"),
    ) as { designMd: { sha256: string } };
    expect(certBody.designMd.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("TC-3.6.9: --check fails when DESIGN.md mutated after certify", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    // Mutate DESIGN.md by 1 byte → sha mismatch.
    await writeFile(path.join(root, "DESIGN.md"), `${CERT_DESIGN_MD}\n`, "utf-8");
    expect(await runPrototypingCertify({ root, check: true })).toBe(2);
  });
});
