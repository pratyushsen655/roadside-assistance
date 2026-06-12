import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { AuthContext, API_URL } from '../context/AuthContext';

export default function MechanicProfileScreen({ route, navigation }) {
  const { mechanicId } = route.params || {};
  const { token } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [mechanic, setMechanic] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [tagCounts, setTagCounts] = useState({});

  useEffect(() => {
    if (!mechanicId) return;
    fetchProfileAndReviews();
  }, [mechanicId]);

  const fetchProfileAndReviews = async () => {
    setLoading(true);
    try {
      // 1. Fetch Mechanic model details
      const mechRes = await fetch(`${API_URL}/api/mechanic/${mechanicId}`);
      const mechData = await mechRes.json();

      if (mechRes.ok && mechData.success) {
        setMechanic(mechData.mechanic);
      }

      // 2. Fetch all ratings/reviews for mechanic
      const reviewRes = await fetch(`${API_URL}/api/ratings/mechanic/${mechanicId}`);
      const reviewData = await reviewRes.json();

      if (reviewRes.ok && reviewData.success) {
        const ratings = reviewData.ratings || [];
        setReviews(ratings);

        // Calculate tag frequency
        const counts = {};
        ratings.forEach((r) => {
          if (r.tags && Array.isArray(r.tags)) {
            r.tags.forEach((tag) => {
              counts[tag] = (counts[tag] || 0) + 1;
            });
          }
        });
        setTagCounts(counts);
      }
    } catch (error) {
      console.log('Error loading mechanic profile details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#B34700" />
      </View>
    );
  }

  if (!mechanic) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Could not load mechanic profile.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate percentages for rating breakdown
  const breakdown = mechanic.ratingBreakdown || { five: 0, four: 0, three: 0, two: 0, one: 0 };
  const total = mechanic.totalRatings || 0;
  const getPercentage = (count) => {
    if (total === 0) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  };

  const renderHeader = () => {
    return (
      <View>
        {/* Header Details */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{mechanic.userId?.name?.charAt(0) || 'M'}</Text>
          </View>
          <Text style={styles.mechanicName}>{mechanic.userId?.name || 'Professional Mechanic'}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStars}>⭐ {mechanic.rating ? mechanic.rating.toFixed(1) : '5.0'}</Text>
            <Text style={styles.ratingCount}>({total} reviews)</Text>
          </View>
          <Text style={styles.specializationText}>
            Specialist • {mechanic.specialization || 'General Roadside Assistance'}
          </Text>
        </View>

        {/* Rating Breakdown Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ratings Breakdown</Text>
          {[
            { stars: '5 ★', count: breakdown.five },
            { stars: '4 ★', count: breakdown.four },
            { stars: '3 ★', count: breakdown.three },
            { stars: '2 ★', count: breakdown.two },
            { stars: '1 ★', count: breakdown.one },
          ].map((item, idx) => {
            const widthPct = getPercentage(item.count);
            return (
              <View key={idx} style={styles.breakdownRow}>
                <Text style={styles.starLabel}>{item.stars}</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.barFill, { width: widthPct }]} />
                </View>
                <Text style={styles.countLabel}>{item.count}</Text>
              </View>
            );
          })}
        </View>

        {/* Tags Summary */}
        {Object.keys(tagCounts).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top Complement Tags</Text>
            <View style={styles.tagsContainer}>
              {Object.entries(tagCounts).map(([tag, count]) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag} ({count})</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.reviewsTitle}>Customer Reviews ({reviews.length})</Text>
      </View>
    );
  };

  const renderReviewItem = ({ item }) => {
    const formattedDate = new Date(item.createdAt).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewerName}>{item.customerId?.name || 'Anonymous Customer'}</Text>
          <Text style={styles.reviewDate}>{formattedDate}</Text>
        </View>
        
        <View style={styles.reviewStarsRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Text key={i} style={[styles.miniStar, i < item.rating ? styles.miniStarSelected : styles.miniStarUnselected]}>
              ★
            </Text>
          ))}
        </View>

        {item.review ? (
          <Text style={styles.reviewComment}>{item.review}</Text>
        ) : (
          <Text style={[styles.reviewComment, styles.noComment]}>No review comment left.</Text>
        )}

        {item.tags && item.tags.length > 0 && (
          <View style={styles.reviewTagsRow}>
            {item.tags.map((tag) => (
              <Text key={tag} style={styles.reviewTag}>#{tag}</Text>
            ))}
          </View>
        )}

        {/* Mechanic Reply Box */}
        {item.mechanicReply && (
          <View style={styles.replyBox}>
            <Text style={styles.replyHeader}>Reply from {mechanic.userId?.name || 'Mechanic'}:</Text>
            <Text style={styles.replyText}>{item.mechanicReply}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navBackArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navbarTitle}>Mechanic Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={reviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No reviews left for this mechanic yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  navbar: {
    height: 60,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 1,
  },
  navBackBtn: {
    padding: 8,
  },
  navBackArrow: {
    fontSize: 24,
    color: '#B34700',
    fontWeight: 'bold',
  },
  navbarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#B34700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00BFA5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  mechanicName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingStars: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFB300',
    marginRight: 6,
  },
  ratingCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  specializationText: {
    fontSize: 14,
    color: '#4B5563',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
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
    color: '#4B5563',
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FFB300',
    borderRadius: 4,
  },
  countLabel: {
    width: 25,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: '#E5FBF7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#B2F3E7',
  },
  tagChipText: {
    color: '#00796B',
    fontSize: 13,
    fontWeight: '600',
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewerName: {
    fontWeight: 'bold',
    color: '#374151',
    fontSize: 14,
  },
  reviewDate: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  miniStar: {
    fontSize: 14,
    marginRight: 2,
  },
  miniStarSelected: {
    color: '#FFB300',
  },
  miniStarUnselected: {
    color: '#E5E7EB',
  },
  reviewComment: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  noComment: {
    fontStyle: 'italic',
    color: '#9CA3AF',
  },
  reviewTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  reviewTag: {
    color: '#B34700',
    fontSize: 12,
    marginRight: 8,
    fontWeight: '500',
  },
  replyBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderColor: '#00BFA5',
  },
  replyHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  replyText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontStyle: 'italic',
  },
});
