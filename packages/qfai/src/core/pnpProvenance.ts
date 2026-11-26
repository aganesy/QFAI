import { createRequire } from "node:module";
import path from "node:path";

interface PnpApi {
  findPackageLocator(issuer: string): unknown;
  getPackageInformation(locator: unknown): unknown;
  resolveToUnqualified(request: string, issuer: string): unknown;
}

function isPnpApi(value: unknown): value is PnpApi {
  return (
    typeof value === "object" &&
    value !== null &&
    "findPackageLocator" in value &&
    typeof value.findPackageLocator === "function" &&
    "getPackageInformation" in value &&
    typeof value.getPackageInformation === "function" &&
    "resolveToUnqualified" in value &&
    typeof value.resolveToUnqualified === "function"
  );
}

/** Query the resolver already loaded for this CLI, without loading the target's PnP file. */
export function resolveActivePnpPackage(directory: string): string | null {
  if (!process.versions.pnp) return null;
  try {
    const api: unknown = createRequire(import.meta.url)("pnpapi");
    if (!isPnpApi(api)) return null;
    const issuer = path.join(directory, "package.json");
    const locator = api.findPackageLocator(issuer);
    if (typeof locator !== "object" || locator === null) return null;
    const info = api.getPackageInformation(locator);
    if (
      typeof info !== "object" ||
      info === null ||
      !("packageLocation" in info) ||
      typeof info.packageLocation !== "string" ||
      path.relative(directory, info.packageLocation) !== ""
    ) {
      return null;
    }
    const selected = api.resolveToUnqualified("qfai", issuer);
    return typeof selected === "string" && path.isAbsolute(selected) ? selected : null;
  } catch {
    // A failed resolution supplies no proof that this copy belongs to the project.
    return null;
  }
}
