import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';

const ProfileScreen = ({ navigation }) => {
  const { mechanicToken, logout } = useContext(AuthContext);
  
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
      Alert.alert('Validation Error', 'Name and Phone number are required.');
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
        Alert.alert('Success', 'Profile updated successfully.');
      } else {
        Alert.alert('Error', data.message || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Server is unreachable.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00BFA5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.name?.charAt(0) || 'M'}</Text>
        </View>
        <Text style={styles.name}>{profile?.name || 'Mechanic Name'}</Text>
        <Text style={styles.phone}>{profile?.phone || '+91 0000000000'}</Text>
        
        {profile?.bio ? (
          <Text style={styles.bioText}>"{profile.bio}"</Text>
        ) : null}

        <View style={styles.badgesContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{(profile?.rating || profile?.averageRating || 5.0).toFixed(1)} ★ Rating</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{profile?.totalJobs || 0} Jobs</Text>
          </View>
        </View>

        <View style={styles.specializationBadge}>
          <Text style={styles.specializationText}>
            {profile?.vehicleSpecializations?.join(', ') || 'General Service Expert'}
          </Text>
        </View>
      </View>

      {profile && (
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Rating Distribution</Text>
          {[
            { label: '5 ★', count: profile.ratingBreakdown?.five || 0 },
            { label: '4 ★', count: profile.ratingBreakdown?.four || 0 },
            { label: '3 ★', count: profile.ratingBreakdown?.three || 0 },
            { label: '2 ★', count: profile.ratingBreakdown?.two || 0 },
            { label: '1 ★', count: profile.ratingBreakdown?.one || 0 },
          ].map((item, idx) => {
            const total = profile.totalRatings || 0;
            const widthPct = total === 0 ? '0%' : `${Math.round((item.count / total) * 100)}%`;
            return (
              <View key={idx} style={styles.breakdownRow}>
                <Text style={styles.starLabel}>{item.label}</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.barFill, { width: widthPct }]} />
                </View>
                <Text style={styles.countLabel}>{item.count}</Text>
              </View>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={styles.editBtn} onPress={() => setShowEditModal(true)}>
        <Text style={styles.editBtnText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.editBtn, { backgroundColor: '#00BFA5' }]} onPress={() => navigation.navigate('Reviews')}>
        <Text style={styles.editBtnText}>💬 My Customer Reviews</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutBtnText}>Logout</Text>
      </TouchableOpacity>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              placeholderTextColor="#aaaaaa"
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#aaaaaa"
              keyboardType="phone-pad"
              value={editPhone}
              onChangeText={setEditPhone}
            />

            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Write a short bio..."
              placeholderTextColor="#aaaaaa"
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
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSave, styles.actionBtn]}
                onPress={handleUpdateProfile}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 30,
  },
  profileCard: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00BFA5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  phone: {
    color: '#aaaaaa',
    fontSize: 16,
    marginBottom: 10,
  },
  bioText: {
    color: '#aaaaaa',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  badgesContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  badge: {
    backgroundColor: '#3a3a5a',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  specializationBadge: {
    backgroundColor: 'rgba(0, 191, 165, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  specializationText: {
    color: '#00BFA5',
    fontWeight: 'bold',
  },
  editBtn: {
    backgroundColor: '#3a3a5a',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  editBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: '#e53935',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 50,
  },
  logoutBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#252542',
    borderRadius: 20,
    padding: 25,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    color: '#aaaaaa',
    fontSize: 14,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalBtnCancel: {
    backgroundColor: '#3a3a5a',
  },
  modalBtnSave: {
    backgroundColor: '#00BFA5',
  },
  modalCancelBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalSaveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  breakdownCard: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
    marginBottom: 10,
  },
  starLabel: {
    width: 35,
    fontSize: 13,
    color: '#aaaaaa',
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#1a1a2e',
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
    width: 25,
    fontSize: 13,
    color: '#aaaaaa',
    textAlign: 'right',
  },
});

export default ProfileScreen;
