/* eslint-disable no-console */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  RefreshControl, Share, Clipboard, Alert, ActivityIndicator,
  Image, TextInput, Modal, Linking
} from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
const API_BASE = process.env.EXPO_PUBLIC_API_URL ? `${process.env.EXPO_PUBLIC_API_URL}/api` : 'https://roadside-assistance-production-ddaf.up.railway.app/api';

export default function ReferralScreen({ navigation }) {
  const [data, setData] = useState({
    referralCode: '',
    referredBy: null,
    totalReferred: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    referrals: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendReferralCode, setFriendReferralCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [faqExpanded, setFaqExpanded] = useState({ q1: false, q2: false });
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const getToken = async () => {
    return (await AsyncStorage.getItem('userToken')) || (await AsyncStorage.getItem('token'));
  };

  const fetchReferralData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const res = await fetch(`${API_BASE}/referrals/my-code`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      
      if (res.ok) {
        setData({
          referralCode: json.referralCode || json.code || '',
          referredBy: json.referredBy || null,
          totalReferred: json.totalReferrals || json.totalReferred || 0,
          totalEarnings: json.totalEarnings || 0,
          pendingEarnings: json.pendingEarnings || 0,
          paidEarnings: json.paidEarnings || 0,
          referrals: json.referrals || []
        });
      } else {
        Alert.alert('Error', json?.message || 'Failed to fetch referral data');
      }
    } catch (e) {
      console.log('Error fetching referral data:', e);
      Alert.alert('Error', 'Failed to load referral data. Please check your network connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReferralData();
  };

  const appLink = `https://play.google.com/store/apps/details?id=com.praty.roadsideassist&referral=${data.referralCode}`;
  const shareMessage = `🚗 Stranded on the road? Get instant mechanic help!\n\n📲 Download RoadMitra app:\n${appLink}\n\n🎁 Use my referral code *${data.referralCode}* at signup to get ₹30 off your first service!\n\n🔧 Fast • Reliable • 24/7 Roadside Assistance`;

  const shareOnWhatsApp = async () => {
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      Alert.alert('WhatsApp not installed', 'Please install WhatsApp to share via WhatsApp.');
    }
  };

  const shareLink = async () => {
    try {
      await Share.share({
        message: shareMessage,
        url: appLink,
        title: 'Download RoadMitra - Roadside Assistance',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not open share menu');
    }
  };

  const copyLink = async () => {
    await ExpoClipboard.setStringAsync(appLink);
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  };

  const copyCode = async () => {
    await ExpoClipboard.setStringAsync(data.referralCode);
    setCopied('code');
    setTimeout(() => setCopied(null), 2000);
  };

  const applyFriendCode = async () => {
    if (!friendReferralCode.trim()) {
      Alert.alert('Error', 'Please enter a referral code.');
      return;
    }
    setApplying(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Please login to apply code.');
        setApplying(false);
        return;
      }
      const res = await fetch(`${API_BASE}/referrals/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ referralCode: friendReferralCode.trim() })
      });
      const json = await res.json();
      if (res.ok) {
        Alert.alert('Success', json.message || 'Referral applied successfully!');
        setFriendReferralCode('');
        fetchReferralData();
      } else {
        Alert.alert('Failed', json.message || 'Could not apply referral code.');
      }
    } catch (err) {
      console.log('Error applying code:', err);
      Alert.alert('Error', 'Something went wrong. Please check your network.');
    } finally {
      setApplying(false);
    }
  };

  const toggleFaq = (key) => {
    setFaqExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Leaderboard computations
  const userRank = data.totalReferred > 0 ? Math.max(4, 172638 - data.totalReferred * 12437) : 172638;
  const userPoints = data.totalReferred * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer And Earn</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#E8192C" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* Hero Illustration */}
            <View style={styles.heroSection}>
              <Image 
                source={require('../../assets/icon.png')} 
                style={styles.heroImage}
              />
            </View>

            {/* Headline and Copy */}
            <View style={styles.promoSection}>
              <Text style={styles.promoTitle}>Earn ₹ 1000 for every Friend you Refer</Text>
              <Text style={styles.promoSubtitle}>
                Get a friend to start using GoMechanic & earn ₹ 1000 when they complete their first order.
              </Text>
            </View>

            {/* How it works */}
            <View style={styles.howItWorksCard}>
              <Text style={styles.howItWorksTitle}>How it works?</Text>
              
              <View style={styles.stepsContainer}>
                {/* Vertical Line */}
                <View style={styles.stepVerticalLine} />

                {/* Step 1 */}
                <View style={styles.stepRow}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepNumber}>1</Text>
                  </View>
                  <Text style={styles.stepText}>Refer your friend with your Unique Referral Code.</Text>
                </View>

                {/* Step 2 */}
                <View style={styles.stepRow}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepNumber}>2</Text>
                  </View>
                  <Text style={styles.stepText}>Your Friend gets ₹ 1000 GoApp Money post installing the app.</Text>
                </View>

                {/* Step 3 */}
                <View style={styles.stepRow}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepNumber}>3</Text>
                  </View>
                  <Text style={styles.stepText}>You get ₹ 1000 GoApp Money after their first order.</Text>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLineDashed} />
              <Text style={styles.dividerText}>REFER VIA</Text>
              <View style={styles.dividerLineDashed} />
            </View>

            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>📨 Message Preview</Text>
              <Text style={styles.previewText}>{shareMessage}</Text>
            </View>

            <View style={styles.shareGrid}>
              <TouchableOpacity style={[styles.shareBtn, styles.whatsappBtn]} onPress={shareOnWhatsApp}>
                <Text style={styles.shareBtnIcon}>💬</Text>
                <Text style={styles.shareBtnText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.shareBtn, styles.shareAnyBtn]} onPress={shareLink}>
                <Text style={styles.shareBtnIcon}>📤</Text>
                <Text style={styles.shareBtnText}>Share Link</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.shareBtn, styles.copyLinkBtn]} onPress={copyLink}>
                <Text style={styles.shareBtnIcon}>{copied === 'link' ? '✓' : '🔗'}</Text>
                <Text style={styles.shareBtnText}>{copied === 'link' ? 'Copied!' : 'Copy Link'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.shareBtn, styles.copyCodeBtn]} onPress={copyCode}>
                <Text style={styles.shareBtnIcon}>{copied === 'code' ? '✓' : '📋'}</Text>
                <Text style={styles.shareBtnText}>{copied === 'code' ? 'Copied!' : 'Copy Code'}</Text>
              </TouchableOpacity>
            </View>

            {/* Earnings Row */}
            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Your Earnings</Text>
              <Text style={styles.earningsValue}>₹ {data.totalEarnings}</Text>
            </View>

            {/* Section Divider Block */}
            <View style={styles.sectionDividerBlock} />

            {/* Avail Referral Discount Section */}
            <View style={styles.applyCodeContainer}>
              <Text style={styles.sectionHeading}>Avail Referral Discount</Text>
              
              {data.referredBy ? (
                <View style={styles.appliedConfirmation}>
                  <Ionicons name="checkmark-circle" size={18} color="#2E7D32" style={{ marginRight: 6 }} />
                  <Text style={styles.appliedText}>Friend referral code already applied</Text>
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <TextInput 
                    style={styles.textInput}
                    placeholder="Friend Referral Code"
                    placeholderTextColor="#999"
                    value={friendReferralCode}
                    onChangeText={setFriendReferralCode}
                    autoCapitalize="characters"
                  />
                  {applying ? (
                    <ActivityIndicator size="small" color="#E8192C" style={{ marginRight: 10 }} />
                  ) : (
                    <TouchableOpacity onPress={applyFriendCode}>
                      <Text style={styles.applyBtnText}>APPLY</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Section Divider Block */}
            <View style={styles.sectionDividerBlock} />

            {/* Win Miles Membership */}
            <View style={styles.milesContainer}>
              <Text style={styles.milesTitle}>Win Miles Membership</Text>
              <Text style={styles.milesSubtitle}>
                Refer your friends & Top 3 on the Leaderboard get to win Free Miles Membership
              </Text>

              {/* User Rank Card */}
              <View style={styles.userRankCard}>
                <View style={styles.avatarCircle}>
                  <MaterialCommunityIcons name="robot" size={26} color="#fff" />
                </View>
                <Text style={styles.userRankName}>You</Text>
                
                <View style={styles.rankStat}>
                  <Text style={styles.rankValue}>{userRank}</Text>
                  <Text style={styles.rankLabel}>Rank</Text>
                </View>

                <View style={styles.rankStat}>
                  <Text style={styles.rankValue}>{userPoints}</Text>
                  <Text style={styles.rankLabel}>Points</Text>
                </View>
              </View>

              {/* View Leaderboard action */}
              <TouchableOpacity 
                style={styles.viewLeaderboardBtn} 
                onPress={() => setLeaderboardVisible(true)}
              >
                <Text style={styles.viewLeaderboardText}>VIEW LEADERBOARD</Text>
                <Ionicons name="arrow-forward" size={18} color="#E8192C" />
              </TouchableOpacity>
            </View>

            {/* Section Divider Block */}
            <View style={styles.sectionDividerBlock} />

            {/* Frequently Asked Questions */}
            <View style={styles.faqSection}>
              <Text style={styles.faqHeading}>Frequently Asked Questions</Text>

              {/* FAQ Item 1 */}
              <View style={styles.faqItem}>
                <TouchableOpacity 
                  style={styles.faqHeader} 
                  onPress={() => toggleFaq('q1')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.faqQuestion}>Why should I choose GoMechanic Miles?</Text>
                  <Ionicons 
                    name={faqExpanded.q1 ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#555" 
                  />
                </TouchableOpacity>
                {faqExpanded.q1 && (
                  <View style={styles.faqBody}>
                    <Text style={styles.faqAnswer}>
                      GoMechanic Miles membership gives you access to premium benefits including free vehicle towing, unlimited battery jumpstarts, zero service charges on basic tyre punctures, and exclusive discounts on labor and spare parts.
                    </Text>
                  </View>
                )}
              </View>

              {/* FAQ Item 2 */}
              <View style={styles.faqItem}>
                <TouchableOpacity 
                  style={styles.faqHeader} 
                  onPress={() => toggleFaq('q2')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.faqQuestion}>
                    How many times can I avail a particular service under GoMechanic Miles?
                  </Text>
                  <Ionicons 
                    name={faqExpanded.q2 ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#555" 
                  />
                </TouchableOpacity>
                {faqExpanded.q2 && (
                  <View style={styles.faqBody}>
                    <Text style={styles.faqAnswer}>
                      You can avail most membership services up to 3 times during your yearly subscription cycle. Select special perks might have higher or unlimited caps as displayed in the membership booklet.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Leaderboard Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={leaderboardVisible}
        onRequestClose={() => setLeaderboardVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Miles Leaderboard</Text>
              <TouchableOpacity onPress={() => setLeaderboardVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Top 3 participants win a Free Miles Membership!</Text>

            {/* Leaderboard List */}
            <ScrollView style={styles.leaderboardScroll} showsVerticalScrollIndicator={false}>
              {/* Rank 1 */}
              <View style={styles.leaderboardRow}>
                <Text style={[styles.leaderboardRank, styles.rankOne]}>1</Text>
                <View style={[styles.leaderboardAvatar, { backgroundColor: '#FFD700' }]}>
                  <Ionicons name="trophy" size={16} color="#fff" />
                </View>
                <Text style={styles.leaderboardName}>Rajesh K.</Text>
                <Text style={styles.leaderboardPoints}>1800 pts</Text>
              </View>

              {/* Rank 2 */}
              <View style={styles.leaderboardRow}>
                <Text style={[styles.leaderboardRank, styles.rankTwo]}>2</Text>
                <View style={[styles.leaderboardAvatar, { backgroundColor: '#C0C0C0' }]}>
                  <Ionicons name="trophy" size={16} color="#fff" />
                </View>
                <Text style={styles.leaderboardName}>Amit S.</Text>
                <Text style={styles.leaderboardPoints}>1500 pts</Text>
              </View>

              {/* Rank 3 */}
              <View style={styles.leaderboardRow}>
                <Text style={[styles.leaderboardRank, styles.rankThree]}>3</Text>
                <View style={[styles.leaderboardAvatar, { backgroundColor: '#CD7F32' }]}>
                  <Ionicons name="trophy" size={16} color="#fff" />
                </View>
                <Text style={styles.leaderboardName}>Priya M.</Text>
                <Text style={styles.leaderboardPoints}>1200 pts</Text>
              </View>

              {/* Divider */}
              <View style={styles.leaderboardDivider} />

              {/* Current User */}
              <View style={[styles.leaderboardRow, styles.currentUserLeaderboardRow]}>
                <Text style={styles.leaderboardRank}>{userRank}</Text>
                <View style={[styles.leaderboardAvatar, { backgroundColor: '#E8192C' }]}>
                  <MaterialCommunityIcons name="robot" size={16} color="#fff" />
                </View>
                <Text style={[styles.leaderboardName, { fontWeight: 'bold' }]}>You (Current User)</Text>
                <Text style={[styles.leaderboardPoints, { fontWeight: 'bold' }]}>{userPoints} pts</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  scrollContent: { paddingBottom: 40 },

  heroSection: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 180,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },

  promoSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'flex-start',
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    lineHeight: 26,
    marginBottom: 8,
  },
  promoSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },

  howItWorksCard: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#FFCDD2',
    borderRadius: 8,
  },
  howItWorksTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginBottom: 16,
  },
  stepsContainer: {
    position: 'relative',
  },
  stepVerticalLine: {
    position: 'absolute',
    left: 14,
    top: 15,
    bottom: 15,
    width: 2,
    backgroundColor: '#FFCDD2',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFE4E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    zIndex: 1,
  },
  stepNumber: {
    color: '#D32F2F',
    fontWeight: '700',
    fontSize: 13,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    paddingHorizontal: 30,
  },
  dividerLineDashed: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: '#999',
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
    letterSpacing: 1,
  },

  previewBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    marginVertical: 12,
    marginHorizontal: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#B34700',
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B34700',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
  },
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 16,
    marginHorizontal: 20,
    justifyContent: 'space-between'
  },
  shareBtn: {
    width: '47%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  whatsappBtn: { backgroundColor: '#25D366' },
  shareAnyBtn: { backgroundColor: '#1565C0' },
  copyLinkBtn: { backgroundColor: '#F57C00' },
  copyCodeBtn: { backgroundColor: '#6A1B9A' },
  shareBtnIcon: { fontSize: 24 },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
  },
  earningsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },

  sectionDividerBlock: {
    height: 10,
    backgroundColor: '#f5f5f5',
    width: '100%',
  },

  applyCodeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D32F2F',
    marginLeft: 10,
  },
  appliedConfirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  appliedText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },

  milesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  milesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 8,
  },
  milesSubtitle: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginBottom: 16,
  },
  userRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8192C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userRankName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  rankStat: {
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  rankValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  rankLabel: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },
  viewLeaderboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  viewLeaderboardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D32F2F',
    letterSpacing: 0.2,
  },

  faqSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  faqHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginBottom: 15,
  },
  faqItem: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    flex: 0.95,
    lineHeight: 18,
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#f0f0f0',
  },
  faqAnswer: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginTop: 10,
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 35,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
  },
  leaderboardScroll: {
    marginVertical: 10,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  currentUserLeaderboardRow: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 0,
  },
  leaderboardRank: {
    width: 24,
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  rankOne: { color: '#FFD700' },
  rankTwo: { color: '#9E9E9E' },
  rankThree: { color: '#CD7F32' },
  leaderboardAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 8,
  },
  leaderboardName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  leaderboardPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  leaderboardDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 15,
  },
});
