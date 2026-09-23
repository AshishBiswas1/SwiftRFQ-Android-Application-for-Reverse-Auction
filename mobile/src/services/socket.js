import { io } from 'socket.io-client';
import { Platform } from 'react-native';

// Android Emulator uses 10.0.2.2 to connect to localhost on host machine.
// iOS Simulator or Web uses localhost directly.
const SOCKET_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
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
