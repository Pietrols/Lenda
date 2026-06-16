// Theme mirrored from the web app's dark-mode CSS tokens
// (apps/web/src/index.css `.dark` / tailwind.config.ts). HSL tokens converted
// to hex so React Native can consume them directly.
//
//   --background  220 13% 9%   -> #14161a
//   --foreground  220 20% 97%  -> #f6f7f9
//   --card        220 13% 12%  -> #1b1d23
//   --primary     42 60% 57%   -> #d3ac50  (the gold accent)
//   --gold        42 60% 57%   -> #d3ac50
//   --gold-glow   42 80% 70%   -> #f0cb75
//   --muted       220 13% 16%  -> #23272e
//   --muted-fg    220 9% 55%   -> #828997
//   --destructive 0 62% 30%    -> #7c1d1d
//   --border      220 13% 18%  -> #282c34

export const colors = {
  background: "#14161a",
  foreground: "#f6f7f9",
  card: "#1b1d23",
  cardForeground: "#f6f7f9",
  primary: "#d3ac50",
  primaryForeground: "#14161a",
  muted: "#23272e",
  mutedForeground: "#828997",
  destructive: "#7c1d1d",
  destructiveForeground: "#fafafa",
  border: "#282c34",
  input: "#282c34",
  gold: "#d3ac50",
  goldGlow: "#f0cb75",
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fonts = {
  display: "Montserrat",
  body: "Space Grotesk",
} as const;

export type AppColors = typeof colors;
