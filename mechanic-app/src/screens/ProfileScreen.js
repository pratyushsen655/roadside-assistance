import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';
import { useTranslation } from 'react-i18next';
import { useBottomNavSafeArea } from '../hooks/useBottomNavSafeArea';

// ─── Constants ────────────────────────────────────────────────────────────────
const VEHICLE_TYPES = [
  { id: 'bike', label: 'Bike', icon: '🏍️' },
  { id: 'car', label: 'Car', icon: '🚗' },
  { id: 'truck', label: 'Truck', icon: '🚛' },
  { id: 'auto', label: 'Auto/Rickshaw', icon: '🛺' },
  { id: 'ev', label: 'E-Vehicle', icon: '⚡' },
  { id: 'heavy_vehicle', label: 'Heavy Vehicle', icon: '🚜' },
];

const DOC_STATUS_CONFIG = {
  unsubmitted: { label: 'Not Uploaded', color: '#94A3B8', bg: '#F1F5F9', icon: 'cloud-upload-outline' },
  pending:      { label: 'Pending Review', color: '#D97706', bg: '#FEF3C7', icon: 'time-outline' },
  verified:     { label: 'Verified', color: '#15803D', bg: '#DCFCE7', icon: 'checkmark-circle-outline' },
  rejected:     { label: 'Rejected', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline' },
};

// Returns { label, color } for expiry date, or null if no expiry
const getExpiryInfo = (expiryDate) => {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const msLeft = expiry - now;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) return { label: 'Expired — Please Renew', color: '#DC2626', bg: '#FEE2E2' };
  if (daysLeft <= 30) return { label: `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`, color: '#D97706', bg: '#FEF3C7' };
  return { label: `Valid until ${expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`, color: '#15803D', bg: '#DCFCE7' };
};

