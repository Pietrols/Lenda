// Lenda mobile theme - the approved light/gold direction ("1B Warm/Textured"):
// off-white background with gold as a confident supplementary accent. Values
// mirror the web app's light palette (:root in apps/web/src/index.css), which
// is the committed source of truth for the approved design system.
// Colors are hsl() strings (React Native supports these natively).
// Spacing and radius are in density-independent pixels (numbers), not rem.

export const colors = {
  background: "hsl(220, 20%, 97%)",
  foreground: "hsl(220, 13%, 9%)",

  card: "hsl(0, 0%, 100%)",
  cardForeground: "hsl(220, 13%, 9%)",

  popover: "hsl(0, 0%, 100%)",
  popoverForeground: "hsl(220, 13%, 9%)",

  primary: "hsl(42, 60%, 57%)",
  primaryForeground: "hsl(220, 13%, 9%)",

  secondary: "hsl(220, 14%, 93%)",
  secondaryForeground: "hsl(220, 13%, 9%)",

  muted: "hsl(220, 14%, 93%)",
  mutedForeground: "hsl(220, 9%, 46%)",

  accent: "hsl(220, 14%, 93%)",
  accentForeground: "hsl(220, 13%, 9%)",

  destructive: "hsl(0, 84%, 60%)",
  destructiveForeground: "hsl(0, 0%, 98%)",

  border: "hsl(220, 13%, 89%)",
  input: "hsl(220, 13%, 89%)",
  ring: "hsl(42, 60%, 57%)",

  gold: "hsl(42, 60%, 57%)",
  goldGlow: "hsl(42, 80%, 70%)",

  success: "hsl(142, 71%, 35%)",
  warning: "hsl(35, 92%, 40%)",
  error: "hsl(0, 84%, 50%)",

  // Semantic surfaces derived from the accents. Use these instead of inline
  // hsla() strings so a future palette change stays a one-file edit.
  goldTint: "hsla(42, 60%, 57%, 0.12)",
  successTint: "hsla(142, 71%, 45%, 0.12)",
  errorTint: "hsla(0, 84%, 60%, 0.10)",
  // Dark scrims stay dark in a light theme: they sit over content/photos.
  scrim: "hsla(220, 13%, 9%, 0.55)",
  imageScrim: "hsla(220, 13%, 9%, 0.75)",
  dotInactive: "hsla(0, 0%, 100%, 0.5)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 9999,
} as const;

export const typography = {
  // Custom fonts: each weight is its own family name (RN does not derive
  // weight from a single family the way CSS does). Reference these directly.
  font: {
    displayBold: "Montserrat_700Bold",
    displayBlack: "Montserrat_900Black",
    bodyRegular: "SpaceGrotesk_400Regular",
    bodyMedium: "SpaceGrotesk_500Medium",
    bodySemibold: "SpaceGrotesk_600SemiBold",
    bodyBold: "SpaceGrotesk_700Bold",
  },
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
} as const;

export type Theme = typeof theme;
