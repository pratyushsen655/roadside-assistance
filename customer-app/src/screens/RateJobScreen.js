import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { AuthContext, API_URL } from '../context/AuthContext';

const AVAILABLE_TAGS = ['Professional', 'Fast', 'Affordable', 'Skilled', 'Friendly', 'On Time'];

export default function RateJobScreen({ route, navigation }) {
  const { jobId, mechanicName } = route.params || {};
  const { token } = useContext(AuthContext);

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Animations
  const starScales = [
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
  ];

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const handleStarPress = (index) => {
    setRating(index + 1);
    // Trigger pop bounce animation for the pressed star and those before it
    for (let i = 0; i <= index; i++) {
      starScales[i].value = withSequence(
        withSpring(1.4, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Selection Required', 'Please select a rating of 1 to 5 stars before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobId,
          rating,
          review,
          tags: selectedTags
        })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setIsSuccess(true);
      } else {
        Alert.alert('Error', data.message || 'Failed to submit rating.');
      }
    } catch (error) {
      console.log('Error submitting rating:', error);
      Alert.alert('Error', 'Server unreachable. Please check your network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[0, 1, 2, 3, 4].map((index) => {
          const isSelected = index < rating;
          const animatedStyle = useAnimatedStyle(() => {
            return {
              transform: [{ scale: starScales[index].value }]
            };
          });

          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => handleStarPress(index)}
            >
              <Animated.View style={[styles.starWrapper, animatedStyle]}>
                <Text style={[styles.starText, isSelected ? styles.starSelected : styles.starUnselected]}>
                  ★
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (isSuccess) {
    return (
      <View style={styles.successContainer}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.confettiOverlay}>
          <Text style={styles.confettiIcon}>🎉</Text>
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successSub}>Your feedback helps us maintain high quality service.</Text>
          
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.title}>Rate Service</Text>
        <Text style={styles.subtitle}>How was your experience with {mechanicName || 'your mechanic'}?</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
        {renderStars()}
        {rating > 0 && (
          <Text style={styles.ratingLabel}>
            {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Below Average' : 'Poor'}
          </Text>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>What went well?</Text>
        <View style={styles.tagsContainer}>
          {AVAILABLE_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>Write a Review (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Share details of your experience..."
          placeholderTextColor="#999"
          value={review}
          onChangeText={setReview}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.footer}>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Feedback</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.navigate('Home')}
          disabled={submitting}
        >
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 25,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  starWrapper: {
    paddingHorizontal: 8,
  },
  starText: {
    fontSize: 44,
  },
  starSelected: {
    color: '#FFB300',
  },
  starUnselected: {
    color: '#E0E0E0',
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFB300',
    marginTop: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  tagChip: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tagChipSelected: {
    backgroundColor: '#FFF3E0',
    borderColor: '#B34700',
  },
  tagText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  tagTextSelected: {
    color: '#B34700',
    fontWeight: 'bold',
  },
  textInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#FAFAFA',
    textAlignVertical: 'top',
    height: 120,
  },
  footer: {
    marginTop: 15,
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: '#B34700',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipBtn: {
    paddingVertical: 10,
  },
  skipBtnText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confettiOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiIcon: {
    fontSize: 70,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  successSub: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 35,
    paddingHorizontal: 20,
  },
  doneBtn: {
    backgroundColor: '#B34700',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
    elevation: 3,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
