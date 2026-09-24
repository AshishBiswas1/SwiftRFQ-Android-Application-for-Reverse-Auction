import { io } from 'socket.io-client';
import { Platform, NativeModules } from 'react-native';

const getDevHost = () => {
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1]) return match[1];
    }
  } catch (_) {}
  return Platform.OS === 'android' ? '192.168.29.203' : 'localhost';
};

const SOCKET_URL = `http://${getDevHost()}:5000`;


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
