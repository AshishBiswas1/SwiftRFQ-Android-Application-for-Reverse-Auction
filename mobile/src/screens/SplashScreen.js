import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Animated, StyleSheet, Easing, ScrollView, ActivityIndicator, NativeModules } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkPalette, strings, animations } from '../theme/tokens';
import api from '../services/api';
import { showCustomAlert } from '../services/customAlert';
import TruecallerService from '../services/truecaller';

try {
  GoogleSignin.configure({
    webClientId: '373619569246-hkblh4khr8ddh6ro4vda0l6p5s4fiaah.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
  });
} catch (cfgErr) {
  console.warn('[GoogleSignin Configure]', cfgErr);
}


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

function UserIcon({ color, size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

function PhoneIcon({ color, size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92V19.92C22.0011 20.1986 21.9441 20.4742 21.8325 20.7294C21.7209 20.9846 21.5573 21.2137 21.3521 21.4019C21.1468 21.5902 20.9046 21.7336 20.6407 21.8228C20.3769 21.912 20.0974 21.9451 19.82 21.92C16.7428 21.5857 13.787 20.5342 11.19 18.85C8.77382 17.3147 6.72533 15.2662 5.19 12.85C3.49997 10.2413 2.44824 7.27109 2.12 4.18C2.095 3.90353 2.12787 3.62489 2.21658 3.36171C2.30529 3.09852 2.44787 2.85673 2.6353 2.65174C2.82273 2.44675 3.05078 2.28314 3.30501 2.17133C3.55925 2.05952 3.83398 2.00201 4.11 2.00003H7.11C7.5953 1.99524 8.06579 2.16709 8.43376 2.48354C8.80173 2.8 9.04207 3.23953 9.11 3.72C9.23662 4.68007 9.47144 5.62273 9.81 6.53C9.94454 6.88792 9.97366 7.27691 9.8939 7.65089C9.81415 8.02486 9.62886 8.36812 9.36 8.64L8.09 9.91C9.51355 12.4135 11.5865 14.4865 14.09 15.91L15.36 14.64C15.6319 14.3711 15.9751 14.1858 16.3491 14.1061C16.7231 14.0263 17.1121 14.0555 17.47 14.19C18.3773 14.5286 19.3199 14.7634 20.28 14.89C20.7657 14.9585 21.2094 15.2033 21.5265 15.5768C21.8437 15.9504 22.0125 16.4276 22 16.92Z"
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
  const [signupType, setSignupType] = useState('SUPPLIER'); // 'SUPPLIER' (default) | 'BUYER'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [tcLoading, setTcLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // 1-Tap Mobile Verification via Truecaller
  const handleTruecallerVerify = async () => {
    try {
      setTcLoading(true);
      const isAvail = await TruecallerService.isAvailable();
      if (!isAvail) {
        showCustomAlert(
          'Truecaller Not Detected',
          'Truecaller 1-tap verification is not active or installed on this device. Would you like to use simulated verification for testing?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Simulate Verify (Dev)',
              onPress: async () => {
                try {
                  setTcLoading(true);
                  const devRes = await TruecallerService.devMockVerify({ phone: phone.trim() || '+919876543210' });
                  if (devRes.success) {
                    setPhone(devRes.phone);
                    setIsPhoneVerified(true);
                    showCustomAlert('Verified', `Mobile number ${devRes.phone} verified successfully!`, null, { type: 'success' });
                  }
                } catch (e) {
                  showCustomAlert('Verification Error', e.message);
                } finally {
                  setTcLoading(false);
                }
              },
            },
          ],
          { type: 'phone' }
        );
        return;
      }

      const res = await TruecallerService.verifyPhone({ phoneFallback: phone.trim() });
      if (res.success && res.phone) {
        setPhone(res.phone);
        setIsPhoneVerified(true);
        if (res.profile?.name && !name) {
          setName(res.profile.name);
        }
        showCustomAlert('Verified with Truecaller', `Mobile number ${res.phone} verified!`, null, { type: 'success' });
      }
    } catch (err) {
      console.warn('[Truecaller Verification Error]', err);
      showCustomAlert('Verification Notice', err.message || 'Truecaller verification failed.');
    } finally {
      setTcLoading(false);
    }
  };



  const handleGoogleAuthResponse = async (accessToken, idToken, fallbackUserInfo = null) => {
    try {
      setAuthLoading(true);
      let userInfo = fallbackUserInfo;

      // Fetch user profile (email, name, picture) directly from Google API using access token
      if (!userInfo && accessToken) {
        try {
          const userInfoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (userInfoRes.ok) {
            userInfo = await userInfoRes.json();
          }
        } catch (fetchErr) {
          console.warn('[Google UserInfo Fetch Error]', fetchErr);
        }
      }

      // Synchronize authenticated user with backend & MongoDB Atlas
      // Role is determined by the chosen signup type (Buyer -> BUYER, Supplier -> SUPPLIER)
      const typeToSend = authTab === 'signup' ? signupType : undefined;
      const phoneToSend = phone ? phone.trim() : undefined;
      const result = await api.googleAuth(idToken, userInfo, password || undefined, typeToSend, phoneToSend, isPhoneVerified);
      if (result?.success && result.user) {
        await AsyncStorage.setItem('swiftrfq_user_session', JSON.stringify(result.user));
        const destination = result.user.role === 'BUYER' ? 'BUYER_DASHBOARD' : 'SUPPLIER_PORTAL';

        const userIsVerified = result.user.isPhoneVerified;

        // If signing up using Google and mobile number is unverified, show 12-hour grace period warning
        if (result.isNewUser && !userIsVerified) {
          showCustomAlert(
            'Mobile Verification Required',
            'Your Google account does not have a verified mobile number. Please verify your mobile number in Settings in the next 12 hours, otherwise your account will be automatically deleted.',
            [
              {
                text: 'Go to Settings',
                onPress: () => {
                  onContinue('SETTINGS', result.user);
                },
              },
              {
                text: 'I Understand (12h Grace Period)',
                style: 'cancel',
                onPress: () => {
                  if (result.isNewUser) {
                    onContinue('INTRO', result.user);
                  } else {
                    onContinue(destination, result.user);
                  }
                },
              },
            ],
            { cancelable: false, type: 'phone' }
          );
          return;
        }

        if (result.isNewUser) {
          onContinue('INTRO', result.user);
        } else {
          onContinue(destination, result.user);
        }
      } else {
        throw new Error(result?.message || 'Authentication failed');
      }
    } catch (err) {
      console.warn('[Google Auth Error]', err);
      showCustomAlert('Sign-in Notice', err.message || 'Unable to authenticate with backend.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (authLoading) return;
    setAuthLoading(true);

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken || signInResult.idToken || null;
      const user = signInResult.data?.user || signInResult.user || null;

      if (!idToken && !user) {
        throw new Error('No user account data returned by Google.');
      }

      await handleGoogleAuthResponse(null, idToken, user);
    } catch (err) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('[Google Sign-In] User cancelled account picker');
      } else if (err.code === statusCodes.IN_PROGRESS) {
        console.log('[Google Sign-In] Sign-in in progress');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showCustomAlert('Google Play Services Required', 'Google Play Services is not available or needs an update on your device.');
      } else {
        console.warn('[Google Sign-In Error]', err);
        showCustomAlert('Google Sign-In Notice', err.message || 'Unable to sign in with Google. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (isSignup) => {
    if (isSignup && (!name || name.trim().length === 0)) {
      showCustomAlert('Name Required', 'Please enter your full name or company representative name.');
      return;
    }
    if (isSignup && (!phone || phone.trim().length < 7)) {
      showCustomAlert('Mobile Number Required', 'Please enter a valid mobile number.', null, { type: 'phone' });
      return;
    }
    if (isSignup && !isPhoneVerified) {
      showCustomAlert(
        'Truecaller Verification Required',
        'Please verify your mobile number with Truecaller before creating your account.',
        [
          {
            text: 'Verify with Truecaller',
            onPress: handleTruecallerVerify,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { type: 'phone' }
      );
      return;
    }
    if (!email || !email.includes('@')) {
      showCustomAlert('Invalid Email', 'Please enter a valid work email address.');
      return;
    }
    if (!password || password.trim().length === 0) {
      showCustomAlert('Password Required', 'Please enter your password.');
      return;
    }
    if (isSignup && password.length < 6) {
      showCustomAlert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setAuthLoading(true);
      let result;
      if (isSignup) {
        // Buyer signup assigns BUYER role, Supplier signup assigns SUPPLIER role
        result = await api.signup({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          isPhoneVerified: true,
          password: password,
          signupType,
          role: signupType,
        });
      } else {
        result = await api.login({
          email: email.trim(),
          password: password,
        });
      }

      if (result?.success && result.user) {
        await AsyncStorage.setItem('swiftrfq_user_session', JSON.stringify(result.user));
        const destination = result.user.role === 'BUYER' ? 'BUYER_DASHBOARD' : 'SUPPLIER_PORTAL';
        if (isSignup || result.isNewUser) {
          onContinue('INTRO', result.user);
        } else {
          onContinue(destination, result.user);
        }
      } else {
        showCustomAlert('Authentication Failed', result?.message || 'Invalid credentials.');
      }
    } catch (err) {
      showCustomAlert('Authentication Notice', err.message || 'Could not authenticate.');
    } finally {
      setAuthLoading(false);
    }
  };

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
              {/* Signup Type Selector: Supplier Signup vs Buyer Signup */}
              <View style={[styles.roleSelectBox, { backgroundColor: theme.surface, borderColor: theme.line }]}>
                <View style={styles.roleSelectHeader}>
                  <Text style={[styles.roleSelectKicker, { color: theme.brass }]}>SIGNUP TYPE</Text>
                  <View style={[styles.permanentBadge, { backgroundColor: theme.surface2 }]}>
                    <Text style={[styles.permanentBadgeText, { color: theme.inkDim }]}>🔒 Role is Permanent</Text>
                  </View>
                </View>

                <View style={styles.roleOptionRow}>
                  {/* Supplier Signup Option (Default) */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      {
                        backgroundColor: signupType === 'SUPPLIER' ? 'rgba(95,107,69,0.12)' : theme.surface2,
                        borderColor: signupType === 'SUPPLIER' ? theme.olive : theme.line,
                        borderWidth: signupType === 'SUPPLIER' ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSignupType('SUPPLIER')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.roleOptionTop}>
                      <Text style={styles.roleOptionEmoji}>🏷️</Text>
                      {signupType === 'SUPPLIER' && (
                        <View style={[styles.defaultPill, { backgroundColor: theme.olive }]}>
                          <Text style={[styles.defaultPillText, { color: theme.primaryText }]}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.roleOptionTitle,
                        { color: signupType === 'SUPPLIER' ? theme.olive : theme.ink },
                      ]}
                    >
                      Supplier Signup
                    </Text>
                    <Text style={[styles.roleOptionDesc, { color: theme.inkDim }]}>
                      Assigns the Supplier role for bidding on live RFQs.
                    </Text>
                  </TouchableOpacity>

                  {/* Buyer Signup Option */}
                  <TouchableOpacity
                    style={[
                      styles.roleOptionCard,
                      {
                        backgroundColor: signupType === 'BUYER' ? 'rgba(198,151,73,0.12)' : theme.surface2,
                        borderColor: signupType === 'BUYER' ? theme.brass : theme.line,
                        borderWidth: signupType === 'BUYER' ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSignupType('BUYER')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.roleOptionTop}>
                      <Text style={styles.roleOptionEmoji}>📦</Text>
                      {signupType === 'BUYER' && (
                        <View style={[styles.defaultPill, { backgroundColor: theme.brass }]}>
                          <Text style={[styles.defaultPillText, { color: theme.primaryText }]}>Selected</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.roleOptionTitle,
                        { color: signupType === 'BUYER' ? theme.brass : theme.ink },
                      ]}
                    >
                      Buyer Signup
                    </Text>
                    <Text style={[styles.roleOptionDesc, { color: theme.inkDim }]}>
                      Assigns the Buyer role for creating RFQs & auctions.
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.roleSelectNotice, { color: theme.inkDim }]}>
                  Your account role is determined by your signup type: a Buyer signup assigns the Buyer role, and a Supplier signup assigns the Supplier role. Roles cannot be changed after registration.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.googleBtn, { backgroundColor: theme.surface, borderColor: theme.line, borderWidth: 1 }]}
                onPress={handleGoogleSignIn}
                disabled={authLoading}
              >
                {authLoading ? (
                  <ActivityIndicator size="small" color={theme.brass} />
                ) : (
                  <>
                    <Text style={[styles.googleIcon, { color: theme.brass }]}>G</Text>
                    <Text style={[styles.googleBtnLabel, { color: theme.ink }]}>
                      Sign up with Google as {signupType === 'BUYER' ? 'Buyer' : 'Supplier'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.orLine}>
                <View style={[styles.orDivider, { backgroundColor: theme.line }]} />
                <Text style={[styles.orText, { color: theme.inkDim }]}>{strings.orEmail}</Text>
                <View style={[styles.orDivider, { backgroundColor: theme.line }]} />
              </View>

              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
                {/* Full Name Field with Vector User Icon */}
                <View style={[styles.inputRow, { backgroundColor: theme.surface2, borderColor: theme.line }]}>
                  <UserIcon color={theme.inkDim} />
                  <TextInput
                    style={[styles.inputFlex, { color: theme.ink }]}
                    placeholder="Full name (e.g. Rahul Sharma)"
                    placeholderTextColor={theme.inkDim}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>

                {/* Mobile Number Field with Vector Phone Icon & Truecaller 1-Tap Button */}
                <View style={[styles.inputRow, { backgroundColor: theme.surface2, borderColor: isPhoneVerified ? '#10B981' : theme.line }]}>
                  <PhoneIcon color={isPhoneVerified ? '#10B981' : theme.inkDim} />
                  <TextInput
                    style={[styles.inputFlex, { color: theme.ink }]}
                    placeholder="Mobile number (e.g. +91 98765 43210)"
                    placeholderTextColor={theme.inkDim}
                    value={phone}
                    onChangeText={(val) => {
                      setPhone(val);
                      setIsPhoneVerified(false);
                    }}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    editable={!isPhoneVerified}
                  />
                  {isPhoneVerified ? (
                    <View style={{ backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                      <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>✓ Verified</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleTruecallerVerify}
                      disabled={tcLoading}
                      style={{
                        backgroundColor: '#0087FF',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      {tcLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Truecaller</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Email Field with Vector Mail Icon */}
                <View style={[styles.inputRow, { backgroundColor: theme.surface2, borderColor: theme.line }]}>
                  <MailIcon color={theme.inkDim} />
                  <TextInput
                    style={[styles.inputFlex, { color: theme.ink }]}
                    placeholder="Work email"
                    placeholderTextColor={theme.inkDim}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
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
                  onPress={() => handleEmailAuth(true)}
                  disabled={authLoading}
                >
                  <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>
                    {authLoading
                      ? 'Creating account...'
                      : `Register as ${signupType === 'BUYER' ? 'Buyer' : 'Supplier'}`}
                  </Text>
                  <ArrowRightCircleIcon color={theme.brass} bg={theme.primaryText} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.subText, { color: theme.inkDim }]}>
                🔒 {signupType === 'BUYER' ? 'Buyer' : 'Supplier'} role is permanently assigned based on your signup type.
              </Text>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <TouchableOpacity
                style={[styles.googleBtn, { backgroundColor: theme.surface, borderColor: theme.line, borderWidth: 1 }]}
                onPress={handleGoogleSignIn}
                disabled={authLoading}
              >
                {authLoading ? (
                  <ActivityIndicator size="small" color={theme.brass} />
                ) : (
                  <>
                    <Text style={[styles.googleIcon, { color: theme.brass }]}>G</Text>
                    <Text style={[styles.googleBtnLabel, { color: theme.ink }]}>Log in with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.orLine}>
                <View style={[styles.orDivider, { backgroundColor: theme.line }]} />
                <Text style={[styles.orText, { color: theme.inkDim }]}>{strings.orEmail}</Text>
                <View style={[styles.orDivider, { backgroundColor: theme.line }]} />
              </View>

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
                    keyboardType="email-address"
                    autoCapitalize="none"
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
                  onPress={() => handleEmailAuth(false)}
                  disabled={authLoading}
                >
                  <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>
                    {authLoading ? 'Logging in...' : 'Log in'}
                  </Text>
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
  roleSelectBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  roleSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleSelectKicker: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  permanentBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  permanentBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  roleOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOptionCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  roleOptionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleOptionEmoji: {
    fontSize: 20,
  },
  defaultPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultPillText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  roleOptionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  roleOptionDesc: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  roleSelectNotice: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 10,
  },
});
