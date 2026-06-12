import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';

export default function ReviewsScreen({ navigation }) {
  const { mechanicToken, mechanic } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [mechanicStats, setMechanicStats] = useState(null);
  const [tagCounts, setTagCounts] = useState({});

  // Modal State
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedRatingId, setSelectedRatingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    fetchProfileAndReviews();
  }, []);

  const fetchProfileAndReviews = async () => {
    setLoading(true);
    try {
      // 1. Fetch current mechanic details
      const mechRes = await fetch(`${API_URL}/api/mechanic/profile`, {
        headers: { 'Authorization': `Bearer ${mechanicToken}` }
      });
      const mechData = await mechRes.json();
      if (mechRes.ok && mechData.success) {
        setMechanicStats(mechData.mechanic);
        
        // 2. Fetch reviews
        const mechanicId = mechData.mechanic?._id || mechData.mechanic?.id;
        if (mechanicId) {
          const reviewRes = await fetch(`${API_URL}/api/ratings/mechanic/${mechanicId}`);
          const reviewData = await reviewRes.json();
          if (reviewRes.ok && reviewData.success) {
            const ratings = reviewData.ratings || [];
            setReviews(ratings);

            // Accumulate tag counts
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
        }
      }
    } catch (error) {
      console.log('Error fetching mechanic reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReplyModal = (ratingId) => {
    setSelectedRatingId(ratingId);
    setReplyText('');
    setReplyModalVisible(true);
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      Alert.alert('Validation Error', 'Please type a reply before submitting.');
      return;
    }

    setSubmittingReply(true);
    try {
      const response = await fetch(`${API_URL}/api/ratings/${selectedRatingId}/reply`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        },
        body: JSON.stringify({ reply: replyText.trim() })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        // Update local list
        setReviews((prev) =>
          prev.map((r) =>
            r._id === selectedRatingId ? { ...r, mechanicReply: replyText.trim() } : r
          )
        );
        setReplyModalVisible(false);
        Alert.alert('Success', 'Your reply was submitted successfully.');
      } else {
        Alert.alert('Error', data.message || 'Failed to submit reply.');
      }
    } catch (error) {
      console.log('Error replying to rating:', error);
      Alert.alert('Error', 'Server unreachable. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const getPercentage = (count) => {
    const total = mechanicStats?.totalRatings || 0;
    if (total === 0) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  };

  const renderHeader = () => {
    if (!mechanicStats) return null;
    const breakdown = mechanicStats.ratingBreakdown || { five: 0, four: 0, three: 0, two: 0, one: 0 };
    const total = mechanicStats.totalRatings || 0;

    return (
      <View>
        {/* Rating Card */}
        <View style={styles.statsCard}>
          <Text style={styles.starsHero}>⭐ {mechanicStats.rating ? mechanicStats.rating.toFixed(1) : '5.0'}</Text>
          <Text style={styles.reviewsCountHero}>Overall rating based on {total} customer reviews</Text>
        </View>

        {/* Breakdown Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ratings Breakdown</Text>
          {[
            { label: '5 ★', count: breakdown.five },
            { label: '4 ★', count: breakdown.four },
            { label: '3 ★', count: breakdown.three },
            { label: '2 ★', count: breakdown.two },
            { label: '1 ★', count: breakdown.one },
          ].map((item, idx) => {
            const widthPct = getPercentage(item.count);
            return (
              <View key={idx} style={styles.breakdownRow}>
                <Text style={styles.starLabel}>{item.label}</Text>
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
            <Text style={styles.cardTitle}>Complement Feedback Summary</Text>
            <View style={styles.tagsContainer}>
              {Object.entries(tagCounts).map(([tag, count]) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag} ({count})</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.reviewsTitle}>All Reviews ({reviews.length})</Text>
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

        <View style={styles.starsRow}>
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
        {item.mechanicReply ? (
          <View style={styles.replyBox}>
            <Text style={styles.replyHeader}>Your Reply:</Text>
            <Text style={styles.replyText}>{item.mechanicReply}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.replyBtn}
            onPress={() => handleOpenReplyModal(item._id)}
          >
            <Text style={styles.replyBtnText}>💬 Reply to Review</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00BFA5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navbar header */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navBackArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navbarTitle}>My Customer Reviews</Text>
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
            <Text style={styles.emptyText}>You haven't received any customer ratings yet.</Text>
          </View>
        }
      />

      {/* Reply Modal */}
      <Modal visible={replyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reply to Review</Text>
            <Text style={styles.modalSub}>This reply will be visible on your public customer profile.</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Write your professional response..."
              placeholderTextColor="#888"
              value={replyText}
              onChangeText={setReplyText}
              multiline
              numberOfLines={4}
              maxLength={300}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setReplyModalVisible(false)}
                disabled={submittingReply}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSubmitBtn]}
                onPress={handleSubmitReply}
                disabled={submittingReply}
              >
                {submittingReply ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Reply</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  navbar: {
    height: 60,
    backgroundColor: '#252542',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#3a3a5a',
  },
  navBackBtn: {
    padding: 8,
  },
  navBackArrow: {
    fontSize: 24,
    color: '#00BFA5',
    fontWeight: 'bold',
  },
  navbarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  statsCard: {
    alignItems: 'center',
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  starsHero: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFB300',
    marginBottom: 8,
  },
  reviewsCountHero: {
    fontSize: 14,
    color: '#aaaaaa',
  },
  card: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
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
    color: '#aaaaaa',
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#00BFA5',
    borderRadius: 4,
  },
  countLabel: {
    width: 25,
    fontSize: 13,
    color: '#aaaaaa',
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: '#1E3A3A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#00BFA5',
  },
  tagChipText: {
    color: '#00BFA5',
    fontSize: 13,
    fontWeight: '600',
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewerName: {
    fontWeight: 'bold',
    color: '#ffffff',
    fontSize: 14,
  },
  reviewDate: {
    color: '#888888',
    fontSize: 12,
  },
  starsRow: {
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
    color: '#3a3a5a',
  },
  reviewComment: {
    color: '#dddddd',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  noComment: {
    fontStyle: 'italic',
    color: '#888888',
  },
  reviewTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  reviewTag: {
    color: '#00BFA5',
    fontSize: 12,
    marginRight: 8,
    fontWeight: '500',
  },
  replyBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderColor: '#FFB300',
    marginTop: 5,
  },
  replyHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFB300',
    marginBottom: 4,
  },
  replyText: {
    fontSize: 13,
    color: '#dddddd',
    lineHeight: 18,
  },
  replyBtn: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  replyBtnText: {
    color: '#00BFA5',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#888888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#252542',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    color: '#aaaaaa',
    marginBottom: 16,
  },
  modalInput: {
    height: 100,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#3a3a5a',
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  modalCancelText: {
    color: '#aaaaaa',
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: '#00BFA5',
  },
  modalSubmitText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
