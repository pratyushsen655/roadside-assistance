// src/components/ExtraWorkModal.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const { height: SCREEN_H } = Dimensions.get('window');

export default function ExtraWorkModal({ visible, onClose, onApprove, onDecline, basePrice = 299, mechanicName = "Rajesh K." }) {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  // Extra work items state
  const [extraItems, setExtraItems] = useState([
    { id: '1', name: 'Air Filter Replacement', note: 'Filter is clogged, affecting performance', price: 120, checked: true },
    { id: '2', name: 'Spark Plug Replacement', note: 'Worn out, causing misfires', price: 89, checked: true },
    { id: '3', name: 'Brake Oil Top-up', note: 'Level critically low', price: 59, checked: true },
  ]);

  // Countdown timer state (4:59)
  const [timer, setTimer] = useState(299); // 4 minutes 59 seconds

  useEffect(() => {
    if (visible) {
      // Slide up
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Start timer
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      slideAnim.setValue(SCREEN_H);
    }
  }, [visible]);

  const toggleItem = (id) => {
    setExtraItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const selectedExtraTotal = extraItems
    .filter((item) => item.checked)
    .reduce((sum, item) => sum + item.price, 0);

  const grandTotal = basePrice + selectedExtraTotal;

  const handleApprove = () => {
    const selected = extraItems.filter(i => i.checked);
    onApprove && onApprove(selected, grandTotal);
    closeSheet();
  };

  const handleDecline = () => {
    onDecline && onDecline();
    closeSheet();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_H,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose && onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeSheet}
    >
      <View style={styles.overlay}>
        {/* Dimmed Background dismiss */}
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeSheet} />

        {/* Modal Bottom Sheet */}
        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
          
          {/* 1. DRAG HANDLE */}
          <View style={styles.dragHandle} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* 2. HEADER SECTION */}
            <View style={styles.header}>
              <View style={styles.warningIconCircle}>
                <Ionicons name="warning" size={24} color="#D97706" />
              </View>
              <Text style={styles.headerTitle}>{t('extraWork.title', 'Mechanic Found Extra Issues')}</Text>
              <Text style={styles.headerSubtitle}>{t('extraWork.subtitle', 'Review and approve before work begins')}</Text>
            </View>

            {/* 3. ORIGINAL SERVICE CARD */}
            <View style={styles.originalServiceCard}>
              <Text style={styles.originalLabel}>{t('extraWork.originallyBooked', 'Originally Booked')}</Text>
              <View style={styles.originalInfoRow}>
                <Text style={styles.originalName}>{t('services.engineRepair', 'Engine Repair')}</Text>
                <Text style={styles.originalPrice}>₹{basePrice}</Text>
              </View>
            </View>

            {/* 4. EXTRA WORK ITEMS LIST */}
            <Text style={styles.sectionTitle}>{t('extraWork.detectedIssues', 'Detected Issues')}</Text>
            {extraItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemCard, item.checked && styles.itemCardChecked]}
                onPress={() => toggleItem(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.checkboxContainer}>
                  <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                    {item.checked && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemName}>{t(`extraWork.${item.id}.name`, item.name)}</Text>
                  <Text style={styles.itemNote}>* {t(`extraWork.${item.id}.note`, item.note)}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
              </TouchableOpacity>
            ))}

            {/* 5. COST SUMMARY BOX */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('extraWork.baseService', 'Base Service')}</Text>
                <Text style={styles.summaryVal}>₹{basePrice}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('extraWork.selectedExtraWork', 'Selected Extra Work')}</Text>
                <Text style={styles.summaryVal}>₹{selectedExtraTotal}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.grandTotalLabel}>{t('extraWork.totalEstimate', 'Total Estimate')}</Text>
                <Text style={styles.grandTotalVal}>₹{grandTotal}</Text>
              </View>
              <Text style={styles.summaryNotice}>
                {t('extraWork.summaryNotice', '* Final amount after job completion')}
              </Text>
            </View>

            {/* 6. MECHANIC PHOTO + NAME STRIP */}
            <View style={styles.mechanicStrip}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={24} color="#6B7280" />
              </View>
              <View style={styles.mechanicInfo}>
                <Text style={styles.mechanicText}>
                  {t('extraWork.waitingApproval', '{{mechanic}} is waiting for your approval', { mechanic: mechanicName })}
                </Text>
                <View style={styles.timerRow}>
                  <Ionicons name="time-outline" size={13} color="#E8192C" style={{ marginRight: 4 }} />
                  <Text style={styles.timerText}>
                    {t('extraWork.timerText', 'Responds in:')} <Text style={{ fontWeight: 'bold' }}>{formatTimer(timer)}</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* 7. ACTION BUTTONS */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.approveBtn} onPress={handleApprove} activeOpacity={0.9}>
                <Text style={styles.approveBtnText}>{t('extraWork.approveBtn', 'Approve & Continue')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} activeOpacity={0.9}>
                <Text style={styles.declineBtnText}>{t('extraWork.declineBtn', 'Decline Extra Work')}</Text>
              </TouchableOpacity>
              <Text style={styles.declineNotice}>
                {t('extraWork.declineNotice', 'Declining will only complete original service')}
              </Text>
            </View>

          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.82,
    paddingTop: 12,
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  dragHandle: {
    width: 44,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  warningIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  originalServiceCard: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  originalLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  originalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  originalName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  itemCardChecked: {
    borderColor: '#E8192C',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#E8192C',
    borderColor: '#E8192C',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  itemNote: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#E8192C',
    marginLeft: 8,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginVertical: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  grandTotalVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E8192C',
  },
  summaryNotice: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  mechanicStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mechanicInfo: {
    flex: 1,
  },
  mechanicText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 3,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 11,
    color: '#4B5563',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  approveBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#E8192C',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  declineBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8192C',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  declineBtnText: {
    color: '#E8192C',
    fontSize: 15,
    fontWeight: 'bold',
  },
  declineNotice: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
