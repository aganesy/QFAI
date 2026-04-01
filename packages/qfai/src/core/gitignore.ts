/**
 * Shared constants for QFAI-managed .gitignore block.
 * Used by both `qfai init` (writer) and validators (reader).
 */

export const QFAI_GITIGNORE_MARKER =
  "# QFAI \u2013 generated / transient output (managed by `qfai init`)";

/** Essential gitignore entries that must be present alongside the marker. */
export const QFAI_GITIGNORE_REQUIRED_ENTRIES: readonly string[] = [
  ".qfai/report/*",
  ".qfai/evidence/*",
  ".qfai/review/*",
  "!.qfai/review/review-*/",
  "!.qfai/review/review-*/**",
  ".qfai/discussion/discussion-*/",
] as const;

export const QFAI_GITIGNORE_BLOCK = [
  QFAI_GITIGNORE_MARKER,
  ".qfai/report/*",
  "!.qfai/report/README.md",
  ".qfai/evidence/*",
  "!.qfai/evidence/README.md",
  ".qfai/review/*",
  "!.qfai/review/README.md",
  "!.qfai/review/review-*/",
  "!.qfai/review/review-*/**",
  ".qfai/discussion/discussion-*/",
  "",
].join("\n");
