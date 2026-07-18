import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx,svelte}"],

  // Files to exclude
  exclude: [],

  // Design tokens — mirrors docs/DESIGN.md
  theme: {
    extend: {
      tokens: {
        colors: {
          primary: { value: "#0F172A", description: "Deep ink" },
          "on-primary": { value: "#FFFFFF" },
          secondary: { value: "#64748B", description: "Slate" },
          "on-secondary": { value: "#FFFFFF" },
          tertiary: { value: "#3B82F6", description: "Clear Blue — interaction" },
          "on-tertiary": { value: "#FFFFFF" },
          "tertiary-container": { value: "#DBEAFE" },
          "on-tertiary-container": { value: "#1E3A5F" },
          neutral: { value: "#FAFAFA", description: "Light stone" },
          "neutral-container": { value: "#F4F4F5" },
          "neutral-border": { value: "#E4E4E7", description: "Hairlines and dividers" },
          surface: { value: "#FFFFFF" },
          "on-surface": { value: "#18181B", description: "Near-black body text" },
          "on-surface-variant": { value: "#71717A" },
          error: { value: "#EF4444" },
          "on-error": { value: "#FFFFFF" },
        },
        fonts: {
          sans: { value: "Inter, system-ui, sans-serif" },
          mono: { value: "JetBrains Mono, 'Fira Code', monospace" },
        },
        fontSizes: {
          xs: { value: "0.75rem" },
          sm: { value: "0.8125rem" },
          md: { value: "0.9375rem" },
          lg: { value: "1rem" },
          xl: { value: "1.25rem" },
          "2xl": { value: "1.75rem" },
        },
        fontWeights: {
          normal: { value: "400" },
          medium: { value: "500" },
          semibold: { value: "600" },
          bold: { value: "700" },
        },
        lineHeights: {
          tight: { value: "1.3" },
          normal: { value: "1.5" },
          relaxed: { value: "1.6" },
        },
        letterSpacings: {
          tight: { value: "-0.02em" },
          normal: { value: "0" },
          wide: { value: "0.01em" },
        },
        spacing: {
          0: { value: "0" },
          1: { value: "4px" },
          2: { value: "8px" },
          3: { value: "12px" },
          4: { value: "16px" },
          5: { value: "20px" },
          6: { value: "24px" },
          8: { value: "32px" },
          10: { value: "40px" },
          12: { value: "48px" },
          16: { value: "64px" },
        },
        radii: {
          none: { value: "0" },
          xs: { value: "2px" },
          sm: { value: "4px" },
          md: { value: "8px" },
          lg: { value: "12px" },
          xl: { value: "16px" },
          full: { value: "9999px" },
        },
        shadows: {
          sm: { value: "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
          md: { value: "0 4px 6px -1px rgb(0 0 0 / 0.08)" },
          lg: { value: "0 10px 25px -5px rgb(0 0 0 / 0.1)" },
        },
      },
    },
  },

  // Global CSS — apply base body styles
  globalCss: {
    "html, body": {
      fontFamily: "Inter, system-ui, sans-serif",
      color: "{colors.on-surface}",
      backgroundColor: "{colors.surface}",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    },
    "*": {
      borderColor: "{colors.neutral-border}",
    },
  },

  // The output directory for your css system
  outdir: "styled-system",
});
