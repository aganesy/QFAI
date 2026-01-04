import path from "node:path";

export function toRelativePath(root: string, target: string): string {
  if (!target) {
    return target;
  }
  if (!path.isAbsolute(target)) {
    return toPosixPath(target);
  }
  const relative = path.relative(root, target);
  if (!relative) {
    return ".";
  }
  return toPosixPath(relative);
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}
