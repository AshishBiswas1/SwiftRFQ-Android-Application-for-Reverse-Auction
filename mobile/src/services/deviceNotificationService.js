import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const CHANNEL_ID = 'swiftrfq-auctions';

// Detect whether running in Expo Go (where remote notifications were removed in SDK 53)
let isExpoGo = false;
try {
  const { isRunningInExpoGo } = require('expo');
  if (typeof isRunningInExpoGo === 'function') {
    isExpoGo = isRunningInExpoGo();
  }
} catch (_) {}

if (!isExpoGo) {
  isExpoGo =
    Constants?.executionEnvironment === ExecutionEnvironment?.StoreClient ||
    Constants?.appOwnership === 'expo';
}

let Notifications = null;

// Only load expo-notifications when NOT in Expo Go to prevent Expo Go SDK 53+ crash
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.warn('[DeviceNotification] Could not initialize native notifications:', e.message);
  }
}

/**
 * Configure Android notification channel and request permission for device notification drawer.
 */
export async function initDeviceNotifications() {
  if (!Notifications || isExpoGo) {
    return false;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'SwiftRFQ Live Auctions & Bids',
        description: 'Instant alerts for live bidding rooms, outbids, and winners',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D98324',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    return false;
  }
}

/**
 * Post a notification directly to the Android notification dropdown / shade
 */
export async function showDeviceDropdownNotification({ title, message, data = {} }) {
  if (!Notifications || isExpoGo) {
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        data,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        channelId: CHANNEL_ID,
      },
      trigger: null,
    });
  } catch (err) {
    // Graceful fallback
  }
}

/**
 * Listen for user tapping on the notification in the device dropdown tray
 */
export function addNotificationResponseListener(callback) {
  if (!Notifications || isExpoGo) {
    return () => {};
  }

  try {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response?.notification?.request?.content?.data;
        if (callback && data) {
          callback(data);
        }
      } catch (e) {
        console.warn('[DeviceNotification] Tap handler warning:', e.message);
      }
    });

    return () => {
      try {
        subscription.remove();
      } catch (_) {}
    };
  } catch (err) {
    return () => {};
  }
}
