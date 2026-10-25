/**
 * Abide's design tokens: every colour, size and font lives here.
 * Screens and components import from this file instead of hard-coding values,
 * so a design change only needs to happen in one place.
 */

export const Colors = {
  background: '#FAF7F2', // warm cream
  surface: '#FFFFFF', // cards sitting on the cream background
  primary: '#2F5D50', // deep green
  primarySoft: '#E3ECE8', // light green for highlights and the active tab indicator
  accent: '#E9A23B', // amber
  text: '#1F2A26',
  textSecondary: '#5E6B66',
  border: '#E8E2D8',
  overlay: 'rgba(31, 42, 38, 0.4)', // dims the screen behind a bottom sheet
} as const;

/** Soft verse highlight colours, light enough to read dark text on. */
export const HighlightColors = {
  yellow: '#FCE8A6',
  green: '#CFE5D8',
  blue: '#D3E3F3',
  pink: '#F6D5DC',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
} as const;

/**
 * On Android, `fontWeight` can't pick a weight from a custom font, so each
 * weight is loaded as its own font family (see `src/app/_layout.tsx`).
 */
export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;
