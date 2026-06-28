import { io } from 'socket.io-client';
import API_URL from './api';

let socket;
export const getSocket = (token) => {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('[Socket Client] Connected successfully! Socket ID:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket Client] Disconnected. Reason:', reason);
    });

    socket.on('connect_error', (error) => {
      console.log('[Socket Client] Connection Error:', error.message);
    });
  }
  return socket;
};
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
