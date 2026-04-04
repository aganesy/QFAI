/**
 * Provider registry with optional registration and fail-open semantics.
 *
 * Registration is synchronous. Lookup returns a discriminated union
 * so callers can handle absence without try/catch.
 */

import type { BrowserProvider, BrowserQaProvider, ProviderCapability, ProviderLookupResult } from "./types.js";

const CAPABILITY_METHOD_MAP = new Map<ProviderCapability, (keyof BrowserProvider)[]>([
  ["screenshot", ["captureScreenshot"]],
  ["viewport", ["captureViewport"]],
  ["dom", ["captureDom"]],
  ["interaction", ["runInteraction"]],
  ["visual", ["runVisual"]],
  ["accessibility", ["runAccessibility"]],
]);

function validateProvider(provider: BrowserProvider): void {
  for (const cap of provider.capabilities) {
    const requiredMethods = CAPABILITY_METHOD_MAP.get(cap);
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
}

export class ProviderRegistry {
  private providers = new Map<string, BrowserProvider>();

  register(provider: BrowserProvider): void {
    if (this.providers.has(provider.name)) {
      throw new Error(
        `Provider "${provider.name}" is already registered. Use a unique name or call replace().`,
      );
    }
    validateProvider(provider);
    this.providers.set(provider.name, provider);
  }

  /** Atomically replace an existing provider registration. */
  replace(provider: BrowserProvider): void {
    validateProvider(provider);
    this.providers.set(provider.name, provider);
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

  // --- Browser QA provider (WS-B canonical 4-phase) ---

  private qaProviders = new Map<string, BrowserQaProvider>();

  registerQaProvider(provider: BrowserQaProvider): void {
    if (this.qaProviders.has(provider.providerId)) {
      throw new Error(
        `BrowserQaProvider "${provider.providerId}" is already registered.`,
      );
    }
    this.qaProviders.set(provider.providerId, provider);
  }

  getQaProvider(name: string): BrowserQaProvider | undefined {
    return this.qaProviders.get(name);
  }

  getFirstQaProvider(): BrowserQaProvider | undefined {
    const first = this.qaProviders.values().next();
    return first.done ? undefined : first.value;
  }
}
