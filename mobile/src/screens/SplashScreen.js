import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Animated, StyleSheet, Easing, ScrollView } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { darkPalette, strings, animations } from '../theme/tokens';

// Topographic Wave Header SVG Component
function TopographicWaveHeader({ theme }) {
  const isLight = theme.mode === 'light';
  const waveBg = isLight ? '#EFE6D2' : '#2B251D';
  const strokeColor = isLight ? 'rgba(169, 116, 38, 0.22)' : 'rgba(198, 151, 73, 0.22)';
  const strokeHighlight = isLight ? 'rgba(169, 116, 38, 0.38)' : 'rgba(198, 151, 73, 0.38)';

  return (
    <View style={styles.waveHeaderWrapper}>
      <Svg height="145" width="100%" viewBox="0 0 375 145" preserveAspectRatio="none">
        <Path d="M0,0 H375 V100 Q280,145 185,120 Q90,95 0,135 Z" fill={waveBg} />
        <Path d="M -20,35 Q 90,10 180,45 T 395,25" fill="none" stroke={strokeColor} strokeWidth="1.5" />
        <Path d="M -10,65 Q 110,35 200,75 T 400,55" fill="none" stroke={strokeHighlight} strokeWidth="1.5" />
        <Path d="M 10,90 Q 130,70 220,100 T 380,85" fill="none" stroke={strokeColor} strokeWidth="1.5" />
        <Path d="M 40,15 Q 160,-15 280,25 T 410,10" fill="none" stroke={strokeHighlight} strokeWidth="1.2" />
      </Svg>
    </View>
  );
}

