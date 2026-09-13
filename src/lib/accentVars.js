// Semantic ACCENT layer — the deep, fully-themeable color system for page
// components (icons, cards, highlights, gradients, glows, focus rings).
//
// Colors are delivered through CSS custom properties so any opacity / shadow /
// gradient can reference them uniformly:
//   --accent-1 / --accent-1-fg   page PRIMARY   (+ legible text variant)
//   --accent-2 / --accent-2-fg   page SECONDARY
//   --accent-3 / --accent-3-fg   page TERTIARY
//   --accent-success/-danger/-warning/-info (+ -fg)  semantic status roles
//
// The theme system stores palette color NAMES or hex strings; CustomThemeStyle
// converts the active page's roles to HSL and injects these vars (light + dark).
// Components use the AV class strings below (or inline
// `[hsl(var(--accent-1)/X)]`), which are LITERAL so Tailwind's JIT emits them.

import { TinyColor } from "@ctrl/tinycolor";
import {
  hexToHsl,
  hexToHslString,
  readableForeground,
} from "@/lib/tailwindPalette.js";

// WCAG contrast ratio between two hex colors.
function contrastRatio(a, b) {
  const srgbToLin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const lum = (hex) => {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
  };
  const L1 = lum(a), L2 = lum(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

// hsl triplet -> hex (round-trip via TinyColor).
function hslToHex({ h, s, l }) {
  return new TinyColor({ h, s, l }).toHexString();
}

// For text sitting on a two-tone accent gradient, pick the candidate that
// maximizes the WORST-case contrast across every stop — so the label stays
// legible across the whole gradient (a single-role rf can fail on the far stop).
// Candidates include pure black/white plus strongly lightened/darkened versions
// of the accent hue, guaranteeing WCAG-AA legible text on gradient fills.
function gradientForeground(...hexes) {
  const base = hexes[0] || "#6366f1";
  const candidates = [
    "#000000",
    "#ffffff",
    new TinyColor(base).lighten(28).toHexString(),
    new TinyColor(base).darken(28).toHexString(),
  ];
  let best = "#000000", bestRatio = -1;
  for (const c of candidates) {
    let worst = Infinity;
    for (const h of hexes) worst = Math.min(worst, contrastRatio(c, h));
    if (worst > bestRatio) {
      bestRatio = worst;
      best = c;
    }
  }
  return best;
}

// Accent-derived TEXT color that is legible ON the page/card background in the
// given mode, while preserving the accent's hue so it still reads as the brand
// color. This mirrors the pre-system convention of dark text in light mode and
// light text in dark mode (previously hard-coded amber utilities).
// dark text in light mode, light text in dark mode. If the raw accent already
// meets WCAG AA against the background we keep it (closest to the original
// shade); otherwise we march its lightness toward the needed extreme (darker in
// light mode, lighter in dark mode) and stop at the first AA-passing shade —
// fixing the black-on-dark bug for bright accents. No lightness cap is applied
// because saturated hues (e.g. green/cyan) can require reaching quite dark/light
// to clear AA; the first pass keeps the result as close to the original as
// possible.
function pageReadableAccent(accentHex, bgHex, mode) {
  const isDark = mode === "dark";
  const accent = hexToHsl(accentHex) || { h: 220, s: 80, l: 50 };
  const bg =
    hexToHsl(bgHex || (isDark ? "#0f172a" : "#f8fafc")) ||
    { h: 0, s: 0, l: isDark ? 12 : 98 };

  // Already passes AA — keep the brand hue exactly (matches original shade).
  if (contrastRatio(hslToHex(accent), hslToHex(bg)) >= 4.5) {
    return hslToHex(accent);
  }
  // March lightness toward the extreme until the text is readable.
  const step = isDark ? 1 : -1;
  let l = accent.l;
  while (isDark ? l <= 100 : l >= 0) {
    const cand = { ...accent, l };
    if (contrastRatio(hslToHex(cand), hslToHex(bg)) >= 4.5) {
      return hslToHex(cand);
    }
    l += step;
  }
  // Extreme reached without AA (theoretically impossible vs black/white) — fall
  // back to the far extreme so the text is at least maximally contrasted.
  return hslToHex({ ...accent, l: isDark ? 100 : 0 });
}

// The set of role -> CSS var base names.
export const ACCENT_ROLE_VARS = {
  primary: "--accent-1",
  secondary: "--accent-2",
  tertiary: "--accent-3",
  success: "--accent-success",
  danger: "--accent-danger",
  warning: "--accent-warning",
  info: "--accent-info",
};

// ---------------------------------------------------------------------------
// CSS variable value builder.
// baseVar  = CSS custom property base name (e.g. "--accent-1")
// lightColor = hex string for light mode accent
// darkColor  = optional hex string for dark mode accent
// bgHex = the page/card background hex for the current mode (used for -foreground)
//
// Returns { "var": "H S% L%", "var-fg": "H S% L%", ... }
// -fg = accent text readable ON the page background (derived per mode by
//       pageReadableAccent so it's legible in both light and dark)
// -gradFg = text on the accent gradient/solid fill (derived by gradientForeground)
// -foreground = generic readable text on the background (contrasts with bg)
// ---------------------------------------------------------------------------
function roleVars(baseVar, mainHex, fgHex, gradHex, onBg) {
  return {
    [baseVar]: hexToHslString(mainHex),
    [`${baseVar}-fg`]: hexToHslString(fgHex),
    [`${baseVar}-gradFg`]: hexToHslString(gradHex),
    [`${baseVar}-foreground`]: hexToHslString(onBg),
  };
}

export function buildAccentVars(accent, status, darkAccent, darkStatus, lightBg, darkBg) {
  const a = accent || {};
  const s = status || {};
  const da = darkAccent || {};
  const ds = darkStatus || {};

  const resolve = (light, dark, isDark) => (isDark && dark ? dark : light);

  const build = (isDark, bgHex) => {
    const colors = {
      "1": resolve(a.primary, da.primary, isDark) || "#6366f1",
      "2": resolve(a.secondary, da.secondary, isDark) || "#8b5cf6",
      "3": resolve(a.tertiary, da.tertiary, isDark) || resolve(a.secondary, da.secondary, isDark) || "#8b5cf6",
      success: resolve(s.success, ds.success, isDark) || "#10b981",
      danger: resolve(s.danger, ds.danger, isDark) || "#ef4444",
      warning: resolve(s.warning, ds.warning, isDark) || "#f59e0b",
      info: resolve(s.info, ds.info, isDark) || "#0ea5e9",
    };
    // The stop a gradient typically transitions TO from each role.
    const partners = {
      "1": colors["2"], "2": colors["3"], "3": colors["1"],
      success: colors["2"], danger: colors["2"], warning: colors["2"], info: colors["2"],
    };
    const bases = {
      "1": "--accent-1", "2": "--accent-2", "3": "--accent-3",
      success: "--accent-success", danger: "--accent-danger",
      warning: "--accent-warning", info: "--accent-info",
    };
    const out = {};
    for (const key of Object.keys(colors)) {
      const baseVar = bases[key];
      const mainHex = colors[key];
      // -fg = accent text legible ON the page background (per mode), NOT text on
      // the accent swatch. This restores the original light/dark readability.
      const fgHex = pageReadableAccent(mainHex, bgHex, isDark ? "dark" : "light");
      const onBg = bgHex ? readableForeground(bgHex) : fgHex;
      const gradHex = gradientForeground(mainHex, partners[key]);
      Object.assign(out, roleVars(baseVar, mainHex, fgHex, gradHex, onBg));
    }
    return out;
  };

  return { light: build(false, lightBg), dark: build(true, darkBg) };
}

function varsToCss(vars) {
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
}

// Full <style> text for a page's accent roles (both :root and .dark).
// lightBg/darkBg = page background hex for each mode (used for -foreground contrast).
export function buildAccentCss(accent, status, darkAccent, darkStatus, lightBg, darkBg) {
  const { light, dark } = buildAccentVars(accent, status, darkAccent, darkStatus, lightBg, darkBg);
  return `:root { ${varsToCss(light)} }\n.dark { ${varsToCss(dark)} }`;
}
