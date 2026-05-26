/**
 * `qfai prototyping certify` verify.json#scope discriminator
 * (spec-0012 Phase 3 / REQ-0012-0064).
 *
 * Asserts:
 *   (a) scope=="prototyping" is accepted (cert seals successfully).
 *   (b) scope=="atdd"/"implement"/"full" is rejected with exit 2 and
 *       stderr names the offending scope.
 *   (c) scope absent (back-compat) is accepted — pre-CHG-005 fixtures
 *       remain green without touching their verify.json.
 *
 * Cross-spec note: the option-B circular-read class is enforced as a
 * validator finding by `reviewerGate.detectCertifyVerifyCircular`
 * (spec-0015 R-CERTIFY-VERIFY-CIRCULAR); this test exercises the
 * CLI-side certify gate so the operator sees the rejection before any
 * downstream validate pass runs.
 */

// QFAI:SPEC-0012:TC-0012-0445

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runPrototypingCertify } from "../../../../src/cli/commands/prototypingCertify.js";
import { hashDesignMd } from "../../../../src/core/design/designMd.js";

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

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cert-scope-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function seedHappyPath(root: string, verifyJson: object): Promise<void> {
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
    "---\nsurface_type: ui-bearing\n---\n\n# spec-0012\n",
    "utf-8",
  );
  await writeFile(path.join(root, "DESIGN.md"), CERT_DESIGN_MD, "utf-8");
  const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
  await mkdir(iter00, { recursive: true });
  await writeFile(path.join(iter00, "index.html"), CLEAN_FINAL_HTML, "utf-8");
  await mkdir(path.join(root, ".qfai/output"), { recursive: true });
  await mkdir(path.join(root, ".qfai/report"), { recursive: true });
  const validateBody = JSON.stringify({
    profile: "prototyping",
    counts: { error: 0, warning: 0, info: 0 },
  });
  await writeFile(path.join(root, ".qfai/report/validate.json"), validateBody, "utf-8");
  await writeFile(path.join(root, ".qfai/output/validate.json"), validateBody, "utf-8");
  await writeFile(
    path.join(root, ".qfai/output/verify.json"),
    JSON.stringify(verifyJson),
    "utf-8",
  );
  const protoBody = {
    mode: { effective: "standard", source: "explicit-request", rationale: "test" },
    surface: "web",
    runId: "run-scope-prototyping",
    designMd: { path: "DESIGN.md", sha256: hashDesignMd(CERT_DESIGN_MD) },
    specsCovered: ["0012"],
    reviewerGate: {
      result: "PASS",
      signoff: { reviewerId: "test-reviewer", timestamp: "2026-05-26T00:00:00Z" },
    },
    iterations: [{ index: 0 }],
  };
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
    JSON.stringify(protoBody),
    "utf-8",
  );
}

function captureStderr(): string[] {
  const lines: string[] = [];
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown): boolean => {
    lines.push(String(chunk));
    return true;
  });
  return lines;
}

describe("certify recognises verify.json#scope = prototyping", () => {
  it("accepts scope=prototyping and seals the certificate (exit 0)", async () => {
    const root = await newTempDir();
    await seedHappyPath(root, { status: "PASS", scope: "prototyping" });
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);
  });

  it("rejects scope=atdd with exit 2 and names the scope on stderr", async () => {
    const root = await newTempDir();
    await seedHappyPath(root, { status: "PASS", scope: "atdd" });
    const stderr = captureStderr();
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
    expect(stderr.join("")).toMatch(/scope is "atdd"/);
  });

  it("rejects scope=implement with exit 2", async () => {
    const root = await newTempDir();
    await seedHappyPath(root, { status: "PASS", scope: "implement" });
    const stderr = captureStderr();
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
    expect(stderr.join("")).toMatch(/scope is "implement"/);
  });

  it("rejects scope=full with exit 2", async () => {
    const root = await newTempDir();
    await seedHappyPath(root, { status: "PASS", scope: "full" });
    const stderr = captureStderr();
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
    expect(stderr.join("")).toMatch(/scope is "full"/);
  });

  it("accepts back-compat: scope absent (pre-CHG-005 fixtures)", async () => {
    const root = await newTempDir();
    await seedHappyPath(root, { status: "PASS" });
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(0);
  });
});
