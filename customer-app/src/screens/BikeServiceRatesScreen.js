// src/screens/BikeServiceRatesScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import GlobalBottomNav from '../components/GlobalBottomNav';

const { width } = Dimensions.get('window');

const BIKE_SERVICES = [
  { id: '1', name: 'Engine Repair', desc: 'Diagnosis + basic repair', rate: '₹299', icon: 'engine-outline', lib: 'MaterialCommunityIcons' },
  { id: '2', name: 'Oil Change', desc: 'Engine oil + labour', rate: '₹149', icon: 'oil-can', lib: 'FontAwesome5' },
  { id: '3', name: 'Tyre Puncture Fix', desc: 'On-spot puncture repair', rate: '₹79', icon: 'car-tire-alert', lib: 'MaterialCommunityIcons' },
  { id: '4', name: 'Battery Jump Start', desc: 'Dead battery revival', rate: '₹99', icon: 'flash-outline', lib: 'Ionicons' },
  { id: '5', name: 'Chain Repair / Adjustment', desc: 'Chain fix or tightening', rate: '₹59', icon: 'link', lib: 'Feather' },
  { id: '6', name: 'Brake Adjustment', desc: 'Front & rear brake check', rate: '₹49', icon: 'alert-octagon-outline', lib: 'MaterialCommunityIcons' },
  { id: '7', name: 'Fuel Delivery', desc: '1L petrol delivered to you', rate: '₹120', icon: 'gas-station-outline', lib: 'MaterialCommunityIcons' },
  { id: '8', name: 'Full Bike Inspection', desc: '30-point safety checkup', rate: '₹199', icon: 'clipboard-check-outline', lib: 'MaterialCommunityIcons' },
];

export default function BikeServiceRatesScreen({ navigation }) {
  const { t } = useTranslation();

  const handleInfoPress = (service) => {
    Alert.alert(
      t(`bikeService.${service.id}.name`, service.name),
      `${t(`bikeService.${service.id}.desc`, service.desc)}\n\n${t('bikeRates.baseRate', 'Base Rate')}: ${service.rate}\n\n${t('bikeRates.infoDetails', 'Includes on-spot diagnosis and technician labor for standard issue.')}`,
      [{ text: t('common.ok', 'OK') }]
    );
  };

  const handleRequest = () => {
    navigation.navigate('Request', { vehicleType: 'bike', serviceType: 'other' });
  };

  const renderIcon = (service) => {
    const color = '#E8192C';
    const size = 24;
    if (service.lib === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={service.icon} size={size} color={color} />;
    } else if (service.lib === 'FontAwesome5') {
     return <FontAwesome5 name={service.icon} size={20} color={color} solid />;    } else {
      return <Ionicons name={service.icon} size={size} color={color} />;
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#E8192C" />

      {/* 1. TOP HEADER BAR */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeftBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <MaterialCommunityIcons name="motorbike" size={24} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.headerTitle}>{t('bikeRates.title', 'Bike Services')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. SELECTED SERVICE BANNER */}
        <View style={styles.selectedServiceCard}>
          <View style={styles.bannerRow}>
            <View style={styles.bikeIconContainer}>
              <MaterialCommunityIcons name="motorbike" size={42} color="#E8192C" />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>{t('bikeRates.bannerTitle', 'Roadside Bike Assistance')}</Text>
              <Text style={styles.bannerSubtitle}>{t('bikeRates.bannerSubtitle', 'Mechanic reaches you in ~15 mins')}</Text>
              <View style={styles.etaBadge}>
                <Ionicons name="location-outline" size={12} color="#E8192C" style={{ marginRight: 4 }} />
                <Text style={styles.etaBadgeText}>{t('bikeRates.nearestMechanic', 'Nearest mechanic: 1.2 km away')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. SERVICE RATE LIST */}
        <View style={styles.rateCardContainer}>
          {BIKE_SERVICES.map((item, index) => (
            <View key={item.id}>
              <View style={styles.serviceRow}>
                <View style={styles.serviceIconBg}>
                  {renderIcon(item)}
                </View>
                <View style={styles.serviceTextContainer}>
                  <Text style={styles.serviceName}>{t(`bikeService.${item.id}.name`, item.name)}</Text>
                  <Text style={styles.serviceDesc}>{t(`bikeService.${item.id}.desc`, item.desc)}</Text>
                </View>
                <View style={styles.rateRightContainer}>
                  <Text style={styles.serviceRate}>{item.rate}</Text>
                  <TouchableOpacity onPress={() => handleInfoPress(item)} style={styles.infoBtn}>
                    <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>
              {index < BIKE_SERVICES.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* 4. EXTRA WORK NOTICE BANNER */}
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={20} color="#B57A00" style={styles.warningIcon} />
          <Text style={styles.warningText}>
            {t('bikeRates.warningMessage', 'Additional charges may apply if mechanic finds extra issues. You will approve before any extra work begins.')}
          </Text>
        </View>

        {/* 5. BOTTOM CTA SECTION */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity style={styles.ctaButton} onPress={handleRequest} activeOpacity={0.9}>
            <Text style={styles.ctaButtonText}>{t('bikeRates.requestButton', 'Request Bike Mechanic')}</Text>
          </TouchableOpacity>
          <Text style={styles.ctaFooterText}>
            {t('bikeRates.footerNotice', 'Final amount shared after mechanic assessment')}
          </Text>
        </View>
      </ScrollView>

      {/* BOTTOM NAVIGATION BAR */}
      <GlobalBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#E8192C',
    height: 60,
    marginTop: StatusBar.currentHeight || 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerLeftBtn: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  selectedServiceCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#E8192C',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bikeIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 6,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEAEA',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  etaBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#E8192C',
  },
  rateCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  serviceIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  serviceTextContainer: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 3,
  },
  serviceDesc: {
    fontSize: 11,
    color: '#6B7280',
  },
  rateRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceRate: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#E8192C',
    marginRight: 8,
  },
  infoBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  warningIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  ctaContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  ctaButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#E8192C',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#E8192C',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: 8,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  ctaFooterText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
