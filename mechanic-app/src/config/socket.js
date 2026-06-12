import { io } from 'socket.io-client';
import API_URL from './api';

let socket;
export const getSocket = (token) => {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket'],
      auth: { token }
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
