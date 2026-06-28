import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BOTTOM_NAV_HEIGHT = 70;

export const useBottomNavSafeArea = () => {
  const insets = useSafeAreaInsets();
  
  // Tab bar base height is 70.
  // Add the bottom safe area inset (usually ~34px on gesture navigation devices, 0 on 3-button devices)
  // Plus 16px of comfortable extra breathing space.
  const paddingBottom = BOTTOM_NAV_HEIGHT + insets.bottom + 16;
  
  return {
    paddingBottom,
    bottomInset: insets.bottom,
  };
};
