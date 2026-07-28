import { io } from 'socket.io-client';
import API_URL from './api';

let socket;
let currentMechanicId = null;

export const joinMechanicRoom = (mechanicId) => {
  if (!mechanicId || mechanicId === 'null' || mechanicId === 'undefined') {
    console.warn('[SOCKET] Skipping room join — mechanicId is null/undefined');
    return;
  }
  currentMechanicId = mechanicId.toString();
  if (socket && socket.connected) {
    const ts = new Date().toISOString();
    socket.emit('join:mechanics:room');
    socket.emit('join:mechanic:room', { mechanicId: currentMechanicId });
    socket.emit('join:mechanic', currentMechanicId);
    console.log(`[TRACE Step 4 Client] [Room Join Emitted] Emitted "join:mechanics:room" and "join:mechanic:room" (mechanicId: "${currentMechanicId}") | Timestamp: ${ts}`);
  }
};

export const getSocket = (token, mechanicId) => {
  if (mechanicId && mechanicId !== 'null' && mechanicId !== 'undefined') {
    currentMechanicId = mechanicId.toString();
  }

  if (!socket) {
    if (!token) return null;
    socket = io(API_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    const joinRooms = () => {
      const ts = new Date().toISOString();
      socket.emit('join:mechanics:room');
      if (currentMechanicId && currentMechanicId !== 'null' && currentMechanicId !== 'undefined') {
        socket.emit('join:mechanic:room', { mechanicId: currentMechanicId });
        socket.emit('join:mechanic', currentMechanicId);
        console.log(`[TRACE Step 4 Client] [Room Join Emitted] Emitted "join:mechanic:room" (mechanicId: "${currentMechanicId}") | Timestamp: ${ts}`);
      } else {
        console.warn('[SOCKET] Skipping mechanic room join on connect — mechanicId not yet loaded');
      }
    };

    socket.on('connect', () => {
      const ts = new Date().toISOString();
      console.log(`[TRACE Step 4 Client] [Socket Connected] Connected to ${API_URL} | Socket ID: ${socket.id} | Timestamp: ${ts}`);
      joinRooms();
    });

    socket.io.on('reconnect', (attempt) => {
      const ts = new Date().toISOString();
      console.log(`[TRACE Step 4 Client] [Socket Reconnected] Attempt: ${attempt} | Socket ID: ${socket.id} | Timestamp: ${ts}`);
      joinRooms();
    });

    socket.on('disconnect', (reason) => {
      const ts = new Date().toISOString();
      console.log(`[TRACE Step 4 Client] [Socket Disconnected] Reason: "${reason}" | Timestamp: ${ts}`);
    });

    socket.on('connect_error', (error) => {
      console.log('[TRACE Step 4 Client Error] Socket Connection Error:', error.message, '| API_URL:', API_URL);
    });
  } else {
    // Socket already exists — update auth token if changed
    if (token && socket.auth?.token !== token) {
      socket.auth = { token };
      if (!socket.connected) {
        socket.connect();
      }
    }
    if (currentMechanicId && currentMechanicId !== 'null' && currentMechanicId !== 'undefined' && socket.connected) {
      joinMechanicRoom(currentMechanicId);
    }
  }
  return socket;
};
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
