/**
 * Color utilities for accessing Tailwind v4 theme colors and converting between formats
 *
 * In Tailwind v4, colors defined in @theme become CSS custom properties.
 * This module provides utilities to access these theme colors programmatically
 * and convert them to RGB for interpolation in animations.
 */

/**
 * Converts a hex color string to RGB values
 * @param hex - Hex color string (e.g., "#000000" or "#fff")
 * @returns RGB object with r, g, b values (0-255)
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  const cleanHex = hex.replace("#", "");

  // Handle shorthand hex (e.g., "#fff" -> "#ffffff")
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split("")
          .map((char) => char + char)
          .join("")
      : cleanHex;

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  return { r, g, b };
}

/**
 * Gets a Tailwind theme CSS variable value
 * In Tailwind v4, @theme colors are exposed as CSS custom properties
 * Works in both browser and Remotion rendering contexts
 */
function getThemeColor(variableName: string, fallback: string): string {
  if (typeof window !== "undefined" && window.document) {
    const root = window.document.documentElement;
    const value = getComputedStyle(root).getPropertyValue(variableName).trim();
    return value || fallback;
  }
  // During Remotion server-side rendering, CSS variables aren't available
  // Return the fallback which matches the Tailwind @theme definition
  return fallback;
}

/**
 * Tailwind v4 theme colors from @theme in src/index.css
 * These access the CSS custom properties that Tailwind generates from @theme
 */
export const COLORS = {
  // Base colors (from Tailwind @theme)
  white: getThemeColor("--color-white", "#ffffff"),
  black: getThemeColor("--color-black", "#000000"),
  shadowGrey: getThemeColor("--color-shadow-grey", "#272727"),
  silver: getThemeColor("--color-silver", "#adadad"),
  teal: getThemeColor("--color-teal", "#008282"),
  blueSlate: getThemeColor("--color-blue-slate", "#526f76"),
  eggshell: getThemeColor("--color-eggshell", "#eee8d5"),
  ivoryMist: getThemeColor("--color-ivory-mist", "#fdf6e3"),

  // Dark mode semantic colors (from Tailwind @theme)
  darkBg: getThemeColor("--color-dark-bg", "#000000"),
  darkBgSecondary: getThemeColor("--color-dark-bg-secondary", "#272727"),
  darkText: getThemeColor("--color-dark-text", "#ffffff"),
  darkElement: getThemeColor("--color-dark-element", "#adadad"),
  darkHighlight: getThemeColor("--color-dark-highlight", "#008282"),

  // Light mode semantic colors (from Tailwind @theme)
  lightBg: getThemeColor("--color-light-bg", "#fdf6e3"),
  lightBgSecondary: getThemeColor("--color-light-bg-secondary", "#eee8d5"),
  lightText: getThemeColor("--color-light-text", "#000000"),
  lightElement: getThemeColor("--color-light-element", "#272727"),
  lightHighlight: getThemeColor("--color-light-highlight", "#008282"),
} as const;

/**
 * RGB values derived from Tailwind theme colors using hexToRgb
 * Used for color interpolation in animations (e.g., spring-based color transitions)
 */
export const COLOR_RGB = {
  black: hexToRgb(COLORS.black),
  white: hexToRgb(COLORS.white),
  shadowGrey: hexToRgb(COLORS.shadowGrey),
  silver: hexToRgb(COLORS.silver),
  teal: hexToRgb(COLORS.teal),
  blueSlate: hexToRgb(COLORS.blueSlate),
  eggshell: hexToRgb(COLORS.eggshell),
  ivoryMist: hexToRgb(COLORS.ivoryMist),
} as const;
