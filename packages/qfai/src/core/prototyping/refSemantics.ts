import { assertConcreteArtifactRef } from "./pathUtils.js";

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

export function isCanonicalScreenContractRef(ref: string): boolean {
  try {
    assertConcreteArtifactRef(ref);
  } catch {
    return false;
  }

  const match =
    /^\.qfai\/discussion\/[^/]+\/uiux\/40_screen_contracts\.md#([A-Za-z0-9][A-Za-z0-9._-]*)$/.exec(
      ref,
    );
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
 */
export function isSpecDeclarationRef(ref: string): boolean {
  try {
    assertConcreteArtifactRef(ref);
  } catch {
    return false;
  }

  return /^\.qfai\/specs\/[^/#]+\/01_Spec\.md#L[1-9]\d*$/.test(ref);
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
