// src/screens/ServiceRatesScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import GlobalBottomNav from '../components/GlobalBottomNav';

const { width } = Dimensions.get('window');

// ─── Vehicle Data ────────────────────────────────────────────────────────────

const VEHICLES = [
  {
    id: 'bike',
    label: 'Bike',
    emoji: '🏍️',
    icon: 'motorbike',
    iconLib: 'MCIcon',
    color: '#1565C0',
    lightColor: '#E3F2FD',
    basePrice: '₹200',
    tagline: 'Onwards',
    basePriceDesc: 'Base price (up to 5 km)',
    services: [
      { name: 'Flat Tyre Repair', desc: 'Puncture repair or tyre change', base: '₹150 – ₹300', extra: '+ ₹10 – ₹15' },
      { name: 'Fuel Delivery', desc: 'Fuel delivered to your location', base: '₹150', extra: '+ ₹10 – ₹15', note: '(+ Fuel Cost)' },
      { name: 'Jump Start (Battery)', desc: 'Jump start your vehicle battery', base: '₹200 – ₹400', extra: '+ ₹10 – ₹15' },
      { name: 'Towing Service', desc: 'Tow your bike to nearest garage', base: '₹300 – ₹500', extra: '+ ₹15 – ₹25' },
      { name: 'Lockout Assistance', desc: 'Unlock vehicle or open seat', base: '₹300 – ₹600', extra: '+ ₹10 – ₹15' },
    ],
    additional: [
      { icon: 'moon-outline', iconLib: 'Ionicons', label: 'Night Service (10 PM – 6 AM)', value: '+ ₹100 – ₹200' },
      { icon: 'speedometer-outline', iconLib: 'Ionicons', label: 'Highway Service', value: '+ ₹100' },
      { icon: 'rainy-outline', iconLib: 'Ionicons', label: 'Rain / Festival Surcharge', value: '+ 10% – 20%' },
      { icon: 'time-outline', iconLib: 'Ionicons', label: 'Waiting Charge (After 15 mins)', value: '₹2 – ₹5 / min' },
    ],
  },
  {
    id: 'car',
    label: 'Car',
    emoji: '🚗',
    icon: 'car',
    iconLib: 'MCIcon',
    color: '#1565C0',
    lightColor: '#E3F2FD',
    basePrice: '₹300',
    tagline: 'Onwards',
    basePriceDesc: 'Base price (up to 5 km)',
    services: [
      { name: 'Flat Tyre Repair', desc: 'Puncture repair or tyre change', base: '₹200 – ₹400', extra: '+ ₹15 – ₹20' },
      { name: 'Fuel Delivery', desc: 'Fuel delivered to your location', base: '₹200', extra: '+ ₹15 – ₹20', note: '(+ Fuel Cost)' },
      { name: 'Jump Start (Battery)', desc: 'Jump start your vehicle battery', base: '₹300 – ₹500', extra: '+ ₹15 – ₹20' },
      { name: 'Towing Service', desc: 'Tow your car to nearest garage', base: '₹500 – ₹800', extra: '+ ₹25 – ₹40' },
      { name: 'Lockout Assistance', desc: 'Unlock vehicle or open door', base: '₹400 – ₹700', extra: '+ ₹15 – ₹20' },
    ],
    additional: [
      { icon: 'moon-outline', iconLib: 'Ionicons', label: 'Night Service (10 PM – 6 AM)', value: '+ ₹100 – ₹200' },
      { icon: 'speedometer-outline', iconLib: 'Ionicons', label: 'Highway Service', value: '+ ₹100' },
      { icon: 'rainy-outline', iconLib: 'Ionicons', label: 'Rain / Festival Surcharge', value: '+ 10% – 20%' },
      { icon: 'time-outline', iconLib: 'Ionicons', label: 'Waiting Charge (After 15 mins)', value: '₹2 – ₹5 / min' },
    ],
  },
  {
    id: 'truck',
    label: 'Truck',
    emoji: '🚚',
    icon: 'truck',
    iconLib: 'MCIcon',
    color: '#E65100',
    lightColor: '#FFF3E0',
    basePrice: '₹1,500',
    tagline: 'Onwards',
    basePriceDesc: 'Base price (up to 5 km)',
    services: [
      { name: 'Flat Tyre Repair', desc: 'Puncture repair or tyre change', base: '₹500 – ₹800', extra: '+ ₹30 – ₹40' },
      { name: 'Fuel Delivery', desc: 'Fuel delivered to your location', base: '₹500', extra: '+ ₹30 – ₹40', note: '(+ Fuel Cost)' },
      { name: 'Jump Start (Battery)', desc: 'Jump start your vehicle battery', base: '₹600 – ₹1,000', extra: '+ ₹30 – ₹40' },
      { name: 'Towing Service', desc: 'Tow your truck to nearest garage', base: '₹1,500 – ₹2,500', extra: '+ ₹40 – ₹60' },
      { name: 'Lockout Assistance', desc: 'Unlock vehicle or open door', base: '₹600 – ₹1,000', extra: '+ ₹30 – ₹40' },
    ],
    additional: [
      { icon: 'moon-outline', iconLib: 'Ionicons', label: 'Night Service (10 PM – 6 AM)', value: '+ ₹200 – ₹400' },
      { icon: 'speedometer-outline', iconLib: 'Ionicons', label: 'Highway Service', value: '+ ₹200' },
      { icon: 'rainy-outline', iconLib: 'Ionicons', label: 'Rain / Festival Surcharge', value: '+ 10% – 20%' },
      { icon: 'time-outline', iconLib: 'Ionicons', label: 'Waiting Charge (After 15 mins)', value: '₹5 – ₹10 / min' },
    ],
  },
  {
    id: 'auto',
    label: 'Auto',
    emoji: '🛺',
    icon: 'rickshaw',
    iconLib: 'MCIcon',
    color: '#2E7D32',
    lightColor: '#E8F5E9',
    basePrice: '₹400',
    tagline: 'Onwards',
    basePriceDesc: 'Base price (up to 5 km)',
    services: [
      { name: 'Flat Tyre Repair', desc: 'Puncture repair or tyre change', base: '₹200 – ₹400', extra: '+ ₹15 – ₹20' },
      { name: 'Fuel Delivery', desc: 'Fuel delivered to your location', base: '₹200', extra: '+ ₹15 – ₹20', note: '(+ Fuel Cost)' },
      { name: 'Jump Start (Battery)', desc: 'Jump start your vehicle battery', base: '₹300 – ₹500', extra: '+ ₹15 – ₹20' },
      { name: 'Towing Service', desc: 'Tow your auto to nearest garage', base: '₹400 – ₹700', extra: '+ ₹20 – ₹30' },
      { name: 'Lockout Assistance', desc: 'Unlock vehicle or open door', base: '₹300 – ₹600', extra: '+ ₹15 – ₹20' },
    ],
    additional: [
      { icon: 'moon-outline', iconLib: 'Ionicons', label: 'Night Service (10 PM – 6 AM)', value: '+ ₹100 – ₹200' },
      { icon: 'speedometer-outline', iconLib: 'Ionicons', label: 'Highway Service', value: '+ ₹100' },
      { icon: 'rainy-outline', iconLib: 'Ionicons', label: 'Rain / Festival Surcharge', value: '+ 10% – 20%' },
      { icon: 'time-outline', iconLib: 'Ionicons', label: 'Waiting Charge (After 15 mins)', value: '₹2 – ₹5 / min' },
    ],
  },
  {
    id: 'ev',
    label: 'E-Vehicle',
    emoji: '⚡',
    icon: 'lightning-bolt',
    iconLib: 'MCIcon',
    color: '#6A1B9A',
    lightColor: '#F3E5F5',
    basePrice: '₹400',
    tagline: 'Onwards',
    basePriceDesc: 'Base price (up to 5 km)',
    services: [
      { name: 'Flat Tyre Repair', desc: 'Puncture repair or tyre change', base: '₹200 – ₹400', extra: '+ ₹15 – ₹20' },
      { name: 'Battery Assistance', desc: 'Battery check / basic support', base: '₹300 – ₹600', extra: '+ ₹15 – ₹20' },
      { name: 'Charging Assistance', desc: 'On-site charging help', base: '₹300 – ₹500', extra: '+ ₹15 – ₹20' },
      { name: 'Towing Service', desc: 'Tow your e-vehicle to nearest station', base: '₹400 – ₹700', extra: '+ ₹20 – ₹30' },
      { name: 'Lockout Assistance', desc: 'Unlock vehicle or open seat', base: '₹300 – ₹600', extra: '+ ₹15 – ₹20' },
    ],
    additional: [
      { icon: 'moon-outline', iconLib: 'Ionicons', label: 'Night Service (10 PM – 6 AM)', value: '+ ₹100 – ₹200' },
      { icon: 'speedometer-outline', iconLib: 'Ionicons', label: 'Highway Service', value: '+ ₹100' },
      { icon: 'rainy-outline', iconLib: 'Ionicons', label: 'Rain / Festival Surcharge', value: '+ 10% – 20%' },
      { icon: 'time-outline', iconLib: 'Ionicons', label: 'Waiting Charge (After 15 mins)', value: '₹2 – ₹5 / min' },
    ],
  },
  {
    id: 'tractor',
    label: 'Tractor',
    emoji: '🚜',
    icon: 'tractor',
    iconLib: 'MCIcon',
    color: '#B71C1C',
    lightColor: '#FFEBEE',
    basePrice: '₹1,000',
    tagline: 'Onwards',
    basePriceDesc: 'Base price (up to 5 km)',
    services: [
      { name: 'Flat Tyre Repair', desc: 'Puncture repair or tyre change', base: '₹400 – ₹700', extra: '+ ₹25 – ₹35' },
      { name: 'Fuel Delivery', desc: 'Fuel delivered to your location', base: '₹400', extra: '+ ₹25 – ₹35', note: '(+ Fuel Cost)' },
      { name: 'Battery Assistance', desc: 'Battery check / jump start', base: '₹400 – ₹700', extra: '+ ₹25 – ₹35' },
      { name: 'Towing Service', desc: 'Tow your tractor to nearest garage', base: '₹1,000 – ₹1,800', extra: '+ ₹30 – ₹45' },
      { name: 'Lockout Assistance', desc: 'Unlock vehicle or open door', base: '₹400 – ₹700', extra: '+ ₹25 – ₹35' },
    ],
    additional: [
      { icon: 'moon-outline', iconLib: 'Ionicons', label: 'Night Service (10 PM – 6 AM)', value: '+ ₹200 – ₹200' },
      { icon: 'speedometer-outline', iconLib: 'Ionicons', label: 'Highway Service', value: '+ ₹200' },
      { icon: 'rainy-outline', iconLib: 'Ionicons', label: 'Rain / Festival Surcharge', value: '+ 10% – 20%' },
      { icon: 'time-outline', iconLib: 'Ionicons', label: 'Waiting Charge (After 15 mins)', value: '₹3 – ₹7 / min' },
    ],
  },
  {
    id: 'bus',
    label: 'Bus',
    emoji: '🚌',
    icon: 'bus',
    iconLib: 'MCIcon',
    color: '#4527A0',
    lightColor: '#EDE7F6',
    basePrice: '₹2,000',
    tagline: 'Onwards',
    basePriceDesc: 'Base price (up to 5 km)',
    services: [
      { name: 'Flat Tyre Repair', desc: 'Puncture repair or tyre change', base: '₹800 – ₹1,200', extra: '+ ₹40 – ₹60' },
      { name: 'Fuel Delivery', desc: 'Fuel delivered to your location', base: '₹800', extra: '+ ₹40 – ₹60', note: '(+ Fuel Cost)' },
      { name: 'Battery Assistance', desc: 'Battery check / jump start', base: '₹800 – ₹1,200', extra: '+ ₹40 – ₹60' },
      { name: 'Towing Service', desc: 'Tow your bus to nearest garage', base: '₹2,000 – ₹3,500', extra: '+ ₹50 – ₹70' },
      { name: 'Lockout Assistance', desc: 'Unlock vehicle or open door', base: '₹600 – ₹1,000', extra: '+ ₹30 – ₹50' },
    ],
    additional: [
      { icon: 'moon-outline', iconLib: 'Ionicons', label: 'Night Service (10 PM – 6 AM)', value: '+ ₹200 – ₹400' },
      { icon: 'speedometer-outline', iconLib: 'Ionicons', label: 'Highway Service', value: '+ ₹200' },
      { icon: 'rainy-outline', iconLib: 'Ionicons', label: 'Rain / Festival Surcharge', value: '+ 10% – 20%' },
      { icon: 'time-outline', iconLib: 'Ionicons', label: 'Waiting Charge (After 15 mins)', value: '₹5 – ₹10 / min' },
    ],
  },
];

