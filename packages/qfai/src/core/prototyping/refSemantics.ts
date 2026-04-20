import { assertConcreteArtifactRef, isBrowserQaPassthroughRef } from "./pathUtils.js";

export function assertConcreteArtifactRefs(fieldPath: string, refs: string[]): void {
  if (refs.length === 0) {
    throw new Error(`${fieldPath} must not be empty.`);
  }

  for (const ref of refs) {
    try {
      assertConcreteArtifactRef(ref);
    } catch (error) {
      throw new Error(`${fieldPath} contains a non-concrete artifact ref: ${formatError(error)}`);
    }
  }
}

/**
 * Browser QA evidence refs may include scheme-prefixed logical refs such as
 * `provider:playwright:<phase>`. Those are valid observational references
 * emitted by Browser QA providers and must pass assertion alongside concrete
 * `.qfai/...` file refs.
 */
export function assertBrowserQaEvidenceRefs(fieldPath: string, refs: string[]): void {
  if (refs.length === 0) {
    throw new Error(`${fieldPath} must not be empty.`);
  }

  for (const ref of refs) {
    if (isBrowserQaPassthroughRef(ref)) continue;
    try {
      assertConcreteArtifactRef(ref);
    } catch (error) {
      throw new Error(
        `${fieldPath} contains a non-concrete artifact ref and is not a Browser QA scheme ref: ${formatError(error)}`,
      );
    }
  }
}

const DEFAULT_SCREEN_CONTRACT_PATTERN =
  /^\.qfai\/discussion\/[^/]+\/uiux\/40_screen_contracts\.md#([A-Za-z0-9][A-Za-z0-9._-]*)$/;

export function isCanonicalScreenContractRef(
  ref: string,
  discussionDirRelative = ".qfai/discussion",
): boolean {
  try {
    assertConcreteArtifactRef(ref);
  } catch {
    return false;
  }

  const match =
    discussionDirRelative === ".qfai/discussion"
      ? DEFAULT_SCREEN_CONTRACT_PATTERN.exec(ref)
      : new RegExp(
          `^${discussionDirRelative.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[^/]+/uiux/40_screen_contracts\\.md#([A-Za-z0-9][A-Za-z0-9._-]*)$`,
        ).exec(ref);
  if (!match) {
    return false;
  }

  const fragment = match[1];
  if (!fragment) {
    return false;
  }

  return !fragment.startsWith("screen:");
}

/**
 * A `declaredRef` is the citation of a spec's declaration of a UI route.
 *
 * rev11 semantic closure:
 * - The only canonical declaration source is the spec's `01_Spec.md`.
 * - The only canonical fragment form is `#L<positive integer>`.
 * - `notes.md`, `appendix.md`, `discussion.md`, `.json`, `#anchor` etc. are NOT declarations.
 *
 * `specsDirRelative` is the repo-relative specs directory (e.g. `.qfai/specs`
 * by default). Callers that override `paths.specsDir` in `qfai.config.yaml`
 * should pass the configured path so the regex matches configured layout.
 */
// Canonical default regex for the stock `.qfai/specs/` layout. Kept as a
// regex literal so static snapshot tests can assert the grammar.
const DEFAULT_SPEC_DECLARATION_PATTERN = /^\.qfai\/specs\/[^/#]+\/01_Spec\.md#L[1-9]\d*$/;

export function isSpecDeclarationRef(ref: string, specsDirRelative = ".qfai/specs"): boolean {
  try {
    assertConcreteArtifactRef(ref);
  } catch {
    return false;
  }

  if (specsDirRelative === ".qfai/specs") {
    return DEFAULT_SPEC_DECLARATION_PATTERN.test(ref);
  }

  // Escape regex metacharacters in the caller-supplied specsDir segment and
  // reuse the same line-ref-only tail as the canonical regex so custom
  // `paths.specsDir` values stay grammatically identical.
  const escaped = specsDirRelative.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}/[^/#]+/01_Spec\\.md#L[1-9]\\d*$`);
  return pattern.test(ref);
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
