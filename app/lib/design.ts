// Modern Design System for Fair Scanner App
// Inspired by PLATA app with vibrant gradients and clean design

export const Colors = {
  // Primary Gradient Colors (PLATA-inspired)
  primary: '#065A4D',      // Darker green (matching logo)
  primaryDark: '#043D33',  // Even darker green for depth
  secondary: '#5F9EA0',    // Cadet Blue
  accent: '#065A4D',       // Darker green (matching logo)
  light: '#8BC34A',        // Lighter green for contrast
  
  // UI Colors
  white: '#FFFFFF',
  black: '#000000',
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  
  // Status Colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#007AFF',
  
  // Background Colors
  background: '#F8F9FA',
  cardBackground: '#FFFFFF',
  surface: '#FFFFFF',
  
  // Borders and Shadows
  border: '#E0E0E0',
  shadow: '#000000',
  
  // Special Colors
  badge: '#065A4D',        // Green badge (matching logo)
  discount: '#FF3B30',     // Red for discounts
  gradient: {
    start: '#065A4D',
    end: '#043D33'
  }
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 50,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
};

export const Shadows = {
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Images = {
  logo: 'https://eajuzgkhygkkzwkkrzef.supabase.co/storage/v1/object/sign/Assets/log-scanner-gradient2.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85NjhlMTE5MC0zYmE0LTRiNDEtYmI1MS1lMWNkZWJjNmMzYzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJBc3NldHMvbG9nLXNjYW5uZXItZ3JhZGllbnQyLnBuZyIsImlhdCI6MTc1NzAxMzI2NSwiZXhwIjoxNzg4NTQ5MjY1fQ.ua-OQLKWrIzIiBdVNumc8DBWw_67UUj_Dj8o4BkKG48',
  background: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80',
};

export const Icons = {
  Home: '🏠',
  Package: '📦',
  ShoppingCart: '🛒',
  Camera: '📷',
  Search: '🔍',
  Plus: '➕',
  ArrowLeft: '←',
  Check: '✅',
  AlertTriangle: '⚠️',
  User: '👤',
  Mail: '📧',
  Calendar: '📅',
  Percent: '%',
  Trash2: '🗑️',
  Edit: '✏️',
  FileText: '📄',
  CreditCard: '💳',
  Settings: '⚙️',
  RefreshCw: '🔄',
  X: '✕',
  Scan: '📱',
  Orders: '📋',
  Products: '🏷️',
  Stats: '📊',
};

// Gradient helper function
export const createGradient = (startColor: string, endColor: string) => ({
  colors: [startColor, endColor],
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
});

// Card styles
export const CardStyles = {
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    ...Shadows.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h4,
    color: Colors.text,
    flex: 1,
  },
};

// Button styles
export const ButtonStyles = {
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  secondary: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    backgroundColor: 'transparent',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
};
