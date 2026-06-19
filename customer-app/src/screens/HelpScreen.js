/* eslint-disable no-console */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Dimensions
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useTranslation } from 'react-i18next';
import GlobalBottomNav from '../components/GlobalBottomNav';

const { width } = Dimensions.get('window');

export default function HelpScreen({ navigation }) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* 1. White Top Header Section */}
      <View style={styles.topSection}>
        <Animated.Text entering={FadeInUp.delay(100).duration(400)} style={styles.pageTitle}>
          {t('screens.help', 'Help & Support')}
        </Animated.Text>

        {/* Top card: Go to My Cars */}
        <Animated.View entering={FadeInUp.delay(150).duration(400)}>
          <TouchableOpacity
            style={styles.myCarsCard}
            onPress={() => navigation.navigate('AddressBook')}
            activeOpacity={0.85}
          >
            <View style={styles.myCarsTextContainer}>
              <Text style={styles.myCarsHeading}>{t('help.goToMyCars', 'Go to My Cars >')}</Text>
              <Text style={styles.myCarsSubtitle}>{t('help.manageCarMore', 'Manage Your Car & more')}</Text>
            </View>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.carImage}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* 2. Light Gray Lower Section */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.lowerSection}
      >
        {/* Center illustration (empty state hero graphic) */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.heroContainer}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.heroImage}
          />
        </Animated.View>

        {/* Empty state message */}
        <Animated.Text entering={FadeInDown.delay(250).duration(500)} style={styles.emptyStateMessage}>
          {t('help.noOrdersYet', 'You have not placed any orders yet')}
        </Animated.Text>

        {/* Primary CTA button: BROWSE SERVICES */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.9}
          >
            <Text style={styles.browseBtnText}>{t('help.browseServices', 'BROWSE SERVICES')}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Help section card: FAQs */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <TouchableOpacity
            style={styles.faqCard}
            onPress={() => {
              Alert.alert(
                t('help.faqTitle', 'Frequently Asked Questions (FAQs)'),
                t('help.faqContent', '1. How do I request roadside help?\nTap SOS or any service on Home screen.\n\n2. What are the charges?\nInitial pricing is shown on request, mechanics will bid live.\n\n3. Can I track my mechanic?\nYes, live tracking is available after dispatch.'),
                [{ text: t('common.close', 'Close') }]
              );
            }}
            activeOpacity={0.8}
          >
            <View style={styles.faqLeft}>
              <View style={styles.helpBadge}>
                <Text style={styles.helpBadgeText}>{t('language.help', 'HELP')}</Text>
              </View>
              <Text style={styles.faqText}>{t('help.faqs', 'FAQs')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Sticky Bottom Navigation Bar */}
      <GlobalBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  topSection: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.horizontalPadding,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 20,
    textAlign: 'left',
  },
  myCarsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8F8',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: theme.card.borderRadius,
    padding: 16,
    height: 80,
  },
  myCarsTextContainer: {
    flex: 1,
  },
  myCarsHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  myCarsSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  carImage: {
    width: 70,
    height: 50,
    resizeMode: 'contain',
  },
  lowerSection: {
    flex: 1,
    backgroundColor: theme.colors.secondary,
  },
  scrollContent: {
    padding: theme.spacing.horizontalPadding,
    alignItems: 'stretch',
    paddingBottom: 110, // clear bottom navbar
  },
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  heroImage: {
    width: width - 80,
    height: 180,
    resizeMode: 'contain',
  },
  emptyStateMessage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  browseBtnText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  faqCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.card.borderRadius,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  faqLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.button.borderRadius,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  helpBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  faqText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    height: 85,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    paddingBottom: 20,
    paddingTop: 10,
    borderRadius: 20,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.16,
  },
  activeNavIcon: {
    marginBottom: -2,
  },
  navText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  activeNavText: {
    color: '#E8192C',
    fontWeight: 'bold',
  },
  sosNavButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.16,
  },
  sosNavCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  sosNavText: {
    fontSize: 12,
    color: '#1E3A8A',
    marginTop: 4,
    fontWeight: '600',
  }
});
