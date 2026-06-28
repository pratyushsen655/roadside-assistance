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
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';
import { useTranslation } from 'react-i18next';
import { useBottomNavSafeArea } from '../hooks/useBottomNavSafeArea';

const ProfileScreen = ({ navigation }) => {
  const { mechanicToken, logout } = useContext(AuthContext);
  const { t } = useTranslation();
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
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch profile');
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
      t('profile_placeholder_bio') ? 'Choose an action' : 'Choose an action to manage your account.',
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
        <ActivityIndicator size="large" color="#00BFA5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile_title') || 'Profile'}</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={handleSettingsPress}>
          <Ionicons name="settings-outline" size={24} color="#00BFA5" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileInfoRow}>
            {/* Avatar Circle Container with Badge overlay */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{profile?.name?.charAt(0) || 'M'}</Text>
              </View>
              <View style={styles.verifiedBadgeOverlay}>
                <Ionicons name="checkmark-circle" size={20} color="#00BFA5" />
              </View>
            </View>

            {/* Name, Phone, Verified Row */}
            <View style={styles.profileTextDetails}>
              <Text style={styles.name}>{profile?.name || 'Mechanic'}</Text>
              <Text style={styles.phone}>{profile?.phone || '+91 36149 85278'}</Text>
              
              <View style={styles.verifiedBadgeRow}>
                <Ionicons name="shield-checkmark" size={16} color="#00BFA5" style={{ marginRight: 6 }} />
                <Text style={styles.verifiedBadgeText}>{t('profile_verified') || 'Verified Professional'}</Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {/* Rating Stat */}
            <View style={styles.statCol}>
              <View style={styles.statValRow}>
                <Ionicons name="star" size={18} color="#FFD700" style={{ marginRight: 6 }} />
                <Text style={styles.statValue}>{(profile?.rating || profile?.averageRating || 5.0).toFixed(1)}</Text>
              </View>
              <Text style={styles.statLabel}>{t('home_rating') || 'Rating'}</Text>
            </View>

            <View style={styles.statDivider} />

            {/* Jobs Completed Stat */}
            <View style={styles.statCol}>
              <View style={styles.statValRow}>
                <Ionicons name="briefcase" size={18} color="#00BFA5" style={{ marginRight: 6 }} />
                <Text style={styles.statValue}>{profile?.totalJobs || 0}</Text>
              </View>
              <Text style={styles.statLabel}>{t('nav_jobs') || 'Jobs Completed'}</Text>
            </View>
          </View>

          {/* Specialization tag */}
          <View style={styles.specializationTag}>
            <Ionicons name="ribbon-outline" size={16} color="#00BFA5" style={{ marginRight: 8 }} />
            <Text style={styles.specializationText}>
              {profile?.vehicleSpecializations?.join(', ') || 'General Service Expert'}
            </Text>
          </View>
        </View>

        {/* Rating Distribution Card */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>{t('profile_rating_dist') || 'Rating Distribution'}</Text>
          {[
            { label: '5 ★', count: profile?.ratingBreakdown?.five || 0 },
            { label: '4 ★', count: profile?.ratingBreakdown?.four || 0 },
            { label: '3 ★', count: profile?.ratingBreakdown?.three || 0 },
            { label: '2 ★', count: profile?.ratingBreakdown?.two || 0 },
            { label: '1 ★', count: profile?.ratingBreakdown?.one || 0 },
          ].map((item, idx) => {
            const total = (profile?.ratingBreakdown?.five || 0) + 
                          (profile?.ratingBreakdown?.four || 0) + 
                          (profile?.ratingBreakdown?.three || 0) + 
                          (profile?.ratingBreakdown?.two || 0) + 
                          (profile?.ratingBreakdown?.one || 0) || profile?.totalRatings || 0;
            const pct = total === 0 ? 0 : Math.round((item.count / total) * 100);
            const widthPct = `${pct}%`;
            return (
              <View key={idx} style={styles.breakdownRow}>
                <Text style={styles.starLabel}>{item.label}</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.barFill, { width: widthPct }]} />
                </View>
                <Text style={styles.countLabel}>{pct}% ({item.count})</Text>
              </View>
            );
          })}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.editBtn} onPress={() => setShowEditModal(true)}>
          <Ionicons name="create-outline" size={20} color="#00BFA5" style={{ marginRight: 8 }} />
          <Text style={styles.editBtnText}>{t('profile_edit') || 'Edit Profile'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.reviewsBtn} onPress={() => navigation.navigate('Reviews')}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.reviewsBtnText}>{t('profile_reviews') || 'My Customer Reviews'}</Text>
        </TouchableOpacity>
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
    backgroundColor: '#0f172a', // Premium sleek dark slate
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsBtn: {
    padding: 6,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110, // Generous padding bottom to prevent overlap with bottom navigation tab bar
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    marginRight: 20,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00BFA5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  verifiedBadgeOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileTextDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  phone: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 6,
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadgeText: {
    color: '#00BFA5',
    fontSize: 13,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 35,
    backgroundColor: '#334155',
  },
  specializationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 191, 165, 0.08)',
    borderColor: 'rgba(0, 191, 165, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  specializationText: {
    color: '#00BFA5',
    fontSize: 14,
    fontWeight: 'bold',
  },
  breakdownCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  starLabel: {
    width: 30,
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#00BFA5',
    borderRadius: 4,
  },
  countLabel: {
    fontSize: 13,
    color: '#94a3b8',
    width: 65,
    textAlign: 'right',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#00BFA5',
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 14,
  },
  editBtnText: {
    color: '#00BFA5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00BFA5',
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 14,
  },
  reviewsBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalBtnCancel: {
    backgroundColor: '#334155',
  },
  modalBtnSave: {
    backgroundColor: '#00BFA5',
  },
  modalCancelBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalSaveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default ProfileScreen;
