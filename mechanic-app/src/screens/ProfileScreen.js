import React, { useContext, useState, useEffect } from 'react';
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
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';
import { useTranslation } from 'react-i18next';
import { useBottomNavSafeArea } from '../hooks/useBottomNavSafeArea';

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

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/mechanic/profile`, {
        headers: {
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (data.success && data.mechanic) {
        setProfile(data.mechanic);
        setEditName(data.mechanic.name || '');
        setEditPhone(data.mechanic.phone || '');
        setEditBio(data.mechanic.bio || '');
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mechanicToken) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [mechanicToken]);

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
          'Authorization': `Bearer ${mechanicToken}`
        },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          bio: editBio
        })
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

  const handleSettingsPress = () => {
    Alert.alert(
      t('profile_modal_title') || 'Account Settings',
      'Choose an action to manage your account.',
      [
        {
          text: t('profile_edit') || 'Edit Profile',
          onPress: () => setShowEditModal(true),
        },
        {
          text: t('lang_title') || 'Change Language',
          onPress: () => navigation.navigate('LanguageSelection', { isOnboarding: false }),
        },
        {
          text: t('profile_logout') || 'Logout',
          onPress: logout,
          style: 'destructive',
        },
        {
          text: t('profile_cancel') || 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1B2038" />
      </View>
    );
  }

  const name = profile?.name || mechanic?.name || 'Rakesh Kumar';
  const phone = profile?.phone || mechanic?.phone || '+91 98765 43210';
  const rating = Number(profile?.rating || profile?.averageRating || 4.8).toFixed(1);
  const completion = profile?.completionRate ? `${profile.completionRate}%` : '98%';
  const totalJobs = profile?.totalJobs !== undefined && profile?.totalJobs !== 0 ? `${profile.totalJobs}+` : '250+';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1B2038" />
      
      {/* 1. NAVY TOP HEADER */}
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
        {/* 2. USER PROFILE CARD */}
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
                <Text style={styles.verifiedBadgePillText}>Verified</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. STATS SUMMARY CARD */}
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
            <Text style={styles.statTileLabel}>Jobs Completed</Text>
          </View>
        </View>

        {/* 4. MENU LIST OPTIONS */}
        <View style={styles.menuListCard}>
          {[
            { id: 'm1', label: 'Vehicle & Documents', icon: 'car-outline', action: () => setShowEditModal(true) },
            { id: 'm2', label: 'Bank Details', icon: 'business-outline', screen: 'Earnings' },
            { id: 'm3', label: 'Earnings & Payouts', icon: 'calendar-outline', screen: 'Earnings' },
            { id: 'm4', label: 'Notifications', icon: 'notifications-outline', screen: 'Home' },
            { id: 'm5', label: 'Help & Support', icon: 'help-circle-outline', action: () => Alert.alert('Help & Support', 'Reach Roadmitra Mechanic Support at +91 99999 99999') },
            { id: 'm6', label: 'Settings', icon: 'settings-outline', action: handleSettingsPress },
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
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#1B2038',
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editHeaderBtn: {
    padding: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
  },
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
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImageWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    marginRight: 16,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  userInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  mechanicNameText: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  mechanicPhoneText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  verifiedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgePillText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '600',
  },
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
  statTileCol: {
    alignItems: 'center',
    flex: 1,
  },
  ratingValRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statTileVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  statTileLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '400',
  },
  statTileDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  menuListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 18,
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
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '85%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 14,
    color: '#1E293B',
  },
  bioInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalBtnCancel: {
    marginRight: 8,
  },
  modalCancelBtnText: {
    color: '#64748B',
    fontWeight: 'bold',
  },
  modalBtnSave: {
    backgroundColor: '#1B2038',
  },
  modalSaveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
