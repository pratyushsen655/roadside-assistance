import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      // isConnected is false when offline
      setIsOffline(state.isConnected === false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  const dynamicPaddingTop = Math.max(insets.top, 24);

  return (
    <Animated.View 
      entering={SlideInUp.duration(300)} 
      exiting={SlideOutUp.duration(300)}
      style={[styles.bannerContainer, { paddingTop: dynamicPaddingTop }]}
    >
      <View style={styles.bannerContent}>
        <Text style={styles.bannerIcon}>📡</Text>
        <Text style={styles.bannerText}>You are currently offline. Checking connection...</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E293B', // Sleek dark slate
    paddingBottom: 12,
    paddingHorizontal: 16,
    zIndex: 99999,
    borderBottomWidth: 2,
    borderBottomColor: '#EF4444', // Sleek thin red accent line
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  bannerText: {
    color: '#F8FAFC', // Slate 50
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
