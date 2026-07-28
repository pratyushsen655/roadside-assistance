import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BOTTOM_NAV_HEIGHT = 70;

export const useBottomNavSafeArea = () => {
  const insets = useSafeAreaInsets();
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 28) : Math.max(insets.bottom, 12);
  
  const paddingBottom = BOTTOM_NAV_HEIGHT + safeBottom + 24;
  
  return {
    paddingBottom,
    bottomInset: safeBottom,
  };
};
