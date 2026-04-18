/** Whispr — Material 3 Theme Configuration
 * Dynamic color seeding, typography, elevation, shape tokens.
 * Uses MD3 design tokens as CSS custom properties.
 */

/** MD3 Color scheme — dark mode primary */
export const theme = {
  // Seed color: Deep violet for security/privacy feel
  seed: '#7B61FF',

  // Surface colors (dark theme)
  colors: {
    primary: '#C9BFFF',
    onPrimary: '#2F1F8E',
    primaryContainer: '#4735A5',
    onPrimaryContainer: '#E5DEFF',
    secondary: '#C8C3DC',
    onSecondary: '#312C42',
    secondaryContainer: '#474359',
    onSecondaryContainer: '#E5DFF9',
    tertiary: '#ECB8D0',
    onTertiary: '#4A2538',
    tertiaryContainer: '#633B4F',
    onTertiaryContainer: '#FFD8E8',
    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFB4AB',
    background: '#1C1B1F',
    onBackground: '#E6E1E5',
    surface: '#1C1B1F',
    onSurface: '#E6E1E5',
    surfaceVariant: '#49454F',
    onSurfaceVariant: '#CAC4D0',
    outline: '#938F99',
    outlineVariant: '#49454F',
    inverseSurface: '#E6E1E5',
    inversePrimary: '#5D4EBE',
    surfaceDim: '#141316',
    surfaceBright: '#3B383E',
    surfaceContainerLowest: '#0F0D13',
    surfaceContainerLow: '#1D1B20',
    surfaceContainer: '#211F26',
    surfaceContainerHigh: '#2B2930',
    surfaceContainerHighest: '#36343B',
    // CRP-specific colors
    warnContainer: '#4A3800',
    onWarnContainer: '#FFE08D',
    annotateContainer: '#1A3F6F',
    onAnnotateContainer: '#C0E0FF',
  },

  // Typography — Roboto Flex
  typography: {
    fontFamily: "'Roboto Flex', 'Inter', 'Segoe UI', system-ui, sans-serif",
    displayLarge: { size: '57px', weight: 400, lineHeight: '64px', letterSpacing: '-0.25px' },
    headlineLarge: { size: '32px', weight: 400, lineHeight: '40px', letterSpacing: '0' },
    headlineMedium: { size: '28px', weight: 400, lineHeight: '36px', letterSpacing: '0' },
    titleLarge: { size: '22px', weight: 500, lineHeight: '28px', letterSpacing: '0' },
    titleMedium: { size: '16px', weight: 500, lineHeight: '24px', letterSpacing: '0.15px' },
    bodyLarge: { size: '16px', weight: 400, lineHeight: '24px', letterSpacing: '0.5px' },
    bodyMedium: { size: '14px', weight: 400, lineHeight: '20px', letterSpacing: '0.25px' },
    bodySmall: { size: '12px', weight: 400, lineHeight: '16px', letterSpacing: '0.4px' },
    labelLarge: { size: '14px', weight: 500, lineHeight: '20px', letterSpacing: '0.1px' },
    labelMedium: { size: '12px', weight: 500, lineHeight: '16px', letterSpacing: '0.5px' },
    labelSmall: { size: '11px', weight: 500, lineHeight: '16px', letterSpacing: '0.5px' },
  },

  // Shape
  shape: {
    corner: {
      none: '0px',
      extraSmall: '4px',
      small: '8px',
      medium: '12px',
      large: '16px',
      extraLarge: '28px',
      full: '9999px',
    },
    bubble: '18px',
    card: '12px',
  },

  // Elevation
  elevation: {
    level0: 'none',
    level1: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    level2: '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
    level3: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
  },
};

/** Generate CSS custom properties from theme */
export function generateThemeCSS(): string {
  const { colors, typography, shape } = theme;
  
  const colorVars = Object.entries(colors)
    .map(([key, value]) => `  --md-sys-color-${camelToKebab(key)}: ${value};`)
    .join('\n');

  return `
:root {
${colorVars}
  --md-sys-typescale-body-large-font: ${typography.fontFamily};
  --md-sys-shape-corner-small: ${shape.corner.small};
  --md-sys-shape-corner-medium: ${shape.corner.medium};
  --md-sys-shape-corner-large: ${shape.corner.large};
  --md-sys-shape-corner-full: ${shape.corner.full};
}`;
}

function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
