import { Platform, NativeModules } from 'react-native';
import api from './api';

const { TruecallerAuthModule } = NativeModules;

export const TruecallerService = {
  /**
   * Check if Truecaller 1-tap verification is available on this Android device.
   * Requires Truecaller app installed and logged in.
   */
  isAvailable: async () => {
    if (Platform.OS !== 'android' || !TruecallerAuthModule) {
      return false;
    }
    try {
      return await TruecallerAuthModule.isUsable();
    } catch (err) {
      console.warn('[Truecaller] isUsable check error:', err.message);
      return false;
    }
  },

  /**
   * Initiate Truecaller 1-tap verification flow.
   * Shows native Truecaller overlay dialog, receives OAuth authorization code,
   * and exchanges it on the SwiftRFQ server for verified phone & profile.
   */
  verifyPhone: async ({ userId, phoneFallback } = {}) => {
    if (Platform.OS !== 'android' || !TruecallerAuthModule) {
      throw new Error('Truecaller verification is only supported on Android devices.');
    }

    const available = await TruecallerAuthModule.isUsable();
    if (!available) {
      throw new Error(
        'Truecaller is not installed or available on this device. Please make sure the Truecaller app is installed and you are logged into your account.'
      );
    }

    // 1. Trigger native Truecaller overlay
    const authData = await TruecallerAuthModule.authenticate();
    if (!authData || !authData.code) {
      throw new Error('Did not receive authorization code from Truecaller');
    }

    // 2. Exchange authorization code with SwiftRFQ backend
    const verificationResult = await api.verifyTruecaller({
      code: authData.code,
      codeVerifier: authData.codeVerifier,
      userId,
      phone: phoneFallback,
    });

    return verificationResult;
  },

  /**
   * Development testing fallback helper when running on emulator without Truecaller app.
   */
  devMockVerify: async ({ phone, userId } = {}) => {
    return await api.verifyTruecaller({
      code: `MOCK_DEV_${Date.now()}`,
      phone: phone || '+919876543210',
      userId,
    });
  },
};

export default TruecallerService;
