// ─────────────────────────────────────────────────────────────────────────────
// LENDA DESIGN SPEC
// All design decisions live here. Edit this file to experiment with the look.
// ─────────────────────────────────────────────────────────────────────────────

export const designSpec = {
  // ── Colors ──────────────────────────────────────────────────────────────────
  colors: {
    // Base
    dark: "hsl(220, 13%, 9%)", // near-black dark background
    light: "hsl(220, 20%, 97%)", // off-white light background

    // Gold accent — single accent color used everywhere
    gold: "hsl(42, 60%, 57%)",
    goldGlow: "hsl(42, 80%, 70%)",

    // Semantic
    primary: "hsl(42, 60%, 57%)", // gold as primary
    success: "hsl(142, 71%, 45%)",
    warning: "hsl(38, 92%, 50%)",
    error: "hsl(0, 84%, 60%)",
  },

  // ── Typography ───────────────────────────────────────────────────────────────
  fonts: {
    display: "Montserrat", // headings, uppercase, black weight
    body: "Space Grotesk", // body text
  },

  // ── Border Radius ────────────────────────────────────────────────────────────
  radius: {
    default: "0.75rem", // rounded-xl feel
    card: "1rem",
    button: "0.75rem",
    pill: "9999px",
  },

  // ── Shadows ──────────────────────────────────────────────────────────────────
  shadows: {
    card: "0 4px 24px rgba(0,0,0,0.12)",
    glow: "0 0 40px hsl(42, 60%, 57%, 0.15)",
    goldGlow: "0 0 20px hsl(42, 80%, 70%, 0.3)",
  },

  // ── Animation ────────────────────────────────────────────────────────────────
  animation: {
    // GSAP ScrollTrigger — pinned sections
    pinned: {
      scrub: 0.6,
      anticipatePin: 1,
      pinnedEnd: "+=130%",
    },
    // GSAP ScrollTrigger — flowing sections
    flowing: {
      start: "top 75%",
      end: "top 45%",
      scrub: 0.5,
    },
    // Entrance patterns
    entrance: {
      fromLeft: { x: "-28vw", opacity: 0 },
      fromRight: { x: "26vw", opacity: 0 },
      fromBottom: { y: "18vh", opacity: 0 },
      withRotation: { rotateZ: -2, opacity: 0 },
    },
    // Exit patterns
    exit: {
      toLeft: { x: "-18vw", opacity: 0 },
      toRight: { x: "18vw", opacity: 0 },
      toTop: { y: "-10vh", opacity: 0 },
    },
    // Card float
    float: {
      duration: 3,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      translateY: "-6px",
    },
    // Stagger for card groups
    stagger: 0.12,
  },
};

// CSS variable map — these get applied in index.css
// Edit here to change the theme globally
export const cssVariables = {
  light: {
    "--background": "220 20% 97%",
    "--foreground": "220 13% 9%",
    "--card": "0 0% 100%",
    "--card-foreground": "220 13% 9%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "220 13% 9%",
    "--primary": "42 60% 57%",
    "--primary-foreground": "220 13% 9%",
    "--secondary": "220 14% 93%",
    "--secondary-foreground": "220 13% 9%",
    "--muted": "220 14% 93%",
    "--muted-foreground": "220 9% 46%",
    "--accent": "220 14% 93%",
    "--accent-foreground": "220 13% 9%",
    "--destructive": "0 84% 60%",
    "--destructive-foreground": "0 0% 98%",
    "--border": "220 13% 89%",
    "--input": "220 13% 89%",
    "--ring": "42 60% 57%",
    "--gold": "42 60% 57%",
    "--gold-glow": "42 80% 70%",
    "--lenda-dark": "220 13% 9%",
    "--lenda-light": "220 20% 97%",
    "--radius": "0.75rem",
  },
  dark: {
    "--background": "220 13% 9%",
    "--foreground": "220 20% 97%",
    "--card": "220 13% 12%",
    "--card-foreground": "220 20% 97%",
    "--popover": "220 13% 12%",
    "--popover-foreground": "220 20% 97%",
    "--primary": "42 60% 57%",
    "--primary-foreground": "220 13% 9%",
    "--secondary": "220 13% 16%",
    "--secondary-foreground": "220 20% 97%",
    "--muted": "220 13% 16%",
    "--muted-foreground": "220 9% 55%",
    "--accent": "220 13% 16%",
    "--accent-foreground": "220 20% 97%",
    "--destructive": "0 62% 30%",
    "--destructive-foreground": "0 0% 98%",
    "--border": "220 13% 18%",
    "--input": "220 13% 18%",
    "--ring": "42 60% 57%",
    "--gold": "42 60% 57%",
    "--gold-glow": "42 80% 70%",
    "--lenda-dark": "220 13% 9%",
    "--lenda-light": "220 20% 97%",
    "--radius": "0.75rem",
  },
};
