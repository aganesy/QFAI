/**
 * Provider registry with optional registration and fail-open semantics.
 *
 * Registration is synchronous. Lookup returns a discriminated union
 * so callers can handle absence without try/catch.
 */

import type { BrowserProvider, ProviderLookupResult } from "./types.js";

export class ProviderRegistry {
  private providers = new Map<string, BrowserProvider>();

  register(provider: BrowserProvider): void {
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
}
