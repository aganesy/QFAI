export const DEFAULT_RENDER_VIEWPORTS = ["desktop", "mobile"] as const;

export type RenderEvidenceStatus = "captured" | "skipped" | "failed";

export type RenderEvidenceCaptured = {
  viewport: string;
  status: "captured";
  width: number;
  height: number;
  imagePath: string;
  htmlPath: string;
};

export type RenderEvidenceSkipped = {
  viewport: string;
  status: "skipped";
  width: number;
  height: number;
  skippedReason: string;
};

export type RenderEvidenceFailed = {
  viewport: string;
  status: "failed";
  width: number;
  height: number;
  error: string;
};

export type RenderEvidenceEntry =
  | RenderEvidenceCaptured
  | RenderEvidenceSkipped
  | RenderEvidenceFailed;

export type RenderEvidenceSummary = {
  status: RenderEvidenceStatus;
  requested: boolean;
  viewports?: string[];
  outputPath?: string;
};

export type RenderEvidenceScreen = {
  route: string;
  viewport: string;
} & RenderEvidenceEntry;

export type RenderEvidenceBundle = {
  renderEvidence: RenderEvidenceSummary;
  screens?: RenderEvidenceScreen[];
};

export type RenderEvidenceConfig = {
  enabled?: boolean;
  viewports?: string[];
  out?: string;
  baseUrl?: string;
  failOpen?: boolean;
};

export function normalizeRenderViewports(viewports?: string[] | null): string[] {
  const normalized = Array.isArray(viewports)
    ? viewports.map((item) => item.trim()).filter((item) => item.length > 0)
    : [];
  if (normalized.length > 0) {
    return Array.from(new Set(normalized));
  }
  return [...DEFAULT_RENDER_VIEWPORTS];
}

export function looksLikeDataUri(value: string): boolean {
  return value.trim().toLowerCase().startsWith("data:");
}

export function looksLikeInlineHtml(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes("<html") || trimmed.includes("<!doctype html") || trimmed.includes("<body");
}

export function looksLikeOversizedInlinePayload(value: string): boolean {
  return !value.includes("\n") && value.length > 500;
}

export function looksLikeInlineRenderPayload(value: string): boolean {
  if (looksLikeDataUri(value)) return true;
  if (value.toLowerCase().includes("base64,")) return true;
  if (looksLikeInlineHtml(value)) return true;
  if (looksLikeOversizedInlinePayload(value)) return true;
  return false;
}
