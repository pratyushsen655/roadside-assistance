// customer-app/src/screens/MoreVehiclesScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import GlobalBottomNav from '../components/GlobalBottomNav';

export default function MoreVehiclesScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleVehicleSelect = (vehicleType) => {
    navigation.navigate('Request', { vehicleType: vehicleType === 'ev' ? 'e-vehicle' : vehicleType });
  };

  const handleOtherSelect = () => {
    navigation.navigate('Request', { vehicleType: 'car' });
  };

  const extraCategories = [
    {
      id: 'truck',
      title: t('vehicle.truck', 'Truck'),
      subtitle: t('vehicle.repairServices', 'Repair & Services'),
      emoji: '🚚',
      onPress: () => handleVehicleSelect('truck'),
    },
    {
      id: 'tractor',
      title: t('vehicle.tractor', 'Tractor'),
      subtitle: t('vehicle.repairServices', 'Repair & Services'),
      emoji: '🚜',
      onPress: () => handleVehicleSelect('tractor'),
    },
    {
      id: 'bus',
      title: t('vehicle.bus', 'Bus'),
      subtitle: t('vehicle.repairServices', 'Repair & Services'),
      emoji: '🚌',
      onPress: () => handleVehicleSelect('bus'),
    },
    {
      id: 'other',
      title: t('vehicle.other', 'Other'),
      subtitle: t('vehicle.exploreMore', 'Explore more services'),
      emoji: '🔧',
      onPress: handleOtherSelect,
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('vehicle.moreVehicles', 'More Vehicles')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          {t('vehicle.selectCategory', 'Select Vehicle Category')}
        </Text>

        <View style={styles.categoriesGrid}>
          {extraCategories.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.categoryCard}
              onPress={item.onPress}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={{ fontSize: 44, marginRight: 10 }}>{item.emoji}</Text>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.categoryCardText} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.categorySubText} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>
              <View style={styles.chevronWrapper}>
                <Ionicons name="chevron-forward" size={16} color="#E8192C" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Global Bottom Navigation */}
      <GlobalBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  container: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTextContainer: {
    flex: 1,
  },
  categoryCardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  categorySubText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  chevronWrapper: {
    alignSelf: 'flex-end',
    backgroundColor: '#FEF2F2',
    padding: 4,
    borderRadius: 12,
  },
});
