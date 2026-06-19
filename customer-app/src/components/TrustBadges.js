// src/components/TrustBadges.js
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const items = [
  { icon: 'shield-check-outline', label: ['Trusted', 'Professionals'] },
  { icon: 'percent', label: ['Affordable', 'Pricing'] },
  { icon: 'clock-outline', label: ['On-time', 'Service'] },
  { icon: 'headset', label: ['Customer', 'Support'] },
];

const TrustBadges = () => {
  const { width } = Dimensions.get('window');
  const badgeSize = Math.min(70, width / 5); // responsive size
  return (
    <View style={styles.container}>
      {items.map((item, idx) => (
        <View key={idx} style={styles.item}>
          <View style={[styles.circle, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}>
            <MaterialCommunityIcons name={item.icon} size={badgeSize * 0.5} color={'#E8192C'} />
          </View>
          <Text style={styles.label}>{item.label[0]}{'\n'}{item.label[1]}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  item: {
    width: '23%', // 4 items, some spacing
    alignItems: 'center',
    marginBottom: 12,
  },
  circle: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E8192C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    marginTop: 6,
    color: '#111827',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default TrustBadges;

