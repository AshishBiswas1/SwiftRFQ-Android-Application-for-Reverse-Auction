import React, { useState, useEffect } from 'react';
import { StyleSheet, StatusBar, View } from 'react-native';
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
import { connectSocket, disconnectSocket } from './src/services/socket';
import { lightPalette, darkPalette } from './src/theme/tokens';

import api from './src/services/api';

const THEME_STORAGE_KEY = 'swiftrfq_theme_mode';
const USER_SESSION_KEY = 'swiftrfq_user_session';

export default function App() {
  const [theme, setTheme] = useState(lightPalette);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [screen, setScreen] = useState('SPLASH');
  const [activeRfq, setActiveRfq] = useState(null);
  const [rfqs, setRfqs] = useState([]);

  useEffect(() => {
    const loadInitialData = async () => {
      // 1. Load theme preference
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode === 'dark') setTheme(darkPalette);
        else if (savedMode === 'light') setTheme(lightPalette);
      } catch (e) {
        // Fallback remains lightPalette
      }

      // 2. Load persisted user session (auto-login)
      try {
        const savedUserStr = await AsyncStorage.getItem(USER_SESSION_KEY);
        if (savedUserStr) {
          const savedUser = JSON.parse(savedUserStr);
          setUser(savedUser);
          if (savedUser.role) {
            setRole(savedUser.role);
            setScreen(savedUser.role === 'SUPPLIER' ? 'SUPPLIER_PORTAL' : 'BUYER_DASHBOARD');
          }
        }
      } catch (e) {
        console.warn('Failed to restore user session:', e);
      }

      // 3. Fetch live RFQs from backend API
      try {
        const savedUserStr = await AsyncStorage.getItem(USER_SESSION_KEY);
        const currentUser = savedUserStr ? JSON.parse(savedUserStr) : null;
        const rfqParams = currentUser
          ? { buyerId: currentUser._id || currentUser.id, role: currentUser.role }
          : {};
        const rfqRes = await api.getRfqs(rfqParams);
        if (rfqRes?.data && Array.isArray(rfqRes.data)) {
          setRfqs(rfqRes.data);
          if (rfqRes.data.length > 0) {
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

      // Refresh RFQs for this specific authenticated user
      try {
        const rfqParams = { buyerId: authUser._id || authUser.id, role: assignedRole };
        const rfqRes = await api.getRfqs(rfqParams);
        if (rfqRes?.data && Array.isArray(rfqRes.data)) {
          setRfqs(rfqRes.data);
          if (rfqRes.data.length > 0) setActiveRfq(rfqRes.data[0]);
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
    // Role is permanent once account is created
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
            onSelectTab={(tab) => setScreen(tab)}
            theme={theme}
            user={user}
          />
        );
      case 'CREATE_RFQ':
        return <CreateRfqScreen onCreateRfq={handleCreateRfq} onBack={() => setScreen('BUYER_DASHBOARD')} theme={theme} />;
      case 'SUPPLIER_PORTAL':
        return <SupplierPortalScreen rfq={activeRfq || rfqs[0]} onBack={() => setScreen('INTRO')} theme={theme} user={user} />;
      case 'LIVE_ROOM':
        return (
          <LiveAuctionRoomScreen
            rfq={activeRfq || rfqs[0]}
            role={role}
            onExit={() => setScreen('BUYER_DASHBOARD')}
            onShowWinner={(closedRfq) => {
              if (closedRfq) setActiveRfq(closedRfq);
              setScreen('AUCTION_CLOSED');
            }}
            theme={theme}
          />
        );
      case 'AUCTION_CLOSED':
        return <AuctionClosedScreen rfq={activeRfq || rfqs[0]} onBack={() => setScreen('BUYER_DASHBOARD')} theme={theme} />;
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

        {/*
         * WavyBackground wraps the screen content and navigation bar.
         * The wavy SVG is pinned to the absolute background with zero layout impact,
         * ensuring all components (screens, cards, inputs, buttons) render directly ON TOP.
         */}
        <WavyBackground theme={theme}>
          <View style={styles.screenLayer}>
            {renderCurrentScreen()}
          </View>

          {showNavBar && (
            <BottomNavBar
              activeTab={screen}
              onSelectTab={(tab) => setScreen(tab)}
              role={role}
              theme={theme}
            />
          )}
        </WavyBackground>

        {/* Global Custom Themed Popup Container */}
        <CustomPopupHost theme={theme} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screenLayer: { flex: 1 },
});
