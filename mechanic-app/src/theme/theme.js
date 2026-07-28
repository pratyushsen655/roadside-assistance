// src/theme/theme.js
export const COLORS = {
  // Brand Header & Accents
  headerBg: '#362A84',
  headerDark: '#2B216D',
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#EEF2FF',

  // Screen & Cards
  background: '#F4F5FB',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  divider: '#F1F5F9',

  // Money & Positives
  emerald: '#059669',
  emeraldLight: '#D1FAE5',
  green: '#10B981',

  // Status Badges
  badgeNewBg: '#FEE2E2',
  badgeNewText: '#EF4444',
  badgeInProgressBg: '#EEF2FF',
  badgeInProgressText: '#4F46E5',
  badgeCompletedBg: '#D1FAE5',
  badgeCompletedText: '#059669',
  badgeUpcomingBg: '#F1F5F9',
  badgeUpcomingText: '#64748B',

  // Actions & Warnings
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  warning: '#F59E0B',
  star: '#F59E0B',

  // Typography
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textWhite: '#FFFFFF',
};

export const SHADOWS = {
  card: {
    shadowColor: '#362A84',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
};
