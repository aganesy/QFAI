/**
 * `qfai prototyping certify` relates the stored `validate.json` to the evidence
 * it is about to seal (#1107).
 *
 * Before this, certify checked three things about that file — it exists, its
 * `profile` is `prototyping`, its `counts.error` is 0
 * (`prototypingCertify.ts:286-319`) — and nothing that tied the result to the
 * tree. So a success recorded while a flat `review.json` was present let it seal
 * a per-spec-only layout the current `validate` rejects, and the certificate
 * recorded `validateRun.ranAt` as the CERTIFY instant: a timestamp manufactured
 * at the moment the question became unanswerable.
 *
 * mtime, with the limitations the sibling check at `:1216-1294` already
 * documents — coarse filesystem granularity, and not tamper-resistant. Linking
 * the certificate to the run by content digest is the stronger form and is a
 * separate decision. These rows pin that the relation exists at all.
 */
// QFAI:SPEC-0012:TC-0012-0445

import { mkdir, mkdtemp, readdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
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
  await writeFile(path.join(root, ".qfai/output/verify.json"), JSON.stringify(verifyJson), "utf-8");
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

/** Backdate every evidence file so the tree is older than the run. */
async function backdateEvidence(root: string, msBefore: number): Promise<void> {
  const when = new Date(Date.now() - msBefore);
  const evidence = path.join(root, ".qfai/evidence/prototyping");
  const visit = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
        continue;
      }
      await utimes(absolute, when, when);
    }
  };
  await visit(evidence);
}

async function stampValidateJson(root: string, generatedAt: string | null): Promise<void> {
  const body = JSON.stringify({
    profile: "prototyping",
    counts: { error: 0, warning: 0, info: 0 },
    ...(generatedAt === null ? {} : { generatedAt }),
  });
  await writeFile(path.join(root, ".qfai/report/validate.json"), body, "utf-8");
  await writeFile(path.join(root, ".qfai/output/validate.json"), body, "utf-8");
}

const PASS_VERIFY = { status: "PASS", scope: "prototyping" } as const;

describe("certify relates validate.json to the evidence it seals", () => {
  it("seals when every evidence file predates the run", async () => {
    const root = await newTempDir();
    await seedHappyPath(root, PASS_VERIFY);
    await backdateEvidence(root, 60_000);
    await stampValidateJson(root, new Date().toISOString());

    const lines = captureStderr();
    try {
      expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    } finally {
      vi.restoreAllMocks();
    }
    expect(lines.join("")).not.toContain("changed after");
  });

  it("refuses when an evidence file is newer than the run", async () => {
    // The #1107 sequence: validate passes, the evidence then changes, certify
    // is asked to seal it. The stored result is no longer a verdict on this
    // tree, and the three checks above it cannot tell.
    const root = await newTempDir();
    await seedHappyPath(root, PASS_VERIFY);
    await stampValidateJson(root, new Date(Date.now() - 60_000).toISOString());
    const touched = path.join(root, ".qfai/evidence/prototyping/iter-00/index.html");
    await utimes(touched, new Date(), new Date());

    const lines = captureStderr();
    try {
      expect(await runPrototypingCertify({ root, check: false })).toBe(2);
    } finally {
      vi.restoreAllMocks();
    }
    const out = lines.join("");
    expect(out).toContain("changed after");
    // The offending file is named, because "something changed" is not a repair.
    expect(out).toContain("iter-00/index.html");
    expect(out).toContain("qfai validate --profile prototyping");
  });

  it("records the run's own instant in the certificate, not certify's", async () => {
    const root = await newTempDir();
    await seedHappyPath(root, PASS_VERIFY);
    await backdateEvidence(root, 120_000);
    const ranAt = new Date(Date.now() - 60_000).toISOString();
    await stampValidateJson(root, ranAt);

    captureStderr();
    try {
      expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    } finally {
      vi.restoreAllMocks();
    }

    const cert = JSON.parse(
      await readFile(
        path.join(root, ".qfai/evidence/prototyping/completion-certificate.json"),
        "utf-8",
      ),
    ) as { validateRun: { ranAt: string }; generatedAt: string };
    // The distinction the old code lost: the run happened before the seal.
    expect(cert.validateRun.ranAt).toBe(ranAt);
    expect(Date.parse(cert.validateRun.ranAt)).toBeLessThan(Date.parse(cert.generatedAt));
  });

  it("still seals a validate.json from an earlier version, and says the check was skipped", async () => {
    // A missing `generatedAt` is an older writer, not a failed check. Refusing
    // it would reject every stored result written before the field existed, for
    // a condition none of them can express — and the next validate run closes
    // the window on its own.
    const root = await newTempDir();
    await seedHappyPath(root, PASS_VERIFY);
    await stampValidateJson(root, null);
    const touched = path.join(root, ".qfai/evidence/prototyping/iter-00/index.html");
    await utimes(touched, new Date(), new Date());

    const stdout: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown): boolean => {
      stdout.push(String(chunk));
      return true;
    });
    captureStderr();
    try {
      expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    } finally {
      vi.restoreAllMocks();
    }
    expect(stdout.join("")).toContain("carries no generatedAt");
  });
});
