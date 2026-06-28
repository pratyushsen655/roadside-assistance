import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const SplashScreen = ({ navigation }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(bounceAnim, {
      toValue: 1,
      friction: 2,
      tension: 40,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      navigation.replace('Register');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation, bounceAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: bounceAnim }] }]}>
        <Text style={styles.logoIcon}>🔧</Text>
      </Animated.View>
      <Text style={styles.title}>RoadMitra Mechanic</Text>
      <Text style={styles.tagline}>Your workshop on wheels</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#00BFA5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 60,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tagline: {
    color: '#aaaaaa',
    fontSize: 16,
  },
});

export default SplashScreen;
