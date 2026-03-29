/**
 * Critique adapter with fail-open semantics (NFR-0002).
 *
 * Wraps external critique providers with schema validation,
 * timeout enforcement, and fail-open on any error.
 */

import type { CritiqueInput, CritiqueProvider, CritiqueResponse, CritiqueResult } from "./types.js";

function isValidResponse(response: unknown): response is CritiqueResponse {
  if (typeof response !== "object" || response === null) return false;
  const r = response as Record<string, unknown>;
  if (typeof r.scores !== "object" || r.scores === null) return false;
  if (!Array.isArray(r.dimensions)) return false;
  if (!Array.isArray(r.suggestions)) return false;
  for (const v of Object.values(r.scores as Record<string, unknown>)) {
    if (typeof v !== "number") return false;
  }
  for (const d of r.dimensions) {
    if (typeof d !== "string") return false;
  }
  for (const s of r.suggestions) {
    if (typeof s !== "string") return false;
  }
  return true;
}

export class CritiqueAdapter {
  private provider: CritiqueProvider | undefined;
  private timeoutMs: number;

  constructor(options?: { timeoutMs?: number }) {
    this.timeoutMs = options?.timeoutMs ?? 30_000;
  }

  register(provider: CritiqueProvider): void {
    this.provider = provider;
  }

  async requestCritique(input: CritiqueInput): Promise<CritiqueResult> {
    if (!this.provider) {
      return { failOpen: true, response: undefined, reason: "no_provider" };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const responsePromise = this.provider.request(input);
      const abortPromise = new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => reject(new Error("timeout")));
      });

      const response = await Promise.race([responsePromise, abortPromise]);
      clearTimeout(timer);

      if (!isValidResponse(response)) {
        // eslint-disable-next-line no-console -- intentional fail-open warning
        console.warn(
          `[WARN] Critique fail-open: provider=${this.provider.name}, reason=invalid_response, iteration=${input.iteration}`,
        );
        return { failOpen: true, response: undefined, reason: "invalid_response" };
      }

      return { failOpen: false, response };
    } catch (error) {
      const reason =
        error instanceof Error && error.message === "timeout" ? "timeout" : "provider_unavailable";
      // eslint-disable-next-line no-console -- intentional fail-open warning
      console.warn(
        `[WARN] Critique fail-open: provider=${this.provider.name}, reason=${reason}, iteration=${input.iteration}`,
      );
      return { failOpen: true, response: undefined, reason };
    }
  }
}
