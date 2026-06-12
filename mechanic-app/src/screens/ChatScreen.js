import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';
import { getSocket } from '../config/socket';

export default function ChatScreen({ route, navigation }) {
  const { jobId, receiverName } = route.params;
  const { mechanicToken, mechanic } = useContext(AuthContext);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  const typingTimeoutRef = useRef(null);
  const socket = getSocket(mechanicToken);

  const markAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/chat/${jobId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
    } catch (err) {
      console.log('Error marking messages as read:', err.message);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/${jobId}/messages`, {
        headers: {
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed loading chat history:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
    markAsRead();

    if (socket) {
      // Join room
      socket.emit('join:job:room', { jobId });

      // Listen for incoming messages
      socket.on('chat:message', (message) => {
        if (message.jobId === jobId || message.requestId === jobId) {
          setMessages((prev) => [message, ...prev]);
          if (message.senderType === 'customer') {
            markAsRead();
          }
        }
      });

      // Listen for typing
      socket.on('chat:typing', (data) => {
        if (data.senderType === 'customer') {
          setIsTyping(true);
        }
      });

      socket.on('chat:stop:typing', () => {
        setIsTyping(false);
      });
    }

    return () => {
      if (socket) {
        socket.off('chat:message');
        socket.off('chat:typing');
        socket.off('chat:stop:typing');
      }
    };
  }, [jobId, socket]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const msgText = text.trim();
    setText('');

    if (socket) {
      socket.emit('chat:stop:typing', { jobId });
    }

    // Emit socket
    if (socket) {
      socket.emit('chat:send', {
        jobId,
        message: msgText,
        senderType: 'mechanic',
        senderId: mechanic?._id || mechanic?.id || 'mechanic_id'
      });
    }

    // POST REST API fallback
    try {
      await fetch(`${API_URL}/api/chat/${jobId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        },
        body: JSON.stringify({
          message: msgText,
          senderType: 'mechanic'
        })
      });
    } catch (err) {
      console.error('Error posting message to API:', err.message);
    }
  };

  const handleTextChange = (val) => {
    setText(val);

    if (socket) {
      socket.emit('chat:typing', { jobId, senderType: 'mechanic' });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (socket) {
        socket.emit('chat:stop:typing', { jobId });
      }
    }, 1500);
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderType === 'mechanic';
    const timeString = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.messageRow, isMe ? styles.rowMe : styles.rowOther]}>
        <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={styles.messageText}>{item.message}</Text>
          <View style={styles.bubbleFooter}>
            <Text style={styles.timestampText}>{timeString}</Text>
            {isMe && (
              <Text style={[styles.readReceipt, item.isRead ? styles.receiptRead : styles.receiptDelivered]}>
                ✓✓
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{receiverName || 'Customer'}</Text>
          <View style={styles.statusRow}>
            <View style={styles.activeDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#00BFA5" />
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item, index) => item._id || String(index)}
          contentContainerStyle={styles.listContainer}
          inverted
        />
      )}

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingIndicatorBox}>
          <Text style={styles.typingIndicatorText}>{receiverName || 'Customer'} is typing...</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#aaaaaa"
            value={text}
            onChangeText={handleTextChange}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendIcon}>➔</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Dark theme background
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: '#252542',
    backgroundColor: '#252542',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  backBtn: {
    padding: 8,
  },
  backArrow: {
    fontSize: 24,
    color: '#00BFA5',
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00BFA5',
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#aaaaaa',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    width: '100%',
  },
  rowMe: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  bubbleMe: {
    backgroundColor: '#00BFA5', // Teal background for mechanic
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: '#2a2a3e', // Dark background for customer
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#3a3a50',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#ffffff',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestampText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  readReceipt: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  receiptRead: {
    color: '#252542',
  },
  receiptDelivered: {
    color: 'rgba(255,255,255,0.4)',
  },
  typingIndicatorBox: {
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  typingIndicatorText: {
    fontSize: 12,
    color: '#aaaaaa',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#252542',
    borderTopWidth: 1,
    borderColor: '#3a3a50',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#3a3a50',
  },
  sendBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#00BFA5',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  sendIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
