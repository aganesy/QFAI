/**
 * Pure WCAG 2.x contrast ratio computation.
 * Accepts hex (#rrggbb) and rgb(r,g,b) formats only.
 */

export function computeContrastRatio(fg: string, bg: string): number | null {
  const fgLum = relativeLuminance(fg);
  const bgLum = relativeLuminance(bg);
  if (fgLum === null || bgLum === null) return null;

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(color: string): number | null {
  const rgb = parseColor(color);
  if (!rgb) return null;

  const r = sRGBtoLinear(rgb[0]);
  const g = sRGBtoLinear(rgb[1]);
  const b = sRGBtoLinear(rgb[2]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sRGBtoLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function parseColor(color: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color.trim());
  if (hex) {
    const [, r, g, b] = hex;
    if (!r || !g || !b) return null;
    return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
  }

  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(color.trim());
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }

  return null;
}
