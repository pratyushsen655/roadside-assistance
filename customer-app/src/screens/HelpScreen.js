/* eslint-disable no-console */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Dimensions
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function HelpScreen({ navigation }) {

  return (
    <View style={styles.container}>
      {/* 1. White Top Header Section */}
      <View style={styles.topSection}>
        <Animated.Text entering={FadeInUp.delay(100).duration(400)} style={styles.pageTitle}>
          Help & Support
        </Animated.Text>

        {/* Top card: Go to My Cars */}
        <Animated.View entering={FadeInUp.delay(150).duration(400)}>
          <TouchableOpacity
            style={styles.myCarsCard}
            onPress={() => navigation.navigate('AddressBook')}
            activeOpacity={0.85}
          >
            <View style={styles.myCarsTextContainer}>
              <Text style={styles.myCarsHeading}>Go to My Cars &gt;</Text>
              <Text style={styles.myCarsSubtitle}>Manage Your Car & more</Text>
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
          You have not placed any orders yet
        </Animated.Text>

        {/* Primary CTA button: BROWSE SERVICES */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.9}
          >
            <Text style={styles.browseBtnText}>BROWSE SERVICES</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Help section card: FAQs */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <TouchableOpacity
            style={styles.faqCard}
            onPress={() => {
              Alert.alert(
                'Frequently Asked Questions (FAQs)',
                '1. How do I request roadside help?\nTap SOS or any service on Home screen.\n\n2. What are the charges?\nInitial pricing is shown on request, mechanics will bid live.\n\n3. Can I track my mechanic?\nYes, live tracking is available after dispatch.',
                [{ text: 'Close' }]
              );
            }}
            activeOpacity={0.8}
          >
            <View style={styles.faqLeft}>
              <View style={styles.helpBadge}>
                <Text style={styles.helpBadgeText}>HELP</Text>
              </View>
              <Text style={styles.faqText}>FAQs</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Sticky Bottom Navigation Bar */}
      <View style={styles.bottomNavBar}>
        {/* Home */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home-outline" size={24} color="#6B7280" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        {/* Help / Active */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => {}}
        >
          <Ionicons name="help-circle" size={24} color="#E8192C" />
          <Text style={[styles.navText, styles.activeNavText]}>Help</Text>
        </TouchableOpacity>

        {/* SOS - Center floating bell */}
        <TouchableOpacity
          style={styles.sosNavButton}
          onPress={() => navigation.navigate('SOS')}
          activeOpacity={0.85}
        >
          <View style={styles.sosNavCircle}>
            <Ionicons name="notifications" size={28} color="#FFF" />
          </View>
          <Text style={styles.sosNavText}>SOS</Text>
        </TouchableOpacity>



        {/* Account */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigation.navigate('Account')}
        >
          <Ionicons name="person-outline" size={24} color="#6B7280" />
          <Text style={styles.navText}>Account</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: theme.colors.white,
    height: 75,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    paddingBottom: 10,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.18,
  },
  navText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  activeNavText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  sosNavButton: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -15,
    width: width * 0.18,
  },
  sosNavCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  sosNavText: {
    fontSize: 10,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: 'bold',
  }
});
