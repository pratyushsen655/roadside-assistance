// src/screens/PerformanceScreen.js
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';

export default function PerformanceScreen() {
  const navigation = useNavigation();
  const { mechanicToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ completionRate: 98, customerRating: 4.9, activeHours: 42 });

  useEffect(() => {
    // Fetch mock/real stats
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Performance</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#27AE60" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.banner}>
            <MaterialCommunityIcons name="trophy" size={48} color="#F1C40F" />
            <Text style={styles.bannerTitle}>Excellent Performance!</Text>
            <Text style={styles.bannerSubtitle}>You are in the top 5% of mechanics in your area.</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Completion Rate</Text>
              <Text style={styles.statValue}>{stats.completionRate}%</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Rating</Text>
              <Text style={styles.statValue}>{stats.customerRating} ★</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Active Hours</Text>
              <Text style={styles.statValue}>{stats.activeHours} hrs</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.reviewsBtn} onPress={() => navigation.navigate('Reviews')}>
            <Text style={styles.reviewsBtnText}>View Detailed Customer Reviews</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16 },
  banner: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  bannerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginTop: 12 },
  bannerSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  statLabel: { fontSize: 11, color: '#6B7280', marginBottom: 6, textAlign: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#27AE60' },
  reviewsBtn: { backgroundColor: '#27AE60', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  reviewsBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' }
});
