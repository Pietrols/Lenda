// Lenda mobile theme - ported from the web design spec (dark palette is default).
// Colors are hsl() strings (React Native supports these natively).
// Spacing and radius are in density-independent pixels (numbers), not rem.

export const colors = {
  background: "hsl(220, 13%, 9%)",
  foreground: "hsl(220, 20%, 97%)",

  card: "hsl(220, 13%, 12%)",
  cardForeground: "hsl(220, 20%, 97%)",

  popover: "hsl(220, 13%, 12%)",
  popoverForeground: "hsl(220, 20%, 97%)",

  primary: "hsl(42, 60%, 57%)",
  primaryForeground: "hsl(220, 13%, 9%)",

  secondary: "hsl(220, 13%, 16%)",
  secondaryForeground: "hsl(220, 20%, 97%)",

  muted: "hsl(220, 13%, 16%)",
  mutedForeground: "hsl(220, 9%, 55%)",

  accent: "hsl(220, 13%, 16%)",
  accentForeground: "hsl(220, 20%, 97%)",

  destructive: "hsl(0, 62%, 30%)",
  destructiveForeground: "hsl(0, 0%, 98%)",

  border: "hsl(220, 13%, 18%)",
  input: "hsl(220, 13%, 18%)",
  ring: "hsl(42, 60%, 57%)",

  gold: "hsl(42, 60%, 57%)",
  goldGlow: "hsl(42, 80%, 70%)",

  success: "hsl(142, 71%, 45%)",
  warning: "hsl(38, 92%, 50%)",
  error: "hsl(0, 84%, 60%)",
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
