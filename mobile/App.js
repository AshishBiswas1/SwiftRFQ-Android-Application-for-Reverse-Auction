import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, StatusBar, View, Text, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import BuyerDashboardScreen from './src/screens/BuyerDashboardScreen';
import CreateRfqScreen from './src/screens/CreateRfqScreen';
import SupplierPortalScreen from './src/screens/SupplierPortalScreen';
import LiveAuctionRoomScreen from './src/screens/LiveAuctionRoomScreen';
import AuctionClosedScreen from './src/screens/AuctionClosedScreen';
import SupplierDirectoryScreen from './src/screens/SupplierDirectoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomNavBar from './src/components/BottomNavBar';
import WavyBackground from './src/components/WavyBackground';
import { CustomPopupHost } from './src/components/CustomPopup';
import { connectSocket, disconnectSocket, socket } from './src/services/socket';
import { lightPalette, darkPalette } from './src/theme/tokens';
import api from './src/services/api';
import {
  initDeviceNotifications,
  showDeviceDropdownNotification,
  addNotificationResponseListener,
} from './src/services/deviceNotificationService';

const THEME_STORAGE_KEY = 'swiftrfq_theme_mode';
const USER_SESSION_KEY = 'swiftrfq_user_session';

export default function App() {
  const [theme, setTheme] = useState(lightPalette);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [screen, setScreen] = useState('SPLASH');
  const [activeRfq, setActiveRfq] = useState(null);
  const [rfqs, setRfqs] = useState([]);

  // In-app Notification Banner State
  const [toastNotif, setToastNotif] = useState(null);
  const toastAnim = useRef(new Animated.Value(-150)).current;
  const toastTimer = useRef(null);

  useEffect(() => {
    const loadInitialData = async () => {
      // 1. Load theme preference
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode === 'dark') setTheme(darkPalette);
        else if (savedMode === 'light') setTheme(lightPalette);
      } catch (e) {}

      // 2. Load persisted user session (auto-login)
      let currentUser = null;
      try {
        const savedUserStr = await AsyncStorage.getItem(USER_SESSION_KEY);
        if (savedUserStr) {
          currentUser = JSON.parse(savedUserStr);
          setUser(currentUser);
          if (currentUser.role) {
            setRole(currentUser.role);
            setScreen(currentUser.role === 'SUPPLIER' ? 'SUPPLIER_PORTAL' : 'BUYER_DASHBOARD');
          }
        }
      } catch (e) {
        console.warn('Failed to restore user session:', e);
      }

      // 3. Fetch live RFQs from backend API
      try {
        // Suppliers see ALL bidding rooms whether invited or not (do not pass buyerId)
        const isBuyer = currentUser?.role === 'BUYER';
        const rfqParams = isBuyer
          ? { buyerId: currentUser._id || currentUser.id, role: 'BUYER' }
          : { role: 'SUPPLIER' };

        const rfqRes = await api.getRfqs(rfqParams);
        if (rfqRes?.data && Array.isArray(rfqRes.data)) {
          setRfqs(rfqRes.data);
          // Only select activeRfq for buyers by default; suppliers see full floor list
          if (isBuyer && rfqRes.data.length > 0) {
            setActiveRfq(rfqRes.data[0]);
          }
        }
      } catch (e) {
        console.log('[App] Could not load RFQs from backend:', e.message);
      }
    };

    loadInitialData();
    connectSocket();
    return () => disconnectSocket();
  }, []);

  // Initialize device system notifications and handle tap from notification dropdown
  useEffect(() => {
    initDeviceNotifications();
    const unsub = addNotificationResponseListener((data) => {
      handleTapToast(data);
    });
    return () => unsub();
  }, [user, role]);

  // Register user socket room whenever authenticated user changes
  useEffect(() => {
    if (user && socket) {
      const uid = String(user._id || user.id);
      socket.emit('register_user', { userId: uid });
    }
  }, [user]);

  // Real-time socket notification & auction updates
  useEffect(() => {
    const showToast = (notif) => {
      // Filter notifications if intended for specific recipient
      if (notif.recipientUserId && user) {
        const myId = String(user._id || user.id);
        const myPhone = user.phone || '';
        const myEmail = user.email || '';
        if (
          notif.recipientUserId !== myId &&
          notif.recipientUserId !== myPhone &&
          notif.recipientUserId !== myEmail
        ) {
          return;
        }
      }

      setToastNotif(notif);
      Animated.spring(toastAnim, {
        toValue: 12,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Post system notification to Android device notification dropdown tray
      showDeviceDropdownNotification({
        title: notif.title || 'SwiftRFQ Alert',
        message: notif.message || '',
        data: notif,
      });

      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        hideToast();
      }, 6500);
    };

    // When any buyer creates a new RFQ room, add it to floor list in real-time
    const onNewAuctionAvailable = (newRfq) => {
      if (newRfq) {
        setRfqs((prev) => {
          const rfqId = newRfq.id || newRfq.rfqId;
          const exists = prev.some((r) => (r.id || r.rfqId) === rfqId);
          if (exists) return prev;
          return [newRfq, ...prev];
        });
      }
    };

    // When an auction closes, update its status & standings in memory list
    const onGlobalAuctionClosed = (closedPayload) => {
      if (closedPayload && closedPayload.rfqId) {
        const targetId = String(closedPayload.rfqId);
        setRfqs((prev) =>
          prev.map((r) => {
            const matches =
              String(r.id) === targetId ||
              String(r.rfqId) === targetId ||
              (r._id && String(r._id) === targetId);
            return matches
              ? { ...r, ...closedPayload, status: 'CLOSED' }
              : r;
          })
        );
        setActiveRfq((cur) => {
          if (!cur) return cur;
          const matches =
            String(cur.id) === targetId ||
            String(cur.rfqId) === targetId ||
            (cur._id && String(cur._id) === targetId);
          return matches
            ? { ...cur, ...closedPayload, status: 'CLOSED' }
            : cur;
        });
      }
    };

    // When an auction is deleted, remove from memory list
    const onRfqDeleted = ({ rfqId }) => {
      if (rfqId) {
        setRfqs((prev) => prev.filter((r) => (r.id || r._id || r.rfqId) !== rfqId));
        setActiveRfq((cur) => {
          if (cur && (cur.id || cur._id || cur.rfqId) === rfqId) {
            return null;
          }
          return cur;
        });
      }
    };

    socket.on('new_notification', showToast);
    socket.on('in_app_notification', showToast);
    socket.on('new_auction_available', onNewAuctionAvailable);
    socket.on('auction_closed', onGlobalAuctionClosed);
    socket.on('rfq_deleted', onRfqDeleted);

    return () => {
      socket.off('new_notification', showToast);
      socket.off('in_app_notification', showToast);
      socket.off('new_auction_available', onNewAuctionAvailable);
      socket.off('auction_closed', onGlobalAuctionClosed);
      socket.off('rfq_deleted', onRfqDeleted);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [user, role]);

  const hideToast = () => {
    Animated.timing(toastAnim, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setToastNotif(null));
  };

  const handleTapToast = async (notif) => {
    hideToast();
    if (!notif) return;

    if (notif.rfqId) {
      try {
        const res = await api.getRfqById(notif.rfqId, {
          buyerId: user?._id || user?.id,
          role,
        });
        if (res?.data) {
          setActiveRfq(res.data);
          if (
            notif.type === 'AUCTION_WON' ||
            notif.type === 'AUCTION_LOST' ||
            notif.type === 'AUCTION_CLOSED'
          ) {
            setScreen('AUCTION_CLOSED');
            return;
          }
          if (notif.type === 'SESSION_START') {
            setScreen(role === 'SUPPLIER' ? 'SUPPLIER_PORTAL' : 'LIVE_ROOM');
            return;
          }
        }
      } catch (_) {}
    }

    if (notif.type === 'AUCTION_WON' || notif.type === 'AUCTION_LOST' || notif.type === 'AUCTION_CLOSED') {
      setScreen('AUCTION_CLOSED');
    } else if (notif.type === 'SESSION_START') {
      setScreen(role === 'SUPPLIER' ? 'SUPPLIER_PORTAL' : 'LIVE_ROOM');
    }
  };

  const handleToggleTheme = async () => {
    const nextTheme = theme.mode === 'light' ? darkPalette : lightPalette;
    setTheme(nextTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme.mode);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  };

  const handleSplashContinue = async (nextTarget, authUser) => {
    if (authUser) {
      setUser(authUser);
      const assignedRole = authUser.role || 'SUPPLIER';
      setRole(assignedRole);

      try {
        const isBuyer = assignedRole === 'BUYER';
        const rfqParams = isBuyer
          ? { buyerId: authUser._id || authUser.id, role: 'BUYER' }
          : { role: 'SUPPLIER' };

        const rfqRes = await api.getRfqs(rfqParams);
        if (rfqRes?.data && Array.isArray(rfqRes.data)) {
          setRfqs(rfqRes.data);
          if (isBuyer && rfqRes.data.length > 0) setActiveRfq(rfqRes.data[0]);
        }
      } catch (_) {}
    }

    if (nextTarget === 'SETTINGS') {
      setScreen('SETTINGS');
    } else if (nextTarget === 'INTRO') {
      setScreen('INTRO');
    } else if (nextTarget === 'BUYER_DASHBOARD' || authUser?.role === 'BUYER') {
      setRole('BUYER');
      setScreen('BUYER_DASHBOARD');
    } else {
      setRole('SUPPLIER');
      setScreen('SUPPLIER_PORTAL');
    }
  };

  const handleSelectRole = async (selectedRole) => {
    const permanentRole = user?.role || selectedRole || 'SUPPLIER';
    setRole(permanentRole);
    setScreen(permanentRole === 'SUPPLIER' ? 'SUPPLIER_PORTAL' : 'BUYER_DASHBOARD');
  };

  const handleCreateRfq = async (newRfqData) => {
    try {
      const payload = {
        ...newRfqData,
        buyerId: user?._id || user?.id || 'usr-buyer',
        buyerName: user?.companyName || user?.name || 'Verified Buyer',
      };
      const res = await api.createRfq(payload);
      const created = res.data || {
        ...payload,
        id: `RFQ-${Math.floor(1000 + Math.random() * 9000)}`,
        lowestBid: payload.ceilingPrice,
        bids: [],
      };
      setRfqs((prev) => [created, ...prev]);
      setActiveRfq(created);
      setScreen('LIVE_ROOM');
    } catch (err) {
      const fallbackObj = {
        ...newRfqData,
        id: `RFQ-${Math.floor(1000 + Math.random() * 9000)}`,
        lowestBid: newRfqData.ceilingPrice,
        bids: [],
      };
      setRfqs((prev) => [fallbackObj, ...prev]);
      setActiveRfq(fallbackObj);
      setScreen('LIVE_ROOM');
    }
  };

  const handleOpenLiveRoom = (rfq) => {
    setActiveRfq(rfq);
    setScreen('LIVE_ROOM');
  };

  const handleOpenClosedRoom = (rfq) => {
    if (rfq) setActiveRfq(rfq);
    setScreen('AUCTION_CLOSED');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(USER_SESSION_KEY);
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setUser(null);
    setRole(null);
    setActiveRfq(null);
    setScreen('SPLASH');
  };

  const handleDeleteRfq = async (rfqId) => {
    try {
      const buyerId = user?._id || user?.id;
      await api.deleteRfq(rfqId, buyerId);
      setRfqs((prev) => prev.filter((r) => (r.id || r._id || r.rfqId) !== rfqId));
      if (activeRfq && (activeRfq.id || activeRfq._id || activeRfq.rfqId) === rfqId) {
        setActiveRfq(null);
      }
    } catch (err) {
      console.warn('Failed to delete RFQ from backend:', err.message);
      // Fallback local deletion
      setRfqs((prev) => prev.filter((r) => (r.id || r._id || r.rfqId) !== rfqId));
      if (activeRfq && (activeRfq.id || activeRfq._id || activeRfq.rfqId) === rfqId) {
        setActiveRfq(null);
      }
    }
  };

  const renderCurrentScreen = () => {
    switch (screen) {
      case 'SPLASH':
        return <SplashScreen onContinue={handleSplashContinue} theme={theme} onToggleTheme={handleToggleTheme} />;
      case 'INTRO':
        return <OnboardingScreen onSelectRole={handleSelectRole} theme={theme} user={user} />;
      case 'BUYER_DASHBOARD':
        return (
          <BuyerDashboardScreen
            rfqs={rfqs}
            onCreateNew={() => setScreen('CREATE_RFQ')}
            onOpenLiveRoom={handleOpenLiveRoom}
            onOpenClosedRoom={handleOpenClosedRoom}
            onDeleteRfq={handleDeleteRfq}
            onSelectTab={(tab) => setScreen(tab)}
            theme={theme}
            user={user}
          />
        );
      case 'CREATE_RFQ':
        return (
          <CreateRfqScreen
            onCreateRfq={handleCreateRfq}
            onBack={() => setScreen('BUYER_DASHBOARD')}
            theme={theme}
            user={user}
          />
        );
      case 'SUPPLIER_PORTAL':
        return (
          <SupplierPortalScreen
            rfq={activeRfq}
            rfqs={rfqs}
            onSelectRfq={(selected) => setActiveRfq(selected)}
            onBack={() => {
              if (activeRfq) {
                setActiveRfq(null);
              } else {
                setScreen('INTRO');
              }
            }}
            onRefreshRfqs={async () => {
              try {
                const res = await api.getRfqs({ role: 'SUPPLIER' });
                if (res?.data && Array.isArray(res.data)) {
                  setRfqs(res.data);
                }
              } catch (_) {}
            }}
            onShowWinner={(closedRfq) => {
              if (closedRfq) setActiveRfq(closedRfq);
              setScreen('AUCTION_CLOSED');
            }}
            theme={theme}
            user={user}
          />
        );
      case 'LIVE_ROOM':
        return (
          <LiveAuctionRoomScreen
            rfq={activeRfq || rfqs[0]}
            role={role}
            user={user}
            onExit={() => setScreen('BUYER_DASHBOARD')}
            onShowWinner={(closedRfq) => {
              if (closedRfq) setActiveRfq(closedRfq);
              setScreen('AUCTION_CLOSED');
            }}
            theme={theme}
          />
        );
      case 'AUCTION_CLOSED':
        return (
          <AuctionClosedScreen
            rfq={activeRfq || rfqs[0]}
            onBack={() => setScreen(role === 'SUPPLIER' ? 'SUPPLIER_PORTAL' : 'BUYER_DASHBOARD')}
            onDelete={role === 'BUYER' ? handleDeleteRfq : undefined}
            theme={theme}
          />
        );
      case 'SUPPLIER_DIRECTORY':
        return <SupplierDirectoryScreen onBack={() => setScreen('BUYER_DASHBOARD')} theme={theme} user={user} />;
      case 'SETTINGS':
        return (
          <SettingsScreen
            user={user}
            onUpdateUser={async (updatedUser) => {
              setUser(updatedUser);
              try {
                await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
              } catch (e) {
                console.warn('Failed to update session:', e);
              }
            }}
            onBack={() => setScreen(role === 'SUPPLIER' ? 'SUPPLIER_PORTAL' : 'BUYER_DASHBOARD')}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onLogout={handleLogout}
            onNavigateProfile={() => setScreen('PROFILE')}
          />
        );
      case 'PROFILE':
        return (
          <ProfileScreen
            user={user}
            onUpdateUser={async (updatedUser) => {
              setUser(updatedUser);
              try {
                await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
              } catch (e) {
                console.warn('Failed to update session:', e);
              }
            }}
            onBack={() => setScreen('SETTINGS')}
            theme={theme}
          />
        );
      default:
        return <SplashScreen onContinue={handleSplashContinue} theme={theme} onToggleTheme={handleToggleTheme} />;
    }
  };

  const showNavBar = screen !== 'SPLASH' && screen !== 'INTRO' && screen !== 'PROFILE';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

        <WavyBackground theme={theme}>
          <View style={styles.screenLayer}>{renderCurrentScreen()}</View>

          {showNavBar && (
            <BottomNavBar
              activeTab={screen}
              onSelectTab={(tab) => {
                if (tab === 'SUPPLIER_PORTAL') {
                  setActiveRfq(null); // Return to full floor list when tapping My Bids tab
                }
                setScreen(tab);
              }}
              role={role}
              theme={theme}
            />
          )}
        </WavyBackground>

        {/* Global Custom In-App Notification Toast */}
        {toastNotif && (
          <Animated.View
            style={[
              styles.toastContainer,
              {
                backgroundColor: theme.surface,
                borderColor: theme.brass,
                transform: [{ translateY: toastAnim }],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.toastInner}
              onPress={() => handleTapToast(toastNotif)}
            >
              <View style={styles.toastHeaderRow}>
                <Text style={[styles.toastKicker, { color: theme.brass }]}>
                  {toastNotif.type === 'AUCTION_WON'
                    ? '🎉 WINNER DECLARED'
                    : toastNotif.type === 'AUCTION_LOST'
                    ? '📢 AUCTION CONCLUDED'
                    : toastNotif.type === 'SESSION_START'
                    ? '⚡ LIVE REVERSE AUCTION'
                    : '🔔 NOTIFICATION'}
                </Text>
                <TouchableOpacity onPress={hideToast} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: theme.inkDim, fontSize: 13, fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.toastTitle, { color: theme.ink }]} numberOfLines={1}>
                {toastNotif.title}
              </Text>
              <Text style={[styles.toastMsg, { color: theme.inkDim }]} numberOfLines={2}>
                {toastNotif.message}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Global Custom Themed Popup Container */}
        <CustomPopupHost theme={theme} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screenLayer: { flex: 1 },
  toastContainer: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    borderRadius: 14,
    borderWidth: 1.4,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  toastInner: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 3,
  },
  toastHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toastKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toastMsg: {
    fontSize: 12,
    lineHeight: 16,
  },
});
