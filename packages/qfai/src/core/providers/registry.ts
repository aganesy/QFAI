/**
 * Provider registry with optional registration and fail-open semantics.
 *
 * Registration is synchronous. Lookup returns a discriminated union
 * so callers can handle absence without try/catch.
 */

import type { BrowserProvider, ProviderCapability, ProviderLookupResult } from "./types.js";

const CAPABILITY_METHOD_MAP: Record<ProviderCapability, (keyof BrowserProvider)[]> = {
  screenshot: ["captureScreenshot"],
  viewport: ["captureViewport"],
  dom: ["captureDom"],
  interaction: ["runInteraction"],
  visual: ["runVisual"],
  accessibility: ["runAccessibility"],
};

export class ProviderRegistry {
  private providers = new Map<string, BrowserProvider>();

  register(provider: BrowserProvider): void {
    if (this.providers.has(provider.name)) {
      throw new Error(
        `Provider "${provider.name}" is already registered. Use a unique name or call replace().`,
      );
    }
    for (const cap of provider.capabilities) {
      const requiredMethods = CAPABILITY_METHOD_MAP[cap] as (keyof BrowserProvider)[] | undefined;
      if (!requiredMethods) {
        throw new Error(`Provider "${provider.name}" declares unknown capability "${cap}"`);
      }
      for (const method of requiredMethods) {
        if (typeof provider[method] !== "function") {
          throw new Error(
            `Provider "${provider.name}" declares capability "${cap}" but does not implement "${method}"`,
          );
        }
      }
    }
    this.providers.set(provider.name, provider);
  }

  /** Explicitly replace an existing provider registration. */
  replace(provider: BrowserProvider): void {
    this.providers.delete(provider.name);
    this.register(provider);
  }

  get(name: string): BrowserProvider | undefined {
    return this.providers.get(name);
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  getOrSkip(name: string): ProviderLookupResult {
    const provider = this.providers.get(name);
    if (provider) {
      return { status: "available", provider };
    }
    return { status: "skipped", provider: undefined };
  }
}
