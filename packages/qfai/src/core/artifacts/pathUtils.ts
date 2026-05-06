import path from "node:path";

const ALLOWED_ARTIFACT_EXTENSIONS = new Set([".md", ".json", ".png", ".html"]);

export interface ArtifactRefOptions {
  repoRoot: string;
  absolutePath: string;
  line?: number;
  anchor?: string;
}

export function toRepoRelativeArtifactRef(options: ArtifactRefOptions): string {
  if (options.line !== undefined && options.anchor !== undefined) {
    throw new Error("Artifact ref cannot specify both line and anchor.");
  }

  const repoRoot = path.resolve(options.repoRoot);
  const absolutePath = path.resolve(options.absolutePath);
  const relativePath = toRepoRelativeArtifactPath(repoRoot, absolutePath);

  if (options.line !== undefined) {
    if (!Number.isInteger(options.line) || options.line <= 0) {
      throw new Error(`Artifact ref line must be a positive integer: ${options.line}`);
    }
    return `${relativePath}#L${options.line}`;
  }

  if (options.anchor !== undefined) {
    const anchor = normalizeAnchor(options.anchor);
    return `${relativePath}#${anchor}`;
  }

  return relativePath;
}

export function toConcreteArtifactRef(repoRoot: string, refOrPath: string): string {
  if (isConcreteArtifactRef(refOrPath)) {
    return normalizeConcreteArtifactRef(refOrPath);
  }

  const resolvedPath = path.isAbsolute(refOrPath)
    ? refOrPath
    : path.resolve(path.resolve(repoRoot), refOrPath);
  return toRepoRelativeArtifactRef({
    repoRoot,
    absolutePath: resolvedPath,
  });
}

export function assertConcreteArtifactRef(ref: string): void {
  normalizeConcreteArtifactRef(ref);
}

/**
 * Browser QA providers emit scheme-prefixed logical refs (e.g.
 * `provider:playwright:<phase>`, `phase:<name>`, `surface:<name>`,
 * `input:<field>`, `html:<slug>`) alongside real file paths. These refs must
 * not be rejected by the concrete-artifact normalizer — they are metadata
 * that preserves the provider-side causal trace for Browser QA evidence.
 */
export const BROWSER_QA_PASSTHROUGH_SCHEMES = new Set([
  "provider",
  "phase",
  "surface",
  "input",
  "html",
]);

export function isBrowserQaPassthroughRef(ref: string): boolean {
  const trimmed = ref.trim();
  const colonIndex = trimmed.indexOf(":");
  if (colonIndex <= 0) return false;
  return BROWSER_QA_PASSTHROUGH_SCHEMES.has(trimmed.slice(0, colonIndex));
}

export function normalizeBrowserQaEvidenceRef(root: string, ref: string): string {
  if (isBrowserQaPassthroughRef(ref)) {
    return ref.trim();
  }
  return toConcreteArtifactRef(root, ref);
}

export function isConcreteArtifactRef(ref: string): boolean {
  try {
    normalizeConcreteArtifactRef(ref);
    return true;
  } catch {
    return false;
  }
}

export function normalizeConcreteArtifactRef(ref: string): string {
  const trimmed = ref.trim();
  if (trimmed.length === 0) {
    throw new Error("Artifact ref must not be empty.");
  }
  if (trimmed.includes("\\")) {
    throw new Error(`Artifact ref must use POSIX separators: ${trimmed}`);
  }
  if (trimmed.startsWith("specs:")) {
    throw new Error(`Synthetic artifact ref is not allowed: ${trimmed}`);
  }
  if (path.isAbsolute(trimmed)) {
    throw new Error(`Absolute artifact ref is not allowed: ${trimmed}`);
  }
  if (trimmed.endsWith("/")) {
    throw new Error(`Directory artifact ref is not allowed: ${trimmed}`);
  }

  const hashIndex = trimmed.indexOf("#");
  const artifactPath = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
  const fragment = hashIndex >= 0 ? trimmed.slice(hashIndex + 1) : undefined;

  const normalizedPath = path.posix.normalize(artifactPath);
  if (normalizedPath !== artifactPath) {
    throw new Error(`Artifact ref path must already be normalized: ${trimmed}`);
  }
  if (!normalizedPath.startsWith(".qfai/")) {
    throw new Error(`Artifact ref must be repo-root relative under .qfai/: ${trimmed}`);
  }
  if (normalizedPath.includes("/../") || normalizedPath.endsWith("/..")) {
    throw new Error(`Artifact ref must not escape .qfai/: ${trimmed}`);
  }

  const extension = path.posix.extname(normalizedPath);
  if (!ALLOWED_ARTIFACT_EXTENSIONS.has(extension)) {
    throw new Error(`Artifact ref extension is not allowed: ${trimmed}`);
  }
  if (
    normalizedPath === ".qfai/evidence/prototyping.json" ||
    normalizedPath === ".qfai/evidence/prototyping/prototyping.json"
  ) {
    throw new Error(`Self-ref is not allowed: ${trimmed}`);
  }

  if (extension === ".md") {
    const anchor = normalizeOptionalFragment(fragment, trimmed);
    return `${normalizedPath}#${anchor}`;
  }

  if (extension === ".json") {
    const pointer = normalizeOptionalFragment(fragment, trimmed);
    if (!pointer.startsWith("/")) {
      throw new Error(`JSON artifact ref requires a JSON pointer fragment: ${trimmed}`);
    }
    return `${normalizedPath}#${pointer}`;
  }

  if (fragment !== undefined) {
    throw new Error(`Binary/HTML artifact refs must not include a fragment: ${trimmed}`);
  }

  return normalizedPath;
}

function toRepoRelativeArtifactPath(repoRoot: string, absolutePath: string): string {
  const relativePath = path.relative(repoRoot, absolutePath);
  if (
    relativePath.length === 0 ||
    relativePath === "." ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Artifact path must stay within repo root: ${absolutePath}`);
  }

  const normalized = relativePath.replaceAll("\\", "/");
  if (!normalized.startsWith(".qfai/")) {
    throw new Error(`Artifact path must stay under .qfai/: ${absolutePath}`);
  }
  if (normalized.endsWith("/")) {
    throw new Error(`Directory artifact path is not allowed: ${absolutePath}`);
  }

  const extension = path.posix.extname(normalized);
  if (!ALLOWED_ARTIFACT_EXTENSIONS.has(extension)) {
    throw new Error(`Artifact path extension is not allowed: ${absolutePath}`);
  }

  return normalized;
}

function normalizeAnchor(anchor: string): string {
  const normalized = anchor.trim().replace(/^#+/, "");
  if (normalized.length === 0 || normalized.includes("\\")) {
    throw new Error(`Artifact ref anchor is invalid: ${anchor}`);
  }
  return normalized;
}

function normalizeOptionalFragment(fragment: string | undefined, originalRef: string): string {
  if (fragment === undefined) {
    throw new Error(`Artifact ref fragment is required: ${originalRef}`);
  }
  const normalized = fragment.trim();
  if (normalized.length === 0 || normalized.includes("\\")) {
    throw new Error(`Artifact ref fragment is invalid: ${originalRef}`);
  }
  return normalized;
}
