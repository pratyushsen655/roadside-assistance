import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function LocationSelectorBar({ currentLocation }) {
  const navigation = useNavigation();

  // Split currentLocation into short name and full address
  const locationParts = currentLocation ? currentLocation.split(',') : ['Current Location'];
  const shortName = locationParts[0]?.trim();
  const fullAddress = currentLocation || 'Fetching location...';

  return (
    <View style={styles.container}>
      {/* Left Section: Location Info */}
      <TouchableOpacity
        style={styles.leftSection}
        onPress={() => navigation.navigate('AddressBook')}
        activeOpacity={0.7}
      >
        <View style={styles.locationRow}>
          <Ionicons name="location" size={18} color="#E8192C" style={styles.pinIcon} />
          <Text style={styles.locationLabel} numberOfLines={1}>
            {shortName}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#E8192C" style={styles.chevronIcon} />
        </View>
        <Text style={styles.fullAddressText} numberOfLines={1}>
          {fullAddress}
        </Text>
      </TouchableOpacity>

      {/* Right Section: Rewards & Profile */}
      <View style={styles.rightSection}>
        {/* Rewards / Points Indicator */}
        <TouchableOpacity
          style={styles.rewardsButton}
          onPress={() => navigation.navigate('Referral')}
          activeOpacity={0.7}
        >
          <Ionicons name="pie-chart-outline" size={20} color="#6B7280" />
          <Text style={styles.pointsText}>240/600</Text>
        </TouchableOpacity>

        {/* Profile Circle Icon */}
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Account')}
          activeOpacity={0.7}
        >
          <View style={styles.profileIconBg}>
            <Ionicons name="person" size={16} color="#4B5563" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  leftSection: {
    width: '60%',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  pinIcon: {
    marginRight: 4,
  },
  locationLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#E8192C',
    marginRight: 4,
  },
  chevronIcon: {
    marginTop: 2,
  },
  fullAddressText: {
    fontSize: 13,
    color: '#6B6B6B',
    paddingLeft: 22,
  },
  rightSection: {
    width: '40%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  rewardsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  profileButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
