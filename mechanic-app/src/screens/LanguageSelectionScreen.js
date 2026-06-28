import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');

const LanguageSelectionScreen = ({ route, navigation }) => {
  const { language, setLanguage } = useLanguage();
  
  // Detect if onboarding flow or accessed from settings
  const isOnboarding = route.params?.isOnboarding ?? true;

  // Initialize selected language with current language if not in onboarding
  const [selectedLang, setSelectedLang] = useState(isOnboarding ? null : language);

  const handleConfirm = async () => {
    if (!selectedLang) return;

    try {
      console.log(`[LanguageSelection] Confirming language change to: ${selectedLang}`);
      await setLanguage(selectedLang);
      
      if (!isOnboarding) {
        // If accessed from settings/profile, go back to previous screen
        navigation.goBack();
      }
    } catch (error) {
      console.error('[LanguageSelection] Failed to save language:', error);
      Alert.alert('Error', 'Failed to save language setting.');
    }
  };

  const handleHelpPress = () => {
    Alert.alert(
      'Support Helpdesk',
      'Need assistance with language selection or onboarding? Contact RoadMitra Support.',
      [{ text: 'Close', style: 'cancel' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Section - 45% of height */}
      <View style={styles.topSection}>
        {/* Help Button */}
        <TouchableOpacity style={styles.helpButton} onPress={handleHelpPress}>
          <Ionicons name="headset-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.helpButtonText}>Help</Text>
        </TouchableOpacity>

        {/* Overlapping Rounded-Square Illustration Cards */}
        <View style={styles.illustrationWrapper}>
          {/* Accent sparkles/stars */}
          <Ionicons name="sparkles" size={24} color="#ffd700" style={[styles.sparkle, styles.sparkleLeft]} />
          <Ionicons name="sparkles-outline" size={16} color="#00BFA5" style={[styles.sparkle, styles.sparkleRight]} />
          <Ionicons name="star" size={14} color="#ffd700" style={[styles.sparkle, styles.sparkleBottom]} />

          {/* Card 1 - Bottom Left ("A") */}
          <View style={[styles.illusCard, styles.illusCardBottom]}>
            <Text style={styles.illusTextLatin}>A</Text>
            {/* Speech bubble tail */}
            <View style={[styles.tail, styles.tailLeft]} />
          </View>

          {/* Card 2 - Top Right ("आ") */}
          <View style={[styles.illusCard, styles.illusCardTop]}>
            <Text style={styles.illusTextDeva}>आ</Text>
            {/* Speech bubble tail */}
            <View style={[styles.tail, styles.tailRight]} />
          </View>
        </View>
      </View>

      {/* Bottom Section - sliding sheet */}
      <View style={styles.bottomSheet}>
        <Text style={styles.sheetTitle}>Select App Language</Text>
        
        {/* Languages Scroll Grid */}
        <ScrollView 
          contentContainerStyle={styles.scrollGrid} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gridRow}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = selectedLang === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  activeOpacity={0.8}
                  style={[
                    styles.langCard,
                    isSelected && styles.langCardSelected
                  ]}
                  onPress={() => setSelectedLang(lang.code)}
                >
                  <View style={styles.cardLeft}>
                    <Text style={[
                      styles.langLabel,
                      isSelected && styles.langLabelSelected
                    ]}>
                      {lang.nativeLabel}
                    </Text>
                    
                    {/* Row of decorative dots */}
                    <View style={styles.dotsRow}>
                      <View style={styles.dot} />
                      <View style={styles.dot} />
                      <View style={styles.dot} />
                      <View style={styles.dot} />
                    </View>
                  </View>

                  {/* Radio button on right edge */}
                  <View style={[
                    styles.radioButton,
                    isSelected && styles.radioButtonSelected
                  ]}>
                    {isSelected && <View style={styles.radioButtonInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !selectedLang && styles.confirmButtonDisabled
          ]}
          onPress={handleConfirm}
          disabled={!selectedLang}
        >
          <Text style={[
            styles.confirmButtonText,
            !selectedLang && styles.confirmButtonTextDisabled
          ]}>
            Confirm
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19', // Dark navy base
  },
  topSection: {
    height: height * 0.43,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#0b0f19',
  },
  helpButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    zIndex: 10,
  },
  helpButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  illustrationWrapper: {
    width: 220,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: 20,
  },
  illusCard: {
    width: 90,
    height: 90,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  illusCardBottom: {
    backgroundColor: '#ffffff',
    bottom: 25,
    left: 20,
    zIndex: 1,
  },
  illusCardTop: {
    backgroundColor: '#00BFA5', // Vibrant teal speech bubble
    top: 25,
    right: 20,
    zIndex: 2,
  },
  illusTextLatin: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#0b0f19',
  },
  illusTextDeva: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tail: {
    position: 'absolute',
    width: 16,
    height: 16,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  tailLeft: {
    backgroundColor: '#ffffff',
    bottom: -6,
    left: 16,
  },
  tailRight: {
    backgroundColor: '#00BFA5',
    bottom: -6,
    left: 16,
  },
  sparkle: {
    position: 'absolute',
    zIndex: 5,
  },
  sparkleLeft: {
    top: 10,
    left: -10,
  },
  sparkleRight: {
    top: 40,
    right: -12,
  },
  sparkleBottom: {
    bottom: 10,
    right: 35,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 30,
    paddingHorizontal: 24,
    paddingBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollGrid: {
    paddingBottom: 15,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  langCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  langCardSelected: {
    borderColor: '#00BFA5',
    backgroundColor: 'rgba(0, 191, 165, 0.04)',
  },
  cardLeft: {
    flex: 1,
    paddingRight: 6,
  },
  langLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 4,
  },
  langLabelSelected: {
    color: '#00BFA5',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#cbd5e1',
    marginRight: 3,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#00BFA5',
  },
  radioButtonInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#00BFA5',
  },
  confirmButton: {
    backgroundColor: '#00BFA5',
    borderRadius: 28,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#00BFA5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonTextDisabled: {
    color: '#94a3b8',
  },
});

export default LanguageSelectionScreen;
