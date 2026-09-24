import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { darkPalette } from '../theme/tokens';
import { registerAlertHandler } from '../services/customAlert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Determine icon and color accents based on title, message, or explicit type
 */
function resolvePopupStyle(type, title = '', message = '') {
  const combined = `${type || ''} ${title} ${message}`.toLowerCase();

  if (type === 'success' || combined.includes('success') || combined.includes('saved') || combined.includes('transmitted') || combined.includes('cleared')) {
    return {
      type: 'success',
      badgeBg: 'rgba(95, 107, 69, 0.18)',
      badgeBorder: '#7C8B5F',
      accentColor: '#7C8B5F',
      symbol: '✓',
      kicker: 'SUCCESS',
    };
  }

  if (type === 'error' || combined.includes('error') || combined.includes('failed') || combined.includes('weak') || combined.includes('mismatch') || combined.includes('invalid')) {
    return {
      type: 'error',
      badgeBg: 'rgba(166, 81, 47, 0.18)',
      badgeBorder: '#A6512F',
      accentColor: '#A6512F',
      symbol: '✕',
      kicker: 'ATTENTION',
    };
  }

  if (type === 'phone' || combined.includes('mobile') || combined.includes('phone')) {
    return {
      type: 'phone',
      badgeBg: 'rgba(198, 151, 73, 0.18)',
      badgeBorder: '#C69749',
      accentColor: '#C69749',
      symbol: '📱',
      kicker: 'PROFILE SETUP',
    };
  }

  if (type === 'warning' || combined.includes('notice') || combined.includes('required') || combined.includes('warning') || combined.includes('incomplete')) {
    return {
      type: 'warning',
      badgeBg: 'rgba(198, 151, 73, 0.18)',
      badgeBorder: '#C69749',
      accentColor: '#C69749',
      symbol: '!',
      kicker: 'ACTION REQUIRED',
    };
  }

  return {
    type: 'info',
    badgeBg: 'rgba(198, 151, 73, 0.14)',
    badgeBorder: '#C69749',
    accentColor: '#C69749',
    symbol: '▲',
    kicker: 'NOTICE',
  };
}

/**
 * Reusable Custom Popup Container
 */
export function CustomPopup({
  visible = false,
  title = '',
  message = '',
  type = 'info',
  buttons = [],
  cancelable = true,
  onClose,
  theme = darkPalette,
}) {
  const [showModal, setShowModal] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  if (!showModal) return null;

  const styleConfig = resolvePopupStyle(type, title, message);
  const actionButtons = Array.isArray(buttons) && buttons.length > 0
    ? buttons
    : [{ text: 'OK', onPress: onClose }];

  // Auto-stack buttons if text is long or there are more than 2 buttons
  const isStacked =
    actionButtons.length > 2 ||
    actionButtons.some((b) => (b.text || '').length > 12);

  const handleButtonPress = (btn) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      if (onClose) onClose();
      if (btn.onPress) btn.onPress();
    });
  };

  const handleBackdropPress = () => {
    if (cancelable) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false);
        if (onClose) onClose();
      });
    }
  };

  return (
    <Modal
      transparent
      visible={showModal}
      animationType="none"
      onRequestClose={handleBackdropPress}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={[
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.line,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Top Accent Strip */}
              <View
                style={[
                  styles.accentStrip,
                  { backgroundColor: styleConfig.accentColor },
                ]}
              />

              {/* Icon Badge */}
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: styleConfig.badgeBg,
                    borderColor: styleConfig.badgeBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: styleConfig.accentColor },
                    styleConfig.symbol === '📱' && { fontSize: 20 },
                  ]}
                >
                  {styleConfig.symbol}
                </Text>
              </View>

              {/* Kicker & Title */}
              <Text style={[styles.kicker, { color: styleConfig.accentColor }]}>
                {styleConfig.kicker}
              </Text>
              {Boolean(title) && (
                <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>
              )}

              {/* Message Body */}
              {Boolean(message) && (
                <Text style={[styles.message, { color: theme.inkDim }]}>
                  {message}
                </Text>
              )}

              {/* Action Buttons Container */}
              <View
                style={[
                  styles.buttonRow,
                  isStacked ? styles.buttonStack : styles.buttonSideBySide,
                ]}
              >
                {actionButtons.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  const isPrimary = !isCancel && !isDestructive;

                  let btnBg = theme.brass;
                  let textColor = theme.primaryText;
                  let borderStyle = null;

                  if (isCancel) {
                    btnBg = theme.surface2;
                    textColor = theme.inkDim;
                    borderStyle = { borderWidth: 1, borderColor: theme.line };
                  } else if (isDestructive) {
                    btnBg = theme.rust || '#A6512F';
                    textColor = '#FFFFFF';
                  }

                  return (
                    <TouchableOpacity
                      key={`btn-${index}`}
                      style={[
                        styles.button,
                        { backgroundColor: btnBg },
                        borderStyle,
                        !isStacked && { flex: 1 },
                      ]}
                      onPress={() => handleButtonPress(btn)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          { color: textColor },
                          isPrimary && { fontWeight: '700' },
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/**
 * Global Host Component to render Custom Alerts across any screen
 */
export function CustomPopupHost({ theme = darkPalette }) {
  const [alertConfig, setAlertConfig] = useState(null);

  useEffect(() => {
    const unregister = registerAlertHandler((config) => {
      setAlertConfig(config);
    });
    return unregister;
  }, []);

  if (!alertConfig) return null;

  return (
    <CustomPopup
      visible={Boolean(alertConfig)}
      title={alertConfig.title}
      message={alertConfig.message}
      type={alertConfig.type}
      buttons={alertConfig.buttons}
      cancelable={alertConfig.cancelable !== false}
      theme={alertConfig.theme || theme}
      onClose={() => setAlertConfig(null)}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 48, 380),
    borderRadius: 20,
    borderWidth: 1.2,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
  },
  accentStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3.5,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  buttonRow: {
    width: '100%',
    marginTop: 4,
  },
  buttonSideBySide: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonStack: {
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CustomPopup;
