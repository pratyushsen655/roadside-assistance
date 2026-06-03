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
  SafeAreaView
} from 'react-native';
import axios from 'axios';
import { AuthContext, API_URL } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';

export default function ChatScreen({ route, navigation }) {
  const { requestId, receiverName } = route.params;
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    // 1. Fetch historical messages
    fetchChatHistory();

    // 2. Join the dedicated request room
    if (socket) {
      socket.emit('join_request_room', { requestId });

      // 3. Listen to incoming messages
      socket.on('receive_message', (message) => {
        setMessages((prev) => [...prev, message]);
      });
    }

    return () => {
      if (socket) {
        socket.off('receive_message');
      }
    };
  }, [socket, requestId]);

  // Auto scroll list to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const fetchChatHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/chats/${requestId}`);
      if (res.data.success) {
        setMessages(res.data.data);
      }
    } catch (err) {
      console.error('Failed loading chat history:', err.message);
    }
  };

  const handleSend = () => {
    if (!text.trim() || !socket) return;

    // Dispatch via socket
    socket.emit('send_message', {
      requestId,
      message: text.trim()
    });

    setText('');
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender === user._id || item.sender?._id === user._id;
    return (
      <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        <Text style={[styles.messageText, isMe ? styles.textMe : styles.textOther]}>{item.message}</Text>
        <Text style={styles.timestampText}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{receiverName || 'Chat'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your message..."
            placeholderTextColor="#8e8e93"
            value={text}
            onChangeText={setText}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#1c1c1e',
    backgroundColor: '#1c1c1e',
  },
  backArrow: {
    fontSize: 24,
    color: '#ff9500',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  bubbleMe: {
    backgroundColor: '#ff9500',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: '#1c1c1e',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  textMe: {
    color: '#000',
    fontWeight: '600',
  },
  textOther: {
    color: '#fff',
  },
  timestampText: {
    fontSize: 9,
    color: '#8e8e93',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1c1c1e',
    borderTopWidth: 1,
    borderColor: '#2c2c2e',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#2c2c2e',
    borderRadius: 22,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 14,
    marginRight: 10,
  },
  sendBtn: {
    width: 60,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#ff9500',
    fontWeight: '700',
    fontSize: 15,
  }
});
