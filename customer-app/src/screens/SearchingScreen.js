import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../config/socket';
import { theme } from '../constants/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';

export default function SearchingScreen({ navigation, route }) {
  const {
    jobId,
    serviceType,
    vehicleType,
    vehicleModel,
    customerAddress,
    latitude,
    longitude,
    initialPrice,
  } = route.params || {};

  const { token } = useContext(AuthContext);
  const isMounted = useRef(true);

  // Searching details
  const [currentPrice, setCurrentPrice] = useState(initialPrice || 350);
  const [countdown, setCountdown] = useState(120);
  const [searchRadius, setSearchRadius] = useState(5);
  const [activeStep, setActiveStep] = useState(2); // 0: Submitted, 1: Verified, 2: Contacting, 3: Waiting, 4: Assigned

  // Bidding sheet overlay
  const [showBidModal, setShowBidModal] = useState(false);
  const [customBidAmount, setCustomBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [autoPromptDelay, setAutoPromptDelay] = useState(120);
  const [maxPriceIncrease, setMaxPriceIncrease] = useState(1000);

  // Animations
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const stepPulseAnim = useRef(new Animated.Value(0)).current;
  const countdownIntervalRef = useRef(null);

  // Simulated nearby mechanics for visual radar ripples
  const [simulatedMechanics, setSimulatedMechanics] = useState([]);

  useEffect(() => {
    isMounted.current = true;

    // Generate random mock mechanics close to user location
    if (latitude && longitude) {
      const mocks = [
        { id: 1, lat: latitude + 0.003, lng: longitude + 0.002, name: 'Ramesh' },
        { id: 2, lat: latitude - 0.0025, lng: longitude + 0.0035, name: 'Suresh' },
        { id: 3, lat: latitude + 0.004, lng: longitude - 0.003, name: 'Amit' },
        { id: 4, lat: latitude - 0.0035, lng: longitude - 0.0025, name: 'Vikram' },
      ];
      setSimulatedMechanics(mocks);
    }

    // Wrench rotating animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Radar pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Timeline stepper pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(stepPulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(stepPulseAnim, {
          toValue: 0.5,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      isMounted.current = false;
      clearInterval(countdownIntervalRef.current);
    };
  }, [latitude, longitude]);

  // Setup sockets & countdown
  useEffect(() => {
    if (!token || !jobId) return;

    // Join room for this request
    const socket = getSocket(token);
    let reconnectHandler;
    if (socket) {
      socket.emit('join:job:room', { jobId });

      reconnectHandler = () => {
        console.log('[Socket] Reconnected - rejoining job room:', jobId);
        socket.emit('join:job:room', { jobId });
      };
      socket.on('connect', reconnectHandler);

      // Listen for mechanic acceptance
      socket.off('job:accepted:notify');
      socket.on('job:accepted:notify', (mechanicDetails) => {
        console.log('[Socket] Job accepted in SearchingScreen:', mechanicDetails);
        if (isMounted.current) {
          setActiveStep(4); // Mechanic Assigned
          clearInterval(countdownIntervalRef.current);
        }
        // Brief delay so user sees "Mechanic Assigned" checked
        setTimeout(() => {
          if (isMounted.current) {
            navigation.replace('RequestAccepted', { requestId: jobId });
          }
        }, 1500);
      });

      // Listen for matchmaking loop expanding search radius
      socket.off('request:search_radius_update');
      socket.on('request:search_radius_update', (radiusData) => {
        if (radiusData && radiusData.radiusKm) {
          if (isMounted.current) {
            setSearchRadius(radiusData.radiusKm);
            // After search expands, show stepper in "Waiting for responses" active state
            if (activeStep < 3) {
              setActiveStep(3);
            }
          }
        }
      });

      // Listen for price updates (from bidding)
      socket.off('request:price_updated');
      socket.on('request:price_updated', (updateData) => {
        if (updateData && updateData.current_price) {
          if (isMounted.current) {
            setCurrentPrice(updateData.current_price);
            setCountdown(autoPromptDelay);
            setShowBidModal(false);
          }
          resetTimer();
        }
      });
    }

    // Fetch config bidding settings
    fetch(`${API_URL}/api/requests/bidding-settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          const delay = Number(data.settings.autoPromptDelay) || 120;
          setAutoPromptDelay(delay);
          setMaxPriceIncrease(Number(data.settings.maxPriceIncrease) || 1000);
          setCountdown(delay);
        }
      })
      .catch((err) => console.log('Error fetching bidding settings:', err));

    resetTimer();

    return () => {
      if (socket) {
        socket.off('job:accepted:notify');
        socket.off('request:search_radius_update');
        socket.off('request:price_updated');
        if (reconnectHandler) {
          socket.off('connect', reconnectHandler);
        }
      }
    };
  }, [token, jobId]);

  const resetTimer = () => {
    clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          setShowBidModal(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCancelRequest = async (shouldNavigateBack = true, editMode = false) => {
    try {
      const response = await fetch(`${API_URL}/api/requests/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await response.json();

      const socket = getSocket(token);
      if (socket) {
        socket.emit('job:status:update', { jobId, status: 'cancelled' });
      }

      if (shouldNavigateBack) {
        if (editMode) {
          // Pre-populate fields in request screen
          navigation.replace('Request', {
            serviceType,
            description: '', // Can keep empty or track from params
            vehicleType,
            selectedAddress: customerAddress,
            lat: latitude,
            lng: longitude,
          });
        } else {
          navigation.goBack();
        }
      }
    } catch (e) {
      console.log('Error cancelling request:', e);
      Alert.alert('Error', 'Unable to cancel request on server. Please try again.');
    }
  };

  const confirmCancel = () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel your search for a mechanic?',
      [
        { text: 'No, Keep Searching', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => handleCancelRequest(true, false) },
      ]
    );
  };

  const handleEditRequest = () => {
    Alert.alert(
      'Edit Request',
      'This will cancel your current request so you can update details. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Edit', onPress: () => handleCancelRequest(true, true) },
      ]
    );
  };

  const handleIncreasePrice = async (amountToAdd) => {
    setBidError('');
    const totalIncrease = currentPrice - (initialPrice || 350) + Number(amountToAdd);
    if (totalIncrease > maxPriceIncrease) {
      setBidError(`Maximum total increase limit of ₹${maxPriceIncrease} reached.`);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/requests/${jobId}/increase-price`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ incrementAmount: Number(amountToAdd) }),
      });
      const data = await response.json();
      if (data.success) {
        setCustomBidAmount('');
        setShowBidModal(false);
        setCurrentPrice(data.request.current_price);
        setCountdown(autoPromptDelay);
        resetTimer();
      } else {
        setBidError(data.message || 'Failed to update offer');
      }
    } catch (err) {
      console.error('Error increasing price:', err);
      setBidError('Server is unreachable. Check connection.');
    }
  };

  const formatServiceType = (type) => {
    if (!type) return 'Service Required';
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Rotating animation interpolation
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Pulsing scale and opacity
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={confirmCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Searching</Text>
        <TouchableOpacity style={styles.supportButton} onPress={() => navigation.navigate('Help')}>
          <Ionicons name="headset-outline" size={22} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Finding the Best Mechanic Near You */}
        <View style={styles.heroSection}>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>Finding the Best Mechanic Near You</Text>
            <Text style={styles.heroSubtitle}>
              Please wait while we search for available mechanics in your area.
            </Text>
          </View>
          <View style={styles.heroImageContainer}>
            <Image
              source={require('../assets/mechanic-placeholder.png')}
              style={styles.heroImage}
            />
          </View>
        </View>

        {/* Double Split Matching Card */}
        <View style={styles.splitCard}>
          {/* Left panel - Search circle */}
          <View style={styles.leftPanel}>
            <View style={styles.searchTitleRow}>
              <Ionicons name="search" size={20} color={theme.colors.primary} />
              <Text style={styles.searchTitleText}>Searching nearby...</Text>
            </View>
            <Text style={styles.waitTimeText}>Estimated wait: 30-60s</Text>

            <View style={styles.pulseOuterCircle}>
              {/* Radar Pulse Rings */}
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseScale }],
                    opacity: pulseOpacity,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.pulseRingInner,
                  {
                    transform: [{ rotate: spin }],
                  },
                ]}
              />
              {/* Wrench Center Icon */}
              <View style={styles.wrenchCircle}>
                <Ionicons name="construct" size={28} color="#fff" />
              </View>
            </View>
          </View>

          {/* Right panel - Live Map */}
          <View style={styles.rightPanel}>
            {latitude && longitude ? (
              <MapView
                style={styles.panelMap}
                initialRegion={{
                  latitude: latitude,
                  longitude: longitude,
                  latitudeDelta: 0.015,
                  longitudeDelta: 0.015,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {/* User Center Pin */}
                <Marker coordinate={{ latitude, longitude }}>
                  <View style={styles.userMapPin}>
                    <View style={styles.userPinCore} />
                  </View>
                </Marker>

                {/* Radius Circle */}
                <Circle
                  center={{ latitude, longitude }}
                  radius={searchRadius * 1000 * 0.15} // Scale for fit in panel map
                  strokeWidth={2}
                  strokeColor="rgba(232, 25, 44, 0.4)"
                  fillColor="rgba(232, 25, 44, 0.05)"
                />

                {/* Simulated Mechanic Marker Pins */}
                {simulatedMechanics.map((mech) => (
                  <Marker key={mech.id} coordinate={{ latitude: mech.lat, longitude: mech.lng }}>
                    <View style={styles.mechanicMapPin}>
                      <Ionicons name="person" size={10} color="#fff" />
                    </View>
                  </Marker>
                ))}
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            )}
          </View>
        </View>

        {/* Your Request Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Your Request Details</Text>
          </View>

          <View style={styles.detailsList}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconWrapper}>
                <Ionicons name="construct-outline" size={18} color="#9CA3AF" />
              </View>
              <View style={styles.detailTexts}>
                <Text style={styles.detailLabel}>Service Required</Text>
                <Text style={styles.detailValue}>{formatServiceType(serviceType)}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIconWrapper}>
                <Ionicons name="car-outline" size={18} color="#9CA3AF" />
              </View>
              <View style={styles.detailTexts}>
                <Text style={styles.detailLabel}>Vehicle</Text>
                <Text style={styles.detailValue}>
                  {vehicleModel || (vehicleType ? vehicleType.toUpperCase() : 'Honda City 2022')}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIconWrapper}>
                <Ionicons name="location-outline" size={18} color="#9CA3AF" />
              </View>
              <View style={styles.detailTexts}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {customerAddress || 'Current Location'}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIconWrapper}>
                <Ionicons name="time-outline" size={18} color="#9CA3AF" />
              </View>
              <View style={styles.detailTexts}>
                <Text style={styles.detailLabel}>Requested Time</Text>
                <Text style={styles.detailValue}>ASAP</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Search Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="pulse-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Search Status</Text>
          </View>

          <View style={styles.stepperContainer}>
            {/* Step 1: Request Submitted */}
            <View style={styles.stepRow}>
              <View style={styles.stepIndicatorWrapper}>
                <View style={[styles.stepDot, styles.stepCompleted]}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
                <View style={[styles.stepConnector, styles.connectorCompleted]} />
              </View>
              <Text style={[styles.stepText, styles.stepTextCompleted]}>Request Submitted</Text>
            </View>

            {/* Step 2: Location Verified */}
            <View style={styles.stepRow}>
              <View style={styles.stepIndicatorWrapper}>
                <View style={[styles.stepDot, styles.stepCompleted]}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
                <View style={[styles.stepConnector, activeStep > 2 ? styles.connectorCompleted : styles.connectorActive]} />
              </View>
              <Text style={[styles.stepText, styles.stepTextCompleted]}>Location Verified</Text>
            </View>

            {/* Step 3: Contacting Nearby Mechanics */}
            <View style={styles.stepRow}>
              <View style={styles.stepIndicatorWrapper}>
                {activeStep === 2 ? (
                  <Animated.View style={[styles.stepDot, styles.stepActive, { opacity: stepPulseAnim }]}>
                    <View style={styles.stepActiveInner} />
                  </Animated.View>
                ) : activeStep > 2 ? (
                  <View style={[styles.stepDot, styles.stepCompleted]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                ) : (
                  <View style={styles.stepDotPending} />
                )}
                <View style={[styles.stepConnector, activeStep > 3 ? styles.connectorCompleted : activeStep === 3 ? styles.connectorActive : styles.connectorPending]} />
              </View>
              <Text style={[styles.stepText, activeStep === 2 ? styles.stepTextActive : activeStep > 2 ? styles.stepTextCompleted : styles.stepTextPending]}>
                Contacting Nearby Mechanics
              </Text>
            </View>

            {/* Step 4: Waiting for Responses */}
            <View style={styles.stepRow}>
              <View style={styles.stepIndicatorWrapper}>
                {activeStep === 3 ? (
                  <Animated.View style={[styles.stepDot, styles.stepActive, { opacity: stepPulseAnim }]}>
                    <Ionicons name="time" size={12} color="#fff" />
                  </Animated.View>
                ) : activeStep > 3 ? (
                  <View style={[styles.stepDot, styles.stepCompleted]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                ) : (
                  <View style={styles.stepDotPending}>
                    <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                  </View>
                )}
                <View style={[styles.stepConnector, activeStep === 4 ? styles.connectorActive : styles.connectorPending]} />
              </View>
              <Text style={[styles.stepText, activeStep === 3 ? styles.stepTextActive : activeStep > 3 ? styles.stepTextCompleted : styles.stepTextPending]}>
                Waiting for Responses
              </Text>
            </View>

            {/* Step 5: Mechanic Assigned */}
            <View style={styles.stepRow}>
              <View style={styles.stepIndicatorWrapper}>
                {activeStep === 4 ? (
                  <Animated.View style={[styles.stepDot, styles.stepCompleted, { transform: [{ scale: 1.1 }] }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </Animated.View>
                ) : (
                  <View style={styles.stepDotPending} />
                )}
              </View>
              <Text style={[styles.stepText, activeStep === 4 ? styles.stepTextCompleted : styles.stepTextPending]}>
                Mechanic Assigned
              </Text>
            </View>
          </View>
        </View>

        {/* Info panel showing matching rules */}
        <View style={styles.infoPanel}>
          <View style={styles.infoTitleRow}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoIconText}>i</Text>
            </View>
            <Text style={styles.infoTitle}>We are matching your request based on:</Text>
          </View>
          <View style={styles.matchingCriteriaRow}>
            <View style={styles.criteriaItem}>
              <Ionicons name="navigate-circle-outline" size={24} color="#3B82F6" />
              <Text style={styles.criteriaText}>Distance from location</Text>
            </View>
            <View style={styles.criteriaItem}>
              <Ionicons name="calendar-outline" size={24} color="#3B82F6" />
              <Text style={styles.criteriaText}>Availability</Text>
            </View>
            <View style={styles.criteriaItem}>
              <Ionicons name="settings-outline" size={24} color="#3B82F6" />
              <Text style={styles.criteriaText}>Skills and expertise</Text>
            </View>
            <View style={styles.criteriaItem}>
              <Ionicons name="star-outline" size={24} color="#3B82F6" />
              <Text style={styles.criteriaText}>Customer ratings</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.cancelButtonOutline} onPress={confirmCancel}>
            <Ionicons name="close" size={18} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.cancelBtnText}>Cancel Request</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.editButtonOutline} onPress={handleEditRequest}>
            <Ionicons name="pencil-outline" size={18} color="#3B82F6" style={{ marginRight: 6 }} />
            <Text style={styles.editBtnText}>Edit Request</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Banner */}
        <View style={styles.bottomBanner}>
          <View style={styles.bannerIconWrapper}>
            <Ionicons name="shield-checkmark" size={24} color="#2563EB" />
          </View>
          <Text style={styles.bottomBannerText}>
            Once a mechanic accepts your request, you'll see their profile, estimated arrival time, and contact details.
          </Text>
          <Image
            source={require('../assets/mechanic-placeholder.png')}
            style={styles.bannerImage}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Rapido-style Bidding bottom sheet dialog */}
      {showBidModal && (
        <Modal visible={showBidModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.bidModalContent}>
              <View style={styles.modalDragHandle} />
              <Text style={styles.bidModalTitle}>Increase Your Offer ⚡</Text>
              <Text style={styles.bidModalSub}>Higher price = Faster mechanic response.</Text>

              {bidError ? <Text style={styles.bidErrorText}>{bidError}</Text> : null}

              <View style={styles.quickBidRow}>
                {[50, 100, 200].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={styles.quickBidBtn}
                    onPress={() => handleIncreasePrice(amt)}
                  >
                    <Text style={styles.quickBidBtnText}>+₹{amt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.customBidContainer}>
                <TextInput
                  style={styles.customBidInput}
                  placeholder="Enter custom increase"
                  placeholderTextColor="#999"
                  value={customBidAmount}
                  onChangeText={setCustomBidAmount}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.customBidSubmitBtn}
                  onPress={() => {
                    if (!customBidAmount) return;
                    handleIncreasePrice(customBidAmount);
                  }}
                >
                  <Text style={styles.customBidSubmitText}>Add</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.closeBidModalBtn} onPress={() => setShowBidModal(false)}>
                <Text style={styles.closeBidModalText}>Keep Waiting (₹{currentPrice})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
    marginTop: 40,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  supportButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
  },
  heroTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
    lineHeight: 22,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 6,
    lineHeight: 18,
  },
  heroImageContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  splitCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 16,
    minHeight: 180,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  leftPanel: {
    flex: 1,
    padding: 14,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    justifyContent: 'center',
  },
  searchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 4,
  },
  waitTimeText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 4,
  },
  pulseOuterCircle: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  pulseRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
  },
  pulseRingInner: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  wrenchCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  panelMap: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMapPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  userPinCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  mechanicMapPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    borderWidth: 1.5,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  detailsList: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailTexts: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
    marginTop: 2,
  },
  stepperContainer: {
    paddingLeft: 8,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 48,
  },
  stepIndicatorWrapper: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCompleted: {
    backgroundColor: '#10B981',
  },
  stepActive: {
    backgroundColor: '#2563EB',
  },
  stepActiveInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  stepDotPending: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepConnector: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  connectorCompleted: {
    borderColor: '#10B981',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  connectorActive: {
    borderColor: '#2563EB',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  connectorPending: {
    backgroundColor: '#E5E7EB',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    paddingTop: 1,
  },
  stepTextCompleted: {
    color: '#10B981',
  },
  stepTextActive: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  stepTextPending: {
    color: '#9CA3AF',
  },
  infoPanel: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  infoIconText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  matchingCriteriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  criteriaItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  criteriaText: {
    fontSize: 10,
    color: '#1E40AF',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 13,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  bannerIconWrapper: {
    marginRight: 10,
  },
  bottomBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 15,
    fontWeight: '500',
    paddingRight: 6,
  },
  bannerImage: {
    width: 60,
    height: 40,
    resizeMode: 'contain',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bidModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 16,
  },
  bidModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  bidModalSub: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
  },
  bidErrorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 10,
  },
  quickBidRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  quickBidBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  quickBidBtnText: {
    color: '#3B82F6',
    fontWeight: 'bold',
    fontSize: 16,
  },
  customBidContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 20,
    gap: 10,
  },
  customBidInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
    height: 48,
    color: '#1F2937',
  },
  customBidSubmitBtn: {
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    height: 48,
  },
  customBidSubmitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  closeBidModalBtn: {
    paddingVertical: 10,
  },
  closeBidModalText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
