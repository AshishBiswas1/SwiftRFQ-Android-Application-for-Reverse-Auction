import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { lightPalette } from '../theme/tokens';

export default function TimerBadge({ secondsRemaining, theme = lightPalette }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isEndingSoon = secondsRemaining > 0 && secondsRemaining <= 60;

  useEffect(() => {
    if (isEndingSoon) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isEndingSoon]);

  const formatTime = (totalSeconds) => {
    if (totalSeconds <= 0) return 'AUCTION CLOSED';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isEndingSoon ? theme.dangerSoft : theme.surface,
          borderColor: isEndingSoon ? theme.danger : theme.primary,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <Text style={styles.clockIcon}>⏳</Text>
      <View style={styles.textColumn}>
        <Text style={[styles.label, { color: theme.textMuted }]}>TIME REMAINING</Text>
        <Text style={[styles.timerText, { color: isEndingSoon ? theme.danger : theme.primary }]}>
          {formatTime(secondsRemaining)}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: 'center',
    marginVertical: 10,
    borderWidth: 1,
  },
  clockIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  textColumn: {
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
