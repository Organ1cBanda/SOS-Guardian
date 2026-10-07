/**
 * Theme tokens for SOS Guardian Emergency App
 * Modern, high-contrast, safety-oriented palette
 */

export const colors = {
  // Emergency primary colors
  primary: '#DC2626',       // Deep Crimson Alert
  primaryBright: '#EF4444', // Bright Emergency Red
  primaryDark: '#991B1B',   // Dark Crimson
  primaryLight: '#FEE2E2',  // Soft Red Tint

  // Status colors
  success: '#10B981',       // Connected Green
  successLight: '#D1FAE5',
  warning: '#F59E0B',       // Amber Alert
  warningLight: '#FEF3C7',
  danger: '#EF4444',        // Disconnected / Critical
  dangerLight: '#FEE2E2',

  // Dark & Neutral palette (high contrast for emergency visibility)
  background: '#0F172A',    // Midnight Navy / Dark slate
  surface: '#1E293B',       // Card Dark Surface
  surfaceLight: '#334155',  // Elevated Card / Input background
  border: '#475569',        // Border Slate
  borderLight: '#64748B',

  // Typography colors
  textPrimary: '#F8FAFC',   // High contrast crisp white
  textSecondary: '#94A3B8', // Muted slate text
  textMuted: '#64748B',     // Low emphasis
  textDark: '#0F172A',      // For light badges

  // Accent & Actions
  accentBlue: '#38BDF8',
  whatsappGreen: '#25D366', // Official WhatsApp green
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.75)',
  dangerPulse: 'rgba(239, 68, 68, 0.35)',
};

export const typography = {
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
  },
  button: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sosDisplay: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
};