// ─── Component ────────────────────────────────────────────────────────────────
const ProfileScreen = ({ navigation }) => {
  const { mechanicToken, mechanic, logout } = useContext(AuthContext);
  const translationRes = useTranslation();
  const t = translationRes?.t || ((key) => key);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight || 24);
  const { paddingBottom } = useBottomNavSafeArea();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Editable fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');

  // Vehicle specializations
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [savingVehicles, setSavingVehicles] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!mechanicToken) return;
    try {
      const response = await fetch(`${API_URL}/api/mechanic/notifications`, {
        headers: { Authorization: `Bearer ${mechanicToken}` }
      });
      const data = await response.json();
      if (data.success && typeof data.unreadCount === 'number') {
        setUnreadNotifs(data.unreadCount);
      }
    } catch (err) {
      console.log('Error fetching unread notification count:', err.message);
    }
  }, [mechanicToken]);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/mechanic/profile`, {
        headers: { Authorization: `Bearer ${mechanicToken}` }
      });
      const data = await response.json();
      if (data.success && data.mechanic) {
        setProfile(data.mechanic);
        setEditName(data.mechanic.name || '');
        setEditPhone(data.mechanic.phone || '');
        setEditBio(data.mechanic.bio || '');
        setSelectedVehicles(data.mechanic.vehicleSpecializations || []);
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [mechanicToken]);

  useEffect(() => {
    if (mechanicToken) {
      fetchProfile();
      fetchUnreadCount();
    } else {
      setLoading(false);
    }
  }, [mechanicToken, fetchProfile, fetchUnreadCount]);

  const handleUpdateProfile = async () => {
    if (!editName || !editPhone) {
      Alert.alert(t('common_error') || 'Validation Error', t('profile_err_required') || 'Name and Phone number are required.');
      return;
    }
    setUpdating(true);
    try {
      const response = await fetch(`${API_URL}/api/mechanic/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mechanicToken}`
        },
        body: JSON.stringify({ name: editName, phone: editPhone, bio: editBio })
      });
      const data = await response.json();
      if (data.success && data.mechanic) {
        setProfile(data.mechanic);
        setShowEditModal(false);
        Alert.alert(t('common_success') || 'Success', t('profile_update_success') || 'Profile updated successfully.');
      } else {
        Alert.alert(t('common_error') || 'Error', data.message || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert(t('common_error') || 'Error', 'Failed to update profile. Server is unreachable.');
    } finally {
      setUpdating(false);
    }
  };

  const toggleVehicle = async (vehicleId) => {
    const already = selectedVehicles.includes(vehicleId);
    const updated = already
      ? selectedVehicles.filter((v) => v !== vehicleId)
      : [...selectedVehicles, vehicleId];
    setSelectedVehicles(updated);

    setSavingVehicles(true);
    try {
      await fetch(`${API_URL}/api/mechanic/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mechanicToken}`
        },
        body: JSON.stringify({ vehicleSpecializations: updated })
      });
    } catch (err) {
      console.log('Error saving vehicle specializations:', err.message);
    } finally {
      setSavingVehicles(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1B2038" />
      </View>
    );
  }

  const name = profile?.name || mechanic?.name || 'Mechanic';
  const phone = profile?.phone || mechanic?.phone || '+91 98765 43210';
  const rating = Number(profile?.rating || profile?.averageRating || 0).toFixed(1);
  const completion = profile?.completionRate ? `${profile.completionRate}%` : '—';
  const totalJobs = profile?.totalJobs > 0 ? `${profile.totalJobs}+` : '0';

  // Document data
  const docs = profile?.documents || {};
  const kycStatus = profile?.kyc?.status || 'unsubmitted';
  const documentRows = [
    {
      key: 'identityProof',
      label: 'Identity Proof (Aadhaar)',
      icon: 'card-outline',
      status: docs.identityProof?.status || kycStatus,
      expiryDate: null, // Aadhaar doesn't expire
    },
    {
      key: 'licenseImage',
      label: 'Driving License',
      icon: 'car-sport-outline',
      status: docs.licenseImage?.status || 'unsubmitted',
      expiryDate: docs.licenseImage?.expiryDate || null,
    },
    {
      key: 'certificationImages',
      label: 'Certifications',
      icon: 'ribbon-outline',
      status: docs.certificationImages?.[0]?.status || 'unsubmitted',
      expiryDate: docs.certificationImages?.[0]?.expiryDate || null,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1B2038" />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: topInset + 6 }]}>
        <View style={{ width: 28 }} />
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.editHeaderBtn} onPress={() => setShowEditModal(true)}>
          <Ionicons name="create-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: paddingBottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── PROFILE CARD ── */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.userInfoRow}>
            <View style={styles.avatarImageWrapper}>
              <Image
                source={{ uri: profile?.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80' }}
                style={styles.avatarImg}
              />
            </View>
            <View style={styles.userInfoCol}>
              <Text style={styles.mechanicNameText}>{name}</Text>
              <Text style={styles.mechanicPhoneText}>{phone}</Text>
              <View style={styles.verifiedBadgePill}>
                <Ionicons name="shield-checkmark" size={13} color="#15803D" style={{ marginRight: 5 }} />
                <Text style={styles.verifiedBadgePillText}>
                  {profile?.isVerified ? 'Verified' : 'Pending Verification'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── STATS CARD ── */}
        <View style={styles.statsCardContainer}>
          <View style={styles.statTileCol}>
            <View style={styles.ratingValRow}>
              <Ionicons name="star" size={18} color="#F59E0B" style={{ marginRight: 5 }} />
              <Text style={styles.statTileVal}>{rating}</Text>
            </View>
            <Text style={styles.statTileLabel}>Rating</Text>
          </View>
          <View style={styles.statTileDivider} />
          <View style={styles.statTileCol}>
            <Text style={styles.statTileVal}>{completion}</Text>
            <Text style={styles.statTileLabel}>Completion</Text>
          </View>
          <View style={styles.statTileDivider} />
          <View style={styles.statTileCol}>
            <Text style={styles.statTileVal}>{totalJobs}</Text>
            <Text style={styles.statTileLabel}>Jobs Done</Text>
          </View>
        </View>

        {/* ── VEHICLE TYPES SECTION ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="car-sport-outline" size={18} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Serviceable Vehicle Types</Text>
            {savingVehicles && <ActivityIndicator size="small" color="#3B82F6" style={{ marginLeft: 'auto' }} />}
          </View>
          <Text style={styles.sectionSubtitle}>Select all vehicle types you can service</Text>

          <View style={styles.chipGrid}>
            {VEHICLE_TYPES.map((vt) => {
              const selected = selectedVehicles.includes(vt.id);
              return (
                <TouchableOpacity
                  key={vt.id}
                  style={[styles.vehicleChip, selected && styles.vehicleChipSelected]}
                  onPress={() => toggleVehicle(vt.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.vehicleChipIcon}>{vt.icon}</Text>
                  <Text style={[styles.vehicleChipLabel, selected && styles.vehicleChipLabelSelected]}>
                    {vt.label}
                  </Text>
                  {selected && <Ionicons name="checkmark-circle" size={14} color="#1D4ED8" style={{ marginLeft: 4 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── DOCUMENTS SECTION ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="document-text-outline" size={18} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Documents</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Upload & verify your identity and professional documents</Text>

          {documentRows.map((doc, idx) => {
            const cfg = DOC_STATUS_CONFIG[doc.status] || DOC_STATUS_CONFIG.unsubmitted;
            const expiryInfo = getExpiryInfo(doc.expiryDate);

            return (
              <View
                key={doc.key}
                style={[styles.docRow, idx > 0 && { borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 12, paddingTop: 12 }]}
              >
                <View style={styles.docIconCircle}>
                  <Ionicons name={doc.icon} size={20} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docLabel}>{doc.label}</Text>

                  {/* Status badge */}
                  <View style={[styles.docStatusBadge, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={12} color={cfg.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.docStatusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>

                  {/* Expiry badge */}
                  {expiryInfo && (
                    <View style={[styles.expiryBadge, { backgroundColor: expiryInfo.bg }]}>
                      <Ionicons name="calendar-outline" size={12} color={expiryInfo.color} style={{ marginRight: 4 }} />
                      <Text style={[styles.expiryText, { color: expiryInfo.color }]}>{expiryInfo.label}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.uploadDocBtn}
            onPress={() => Alert.alert('Upload Documents', 'Go to KYC Upload section to upload or update your documents.')}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#8B5CF6" style={{ marginRight: 6 }} />
            <Text style={styles.uploadDocBtnText}>Upload / Update Documents</Text>
          </TouchableOpacity>
        </View>

        {/* ── MENU LIST ── */}
        <View style={styles.menuListCard}>
          {[
            { id: 'm1', label: 'Bank Details', icon: 'card-outline', screen: 'BankDetails' },
            { id: 'm2', label: 'Earnings & Payouts', icon: 'wallet-outline', screen: 'Earnings' },
            { id: 'm3', label: 'Notifications', icon: 'notifications-outline', screen: 'NotificationHistory', badge: unreadNotifs > 0 ? unreadNotifs : null },
            { id: 'm4', label: 'Settings', icon: 'settings-outline', screen: 'Settings' },
            { id: 'm5', label: 'Help & Support', icon: 'help-circle-outline', action: () => Alert.alert('Help & Support', 'Reach RideRescue Support:\n📞 +91 9140906912\n✉️ riderescue@gmail.com', [{ text: 'Cancel', style: 'cancel' }, { text: 'Send Email', onPress: () => Linking.openURL('mailto:riderescue@gmail.com') }, { text: 'Call Support', onPress: () => Linking.openURL('tel:9140906912') }]) },
          ].map((item, index, arr) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItemRow,
                index === arr.length - 1 && { borderBottomWidth: 0 }
              ]}
              onPress={() => item.action ? item.action() : navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={22} color="#1E293B" style={{ marginRight: 14 }} />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {item.badge ? (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{item.badge}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── EDIT PROFILE MODAL ── */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('profile_modal_title') || 'Edit Profile'}</Text>

            <Text style={styles.inputLabel}>{t('profile_name') || 'Name'}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('profile_placeholder_name') || 'Your Name'}
              placeholderTextColor="#64748b"
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.inputLabel}>{t('profile_phone') || 'Phone Number'}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('profile_phone') || 'Phone Number'}
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              value={editPhone}
              onChangeText={setEditPhone}
            />

            <Text style={styles.inputLabel}>{t('profile_bio') || 'Bio'}</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder={t('profile_placeholder_bio') || 'Write a short bio...'}
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={3}
              value={editBio}
              onChangeText={setEditBio}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtnCancel, styles.actionBtn]}
                onPress={() => setShowEditModal(false)}
                disabled={updating}
              >
                <Text style={styles.modalCancelBtnText}>{t('profile_cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSave, styles.actionBtn]}
                onPress={handleUpdateProfile}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>{t('profile_save') || 'Save'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#1B2038',
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  editHeaderBtn: { padding: 4 },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },

  // Profile Card
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  userInfoRow: { flexDirection: 'row', alignItems: 'center' },
  avatarImageWrapper: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', backgroundColor: '#E2E8F0', marginRight: 16 },
  avatarImg: { width: '100%', height: '100%' },
  userInfoCol: { flex: 1, justifyContent: 'center' },
  mechanicNameText: { fontSize: 19, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 },
  mechanicPhoneText: { fontSize: 14, color: '#64748B', marginBottom: 8 },
  verifiedBadgePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  verifiedBadgePillText: { color: '#15803D', fontSize: 12, fontWeight: '600' },

  // Stats
  statsCardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statTileCol: { alignItems: 'center', flex: 1 },
  ratingValRow: { flexDirection: 'row', alignItems: 'center' },
  statTileVal: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  statTileLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  statTileDivider: { width: 1, height: 32, backgroundColor: '#E2E8F0' },

  // Section Cards
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginLeft: 8 },
  sectionSubtitle: { fontSize: 12, color: '#94A3B8', marginBottom: 14 },

  // Vehicle chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 2,
  },
  vehicleChipSelected: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  vehicleChipIcon: { fontSize: 15, marginRight: 5 },
  vehicleChipLabel: { fontSize: 13, color: '#475569', fontWeight: '500' },
  vehicleChipLabelSelected: { color: '#1D4ED8', fontWeight: '700' },

  // Documents
  docRow: { flexDirection: 'row', alignItems: 'flex-start' },
  docIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F0FF',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  docLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 6 },
  docStatusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 4 },
  docStatusText: { fontSize: 12, fontWeight: '600' },
  expiryBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  expiryText: { fontSize: 12, fontWeight: '500' },
  uploadDocBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    borderStyle: 'dashed',
    backgroundColor: '#FAF5FF',
  },
  uploadDocBtnText: { color: '#8B5CF6', fontWeight: '700', fontSize: 14 },

  // Menu list
  menuListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  menuItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemText: { fontSize: 15, fontWeight: '500', color: '#1E293B' },
  badgePill: { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginRight: 6 },
  badgePillText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 8,
  },
  logoutBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', width: '85%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  inputLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 14, color: '#1E293B' },
  bioInput: { height: 60, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  modalBtnCancel: { marginRight: 8 },
  modalCancelBtnText: { color: '#64748B', fontWeight: 'bold' },
  modalBtnSave: { backgroundColor: '#1B2038' },
  modalSaveBtnText: { color: '#FFF', fontWeight: 'bold' },
});

export default ProfileScreen;
