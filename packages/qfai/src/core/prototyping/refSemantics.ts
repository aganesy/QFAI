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

export function isSpecDeclarationRef(ref: string): boolean {
  try {
    assertConcreteArtifactRef(ref);
  } catch {
    return false;
  }

  const match = /^\.qfai\/specs\/[^#]+\.md#(.+)$/.exec(ref);
  if (!match) {
    return false;
  }

  const fragment = match[1];
  if (!fragment) {
    return false;
  }
  return /^L[1-9]\d*$/.test(fragment) || /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(fragment);
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