// Vector Icons
function MailIcon({ color }) {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 6L12 13L2 6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LockIcon({ color }) {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EyeIcon({ color }) {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

function EyeOffIcon({ color }) {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.94 17.94A10.07 10.07 0 0112 20C7 20 1 12 1 12A18.45 18.45 0 015.06 6.06M9.9 4.24A9.12 9.12 0 0112 4C17 4 23 12 23 12A18.5 18.5 0 0119.73 16.4M1 1L23 23"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArrowRightCircleIcon({ color, bg }) {
  return (
    <Svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <Circle cx="13" cy="13" r="13" fill={bg} />
      <Path
        d="M9 13H17M17 13L13 9M17 13L13 17"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function SplashScreen({ onContinue, theme = darkPalette, onToggleTheme }) {
  const [ready, setReady] = useState(false);
  const [authTab, setAuthTab] = useState('signup'); // 'signup' | 'login'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Animation values
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.7)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentRise = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    const spinLoop = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    const timer = setTimeout(() => {
      setReady(true);
    }, animations.splashMinMs);

    return () => {
      pulseLoop.stop();
      spinLoop.stop();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    Animated.parallel([
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        delay: 50,
        useNativeDriver: true,
      }),
      Animated.timing(contentRise, {
        toValue: 0,
        duration: 500,
        delay: 50,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [ready]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.frame}>
      {/* Theme Toggle Button */}
      <TouchableOpacity
        style={[styles.themeBtn, { backgroundColor: theme.surface, borderColor: theme.line }]}
        onPress={onToggleTheme}
      >
        <Text style={{ fontSize: 13, color: theme.ink }}>{theme.mode === 'dark' ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>

      {/* Splash Stage Layer */}
      {!ready && (
        <Animated.View style={[styles.splashCenter, { opacity: splashOpacity }]}>
          <View style={styles.loaderWrap}>
            <Animated.View
              style={[
                styles.pulseRing,
                { borderColor: theme.brass, transform: [{ scale: pulseAnim }] },
              ]}
            />
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Text style={{ fontSize: 32 }}>⭕</Text>
            </Animated.View>
            <View style={styles.loaderLogo}>
              <Text style={[styles.brandMarkSymbol, { color: theme.brass }]}>▲</Text>
            </View>
          </View>
          <Text style={[styles.brandTitle, { color: theme.ink }]}>{strings.brandName}</Text>
        </Animated.View>
      )}

      {/* Content Stage Layer */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentRise }],
          },
        ]}
        pointerEvents={ready ? 'auto' : 'none'}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Topographic Organic Contour Wave Header */}
          <TopographicWaveHeader theme={theme} />

          <View style={styles.headerTextArea}>
            <View style={styles.brandRow}>
              <Text style={[styles.brandMarkSymbol, { color: theme.brass }]}>▲</Text>
              <Text style={[styles.brandTitleSmall, { color: theme.ink }]}>{strings.brandName}</Text>
            </View>
            <Text style={[styles.kicker, { color: theme.brass }]}>{strings.appTagline}</Text>
            <Text style={[styles.headline, { color: theme.ink }]}>{strings.heroHeadline}</Text>
          </View>

          {/* Auth Segmented Switcher Tabs */}
          <View style={[styles.authTabs, { backgroundColor: theme.surface2 }]}>
            <TouchableOpacity
              style={[styles.authTab, authTab === 'signup' && { backgroundColor: theme.surface }]}
              onPress={() => setAuthTab('signup')}
            >
              <Text style={[styles.authTabText, { color: authTab === 'signup' ? theme.ink : theme.inkDim }]}>
                Sign up
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authTab, authTab === 'login' && { backgroundColor: theme.surface }]}
              onPress={() => setAuthTab('login')}
            >
              <Text style={[styles.authTabText, { color: authTab === 'login' ? theme.ink : theme.inkDim }]}>
                Log in
              </Text>
            </TouchableOpacity>
          </View>

          {authTab === 'signup' ? (
            <View style={styles.formContainer}>
              <TouchableOpacity
                style={[styles.googleBtn, { backgroundColor: theme.surface, borderColor: theme.line, borderWidth: 1 }]}
                onPress={() => onContinue('INTRO')}
              >
                <Text style={[styles.googleIcon, { color: theme.brass }]}>G</Text>
                <Text style={[styles.googleBtnLabel, { color: theme.ink }]}>{strings.signInGoogle}</Text>
              </TouchableOpacity>

              <View style={styles.orLine}>
                <View style={[styles.orDivider, { backgroundColor: theme.line }]} />
                <Text style={[styles.orText, { color: theme.inkDim }]}>{strings.orEmail}</Text>
                <View style={[styles.orDivider, { backgroundColor: theme.line }]} />
              </View>

              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
                {/* Email Field with Vector Mail Icon */}
                <View style={[styles.inputRow, { backgroundColor: theme.surface2, borderColor: theme.line }]}>
                  <MailIcon color={theme.inkDim} />
                  <TextInput
                    style={[styles.inputFlex, { color: theme.ink }]}
                    placeholder="Work email"
                    placeholderTextColor={theme.inkDim}
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                {/* Password Field with Vector Lock Icon & Eye Toggle */}
                <View style={[styles.inputRow, { backgroundColor: theme.surface2, borderColor: theme.line }]}>
                  <LockIcon color={theme.inkDim} />
                  <TextInput
                    style={[styles.inputFlex, { color: theme.ink }]}
                    placeholder="Create password"
                    placeholderTextColor={theme.inkDim}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    {showPassword ? <EyeIcon color={theme.inkDim} /> : <EyeOffIcon color={theme.inkDim} />}
                  </TouchableOpacity>
                </View>

                {/* Action Button with Circular Arrow Badge */}
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: theme.brass }]}
                  onPress={() => onContinue('INTRO')}
                >
                  <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>Create account</Text>
                  <ArrowRightCircleIcon color={theme.brass} bg={theme.primaryText} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.subText, { color: theme.inkDim }]}>
                First time here — we'll ask what you're using SourceFloor for next.
              </Text>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
                {/* Email Field */}
                <View style={[styles.inputRow, { backgroundColor: theme.surface2, borderColor: theme.line }]}>
                  <MailIcon color={theme.inkDim} />
                  <TextInput
                    style={[styles.inputFlex, { color: theme.ink }]}
                    placeholder="Work email"
                    placeholderTextColor={theme.inkDim}
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                {/* Password Field */}
                <View style={[styles.inputRow, { backgroundColor: theme.surface2, borderColor: theme.line }]}>
                  <LockIcon color={theme.inkDim} />
                  <TextInput
                    style={[styles.inputFlex, { color: theme.ink }]}
                    placeholder="Password"
                    placeholderTextColor={theme.inkDim}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    {showPassword ? <EyeIcon color={theme.inkDim} /> : <EyeOffIcon color={theme.inkDim} />}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: theme.brass }]}
                  onPress={() => onContinue('BUYER_DASHBOARD')}
                >
                  <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>Log in</Text>
                  <ArrowRightCircleIcon color={theme.brass} bg={theme.primaryText} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.subText, { color: theme.inkDim }]}>
                Takes you straight back to your buyer or supplier view.
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  waveHeaderWrapper: {
    marginTop: -10,
    marginHorizontal: -20,
    overflow: 'hidden',
  },
  themeBtn: {
    position: 'absolute',
    top: 24,
    right: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  splashCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderWrap: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
  },
  loaderLogo: {
    position: 'absolute',
  },
  brandMarkSymbol: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  headerTextArea: {
    marginTop: -10,
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  brandTitleSmall: {
    fontSize: 20,
    fontWeight: '600',
  },
  kicker: {
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headline: {
    fontSize: 25,
    fontWeight: '600',
    lineHeight: 31,
    marginTop: 4,
  },
  authTabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 11,
    gap: 6,
    marginBottom: 14,
  },
  authTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  authTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formContainer: {
    gap: 10,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 13,
    borderRadius: 11,
    gap: 8,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleBtnLabel: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  orLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  orDivider: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 11,
    marginHorizontal: 10,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 10,
  },
  inputFlex: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  primaryBtn: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  subText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
});
