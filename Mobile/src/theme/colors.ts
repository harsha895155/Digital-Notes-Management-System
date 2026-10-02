export const Colors = {
  background: '#F5EBDD',     // Warm ivory background
  dark: '#24160F',           // Dark espresso
  primary: '#8B4F27',        // Signature MindDesk warm brown
  primaryDark: '#6E3E1E',
  primaryLight: '#A76435',
  accent: '#D69A55',         // Gold/amber accent
  card: '#FFFDF8',           // Warm cream card
  cardSecondary: '#FAF4EB',
  secondary: '#E8D2B5',      // Warm beige
  border: '#E8DCB5',
  borderLight: '#F0E6D8',
  textDark: '#24160F',
  textMuted: '#7A6658',
  textLight: '#FFFDF8',
  danger: '#C84B31',
  dangerLight: '#FBEBE8',
  success: '#3D7A5A',
  successLight: '#EBF4EF',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  shadow: '#24160F',
};

export const Shadows = {
  small: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  large: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};
