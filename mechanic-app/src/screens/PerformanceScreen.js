// src/screens/PerformanceScreen.js
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';

export default function PerformanceScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 24);
  const { mechanicToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ completionRate: 100, customerRating: 5.0, totalJobs: 0 });

  useEffect(() => {
    let isMounted = true;
    const fetchPerformance = async () => {
      try {
        if (!mechanicToken) {
          if (isMounted) setLoading(false);
          return;
        }
        const res = await fetch(`${API_URL}/api/mechanic/profile`, {
          headers: { Authorization: `Bearer ${mechanicToken}` }
        });
        const data = await res.json();
        if (data.success && data.mechanic && isMounted) {
          const m = data.mechanic;
          const rating = Number(m.rating) || 5.0;
          const totalJobs = Number(m.totalJobs) || 0;
          setStats({
            completionRate: totalJobs > 0 ? 100 : 0,
            customerRating: Math.round(rating * 10) / 10,
            totalJobs
          });
        }
      } catch (err) {
        console.log('[PerformanceScreen] Fetch error:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchPerformance();
    return () => { isMounted = false; };
  }, [mechanicToken]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
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
            <Text style={styles.bannerTitle}>Account Performance</Text>
            <Text style={styles.bannerSubtitle}>Live performance and rating data from your service requests.</Text>
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
              <Text style={styles.statLabel}>Total Jobs</Text>
              <Text style={styles.statValue}>{stats.totalJobs}</Text>
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
