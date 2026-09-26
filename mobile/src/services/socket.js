import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

export const SOCKET_URL = (process.env.EXPO_PUBLIC_SOCKET_URL || API_BASE_URL).replace(/\/+$/, '');

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
