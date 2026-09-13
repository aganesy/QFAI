/**
 * A project `qfai prototyping certify --scope saas-package` can seal, and the
 * validate signal that lets `--upgrade-scope full` promote it.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { hashDesignMd } from "../../src/core/design/designMd.js";
import { SAAS_PACKAGE_SKIPPED_GATES } from "../../src/core/saasPackage/skippedGates.js";

/** Where certify writes the certificate, relative to the project root. */
export const CERTIFICATE_REL = ".qfai/evidence/prototyping/completion-certificate.json";

const DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme SaaS"',
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

const FINAL_HTML =
  "<!doctype html>\n<html><head><style>body { font-family: Inter, system-ui, sans-serif; }</style></head>" +
  "<body><main><h1>Acme</h1></main></body></html>\n";

async function writeText(root: string, rel: string, body: string): Promise<void> {
  const file = path.join(root, ...rel.split("/"));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, "utf-8");
}

/**
 * A SaaS-tenant project with complete prototyping evidence and a passing
 * prototyping-scope validate and verify, so certify has nothing to refuse
 * except what the scope leaves out.
 */
export async function seedSaasPackageCertifyProject(root: string): Promise<void> {
  await writeText(
    root,
    "qfai.config.yaml",
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
  );
  await writeText(
    root,
    ".qfai/specs/spec-0014/01_Spec.md",
    "---\nsurface_type: ui-bearing\n---\n\n# spec-0014\n",
  );
  await writeText(root, "DESIGN.md", DESIGN_MD);
  await writeText(root, ".qfai/evidence/prototyping/iter-00/index.html", FINAL_HTML);
  const validateBody = JSON.stringify({
    profile: "prototyping",
    counts: { error: 0, warning: 0, info: 0 },
  });
  await writeText(root, ".qfai/report/validate.json", validateBody);
  await writeText(root, ".qfai/output/validate.json", validateBody);
  await writeText(
    root,
    ".qfai/output/verify.json",
    JSON.stringify({ status: "PASS", scope: "prototyping" }),
  );
  await writeText(
    root,
    ".qfai/evidence/prototyping/prototyping.json",
    JSON.stringify({
      mode: { effective: "standard", source: "explicit-request", rationale: "test" },
      surface: "web",
      runId: "run-saas-package",
      designMd: { path: "DESIGN.md", sha256: hashDesignMd(DESIGN_MD) },
      specsCovered: ["0014"],
      reviewerGate: {
        result: "PASS",
        signoff: { reviewerId: "test-reviewer", timestamp: "2026-05-27T00:00:00Z" },
      },
      iterations: [{ index: 0 }],
    }),
  );
}

/**
 * The `qfai validate --profile saas-package` signal with every gate the
 * saas-package scope skipped reported as passing, at its canonical path.
 */
export async function seedSaasPackageGatesPassing(root: string): Promise<void> {
  const gates: Record<string, { status: "PASS" }> = {};
  for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
    gates[gate] = { status: "PASS" };
  }
  await writeText(
    root,
    ".qfai/report/validate-saas-package.json",
    JSON.stringify({ profile: "saas-package", counts: { error: 0, warning: 0, info: 0 }, gates }),
  );
}
