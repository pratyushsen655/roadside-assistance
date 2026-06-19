import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, Animated, Image
} from 'react-native';
import { AuthContext, API_URL } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#B34700',
  primaryDark: '#8B3300',
  primaryLight: '#FFF3E0',
  text: '#1A1A1A',
  textGray: '#757575',
  textLight: '#BDBDBD',
  border: '#E0E0E0',
  white: '#FFFFFF',
  error: '#D32F2F',
  success: '#2E7D32',
  background: '#FAFAFA',
};

// Reusable Input Field Component
const FormInput = ({ 
  icon, label, value, onChangeText, placeholder, optional,
  keyboardType = 'default', autoCapitalize = 'none', 
  error, animValue 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <Animated.View style={[styles.inputContainer, { opacity: animValue, transform: [{ translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
      <View style={styles.labelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {optional && <View style={styles.optionalBadge}><Text style={styles.optionalText}>Optional</Text></View>}
      </View>
      <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
        <Text style={styles.inputIcon}>{icon}</Text>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </Animated.View>
  );
};

export default function CompleteProfileScreen({ navigation }) {
  const { token, updateUser } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleType, setVehicleType] = useState('🚗 Car');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [yearError, setYearError] = useState('');

  // Animations
  const cardAnim = useRef(new Animated.Value(0)).current;
  const nameAnim = useRef(new Animated.Value(0)).current;
  const emailAnim = useRef(new Animated.Value(0)).current;
  const detailsAnim = useRef(new Animated.Value(0)).current;
  const photoBounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    Animated.stagger(100, [
      Animated.timing(nameAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(emailAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(detailsAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePhotoSelect = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: '📷 Take Photo', onPress: pickFromCamera },
      { text: '🖼️ Choose from Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const pickFromCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission needed', 'Camera permission is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) {
      animatePhotoBounce();
      setPhoto(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission needed', 'Gallery permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) {
      animatePhotoBounce();
      setPhoto(result.assets[0].uri);
    }
  };

  const animatePhotoBounce = () => {
    Animated.sequence([
      Animated.timing(photoBounce, { toValue: 1.1, duration: 150, useNativeDriver: true }),
      Animated.spring(photoBounce, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();
  };

  const validateForm = () => {
    let isValid = true;
    
    if (!name.trim()) {
      setNameError('Full Name is required');
      isValid = false;
    } else {
      setNameError('');
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError('Invalid email format');
        isValid = false;
      } else {
        setEmailError('');
      }
    } else {
      setEmailError('');
    }

    if (vehicleYear.trim()) {
      const year = parseInt(vehicleYear, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1990 || year > currentYear) {
        setYearError(`Year must be between 1990 and ${currentYear}`);
        isValid = false;
      } else {
        setYearError('');
      }
    } else {
      setYearError('');
    }

    return isValid;
  };

  const handleComplete = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase() || undefined,
          vehicleType,
          vehicleMake: vehicleMake.trim() || undefined,
          vehicleModel: vehicleModel.trim() || undefined,
          vehicleYear: vehicleYear.trim() || undefined,
          vehicleNumber: vehicleNumber.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await updateUser(data.user);
        navigation.replace('Home');
      } else {
        Alert.alert('Error', data.message || 'Please try again.');
      }
    } catch (err) {
      navigation.replace('Home');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleNumberChange = (text) => {
    setVehicleNumber(text.toUpperCase());
  };

  const vehicleTypes = ['🚗 Car', '🛵 Bike', '🚐 Auto', '🚛 Truck'];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <Text style={styles.headerSub}>Just a few details to get you started 🚀</Text>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Step 1 of 2</Text>
            <View style={styles.dotsRow}>
              <View style={[styles.dot, styles.dotFilled]} />
              <View style={[styles.dot, styles.dotOutlined]} />
            </View>
          </View>

          {/* Photo Circle */}
          <TouchableOpacity onPress={handlePhotoSelect} activeOpacity={0.8} style={styles.photoContainer}>
            <Animated.View style={[styles.photoCircle, { transform: [{ scale: photoBounce }] }]}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoImage} />
              ) : (
                <Ionicons name="person" size={50} color={COLORS.border} />
              )}
            </Animated.View>
            <View style={styles.cameraFab}>
              <Text style={{ fontSize: 16 }}>📷</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Form Card */}
        <Animated.View style={[
          styles.formCard, 
          { 
            transform: [{ 
              translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) 
            }] 
          }
        ]}>
          <Text style={styles.sectionTitle}>👤 PERSONAL INFORMATION</Text>
          
          <FormInput
            animValue={nameAnim}
            icon="👤"
            label="Full Name *"
            placeholder="e.g. Priya Sharma"
            value={name}
            onChangeText={(text) => { setName(text); setNameError(''); }}
            autoCapitalize="words"
            error={nameError}
          />

          <FormInput
            animValue={emailAnim}
            icon="📧"
            label="Email Address"
            optional
            placeholder="e.g. priya@example.com"
            value={email}
            onChangeText={(text) => { setEmail(text); setEmailError(''); }}
            keyboardType="email-address"
            error={emailError}
          />

          <Animated.View style={{ opacity: detailsAnim }}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerIcon}>——— 🚗 Vehicle Details ———</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Vehicle Type Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
              {vehicleTypes.map((type) => {
                const isSelected = vehicleType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                    onPress={() => setVehicleType(type)}
                  >
                    <Text style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <FormInput animValue={detailsAnim} icon="🚗" label="Vehicle Make" optional placeholder="e.g. Maruti, Honda" value={vehicleMake} onChangeText={setVehicleMake} autoCapitalize="words" />
            <FormInput animValue={detailsAnim} icon="🏷️" label="Vehicle Model" optional placeholder="e.g. Swift, City" value={vehicleModel} onChangeText={setVehicleModel} autoCapitalize="words" />
            <FormInput animValue={detailsAnim} icon="📅" label="Vehicle Year" optional placeholder="e.g. 2021" value={vehicleYear} onChangeText={(t) => { setVehicleYear(t); setYearError(''); }} keyboardType="number-pad" error={yearError} />
            <FormInput animValue={detailsAnim} icon="🔢" label="Vehicle Number" optional placeholder="e.g. DL 01 AB 1234" value={vehicleNumber} onChangeText={handleVehicleNumberChange} autoCapitalize="characters" />
          </Animated.View>

          <TouchableOpacity
            style={[styles.submitBtn, (!name.trim() || loading) && styles.submitBtnDisabled]}
            onPress={handleComplete}
            disabled={!name.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>Complete Setup →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.replace('Home')} disabled={loading}>
            <Text style={styles.skipBtnText}>Skip for now →</Text>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1 },
  
  header: {
    backgroundColor: COLORS.primary, // Used primary color since expo-linear-gradient is not present, gives a robust, native-like look
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  headerSub: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  progressText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFilled: {
    backgroundColor: COLORS.white,
  },
  dotOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  
  photoContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  photoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  cameraFab: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    elevation: 5,
  },

  formCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  
  inputContainer: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textGray,
  },
  optionalBadge: {
    marginLeft: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  optionalText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  inputWrapperFocused: {
    borderBottomColor: COLORS.primary,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 0,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 6,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerIcon: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textGray,
  },

  typeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  typeChip: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  typeChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeChipText: {
    color: COLORS.textGray,
    fontSize: 14,
    fontWeight: '600',
  },
  typeChipTextSelected: {
    color: COLORS.white,
  },

  submitBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 32,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: 'bold',
  },

  skipBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipBtnText: {
    color: COLORS.textGray,
    fontSize: 13,
    fontWeight: '600',
  },
});