// ─── Icon Renderer ────────────────────────────────────────────────────────────

function RenderIcon({ name, lib, size = 18, color }) {
  if (lib === 'FontAwesome5') {
    return <FontAwesome5 name={name} size={size - 2} color={color} solid />;
  }
  if (lib === 'MCIcon') {
    return <MaterialCommunityIcons name={name} size={size} color={color} />;
  }
  return <Ionicons name={name} size={size} color={color} />;
}

// ─── Vehicle Tab ──────────────────────────────────────────────────────────────

function VehicleTab({ vehicle, isActive, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tab, isActive && { borderBottomColor: vehicle.color, borderBottomWidth: 3 }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.tabEmoji}>{vehicle.emoji}</Text>
      <Text style={[styles.tabLabel, isActive && { color: vehicle.color, fontWeight: 'bold' }]}>
        {vehicle.label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Rate Card ────────────────────────────────────────────────────────────────

function RateCard({ vehicle, onRequest }) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.rateCardContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Banner */}
      <View style={[styles.heroBanner, { backgroundColor: vehicle.color }]}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroPrice}>{vehicle.basePrice}</Text>
          <Text style={styles.heroTagline}>{vehicle.tagline}</Text>
          <Text style={styles.heroDesc}>{vehicle.basePriceDesc}</Text>
        </View>
        <View style={[styles.heroIconCircle, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Text style={{ fontSize: 48 }}>{vehicle.emoji}</Text>
        </View>
      </View>

      {/* Pricing Table */}
      <View style={styles.tableCard}>
        {/* Table Header */}
        <View style={[styles.tableHeaderRow, { backgroundColor: vehicle.lightColor }]}>
          <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>Service</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
            Base Price{'\n'}
            <Text style={styles.tableHeaderSub}>(Up to 5 km)</Text>
          </Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>
            Extra per km{'\n'}
            <Text style={styles.tableHeaderSub}>(After 5 km)</Text>
          </Text>
        </View>

        {/* Table Rows */}
        {vehicle.services.map((svc, idx) => (
          <View key={idx}>
            <View style={styles.tableRow}>
              <View style={{ flex: 2.2 }}>
                <Text style={styles.svcName}>{svc.name}</Text>
                <Text style={styles.svcDesc}>{svc.desc}</Text>
              </View>
              <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                <Text style={[styles.svcBase, { color: vehicle.color }]}>{svc.base}</Text>
                {svc.note ? <Text style={styles.svcNote}>{svc.note}</Text> : null}
              </View>
              <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                <Text style={styles.svcExtra}>{svc.extra}</Text>
              </View>
            </View>
            {idx < vehicle.services.length - 1 && <View style={styles.tableDivider} />}
          </View>
        ))}
      </View>

      {/* Additional Charges */}
      <View style={styles.additionalCard}>
        <Text style={styles.additionalTitle}>Additional Charges (If Applicable)</Text>
        {vehicle.additional.map((item, idx) => (
          <View key={idx} style={styles.additionalRow}>
            <View style={styles.additionalLeft}>
              <RenderIcon name={item.icon} lib={item.iconLib} size={15} color="#555" />
              <Text style={styles.additionalLabel}>{item.label}</Text>
            </View>
            <Text style={[styles.additionalValue, { color: vehicle.color }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Note Banner */}
      <View style={[styles.noteBanner, { borderColor: vehicle.color + '50', backgroundColor: vehicle.lightColor }]}>
        <Ionicons name="shield-checkmark-outline" size={18} color={vehicle.color} style={{ marginRight: 8 }} />
        <Text style={[styles.noteText, { color: vehicle.color }]}>
          <Text style={{ fontWeight: 'bold' }}>Note:</Text> Final price will be shown before you confirm the service. No hidden charges!
        </Text>
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={[styles.ctaBtn, { backgroundColor: vehicle.color }]}
        onPress={onRequest}
        activeOpacity={0.88}
      >
        <Ionicons name="construct-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.ctaBtnText}>Request {vehicle.label} Assistance</Text>
      </TouchableOpacity>

      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ServiceRatesScreen({ navigation, route }) {
  React.useEffect(() => {
    const vType = route?.params?.initialVehicle || 'car';
    navigation.replace('Request', { vehicleType: vType === 'ev' ? 'e-vehicle' : vType });
  }, [navigation, route]);

  const { t } = useTranslation();
  const initialVehicleId = route?.params?.initialVehicle || 'bike';
  const initialIdx = VEHICLES.findIndex(v => v.id === initialVehicleId);
  const [activeIdx, setActiveIdx] = useState(initialIdx >= 0 ? initialIdx : 0);
  const tabScrollRef = useRef(null);

  const activeVehicle = VEHICLES[activeIdx];

  const handleTabPress = (idx) => {
    setActiveIdx(idx);
    tabScrollRef.current?.scrollTo({ x: idx * 72 - width / 2 + 36, animated: true });
  };

  const handleRequest = () => {
    navigation.navigate('Request', { vehicleType: activeVehicle.id, serviceType: 'other' });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#E8192C" />

      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <MaterialCommunityIcons name="currency-inr" size={20} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.headerTitle}>Service Rates</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* ── Vehicle Tab Bar ── */}
      <View style={styles.tabBar}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {VEHICLES.map((v, idx) => (
            <VehicleTab
              key={v.id}
              vehicle={v}
              isActive={idx === activeIdx}
              onPress={() => handleTabPress(idx)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Rate Card ── */}
      <View style={{ flex: 1 }}>
        <RateCard vehicle={activeVehicle} onRequest={handleRequest} />
      </View>

      <GlobalBottomNav />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },

  // Header
  header: {
    backgroundColor: '#E8192C',
    height: 60,
    marginTop: StatusBar.currentHeight || 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    elevation: 6,
    shadowColor: '#E8192C',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  headerBack: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },

  // Tab Bar
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tabBarContent: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  tab: {
    width: 76,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabEmoji: {
    fontSize: 22,
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Rate Card
  rateCardContent: {
    padding: 14,
    paddingBottom: 100,
  },

  // Hero Banner
  heroBanner: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  heroLeft: {
    flex: 1,
  },
  heroPrice: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 38,
  },
  heroTagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  heroIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Pricing Table
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    lineHeight: 16,
  },
  tableHeaderSub: {
    fontSize: 9,
    fontWeight: '400',
    color: '#6B7280',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tableDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 14,
  },
  svcName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  svcDesc: {
    fontSize: 10,
    color: '#9CA3AF',
    lineHeight: 14,
  },
  svcBase: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  svcNote: {
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 2,
  },
  svcExtra: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
  },

  // Additional Charges
  additionalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  additionalTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  additionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  additionalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  additionalLabel: {
    fontSize: 11,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
  },
  additionalValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Note Banner
  noteBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1.2,
    padding: 12,
    marginBottom: 16,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
  },

  // CTA Button
  ctaBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: 4,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
